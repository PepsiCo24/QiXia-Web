'use client'
import { ArrowUpRight } from 'lucide-react'
import { FOLIAGE } from '@/lib/qixia-data'
import { AnimatedMaple } from './foliage-leaf'
export function TopBar({onFoliage}:{onFoliage:()=>void}) {
 return <header className="qixia-topbar"><a className="brand" href="#map" aria-label="栖霞山首页"><span className="brand-seal">栖</span><span><strong>栖霞山</strong><small>QIXIA MOUNTAIN</small></span></a><div className="brand-slogan" aria-label="一客一景，一刻一路">一客一景，一刻一路</div><button className="top-season" onClick={onFoliage} aria-label={`红叶${FOLIAGE.stage}，转色 ${FOLIAGE.colorRate}%`}><AnimatedMaple rate={FOLIAGE.colorRate} className="size-8" /><span>红叶 {FOLIAGE.stage} · {FOLIAGE.colorRate}%<small>天气 / 红叶为非实时信息</small></span><ArrowUpRight size={15}/></button></header>
}
