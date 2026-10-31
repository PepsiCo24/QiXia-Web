"use client"

import { useEffect, useRef } from "react"
import {
  DEFAULT_PET_MANIFEST,
  validatePetManifest,
  type PetAnimation,
  type PetAssetManifest,
  type PetFrame,
} from "@/lib/pet/pet-assets"

export type { PetAnimation } from "@/lib/pet/pet-assets"

interface SpriteAnimatorProps {
  state: PetAnimation
  reducedMotion?: boolean
  className?: string
  onComplete?: () => void
}

const WIDTH = 160
const HEIGHT = 160
const LOW_FPS_INTERVAL = 1000 / 12
const ASSET_ROOT = `${process.env.NEXT_PUBLIC_BASE_PATH || ""}/pet/qixia-cat`.replace(/\/$/, "")

interface LoadedAssets {
  manifest: PetAssetManifest
  images: Map<string, Promise<HTMLImageElement | null>>
}

const assetCache = new Map<string, Promise<LoadedAssets>>()
const MAX_CACHED_MANIFESTS = 4

function manifestUrl() {
  return `${ASSET_ROOT}/manifest.json`
}

function imageUrl(path: string) {
  return `${ASSET_ROOT}/${path.replace(/^\/+/, "")}`
}

function loadImage(path: string): Promise<HTMLImageElement | null> {
  return new Promise((resolve) => {
    const image = new Image()
    image.onload = () => resolve(image)
    image.onerror = () => resolve(null)
    image.src = imageUrl(path)
  })
}

function loadAssets(): Promise<LoadedAssets> {
  const url = manifestUrl()
  const cached = assetCache.get(url)
  if (cached) return cached

  const request = fetch(url)
    .then((response) => {
      if (!response.ok) throw new Error(`Pet manifest request failed: ${response.status}`)
      return response.json()
    })
    .then((value: unknown) => {
      validatePetManifest(value)
      const images = new Map<string, Promise<HTMLImageElement | null>>()
      const assets: LoadedAssets = { manifest: value, images }
      for (const animation of Object.values(value.animations)) {
        for (const frame of animation.frames) {
          const path = frame.src ?? frame.sheet
          if (path && !images.has(path)) images.set(path, loadImage(path))
        }
      }
      return assets
    })
    .catch(() => ({ manifest: DEFAULT_PET_MANIFEST, images: new Map() }))

  assetCache.set(url, request)
  while (assetCache.size > MAX_CACHED_MANIFESTS) {
    const oldest = assetCache.keys().next().value
    if (oldest === undefined) break
    assetCache.delete(oldest)
  }
  return request
}

