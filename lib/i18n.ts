import { poiTextTranslations } from './poi-translations'

export type Locale = 'zh-CN' | 'en'

const poiNames: Record<string, string> = {
  '南门游客中心': 'South Gate Visitor Center', '明镜湖': 'Mirror Lake', '栖霞寺': 'Qixia Temple', '明征君碑': 'Stele of Ming Zhengjun',
  '舍利塔': 'Sarira Pagoda', '千佛岩': 'Thousand Buddha Cliff', '乾隆行宫遗址': 'Qianlong Palace Ruins', '桃花涧': 'Peach Blossom Ravine',
  '天开岩': 'Tiankai Rock', '叠浪崖': 'Dielang Cliff', '叠浪岩': 'Dielang Rock', '枫岭': 'Maple Ridge', '凤翔峰': 'Fengxiang Peak',
  '碧云亭观景台': 'Biyun Pavilion Lookout', '碧云亭': 'Biyun Pavilion', '纱帽峰': 'Shamao Peak', '纱��峰': 'Shamao Peak', '般若台': 'Prajna Terrace',
  '玲峰池': 'Lingfeng Pond', '始皇临江处': 'First Emperor Riverside', '中峰涧': 'Middle Peak Ravine', '一线天': 'One-Line Sky',
  '虎山': 'Tiger Mountain', '龙山': 'Dragon Mountain', '红叶谷': 'Red Maple Valley', '栖霞飞天': 'Qixia Flying Apsaras', '桃花湖': 'Peach Blossom Lake',
  '哼哈殿': 'Hengha Hall', '有凌云意观景平台': 'Lingyun Viewpoint', '乾隆御花园': 'Qianlong Imperial Garden', '了凡问道': 'Liaofan Seeks the Way',
  '钟鼓楼': 'Bell and Drum Towers', '卧云亭': 'Woyun Pavilion', '中大路赏枫段': 'Zhongda Road Maple Walk', '栖霞山': 'Qixia Mountain', '栖霞寺舍利塔': 'Qixia Temple Sarira Pagoda',
  '南门停车场': 'South Gate Parking', '东侧停车场': 'East Parking', '栖霞山公交站': 'Qixia Mountain Bus Stop', '景区观光车': 'Scenic Shuttle',
}
const personaNames: Record<string, string> = {
  '亲子': 'Family', '青年': 'Youth', '文化': 'Culture', '长者': 'Seniors', '摄影': 'Photography',
  '亲子家庭': 'Families', '青年游客': 'Young explorers', '文化爱好者': 'Culture lovers', '长者同行': 'Senior companions', '摄影与户外游客': 'Photographers & outdoor explorers',
  '亲子轻松': 'Family', '青年探索': 'Youth', '文化寻踪': 'Culture', '长者舒缓': 'Seniors', '摄影采风': 'Photography',
}
export function translatePoiName(name: string, locale: Locale): string { return locale === 'en' ? poiNames[name] ?? name : name }
export function translatePersonaName(name: string, locale: Locale): string { return locale === 'en' ? personaNames[name] ?? name : name }

