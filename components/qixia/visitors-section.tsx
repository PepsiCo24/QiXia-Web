'use client'

import { ArrowUpRight } from 'lucide-react'
import { PERSONAS, POI_MAP, formatDuration, type PersonaId } from '@/lib/qixia-data'
import { cn } from '@/lib/utils'

interface VisitorsSectionProps {
  personaId: PersonaId
  onPick: (id: PersonaId) => void
}

export function VisitorsSection({ personaId, onPick }: VisitorsSectionProps) {
  return (
    <section id="visitors" aria-labelledby="visitors-title" className="border-t border-border bg-background">
      <div className="mx-auto max-w-6xl px-4 py-16 lg:py-24">
        <p className="text-xs tracking-[0.4em] text-primary">WHO COMES TO QIXIA</p>
        <h2 id="visitors-title" className="mt-2 font-serif text-3xl font-bold text-foreground lg:text-4xl">
          来到栖霞的人
        </h2>
        <p className="mt-3 max-w-2xl text-sm leading-relaxed text-muted-foreground">
          同一座山，五种走法。选择一种同行方式，地图会重新规划路线、提示台阶与补给，问答也会切换到对应视角。
        </p>

        <ul className="mt-10 grid gap-3 md:grid-cols-2 lg:grid-cols-5">
          {PERSONAS.map((p, index) => {
            const active = p.id === personaId
            return (
              <li key={p.id}>
                <button
                  type="button"
                  onClick={() => onPick(p.id)}
                  aria-pressed={active}
                  className={cn(
                    'group flex h-full w-full flex-col gap-4 rounded-xl border p-5 text-left transition-colors',
                    active ? 'border-primary bg-primary/10' : 'border-border bg-card hover:border-foreground/30',
                  )}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-xs text-muted-foreground">0{index + 1}</span>
                    <ArrowUpRight
                      className={cn('size-4 transition-colors', active ? 'text-primary' : 'text-muted-foreground group-hover:text-foreground')}
                      aria-hidden="true"
                    />
                  </div>
                  <div>
                    <h3 className="font-serif text-xl font-bold text-foreground">{p.name}</h3>
                    <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{p.cares}</p>
                  </div>
                  <div className="mt-auto flex flex-col gap-2 border-t border-border pt-4">
                    <p className="text-xs text-primary">{p.routeName}</p>
                    <p className="text-xs text-muted-foreground">
                      {formatDuration(p.durationMin)} · {p.distanceKm} km · {p.intensity}
                    </p>
                    <p className="text-xs leading-relaxed text-foreground/80">
                      {p.stops.map((id) => POI_MAP[id].name).join(' → ')}
                    </p>
                    <ul className="mt-1 flex flex-col gap-1">
                      {p.highlights.map((h) => (
                        <li key={h} className="flex gap-1.5 text-xs text-muted-foreground">
                          <span className="mt-1.5 size-1 shrink-0 rounded-full bg-primary" aria-hidden="true" />
                          {h}
                        </li>
                      ))}
                    </ul>
                  </div>
                </button>
              </li>
            )
          })}
        </ul>
      </div>
    </section>
  )
}
