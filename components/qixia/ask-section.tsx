'use client'

import { useEffect, useRef, useState } from 'react'
import type { UIMessage } from 'ai'
import { ArrowUp, Leaf, RotateCcw, Square } from 'lucide-react'
import { PERSONAS, PERSONA_MAP, type PersonaId } from '@/lib/qixia-data'
import { cn } from '@/lib/utils'

interface AskSectionProps {
  personaId: PersonaId
  onPersonaChange: (id: PersonaId) => void
  messages: UIMessage[]
  status: 'ready' | 'submitted' | 'streaming' | 'error'
  error?: Error
  onSend: (text: string) => void
  onStop: () => void
  onReset: () => void
}

export function AskSection({ personaId, onPersonaChange, messages, status, error, onSend, onStop, onReset }: AskSectionProps) {
  const [input, setInput] = useState('')
  const listRef = useRef<HTMLDivElement>(null)
  const persona = PERSONA_MAP[personaId]
  const busy = status === 'submitted' || status === 'streaming'

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: 'smooth' })
  }, [messages])

  const submit = (text: string) => {
    const value = text.trim()
    if (!value || busy) return
    onSend(value)
    setInput('')
  }

  return (
    <section id="ask" aria-labelledby="ask-title" className="relative scroll-mt-0 border-t border-border bg-background">
      <div className="mx-auto grid max-w-6xl gap-8 px-4 py-16 lg:grid-cols-[320px_1fr] lg:gap-12 lg:py-24">
        <div className="flex flex-col gap-6">
          <div>
            <p className="text-xs tracking-[0.4em] text-primary">ASK QIXIA</p>
            <h2 id="ask-title" className="mt-2 font-serif text-3xl font-bold text-balance text-foreground lg:text-4xl">
              问栖霞
            </h2>
            <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
              结合当前客流、红叶与设施状态，按你的同行方式回答。路线与坐标为示意数据，现场请以景区标识和工作人员指引为准。
            </p>
          </div>

          <div>
            <p className="mb-2 text-xs text-muted-foreground">我以什么身份来问</p>
            <div role="radiogroup" aria-label="提问身份" className="flex flex-wrap gap-2">
              {PERSONAS.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  role="radio"
                  aria-checked={p.id === personaId}
                  onClick={() => onPersonaChange(p.id)}
                  className={cn(
                    'rounded-full border px-3 py-1.5 text-sm transition-colors',
                    p.id === personaId
                      ? 'border-primary bg-primary text-primary-foreground'
                      : 'border-border text-muted-foreground hover:border-foreground/40 hover:text-foreground',
                  )}
                >
                  {p.name}
                </button>
              ))}
            </div>
          </div>

          <div>
            <p className="mb-2 text-xs text-muted-foreground">{persona.name}常问</p>
            <ul className="flex flex-col gap-2">
              {persona.questions.map((q) => (
                <li key={q}>
                  <button
                    type="button"
                    onClick={() => submit(q)}
                    disabled={busy}
                    className="w-full rounded-md border border-border bg-card px-3 py-2.5 text-left text-sm text-foreground transition-colors hover:border-primary/60 hover:text-primary disabled:opacity-50"
                  >
                    {q}
                  </button>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="flex min-h-[560px] flex-col overflow-hidden rounded-xl border border-border bg-card">
          <div className="flex items-center justify-between border-b border-border px-4 py-3">
            <div className="flex items-center gap-2">
              <span className="flex size-7 items-center justify-center rounded-full bg-primary/15">
                <Leaf className="size-3.5 text-primary" aria-hidden="true" />
              </span>
              <div className="leading-tight">
                <p className="text-sm font-medium text-foreground">栖霞导游 · 小枫</p>
                <p className="text-[11px] text-muted-foreground">当前视角：{persona.name}</p>
              </div>
            </div>
            {messages.length > 0 && (
              <button
                type="button"
                onClick={onReset}
                className="flex items-center gap-1 rounded-md px-2 py-1 text-xs text-muted-foreground hover:bg-secondary hover:text-foreground"
              >
                <RotateCcw className="size-3" aria-hidden="true" />
                新对话
              </button>
            )}
          </div>

          <div ref={listRef} className="flex-1 overflow-y-auto px-4 py-5" aria-live="polite">
            {messages.length === 0 ? (
              <div className="flex h-full flex-col items-center justify-center gap-3 text-center">
                <p className="font-serif text-2xl text-foreground">一客一景 · 一刻一路</p>
                <p className="max-w-sm text-sm leading-relaxed text-muted-foreground">
                  问路线、问故事、问光线、问哪里能坐下歇脚。也可以在地图上点选景点，直接“继续追问”。
                </p>
              </div>
            ) : (
              <ul className="flex flex-col gap-4">
                {messages.map((m) => (
                  <li key={m.id} className={cn('flex', m.role === 'user' ? 'justify-end' : 'justify-start')}>
                    <div
                      className={cn(
                        'max-w-[85%] whitespace-pre-wrap rounded-lg px-3.5 py-2.5 text-sm leading-relaxed',
                        m.role === 'user' ? 'bg-primary text-primary-foreground' : 'bg-secondary text-foreground',
                      )}
                    >
                      {m.parts.map((part, i) => (part.type === 'text' ? <span key={i}>{part.text}</span> : null))}
                    </div>
                  </li>
                ))}
                {status === 'submitted' && (
                  <li className="flex justify-start">
                    <div className="rounded-lg bg-secondary px-3.5 py-2.5 text-sm text-muted-foreground">小枫正在查看山间情况…</div>
                  </li>
                )}
              </ul>
            )}
            {error && (
              <p role="alert" className="mt-4 rounded-md border border-destructive/40 px-3 py-2 text-xs text-destructive">
                暂时无法回答，请稍后重试。
              </p>
            )}
          </div>

          <form
            onSubmit={(e) => {
              e.preventDefault()
              submit(input)
            }}
            className="flex items-center gap-2 border-t border-border p-3"
          >
            <label htmlFor="ask-input" className="sr-only">
              输入你的问题
            </label>
            <input
              id="ask-input"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && (e.nativeEvent.isComposing || e.keyCode === 229)) e.preventDefault()
              }}
              placeholder={`以${persona.name}的身份提问…`}
              autoComplete="off"
              className="h-10 flex-1 rounded-md border border-border bg-background px-3 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none"
            />
            {busy ? (
              <button
                type="button"
                onClick={onStop}
                aria-label="停止回答"
                className="flex size-10 items-center justify-center rounded-md bg-secondary text-foreground"
              >
                <Square className="size-4" />
              </button>
            ) : (
              <button
                type="submit"
                aria-label="发送"
                disabled={!input.trim()}
                className="flex size-10 items-center justify-center rounded-md bg-primary text-primary-foreground disabled:opacity-40"
              >
                <ArrowUp className="size-4" />
              </button>
            )}
          </form>
        </div>
      </div>
    </section>
  )
}
