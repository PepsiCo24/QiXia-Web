'use client'

import { ArrowUpRight } from 'lucide-react'
import { PERSONAS, POI_MAP, formatDuration, type PersonaId } from '@/lib/qixia-data'
import { cn } from '@/lib/utils'
import { useLanguage } from './language-provider'


const visitorEnglish: Record<Exclude<PersonaId, 'default'>, { name: string; cares: string; route: string; intensity: string; highlights: string[] }> = {
  family: {
    name: 'Families', cares: 'Stories children can understand and enjoy, with time to walk, rest and keep everyone together.',
    route: 'Maple Stamp Hunt · Little Explorers', intensity: 'Easy',
    highlights: ['Find the smallest Buddha at Thousand Buddha Cliff', 'A rest stop every 400 m', 'Collect six red maple leaf stamps'],
  },
  youth: {
    name: 'Young Travelers', cares: 'Local stories, photography, gentle hikes, creative images and time with friends.',
    route: 'Gentle Hike · Scenic Photo Trail', intensity: 'Moderate',
    highlights: ['Maple-covered rock walls at Dielang Cliff', 'Take in the views from Fengxiang Peak', 'Create a souvenir card with friends’ leaf stamps'],
  },
  culture: {
    name: 'Culture Lovers', cares: 'People, poetry, inscriptions, architecture and local history, with time for deeper questions.',
    route: 'Six Dynasties to Qing · Poetry & Inscriptions', intensity: 'Moderate',
    highlights: ['Ming Zhengjun Stele and Emperor Gaozong’s calligraphy', 'Eight stages of the Buddha’s life on the Sarira Pagoda', 'Historic inscriptions at Tiankai Rock'],
  },
  elder: {
    name: 'Senior Travelers', cares: 'Clear directions, a relaxed pace, convenient rest stops and refreshments, and rich cultural stories.',
    route: 'Unhurried Visit · Gentle Temple Trail', intensity: 'Easy',
    highlights: ['Ask about rest stops and refreshments first', 'Ask follow-up questions about any explanation', 'Larger text for senior travelers’ conversations'],
  },
  photo: {
    name: 'Photographers & Hikers', cares: 'Viewpoints, trails, seasons, light, energy levels and refreshments along the way.',
    route: 'Chasing Maple Light · Sunset Trail', intensity: 'Challenging',
    highlights: ['16:30 sunset window at Biyun Pavilion', 'Backlit red leaves on Maple Ridge', 'Two refreshment stops along the route'],
  },
}

interface VisitorsSectionProps {
  personaId: PersonaId
  onPick: (id: PersonaId) => void
}

export function VisitorsSection({ personaId, onPick }: VisitorsSectionProps) {
  const { t, poi, locale } = useLanguage()
  return (
    <section id="visitors" aria-labelledby="visitors-title" className="border-t border-border bg-background">
      <div className="mx-auto max-w-6xl px-4 py-16 lg:py-24">
        <p className="text-xs tracking-[0.4em] text-primary">{t('来到栖霞', 'WHO COMES TO QIXIA')}</p>
        <h2 id="visitors-title" className="mt-2 font-serif text-3xl font-bold text-foreground lg:text-4xl">
          {t('来到栖霞的人', 'The People of Qixia')}
        </h2>
        <p className="mt-3 max-w-2xl text-sm leading-relaxed text-muted-foreground">
          {t('同一座山，五种走法。选择一种同行方式，地图会重新规划路线、提示台阶与补给，问答也会切换到对应视角。', 'One mountain, five ways to explore. Choose your travel style to update the route, steps and refreshment tips on the map, and tailor your guide’s answers.')}
        </p>

        <ul className="mt-10 grid gap-3 md:grid-cols-2 lg:grid-cols-5">
          {PERSONAS.map((p, index) => {
            const en = visitorEnglish[p.id === 'default' ? 'family' : p.id]
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
                    <h3 className="font-serif text-xl font-bold text-foreground">{t(p.name, en.name)}</h3>
                    <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{t(p.cares, en.cares)}</p>
                  </div>
                  <div className="mt-auto flex flex-col gap-2 border-t border-border pt-4">
                    <p className="text-xs text-primary">{t(p.routeName, en.route)}</p>
                    <p className="text-xs text-muted-foreground">
                      {t(formatDuration(p.durationMin), `${Math.floor(p.durationMin / 60)} hr${p.durationMin % 60 ? ` ${p.durationMin % 60} min` : ''}`)} · {p.distanceKm} km · {t(p.intensity, en.intensity)}
                    </p>
                    <p className="text-xs leading-relaxed text-foreground/80">
                      {p.stops.map((id) => poi(POI_MAP[id].name, locale)).join(' → ')}
                    </p>
                    <ul className="mt-1 flex flex-col gap-1">
                      {p.highlights.map((h, i) => (
                        <li key={h} className="flex gap-1.5 text-xs text-muted-foreground">
                          <span className="mt-1.5 size-1 shrink-0 rounded-full bg-primary" aria-hidden="true" />
                          {t(h, en.highlights[i])}
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
