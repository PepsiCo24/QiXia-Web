'use client'

import { useCallback, useEffect, useRef, useState } from 'react'

/** Controller vocabulary, independent of the sprite manifest's legacy names. */
import type { PetAnimation } from '@/lib/pet/pet-assets'

export type PetControllerAnimation = PetAnimation

export type PetAnimationLane = 'interaction' | 'tool' | 'conversation' | 'wave'

export interface PetAnimationControllerOptions {
  thinking?: boolean
  talking?: boolean
  onAnimationChange?: (animation: PetControllerAnimation) => void
}

export interface PetAnimationController {
  animation: PetControllerAnimation
  /** Replaces only this animation's priority lane. Duration is milliseconds;
   * omitted duration uses a sensible default (dragged/conversation persist).
   * Lower lanes continue to expire while obscured by a higher lane. */
  play: (animation: PetControllerAnimation, duration?: number) => void
  /** Clear a single lane, or all explicit requests. Conversation props remain active. */
  stop: (lane?: PetAnimationLane) => void
  /** End a persistent dragged state without clearing tools or conversation. */
  clearInteraction: () => void
}

export function getPetAnimationLane(animation: PetControllerAnimation): PetAnimationLane | null {
  if (animation === 'idle') return null
  if (animation === 'dragged' || animation === 'landing' || animation === 'walk-left' || animation === 'walk-right') return 'interaction'
  if (animation === 'thinking' || animation === 'talking') return 'conversation'
  if (animation === 'wave') return 'wave'
  return 'tool'
}

type Requests = Partial<Record<PetAnimationLane, PetControllerAnimation>>

/** Pure priority resolver, also useful to consumers testing animation decisions. */
export function resolvePetAnimation(requests: Requests, thinking = false, talking = false): PetControllerAnimation {
  return requests.interaction ?? requests.tool ?? requests.conversation ??
    (talking ? 'talking' : thinking ? 'thinking' : undefined) ?? requests.wave ?? 'idle'
}

/**
 * Compose status props with imperative animations without races between effects.
 * `play('dragged')` persists until `play('landing')` (450ms default) or
 * clearInteraction(). Tools default to 2600ms; wave defaults to 1800ms.
 * Map thinking/talking to legacy think/talk at the renderer boundary if needed.
 */
export function usePetAnimationController(options: PetAnimationControllerOptions = {}): PetAnimationController {
  const [requests, setRequests] = useState<Requests>({})
  const timers = useRef<Partial<Record<PetAnimationLane, ReturnType<typeof setTimeout>>>>({})
  const optionsRef = useRef(options)
  optionsRef.current = options

  const stop = useCallback((lane?: PetAnimationLane) => {
    if (lane) {
      clearTimeout(timers.current[lane])
      delete timers.current[lane]
      setRequests(previous => { const next = { ...previous }; delete next[lane]; return next })
    } else {
      Object.values(timers.current).forEach(clearTimeout)
      timers.current = {}
      setRequests({})
    }
  }, [])

  const play = useCallback((animation: PetControllerAnimation, duration?: number) => {
    const lane = getPetAnimationLane(animation)
    if (!lane) { stop(); return }
    clearTimeout(timers.current[lane])
    delete timers.current[lane]
    setRequests(previous => ({ ...previous, [lane]: animation }))
    const lifetime = duration ?? (animation === 'dragged' || lane === 'conversation'
      ? Infinity : animation === 'landing' ? 450 : lane === 'wave' ? 1800 : 2600)
    if (Number.isFinite(lifetime)) {
      timers.current[lane] = setTimeout(() => {
        delete timers.current[lane]
        setRequests(previous => { const next = { ...previous }; delete next[lane]; return next })
      }, Math.max(0, lifetime))
    }
  }, [stop])

  const animation = resolvePetAnimation(requests, options.thinking, options.talking)
  useEffect(() => { optionsRef.current.onAnimationChange?.(animation) }, [animation])
  useEffect(() => () => { Object.values(timers.current).forEach(clearTimeout) }, [])
  const clearInteraction = useCallback(() => stop('interaction'), [stop])
  return { animation, play, stop, clearInteraction }
}