const exactText: Record<string, string> = {
  '当前设备不支持定位，无法导航': 'Location services are unavailable on this device.',
  '定位中断，请检查定位权限': 'Location interrupted. Please check location permissions.',
  '导航启动失败': 'Unable to start navigation.',
  '在线步行路线尚未配置，请管理员在服务端配置高德 Web 服务密钥 AMAP_WEB_SERVICE_KEY（兼容 AMAP_KEY）后重新部署。': 'Walking routes are not configured. An administrator must configure a server-side Amap Web Service key and redeploy.',
  '步行路线服务密钥的平台类型不匹配。请管理员配置高德「Web 服务」类型密钥 AMAP_WEB_SERVICE_KEY 后重新部署（不能使用浏览器 JS API 密钥）。': 'Walking routes are unavailable because the Amap key has the wrong platform type. An administrator must configure a Web Service key and redeploy.',
  '步行路线服务的密钥或权限配置无效。请管理员检查高德 Web 服务密钥、服务权限及服务器白名单后重新部署。': 'The walking route service key or permissions are invalid. An administrator must check the Web Service configuration.',
  '步行路线服务配额已用尽，请管理员检查高德服务配额，恢复后重试。': 'The walking route service quota has been reached. Please try again after the quota is restored.',
  '步行路线服务暂时不可用，请稍后重试；不会使用直线示意路线。': 'Walking routes are temporarily unavailable. Please try again later.',
  '步行路线服务暂时不可用，请稍后重试。': 'Walking routes are temporarily unavailable. Please try again later.',
  '步行路线服务连接失败或超时，请稍后重试。': 'The walking route request failed or timed out. Please try again later.',
  '未找到起终点之间可用的真实步行路线，请更换起点或目的地；不会使用直线示意路线。': 'No walkable route was found. Please choose a different starting point or destination.',
  '路线服务未返回完整的真实步行路径，无法开始导航。请稍后重试或更换起终点；不会使用直线示意路线。': 'The route service did not return a complete walking path. Please try again or choose different endpoints.',
  'A 级 · 官方/学术原文': 'Grade A · Official or academic sources',
  'B 级 · 可靠媒体或两源一致': 'Grade B · Reliable media or two consistent sources',
  'C 级 · 单一来源或说法不一': 'Grade C · Single source or conflicting accounts',
  '未定位': 'Not mapped', '示意坐标': 'Illustrative location', '知识库坐标': 'Knowledge base location',
  '暂无核验坐标，无法在图上定位': 'No verified coordinates available; cannot locate on the map.',
  '知识库坐标，尚未核验': 'Knowledge base coordinates, not yet verified.',
  '示意位置，待现场核验': 'Illustrative location, awaiting field verification.',
  '坐标已双源核验': 'Coordinates checked against two sources.',
  '坐标为示意位置，请以现场标识为准': 'This is an illustrative location. Follow on-site signs.',
  '未提供更新时间': 'Update date not provided',
  '景点': 'Attractions', '游客服务': 'Visitor services', '交通停车': 'Transport & parking', '吃住': 'Food & stay', '活动': 'Events', '门票套票': 'Tickets',
  '服务': 'Services', '山水': 'Scenic waters', '寺院': 'Temple', '古迹': 'Historic site', '观景': 'Viewpoint', '石刻': 'Stone carvings',
  '轻松': 'Easy', '适中': 'Moderate', '进阶': 'Advanced', '舒适': 'Comfortable', '适量': 'Moderate', '拥挤': 'Busy', '饱和': 'At capacity',
  '人物、诗文���题刻、建筑与地方历史，也愿意停下来继续追问。': 'People, poetry, inscriptions, architecture, and local history, with time to explore further.',
  '预计 40 分钟内满位': 'Expected to fill within 40 minutes', '余位充足，建议分流至此': 'Spaces available; consider parking here',
  '发车间隔 8 分钟，排队约 12 分钟': 'Every 8 minutes; queue about 12 minutes', '南京地铁接驳专线运行中': 'Metro connection shuttle operating',
  '入园主入口，提供咨询、寄存、轮椅借用与红枫叶章领取。': 'The main entrance offers visitor information, storage, wheelchair loans, and maple-leaf stamps.',
  '栖霞寺前的半月形水面，倒映寺院与秋日红枫，是入园第一处取景点。': 'A crescent-shaped lake in front of Qixia Temple, reflecting the temple and autumn maples.',
  '始建于南齐永明七年（489 年），中国佛教三论宗祖庭，江南著名古刹。': 'Founded in 489 during the Southern Qi dynasty, this historic temple is an ancestral center of the Sanlun school.',
  '唐高宗李治撰文、书法家高正臣书写，记述明僧绍生平，碑阴“栖霞”二字相传为高宗手书。': 'A Tang stele recording the life of Ming Sengshao, with text by Emperor Gaozong and calligraphy by Gao Zhengchen.',
  '隋文帝仁寿元年始建，现塔为南唐重建，五级八面石塔，塔身浮雕“八相成道”。': 'First built in the Sui dynasty and rebuilt in the Southern Tang, this five-tiered octagonal stone pagoda depicts eight episodes of the Buddha’s life.',
  '始凿于南齐，历代续凿，现存佛龛约 250 个、造像 500 余尊，被誉为“江南云冈”。': 'Carving began in the Southern Qi dynasty. Around 250 niches and over 500 figures survive.',
  '乾隆六下江南五次驻跸栖霞，留下行宫遗址与大量御制诗碑。': 'Emperor Qianlong stayed at Qixia on five of his six southern tours, leaving palace ruins and imperial poetry steles.',
  '山涧溪流与林间小径，沿途有座椅和补给点，适合中途休息。': 'Streams and woodland paths offer places to sit, refuel, and take a break.',
  '两崖对峙如天门初开，崖壁上保留历代文人题刻。': 'Two facing cliffs form a natural gateway, with inscriptions left by writers through the ages.',
  '岩层如层层叠浪，秋日枫叶与岩壁形成强烈色彩对比，是热门拍照点。': 'Wave-like rock layers contrast with autumn maples at this popular photo spot.',
  '栖霞红枫最集中的山脊步道，“春牛首、秋栖霞”的“秋”即在于此。': 'A ridge trail with one of the mountain’s densest displays of autumn maples.',
  '栖霞山主峰，海拔约 286 米，峰顶可远眺长江与南京城东。': 'Qixia Mountain’s main peak rises about 286 meters, with views toward the Yangtze and eastern Nanjing.',
  '朝西开阔的观景平台，是摄影爱好者拍摄日落与江景的首选位置。': 'A west-facing lookout for sunset and river photography.',

  '孩子能够理解、愿意参与的内容，以及步行、休息和同行人的节奏。': 'Activities children can understand and enjoy, balanced with walking, breaks, and the pace of the group.',
  '有趣的地方故事、拍照、轻徒步、影像表达和同伴交流。': 'Local stories, photography, light hikes, visual storytelling, and time with friends.',
  '人物、诗文、题刻、建筑与地方历史，也愿意停下来继续追问。': 'People, poetry, inscriptions, architecture, and local history, with time to explore further.',
  '清楚的路径、从容的节奏、方便的休息与补给，以及丰富的文化内容。': 'Clear paths, an unhurried pace, convenient places to rest and refuel, and cultural highlights.',
  '点位、路线、季节、光线、体力与途中补给。': 'Photo locations, routes, seasonal color, light, exertion, and supplies along the way.',
  '红枫寻章 · 小小探险家': 'Maple Quest · Little Explorers',
  '轻徒步 · 山野出片线': 'Light Hike · Mountain Photo Walk',
  '六朝至清 · 碑刻诗文线': 'Six Dynasties to Qing · Inscriptions and Poetry',
  '从容慢游 · 古寺平路线': 'Leisurely Visit · Temple and Gentle Paths',
  '光影追枫 · 日落长线': 'Chasing Light and Maples · Sunset Route',
}

