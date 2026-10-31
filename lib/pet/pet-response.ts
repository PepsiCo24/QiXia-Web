import { POIS } from '../qixia-data'
import type { MapCommand } from './pet-actions'

/** Resolve explicit map intent independently of model/network availability. */
export function planPetResponse(text: string) {
  const poi = POIS.find(p => text.includes(p.name) || text.toLowerCase().includes(p.id))
  const navigate = !!poi && /带我|去看看|带路|定位|打开|看看|想去|怎么去|前往/.test(text) && !/不要|别带|不去|不用定位/.test(text)
  const commands: MapCommand[] = navigate ? [
    { type: 'focus_place', poiId: poi!.id },
    { type: 'show_poi_card', poiId: poi!.id },
  ] : []
  return {
    query: poi ? `${poi.name} ${text.replace(/带我去|帮我|请|定位|打开|。/g, '').trim()}`.slice(0, 300) : text,
    commands,
    acknowledgement: navigate ? `已在示意地图定位${poi!.name}并打开景点卡。地图定位不代表现场步道导航。` : '',
    instruction: navigate
      ? '本轮是带路请求：系统已执行定位和景点卡指令，不要重复调用这两项工具。先自然回应已定位，再用检索证据补充至多两句相关介绍；不要把历史沿革当作导航回答。'
      : '直接回答用户问题，再补充必要依据；不输出检索流水账。',
  }
}

export const PET_OUTPUT_POLICY = `
回答要求：你是栖霞灵猫，面向正在游览的游客，用自然中文直接解决问题。先回应意图，再给简短讲解，通常80—180字，不逐条粘贴检索块、不解释RAG流程、不输出原始JSON。历史事实只能来自本轮证据；相同事实合并表达，保留对应来源链接。最多引用2—3个与回答直接相关的来源，其余可在来源面板查看。草稿风险用一句“相关资料为待核验草稿”说明，不为每句话重复标签。若证据对同一事实有冲突，说明存在不同记载，不擅自定论。缺少证据时说明具体缺口，可继续操作已知的演示地图。无证据也可回应问候、解释功能或询问目的地，但不得补写文化历史事实。禁止声称完成未执行的地图操作。`
