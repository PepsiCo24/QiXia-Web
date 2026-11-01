'use client'

import { useLanguage } from './language-provider'

export function SiteFooter() {
  const { t } = useLanguage()
  const statements = [
    { label: t('数据说明', 'About the data'), value: t('客流、设备、交通与预警为非实时示意数据，实时情况请以景区公告和现场信息为准。', 'Visitor numbers, devices, transport and alerts are illustrative, not live. Refer to park announcements and on-site information for current conditions.') },
    { label: t('坐标与路线', 'Coordinates and routes'), value: t('景点坐标与路线为示意位置，需经现场核验后方可作为导航依据。', 'Attraction coordinates and routes are illustrative and require on-site verification before use for navigation.') },
    { label: t('地图来源', 'Map attribution'), value: t('地图与卫星影像 © 高德地图；三维效果以高德当前区域数据覆盖为准。', 'Maps and satellite imagery © Amap. 3D availability depends on Amap coverage in this area.') },
    { label: t('隐私', 'Privacy'), value: t('无需登录，不上传连续轨迹；偏好与叶章仅保存在本机，可随时清除。', 'No login or continuous location upload. Preferences and leaf badges stay on your device and can be cleared at any time.') },
  ]
  return (
    <footer className="border-t border-border bg-background">
      <div className="mx-auto grid max-w-6xl gap-8 px-4 py-12 md:grid-cols-[1fr_2fr]">
        <div>
          <p className="font-serif text-lg font-bold tracking-widest text-foreground">{t('栖霞山 · 数字游览', 'Qixia Mountain · Digital Guide')}</p>
          <p className="mt-2 text-xs text-muted-foreground">{t('陪你慢慢走进栖霞山', 'Discover Qixia Mountain at your own pace')}</p>
        </div>
        <dl className="grid gap-4 sm:grid-cols-2">
          {statements.map((s, index) => (
            <div key={index}>
              <dt className="text-xs text-accent">{s.label}</dt>
              <dd className="mt-1 text-xs leading-relaxed text-muted-foreground">{s.value}</dd>
            </div>
          ))}
        </dl>
      </div>
    </footer>
  )
}