const common: Array<[RegExp, string]> = [
  [/栖霞山/g, 'Qixia Mountain'], [/南门游客中心/g, 'South Gate Visitor Center'], [/明镜湖/g, 'Mirror Lake'], [/栖霞寺/g, 'Qixia Temple'],
  [/明征君碑/g, 'Stele of Ming Zhengjun'], [/舍利塔/g, 'Sarira Pagoda'], [/千佛岩/g, 'Thousand Buddha Cliff'], [/乾隆行宫遗址/g, 'Qianlong Palace Ruins'],
  [/桃花涧/g, 'Peach Blossom Ravine'], [/天开岩/g, 'Tiankai Rock'], [/叠浪崖|叠浪岩/g, 'Dielang Cliff'], [/枫岭/g, 'Maple Ridge'], [/凤翔峰/g, 'Fengxiang Peak'],
  [/碧云亭/g, 'Biyun Pavilion'], [/纱帽峰|纱��峰/g, 'Shamao Peak'], [/般若台/g, 'Prajna Terrace'], [/玲峰池/g, 'Lingfeng Pond'], [/始皇临江处/g, 'First Emperor Riverside'],
  [/中峰涧/g, 'Middle Peak Ravine'], [/一线天/g, 'One-Line Sky'], [/虎山/g, 'Tiger Mountain'], [/龙山/g, 'Dragon Mountain'], [/红叶谷/g, 'Red Maple Valley'],
  [/栖霞飞天/g, 'Qixia Flying Apsaras'], [/桃花湖/g, 'Peach Blossom Lake'], [/乾隆御花园/g, 'Qianlong Imperial Garden'], [/了凡问道/g, 'Liaofan Seeks the Way'],
  [/钟鼓楼/g, 'Bell and Drum Towers'], [/卧云亭/g, 'Woyun Pavilion'], [/中大路赏枫段/g, 'Zhongda Road Maple Walk'],
  [/约/g, 'about '], [/分钟/g, ' min'], [/米/g, ' m'], [/公里/g, ' km'], [/步行/g, 'Walk '], [/路线/g, 'route'], [/景点/g, 'Attractions'],
  [/游客服务/g, 'Visitor services'], [/交通停车/g, 'Transport & parking'], [/门票套票/g, 'Tickets'], [/活动/g, 'Events'], [/吃住/g, 'Food & stay'],
  [/坐标/g, 'Coordinates'], [/知识库坐标/g, 'Knowledge base · mapped'], [/知识库/g, 'Knowledge base'], [/可信度/g, 'Credibility'], [/位置/g, 'Location'], [/别名/g, 'Also known as'],
  [/原文/g, 'Original Chinese text'], [/中文/g, 'Chinese'], [/已核验/g, 'Verified'], [/待核验/g, 'Verification pending'], [/示意/g, 'Illustrative'], [/游客中心/g, 'Visitor Center'], [/观景/g, 'Viewpoint'], [/古迹/g, 'Historic site'], [/山水/g, 'Scenic waters'], [/寺院/g, 'Temple'], [/石刻/g, 'Stone carvings'], [/游玩/g, 'visit'], [/小时/g, ' hr'], [/轻松/g, 'Easy'], [/适中/g, 'Moderate'], [/进阶/g, 'Advanced'], [/模拟数据/g, 'Demo data'], [/非实时/g, 'Not live'], [/实时/g, 'Live'], [/拥挤/g, 'Busy'], [/舒适/g, 'Comfortable'], [/建议/g, 'Suggested'], [/请以现场为准/g, 'Follow on-site information'], [/暂无/g, 'Not available'], [/活动/g, 'Events'], [/步道/g, 'trail'], [/台阶/g, 'steps'], [/山林/g, 'mountain forest'], [/步行/g, 'walking'], [/行宫/g, 'palace'], [/御花园/g, 'Imperial Garden'], [/交通/g, 'Transport'], [/停车/g, 'Parking'], [/门票/g, 'Tickets'], [/设施/g, 'facilities'], [/状态/g, 'status'], [/人数/g, 'visitors'], [/数据/g, 'data'], [/更新于/g, 'Updated '], [/可信度/g, 'Credibility'], [/来源/g, 'Source'], [/摘要/g, 'Summary'], [/开放/g, 'open'], [/路线/g, 'route'], [/名称/g, 'name'], [/搜索/g, 'Search'], [/条可定位/g, ' mappable'], [/共 /g, 'Total '], [/ 条/g, ' entries'], [/停车场/g, ' Parking'], [/余位充足/g, 'Spaces available'], [/预计 /g, 'Estimated '], [/分钟内满位/g, ' min until full'], [/排队约 /g, 'Queue about '], [/发车间隔 /g, 'Shuttle every '],
  [/分类/g, 'Category'], [/查看/g, 'View'], [/关闭/g, 'Close'], [/搜索/g, 'Search'], [/暂无/g, 'Not available'], [/人/g, ' visitors'],
]
export function localizeText(value: string, locale: Locale): string {
  if (locale === 'zh-CN') return value
  const exact = poiTextTranslations[value] ?? exactText[value]
  if (exact) return exact
  return common.reduce((text, [pattern, replacement]) => text.replace(pattern, replacement), value)
}
