'use client'

import { useLanguage } from '../language-provider'

import Link from 'next/link'
import { ArrowUpRight, Camera, Leaf } from 'lucide-react'

const basePath = process.env.NEXT_PUBLIC_BASE_PATH || ''

export function PhotoEntry() {
  const { t } = useLanguage()
  return <section id="photo" className="border-t border-border px-5 py-12 md:px-10 md:py-16" aria-labelledby="photo-entry-title">
    <div className="mx-auto grid max-w-5xl items-center gap-9 rounded-3xl border border-accent/20 bg-secondary/40 p-7 md:grid-cols-[1fr_1.2fr] md:gap-14 md:p-10">
      <div className="relative mx-auto w-full max-w-xs" aria-label={t("栖小猫主题相框预览", "Qixia Cat photo frame preview")}>
        <div className="absolute inset-3 rotate-6 rounded-sm border border-accent/30 bg-accent/10" />
        <div className="relative -rotate-3 border-8 border-[#f2e8d4] bg-[#365341] px-7 pt-6 text-center shadow-xl">
          <Leaf className="absolute left-2 top-2 text-primary" size={30} /><p className="text-[9px] tracking-[.3em] text-accent">QIXIA MEMORIES</p>
          <img src={`${basePath}/pet/qixia-cat/frames/wave-0.png`} alt={t("本站栖霞灵猫，挥手邀请你来合影", "Qixia Cat waving to invite you for a photo")} className="mx-auto h-28 w-28 object-contain" />
          <p className="mb-4 font-serif text-lg tracking-widest">{t("这一刻，栖霞有你。", "A moment in Qixia, with you.")}</p>
          <div className="-mx-7 bg-[#f2e8d4] px-3 pb-2 pt-3 text-xs text-[#4b5b48]">{t("栖霞留影 · 相框设计预览", "Qixia Memories · frame preview")}</div>
        </div>
      </div>
      <div><p className="mb-3 text-[10px] tracking-[.25em] text-accent">A MOMENT TO TAKE HOME</p><h2 id="photo-entry-title" className="font-serif text-3xl tracking-wider">{t("栖小猫 · 栖霞留影", "Qixia Cat · Photo Memories")}</h2><p className="mt-4 text-sm leading-7 text-muted-foreground">{t("和栖小猫一起，把栖霞的美好带回家。", "Bring Qixia’s beauty home with Qixia Cat.")}<br />{t("选一款山林相框，拍照或上传照片，留一张属于你的栖霞纪念。", "Choose a forest-inspired frame, take or upload a photo, and create your Qixia keepsake.")}</p><div className="my-5 flex flex-wrap gap-2 text-[11px] text-accent"><span className="rounded-full border border-accent/20 px-3 py-1">{t("四款主题相框", "Four themed frames")}</span><span className="rounded-full border border-accent/20 px-3 py-1">{t("自然滤镜", "Natural filters")}</span><span className="rounded-full border border-accent/20 px-3 py-1">{t("本机私密处理", "Private, on-device processing")}</span></div><Link href="/photo" className="inline-flex min-h-12 items-center gap-3 rounded-full bg-primary px-6 text-sm text-primary-foreground"><Camera size={17} /> {t("开始留影", "Create a memory")} <ArrowUpRight size={17} /></Link></div>
    </div>
  </section>
}