function drawFallback(ctx: CanvasRenderingContext2D, state: PetAnimation, time: number, reduced: boolean) {
  const phase = reduced ? 0 : time / 1000
  const sleeping = state === "sleep"
  const wave = state === "wave" || state === "celebrate"
  const jump = state === "jump"
  const talking = state === "talk"
  const guiding = state === "guide"
  const thinking = state === "think"
  const curious = state === "curious"
  const breathe = reduced || jump ? 0 : Math.sin(phase * 2.3) * 1.4
  const bob = jump ? -12 * Math.abs(Math.sin(phase * 5)) : (talking || guiding || state === "idle" || state === "listen") ? breathe : 0
  const tailWag = reduced || sleeping ? 0 : Math.sin(phase * (wave ? 9 : 3)) * (wave ? 9 : 4)
  const blink = !reduced && !sleeping && Math.sin(phase * 1.7 + 0.4) > 0.985

  ctx.save()
  ctx.translate(0, bob)
  ctx.lineWidth = 3
  ctx.strokeStyle = "#452f2a"
  ctx.fillStyle = "#f2c18c"
  ctx.beginPath()
  ctx.moveTo(47, 57); ctx.lineTo(52, 25); ctx.lineTo(76, 43)
  ctx.moveTo(84, 43); ctx.lineTo(108, 25); ctx.lineTo(113, 57)
  ctx.closePath(); ctx.fill(); ctx.stroke()
  ctx.beginPath(); ctx.ellipse(80, 81, 42, 36, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke()
  ctx.beginPath(); ctx.ellipse(80, 126, 30, 19, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke()

  ctx.fillStyle = "#302623"
  if (sleeping || blink) {
    ctx.beginPath()
    ctx.moveTo(60, 79); ctx.lineTo(71, 79)
    ctx.moveTo(89, 79); ctx.lineTo(100, 79)
    ctx.stroke()
  } else {
    const eyeY = curious ? 77 : 78
    ctx.beginPath(); ctx.ellipse(66, eyeY, curious ? 3.5 : 3, curious ? 5.5 : 5, 0, 0, Math.PI * 2); ctx.fill()
    ctx.beginPath(); ctx.ellipse(94, eyeY, curious ? 3.5 : 3, curious ? 5.5 : 5, 0, 0, Math.PI * 2); ctx.fill()
  }
  ctx.fillStyle = "#c96e67"
  ctx.beginPath(); ctx.moveTo(76, 88); ctx.lineTo(84, 88); ctx.lineTo(80, 92); ctx.closePath(); ctx.fill()
  ctx.strokeStyle = "#6e4942"
  ctx.beginPath(); ctx.moveTo(80, 92); ctx.lineTo(80, 96)
  if (talking && !reduced) ctx.ellipse(80, 100 + (Math.sin(phase * 10) + 1) * 1.5, 4, 3, 0, 0, Math.PI)
  else ctx.quadraticCurveTo(74, 101, 70, 96)
  ctx.moveTo(80, 96); ctx.quadraticCurveTo(86, 101, 90, 96); ctx.stroke()
  ctx.beginPath(); ctx.moveTo(54, 90); ctx.lineTo(35, 87); ctx.moveTo(54, 96); ctx.lineTo(35, 98); ctx.moveTo(106, 90); ctx.lineTo(125, 87); ctx.moveTo(106, 96); ctx.lineTo(125, 98); ctx.stroke()

  ctx.save()
  ctx.translate(107, 122)
  ctx.rotate(tailWag * Math.PI / 180)
  ctx.beginPath(); ctx.moveTo(0, 0); ctx.quadraticCurveTo(38, -4, 28, -29); ctx.stroke()
  ctx.restore()
  if (wave || guiding) {
    const handLift = wave && !reduced ? Math.sin(phase * 9) * 5 : 0
    ctx.beginPath(); ctx.moveTo(108, 118); ctx.quadraticCurveTo(126, 99, 119, 76 + handLift); ctx.stroke()
    ctx.beginPath(); ctx.moveTo(113, 76 + handLift); ctx.lineTo(119, 68 + handLift); ctx.moveTo(119, 76 + handLift); ctx.lineTo(127, 72 + handLift); ctx.stroke()
  }
  if (thinking || curious) {
    ctx.fillStyle = "#fff7e7"; ctx.beginPath(); ctx.arc(117, 46, 10, 0, Math.PI * 2); ctx.fill(); ctx.stroke()
    ctx.fillStyle = "#302623"; ctx.font = "bold 14px sans-serif"; ctx.fillText(thinking ? "?" : "!", 113, 51)
  }
  if (sleeping) {
    ctx.fillStyle = "#6d8296"; ctx.font = "bold 14px sans-serif"; ctx.fillText("z", 116, 47); ctx.fillText("z", 128, 34)
  }
  ctx.restore()
}

function drawFrame(ctx: CanvasRenderingContext2D, canvas: HTMLCanvasElement, frame: PetFrame, image: HTMLImageElement, manifest: PetAssetManifest) {
  const crop = frame.crop
  const sourceWidth = crop?.width ?? image.naturalWidth
  const sourceHeight = crop?.height ?? image.naturalHeight
  if (!sourceWidth || !sourceHeight) return false

  const anchor = frame.anchor ?? manifest.anchor ?? { x: 0.5, y: 1 }
  const scale = Math.min(WIDTH / sourceWidth, HEIGHT / sourceHeight)
  const width = sourceWidth * scale
  const height = sourceHeight * scale
  const destinationX = WIDTH * 0.5 - anchor.x * width
  const destinationY = HEIGHT - anchor.y * height
  ctx.drawImage(
    image,
    crop?.x ?? 0,
    crop?.y ?? 0,
    sourceWidth,
    sourceHeight,
    destinationX,
    destinationY,
    width,
    height,
  )
  return true
}

export default function SpriteAnimator({ state, reducedMotion, className, onComplete }: SpriteAnimatorProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const completeRef = useRef(onComplete)
  completeRef.current = onComplete

  useEffect(() => {
    const canvas = canvasRef.current
    const ctx = canvas?.getContext("2d")
    if (!canvas || !ctx) return

    let disposed = false
    let visible = false
    let pageVisible = document.visibilityState === "visible"
    let raf = 0
    let elapsed = 0
    let previousTime = 0
    let lastPaint = 0
    let completeCalled = false
    let staticDrawn = false
    let assets: LoadedAssets = { manifest: DEFAULT_PET_MANIFEST, images: new Map() }
    let frames: PetFrame[] = []
    let loop = true
    const pixelRatio = Math.max(1, window.devicePixelRatio || 1)
    canvas.width = WIDTH * pixelRatio
    canvas.height = HEIGHT * pixelRatio
    ctx.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0)
    const isReduced = reducedMotion ?? window.matchMedia("(prefers-reduced-motion: reduce)").matches

    const stop = () => {
      if (raf) cancelAnimationFrame(raf)
      raf = 0
      previousTime = 0
    }
    const canAnimate = () => visible && pageVisible && !isReduced && (loop || !staticDrawn)
    const draw = (now: number) => {
      raf = 0
      if (disposed || !visible || !pageVisible) return
      if (previousTime) elapsed += Math.min(now - previousTime, 100)
      previousTime = now
      const shouldAnimate = canAnimate()
      if (shouldAnimate && lastPaint && now - lastPaint < LOW_FPS_INTERVAL) {
        raf = requestAnimationFrame(draw)
        return
      }
      lastPaint = now
      ctx.clearRect(0, 0, WIDTH, HEIGHT)

      const totalDuration = frames.reduce((sum, frame) => sum + frame.duration, 0)
      let frameIndex = 0
      if (frames.length && totalDuration > 0) {
        if (isReduced) {
          frameIndex = loop ? 0 : frames.length - 1
        } else if (!loop && elapsed >= totalDuration) {
          frameIndex = frames.length - 1
        } else {
          let cursor = loop ? elapsed % totalDuration : Math.min(elapsed, totalDuration - Number.EPSILON)
          while (frameIndex < frames.length - 1 && cursor >= frames[frameIndex].duration) {
            cursor -= frames[frameIndex].duration
            frameIndex++
          }
        }
      }

      const frame = frames[frameIndex]
      const imagePath = frame?.src ?? frame?.sheet
      const imagePromise = imagePath ? assets.images.get(imagePath) : undefined
      if (frame && imagePromise) {
        imagePromise.then((image) => {
          if (disposed || !visible || !pageVisible) return
          if (image && drawFrame(ctx, canvas, frame, image, assets.manifest)) return
          ctx.clearRect(0, 0, WIDTH, HEIGHT)
          drawFallback(ctx, state, elapsed, isReduced)
        })
      } else {
        drawFallback(ctx, state, elapsed, isReduced)
      }

      const finished = !loop && (isReduced || elapsed >= totalDuration)
      if (finished && !completeCalled) {
        completeCalled = true
        completeRef.current?.()
      }
      staticDrawn = isReduced || finished
      if (canAnimate()) raf = requestAnimationFrame(draw)
    }

    const requestDraw = () => {
      if (!disposed && visible && pageVisible && !raf) raf = requestAnimationFrame(draw)
    }
    const observer = new IntersectionObserver(([entry]) => {
      visible = Boolean(entry?.isIntersecting)
      if (visible) requestDraw()
      else stop()
    })
    observer.observe(canvas)
    const onVisibilityChange = () => {
      pageVisible = document.visibilityState === "visible"
      if (pageVisible) requestDraw()
      else stop()
    }
    document.addEventListener("visibilitychange", onVisibilityChange)

    loadAssets().then((loaded) => {
      if (disposed) return
      assets = loaded
      const animation = assets.manifest.animations[state]
      frames = animation?.frames ?? []
      loop = animation?.loop ?? true
      elapsed = 0
      previousTime = 0
      lastPaint = 0
      completeCalled = false
      staticDrawn = false
      requestDraw()
    })

    return () => {
      disposed = true
      stop()
      observer.disconnect()
      document.removeEventListener("visibilitychange", onVisibilityChange)
    }
  }, [state, reducedMotion])

  return <canvas ref={canvasRef} width={WIDTH} height={HEIGHT} role="img" aria-label={`Cat pet: ${state}`} className={className} />
}
