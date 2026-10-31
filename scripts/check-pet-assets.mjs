import { readFile, readdir } from "node:fs/promises"
import path from "node:path"
import { fileURLToPath } from "node:url"

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..")
const assetDir = path.join(root, "public/pet/qixia-cat")
const manifestPath = path.join(assetDir, "manifest.json")
const names = ["idle", "walk-left", "walk-right", "dragged", "landing", "wave", "curious", "happy", "thinking", "talking", "guide", "jump", "celebrate", "sleep", "listen", "think", "talk"]
const errors = []
const warnings = []
const fail = (message) => errors.push(message)
const isObject = (value) => value !== null && typeof value === "object" && !Array.isArray(value)
const normalizedPoint = (point) => isObject(point) && [point.x, point.y].every((n) => Number.isFinite(n) && n >= 0 && n <= 1)

function pngInfo(buffer) {
  if (buffer.length < 26 || buffer.toString("ascii", 1, 4) !== "PNG") return null
  return { width: buffer.readUInt32BE(16), height: buffer.readUInt32BE(20), colorType: buffer[25] }
}

let manifest
try {
  manifest = JSON.parse(await readFile(manifestPath, "utf8"))
} catch (error) {
  fail(`Cannot read manifest.json: ${error.message}`)
}

if (manifest) {
  if (!isObject(manifest) || manifest.version !== 1 || !isObject(manifest.animations)) fail("Manifest must have version 1 and an animations object")
  if (manifest.anchor !== undefined && !normalizedPoint(manifest.anchor)) fail("Manifest anchor coordinates must be normalized from 0 to 1")
  const imageCache = new Map()
  const readImage = async (ref) => {
    if (imageCache.has(ref)) return imageCache.get(ref)
    if (typeof ref !== "string" || !ref || ref.includes("\\") || ref.split("/").includes("..") || path.isAbsolute(ref)) {
      fail(`Invalid local asset path: ${ref}`)
      return null
    }
    const filename = path.resolve(assetDir, ref)
    if (!filename.startsWith(`${assetDir}${path.sep}`)) {
      fail(`Asset path escapes qixia-cat directory: ${ref}`)
      return null
    }
    try {
      const info = pngInfo(await readFile(filename))
      if (!info) fail(`${ref} is not a PNG file`)
      else if (info.width < 1 || info.height < 1) fail(`${ref} has invalid dimensions`)
      else if (info.colorType !== 4 && info.colorType !== 6) warnings.push(`${ref} has no alpha channel; its background will be visible`)
      imageCache.set(ref, info)
      return info
    } catch {
      fail(`Missing asset: ${ref}`)
      return null
    }
  }
  for (const name of names) {
    const animation = manifest.animations?.[name]
    if (!isObject(animation) || typeof animation.loop !== "boolean" || !Array.isArray(animation.frames) || animation.frames.length === 0) {
      fail(`Animation '${name}' requires loop and at least one frame`)
      continue
    }
    for (let i = 0; i < animation.frames.length; i++) {
      const frame = animation.frames[i]
      const label = `${name} frame ${i}`
      if (!isObject(frame) || !Number.isFinite(frame.duration) || frame.duration <= 0) {
        fail(`${label} requires a positive duration`)
        continue
      }
      if (frame.anchor !== undefined && !normalizedPoint(frame.anchor)) fail(`${label} has an invalid normalized anchor`)
      const hasSource = typeof frame.src === "string" && frame.src.length > 0
      const hasSheet = typeof frame.sheet === "string" && frame.sheet.length > 0
      if (hasSource === hasSheet) {
        fail(`${label} must specify exactly one of src or sheet+crop`)
        continue
      }
      if (hasSource) await readImage(frame.src)
      else {
        if (!isObject(frame.crop) || ![frame.crop.x, frame.crop.y, frame.crop.width, frame.crop.height].every(Number.isFinite) || frame.crop.x < 0 || frame.crop.y < 0 || frame.crop.width <= 0 || frame.crop.height <= 0) {
          fail(`${label} has an invalid crop rectangle`)
          continue
        }
        const info = await readImage(frame.sheet)
        if (info && (frame.crop.x + frame.crop.width > info.width || frame.crop.y + frame.crop.height > info.height)) fail(`${label} crop exceeds ${frame.sheet} dimensions (${info.width}x${info.height})`)
      }
    }
  }
  for (const name of Object.keys(manifest.animations ?? {})) if (!names.includes(name)) warnings.push(`Unknown animation '${name}' is ignored`)
}

if (warnings.length) console.warn(warnings.map((message) => `WARN ${message}`).join("\n"))
if (errors.length) {
  console.error(errors.map((message) => `ERROR ${message}`).join("\n"))
  process.exitCode = 1
} else {
  const images = await readdir(path.join(assetDir, 'frames')).catch(() => [])
  console.log(`Pet asset manifest valid. ${images.filter((name) => name.endsWith(".png")).length} processed PNG frames present.`)
}
