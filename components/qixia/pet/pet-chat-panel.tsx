'use client'

import { useLanguage } from '../language-provider'

import { useEffect, useRef, useState } from 'react'
import type { UIMessage } from 'ai'
import { ArrowUp, Minus, Settings, Square, X, RotateCcw, Grip } from 'lucide-react'
import { PERSONA_MAP, type PersonaId } from '@/lib/qixia-data'
import { PetSettings, type PetPreferences } from './pet-settings'

export interface PetChatProps {
  personaId: PersonaId; messages: UIMessage[]; status: string; error?: Error; preferences: PetPreferences
  onPreferences: (p: PetPreferences) => void; onSend: (text: string) => void; onStop: () => void; onClose: () => void; onReset: () => void; onRetry: () => void
  input: string; onInput: (s: string) => void
}
interface KbCitation { card_id: string; title: string; text: string; source_url: string; credibility: 'A' | 'B' | 'C'; status: string; chunk_id: string }
function KnowledgeSources({ parts }: { parts: UIMessage['parts'] }) {
  const { t } = useLanguage()
  return <>{parts.filter(part => part.type === 'data-kb-sources').map((part, index) => {
    const data = (part as unknown as { data: { status: string; results: KbCitation[] } }).data
    if (!data || !Array.isArray(data.results)) return null
    if (data.status === 'unavailable') return null
    if (data.status === 'empty') return null
    if (!data.results.length) return null
    return <details key={index} className="mt-3 border-t border-border pt-2 text-xs"><summary className="cursor-pointer text-accent">{t("知识库来源", "Knowledge sources")} · {data.results.length} {t("条", "sources")}</summary><p className="my-2 text-muted-foreground">{t("A 官方/学术 · B 可靠媒体或多来源 · C 单一来源或有争议。草稿资料有待回原文核对。", "A: official/academic · B: reliable media or multiple sources · C: single or disputed source. Draft material needs verification against the original.")}</p><ol className="space-y-3">{data.results.map((source, i) => {
      let safe = false
      try { safe = ['https:', 'http:'].includes(new URL(source.source_url).protocol) } catch {}
      return <li key={`${source.chunk_id}-${i}`}><div className="mb-1 flex flex-wrap gap-1"><span className="rounded bg-accent/10 px-1.5">{source.credibility} {t("级", "grade")}</span>{source.status === 'draft' && <span className="rounded bg-primary/15 px-1.5">{t("草稿 · 待核验", "Draft · unverified")}</span>}</div><p>{source.text}</p>{safe && <a href={source.source_url} target="_blank" rel="noopener noreferrer" className="break-all text-accent underline">[{i + 1}] {source.title} · {t("查看出处", "View source")}</a>}</li>
    })}</ol></details>
  })}</>
}

