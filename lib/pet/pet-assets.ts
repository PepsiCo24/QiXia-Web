export const PET_ANIMATIONS = [
  "idle",
  "walk-left",
  "walk-right",
  "wave",
  "jump",
  "sleep",
  "curious",
  "thinking",
  "happy",
  "dragged",
  "landing",
  "guide",
  "talking",
  "celebrate",
  "listen",
  "think",
  "talk",
] as const

export type PetAnimation = (typeof PET_ANIMATIONS)[number]

export interface Point {
  x: number
  y: number
}

export interface Crop {
  x: number
  y: number
  width: number
  height: number
}

export interface PetFrame {
  /** Relative path to a standalone frame image. */
  src?: string
  /** Relative path to a sprite sheet when this frame is a crop. */
  sheet?: string
  crop?: Crop
  /** Frame duration in milliseconds. */
  duration: number
  /** Normalized source point that should sit on the canvas anchor. */
  anchor?: Point
}

export interface PetAnimationAsset {
  loop: boolean
  frames: PetFrame[]
}

export interface PetAssetManifest {
  version: 1
  /** Shared normalized destination anchor; defaults to bottom-center. */
  anchor?: Point
  animations: Record<PetAnimation, PetAnimationAsset>
}

export const DEFAULT_PET_MANIFEST: PetAssetManifest = {
  version: 1,
  anchor: { x: 0.5, y: 1 },
  animations: {
    idle: { loop: true, frames: [] },
    "walk-left": { loop: true, frames: [] },
    "walk-right": { loop: true, frames: [] },
    wave: { loop: false, frames: [] },
    jump: { loop: false, frames: [] },
    sleep: { loop: true, frames: [] },
    curious: { loop: true, frames: [] },
    thinking: { loop: true, frames: [] },
    happy: { loop: true, frames: [] },
    dragged: { loop: true, frames: [] },
    landing: { loop: false, frames: [] },
    guide: { loop: true, frames: [] },
    talking: { loop: true, frames: [] },
    celebrate: { loop: false, frames: [] },
    listen: { loop: true, frames: [] },
    think: { loop: true, frames: [] },
    talk: { loop: true, frames: [] },
  },
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value)

const isPoint = (value: unknown): value is Point =>
  isRecord(value) &&
  typeof value.x === "number" && Number.isFinite(value.x) && value.x >= 0 && value.x <= 1 &&
  typeof value.y === "number" && Number.isFinite(value.y) && value.y >= 0 && value.y <= 1

export function validatePetManifest(value: unknown): asserts value is PetAssetManifest {
  if (!isRecord(value) || value.version !== 1 || !isRecord(value.animations)) {
    throw new Error("Pet manifest must have version 1 and an animations object")
  }
  if (value.anchor !== undefined && !isPoint(value.anchor)) {
    throw new Error("Manifest anchor must be normalized coordinates from 0 to 1")
  }
  for (const name of PET_ANIMATIONS) {
    const animation = value.animations[name]
    if (!isRecord(animation) || typeof animation.loop !== "boolean" || !Array.isArray(animation.frames) || animation.frames.length === 0) {
      throw new Error(`Animation '${name}' needs loop and at least one frame`)
    }
    for (const [index, frame] of animation.frames.entries()) {
      if (!isRecord(frame) || typeof frame.duration !== "number" || !Number.isFinite(frame.duration) || frame.duration <= 0) {
        throw new Error(`Animation '${name}' frame ${index} needs a positive duration`)
      }
      const standalone = typeof frame.src === "string" && frame.src.length > 0
      const cropped = typeof frame.sheet === "string" && frame.sheet.length > 0 && isRecord(frame.crop)
      if (standalone === cropped) {
        throw new Error(`Animation '${name}' frame ${index} must define exactly one of src or sheet+crop`)
      }
      if (cropped) {
        const crop = frame.crop as Record<string, unknown>
        if (![crop.x, crop.y, crop.width, crop.height].every((n) => typeof n === "number" && Number.isFinite(n)) ||
            (crop.x as number) < 0 || (crop.y as number) < 0 || (crop.width as number) <= 0 || (crop.height as number) <= 0) {
          throw new Error(`Animation '${name}' frame ${index} has an invalid crop`)
        }
      }
      if (frame.anchor !== undefined && !isPoint(frame.anchor)) {
        throw new Error(`Animation '${name}' frame ${index} anchor must be normalized coordinates`)
      }
    }
  }
}
