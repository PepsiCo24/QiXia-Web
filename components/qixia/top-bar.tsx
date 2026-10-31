import { Leaf, Sun, Sunset } from 'lucide-react'
import { FOLIAGE } from '@/lib/qixia-data'

const NAV = [
  { href: '#map', label: '立体看山' },
  { href: '#ask', label: '问栖霞' },
  { href: '#visitors', label: '来到栖霞的人' },
]

export function TopBar() {
  return (
    <header className="pointer-events-auto flex items-center justify-between gap-4 px-4 py-3 lg:px-6">
      <div className="flex items-center gap-3">
        <div className="flex size-9 items-center justify-center rounded-md bg-primary font-serif text-lg font-bold text-primary-foreground">
          栖
        </div>
        <div className="leading-tight">
          <p className="font-serif text-base font-bold tracking-widest text-foreground">栖霞山 · 数字游览</p>
          <p className="text-[10px] tracking-[0.3em] text-muted-foreground">QIXIA · 一客一景 · 一刻一路</p>
        </div>
      </div>

      <nav aria-label="主导航" className="hidden items-center gap-1 rounded-full border border-border bg-card/70 p-1 backdrop-blur-md md:flex">
        {NAV.map((item) => (
          <a
            key={item.href}
            href={item.href}
            className="rounded-full px-4 py-1.5 text-sm text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
          >
            {item.label}
          </a>
        ))}
      </nav>

      <dl className="hidden items-center gap-4 rounded-full border border-border bg-card/70 px-4 py-1.5 text-xs backdrop-blur-md sm:flex">
        <div className="flex items-center gap-1.5">
          <dt className="sr-only">红叶</dt>
          <Leaf className="size-3.5 text-primary" aria-hidden="true" />
          <dd className="text-foreground">
            红叶 {FOLIAGE.stage} {FOLIAGE.colorRate}%
          </dd>
        </div>
        <div className="flex items-center gap-1.5">
          <dt className="sr-only">天气</dt>
          <Sun className="size-3.5 text-accent" aria-hidden="true" />
          <dd className="text-muted-foreground">{FOLIAGE.weather}</dd>
        </div>
        <div className="hidden items-center gap-1.5 xl:flex">
          <dt className="sr-only">日落</dt>
          <Sunset className="size-3.5 text-accent" aria-hidden="true" />
          <dd className="text-muted-foreground">日落 {FOLIAGE.sunset}</dd>
        </div>
      </dl>
    </header>
  )
}
