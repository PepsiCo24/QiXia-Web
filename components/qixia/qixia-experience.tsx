'use client'

import { useState } from 'react'
import { useChat } from '@ai-sdk/react'
import { HeroMap } from './hero-map'
import { AskSection } from './ask-section'
import { VisitorsSection } from './visitors-section'
import { SiteFooter } from './site-footer'
import type { PersonaId } from '@/lib/qixia-data'

function scrollToId(id: string) {
  document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
}

export function QixiaExperience() {
  const [personaId, setPersonaId] = useState<PersonaId>('family')
  const { messages, sendMessage, status, error, stop, setMessages } = useChat()

  const chatAvailable = process.env.NEXT_PUBLIC_GITHUB_PAGES !== 'true'
  const send = (text: string) => {
    if (chatAvailable) return sendMessage({ text }, { body: { persona: personaId } })
  }

  const askFromMap = (question?: string) => {
    scrollToId('ask')
    if (question) send(question)
  }

  return (
    <main className="bg-background text-foreground">
      <HeroMap personaId={personaId} onPersonaChange={setPersonaId} onAsk={askFromMap} />
      <AskSection
        personaId={personaId}
        onPersonaChange={setPersonaId}
        chatAvailable={chatAvailable}
        messages={messages}
        status={status}
        error={error}
        onSend={send}
        onStop={stop}
        onReset={() => setMessages([])}
      />
      <VisitorsSection
        personaId={personaId}
        onPick={(id) => {
          setPersonaId(id)
          scrollToId('map')
        }}
      />
      <SiteFooter />
    </main>
  )
}
