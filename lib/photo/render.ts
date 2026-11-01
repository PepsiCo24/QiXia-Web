import { getFrame, PHOTO_HEIGHT, PHOTO_WIDTH, type FrameId, type PhotoFrame } from "./frames"

export interface EditSettings {
  zoom: number
  /** -1 = left/top edge of the source, +1 = right/bottom; zero centers overflow. */
  x: number
  y: number
  filter: "none" | "bright" | "soft" | "warm"
  /** Color treatment strength, from 0 to 1. */
  intensity: number
}

export const DEFAULT_EDIT: EditSettings = {
  zoom: 1, x: 0, y: 0, filter: "none", intensity: 0.65,
}

export interface PhotoAssets {
  cat: HTMLImageElement
}

let assetsPromise: Promise<PhotoAssets> | undefined

/** Call in a client effect/event. The same-origin PNG keeps exports origin-clean. */
export function loadPhotoAssets(): Promise<PhotoAssets> {
  if (typeof Image === "undefined") {
    return Promise.reject(new Error("Photo assets can only be loaded in a browser"))
  }
  if (!assetsPromise) {
    assetsPromise = new Promise<PhotoAssets>((resolve, reject) => {
      const cat = new Image()
      cat.onload = () => resolve({ cat })
      cat.onerror = () => reject(new Error("无法加载灵猫相框素材，请重试"))
      cat.src = `${process.env.NEXT_PUBLIC_BASE_PATH || ''}/pet/qixia-cat/frames/wave-0.png`
    }).catch((error: unknown) => {
      assetsPromise = undefined
      throw error
    })
  }
  return assetsPromise
}

const finite = (value: number, fallback: number) => Number.isFinite(value) ? value : fallback
const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value))
const PHOTO_BOTTOM = 1380

/**
 * One renderer for camera, editor and export. Design space is 1200 × 1600;
 * callers set canvas dimensions (e.g. 600 × 800 preview / 1200 × 1600 export).
 * Use the same settings, assets, date and mirror flag for preview and export.
 * `original` skips only the color treatment, preserving framing and placement.
 * x/y position overflow AFTER mirroring, so drag direction stays screen-relative.
 * Source must be origin-clean (camera, local Blob, or same-origin/CORS image).
 */
export function drawComposition(
  canvas: HTMLCanvasElement,
  source: CanvasImageSource | null,
  sourceWidth: number,
  sourceHeight: number,
  settings: EditSettings,
  frameId: FrameId,
  assets: PhotoAssets,
  date: string,
  mirror = false,
  original = false,
): void {
  const ctx = canvas.getContext("2d")
  if (!ctx || canvas.width === 0 || canvas.height === 0) return
  const frame = getFrame(frameId)
  ctx.save()
  try {
    ctx.setTransform(1, 0, 0, 1, 0, 0)
    ctx.globalAlpha = 1
    ctx.globalCompositeOperation = "source-over"
    ctx.filter = "none"
    ctx.shadowColor = "transparent"
    ctx.clearRect(0, 0, canvas.width, canvas.height)
    ctx.scale(canvas.width / PHOTO_WIDTH, canvas.height / PHOTO_HEIGHT)
    ctx.imageSmoothingEnabled = true
    ctx.imageSmoothingQuality = "high"

    ctx.save()
    ctx.beginPath()
    ctx.rect(0, 0, PHOTO_WIDTH, PHOTO_BOTTOM)
    ctx.clip()
    if (source && Number.isFinite(sourceWidth) && Number.isFinite(sourceHeight) && sourceWidth > 0 && sourceHeight > 0) {
      const zoom = clamp(finite(settings.zoom, 1), 1, 4)
      const scale = Math.max(PHOTO_WIDTH / sourceWidth, PHOTO_BOTTOM / sourceHeight) * zoom
      const width = sourceWidth * scale
      const height = sourceHeight * scale
      const x = -(width - PHOTO_WIDTH) * (clamp(finite(settings.x, 0), -1, 1) + 1) / 2
      const y = -(height - PHOTO_BOTTOM) * (clamp(finite(settings.y, 0), -1, 1) + 1) / 2
      if (mirror) {
        ctx.translate(x + width, y)
        ctx.scale(-1, 1)
        ctx.drawImage(source, 0, 0, width, height)
      } else {
        ctx.drawImage(source, x, y, width, height)
      }
    } else {
      const background = ctx.createLinearGradient(0, 0, PHOTO_WIDTH, PHOTO_BOTTOM)
      background.addColorStop(0, "#365341")
      background.addColorStop(1, "#1b3026")
      ctx.fillStyle = background
      ctx.fillRect(0, 0, PHOTO_WIDTH, PHOTO_BOTTOM)
    }
    ctx.restore()

    if (source && !original && settings.filter !== "none") {
      applyColor(ctx, canvas.width, Math.ceil(canvas.height * PHOTO_BOTTOM / PHOTO_HEIGHT), settings)
    }
    drawFrame(ctx, frame, assets, date)
  } finally {
    ctx.restore()
  }
}

