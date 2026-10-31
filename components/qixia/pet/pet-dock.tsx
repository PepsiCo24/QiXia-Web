'use client'

import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import type { UIMessage } from 'ai'
import SpriteAnimator from './sprite-animator'
import { PetChatPanel } from './pet-chat-panel'
import { defaultPreferences, type PetPreferences } from './pet-settings'
import { usePetAnimationController, type PetControllerAnimation } from './pet-animation-controller'
import { usePetDragController } from './pet-drag-controller'
import { mapCommandSchema, type MapCommand } from '@/lib/pet/pet-actions'
import type { PersonaId } from '@/lib/qixia-data'

export function PetDock({ open, onOpen, messages, status, error, onSend, onStop, onReset, personaId, onCommand, mapNotice }: {
  open: boolean; onOpen: (open: boolean) => void; messages: UIMessage[]; status: string; error?: Error; onSend: (text: string, demo: boolean) => void; onStop: () => void; onReset: () => void; personaId: PersonaId; onCommand: (command: MapCommand) => void; mapNotice: { id: number; text: string } | null
}) {
  const [preferences, setPreferences] = useState(defaultPreferences)
  const [loaded, setLoaded] = useState(false)
  const [input, setInput] = useState('')
  const [welcome, setWelcome] = useState(false)
  const [systemMotion, setSystemMotion] = useState(false)
  const { animation, play } = usePetAnimationController({ thinking: status === 'submitted', talking: status === 'streaming' })
  const dragController = usePetDragController({ storageKey: 'qixia-pet-position', initialPosition: { x: preferences.side === 'left' ? 0 : 1, y: preferences.top / 100, side: preferences.side }, onAnimation: play, onPositionCommit: position => setPreferences(p => ({ ...p, side: position.side, top: position.y * 100 })) })
  const consumed = useRef(new Set<string>())
  const spoken = useRef('')
  const button = useRef<HTMLButtonElement>(null)
  const commandRef = useRef(onCommand)
  commandRef.current = onCommand
  useEffect(() => {
    try { const saved = JSON.parse(localStorage.getItem('qixia-pet-preferences') ?? '{}'); setPreferences({ ...defaultPreferences, reducedMotion: saved.reducedMotion === true, proactive: saved.proactive !== false, demo: saved.demo === true, hidden: saved.hidden === true, side: saved.side === 'left' ? 'left' : 'right', top: Number.isFinite(saved.top) ? Math.min(70, Math.max(30, saved.top)) : 52 }); setWelcome(!localStorage.getItem('qixia-pet-welcomed')) } catch { /* storage is optional */ }
    const query = matchMedia('(prefers-reduced-motion: reduce)')
    setSystemMotion(query.matches)
    const change = () => setSystemMotion(query.matches)
    query.addEventListener('change', change)
    setLoaded(true)
    return () => query.removeEventListener('change', change)
  }, [])
  useEffect(() => { if (loaded) { try { localStorage.setItem('qixia-pet-preferences', JSON.stringify(preferences)) } catch { /* optional */ } } }, [preferences, loaded])
  useEffect(() => {
    for (const message of messages) message.parts.forEach((part, index) => {
      if (part.type !== 'data-map-command') return
      const key = `${message.id}:${index}`
      if (consumed.current.has(key)) return
      consumed.current.add(key)
      const parsed = mapCommandSchema.safeParse((part as { data?: unknown }).data)
      if (!parsed.success) return
      if (parsed.data.type === 'play_animation') play(parsed.data.animation as PetControllerAnimation, 2400)
      else { commandRef.current(parsed.data); play('guide', 2600) }
    })
    if (consumed.current.size > 1000) consumed.current = new Set(Array.from(consumed.current).slice(-500))
  }, [messages, status, play])
  useEffect(() => { if (mapNotice && preferences.proactive && !open) play('curious', 2000) }, [mapNotice, preferences.proactive, open, play])
  useEffect(() => {
    if (open || !preferences.proactive || preferences.reducedMotion || systemMotion) return
    const timer = setInterval(() => { if (!document.hidden) play(Math.random() > 0.5 ? 'curious' : 'sleep', 4000) }, 65000)
    return () => clearInterval(timer)
  }, [open, preferences.proactive, preferences.reducedMotion, systemMotion, play])
  useEffect(() => {
    const celebrate = () => play('celebrate', 3200)
    window.addEventListener('qixia-leaf-collected', celebrate)
    return () => window.removeEventListener('qixia-leaf-collected', celebrate)
  }, [play])
  const dismissWelcome = () => { setWelcome(false); try { localStorage.setItem('qixia-pet-welcomed', '1') } catch { /* optional */ } }
  const stop = () => { onStop(); play('idle') }
  const spriteAnimation = animation
  const last = messages.at(-1)
  const subtitle = status === 'streaming' && last?.role === 'assistant' ? last.parts.map(p => p.type === 'text' ? p.text : '').join('').slice(-64) : ''
  return <>
    {!preferences.hidden && <aside ref={dragController.ref} className={`pet-dock pet-${dragController.side}`} aria-label="栖霞灵猫向导">
    {open && loaded && createPortal(<div className={`pet-panel-host pet-panel-${dragController.side}`}><PetChatPanel personaId={personaId} messages={messages} status={status} error={error} preferences={preferences} onPreferences={setPreferences} onSend={text => onSend(text, preferences.demo)} onStop={stop} onClose={() => { stop(); onOpen(false); button.current?.focus() }} onReset={() => { stop(); onReset(); consumed.current.clear() }} onRetry={() => { const previous = [...messages].reverse().find(message => message.role === 'user'); const text = previous?.parts.map(part => part.type === 'text' ? part.text : '').join(''); if (text) onSend(text, preferences.demo) }} input={input} onInput={setInput} /></div>, document.body)}
    {!open && welcome && preferences.proactive && <div className="pet-welcome glass-panel"><button aria-label="关闭欢迎提示" className="float-right px-2" onClick={dismissWelcome}>×</button><p>喵～欢迎来到栖霞山！我是栖霞灵猫，今天想让我带你去哪里看看？</p></div>}
    {!open && !welcome && mapNotice && preferences.proactive && <button className="pet-welcome glass-panel text-left" onClick={() => onOpen(true)}>{mapNotice.text}</button>}
    {open && subtitle && <p className="pet-subtitle" aria-hidden="true">{subtitle}</p>}
    <button ref={button} type="button" className="pet-character" aria-label="栖霞灵猫，打开对话，可拖动" aria-expanded={open} aria-controls="pet-chat" onPointerEnter={() => { if (status === 'ready') play('curious', 1200) }} {...dragController.handlers} onClick={() => { dismissWelcome(); play('wave', 2000); onOpen(!open) }}>
      <SpriteAnimator state={spriteAnimation} reducedMotion={preferences.reducedMotion || systemMotion} className="h-full w-full" /><span className="pet-name">栖霞灵猫 <span aria-hidden="true">✦</span></span>
    </button>
    </aside>}
    {preferences.hidden && <button type="button" className="pet-welcome glass-panel" aria-label="恢复显示栖霞灵猫" onClick={() => setPreferences(p => ({ ...p, hidden: false }))}>恢复灵猫</button>}
  </>
}
