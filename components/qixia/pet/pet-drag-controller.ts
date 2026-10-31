'use client'

import { useCallback, useEffect, useRef, useState, type CSSProperties, type MouseEvent as ReactMouseEvent, type PointerEvent as ReactPointerEvent } from 'react'

export type PetDockSide = 'left' | 'right'
export type PetFacing = 'left' | 'right'
/** Coordinates represent the pet's top-left across its available travel range. */
export interface PetNormalizedPosition { x: number; y: number; side: PetDockSide }
export interface PetDragControllerOptions {
  initialPosition?: PetNormalizedPosition
  /** Optional localStorage key. Storage failures never interrupt dragging. */
  storageKey?: string
  /** Distance in CSS pixels before a pointer gesture becomes a drag (default 8). */
  threshold?: number
  /** Viewport inset in CSS pixels (default 12). Shrinks in very small viewports. */
  edgePadding?: number
  disabled?: boolean
  onAnimation?: (animation: 'walk-left' | 'walk-right' | 'landing') => void
  onPositionCommit?: (position: PetNormalizedPosition) => void
  onFacingChange?: (facing: PetFacing) => void
}
export interface PetDragHandlers {
  onPointerDown: (event: ReactPointerEvent<HTMLElement>) => void
  onPointerMove: (event: ReactPointerEvent<HTMLElement>) => void
  onPointerUp: (event: ReactPointerEvent<HTMLElement>) => void
  onPointerCancel: (event: ReactPointerEvent<HTMLElement>) => void
  onLostPointerCapture: (event: ReactPointerEvent<HTMLElement>) => void
  onClickCapture: (event: ReactMouseEvent<HTMLElement>) => void
  style: CSSProperties
}
export interface PetDragController {
  /** Attach to a fixed positioning wrapper, outside any transformed ancestor.
   * This hook owns its position/left/top/right/bottom/transform styles. */
  ref: (element: HTMLElement | null) => void
  /** Spread on the interactive button. Preserves keyboard clicks; suppresses drag clicks. */
  handlers: PetDragHandlers
  /** Updated at commits, never for every pointer move. */
  position: PetNormalizedPosition
  side: PetDockSide
  facing: PetFacing
  isDragging: boolean
  /** Restore/reset a free two-axis normalized position and persist it. */
  setPosition: (position: PetNormalizedPosition) => void
}
interface Bounds { left: number; top: number; width: number; height: number }
interface Point { x: number; y: number }
interface Gesture { id: number; target: HTMLElement; start: Point; origin: Point; moved: boolean }
const unit = (value: number) => Number.isFinite(value) ? Math.min(1, Math.max(0, value)) : 0.5

export function normalizePetPosition(value: PetNormalizedPosition): PetNormalizedPosition {
  return { x: unit(value.x), y: unit(value.y), side: value.side === 'left' ? 'left' : 'right' }
}

/** Pure clamping helper: even a pet larger than the viewport has a stable origin. */
export function clampPetPoint(point: Point, bounds: Bounds): Point {
  return {
    x: Math.min(bounds.left + Math.max(0, bounds.width), Math.max(bounds.left, point.x)),
    y: Math.min(bounds.top + Math.max(0, bounds.height), Math.max(bounds.top, point.y)),
  }
}

/**
 * Free two-axis pointer dragging with direct translate3d writes, pointer capture,
 * viewport clamping and nearest-edge snapping. Use ref on a positioning wrapper
 * and spread handlers on its button. Keep sprite facing transforms on a child.
 * Initial/restored positions snap to their stored side. onPositionCommit fires
 * on release/cancellation, resize, and setPosition; storage is opt-in.
 */