/** Pointwise RGB transforms, independent of ctx.filter and device scale.
 * 64-row strips cap temporary pixel memory at ~300 KB for a 1200px export.
 * Only the photographed area is treated; frame colors and cat remain original.
 */
function applyColor(ctx: CanvasRenderingContext2D, width: number, height: number, settings: EditSettings): void {
  const strength = clamp(finite(settings.intensity, 0), 0, 1)
  if (strength === 0) return
  for (let top = 0; top < height; top += 64) {
    const pixels = ctx.getImageData(0, top, width, Math.min(64, height - top))
    const data = pixels.data
    for (let i = 0; i < data.length; i += 4) {
      const r = data[i], g = data[i + 1], b = data[i + 2]
      let red = r, green = g, blue = b
      switch (settings.filter) {
        case "bright":
          red = r * 1.06 + 12; green = g * 1.06 + 12; blue = b * 1.06 + 12
          break
        case "soft": {
          const luminance = r * 0.2126 + g * 0.7152 + b * 0.0722
          red = (r * 0.88 + luminance * 0.12) * 0.92 + 19
          green = (g * 0.88 + luminance * 0.12) * 0.92 + 19
          blue = (b * 0.88 + luminance * 0.12) * 0.92 + 19
          break
        }
        case "warm":
          red = r * 1.045 + 10; green = g * 1.015 + 3; blue = b * 0.94 - 3
          break
      }
      data[i] = r + (clamp(red, 0, 255) - r) * strength
      data[i + 1] = g + (clamp(green, 0, 255) - g) * strength
      data[i + 2] = b + (clamp(blue, 0, 255) - b) * strength
    }
    ctx.putImageData(pixels, 0, top)
  }
}

/** Small original maple silhouette; all leaves stay in the peripheral safe area. */
function leaf(ctx: CanvasRenderingContext2D, x: number, y: number, size: number, rotation: number, color: string): void {
  ctx.save()
  ctx.translate(x, y)
  ctx.rotate(rotation)
  ctx.scale(size, size)
  ctx.fillStyle = color
  ctx.beginPath()
  ctx.moveTo(0, -1)
  ctx.lineTo(0.18, -0.43); ctx.lineTo(0.48, -0.67)
  ctx.lineTo(0.43, -0.21); ctx.lineTo(0.91, -0.31)
  ctx.lineTo(0.64, 0.08); ctx.lineTo(0.8, 0.24)
  ctx.lineTo(0.2, 0.37); ctx.lineTo(0.07, 0.67)
  ctx.lineTo(-0.07, 0.67); ctx.lineTo(-0.2, 0.37)
  ctx.lineTo(-0.8, 0.24); ctx.lineTo(-0.64, 0.08)
  ctx.lineTo(-0.91, -0.31); ctx.lineTo(-0.43, -0.21)
  ctx.lineTo(-0.48, -0.67); ctx.lineTo(-0.18, -0.43)
  ctx.closePath(); ctx.fill()
  ctx.strokeStyle = color; ctx.lineWidth = 0.06
  ctx.beginPath(); ctx.moveTo(0, 0.3); ctx.lineTo(0.04, 0.95); ctx.stroke()
  ctx.restore()
}

function mountains(ctx: CanvasRenderingContext2D, frame: PhotoFrame): void {
  ctx.save()
  ctx.fillStyle = frame.accent
  ctx.globalAlpha = 0.24
  ctx.beginPath()
  ctx.moveTo(0, 1400); ctx.lineTo(0, 1330); ctx.lineTo(58, 1290)
  ctx.lineTo(112, 1340); ctx.lineTo(184, 1270); ctx.lineTo(272, 1360)
  ctx.lineTo(365, 1320); ctx.lineTo(485, 1400)
  ctx.closePath(); ctx.fill()
  ctx.globalAlpha = 0.7
  ctx.strokeStyle = frame.color; ctx.lineWidth = 3
  ctx.beginPath(); ctx.moveTo(0, 1380); ctx.lineTo(72, 1335)
  ctx.lineTo(115, 1359); ctx.lineTo(185, 1310); ctx.lineTo(278, 1380); ctx.stroke()
  ctx.restore()
}

