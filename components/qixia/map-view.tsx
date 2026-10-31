'use client'

import { useEffect, useRef, useState } from 'react'
import type { GeoJSONSource, Map as MapLibreMap, StyleSpecification } from 'maplibre-gl'
import type { Feature, LineString } from 'geojson'
import 'maplibre-gl/dist/maplibre-gl.css'
import {
  DEVICES,
  POIS,
  POI_MAP,
  QIXIA_CENTER,
  TRAFFIC_NODES,
  buildHeatFeatures,
  type PersonaId,
  PERSONA_MAP,
} from '@/lib/qixia-data'

export interface LayerState {
  heat: boolean
  devices: boolean
  traffic: boolean
  alerts: boolean
}

interface MapViewProps {
  layers: LayerState
  hour: number
  personaId: PersonaId
  selectedPoiId: string | null
  onSelectPoi: (id: string) => void
}

const TERRAIN_TILES = 'https://s3.amazonaws.com/elevation-tiles-prod/terrarium/{z}/{x}/{y}.png'

const MAP_STYLE: StyleSpecification = {
  version: 8,
  sources: {
    satellite: {
      type: 'raster',
      tiles: ['https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}'],
      tileSize: 256,
      maxzoom: 18,
      attribution: '影像 © Esri · 高程 © Mapzen / AWS Terrain Tiles',
    },
    terrain: { type: 'raster-dem', tiles: [TERRAIN_TILES], encoding: 'terrarium', tileSize: 256, maxzoom: 15 },
    hillshade: { type: 'raster-dem', tiles: [TERRAIN_TILES], encoding: 'terrarium', tileSize: 256, maxzoom: 15 },
  },
  layers: [
    { id: 'bg', type: 'background', paint: { 'background-color': '#0b100e' } },
    {
      id: 'satellite',
      type: 'raster',
      source: 'satellite',
      paint: { 'raster-saturation': -0.18, 'raster-brightness-min': 0.08, 'raster-brightness-max': 0.95, 'raster-contrast': 0.08 },
    },
    {
      id: 'hillshade',
      type: 'hillshade',
      source: 'hillshade',
      paint: {
        'hillshade-shadow-color': '#05100b',
        'hillshade-highlight-color': '#f3d9a4',
        'hillshade-accent-color': '#2a3a30',
        'hillshade-exaggeration': 0.22,
      },
    },
  ],
  terrain: { source: 'terrain', exaggeration: 1.9 },
  sky: {
    'sky-color': '#0d1714',
    'horizon-color': '#3a2b22',
    'fog-color': '#0b100e',
    'sky-horizon-blend': 0.6,
    'horizon-fog-blend': 0.6,
    'fog-ground-blend': 0.25,
    'atmosphere-blend': 0.4,
  },
}

const STATUS_COLOR = ['match', ['get', 'status'], 'online', '#6fbf9a', 'warning', '#e0a845', '#d9503a'] as const

function routeGeoJSON(personaId: PersonaId): Feature<LineString> {
  return {
    type: 'Feature',
    properties: {},
    geometry: {
      type: 'LineString',
      coordinates: PERSONA_MAP[personaId].stops.map((id) => POI_MAP[id].coordinates),
    },
  }
}

function overlayPadding(width: number) {
  if (width < 801) return { top: 155, bottom: 350, left: 55, right: 45 }
  if (width < 1024) return { top: 140, bottom: 120, left: 90, right: 320 }
  return { top: 120, bottom: 160, left: 110, right: 360 }
}

