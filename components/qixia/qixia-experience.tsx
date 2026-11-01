'use client'

import { useRef, useState } from 'react'
import { useChat } from '@ai-sdk/react'
import { DefaultChatTransport } from 'ai'
import { HeroMap } from './hero-map'
import { PetDock } from './pet/pet-dock'
import { SiteFooter } from './site-footer'
import { PhotoEntry } from './photo/photo-entry'
import { POI_MAP, type PersonaId } from '@/lib/qixia-data'
import { mapCommandSchema, type MapCommand } from '@/lib/pet/pet-actions'
import { localReply } from '@/lib/pet/pet-knowledge'

function scrollToMap() { document.getElementById('map')?.scrollIntoView({ behavior: 'smooth', block: 'start' }) }

export function QixiaExperience() {
  const [personaId, setPersonaId] = useState<PersonaId>('default')
  const [open, setOpen] = useState(false)
  const [command, setCommand] = useState<{ id: number; action: MapCommand } | null>(null)
  const commandId = useRef(0)
  const [mapNotice, setMapNotice] = useState<{ id: number; text: string } | null>(null)
  const agentBase = process.env.NEXT_PUBLIC_AGENT_API_BASE_URL?.replace(/\/$/, '')
  const staticWithoutAgent = process.env.NEXT_PUBLIC_GITHUB_PAGES === 'true' && !agentBase
  const [transport] = useState(() => new DefaultChatTransport({ api: agentBase ? `${agentBase}/api/chat` : '/api/chat' }))
  const { messages, sendMessage, status, error, stop, setMessages } = useChat({ transport })
  const execute = (value: MapCommand) => {
    const parsed = mapCommandSchema.safeParse(value)
    if (!parsed.success) return
    const action = parsed.data
    if (action.type === 'select_persona' || action.type === 'show_route') setPersonaId(action.personaId)
    setCommand({ id: ++commandId.current, action })
    if (action.type !== 'play_animation') scrollToMap()
  }
  const send = (text: string, demo = false) => {
    const agentPersona = personaId === 'default' ? 'family' : personaId;
    setOpen(true)
    if (staticWithoutAgent) {
      const reply = demo ? localReply(text, personaId) : null
      setMessages(prev => [...prev,
        { id: crypto.randomUUID(), role: 'user', parts: [{ type: 'text', text }] },
        { id: crypto.randomUUID(), role: 'assistant', parts: [
          { type: 'text', text: reply ? reply.text : '喵～你可以先看看地图上的景点，或选一条游览路线。' },
          ...(reply?.commands.map(data => ({ type: 'data-map-command' as const, data })) || []),
        ] },
      ])
    } else void sendMessage({ text }, { body: { persona: personaId, demo } })
  }
  const askFromMap = (question?: string) => { setOpen(true); if (question) send(question) }
  return <main className="qixia-viewport bg-background text-foreground">
    <HeroMap personaId={personaId} onPersonaChange={setPersonaId} onAsk={askFromMap} command={command} onPoiSelect={id => setMapNotice({ id: Date.now(), text: `这里是${POI_MAP[id].name}！想听听它的故事吗？` })} />

    <section id="ask" className="qixia-ask border-t border-border px-5 py-12 text-center"><p className="text-xs tracking-[0.35em] text-primary">ASK QIXIA</p><h2 className="my-3 font-serif text-3xl">让灵猫陪你游栖霞</h2><p className="mx-auto mb-5 max-w-lg text-sm leading-relaxed text-muted-foreground">问故事、看景点、选适合同行人的游览顺序。灵猫会帮你了解景点故事，找到适合自己的游览节奏。</p><button className="rounded-full bg-primary px-6 py-3 text-sm text-primary-foreground" onClick={() => setOpen(true)}>与栖霞灵猫聊聊</button></section>
     <PhotoEntry />
     <SiteFooter />
     <PetDock open={open} onOpen={setOpen} messages={messages} status={status} error={error} onSend={send} onStop={() => { void stop() }} onReset={() => setMessages([])} personaId={personaId} onCommand={execute} mapNotice={mapNotice} />
  </main>
}