export function usePetDragController(options: PetDragControllerOptions = {}): PetDragController {
  const initial = normalizePetPosition(options.initialPosition ?? { x: 1, y: 0.52, side: 'right' })
  const [position, updatePosition] = useState(initial)
  const [facing, updateFacing] = useState<PetFacing>(initial.side === 'left' ? 'right' : 'left')
  const [isDragging, setDragging] = useState(false)
  const element = useRef<HTMLElement | null>(null)
  const optionsRef = useRef(options)
  optionsRef.current = options
  const normalized = useRef(initial)
  const point = useRef<Point>({ x: initial.x, y: initial.y })
  const gesture = useRef<Gesture | null>(null)
  const facingRef = useRef(facing)
  const suppressed = useRef(false)
  const suppressTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const mounted = useRef(false)

  const getBounds = useCallback((): Bounds => {
    const rect = element.current?.getBoundingClientRect()
    const viewport = window.visualViewport
    const width = viewport?.width ?? window.innerWidth
    const height = viewport?.height ?? window.innerHeight
    const padding = Math.max(0, optionsRef.current.edgePadding ?? 12)
    const availableX = Math.max(0, width - (rect?.width ?? 0))
    const availableY = Math.max(0, height - (rect?.height ?? 0))
    const insetX = Math.min(padding, availableX / 2)
    const insetY = Math.min(padding, availableY / 2)
    return { left: (viewport?.offsetLeft ?? 0) + insetX, top: (viewport?.offsetTop ?? 0) + insetY,
      width: Math.max(0, availableX - insetX * 2), height: Math.max(0, availableY - insetY * 2) }
  }, [])

  const writePoint = useCallback((next: Point) => {
    point.current = next
    const node = element.current
    if (!node) return
    node.style.position = 'fixed'
    node.style.left = '0px'
    node.style.top = '0px'
    node.style.right = 'auto'
    node.style.bottom = 'auto'
    node.style.transform = `translate3d(${next.x}px, ${next.y}px, 0)`
  }, [])

  const face = useCallback((next: PetFacing) => {
    if (next === facingRef.current) return
    facingRef.current = next
    updateFacing(next)
    optionsRef.current.onFacingChange?.(next)
  }, [])

  const commit = useCallback((next: Point, notify = true) => {
    const bounds = getBounds()
    const clamped = clampPetPoint(next, bounds)
    const side: PetDockSide = clamped.x < bounds.left + bounds.width / 2 ? 'left' : 'right'
    writePoint(clamped)
    const value: PetNormalizedPosition = {
      x: bounds.width ? unit((clamped.x - bounds.left) / bounds.width) : 0.5,
      y: bounds.height ? unit((clamped.y - bounds.top) / bounds.height) : normalized.current.y, side,
    }
    normalized.current = value
    updatePosition(value)
    face(side === 'left' ? 'right' : 'left')
    if (optionsRef.current.storageKey) {
      try { localStorage.setItem(optionsRef.current.storageKey, JSON.stringify(value)) } catch { /* optional */ }
    }
    if (notify) optionsRef.current.onPositionCommit?.(value)
  }, [face, getBounds, writePoint])

  const suppressClick = useCallback(() => {
    suppressed.current = true
    if (suppressTimer.current) clearTimeout(suppressTimer.current)
    suppressTimer.current = setTimeout(() => { suppressed.current = false }, 700)
  }, [])

  const finish = useCallback((pointerId?: number, cancelled = false) => {
    const active = gesture.current
    if (!active || (pointerId !== undefined && pointerId !== active.id)) return
    gesture.current = null // clear before releasePointerCapture dispatches lostpointercapture
    try { if (active.target.hasPointerCapture(active.id)) active.target.releasePointerCapture(active.id) } catch { /* detached target */ }
    if (cancelled || active.moved) suppressClick()
    if (active.moved) {
      setDragging(false)
      commit(point.current)
      optionsRef.current.onAnimation?.('landing')
    }
  }, [commit, suppressClick])

  const restore = useCallback((value: PetNormalizedPosition, notify: boolean) => {
    const next = normalizePetPosition(value)
    normalized.current = next
    const bounds = getBounds()
    commit({ x: bounds.left + next.x * bounds.width, y: bounds.top + next.y * bounds.height }, notify)
  }, [commit, getBounds])

  const ref = useCallback((node: HTMLElement | null) => {
    element.current = node
    if (node && mounted.current) restore(normalized.current, false)
  }, [restore])

  useEffect(() => {
    mounted.current = true
    let saved = normalized.current
    const key = optionsRef.current.storageKey
    if (key) {
      try {
        const value: unknown = JSON.parse(localStorage.getItem(key) ?? 'null')
        if (value && typeof value === 'object' && 'x' in value && 'y' in value && 'side' in value &&
          typeof value.x === 'number' && typeof value.y === 'number' && Number.isFinite(value.x) && Number.isFinite(value.y) &&
          (value.side === 'left' || value.side === 'right')) saved = normalizePetPosition(value as PetNormalizedPosition)
      } catch { /* optional */ }
    }
    restore(saved, false)
    const resize = () => { finish(undefined, true); restore(normalized.current, true) }
    const blur = () => finish(undefined, true)
    const hidden = () => { if (document.hidden) blur() }
    const pointerUp = (event: PointerEvent) => finish(event.pointerId)
    const pointerCancel = (event: PointerEvent) => finish(event.pointerId, true)
    window.addEventListener('resize', resize)
    window.addEventListener('blur', blur)
    window.addEventListener('pointerup', pointerUp)
    window.addEventListener('pointercancel', pointerCancel)
    document.addEventListener('visibilitychange', hidden)
    window.visualViewport?.addEventListener('resize', resize)
    window.visualViewport?.addEventListener('scroll', resize)
    const observer = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(resize)
    if (element.current) observer?.observe(element.current)
    return () => {
      mounted.current = false
      const active = gesture.current
      gesture.current = null
      if (active) {
        try { if (active.target.hasPointerCapture(active.id)) active.target.releasePointerCapture(active.id) } catch { /* detached */ }
      }
      if (suppressTimer.current) clearTimeout(suppressTimer.current)
      observer?.disconnect()
      window.removeEventListener('resize', resize)
      window.removeEventListener('blur', blur)
      window.removeEventListener('pointerup', pointerUp)
      window.removeEventListener('pointercancel', pointerCancel)
      document.removeEventListener('visibilitychange', hidden)
      window.visualViewport?.removeEventListener('resize', resize)
      window.visualViewport?.removeEventListener('scroll', resize)
    }
  }, [finish, restore])

  useEffect(() => { if (options.disabled) finish(undefined, true) }, [options.disabled, finish])

  const handlers: PetDragHandlers = {
    style: { touchAction: 'none', userSelect: 'none' },
    onPointerDown(event) {
      if (optionsRef.current.disabled || !event.isPrimary || event.button !== 0 || gesture.current) return
      if (suppressTimer.current) clearTimeout(suppressTimer.current)
      suppressed.current = false
      gesture.current = { id: event.pointerId, target: event.currentTarget,
        start: { x: event.clientX, y: event.clientY }, origin: { ...point.current }, moved: false }
      try { event.currentTarget.setPointerCapture(event.pointerId) } catch { /* window up/cancel still terminate */ }
    },
    onPointerMove(event) {
      const active = gesture.current
      if (!active || active.id !== event.pointerId) return
      const dx = event.clientX - active.start.x
      const dy = event.clientY - active.start.y
      if (!active.moved && Math.hypot(dx, dy) < Math.max(0, optionsRef.current.threshold ?? 8)) return
      if (!active.moved) {
        active.moved = true
        setDragging(true)
        optionsRef.current.onAnimation?.(facingRef.current === 'left' ? 'walk-left' : 'walk-right')
      }
      event.preventDefault()
      const next = clampPetPoint({ x: active.origin.x + dx, y: active.origin.y + dy }, getBounds())
      if (next.x !== point.current.x) {
        const direction = next.x > point.current.x ? 'right' : 'left'
        face(direction)
        optionsRef.current.onAnimation?.(direction === 'left' ? 'walk-left' : 'walk-right')
      }
      writePoint(next)
    },
    onPointerUp(event) { finish(event.pointerId) },
    onPointerCancel(event) { finish(event.pointerId, true) },
    onLostPointerCapture(event) { finish(event.pointerId, true) },
    onClickCapture(event) {
      if (suppressed.current && event.detail !== 0) {
        suppressed.current = false
        event.preventDefault()
        event.stopPropagation()
      }
    },
  }
  const setPosition = useCallback((next: PetNormalizedPosition) => {
    finish(undefined, true)
    restore(next, true)
  }, [finish, restore])
  return { ref, handlers, position, side: position.side, facing, isDragging, setPosition }
}
