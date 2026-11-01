'use client'
import { ShieldCheck, ChevronUp } from 'lucide-react'
import { SAFETY_ALERTS, TRAFFIC_NODES } from '@/lib/qixia-data'
export function AlertStrip() {
 return <details className="status-details glass-panel"><summary><ShieldCheck size={15}/><span>山林慢行 · 留意脚下石阶</span><span className="status-demo"></span><ChevronUp size={14}/></summary><div className="status-expanded"><p>以下信息仅供参考，现场以景区公告为准。</p>{SAFETY_ALERTS.map(a=><p key={a.id}>{a.title} · {a.detail}</p>)}{TRAFFIC_NODES.map(n=><p key={n.id}>{n.name} · {n.note}</p>)}</div></details>
}
