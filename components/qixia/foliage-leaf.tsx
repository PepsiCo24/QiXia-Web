'use client'

import { useEffect, useId, useRef, useState } from 'react'

const MAPLE_PATH =
  'M12 1.5 13.6 5.6 15.7 4.6 15.2 9.4 18.7 6.8 18.2 9 21.8 8.4 20.2 12 22.4 13 17.2 16.6 17.8 18.8 12.8 18 12.8 22.5 11.2 22.5 11.2 18 6.2 18.8 6.8 16.6 1.6 13 3.8 12 2.2 8.4 5.8 9 5.3 6.8 8.8 9.4 8.3 4.6 10.4 5.6Z'

const LEAF_TOP = 1.5
const LEAF_BOTTOM = 22.5
const BLEND = 0.08

const SWAY_DEGREES = 5
const SWAY_PERIOD_MS = 4500
const LIFT_MS = 400
const RATE_TWEEN_MS = 800
const FALL_MS = 2600

const easeInOutCubic = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2)

function prefersReducedMotion() {
  return typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

function useTweenedRate(target: number) {
  const [value, setValue] = useState(target)
  const valueRef = useRef(target)

  useEffect(() => {
    const from = valueRef.current
    if (from === target) return
    if (prefersReducedMotion()) {
      valueRef.current = target
      setValue(target)
      return
    }
    let frame = 0
    const start = performance.now()
    const step = (now: number) => {
      const t = Math.min((now - start) / RATE_TWEEN_MS, 1)
      const next = from + (target - from) * easeInOutCubic(t)
      valueRef.current = next
      setValue(next)
      if (t < 1) frame = requestAnimationFrame(step)
    }
    frame = requestAnimationFrame(step)
    return () => cancelAnimationFrame(frame)
  }, [target])

  return value
}

function useSway() {
  const ref = useRef<HTMLSpanElement>(null)

  useEffect(() => {
    const el = ref.current
    if (!el || prefersReducedMotion()) return
    let frame = 0
    const start = performance.now()
    const step = (now: number) => {
      const phase = ((now - start) / SWAY_PERIOD_MS) * Math.PI * 2
      el.style.transform = `rotate(${Math.sin(phase) * SWAY_DEGREES}deg)`
      frame = requestAnimationFrame(step)
    }
    frame = requestAnimationFrame(step)
    return () => cancelAnimationFrame(frame)
  }, [])

  return ref
}

function MapleSvg({ rate, className }: { rate: number; className?: string }) {
  const id = useId()
  const fillId = `${id}-fill`
  const clipId = `${id}-clip`
  const p = Math.min(Math.max(rate, 0), 100) / 100
  const redEnd = Math.max(p - BLEND / 2, 0)
  const greenStart = Math.min(p + BLEND / 2, 1)
  const fillLineY = LEAF_BOTTOM - (LEAF_BOTTOM - LEAF_TOP) * p

  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className={className}>
      <defs>
        <linearGradient id={fillId} gradientUnits="userSpaceOnUse" x1="0" y1={LEAF_BOTTOM} x2="0" y2={LEAF_TOP}>
          <stop offset="0" stopColor="#b5302a" />
          <stop offset={redEnd} stopColor="#d9482b" />
          <stop offset={greenStart} stopColor="#6b9a45" />
          <stop offset="1" stopColor="#4f7d35" />
        </linearGradient>
        <clipPath id={clipId}>
          <path d={MAPLE_PATH} />
        </clipPath>
      </defs>
      <path d={MAPLE_PATH} fill={`url(#${fillId})`} />
      <g clipPath={`url(#${clipId})`} stroke="rgba(255,255,255,0.35)" strokeWidth="0.5" fill="none">
        <path d="M12 22.5V5.5M12 12 5.5 8.5M12 12l6.5-3.5M12 15.5 4 13M12 15.5l8-2.5" />
      </g>
      <line
        x1="0"
        x2="24"
        y1={fillLineY}
        y2={fillLineY}
        stroke="rgba(255,255,255,0.7)"
        strokeWidth="0.6"
        strokeDasharray="1 1"
        clipPath={`url(#${clipId})`}
      />
    </svg>
  )
}

function FallingLeaf() {
  const ref = useRef<HTMLSpanElement>(null)
  const [done, setDone] = useState(false)

  useEffect(() => {
    const el = ref.current
    if (!el || prefersReducedMotion()) {
      setDone(true)
      return
    }
    const animation = el.animate(
      [
        { transform: 'translate(0, 0) rotate(0deg)', opacity: 0 },
        { transform: 'translate(-10px, 22px) rotate(-35deg)', opacity: 0.95, offset: 0.15 },
        { transform: 'translate(8px, 60px) rotate(40deg)', opacity: 0.85, offset: 0.5 },
        { transform: 'translate(-6px, 96px) rotate(-20deg)', opacity: 0.5, offset: 0.8 },
        { transform: 'translate(4px, 120px) rotate(15deg)', opacity: 0 },
      ],
      { duration: FALL_MS, delay: 600, easing: 'ease-in-out', fill: 'both' },
    )
    animation.onfinish = () => setDone(true)
    return () => animation.cancel()
  }, [])

  if (done) return null

  return (
    <span ref={ref} className="pointer-events-none absolute left-1/2 top-1/2 -ml-2 -mt-2 size-4" aria-hidden="true">
      <svg viewBox="0 0 24 24" className="size-full">
        <path d={MAPLE_PATH} fill="#d9482b" />
      </svg>
    </span>
  )
}

type FoliageStatusProps = {
  rate: number
  stage: string
}

export function FoliageStatus({ rate, stage }: FoliageStatusProps) {
  const displayRate = useTweenedRate(rate)
  const swayRef = useSway()
  const [lifted, setLifted] = useState(false)
  const pulseTimer = useRef<ReturnType<typeof setTimeout>>(undefined)

  useEffect(() => () => clearTimeout(pulseTimer.current), [])

  const pulse = () => {
    setLifted(true)
    clearTimeout(pulseTimer.current)
    pulseTimer.current = setTimeout(() => setLifted(false), LIFT_MS)
  }

  return (
    <div className="flex items-center gap-2.5">
      <dt className="sr-only">红叶</dt>
      <span
        className="relative inline-flex shrink-0 cursor-pointer"
        style={{
          transform: lifted ? 'translateY(-3px) scale(1.06)' : 'translateY(0) scale(1)',
          transition: `transform ${LIFT_MS}ms cubic-bezier(0.34, 1.4, 0.64, 1)`,
        }}
        onPointerEnter={() => setLifted(true)}
        onPointerLeave={() => setLifted(false)}
        onClick={pulse}
        role="img"
        aria-label={`红叶转色 ${rate}%`}
      >
        <span ref={swayRef} className="inline-flex will-change-transform" style={{ transformOrigin: '50% 94%' }}>
          <MapleSvg rate={displayRate} className="size-11 drop-shadow-sm" />
        </span>
        <FallingLeaf />
      </span>
      <dd className="flex flex-col leading-tight text-foreground">
        <span className="font-serif text-xl font-bold tabular-nums text-primary">{Math.round(displayRate)}%</span>
        <span className="text-muted-foreground">红叶 {stage}</span>
      </dd>
    </div>
  )
}
