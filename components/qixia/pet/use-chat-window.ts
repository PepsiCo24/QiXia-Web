'use client'

import { useLayoutEffect, useRef, type RefObject } from 'react'

type Bounds = { left: number; top: number; width: number; height: number }
const STORAGE_KEY = 'qixia-chat-window-v1'

/** Position relative to the cat until the visitor chooses a free window position. */
export function useChatWindow(host: RefObject<HTMLDivElement | null>, petButton: RefObject<HTMLButtonElement | null>, active: boolean) {
  const geometry = useRef<(Bounds & { detached: boolean }) | null>(null)
  useLayoutEffect(() => {
    if (!active) return
    const chat = host.current?.querySelector<HTMLElement>('.pet-chat')
    const dock = petButton.current?.closest('.pet-dock')
    if (!chat || !dock) return
    const viewport = () => {
      const v = window.visualViewport
      return { x: v?.offsetLeft ?? 0, y: v?.offsetTop ?? 0, width: v?.width ?? innerWidth, height: v?.height ?? innerHeight }
    }
    const clamp = (b: Bounds): Bounds => {
      const v = viewport(), maxWidth = Math.max(0, v.width - 24), maxHeight = Math.max(0, v.height - 24)
      const width = Math.min(maxWidth, Math.max(Math.min(300, maxWidth), b.width))
      const height = Math.min(maxHeight, Math.max(Math.min(280, maxHeight), b.height))
      return { width, height, left: Math.max(v.x + 12, Math.min(b.left, v.x + v.width - width - 12)), top: Math.max(v.y + 12, Math.min(b.top, v.y + v.height - height - 12)) }
    }
    if (!geometry.current) {
      try {
        const stored = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? 'null')
        if (stored && ['left', 'top', 'width', 'height'].every(key => Number.isFinite(stored[key]))) geometry.current = { ...stored, detached: stored.detached === true }
      } catch { /* storage is optional */ }
    }
    const save = () => { try { localStorage.setItem(STORAGE_KEY, JSON.stringify(geometry.current)) } catch { /* optional */ } }
    const render = () => {
      const v = viewport(), pet = dock.getBoundingClientRect()
      let b = geometry.current ?? { left: 0, top: 0, width: Math.min(380, v.width - 24), height: Math.min(520, v.height - 24), detached: false }
      if (!b.detached) {
        const width = Math.min(b.width, v.width - 24), height = Math.min(b.height, v.height - 24)
        const rightSpace = v.x + v.width - pet.right - 12, leftSpace = pet.left - v.x - 12
        b = { ...b, left: rightSpace >= width || rightSpace > leftSpace ? pet.right + 12 : pet.left - width - 12, top: pet.top + pet.height / 2 - height / 2 }
      }
      const fitted = clamp(b)
      // Retain the preferred size when a mobile keyboard temporarily shrinks the viewport.
      geometry.current = { ...b, left: fitted.left, top: fitted.top }
      Object.assign(chat.style, { left: `${fitted.left}px`, top: `${fitted.top}px`, width: `${fitted.width}px`, height: `${fitted.height}px`, maxHeight: `${fitted.height}px` })
      chat.dataset.detached = String(b.detached)
    }
    let gesture: { id: number; x: number; y: number; bounds: Bounds; resize: boolean; target: HTMLElement } | null = null
    const down = (e: PointerEvent) => {
      if (e.button !== 0 || !(e.target instanceof Element)) return
      const resize = e.target.closest<HTMLElement>('[data-chat-resize]')
      const header = e.target.closest<HTMLElement>('[data-chat-drag]')
      if (!resize && (!header || e.target.closest('button, input, a'))) return
      const rect = chat.getBoundingClientRect(), target = resize ?? header!
      gesture = { id: e.pointerId, x: e.clientX, y: e.clientY, bounds: { left: rect.left, top: rect.top, width: rect.width, height: rect.height }, resize: !!resize, target }
      target.setPointerCapture(e.pointerId)
      e.preventDefault(); e.stopPropagation()
    }
    const move = (e: PointerEvent) => {
      if (!gesture || gesture.id !== e.pointerId) return
      const dx = e.clientX - gesture.x, dy = e.clientY - gesture.y, b = gesture.bounds
      geometry.current = { ...clamp(gesture.resize ? { ...b, width: b.width + dx, height: b.height + dy } : { ...b, left: b.left + dx, top: b.top + dy }), detached: true }
      render()
    }
    const end = (e: PointerEvent) => {
      if (!gesture || gesture.id !== e.pointerId) return
      const target = gesture.target
      gesture = null
      if (target.hasPointerCapture(e.pointerId)) target.releasePointerCapture(e.pointerId)
      save()
    }
    const reset = () => { geometry.current = null; try { localStorage.removeItem(STORAGE_KEY) } catch { /* optional */ }; render() }
    const key = (e: KeyboardEvent) => {
      if (!(e.target instanceof HTMLElement) || !e.target.matches('[data-chat-resize], [data-chat-drag]') || !['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(e.key)) return
      e.preventDefault()
      const b = chat.getBoundingClientRect(), step = e.shiftKey ? 32 : 16
      const dx = e.key === 'ArrowLeft' ? -step : e.key === 'ArrowRight' ? step : 0
      const dy = e.key === 'ArrowUp' ? -step : e.key === 'ArrowDown' ? step : 0
      const resize = e.target.hasAttribute('data-chat-resize')
      geometry.current = { ...clamp({ left: b.left + (resize ? 0 : dx), top: b.top + (resize ? 0 : dy), width: b.width + (resize ? dx : 0), height: b.height + (resize ? dy : 0) }), detached: true }
      render(); save()
    }
    const movement = new MutationObserver(render)
    movement.observe(dock, { attributes: true, attributeFilter: ['style'] })
    chat.addEventListener('pointerdown', down)
    chat.addEventListener('pointermove', move)
    chat.addEventListener('pointerup', end)
    chat.addEventListener('pointercancel', end)
    chat.addEventListener('lostpointercapture', end)
    chat.addEventListener('keydown', key)
    chat.addEventListener('qixia-chat-reset', reset)
    window.addEventListener('resize', render)
    window.visualViewport?.addEventListener('resize', render)
    window.visualViewport?.addEventListener('scroll', render)
    render()
    return () => {
      movement.disconnect()
      chat.removeEventListener('pointerdown', down); chat.removeEventListener('pointermove', move)
      chat.removeEventListener('pointerup', end); chat.removeEventListener('pointercancel', end); chat.removeEventListener('lostpointercapture', end)
      chat.removeEventListener('keydown', key); chat.removeEventListener('qixia-chat-reset', reset)
      window.removeEventListener('resize', render)
      window.visualViewport?.removeEventListener('resize', render); window.visualViewport?.removeEventListener('scroll', render)
    }
  }, [host, petButton, active])
}
