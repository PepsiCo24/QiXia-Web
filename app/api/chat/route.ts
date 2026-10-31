import { convertToModelMessages, createUIMessageStreamResponse, streamText, toUIMessageStream, type UIMessage } from 'ai'
import {
  FOLIAGE,
  PERSONAS,
  PERSONA_MAP,
  POIS,
  POI_MAP,
  SAFETY_ALERTS,
  TRAFFIC_NODES,
  crowdLevel,
  formatDuration,
  poiLoad,
  type PersonaId,
} from '@/lib/qixia-data'

export const maxDuration = 30

function buildSystemPrompt(personaId: PersonaId) {
  const persona = PERSONA_MAP[personaId]
  const hour = Math.min(17, Math.max(8, new Date(Date.now() + 8 * 3600_000).getUTCHours()))

  const pois = POIS.map((p) => {
    const load = poiLoad(p, hour)
    return `- ${p.name}（${p.category}，海拔约${p.elevation}m，当前${crowdLevel(load / p.peakLoad).label}）：${p.brief}${p.story}`
  }).join('\n')

  const routes = PERSONAS.map(
    (p) =>
      `- ${p.name}「${p.routeName}」：${p.stops.map((id) => POI_MAP[id].name).join('→')}，${formatDuration(p.durationMin)}，${p.distanceKm}km，${p.intensity}，${p.stairs}`,
  ).join('\n')

  return `你是南京栖霞山景区的数字导游“小枫”，用中文回答。
当前提问者的同行方式：${persona.name}。他们关心：${persona.cares}
请优先从这个视角组织答案：给出可执行的建议（先后顺序、大致时间、休息与补给、注意事项），语言亲切、简洁。
回答格式：纯文本，不使用 Markdown 标题、表格或加粗符号；需要列点时用“· ”开头，每条一行；一般不超过 220 字，用户追问历史时可适当展开。

景区知识（坐标与路线为示意，未经现场核验）：
${pois}

推荐路线：
${routes}

今日状态（模拟数据，回答涉及实时信息时需说明“演示数据”）：
- 红叶：${FOLIAGE.stage}，变色率约${FOLIAGE.colorRate}%，预计最佳观赏期 ${FOLIAGE.peakForecast}
- 天气：${FOLIAGE.weather}，日落 ${FOLIAGE.sunset}
- 预警：${SAFETY_ALERTS.map((a) => `${a.level}·${a.title}（${a.detail}）`).join('；')}
- 交通：${TRAFFIC_NODES.map((n) => `${n.name}${n.kind === 'parking' ? `余${n.capacity - n.used}位` : ''}，${n.note}`).join('；')}

原则：
· 不编造不在知识中的具体开放时间、票价或电话，不确定时请建议以景区官方公告为准。
· 涉及安全（陡阶、湿滑、拥挤）时主动提醒，并说明现场标识与工作人员指示优先。
· 红枫叶章是数字纪念，不承诺实体权益。`
}

export async function POST(req: Request) {
  const { messages, persona }: { messages: UIMessage[]; persona?: string } = await req.json()
  const personaId = (persona && persona in PERSONA_MAP ? persona : 'family') as PersonaId

  const result = streamText({
    model: 'google/gemini-3.8-flash',
    system: buildSystemPrompt(personaId),
    messages: await convertToModelMessages(messages),
  })

  return createUIMessageStreamResponse({
    stream: toUIMessageStream({ stream: result.stream }),
  })
}
