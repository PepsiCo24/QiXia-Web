import { ChevronsDown } from 'lucide-react'
import { SAFETY_ALERTS, TRAFFIC_NODES } from '@/lib/qixia-data'
import { cn } from '@/lib/utils'

const LEVEL_CLASS = {
  预警: 'bg-primary text-primary-foreground',
  关注: 'bg-accent text-background',
  提示: 'bg-jade text-background',
}

export function AlertStrip() {
  const items = [
    ...SAFETY_ALERTS.map((a) => ({ id: a.id, tag: a.level, text: `${a.title} · ${a.detail}` })),
    ...TRAFFIC_NODES.map((n) => ({ id: n.id, tag: '交通' as const, text: `${n.name} · ${n.note}` })),
  ]

  return (
    <div className="flex flex-col items-center gap-3">
      <div className="glass-panel flex w-full max-w-3xl items-center gap-3 overflow-hidden px-3 py-2">
        <span className="shrink-0 font-serif text-xs font-bold tracking-widest text-foreground">实时播报</span>
        <div className="relative flex-1 overflow-hidden" aria-live="off">
          <ul className="ticker flex w-max gap-8">
            {[...items, ...items].map((item, i) => (
              <li key={`${item.id}-${i}`} aria-hidden={i >= items.length} className="flex shrink-0 items-center gap-2 text-xs">
                <span
                  className={cn(
                    'rounded-sm px-1.5 py-0.5 text-[10px] font-medium',
                    item.tag === '交通' ? 'bg-secondary text-foreground' : LEVEL_CLASS[item.tag],
                  )}
                >
                  {item.tag}
                </span>
                <span className="text-muted-foreground">{item.text}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
      <a
        href="#ask"
        className="flex flex-col items-center gap-0.5 text-xs tracking-[0.3em] text-foreground/80 transition-colors hover:text-primary"
      >
        下滑 · 问栖霞
        <ChevronsDown className="scroll-cue size-4" aria-hidden="true" />
      </a>
    </div>
  )
}
