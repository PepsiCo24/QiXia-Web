'use client'
import { ArrowUpRight } from 'lucide-react'
import { FOLIAGE } from '@/lib/qixia-data'
import { AnimatedMaple } from './foliage-leaf'
import { useLanguage, LanguageSwitcher } from './language-provider'

export function TopBar({onFoliage}:{onFoliage:()=>void}) {
 const { t } = useLanguage()
 const stage = t(FOLIAGE.stage, 'Turning red')
 return <header className="qixia-topbar"><a className="brand" href="#map" aria-label={t('数字游览大屏首页', 'Digital Tour Dashboard home')}><span className="brand-seal" aria-hidden="true">栖</span><span><strong>{t('数字游览大屏', 'Digital Tour Dashboard')}</strong><small>DIGITAL TOUR DASHBOARD</small></span></a><div className="brand-slogan" aria-label={t('一客一景，一刻一路', 'Your visit, your view, your own path')}>{t('一客一景，一刻一路', 'Your visit. Your view. Your path.')}</div><div className="flex items-center gap-2"><LanguageSwitcher /><button className="top-season" onClick={onFoliage} aria-label={t(`红叶${FOLIAGE.stage}，转色 ${FOLIAGE.colorRate}%`, `Foliage ${stage}, ${FOLIAGE.colorRate}% color change`)}><AnimatedMaple rate={FOLIAGE.colorRate} className="size-8" /><span>{t('红叶', 'Foliage')} {stage} · {FOLIAGE.colorRate}%<small>{t('天气 / 红叶为非实时信息', 'Weather / foliage information is not live')}</small></span><ArrowUpRight size={15}/></button></div></header>
}
