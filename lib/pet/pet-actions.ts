import { z } from 'zod'
import { PERSONA_MAP, POI_MAP } from '../qixia-data'

export const petAnimations = ['idle', 'wave', 'listen', 'think', 'talk', 'guide', 'jump', 'celebrate', 'curious', 'sleep'] as const
const poiId = z.string().refine((id) => Object.hasOwn(POI_MAP, id), 'Unknown POI')
const personaId = z.enum(['family', 'youth', 'culture', 'elder', 'photo']).refine((id) => Object.hasOwn(PERSONA_MAP, id), 'Unknown persona')

export const mapCommandSchema = z.discriminatedUnion('type', [
  z.object({ type: z.literal('focus_place'), poiId }).strict(),
  z.object({ type: z.literal('show_poi_card'), poiId }).strict(),
  z.object({ type: z.literal('select_persona'), personaId }).strict(),
  z.object({ type: z.literal('show_route'), personaId }).strict(),
  z.object({ type: z.literal('toggle_layer'), layer: z.enum(['heat', 'devices', 'traffic', 'alerts']), visible: z.boolean() }).strict(),
  z.object({ type: z.literal('show_facilities') }).strict(),
  z.object({ type: z.literal('play_animation'), animation: z.enum(petAnimations) }).strict(),
])
export type MapCommand = z.infer<typeof mapCommandSchema>

/** Both model tools and local mode pass through the same allowlist. */
export function executeMapCommand(input: unknown): { commands: MapCommand[] } {
  return { commands: [mapCommandSchema.parse(input)] }
}
