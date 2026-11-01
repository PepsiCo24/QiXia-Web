const STATEMENTS = [
  { label: '数据说明', value: '客流、设备、交通与预警为非实时示意数据，实时情况请以景区公告和现场信息为准。' },
  { label: '坐标与路线', value: '景点坐标与路线为示意位置，需经现场核验后方可作为导航依据。' },
  { label: '地图来源', value: '地图与卫星影像 © 高德地图；三维效果以高德当前区域数据覆盖为准。' },
  { label: '隐私', value: '无需登录，不上传连续轨迹；偏好与叶章仅保存在本机，可随时清除。' },
]

export function SiteFooter() {
  return (
    <footer className="border-t border-border bg-background">
      <div className="mx-auto grid max-w-6xl gap-8 px-4 py-12 md:grid-cols-[1fr_2fr]">
        <div>
          <p className="font-serif text-lg font-bold tracking-widest text-foreground">栖霞山 · 数字游览</p>
          <p className="mt-2 text-xs text-muted-foreground">陪你慢慢走进栖霞山</p>
        </div>
        <dl className="grid gap-4 sm:grid-cols-2">
          {STATEMENTS.map((s) => (
            <div key={s.label}>
              <dt className="text-xs text-accent">{s.label}</dt>
              <dd className="mt-1 text-xs leading-relaxed text-muted-foreground">{s.value}</dd>
            </div>
          ))}
        </dl>
      </div>
    </footer>
  )
}
