'use client'

import { useEffect, useRef, useState } from 'react'
import type { UIMessage } from 'ai'
import { ArrowUp, Minus, Settings, Square, X } from 'lucide-react'
import { PERSONA_MAP, type PersonaId } from '@/lib/qixia-data'
import { PetSettings, type PetPreferences } from './pet-settings'

export interface PetChatProps {
  personaId: PersonaId; messages: UIMessage[]; status: string; error?: Error; preferences: PetPreferences
  onPreferences: (p: PetPreferences) => void; onSend: (text: string) => void; onStop: () => void; onClose: () => void; onReset: () => void; onRetry: () => void
  input: string; onInput: (s: string) => void
}
interface KbCitation { card_id: string; title: string; text: string; source_url: string; credibility: 'A' | 'B' | 'C'; status: string; chunk_id: string }
function KnowledgeSources({ parts }: { parts: UIMessage['parts'] }) {
  return <>{parts.filter(part => part.type === 'data-kb-sources').map((part, index) => {
    const data = (part as unknown as { data: { status: string; results: KbCitation[] } }).data
    if (!data || !Array.isArray(data.results)) return null
    if (data.status === 'unavailable') return <p key={index} className="mt-2 text-xs text-muted-foreground">资料暂时无法查询，可稍后重试。</p>
    if (data.status === 'empty') return <p key={index} className="mt-2 text-xs text-muted-foreground">知识库没有找到匹配资料。</p>
    if (!data.results.length) return null
    return <details key={index} className="mt-3 border-t border-border pt-2 text-xs"><summary className="cursor-pointer text-accent">知识库来源 · {data.results.length} 条</summary><p className="my-2 text-muted-foreground">A 官方/学术 · B 可靠媒体或多来源 · C 单一来源或有争议。草稿资料有待回原文核对。</p><ol className="space-y-3">{data.results.map((source, i) => {
      let safe = false
      try { safe = ['https:', 'http:'].includes(new URL(source.source_url).protocol) } catch {}
      return <li key={`${source.chunk_id}-${i}`}><div className="mb-1 flex flex-wrap gap-1"><span className="rounded bg-accent/10 px-1.5">{source.credibility} 级</span>{source.status === 'draft' && <span className="rounded bg-primary/15 px-1.5">草稿 · 待核验</span>}</div><p>{source.text}</p>{safe && <a href={source.source_url} target="_blank" rel="noopener noreferrer" className="break-all text-accent underline">[{i + 1}] {source.title} · 查看出处</a>}</li>
    })}</ol></details>
  })}</>
}

export function PetChatPanel(p: PetChatProps) {
  const [settings, setSettings] = useState(false)
  const list = useRef<HTMLDivElement>(null)
  const input = useRef<HTMLInputElement>(null)
  const busy = p.status === 'submitted' || p.status === 'streaming'
  useEffect(() => { input.current?.focus() }, [])
  useEffect(() => { list.current?.scrollTo({ top: list.current.scrollHeight, behavior: 'instant' }) }, [p.messages, p.status])
  const submit = (text: string) => { if (text.trim() && !busy) { p.onSend(text.trim()); p.onInput('') } }
  return <section id="pet-chat" role="dialog" aria-modal="false" aria-labelledby="pet-title" className={`pet-chat glass-panel ${p.personaId === 'elder' ? 'pet-large' : ''}`} onKeyDown={e => { if (e.key === 'Escape') p.onClose() }}>
    <header className="flex items-center justify-between gap-2 border-b border-border px-4 py-3"><div><h2 id="pet-title" className="font-serif text-lg text-accent">栖霞灵猫</h2><p className="text-xs text-muted-foreground">山间向导 · {PERSONA_MAP[p.personaId].name}</p></div><div className="flex gap-1">
      <button aria-label="灵猫设置" aria-expanded={settings} onClick={() => setSettings(!settings)} className="pet-icon"><Settings size={17} /></button>
      <button aria-label="最小化对话" onClick={p.onClose} className="pet-icon"><Minus size={17} /></button>
      <button aria-label="关闭对话" onClick={p.onClose} className="pet-icon"><X size={17} /></button>
    </div></header>
    {settings && <PetSettings value={p.preferences} onChange={p.onPreferences} />}
    <div ref={list} className="pet-messages" role="log" aria-label="与灵猫的对话" aria-live="polite">
      {p.messages.length === 0 && <div className="space-y-4"><p className="font-serif text-lg leading-relaxed">喵～想去看红枫，还是听听栖霞山的故事？</p><p className="text-xs leading-relaxed text-muted-foreground">我能帮你看景点位置、选游览顺序。地图连线为示意，不能代替步道导航。</p>{['带我去舍利塔。', '栖霞寺有哪些历史故事？', '有没有比较轻松的赏枫路线？'].map(q => <button key={q} className="block w-full rounded-xl border border-accent/20 bg-accent/5 px-3 py-2 text-left text-sm hover:border-accent" onClick={() => submit(q)}>{q}</button>)}</div>}
      {p.messages.map(m => <div key={m.id} className={`mb-3 flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}><div className={`max-w-[92%] whitespace-pre-wrap rounded-2xl px-3 py-2 text-sm leading-relaxed ${m.role === 'user' ? 'bg-primary/90 text-primary-foreground' : 'bg-secondary'}`}>{m.parts.filter(part => part.type === 'text').map((part, i) => part.type === 'text' ? <span key={i}>{part.text}</span> : null)}{m.role === 'assistant' && <KnowledgeSources parts={m.parts} />}</div></div>)}
      {p.status === 'submitted' && <p role="status" className="text-sm text-accent">灵猫正在翻看山间笔记…</p>}
      {p.error && <div role="alert" className="flex items-center justify-between gap-3 text-sm text-destructive"><span>连接暂不可用。</span>{p.messages.some(message => message.role === 'user') && <button type="button" className="underline" disabled={busy} onClick={p.onRetry}>重试</button>}</div>}
    </div>
    <div className="flex justify-end px-4 pb-2 text-xs text-muted-foreground"><button onClick={p.onReset}>新对话</button></div>
    <form className="flex items-center gap-2 border-t border-border p-3" onSubmit={e => { e.preventDefault(); submit(p.input) }}>
      <label htmlFor="pet-input" className="sr-only">输入你的问题</label><input ref={input} id="pet-input" maxLength={2000} value={p.input} onChange={e => p.onInput(e.target.value)} onKeyDown={e => { if (e.key === 'Enter' && e.nativeEvent.isComposing) e.preventDefault() }} placeholder="问问灵猫…" className="min-w-0 flex-1 rounded-xl border border-border bg-background/70 px-3 py-2 text-sm focus:outline-accent" />
      {busy ? <button type="button" aria-label="停止回答" onClick={p.onStop} className="pet-icon"><Square size={17} /></button> : <button type="submit" aria-label="发送" disabled={!p.input.trim()} className="pet-icon bg-primary disabled:opacity-40"><ArrowUp size={18} /></button>}
    </form>
  </section>
}
