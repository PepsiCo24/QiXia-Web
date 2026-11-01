import Link from 'next/link'
import { ArrowUpRight, Camera, Leaf } from 'lucide-react'

const basePath = process.env.NEXT_PUBLIC_BASE_PATH || ''

export function PhotoEntry() {
  return <section id="photo" className="border-t border-border px-5 py-12 md:px-10 md:py-16" aria-labelledby="photo-entry-title">
    <div className="mx-auto grid max-w-5xl items-center gap-9 rounded-3xl border border-accent/20 bg-secondary/40 p-7 md:grid-cols-[1fr_1.2fr] md:gap-14 md:p-10">
      <div className="relative mx-auto w-full max-w-xs" aria-label="栖小猫主题相框预览">
        <div className="absolute inset-3 rotate-6 rounded-sm border border-accent/30 bg-accent/10" />
        <div className="relative -rotate-3 border-8 border-[#f2e8d4] bg-[#365341] px-7 pt-6 text-center shadow-xl">
          <Leaf className="absolute left-2 top-2 text-primary" size={30} /><p className="text-[9px] tracking-[.3em] text-accent">QIXIA MEMORIES</p>
          <img src={`${basePath}/pet/qixia-cat/frames/wave-0.png`} alt="本站栖霞灵猫，挥手邀请你来合影" className="mx-auto h-28 w-28 object-contain" />
          <p className="mb-4 font-serif text-lg tracking-widest">这一刻，栖霞有你。</p>
          <div className="-mx-7 bg-[#f2e8d4] px-3 pb-2 pt-3 text-xs text-[#4b5b48]">栖霞留影 · 相框设计预览</div>
        </div>
      </div>
      <div><p className="mb-3 text-[10px] tracking-[.25em] text-accent">A MOMENT TO TAKE HOME</p><h2 id="photo-entry-title" className="font-serif text-3xl tracking-wider">栖小猫 · 栖霞留影</h2><p className="mt-4 text-sm leading-7 text-muted-foreground">和栖小猫一起，把栖霞的美好带回家。<br />选一款山林相框，拍照或上传照片，留一张属于你的栖霞纪念。</p><div className="my-5 flex flex-wrap gap-2 text-[11px] text-accent"><span className="rounded-full border border-accent/20 px-3 py-1">四款主题相框</span><span className="rounded-full border border-accent/20 px-3 py-1">自然滤镜</span><span className="rounded-full border border-accent/20 px-3 py-1">本机私密处理</span></div><Link href="/photo" className="inline-flex min-h-12 items-center gap-3 rounded-full bg-primary px-6 text-sm text-primary-foreground"><Camera size={17} /> 开始留影 <ArrowUpRight size={17} /></Link></div>
    </div>
  </section>
}
