'use client'

import { useLanguage } from '../language-provider'

export interface PetPreferences { reducedMotion: boolean; proactive: boolean; demo: boolean; hidden: boolean; side: 'left' | 'right'; top: number }
export const defaultPreferences: PetPreferences = { reducedMotion: false, proactive: true, demo: false, hidden: false, side: 'right', top: 52 }
export function PetSettings({ value, onChange }: { value: PetPreferences; onChange: (value: PetPreferences) => void }) {
  const { t } = useLanguage()
  return <fieldset className="grid gap-3 border-b border-border p-4 text-sm"><legend className="sr-only">{t("灵猫偏好设置", "Cat guide preferences")}</legend>
    {([['reducedMotion', t("减少动画", "Reduce motion")], ['proactive', t("主动互动", "Proactive interactions")], ['demo', t("离线辅助模式", "Offline assistance mode")], ['hidden', t("隐藏灵猫", "Hide cat guide")]] as const).map(([key, label]) => <label key={key} className="flex items-center justify-between gap-3">{label}<input type="checkbox" checked={value[key]} onChange={e => onChange({ ...value, [key]: e.target.checked })} /></label>)}
  </fieldset>
}