function drawFrame(ctx: CanvasRenderingContext2D, frame: PhotoFrame, assets: PhotoAssets, date: string): void {
  // Narrow, translucent edge strokes leave the central face area completely clear.
  ctx.fillStyle = frame.paper
  ctx.fillRect(0, PHOTO_BOTTOM, PHOTO_WIDTH, PHOTO_HEIGHT - PHOTO_BOTTOM)
  ctx.save()
  ctx.globalAlpha = 0.8
  ctx.strokeStyle = frame.paper; ctx.lineWidth = 16
  ctx.strokeRect(8, 8, PHOTO_WIDTH - 16, PHOTO_BOTTOM - 8)
  ctx.strokeStyle = frame.color; ctx.lineWidth = 2
  ctx.strokeRect(23, 23, PHOTO_WIDTH - 46, PHOTO_BOTTOM - 23)
  ctx.restore()

  mountains(ctx, frame)
  const leafColor = frame.motif === "maple" ? frame.color : frame.accent
  leaf(ctx, 48, 67, 38, -0.45, leafColor)
  leaf(ctx, 95, 34, 23, 0.4, frame.accent)
  leaf(ctx, 1160, 113, 31, 0.55, leafColor)
  leaf(ctx, 1174, 1245, 28, -0.4, frame.accent)
  if (frame.motif === "maple") {
    leaf(ctx, 37, 180, 22, -0.8, frame.accent)
    leaf(ctx, 1110, 39, 28, 0.75, frame.color)
  }
  if (frame.motif === "moon") {
    ctx.save()
    ctx.fillStyle = frame.accent
    ctx.beginPath(); ctx.arc(1117, 60, 24, 0, Math.PI * 2); ctx.fill()
    ctx.restore()
  }
  if (frame.motif === "postcard") {
    ctx.save()
    ctx.strokeStyle = frame.accent; ctx.lineWidth = 3; ctx.setLineDash([10, 9])
    ctx.strokeRect(944, 1404, 206, 148)
    ctx.restore()
    // Small paw-print border marks are decorative, not substitute IP artwork.
    ctx.save()
    ctx.fillStyle = frame.accent
    for (const [px, py] of [[45, 345], [1155, 1030]]) {
      ctx.beginPath(); ctx.ellipse(px, py + 13, 13, 16, 0, 0, Math.PI * 2); ctx.fill()
      for (const [dx, dy] of [[-18, -7], [-7, -18], [8, -18], [20, -5]]) {
        ctx.beginPath(); ctx.ellipse(px + dx, py + dy, 5, 8, 0, 0, Math.PI * 2); ctx.fill()
      }
    }
    ctx.restore()
  }

  ctx.fillStyle = frame.ink
  ctx.textAlign = "left"
  ctx.textBaseline = "alphabetic"
  ctx.font = '500 39px "Songti SC", "Noto Serif CJK SC", serif'
  ctx.fillText("栖霞留影 · 栖小猫", 64, 1448, 820)
  ctx.font = '24px "PingFang SC", "Microsoft YaHei", sans-serif'
  ctx.fillText(frame.caption, 66, 1494, 820)
  ctx.globalAlpha = 0.72
  ctx.font = '19px "PingFang SC", "Microsoft YaHei", sans-serif'
  // Caller supplies a stable date rather than computing one during each render.
  ctx.fillText(date.slice(0, 40), 66, 1536, 400)
  ctx.font = '15px "PingFang SC", "Microsoft YaHei", sans-serif'
  ctx.fillText(frame.draftLabel, 66, 1571, 780)
  ctx.globalAlpha = 1

  const cat = assets.cat
  if (cat && cat.naturalWidth > 0 && cat.naturalHeight > 0) {
    const scale = Math.min(176 / cat.naturalWidth, 176 / cat.naturalHeight)
    const w = cat.naturalWidth * scale, h = cat.naturalHeight * scale
    ctx.drawImage(cat, 1042 - w / 2, 1565 - h, w, h)
  }
}
