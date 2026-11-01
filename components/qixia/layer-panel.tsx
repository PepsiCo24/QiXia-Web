'use client'

import { useLanguage } from "./language-provider";
import { Bus, Flame, Radio } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { CLOSE_HOUR, OPEN_HOUR, snapshot } from '@/lib/qixia-data'
import type { LayerState } from './map-view'
import { cn } from '@/lib/utils'

const LAYER_META: { key: keyof LayerState; label: string; icon: LucideIcon; tone: string }[] = [
  { key: 'heat', label: '客流热力', icon: Flame, tone: 'text-primary' },
  { key: 'devices', label: '设备状态', icon: Radio, tone: 'text-jade' },
  { key: 'traffic', label: '交通运力', icon: Bus, tone: 'text-accent' },
]

interface LayerPanelProps {
  layers: LayerState
  onToggle: (key: keyof LayerState) => void
  hour: number
  onHourChange: (hour: number) => void
  compact?: boolean
}

export function LayerToggles({ layers, onToggle, compact }: Pick<LayerPanelProps, 'layers' | 'onToggle' | 'compact'>) {
  const { locale, t } = useLanguage();
  return (
    <ul className={cn('grid gap-1.5', compact ? 'grid-cols-3' : 'grid-cols-2')}>
      {LAYER_META.map(({ key, label, icon: Icon, tone }) => {
        const active = layers[key]
        return (
          <li key={key}>
            <button
              type="button"
              aria-pressed={active}
              onClick={() => onToggle(key)}
              className={cn(
                'flex w-full items-center gap-2 rounded-md border px-2.5 py-2 text-left text-xs transition-colors',
                compact && 'flex-col gap-1 px-1 py-1.5 text-center text-[11px]',
                active
                  ? 'border-border bg-secondary text-foreground'
                  : 'border-transparent bg-transparent text-muted-foreground hover:bg-secondary/60',
              )}
            >
              <Icon className={cn('size-4 shrink-0', active ? tone : 'text-muted-foreground')} aria-hidden="true" />
              <span>{t(label, ({ heat: 'Visitor heatmap', devices: 'Device status', traffic: 'Transport capacity', alerts: 'Alerts' })[key])}</span>
            </button>
          </li>
        )
      })}
    </ul>
  )
}

export function LayerPanel({ hour, onHourChange }: LayerPanelProps) {
  const { locale, t } = useLanguage();
  const s = snapshot(hour)
  const loadPct = Math.round(s.loadRatio * 100)

  return (
    <section aria-label={t('运行数据', 'Operations data')} className="glass-panel flex flex-col gap-4 p-4">

      <div>
        <div className="flex items-end justify-between">
          <p className="text-xs text-muted-foreground">{t('在园游客', 'Visitors in park')}</p>
          <p className="text-xs text-muted-foreground">{t('承载率', 'Capacity used')} {loadPct}%</p>
        </div>
        <p className="font-mono text-3xl font-semibold tabular-nums text-foreground">
          {s.visitors.toLocaleString(locale)}
          <span className="ml-1 text-xs font-normal text-muted-foreground">/ {s.capacity.toLocaleString(locale)} {t('人', 'visitors')}</span>
        </p>
        <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-secondary" role="presentation">
          <div
            className={cn('h-full rounded-full', loadPct > 80 ? 'bg-primary' : loadPct > 55 ? 'bg-accent' : 'bg-jade')}
            style={{ width: `${Math.min(100, loadPct)}%` }}
          />
        </div>
      </div>

      <dl className="grid grid-cols-2 gap-2 text-center">
        <div className="rounded-md bg-secondary/60 px-1 py-2">
          <dt className="text-[10px] text-muted-foreground">{t('设备在线', 'Devices online')}</dt>
          <dd className="font-mono text-base tabular-nums text-jade">{Math.round(s.deviceOnlineRate * 100)}%</dd>
        </div>
        <div className="rounded-md bg-secondary/60 px-1 py-2">
          <dt className="text-[10px] text-muted-foreground">{t('停车余位', 'Parking spaces free')}</dt>
          <dd className="font-mono text-base tabular-nums text-accent">{s.parkingFree}</dd>
        </div>
      </dl>

      <HourSlider hour={hour} onHourChange={onHourChange} />
    </section>
  )
}

export function HourSlider({ hour, onHourChange }: Pick<LayerPanelProps, 'hour' | 'onHourChange'>) {
  const { locale, t } = useLanguage();
  return (
    <div>
      <div className="mb-1.5 flex items-center justify-between text-xs">
        <label htmlFor="hour-slider" className="text-muted-foreground">
          {t('客流时段回放', 'Visitor flow by hour')}
        </label>
        <span className="font-mono tabular-nums text-foreground">{String(hour).padStart(2, '0')}:00</span>
      </div>
      <input
        id="hour-slider"
        type="range"
        min={OPEN_HOUR}
        max={CLOSE_HOUR}
        step={1}
        value={hour}
        onChange={(e) => onHourChange(Number(e.target.value))}
        className="hour-range w-full"
      />
      <div className="mt-1 flex justify-between font-mono text-[10px] text-muted-foreground">
        <span>08:00</span>
        <span>13:00</span>
        <span>18:00</span>
      </div>
    </div>
  )
}
