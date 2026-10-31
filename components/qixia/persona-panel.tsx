'use client'

import { ChevronDown, ChevronUp, X, ArrowUpRight, Route } from 'lucide-react'
import { PERSONAS, PERSONA_MAP, POI_MAP, formatDuration, type PersonaId } from '@/lib/qixia-data'
import { cn } from '@/lib/utils'
interface PersonaPanelProps {
 personaId: PersonaId; onPersonaChange: (id: PersonaId) => void; onSelectPoi: (id: string) => void; onAsk: () => void
 expanded?: boolean; onExpandedChange?: (open: boolean) => void; onClose?: () => void
}
export function PersonaTabs({personaId,onPersonaChange,className}: Pick<PersonaPanelProps,'personaId'|'onPersonaChange'> & {className?:string}) {
 return <div role="radiogroup" aria-label="选择同行方式" className={cn('persona-tabs',className)}><button type="button" role="radio" aria-checked={personaId==='default'} title="默认景点" onClick={()=>onPersonaChange('default')}>默认</button>{PERSONAS.map(p=><button key={p.id} type="button" role="radio" aria-checked={p.id===personaId} title={p.name} onClick={()=>onPersonaChange(p.id)}>{p.short}</button>)}</div>
}
export function PersonaPanel({personaId,onPersonaChange,onSelectPoi,onAsk,expanded=false,onExpandedChange,onClose}: PersonaPanelProps) {
 const isDefault = personaId === 'default'
 const p = isDefault ? null : PERSONA_MAP[personaId as Exclude<PersonaId, 'default'>]
 const route = p!
 return <section className="route-card glass-panel" aria-labelledby="persona-title">
  <header className="route-heading"><span><Route size={16}/> {isDefault ? '默认景点' : `为你推荐 · ${route.name}`}</span><button className="icon-button" aria-label="收起路线卡" onClick={onClose}><X size={17}/></button></header>
  <PersonaTabs personaId={personaId} onPersonaChange={onPersonaChange}/>
  {isDefault ? <div className="route-title"><p className="eyebrow">CLASSIC SIGHTS</p><h2 id="persona-title">栖霞山经典景点</h2><p className="route-preview">选择同行方式，查看对应路线与沿途景点</p></div> : <><div className="route-title"><p className="eyebrow">YOUR WAY TO EXPLORE</p><h2 id="persona-title">{route.routeName}</h2></div>
  <dl className="route-metrics"><div><dt>预计游玩</dt><dd>{formatDuration(route.durationMin)}</dd></div><div><dt>距离示意</dt><dd>{route.distanceKm} <small>km</small></dd></div><div><dt>体力消耗</dt><dd>{route.intensity}</dd></div></dl>
  {!expanded && <p className="route-preview">{route.stops.slice(0,4).map(id=>POI_MAP[id].name).join(' → ')}{route.stops.length>4?' …':''}</p>}</>}
  {!isDefault && expanded && <div id="route-details" className="route-details"><p>{route.cares}</p><ol>{route.stops.map((id,i)=><li key={id}><button onClick={()=>onSelectPoi(id)} aria-label={`聚焦${POI_MAP[id].name}`}><span className="stop-order">{i===0?'起':i===route.stops.length-1?'终':i+1}</span><span><strong>{POI_MAP[id].name}</strong><small>{POI_MAP[id].brief}</small></span><ArrowUpRight size={16}/></button></li>)}</ol><div className="route-note"><strong>台阶与体力提示</strong><p>{route.stairs}</p><p>时间预算：约 {formatDuration(route.durationMin)}，请根据停留与体力调整。</p></div><div className="route-note"><strong>为什么推荐</strong><p>{route.highlights.join(' · ')}</p></div><button className="outline-button" onClick={onAsk}>让灵猫帮我调整行程 <ArrowUpRight size={16}/></button></div>}
  {!isDefault && <><button className="route-expand" aria-expanded={expanded} aria-controls="route-details" onClick={()=>onExpandedChange?.(!expanded)}>{expanded?'收起路线详情':'查看完整路线'}{expanded?<ChevronUp size={17}/>:<ChevronDown size={17}/>}</button>
  <p className="route-source">推荐游览顺序 · 连线示意，非逐段导航<br/>坐标、距离与设施待实地核验，请以现场为准。</p></>}
 </section>
}
