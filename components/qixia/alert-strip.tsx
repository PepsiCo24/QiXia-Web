'use client'

import { ShieldCheck, ChevronUp } from 'lucide-react'
import { SAFETY_ALERTS, TRAFFIC_NODES } from '@/lib/qixia-data'
import { useLanguage } from './language-provider'

const safetyEnglish: Record<string, [string, string]> = {
  a1: ['Thousand Buddha Cliff is nearing capacity', 'Currently at 92% capacity. Consider visiting Qianlong Palace first and returning later.'],
  a2: ['Slippery steps at Dielang Cliff', 'Morning dew has not dried. Stay on the inside of the handrail.'],
  a3: ['One-way walking on Maple Ridge', 'During maple season, the trail is one-way from 10:00 to 16:00.'],
}
const trafficEnglish: Record<string, string> = {
  'p-south': 'Expected to fill up within 40 minutes',
  'p-east': 'Plenty of spaces available; consider parking here',
  shuttle: 'Every 8 minutes; estimated wait: 12 minutes',
  bus: 'Nanjing Metro connecting shuttle service is running',
}

export function AlertStrip() {
  const { t, poi, locale } = useLanguage()
  return (
    <details className="status-details glass-panel">
      <summary><ShieldCheck size={15}/><span>{t('山林慢行 · 留意脚下石阶', 'Walk gently · Watch your step on stone stairs')}</span><span className="status-demo"></span><ChevronUp size={14}/></summary>
      <div className="status-expanded">
        <p>{t('以下信息仅供参考，现场以景区公告为准。', 'For reference only. Follow official notices at the scenic area.')}</p>
        {SAFETY_ALERTS.map(a => <p key={a.id}>{t(a.title, safetyEnglish[a.id][0])} · {t(a.detail, safetyEnglish[a.id][1])}</p>)}
        {TRAFFIC_NODES.map(n => <p key={n.id}>{poi(n.name, locale)} · {t(n.note, trafficEnglish[n.id])}</p>)}
      </div>
    </details>
  )
}
