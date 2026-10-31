'use client'
import { ArrowUpRight } from 'lucide-react'
import { FOLIAGE } from '@/lib/qixia-data'
import { AnimatedMaple } from './foliage-leaf'
export function TopBar({onAsk,onExplore,onFoliage}:{onAsk:()=>void;onExplore:()=>void;onFoliage:()=>void}) {
 return <header className="qixia-topbar"><a className="brand" href="#map" aria-label="栖霞山首页"><span className="brand-seal">栖</span><span><strong>栖霞山</strong><small>QIXIA MOUNTAIN</small></span></a><nav aria-label="主导航"><a className="nav-current" href="#map">探索栖霞</a><button onClick={onAsk}>AI 路线规划</button><button onClick={onExplore}>3D 沉浸游览</button><button onClick={onFoliage}>红枫图鉴 <span>建设中</span></button></nav><button className="top-season" onClick={onFoliage} aria-label={`红叶${FOLIAGE.stage}，转色 ${FOLIAGE.colorRate}%`}><AnimatedMaple rate={FOLIAGE.colorRate} className="size-8" /><span>红叶 {FOLIAGE.stage} · {FOLIAGE.colorRate}%<small>天气 / 红叶为演示数据</small></span><ArrowUpRight size={15}/></button></header>
}
