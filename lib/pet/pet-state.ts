"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { type PetAnimation } from "./pet-assets"

export type { PetAnimation } from "./pet-assets"

export interface PetState {
  animation: PetAnimation
  play: (animation: PetAnimation, duration?: number) => void
}

export function usePetState(initial: PetAnimation = "idle"): PetState {
  const [animation, setAnimation] = useState<PetAnimation>(initial)
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const play = useCallback((next: PetAnimation, duration?: number) => {
    if (timer.current) clearTimeout(timer.current)
    timer.current = null
    setAnimation(next)
    if (duration !== undefined && Number.isFinite(duration) && duration >= 0 && next !== "idle") {
      timer.current = setTimeout(() => {
        timer.current = null
        setAnimation("idle")
      }, duration)
    }
  }, [])

  useEffect(() => () => {
    if (timer.current) clearTimeout(timer.current)
  }, [])

  return { animation, play }
}
