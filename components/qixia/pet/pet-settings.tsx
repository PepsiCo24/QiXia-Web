'use client'

export interface PetPreferences { reducedMotion: boolean; proactive: boolean; demo: boolean; hidden: boolean; side: 'left' | 'right'; top: number }
export const defaultPreferences: PetPreferences = { reducedMotion: false, proactive: true, demo: false, hidden: false, side: 'right', top: 52 }
export function PetSettings({ value, onChange }: { value: PetPreferences; onChange: (value: PetPreferences) => void }) {
  return <fieldset className="grid gap-3 border-b border-border p-4 text-sm"><legend className="sr-only">灵猫偏好设置</legend>
    {([['reducedMotion', '减少动画'], ['proactive', '主动互动'], ['demo', '离线辅助模式'], ['hidden', '隐藏灵猫']] as const).map(([key, label]) => <label key={key} className="flex items-center justify-between gap-3">{label}<input type="checkbox" checked={value[key]} onChange={e => onChange({ ...value, [key]: e.target.checked })} /></label>)}
  </fieldset>
}
