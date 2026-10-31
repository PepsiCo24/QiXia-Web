'use client'

import { useEffect, useRef, useState } from 'react'
import { Layers, Leaf, Users, Activity, X, Maximize2, Route } from 'lucide-react'
import type { MapCommand } from '@/lib/pet/pet-actions'
import { MapView, type LayerState } from './map-view'
import { TopBar } from './top-bar'
import { HourSlider, LayerPanel, LayerToggles } from './layer-panel'
import { PersonaPanel } from './persona-panel'
import { PoiCard } from './poi-card'
import { FOLIAGE, snapshot, type PersonaId } from '@/lib/qixia-data'

interface HeroMapProps {
  personaId: PersonaId
  onPersonaChange: (id: PersonaId) => void
  onAsk: (question?: string) => void
  command: { id: number; action: MapCommand } | null
  onPoiSelect: (id: string) => void
}
const tools = [
  { id: 'layers', label: '地图图层', icon: Layers },
  { id: 'foliage', label: '红叶情报', icon: Leaf },
  { id: 'crowd', label: '游客客流', icon: Users },
  { id: 'ops', label: '运行态势', icon: Activity },
] as const
export function HeroMap({ personaId, onPersonaChange, onAsk, command, onPoiSelect }: HeroMapProps) {
  const [layers, setLayers] = useState<LayerState>({ heat: false, devices: false, traffic: false, alerts: false })
  const [hour, setHour] = useState(11)
  const [selectedPoiId, setSelectedPoiId] = useState<string | null>(null)
  const [tool, setTool] = useState<string | null>(null)
  const [routeVisible, setRouteVisible] = useState(true)
  const [routeExpanded, setRouteExpanded] = useState(false)
  const toolRef = useRef<HTMLDivElement>(null)
  const selectPoi = (id: string) => { setSelectedPoiId(id); setTool(null); onPoiSelect(id) }
  useEffect(() => {
    if (!command) return
    const action = command.action
    if (action.type === 'focus_place' || action.type === 'show_poi_card') setSelectedPoiId(action.poiId)
    if (action.type === 'toggle_layer') setLayers(prev => ({ ...prev, [action.layer]: action.visible }))
    if (action.type === 'show_route') { setRouteVisible(true); setRouteExpanded(true) }
  }, [command])
  useEffect(() => {
    const close = (e: PointerEvent) => { if (!toolRef.current?.contains(e.target as Node)) setTool(null) }
    const escape = (e: KeyboardEvent) => { if (e.key === 'Escape') { setTool(null); setRouteExpanded(false); setSelectedPoiId(null) } }
    document.addEventListener('pointerdown', close); document.addEventListener('keydown', escape)
    return () => { document.removeEventListener('pointerdown', close); document.removeEventListener('keydown', escape) }
  }, [])
  const toggleLayer = (key: keyof LayerState) => setLayers(prev => ({ ...prev, [key]: !prev[key] }))
  const s = snapshot(hour)
  return <section id="map" aria-label="栖霞山三维地图" className="immersive-map" data-route-expanded={routeVisible && routeExpanded} data-poi-open={!!selectedPoiId}>
    <MapView layers={layers} hour={hour} personaId={personaId} selectedPoiId={selectedPoiId} onSelectPoi={selectPoi} />
    <div className="map-vignette pointer-events-none absolute inset-0" aria-hidden="true" />
    <TopBar onAsk={() => onAsk()} onExplore={() => { setTool(null); setRouteVisible(false); setSelectedPoiId(null) }} onFoliage={() => setTool('foliage')} />
    <div className="map-intro pointer-events-none"><p className="eyebrow">NANJING · QIXIA MOUNTAIN</p><h1>一山秋色，<br />一程有你。</h1><p>循着山林，找到属于你的栖霞。</p><span>3D 地形探索 <i /> AI 灵猫陪伴</span></div>
    <div ref={toolRef} className="map-tool-host">
      <nav className="map-tools glass-panel" aria-label="地图工具">{tools.map(({id,label,icon:Icon}) => <button key={id} title={label} aria-label={label} aria-expanded={tool===id} aria-controls="map-tool-panel" className={tool===id?'active':''} onClick={() => setTool(tool===id?null:id)}><Icon size={19}/><span>{label}</span></button>)}<div className="tool-divider"/><button title="纯地图模式" aria-label="纯地图模式" onClick={() => { setTool(null); setRouteVisible(false); setSelectedPoiId(null) }}><Maximize2 size={18}/><span>纯地图</span></button></nav>
      {tool && <section id="map-tool-panel" aria-label={tools.find(t=>t.id===tool)?.label} className="tool-popover glass-panel"><header><h2>{tools.find(t=>t.id===tool)?.label}</h2><button className="icon-button" aria-label="关闭工具面板" onClick={()=>setTool(null)}><X size={18}/></button></header><span className="data-badge">模拟数据 · 非实时</span>
        {tool==='ops' ? <LayerPanel layers={layers} onToggle={toggleLayer} hour={hour} onHourChange={setHour}/> : tool==='layers' ? <><p>按需叠加信息，让山林保持清晰。</p><LayerToggles layers={layers} onToggle={toggleLayer}/></> : tool==='crowd' ? <><p>在园游客 <strong className="crowd-number">{s.visitors.toLocaleString()} <small>人</small></strong></p><p>承载率 {Math.round(s.loadRatio*100)}% · {String(hour).padStart(2,'0')}:00 演示快照</p><button className="outline-button" aria-pressed={layers.heat} onClick={()=>toggleLayer('heat')}>{layers.heat?'关闭':'打开'}客流热力</button><HourSlider hour={hour} onHourChange={setHour}/><div className="heat-legend"><span>疏</span><i/><span>密</span></div></> : <><div className="foliage-value">{FOLIAGE.colorRate}<small>%</small><Leaf size={32}/></div><h3>红叶 · {FOLIAGE.stage}</h3><p>{FOLIAGE.weather} · 日落 {FOLIAGE.sunset}</p><p>红叶与天气为演示信息；当前未接入红叶分布热力数据。</p><button className="outline-button" onClick={()=>selectPoi('maple-ridge')}>在地图上看看枫岭</button><p>红枫图鉴建设中 · 可在景点卡收集数字枫叶纪念。</p></>}
      </section>}
    </div>
    {routeVisible ? <aside className={`route-host ${routeExpanded?'expanded':''}`} aria-label="推荐游览顺序"><PersonaPanel personaId={personaId} onPersonaChange={onPersonaChange} onSelectPoi={selectPoi} onAsk={()=>onAsk()} expanded={routeExpanded} onExpandedChange={setRouteExpanded} onClose={()=>setRouteVisible(false)}/></aside> : <button className="route-reopen glass-panel" onClick={()=>setRouteVisible(true)}><Route size={18}/> 推荐路线</button>}
    {selectedPoiId && <div className="poi-card-host"><PoiCard poiId={selectedPoiId} hour={hour} onClose={()=>setSelectedPoiId(null)} onAsk={q=>{setSelectedPoiId(null);onAsk(q)}}/></div>}
    {layers.heat && <div className="map-heat-key glass-panel">客流模拟 <span className="heat-legend"><span>疏</span><i/><span>密</span></span> {hour}:00</div>}
  </section>
}
