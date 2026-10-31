import { convertToModelMessages, createUIMessageStream, createUIMessageStreamResponse, stepCountIs, streamText, tool, toUIMessageStream, type UIMessage } from 'ai'
import { z } from 'zod'
import { executeMapCommand, mapCommandSchema, type MapCommand } from '@/lib/pet/pet-actions'
import { buildPetSystemPrompt, localReply, validPersona } from '@/lib/pet/pet-knowledge'
import { kbExcerptReply, kbGroundingContext, retrieveKb, type KbSourcesData } from '@/lib/pet/kb-client'
import { PERSONAS, POIS } from '@/lib/qixia-data'

export const maxDuration = 30
const MAX_BODY = 64_000
const buckets = new Map<string, { count: number; until: number }>()
const toolInputSchema = z.object({ command: mapCommandSchema }).strict()
const textPart = z.object({ type: z.literal('text'), text: z.string().max(8000) })
const requestSchema = z.object({
  messages: z.array(z.object({ id: z.string().max(200), role: z.enum(['user', 'assistant']), parts: z.array(z.object({ type: z.string() }).passthrough()).max(80) })).min(1).max(32),
  persona: z.string().max(60).optional(),
  demo: z.boolean().optional(),
}).passthrough()

type PetMessage = UIMessage<unknown, { 'map-command': MapCommand; 'kb-sources': KbSourcesData }>

function corsHeaders(req: Request): Headers | null {
  const headers = new Headers({ Vary: 'Origin', 'Cache-Control': 'no-store' })
  const origin = req.headers.get('origin')
  if (!origin) return headers
  const allowlist = (process.env.AGENT_ALLOWED_ORIGINS || '').split(',').map(value => value.trim()).filter(Boolean)
  if (origin !== new URL(req.url).origin && !allowlist.includes(origin)) return null
  headers.set('Access-Control-Allow-Origin', origin)
  headers.set('Access-Control-Allow-Methods', 'POST, OPTIONS')
  headers.set('Access-Control-Allow-Headers', 'Content-Type')
  headers.set('Access-Control-Expose-Headers', 'x-vercel-ai-ui-message-stream, Retry-After')
  return headers
}

export function OPTIONS(req: Request) {
  const headers = corsHeaders(req)
  if (!headers) return Response.json({ error: 'Origin not allowed' }, { status: 403, headers: { Vary: 'Origin' } })
  return new Response(null, { status: 204, headers })
}

export async function POST(req: Request) {
  const headers = corsHeaders(req)
  if (!headers) return Response.json({ error: 'Origin not allowed' }, { status: 403, headers: { Vary: 'Origin' } })
  try {
    const response = await chat(req)
    for (const [key, value] of headers) {
      if (key === 'vary' && response.headers.has('vary')) response.headers.append(key, value)
      else response.headers.set(key, value)
    }
    return response
  } catch {
    return Response.json({ error: '导览暂时不可用，请稍后重试。' }, { status: 503, headers })
  }
}

function allowed(req: Request): boolean {
  const now = Date.now()
  for (const [key, bucket] of buckets) if (bucket.until <= now) buckets.delete(key)
  // Deployment proxies should overwrite forwarded headers; bounded map also protects local deployments.
  const key = (req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'local').slice(0, 100)
  const previous = buckets.get(key)
  if (previous) return ++previous.count <= 20
  if (buckets.size >= 1000) return false
  buckets.set(key, { count: 1, until: now + 60_000 })
  return true
}

