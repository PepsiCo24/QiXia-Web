'use client'

import Image from 'next/image'
import { Leaf, MapPin, X } from 'lucide-react'
import { POI_MAP, crowdLevel, poiLoad } from '@/lib/qixia-data'
import { cn } from '@/lib/utils'

interface PoiCardProps {
  poiId: string
  hour: number
  onClose: () => void
  onAsk: (question: string) => void
}

const TONE_CLASS = {
  low: 'bg-jade/15 text-jade',
  mid: 'bg-accent/15 text-accent',
  high: 'bg-primary/15 text-primary',
}

export function PoiCard({ poiId, hour, onClose, onAsk }: PoiCardProps) {
  const poi = POI_MAP[poiId]
  const load = poiLoad(poi, hour)
  const level = crowdLevel(load / poi.peakLoad)

  return (
    <article aria-labelledby="poi-title" className="glass-panel w-full overflow-hidden">
      <div className="relative aspect-[16/9] w-full bg-secondary">
        <Image
          key={poi.id}
          src={`/images/poi/${poi.id}.jpg`}
          alt={`${poi.name}实景示意图`}
          fill
          sizes="(max-width: 768px) 100vw, 360px"
          className="object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent" aria-hidden="true" />
        <span className="absolute left-3 top-3 rounded-sm bg-black/50 px-1.5 py-0.5 text-[10px] text-white/90 backdrop-blur-sm">
          AI 示意图
        </span>
        <button
          type="button"
          onClick={onClose}
          aria-label="关闭景点卡片"
          className="absolute right-2 top-2 rounded-md bg-black/40 p-1 text-white backdrop-blur-sm hover:bg-black/60"
        >
          <X className="size-4" />
        </button>
        <div className="absolute inset-x-3 bottom-2.5">
          <p className="flex items-center gap-1.5 text-[11px] text-white/80">
            <MapPin className="size-3" aria-hidden="true" />
            {poi.category} · 海拔约 {poi.elevation} m · 坐标待核验
          </p>
          <h3 id="poi-title" className="mt-0.5 font-serif text-xl font-bold text-white">
            {poi.name}
          </h3>
        </div>
      </div>

      <div className="p-4 pt-3">
      <p className=" text-sm leading-relaxed text-foreground/90">{poi.brief}</p>
      <p className="mt-2 text-xs leading-relaxed text-muted-foreground">{poi.story}</p>

      <div className="mt-3 flex flex-wrap items-center gap-2 text-xs">
        <span className={cn('rounded-sm px-2 py-0.5', TONE_CLASS[level.tone])}>
          {String(hour).padStart(2, '0')}:00 · {level.label} · 约 {load} 人
        </span>
        <span className="flex items-center gap-1 rounded-sm bg-secondary px-2 py-0.5 text-muted-foreground">
          <Leaf className="size-3 text-primary" aria-hidden="true" />
          到达可解锁红枫叶章
        </span>
      </div>

      <button
        type="button"
        onClick={() => onAsk(`给我讲讲${poi.name}，现在去合适吗？`)}
        className="mt-3 w-full rounded-md border border-primary/50 px-3 py-2 text-sm text-primary transition-colors hover:bg-primary hover:text-primary-foreground"
      >
        继续追问 {poi.name}
      </button>
      </div>
    </article>
  )
}
