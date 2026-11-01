import { POIS } from '../qixia-data'

const aliases: Record<string, string> = { '栖霞古寺': '栖霞寺', '千佛崖': '千佛岩', '舍利宝塔': '舍利塔', '明征君': '明征君碑', '明僧绍': '栖霞寺', '三论宗': '栖霞寺', '八相成道': '舍利塔', '乾隆': '行宫遗址' }
const topics = [
  ['始建', '建于', '哪年', '什么时候建', '年代', '历史', '起源'],
  ['故事', '传说', '典故'], ['红叶', '赏枫', '枫叶'], ['路线', '怎么走', '行程', '游览顺序'],
  ['门票', '票价', '多少钱'], ['开放', '开门', '关门', '营业'], ['碑刻', '题刻', '书法'],
  ['造像', '佛像', '佛龛'], ['无障碍', '轮椅', '台阶'], ['拍照', '摄影', '机位'],
]
export function retrievalIntent(text: string) {
  const normalized = text.replace(/\s+/g, ' ').trim()
  const entities = [...new Set([...POIS.filter(p => normalized.includes(p.name) || normalized.toLowerCase().includes(p.id)).map(p => p.name), ...Object.entries(aliases).filter(([alias]) => normalized.includes(alias)).map(([, name]) => name)])]
  const groups = topics.filter(group => group.some(word => normalized.includes(word)))
  const cleaned = normalized.replace(/请问|请|帮我|告诉我|介绍一下|介绍下|讲一讲|讲讲|说说|我想知道|能不能|可以|带我去|带我看|一下|有哪些|有什么|是什么|怎么样|吗|呢|呀|喵|[，。！？、?！~～]/g, ' ').replace(/\s+/g, ' ').trim()
  return { entities, groups, query: [...new Set([...entities, cleaned])].filter(Boolean).join(' ').slice(0, 300) || normalized.slice(0, 300) }
}

export function relevanceScore(query: string, item: { title: string; text: string }): number {
  const { entities, groups, query: cleaned } = retrievalIntent(query)
  const content = item.title + ' ' + item.text
  if (entities.length && !entities.some(name => content.includes(name))) return -1
  const titlePlaces = POIS.filter(place => item.title.includes(place.name)).map(place => place.name)
  if (entities.length && titlePlaces.some(name => !entities.includes(name)) && !entities.some(name => item.title === name || item.title.endsWith(name))) return -1
  let score = entities.reduce((sum, name) => sum + (item.title.includes(name) ? 12 : content.includes(name) ? 7 : 0), 0)
  if (groups.length) {
    const matches = groups.filter(group => group.some(word => item.text.includes(word))).length
    score += matches * 8
    if (!matches) score -= 8
  }
  const tokens = cleaned.match(/[\u4e00-\u9fff]{2,}|[a-z0-9-]+/gi) || []
  for (const token of tokens) {
    if (content.includes(token)) score += 4
    else for (let i = 0; i < token.length - 1; i++) if (content.includes(token.slice(i, i + 2))) score += .4
  }
  return score
}
