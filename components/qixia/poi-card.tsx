'use client'

import { useState } from 'react'
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
  const [collected, setCollected] = useState<string[]>([])
  const poi = POI_MAP[poiId]
  const load = poiLoad(poi, hour)
  const level = crowdLevel(load / poi.peakLoad)

  return (
    <article aria-labelledby="poi-title" className="glass-panel w-full p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
            <MapPin className="size-3" aria-hidden="true" />
            {poi.category} · 海拔约 {poi.elevation} m · 坐标待核验
          </p>
          <h3 id="poi-title" className="mt-1 font-serif text-xl font-bold text-foreground">
            {poi.name}
          </h3>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="关闭景点卡片"
          className="rounded-md p-1 text-muted-foreground hover:bg-secondary hover:text-foreground"
        >
          <X className="size-4" />
        </button>
      </div>

      <p className="mt-2 text-sm leading-relaxed text-foreground/90">{poi.brief}</p>
      <p className="mt-2 text-xs leading-relaxed text-muted-foreground">{poi.story}</p>

      <div className="mt-3 flex flex-wrap items-center gap-2 text-xs">
        <span className={cn('rounded-sm px-2 py-0.5', TONE_CLASS[level.tone])}>
          {String(hour).padStart(2, '0')}:00 · {level.label} · 约 {load} 人
        </span>
        <button type="button" disabled={collected.includes(poiId)} onClick={() => { setCollected(prev => [...prev, poiId]); window.dispatchEvent(new CustomEvent('qixia-leaf-collected', { detail: { poiId } })) }} className="flex items-center gap-1 rounded-sm bg-secondary px-2 py-0.5 text-muted-foreground disabled:text-accent">
          <Leaf className="size-3 text-primary" aria-hidden="true" />
          {collected.includes(poiId) ? '已收集数字枫叶' : '收集数字枫叶纪念'}
        </button>
      </div>

      <button
        type="button"
        onClick={() => onAsk(`给我讲讲${poi.name}，现在去合适吗？`)}
        className="mt-3 w-full rounded-md border border-primary/50 px-3 py-2 text-sm text-primary transition-colors hover:bg-primary hover:text-primary-foreground"
      >
        继续追问 {poi.name}
      </button>
    </article>
  )
}
