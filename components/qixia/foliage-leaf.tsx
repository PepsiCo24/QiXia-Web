const MAPLE_PATH =
  'M12 1.5 13.6 5.6 15.7 4.6 15.2 9.4 18.7 6.8 18.2 9 21.8 8.4 20.2 12 22.4 13 17.2 16.6 17.8 18.8 12.8 18 12.8 22.5 11.2 22.5 11.2 18 6.2 18.8 6.8 16.6 1.6 13 3.8 12 2.2 8.4 5.8 9 5.3 6.8 8.8 9.4 8.3 4.6 10.4 5.6Z'

const LEAF_TOP = 1.5
const LEAF_BOTTOM = 22.5
const BLEND = 0.08

type FoliageLeafProps = {
  rate: number
  className?: string
}

export function FoliageLeaf({ rate, className }: FoliageLeafProps) {
  const p = Math.min(Math.max(rate, 0), 100) / 100
  const redEnd = Math.max(p - BLEND / 2, 0)
  const greenStart = Math.min(p + BLEND / 2, 1)
  const fillLineY = LEAF_BOTTOM - (LEAF_BOTTOM - LEAF_TOP) * p

  return (
    <svg
      viewBox="0 0 24 24"
      role="img"
      aria-label={`红叶转色 ${rate}%`}
      className={className}
    >
      <defs>
        <linearGradient
          id="foliage-leaf-fill"
          gradientUnits="userSpaceOnUse"
          x1="0"
          y1={LEAF_BOTTOM}
          x2="0"
          y2={LEAF_TOP}
        >
          <stop offset="0" stopColor="#b5302a" />
          <stop offset={redEnd} stopColor="#d9482b" />
          <stop offset={greenStart} stopColor="#6b9a45" />
          <stop offset="1" stopColor="#4f7d35" />
        </linearGradient>
        <clipPath id="foliage-leaf-clip">
          <path d={MAPLE_PATH} />
        </clipPath>
      </defs>
      <path d={MAPLE_PATH} fill="url(#foliage-leaf-fill)" />
      <g clipPath="url(#foliage-leaf-clip)" stroke="rgba(255,255,255,0.35)" strokeWidth="0.5" fill="none">
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
        clipPath="url(#foliage-leaf-clip)"
      />
    </svg>
  )
}
