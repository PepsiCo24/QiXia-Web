'use client'

import { Clock, Footprints, MessageCircleQuestion, Mountain } from 'lucide-react'
import { PERSONAS, PERSONA_MAP, POI_MAP, formatDuration, type PersonaId } from '@/lib/qixia-data'
import { cn } from '@/lib/utils'

interface PersonaPanelProps {
  personaId: PersonaId
  onPersonaChange: (id: PersonaId) => void
  onSelectPoi: (id: string) => void
  onAsk: () => void
}

export function PersonaTabs({
  personaId,
  onPersonaChange,
  className,
}: Pick<PersonaPanelProps, 'personaId' | 'onPersonaChange'> & { className?: string }) {
  return (
    <div role="radiogroup" aria-label="选择同行方式" className={cn('flex gap-1', className)}>
      {PERSONAS.map((p) => (
        <button
          key={p.id}
          type="button"
          role="radio"
          aria-checked={p.id === personaId}
          onClick={() => onPersonaChange(p.id)}
          className={cn(
            'flex-1 whitespace-nowrap rounded-md px-2 py-1.5 text-xs transition-colors',
            p.id === personaId
              ? 'bg-primary text-primary-foreground'
              : 'text-muted-foreground hover:bg-secondary hover:text-foreground',
          )}
        >
          {p.short}
        </button>
      ))}
    </div>
  )
}

export function PersonaPanel({ personaId, onPersonaChange, onSelectPoi, onAsk }: PersonaPanelProps) {
  const persona = PERSONA_MAP[personaId]

  return (
    <section aria-labelledby="persona-title" className="glass-panel flex flex-col gap-4 p-4">
      <div>
        <p className="mb-2 text-xs text-muted-foreground">我是 · 一客一景</p>
        <PersonaTabs personaId={personaId} onPersonaChange={onPersonaChange} className="rounded-lg bg-secondary/60 p-1" />
      </div>

      <div>
        <h2 id="persona-title" className="font-serif text-lg font-bold text-foreground">
          {persona.routeName}
        </h2>
        <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{persona.cares}</p>
      </div>

      <dl className="grid grid-cols-3 gap-2 text-xs">
        <div className="flex flex-col gap-1 rounded-md bg-secondary/60 p-2">
          <dt className="flex items-center gap-1 text-muted-foreground">
            <Clock className="size-3" aria-hidden="true" />
            时长
          </dt>
          <dd className="text-foreground">{formatDuration(persona.durationMin)}</dd>
        </div>
        <div className="flex flex-col gap-1 rounded-md bg-secondary/60 p-2">
          <dt className="flex items-center gap-1 text-muted-foreground">
            <Footprints className="size-3" aria-hidden="true" />
            步行
          </dt>
          <dd className="text-foreground">{persona.distanceKm} km</dd>
        </div>
        <div className="flex flex-col gap-1 rounded-md bg-secondary/60 p-2">
          <dt className="flex items-center gap-1 text-muted-foreground">
            <Mountain className="size-3" aria-hidden="true" />
            强度
          </dt>
          <dd className="text-foreground">{persona.intensity}</dd>
        </div>
      </dl>

      <ol className="relative flex flex-col gap-0.5 before:absolute before:top-3 before:bottom-3 before:left-[11px] before:w-px before:bg-border">
        {persona.stops.map((id, i) => (
          <li key={id}>
            <button
              type="button"
              onClick={() => onSelectPoi(id)}
              className="group relative flex w-full items-center gap-3 rounded-md px-0 py-1.5 text-left"
            >
              <span className="z-10 flex size-6 shrink-0 items-center justify-center rounded-full border border-primary/60 bg-background font-mono text-[11px] text-primary group-hover:bg-primary group-hover:text-primary-foreground">
                {i + 1}
              </span>
              <span className="text-sm text-foreground group-hover:text-primary">{POI_MAP[id].name}</span>
              <span className="ml-auto text-[10px] text-muted-foreground">{POI_MAP[id].category}</span>
            </button>
          </li>
        ))}
      </ol>

      <p className="rounded-md border border-border px-3 py-2 text-xs leading-relaxed text-muted-foreground">
        <span className="text-accent">台阶：</span>
        {persona.stairs}
      </p>

      <button
        type="button"
        onClick={onAsk}
        className="flex items-center justify-center gap-2 rounded-md bg-foreground px-3 py-2.5 text-sm font-medium text-background transition-opacity hover:opacity-90"
      >
        <MessageCircleQuestion className="size-4" aria-hidden="true" />
        按“{persona.name}”问栖霞
      </button>
    </section>
  )
}