export function PetChatPanel(p: PetChatProps) {
  const { t, persona, locale } = useLanguage()
  const [settings, setSettings] = useState(false)
  const list = useRef<HTMLDivElement>(null)
  const input = useRef<HTMLInputElement>(null)
  const busy = p.status === 'submitted' || p.status === 'streaming'
  useEffect(() => { input.current?.focus() }, [])
  useEffect(() => { list.current?.scrollTo({ top: list.current.scrollHeight, behavior: 'instant' }) }, [p.messages, p.status])
  const submit = (text: string) => { if (text.trim() && !busy) { p.onSend(text.trim()); p.onInput('') } }
  return <section id="pet-chat" role="dialog" aria-modal="false" aria-labelledby="pet-title" className={`pet-chat glass-panel ${p.personaId === 'elder' ? 'pet-large' : ''}`} onKeyDown={e => { if (e.key === 'Escape') p.onClose() }}>
    <header data-chat-drag tabIndex={0} title={t("拖动调整聊天框位置", "Drag to move the chat window")} className="pet-chat-header flex items-center justify-between gap-2 border-b border-border px-4 py-3"><div><h2 id="pet-title" className="font-serif text-lg text-accent">{t("栖霞灵猫", "Qixia Cat")}</h2><p className="text-xs text-muted-foreground">{t("山间向导", "Mountain guide")} · {locale === 'zh-CN' ? PERSONA_MAP[p.personaId === 'default' ? 'family' : p.personaId].name : persona(PERSONA_MAP[p.personaId === 'default' ? 'family' : p.personaId].short, locale)}</p></div><div className="flex gap-1">
      <button type="button" aria-label={t("重置聊天框位置和大小", "Reset chat position and size")} title={t("恢复默认位置和大小", "Restore default position and size")} onClick={e => e.currentTarget.closest('.pet-chat')?.dispatchEvent(new Event('qixia-chat-reset'))} className="pet-icon"><RotateCcw size={16} /></button>
      <button aria-label={t("灵猫设置", "Cat guide settings")} aria-expanded={settings} onClick={() => setSettings(!settings)} className="pet-icon"><Settings size={17} /></button>
      <button aria-label={t("最小化对话", "Minimize chat")} onClick={p.onClose} className="pet-icon"><Minus size={17} /></button>
      <button aria-label={t("关闭对话", "Close chat")} onClick={p.onClose} className="pet-icon"><X size={17} /></button>
    </div></header>
    {settings && <PetSettings value={p.preferences} onChange={p.onPreferences} />}
    <div ref={list} className="pet-messages" role="log" aria-label={t("与灵猫的对话", "Conversation with the cat guide")} aria-live="polite">
      {p.messages.length === 0 && <div className="space-y-4"><p className="font-serif text-lg leading-relaxed">{t("喵～想去看红枫，还是听听栖霞山的故事？", "Meow! Shall we see the red maples or discover Qixia’s stories?")}</p><p className="text-xs leading-relaxed text-muted-foreground">{t("我能帮你看景点位置、选游览顺序。地图连线仅供参考，不能代替步道导航。", "I can help you find attractions and plan your visit. Map lines are illustrative, not trail navigation.")}</p>{[t("带我去舍利塔。", "Take me to the Sarira Pagoda."), t("栖霞寺有哪些历史故事？", "What is the history of Qixia Temple?"), t("有没有比较轻松的赏枫路线？", "Is there an easy maple-viewing route?")].map(q => <button key={q} className="block w-full rounded-xl border border-accent/20 bg-accent/5 px-3 py-2 text-left text-sm hover:border-accent" onClick={() => submit(q)}>{q}</button>)}</div>}
      {p.messages.map(m => <div key={m.id} className={`mb-3 flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}><div className={`max-w-[92%] whitespace-pre-wrap rounded-2xl px-3 py-2 text-sm leading-relaxed ${m.role === 'user' ? 'bg-primary/90 text-primary-foreground' : 'bg-secondary'}`}>{m.parts.filter(part => part.type === 'text').map((part, i) => part.type === 'text' ? <span key={i}>{part.text}</span> : null)}{m.role === 'assistant' && <KnowledgeSources parts={m.parts} />}</div></div>)}
      {p.status === 'submitted' && <p role="status" className="text-sm text-accent">{t("灵猫正在翻看山间笔记…", "Your cat guide is checking the mountain notes…")}</p>}
      {p.error && <div role="alert" className="flex items-center justify-between gap-3 text-sm text-destructive"><span>{t("连接暂不可用。", "Connection temporarily unavailable.")}</span>{p.messages.some(message => message.role === 'user') && <button type="button" className="underline" disabled={busy} onClick={p.onRetry}>{t("重试", "Retry")}</button>}</div>}
    </div>
    <div className="flex justify-end px-4 pb-2 text-xs text-muted-foreground"><button onClick={p.onReset}>{t("新对话", "New chat")}</button></div>
    <form className="flex items-center gap-2 border-t border-border p-3" onSubmit={e => { e.preventDefault(); submit(p.input) }}>
      <label htmlFor="pet-input" className="sr-only">{t("输入你的问题", "Enter your question")}</label><input ref={input} id="pet-input" maxLength={2000} value={p.input} onChange={e => p.onInput(e.target.value)} onKeyDown={e => { if (e.key === 'Enter' && e.nativeEvent.isComposing) e.preventDefault() }} placeholder={t("问问灵猫…", "Ask your cat guide…")} className="min-w-0 flex-1 rounded-xl border border-border bg-background/70 px-3 py-2 text-sm focus:outline-accent" />
      {busy ? <button type="button" aria-label={t("停止回答", "Stop response")} onClick={p.onStop} className="pet-icon"><Square size={17} /></button> : <button type="submit" aria-label={t("发送", "Send")} disabled={!p.input.trim()} className="pet-icon bg-primary disabled:opacity-40"><ArrowUp size={18} /></button>}
    </form>
    <button type="button" data-chat-resize className="pet-chat-resize" aria-label={t("调整聊天框大小", "Resize chat window")} title={t("拖动缩放，也可使用方向键", "Drag to resize, or use arrow keys")}><Grip size={16} /></button>
  </section>
}