export function MapView({ layers, hour, personaId, selectedPoiId, onSelectPoi }: MapViewProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<MapLibreMap | null>(null)
  const poiElements = useRef<Map<string, HTMLElement>>(new Map())
  const trafficElements = useRef<HTMLElement[]>([])
  const onSelectRef = useRef(onSelectPoi)
  const [ready, setReady] = useState(false)
  const [failed, setFailed] = useState(false)

  useEffect(() => {
    onSelectRef.current = onSelectPoi
  }, [onSelectPoi])

  useEffect(() => {
    let cancelled = false
    let map: MapLibreMap | null = null
    let frame = 0
    let observer: ResizeObserver | undefined
    let overlayObserver: MutationObserver | undefined

    import('maplibre-gl').then((ml) => {
      if (cancelled || !containerRef.current) return

      map = new ml.Map({
        container: containerRef.current,
        style: MAP_STYLE,
        center: QIXIA_CENTER,
        zoom: 15.2,
        pitch: 64,
        bearing: -24,
        maxPitch: 80,
        minZoom: 12.5,
        maxZoom: 18.5,
        scrollZoom: true,
        attributionControl: { compact: true },
      })
      mapRef.current = map
      observer = new ResizeObserver(() => map?.resize())
      observer.observe(containerRef.current)
      overlayObserver = new MutationObserver(() => map?.resize())
      const section = containerRef.current.closest('section')
      if (section) overlayObserver.observe(section, { attributes: true })
      containerRef.current.dataset.mapReady = 'false'
      const publish = () => {
        if (!map || !containerRef.current) return
        containerRef.current.dataset.zoom = map.getZoom().toFixed(2)
        containerRef.current.dataset.bearing = map.getBearing().toFixed(2)
        containerRef.current.dataset.pitch = map.getPitch().toFixed(2)
        containerRef.current.dataset.center = map.getCenter().toArray().join(',')
      }
      map.on('moveend', publish)
      map.on('load', () => { if (containerRef.current) containerRef.current.dataset.mapReady = 'true'; publish() })
      map.addControl(new ml.NavigationControl({ visualizePitch: true }), 'bottom-right')
      // The compass resets north; provide a separate, reversible pitch control.
      map.addControl({
        onAdd(controlMap) {
          const group = document.createElement('div')
          group.className = 'maplibregl-ctrl maplibregl-ctrl-group'
          const button = document.createElement('button')
          button.type = 'button'
          button.className = 'qixia-view-toggle'
          const sync = () => {
            const overhead = controlMap.getPitch() < 10
            button.textContent = overhead ? '三维' : '俯视'
            button.title = overhead ? '切换三维视角' : '切换俯视视角'
            button.setAttribute('aria-label', button.title)
            button.setAttribute('aria-pressed', String(overhead))
          }
          button.onclick = () => {
            containerRef.current?.dispatchEvent(new Event('stopspin'))
            const overhead = controlMap.getPitch() < 10
            controlMap.stop()
            controlMap.easeTo({
              pitch: overhead ? 64 : 0,
              duration: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 0 : 700,
            })
          }
          group.append(button)
          controlMap.on('pitch', sync)
          sync()
          return group
        },
        onRemove() {},
      }, 'bottom-right')

      map.on('error', (e) => {
        console.error('Map error:', e.error?.message)
        if (String(e.error?.message ?? '').includes('WebGL')) setFailed(true)
      })

      const initLayers = () => {
        if (!map) return
        map.addSource('heat', { type: 'geojson', data: buildHeatFeatures(hour) })
        map.addLayer({
          id: 'heat',
          type: 'heatmap',
          source: 'heat',
          paint: {
            'heatmap-weight': ['get', 'w'],
            'heatmap-intensity': ['interpolate', ['linear'], ['zoom'], 13, 1.0, 17, 2.6],
            'heatmap-radius': ['interpolate', ['linear'], ['zoom'], 13, 12, 15, 26, 17, 60],
            'heatmap-opacity': 0.8,
            'heatmap-color': [
              'interpolate',
              ['linear'],
              ['heatmap-density'],
              0, 'rgba(0,0,0,0)',
              0.2, 'rgba(70,140,120,0.45)',
              0.45, 'rgba(201,163,91,0.7)',
              0.7, 'rgba(222,110,52,0.85)',
              1, 'rgba(217,102,69,0.65)',
            ],
          },
        })

        map.addSource('route', { type: 'geojson', data: routeGeoJSON(personaId) })
        map.addLayer({
          id: 'route-glow',
          type: 'line',
          source: 'route',
          layout: { 'line-cap': 'round', 'line-join': 'round' },
          paint: { 'line-color': '#d9af69', 'line-width': 10, 'line-blur': 8, 'line-opacity': 0.55 },
        })
        map.addLayer({
          id: 'route',
          type: 'line',
          source: 'route',
          layout: { 'line-cap': 'round', 'line-join': 'round' },
          paint: { 'line-color': '#d9af69', 'line-width': 3.5, 'line-dasharray': [2, 1.5] },
        })

        map.addSource('devices', {
          type: 'geojson',
          data: {
            type: 'FeatureCollection',
            features: DEVICES.map((d) => ({
              type: 'Feature',
              properties: { status: d.status, type: d.type },
              geometry: { type: 'Point', coordinates: d.coordinates },
            })),
          },
        })
        map.addLayer({
          id: 'devices-halo',
          type: 'circle',
          source: 'devices',
          paint: { 'circle-radius': 11, 'circle-color': STATUS_COLOR as never, 'circle-opacity': 0.18 },
        })
        map.addLayer({
          id: 'devices',
          type: 'circle',
          source: 'devices',
          paint: {
            'circle-radius': 4.5,
            'circle-color': STATUS_COLOR as never,
            'circle-stroke-color': '#0b100e',
            'circle-stroke-width': 1.5,
          },
        })

        POIS.forEach((poi) => {
          const el = document.createElement('button')
          el.type = 'button'
          el.className = 'poi-marker'
          el.setAttribute('aria-label', `查看${poi.name}`)
          el.innerHTML = `<img class="poi-thumb" src="${poi.image}" alt="${poi.name}缩略图" loading="lazy" decoding="async" /><span class="poi-dot"></span><span class="poi-label">${poi.name}</span>`
          el.addEventListener('click', (ev) => {
            ev.stopPropagation()
            onSelectRef.current(poi.id)
          })
          poiElements.current.set(poi.id, el)
          new ml.Marker({ element: el, anchor: 'bottom' }).setLngLat(poi.coordinates).addTo(map!)
        })

        TRAFFIC_NODES.forEach((node) => {
          const el = document.createElement('div')
          const ratio = node.used / node.capacity
          const tone = ratio > 0.85 ? 'high' : ratio > 0.6 ? 'mid' : 'low'
          el.className = `traffic-marker tone-${tone}`
          const label = node.kind === 'parking' ? `余 ${node.capacity - node.used} 位` : `${Math.round(ratio * 100)}%`
          el.innerHTML = `<span class="traffic-kind">${node.kind === 'parking' ? 'P' : node.kind === 'shuttle' ? '车' : '公'}</span><span class="traffic-text"><b>${node.name}</b>${label}</span>`
          trafficElements.current.push(el)
          new ml.Marker({ element: el, anchor: 'left' }).setLngLat(node.coordinates).addTo(map!)
        })

        const declutter = () => {
          if (!map) return
          const occupied: {x:number;y:number;w:number}[] = []
          const entries = [...poiElements.current.entries()].sort((a,b) => Number(b[1].classList.contains('is-selected'))-Number(a[1].classList.contains('is-selected')) || Number(b[1].classList.contains('is-on-route'))-Number(a[1].classList.contains('is-on-route')))
          entries.forEach(([id, el]) => {
            const selected = el.classList.contains('is-selected')
            const major = ['gate','temple','grottoes','maple-ridge','summit'].includes(id)
            const point = map!.project(POI_MAP[id].coordinates)
            const width = POI_MAP[id].name.length * 15 + 44
            const collide = occupied.some(p => Math.abs(p.x-point.x)<(p.w+width)/2 && Math.abs(p.y-point.y)<46)
            const show = selected || ((major || el.classList.contains('is-on-route') || map!.getZoom()>=16.1) && !collide)
            el.classList.toggle('label-muted', !show)
            if (show) occupied.push({x:point.x,y:point.y,w:width})
          })
        }
        map.on('move', declutter)
        map.on('idle', declutter)
        declutter()
        setReady(true)
      }
      if (map.isStyleLoaded()) initLayers()
      else map.once('style.load', initLayers)

      const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
      if (!reduceMotion) {
        const spin = () => {
          if (!map) return
          map.setBearing(map.getBearing() + 0.025)
          frame = requestAnimationFrame(spin)
        }
        const stop = () => cancelAnimationFrame(frame)
        map.once('load', () => {
          frame = requestAnimationFrame(spin)
        })
        map.on('mousedown', stop)
        map.on('touchstart', stop)
        map.on('movestart', (e) => {
          if ((e as { originalEvent?: Event }).originalEvent) stop()
        })
        containerRef.current.addEventListener('stopspin', stop)
      }
    })

    const elementsAtMount = poiElements.current
    return () => {
      cancelled = true
      cancelAnimationFrame(frame)
      observer?.disconnect()
      overlayObserver?.disconnect()
      map?.remove()
      mapRef.current = null
      elementsAtMount.clear()
      trafficElements.current = []
    }
    // Map is created once; later prop changes are applied by the effects below.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    const map = mapRef.current
    if (!ready || !map) return
    map.setLayoutProperty('heat', 'visibility', layers.heat ? 'visible' : 'none')
    map.setLayoutProperty('devices', 'visibility', layers.devices ? 'visible' : 'none')
    map.setLayoutProperty('devices-halo', 'visibility', layers.devices ? 'visible' : 'none')
    trafficElements.current.forEach((el) => (el.style.display = layers.traffic ? '' : 'none'))
  }, [ready, layers])

  useEffect(() => {
    const map = mapRef.current
    if (!ready || !map) return
    ;(map.getSource('heat') as GeoJSONSource | undefined)?.setData(buildHeatFeatures(hour))
  }, [ready, hour])

  useEffect(() => {
    const map = mapRef.current
    if (!ready || !map) return
    ;(map.getSource('route') as GeoJSONSource | undefined)?.setData(routeGeoJSON(personaId))
    const stops = PERSONA_MAP[personaId].stops
    poiElements.current.forEach((el, id) => {
      const index = stops.indexOf(id)
      el.classList.toggle('is-on-route', index >= 0)
      el.dataset.order = index === 0 ? '起' : index === stops.length-1 ? '终' : index >= 0 ? String(index + 1) : ''
      el.querySelector('.poi-label')?.setAttribute('data-order', el.dataset.order)
    })
  }, [ready, personaId])

  const firstRun = useRef(true)
  useEffect(() => {
    const map = mapRef.current
    if (!ready || !map) return
    if (firstRun.current) {
      firstRun.current = false
      return
    }
    containerRef.current?.dispatchEvent(new Event('stopspin'))
    const coords = PERSONA_MAP[personaId].stops.map((id) => POI_MAP[id].coordinates)
    const lngs = coords.map((c) => c[0])
    const lats = coords.map((c) => c[1])
    map.fitBounds(
      [
        [Math.min(...lngs), Math.min(...lats)],
        [Math.max(...lngs), Math.max(...lats)],
      ],
      { padding: overlayPadding(map.getContainer().clientWidth), pitch: 60, bearing: map.getBearing(), duration: 1600, maxZoom: 16.3 },
    )
  }, [ready, personaId])

  useEffect(() => {
    const map = mapRef.current
    if (!ready || !map) return
    poiElements.current.forEach((el, id) => el.classList.toggle('is-selected', id === selectedPoiId))
    if (!selectedPoiId) return
    containerRef.current?.dispatchEvent(new Event('stopspin'))
    map.flyTo({ center: POI_MAP[selectedPoiId].coordinates, zoom: 16.6, pitch: 66, duration: 1400, essential: false })
  }, [ready, selectedPoiId])

  return (
    <div className="absolute inset-0">
      <div ref={containerRef} className="h-full w-full" aria-label="栖霞山三维地形地图" role="application" />
      {!ready && !failed && (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center bg-background">
          <p className="font-serif text-sm tracking-[0.4em] text-muted-foreground">正在载入栖霞山地形</p>
        </div>
      )}
      {failed && (
        <div className="absolute inset-0 flex items-center justify-center bg-background p-6 text-center">
          <p className="max-w-sm text-sm leading-relaxed text-muted-foreground">
            当前设备不支持 WebGL 三维地图，已切换为列表导览。可在下方“问栖霞”中继续查询路线与景点。
          </p>
        </div>
      )}
    </div>
  )
}