async function chat(req: Request) {
  if (!allowed(req)) return Response.json({ error: '请求较多，请稍后再试。' }, { status: 429, headers: { 'Retry-After': '60' } })
  if (Number(req.headers.get('content-length')) > MAX_BODY) return Response.json({ error: '消息过长。' }, { status: 413 })
  let body: z.infer<typeof requestSchema>
  try {
    // Read with a hard byte cap, even when Content-Length is omitted or inaccurate.
    const reader = req.body?.getReader()
    if (!reader) throw new Error('missing body')
    const decoder = new TextDecoder()
    let raw = '', bytes = 0
    while (true) {
      const chunk = await reader.read()
      if (chunk.done) break
      bytes += chunk.value.byteLength
      if (bytes > MAX_BODY) { await reader.cancel(); return Response.json({ error: '消息过长。' }, { status: 413 }) }
      raw += decoder.decode(chunk.value, { stream: true })
    }
    raw += decoder.decode()
    body = requestSchema.parse(JSON.parse(raw))
  } catch {
    return Response.json({ error: '消息格式无效，请重新输入。' }, { status: 400 })
  }
  // Never trust client tool outputs, system prompts, data parts or provider metadata.
  const messages: UIMessage[] = body.messages.map(message => ({
    id: message.id, role: message.role,
    parts: message.parts.flatMap(part => { const parsed = textPart.safeParse(part); return parsed.success ? [parsed.data] : [] }),
  }))
  const last = messages.at(-1)
  if (last?.role !== 'user' || !last.parts.some(p => p.type === 'text' && p.text.trim())) {
    return Response.json({ error: '请输入问题。' }, { status: 400 })
  }
  const text = last.parts.filter(p => p.type === 'text').map(p => p.text).join('\n')
  const persona = validPersona(body.persona)
  const fallback = localReply(text, persona)
  const controller = new AbortController()
  const abort = () => controller.abort()
  req.signal.addEventListener('abort', abort, { once: true })
  const timeout = setTimeout(abort, 22_000)
  const stream = createUIMessageStream<PetMessage>({
    onError: () => '导览暂时不可用，请稍后重试。',
    execute: async ({ writer }) => {
      const emitCommand = (command: MapCommand) => writer.write({ type: 'data-map-command', data: mapCommandSchema.parse(command) })
      const emitText = (value: string) => {
        const id = crypto.randomUUID()
        writer.write({ type: 'text-start', id })
        for (const delta of value.match(/[\s\S]{1,20}/g) || []) writer.write({ type: 'text-delta', id, delta })
        writer.write({ type: 'text-end', id })
      }
      writer.write({ type: 'start', messageId: crypto.randomUUID() })
      let failed = false
      let kb: KbSourcesData = { query: text.slice(0, 300), status: 'unavailable', results: [] }
      try {
        // Mandatory pre-retrieval, before either model path or any non-demo factual fallback.
        kb = body.demo
          ? { query: text.slice(0, 300), status: 'demo', results: [] }
          : await retrieveKb(text, controller.signal)
        writer.write({ type: 'data-kb-sources', data: kb })
        // Exclude local historical stories entirely from production model input.
        const mapSystem = buildPetSystemPrompt(persona).replace(/知识来源：[\s\S]*?示意路线/, '示意路线')
        const groundedSystem = mapSystem + kbGroundingContext(kb)
        const searchPlacesSchema = z.object({ query: z.string().max(100) }).strict()
        const routesSchema = z.object({ personaId: z.enum(['family', 'youth', 'culture', 'elder', 'photo']).optional() }).strict()
        const searchPlaces = (input: z.infer<typeof searchPlacesSchema>) => ({ demo: true, verified: false, places: POIS.filter(p => !input.query || p.name.includes(input.query) || p.id.includes(input.query)).map(p => ({ id: p.id, name: p.name })) })
        const getRoutes = (input: z.infer<typeof routesSchema>) => ({ demo: true, verified: false, notice: '路线、距离和耗时均为示意，通行与无障碍条件未核验。', routes: PERSONAS.filter(p => !input.personaId || p.id === input.personaId).map(p => ({ personaId: p.id, name: p.name, stops: p.stops, durationMin: p.durationMin, distanceKm: p.distanceKm })) })
        const tools = {
          search_places: tool({ description: '搜索演示地图已知点位，仅返回ID和名称，不提供历史事实或现实设施保证。', inputSchema: searchPlacesSchema, execute: async input => searchPlaces(input) }),
          get_persona_routes: tool({ description: '读取同行方式对应的示意路线，路况和耗时未经现场核验。', inputSchema: routesSchema, execute: async input => getRoutes(input) }),
          map_action: tool({
            description: '执行栖霞山演示地图操作。只接受已知点位和同行方式；设施操作仅打开未核验提示。',
            inputSchema: toolInputSchema,
            execute: async input => {
              const output = executeMapCommand(input.command)
              for (const command of output.commands) emitCommand(command)
              return output
            },
          }),
        }
        const endpoint = process.env.OPENAI_COMPATIBLE_BASE_URL || process.env.OPENAI_BASE_URL
        const apiKey = process.env.OPENAI_COMPATIBLE_API_KEY || process.env.OPENAI_API_KEY
        if (body.demo) {
          failed = true
        } else if (kb.status !== 'ok') {
          // Fail closed for every question: never let demo/local history fill missing evidence.
          emitText(kbExcerptReply(kb))
        } else if (endpoint && apiKey) {
          const url = new URL(endpoint)
          if (url.protocol !== 'https:' && !(url.protocol === 'http:' && ['localhost', '127.0.0.1'].includes(url.hostname))) throw new Error('invalid endpoint')
          url.pathname = url.pathname.replace(/\/$/, '') + '/chat/completions'
          const model = process.env.OPENAI_COMPATIBLE_MODEL || process.env.OPENAI_MODEL || process.env.AI_GATEWAY_MODEL || process.env.AI_MODEL || 'google/gemini-3.8-flash'
          const conversation: Record<string, unknown>[] = [
            { role: 'system', content: groundedSystem },
            ...messages.map(m => ({ role: m.role, content: m.parts.filter(p => p.type === 'text').map(p => p.text).join('\n') })),
          ]
          // A bounded server tool loop avoids any client-side execution or provider SDK version mismatch.
          for (let step = 0; step < 3; step++) {
            const response = await fetch(url, {
              method: 'POST', signal: controller.signal,
              headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
              body: JSON.stringify({ model, messages: conversation, max_tokens: 700, stream: true,
                ...(step < 2 ? { tools: [
                  { type: 'function', function: { name: 'map_action', description: '执行已知地图操作', parameters: z.toJSONSchema(toolInputSchema) } },
                  { type: 'function', function: { name: 'search_places', description: '搜索演示点位ID和名称', parameters: z.toJSONSchema(searchPlacesSchema) } },
                  { type: 'function', function: { name: 'get_persona_routes', description: '读取未核验的示意路线', parameters: z.toJSONSchema(routesSchema) } },
                ] } : {}),
              }),
            })
            if (!response.ok) throw new Error('provider unavailable')
            if (!response.body || !response.headers.get('content-type')?.includes('text/event-stream')) throw new Error('expected SSE')
            const reader = response.body.getReader()
            const decoder = new TextDecoder()
            const calls = new Map<number, { id: string; type: 'function'; function: { name: string; arguments: string } }>()
            const textId = crypto.randomUUID()
            let content = '', pending = '', eventData: string[] = [], started = false, completed = false, finishReason: string | null = null
            let bytes = 0
            const consumeEvent = () => {
              const data = eventData.join('\n')
              eventData = []
              if (!data) return
              if (data.trim() === '[DONE]') { completed = true; return }
              const payload = JSON.parse(data)
              if (payload.error) throw new Error('provider error')
              const choice = payload.choices?.find((item: { index?: number }) => item.index === 0 || item.index === undefined)
              if (!choice) return // Usage-only event.
              if (typeof choice.finish_reason === 'string') finishReason = choice.finish_reason
              const delta = choice.delta
              if (!delta) return
              if (typeof delta.content === 'string' && delta.content) {
                content += delta.content
                if (content.length > 12_000) throw new Error('answer too large')
                if (!started) { writer.write({ type: 'text-start', id: textId }); started = true }
                writer.write({ type: 'text-delta', id: textId, delta: delta.content })
              }
              if (delta.tool_calls !== undefined && !Array.isArray(delta.tool_calls)) throw new Error('invalid tool delta')
              for (const fragment of delta.tool_calls || []) {
                if (!Number.isInteger(fragment.index) || fragment.index < 0 || fragment.index >= 8) throw new Error('invalid tool index')
                const call = calls.get(fragment.index) || { id: '', type: 'function' as const, function: { name: '', arguments: '' } }
                if (fragment.type !== undefined && fragment.type !== 'function') throw new Error('invalid tool type')
                if (fragment.id !== undefined) {
                  if (typeof fragment.id !== 'string') throw new Error('invalid tool id')
                  call.id += fragment.id
                }
                if (fragment.function?.name !== undefined) {
                  if (typeof fragment.function.name !== 'string') throw new Error('invalid tool name')
                  call.function.name += fragment.function.name
                }
                if (fragment.function?.arguments !== undefined) {
                  if (typeof fragment.function.arguments !== 'string') throw new Error('invalid tool arguments')
                  call.function.arguments += fragment.function.arguments
                }
                if (call.id.length > 200 || call.function.name.length > 100 || call.function.arguments.length > 8000) throw new Error('tool too large')
                calls.set(fragment.index, call)
              }
            }
            const consumeLines = (eof = false) => {
              // SSE permits CRLF, LF and bare CR, including delimiters split across network chunks.
              while (pending.length) {
                const boundary = pending.search(/[\r\n]/)
                if (boundary < 0) break
                if (!eof && pending[boundary] === '\r' && boundary === pending.length - 1) break
                const line = pending.slice(0, boundary)
                pending = pending.slice(boundary + (pending[boundary] === '\r' && pending[boundary + 1] === '\n' ? 2 : 1))
                if (!line) consumeEvent()
                else if (line.startsWith('data:')) eventData.push(line.slice(5).replace(/^ /, ''))
                if (completed) break
              }
              if (eof && !completed) {
                if (pending.startsWith('data:')) eventData.push(pending.slice(5).replace(/^ /, ''))
                pending = ''
                consumeEvent()
              }
            }
            try {
              while (!completed) {
                const { value, done } = await reader.read()
                if (done) { pending += decoder.decode(); consumeLines(true); break }
                bytes += value.byteLength
                if (bytes > 256_000) throw new Error('provider stream too large')
                pending += decoder.decode(value, { stream: true })
                consumeLines()
              }
              if (!completed && !finishReason) throw new Error('incomplete SSE')
              if (finishReason === 'length' || finishReason === 'content_filter') throw new Error('incomplete answer')
            } finally {
              if (started) writer.write({ type: 'text-end', id: textId })
              await reader.cancel().catch(() => {})
              reader.releaseLock()
            }
            const orderedCalls = [...calls.entries()].sort(([a], [b]) => a - b).map(([, call]) => call)
            if (orderedCalls.length) {
              if (step >= 2) throw new Error('tool limit')
              // Validate the entire tool batch before executing any action.
              const outputs = orderedCalls.map(call => {
                if (!call.id) throw new Error('invalid tool')
                const input: unknown = JSON.parse(call.function.arguments)
                if (call.function.name === 'map_action') return executeMapCommand(toolInputSchema.parse(input).command)
                if (call.function.name === 'search_places') return searchPlaces(searchPlacesSchema.parse(input))
                if (call.function.name === 'get_persona_routes') return getRoutes(routesSchema.parse(input))
                throw new Error('invalid tool')
              })
              if (new Set(orderedCalls.map(call => call.id)).size !== orderedCalls.length) throw new Error('duplicate tool id')
              conversation.push({ role: 'assistant', content: content || null, tool_calls: orderedCalls })
              orderedCalls.forEach((call, index) => {
                if ('commands' in outputs[index]) for (const command of outputs[index].commands) emitCommand(command)
                conversation.push({ role: 'tool', tool_call_id: call.id, content: JSON.stringify(outputs[index]) })
              })
              continue
            }
            if (!content.trim()) throw new Error('empty answer')
            break
          }
        } else if (process.env.AI_GATEWAY_API_KEY || process.env.VERCEL_OIDC_TOKEN) {
          const result = streamText({
            model: process.env.AI_GATEWAY_MODEL || process.env.AI_MODEL || 'google/gemini-3.8-flash',
            system: groundedSystem, messages: await convertToModelMessages(messages),
            tools, stopWhen: stepCountIs(3), maxOutputTokens: 700, maxRetries: 0, abortSignal: controller.signal,
          })
          const uiStream = toUIMessageStream({ stream: result.stream, tools, sendStart: false, sendFinish: false,
            onError: () => { failed = true; return '在线讲解暂不可用，将展示知识库原文摘录。' },
          })
          // Drain inside execute so async failures can fall back before stream completion.
          const reader = uiStream.getReader()
          try {
            while (true) {
              const { value, done } = await reader.read()
              if (done) break
              if (value.type !== 'error') writer.write(value as Parameters<typeof writer.write>[0])
            }
          } finally { reader.releaseLock() }
        } else {
          failed = true
        }
      } catch {
        // Never expose provider errors, URLs, request headers or credentials.
        failed = true
      } finally {
        clearTimeout(timeout)
        req.signal.removeEventListener('abort', abort)
      }
      if (failed && !req.signal.aborted) {
        if (body.demo) {
          emitText('已启用本地演示。\n' + fallback.text)
          for (const command of fallback.commands) emitCommand(command)
        } else {
          emitText(kbExcerptReply(kb))
        }
      }
      writer.write({ type: 'finish' })
    },
  })
  return createUIMessageStreamResponse({ stream, headers: { 'Cache-Control': 'no-store' } })
}
