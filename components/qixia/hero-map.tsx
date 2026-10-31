'use client'

import { useEffect, useState } from 'react'
import type { MapCommand } from '@/lib/pet/pet-actions'
import { MapView, type LayerState } from './map-view'
import { TopBar } from './top-bar'
import { HourSlider, LayerPanel, LayerToggles } from './layer-panel'
import { PersonaPanel, PersonaTabs } from './persona-panel'
import { PoiCard } from './poi-card'
import { AlertStrip } from './alert-strip'
import type { PersonaId } from '@/lib/qixia-data'

interface HeroMapProps {
  personaId: PersonaId
  onPersonaChange: (id: PersonaId) => void
  onAsk: (question?: string) => void
  command: { id: number; action: MapCommand } | null
  onPoiSelect: (id: string) => void
}

export function HeroMap({ personaId, onPersonaChange, onAsk, command, onPoiSelect }: HeroMapProps) {
  const [layers, setLayers] = useState<LayerState>({ heat: true, devices: false, traffic: true, alerts: true })
  const [hour, setHour] = useState(11)
  const [selectedPoiId, setSelectedPoiId] = useState<string | null>(null)

  const selectPoi = (id: string) => { setSelectedPoiId(id); onPoiSelect(id) }
  useEffect(() => {
    if (!command) return
    const action = command.action
    if (action.type === 'focus_place' || action.type === 'show_poi_card') setSelectedPoiId(action.poiId)
    if (action.type === 'toggle_layer') setLayers(prev => ({ ...prev, [action.layer]: action.visible }))
  }, [command])
  const toggleLayer = (key: keyof LayerState) => setLayers((prev) => ({ ...prev, [key]: !prev[key] }))

  return (
    <section id="map" aria-label="栖霞山三维地图" className="relative h-[100svh] min-h-[680px] overflow-hidden">
      <MapView
        layers={layers}
        hour={hour}
        personaId={personaId}
        selectedPoiId={selectedPoiId}
        onSelectPoi={selectPoi}
      />

      <div className="map-vignette pointer-events-none absolute inset-0" aria-hidden="true" />

      <div className="pointer-events-none absolute inset-x-0 top-0 z-10 flex flex-col gap-2">
        <TopBar />
        <div className="pointer-events-auto mx-3 flex flex-col gap-2 lg:hidden">
          <div className="glass-panel p-1.5">
            <LayerToggles layers={layers} onToggle={toggleLayer} compact />
          </div>
        </div>
      </div>

      <div className="pointer-events-auto absolute top-20 left-4 z-10 hidden max-h-[calc(100%-12rem)] w-[300px] overflow-y-auto lg:block">
        <LayerPanel layers={layers} onToggle={toggleLayer} hour={hour} onHourChange={setHour} />
      </div>

      <div className="pointer-events-auto absolute top-20 right-4 z-10 hidden max-h-[calc(100%-12rem)] w-[340px] overflow-y-auto lg:block">
        <PersonaPanel
          personaId={personaId}
          onPersonaChange={onPersonaChange}
          onSelectPoi={selectPoi}
          onAsk={() => onAsk()}
        />
      </div>

      <div className="pointer-events-none absolute inset-x-0 bottom-0 z-10 flex flex-col items-center gap-3 px-3 pb-4">
        {selectedPoiId && (
          <div className="pointer-events-auto w-full max-w-md">
            <PoiCard
              poiId={selectedPoiId}
              hour={hour}
              onClose={() => setSelectedPoiId(null)}
              onAsk={(q) => onAsk(q)}
            />
          </div>
        )}
        <div className="pointer-events-auto flex w-full max-w-md flex-col gap-2 lg:hidden">
          <div className="glass-panel flex flex-col gap-2 p-2">
            <PersonaTabs personaId={personaId} onPersonaChange={onPersonaChange} />
            <div className="px-1">
              <HourSlider hour={hour} onHourChange={setHour} />
            </div>
          </div>
        </div>
        <div className="pointer-events-auto w-full">
          <AlertStrip />
        </div>
      </div>
    </section>
  )
}
