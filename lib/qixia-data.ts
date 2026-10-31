import type { Feature, Point } from 'geojson'
export type LngLat = [number, number]

export type PoiCategory = '寺院' | '石刻' | '古迹' | '山水' | '观景' | '服务'

export interface Poi {
  id: string
  name: string
  category: PoiCategory
  coordinates: LngLat
  brief: string
  story: string
  elevation: number
  peakLoad: number
  hourlyCurve: 'morning' | 'midday' | 'afternoon' | 'sunset'
  image: string
  imageCredit?: string
}

export type PersonaId = 'family' | 'youth' | 'culture' | 'elder' | 'photo'

export interface Persona {
  id: PersonaId
  name: string
  short: string
  cares: string
  routeName: string
  stops: string[]
  durationMin: number
  distanceKm: number
  intensity: '轻松' | '适中' | '进阶'
  stairs: string
  highlights: string[]
  questions: string[]
}

export type DeviceStatus = 'online' | 'warning' | 'offline'

export interface Device {
  id: string
  type: '客流摄像' | '闸机' | '导览屏' | '应急广播' | '环境传感'
  coordinates: LngLat
  status: DeviceStatus
}

export interface TrafficNode {
  id: string
  name: string
  kind: 'parking' | 'shuttle' | 'bus'
  coordinates: LngLat
  capacity: number
  used: number
  note: string
}

export interface SafetyAlert {
  id: string
  level: '提示' | '关注' | '预警'
  title: string
  detail: string
  coordinates: LngLat
}

export const QIXIA_CENTER: LngLat = [118.9575, 32.1545]

export const POIS: Poi[] = [
  {
    id: 'gate',
    image: '/images/poi/gate.jpg',
    name: '南门游客中心',
    category: '服务',
    coordinates: [118.952, 32.1495],
    brief: '入园主入口，提供咨询、寄存、轮椅借用与红枫叶章领取。',
    story: '游客中心是“一客一景”路线的起点。首次打开导览时在这里选择同行方式，系统会据此生成节奏合适的路线。',
    elevation: 18,
    peakLoad: 900,
    hourlyCurve: 'morning',
  },
  {
    id: 'mirror-lake',
    image: '/images/poi/mirror-lake.jpg',
    name: '明镜湖',
    category: '山水',
    coordinates: [118.9538, 32.1514],
    brief: '栖霞寺前的半月形水面，倒映寺院与秋日红枫，是入园第一处取景点。',
    story: '明镜湖是本地图展示的山水停留点。湖畔步道、台阶与婴儿车通行条件尚未现场核验，请以景区指引为准。',
    elevation: 22,
    peakLoad: 700,
    hourlyCurve: 'midday',
  },
  {
    id: 'temple',
    image: '/images/poi/temple.jpg',
    name: '栖霞寺',
    category: '寺院',
    coordinates: [118.9552, 32.153],
    brief: '始建于南齐永明七年（489 年），中国佛教三论宗祖庭，江南著名古刹。',
    story: '南齐隐士明僧绍舍宅为寺，初名“栖霞精舍”。千余年间屡毁屡建，现存建筑多为清末民初重建，毗卢宝殿、藏经楼依山层叠。',
    elevation: 35,
    peakLoad: 1200,
    hourlyCurve: 'midday',
  },
  {
    id: 'stele',
    image: '/images/poi/stele.jpg',
    name: '明征君碑',
    category: '古迹',
    coordinates: [118.9546, 32.1524],
    brief: '唐高宗李治撰文、书法家高正臣书写，记述明僧绍生平，碑阴“栖霞”二字相传为高宗手书。',
    story: '此碑立于唐上元三年（676 年），是南京地区现存最重要的唐碑之一。碑文追述明僧绍隐居栖霞、舍宅为寺的经历。',
    elevation: 30,
    peakLoad: 300,
    hourlyCurve: 'midday',
  },
  {
    id: 'pagoda',
    image: '/images/poi/pagoda.jpg',
    name: '舍利塔',
    category: '古迹',
    coordinates: [118.9566, 32.1534],
    brief: '隋文帝仁寿元年始建，现塔为南唐重建，五级八面石塔，塔身浮雕“八相成道”。',
    story: '塔基与塔身满布精美浮雕，描绘释迦牟尼从降生到涅槃的八个阶段，是研究五代石刻艺术的重要实物。',
    elevation: 42,
    peakLoad: 600,
    hourlyCurve: 'midday',
  },
  {
    id: 'grottoes',
    image: '/images/poi/grottoes.jpg',
    name: '千佛岩',
    category: '石刻',
    coordinates: [118.9574, 32.154],
    brief: '始凿于南齐，历代续凿，现存佛龛约 250 个、造像 500 余尊，被誉为“江南云冈”。',
    story: '最大的无量寿佛高近 11 米，最小的造像仅十几厘米。孩子们可以玩“找最小的佛”小任务，完成后解锁一枚叶章。',
    elevation: 55,
    peakLoad: 1000,
    hourlyCurve: 'midday',
  },
  {
    id: 'palace',
    image: '/images/poi/palace.jpg',
    name: '乾隆行宫遗址',
    category: '古迹',
    coordinates: [118.9592, 32.1548],
    brief: '乾隆六下江南五次驻跸栖霞，留下行宫遗址与大量御制诗碑。',
    story: '乾隆对栖霞山极为喜爱，称其为“第一金陵明秀山”。遗址经考古整理后对外开放，可看到宫殿台基与御道。',
    elevation: 70,
    peakLoad: 400,
    hourlyCurve: 'afternoon',
  },
  {
    id: 'peach-creek',
    image: '/images/poi/peach-creek.jpg',
    name: '桃花涧',
    category: '山水',
    coordinates: [118.9606, 32.1531],
    brief: '山涧溪流与林间小径，沿途有座椅和补给点，适合中途休息。',
    story: '春季桃花沿涧盛开，秋季则以林荫与溪声为主。涧旁平台可作为亲子与长者路线的休息节点。',
    elevation: 48,
    peakLoad: 350,
    hourlyCurve: 'afternoon',
  },
  {
    id: 'tiankai',
    image: '/images/poi/tiankai.jpg',
    name: '天开岩',
    category: '石刻',
    coordinates: [118.9548, 32.1566],
    brief: '两崖对峙如天门初开，崖壁上保留历代文人题刻。',
    story: '岩壁题刻涵盖宋、明、清多个时期，内容有诗文、游记与地名题字，是文化爱好者驻足最久的点位之一。',
    elevation: 95,
    peakLoad: 300,
    hourlyCurve: 'afternoon',
  },
  {
    id: 'dielang',
    image: '/images/poi/dielang.jpg',
    name: '叠浪崖',
    category: '观景',
    coordinates: [118.9576, 32.1573],
    brief: '岩层如层层叠浪，秋日枫叶与岩壁形成强烈色彩对比，是热门拍照点。',
    story: '午后侧光下岩层纹理最清晰。雨后石阶湿滑，请沿护栏内侧行走。',
    elevation: 130,
    peakLoad: 500,
    hourlyCurve: 'afternoon',
  },
  {
    id: 'maple-ridge',
    image: '/images/poi/maple-ridge.jpg',
    name: '枫岭',
    category: '观景',
    coordinates: [118.9618, 32.156],
    brief: '栖霞红枫最集中的山脊步道，“春牛首、秋栖霞”的“秋”即在于此。',
    story: '栖霞山红叶以枫香、鸡爪槭、乌桕为主，通常 11 月中下旬进入最佳观赏期。当前处于转色期，向阳坡已大面积泛红。',
    elevation: 160,
    peakLoad: 900,
    hourlyCurve: 'afternoon',
  },
  {
    id: 'summit',
    image: '/images/poi/summit.jpg',
    name: '凤翔峰',
    category: '观景',
    coordinates: [118.962, 32.1589],
    brief: '栖霞山主峰，海拔约 286 米，峰顶可远眺长江与南京城东。',
    story: '主峰旧有三茅宫，是登高望江的经典位置。山顶风大，秋冬季节请准备外套。',
    elevation: 286,
    peakLoad: 450,
    hourlyCurve: 'sunset',
  },
  {
    id: 'biyun',
    image: '/images/poi/biyun.jpg',
    name: '碧云亭观景台',
    category: '观景',
    coordinates: [118.959, 32.16],
    brief: '朝西开阔的观景平台，是摄影爱好者拍摄日落与江景的首选位置。',
    story: '10 月底日落约 17:20，最佳光线窗口在 16:30–17:15。平台面积有限，高峰时段请错峰停留。',
    elevation: 240,
    peakLoad: 260,
    hourlyCurve: 'sunset',
  },
  {
    id: 'shamao-peak', image: '/images/poi/shamao-peak.png', name: '纱帽峰', category: '观景', coordinates: [118.9578, 32.1552],
    brief: '位于千佛岩之巅，因峰形与纱帽相似得名，乾隆南巡时曾赐名玉冠峰。', story: '纱帽峰被佛龛环抱，是连接石刻与山景的高处节点。', elevation: 120, peakLoad: 350, hourlyCurve: 'afternoon',
  },
  {
    id: 'banruo-platform', image: '/images/poi/banruo-platform.png', name: '般若台', category: '古迹', coordinates: [118.9558, 32.1548],
    brief: '位于西峰的古代石刻台地，与四十二章经善本和慧光法师有关。', story: '这里保留了栖霞山佛教文化与碑刻传统的线索，适合文化路线停留。', elevation: 78, peakLoad: 220, hourlyCurve: 'midday',
  },
  {
    id: 'lingfeng-pond', image: '/images/poi/lingfeng-pond.png', name: '玲峰池', category: '山水', coordinates: [118.9586, 32.1558],
    brief: '位于中峰一侧、乾隆行宫内��历史水景，旧称水面清澈可鉴。', story: '玲峰池与行宫遗址、石梁相望，是山中人文水景节点。', elevation: 92, peakLoad: 180, hourlyCurve: 'afternoon',
  },
  {
    id: 'shihuang-riverside', image: '/images/poi/shihuang-riverside.png', name: '始皇临江处', category: '观景', coordinates: [118.9626, 32.161],
    brief: '观光车线路中的临江观景点，可远望长江与山下平原。', story: '适合与碧云亭、凤翔峰串联游览，具体视野受天气影响。', elevation: 220, peakLoad: 380, hourlyCurve: 'sunset',
  },
  {
    id: 'middle-creek', image: '/images/poi/middle-creek.png', name: '中峰涧', category: '山水', coordinates: [118.9598, 32.1565],
    brief: '山中涧水汇入明镜湖的自然水系节点。', story: '雨后水声更明显，沿涧行走请注意湿滑路面。', elevation: 80, peakLoad: 260, hourlyCurve: 'afternoon',
  },
  {
    id: 'one-line-sky', image: '/images/poi/one-line-sky.png', name: '一线天', category: '石刻', coordinates: [118.9562, 32.156],
    brief: '两块巨石夹立，中间仅留一线天光的天然石景。', story: '狭窄岩隙是栖霞山自然奇观之一，通行时请听从现场指引。', elevation: 110, peakLoad: 300, hourlyCurve: 'afternoon',
  },
  {
    id: 'tiger-mountain', image: '/images/poi/tiger-mountain.png', name: '虎山', category: '观景', coordinates: [118.9508, 32.158],
    brief: '栖霞山西北侧山体，适合从山林视角观察栖霞山地形。', story: '虎山属于山体地名节点，路线与开放情况以景区现场信息为准。', elevation: 170, peakLoad: 180, hourlyCurve: 'afternoon',
  },
  {
    id: 'dragon-mountain', image: '/images/poi/dragon-mountain.png', name: '龙山', category: '观景', coordinates: [118.964, 32.158],
    brief: '栖霞山东北侧山体，连接林地与远眺视线。', story: '龙山适合作为山林地理知识点查看，不代表当前开放登山线路。', elevation: 190, peakLoad: 180, hourlyCurve: 'afternoon',
  },
  {
    id: 'red-leaf-valley', image: '/images/poi/red-leaf-valley.png', name: '红叶谷', category: '观景', coordinates: [118.9535, 32.157],
    brief: '成片枫叶形成的山谷，秋季空气清新、视线开阔。', story: '红叶谷是栖霞山秋季观景的重要区域，最佳效果受当年转色进度影响。', elevation: 100, peakLoad: 750, hourlyCurve: 'afternoon',
  },
  {
    id: 'qixia-flying', image: '/images/poi/qixia-flying.png', name: '栖霞飞天', category: '石刻', coordinates: [118.957, 32.1542],
    brief: '千佛岩内发现的保存较完整的壁画遗存。', story: '栖霞飞天补充了千佛岩石刻之外的壁画线索，参观范围以现场保护安排为准。', elevation: 58, peakLoad: 220, hourlyCurve: 'midday',
  },
  {
    id: 'peach-lake', image: '/images/poi/peach-lake.png', name: '桃花湖', category: '山水', coordinates: [118.961, 32.154],
    brief: '桃花涧中游的水景区域，春季桃花沿涧盛开。', story: '桃花湖与桃花涧共同构成山中休憩与赏花节点。', elevation: 60, peakLoad: 320, hourlyCurve: 'afternoon',
  },
  {
    id: 'hengha-hall', image: '/images/poi/hengha-hall.png', name: '哼哈殿', category: '寺院', coordinates: [118.9548, 32.1528],
    brief: '栖霞寺山门，也称金刚殿，供奉哼哈二将。', story: '哼哈殿是进入寺院核心建筑群前的门殿节点。', elevation: 38, peakLoad: 520, hourlyCurve: 'midday',
  },
  {
    id: 'lingyun-platform', image: '/images/poi/lingyun-platform.png', name: '有凌云意观景平台', category: '观景', coordinates: [118.9602, 32.1552],
    brief: '乾隆行宫中的观景建筑，可作为行宫遗址游览的一部分。', story: '名称取自登高临远的意境，具体遗址展示以现场说明为准。', elevation: 86, peakLoad: 220, hourlyCurve: 'afternoon',
  },
  {
    id: 'qianlong-garden', image: '/images/poi/qianlong-garden.png', name: '乾隆御花园', category: '古迹', coordinates: [118.9598, 32.1548],
    brief: '乾隆行宫相关园林遗址，记录清代皇家行幸栖霞的痕迹。', story: '可与乾隆行宫遗址、玲峰池一并了解栖霞山的清代历史。', elevation: 74, peakLoad: 260, hourlyCurve: 'afternoon',
  },
  {
    id: 'liaofan-qiuxin', image: '/images/poi/liaofan-qiuxin.png', name: '了凡问道', category: '古迹', coordinates: [118.9578, 32.1578],
    brief: '讲述袁了凡与云谷禅师问道故事的文化景点。', story: '这个节点适合结合《了凡四训》了解明代人物与栖霞山的文化关联。', elevation: 135, peakLoad: 160, hourlyCurve: 'afternoon',
  },
  {
    id: 'bell-drum-towers', image: '/images/poi/bell-drum-towers.png', name: '钟鼓楼', category: '寺院', coordinates: [118.9558, 32.1534],
    brief: '栖霞寺内的钟楼与鼓楼，早晚叩钟相传为一百零八响。', story: '钟鼓楼是寺院礼仪与时间秩序的重要空间，开放和活动以现场安排为准。', elevation: 43, peakLoad: 420, hourlyCurve: 'midday',
  },
  {
    id: 'wolun-pavilion', image: '/images/poi/wolun-pavilion.png', name: '卧云亭', category: '观景', coordinates: [118.963, 32.162],
    brief: '卧云景区内恢复的明代意境景观节点。', story: '卧云亭以山林、亭台与云气意象为特色，具体路线以景区开放信息为准。', elevation: 210, peakLoad: 200, hourlyCurve: 'sunset',
  },
  {
    id: 'middle-road-maple', image: '/images/poi/middle-road-maple.png', name: '中大路赏枫段', category: '观景', coordinates: [118.9528, 32.156],
    brief: '中大路沿线的红枫观赏路段，秋季进入全盛期时色彩集中。', story: '适合把它当作连续赏枫路段浏览，而非单一建筑景点。', elevation: 92, peakLoad: 680, hourlyCurve: 'afternoon',
  },
]

export const POI_MAP: Record<string, Poi> = Object.fromEntries(POIS.map((p) => [p.id, p]))

export const PERSONAS: Persona[] = [
  {
    id: 'family',
    name: '亲子家庭',
    short: '亲子',
    cares: '孩子能够理解、愿意参与的内容，以及步行、休息和同行人的节奏。',
    routeName: '红枫寻章 · 小小探险家',
    stops: ['gate', 'mirror-lake', 'temple', 'pagoda', 'grottoes', 'peach-creek'],
    durationMin: 150,
    distanceKm: 2.8,
    intensity: '轻松',
    stairs: '示意路线；婴儿车通行与台阶情况需现场确认',
    highlights: ['千佛岩“找最小的佛”任务', '每 400 米一处休息点', '6 枚可收集的红枫叶章'],
    questions: ['带 5 岁孩子怎么玩不会太累？', '千佛岩有什么适合讲给孩子的故事？', '哪里有母婴室和厕所？'],
  },
  {
    id: 'youth',
    name: '青年游客',
    short: '青年',
    cares: '有趣的地方故事、拍照、轻徒步、影像表达和同伴交流。',
    routeName: '轻徒步 · 山野出片线',
    stops: ['gate', 'mirror-lake', 'grottoes', 'dielang', 'summit', 'maple-ridge'],
    durationMin: 210,
    distanceKm: 4.6,
    intensity: '适中',
    stairs: '叠浪崖至凤翔峰为连续石阶',
    highlights: ['叠浪崖红枫岩壁机位', '凤翔峰望���打卡', '同伴叶章合成纪念卡'],
    questions: ['栖霞山有哪些冷门但好玩的故事？', '叠浪崖几点去光线最好？', '三小时轻徒步怎么走？'],
  },
  {
    id: 'culture',
    name: '文化爱好者',
    short: '文化',
    cares: '人物、诗文、题刻、建筑与地方历史，也愿意停下来继续追问。',
    routeName: '六朝至清 · 碑刻诗文线',
    stops: ['temple', 'stele', 'pagoda', 'grottoes', 'palace', 'tiankai'],
    durationMin: 180,
    distanceKm: 3.1,
    intensity: '适中',
    stairs: '部分路段含石阶，具体数量与通行条件未核验',
    highlights: ['明征君碑与唐高宗书法', '舍利塔“八相成道”浮雕', '天开岩历代题刻'],
    questions: ['明僧绍是谁？为什么舍宅为寺？', '乾隆为栖霞山写过哪些诗？', '三论宗和栖霞寺有什么关系？'],
  },
  {
    id: 'elder',
    name: '长者同行',
    short: '长者',
    cares: '清楚的路径、从容的节奏、方便的休息与补给，以及丰富的文化内容。',
    routeName: '从容慢游 · 古寺平路线',
    stops: ['gate', 'mirror-lake', 'temple', 'stele', 'pagoda'],
    durationMin: 120,
    distanceKm: 1.9,
    intensity: '轻松',
    stairs: '平缓优先的示意顺序；实际台阶与通行条件需现场确认',
    highlights: ['可先询问休息与补给位置', '文字讲解可随时追问', '长者对话采用较大字号'],
    questions: ['有没有不爬台阶的路线？', '哪里可以坐下休息、买水？', '栖霞寺有哪些值得慢慢看的地方？'],
  },
  {
    id: 'photo',
    name: '摄影与户外游客',
    short: '摄影',
    cares: '点位、路线、季节、光线、体力与途中补给。',
    routeName: '光影追枫 · 日落长线',
    stops: ['gate', 'tiankai', 'dielang', 'summit', 'biyun', 'maple-ridge'],
    durationMin: 270,
    distanceKm: 6.2,
    intensity: '进阶',
    stairs: '累计爬升约 300 米，含多段陡阶',
    highlights: ['碧云亭 16:30 日落窗口', '枫岭逆光红叶', '途中 2 处补给点'],
    questions: ['今天日落几点，碧云亭什么时候去？', '红叶现在变色到什么程度了？', '长焦和广角分别适合哪些机位？'],
  },
]

export const PERSONA_MAP: Record<PersonaId, Persona> = Object.fromEntries(
  PERSONAS.map((p) => [p.id, p]),
) as Record<PersonaId, Persona>

export const DEVICES: Device[] = [
  { id: 'cam-01', type: '客流摄像', coordinates: [118.9522, 32.1499], status: 'online' },
  { id: 'gate-01', type: '闸机', coordinates: [118.9516, 32.1493], status: 'online' },
  { id: 'gate-02', type: '闸机', coordinates: [118.9525, 32.1492], status: 'warning' },
  { id: 'cam-02', type: '客流摄像', coordinates: [118.9549, 32.1532], status: 'online' },
  { id: 'scr-01', type: '导览屏', coordinates: [118.954, 32.1518], status: 'online' },
  { id: 'cam-03', type: '客流摄像', coordinates: [118.9576, 32.1542], status: 'online' },
  { id: 'brd-01', type: '应急广播', coordinates: [118.9569, 32.1537], status: 'online' },
  { id: 'env-01', type: '环境传感', coordinates: [118.9578, 32.1575], status: 'warning' },
  { id: 'cam-04', type: '客流摄像', coordinates: [118.9616, 32.1562], status: 'online' },
  { id: 'scr-02', type: '导览屏', coordinates: [118.9594, 32.155], status: 'offline' },
  { id: 'brd-02', type: '应急广播', coordinates: [118.9621, 32.1586], status: 'online' },
  { id: 'env-02', type: '环境传感', coordinates: [118.9592, 32.1598], status: 'online' },
  { id: 'cam-05', type: '客流摄像', coordinates: [118.9605, 32.1533], status: 'online' },
  { id: 'scr-03', type: '导览屏', coordinates: [118.9551, 32.1564], status: 'online' },
]

export const TRAFFIC_NODES: TrafficNode[] = [
  { id: 'p-south', name: '南门停车场', kind: 'parking', coordinates: [118.9502, 32.1487], capacity: 620, used: 548, note: '预计 40 分钟内满位' },
  { id: 'p-east', name: '东侧停车场', kind: 'parking', coordinates: [118.9642, 32.1506], capacity: 380, used: 196, note: '余位充足，建议分流至此' },
  { id: 'shuttle', name: '景区观光车', kind: 'shuttle', coordinates: [118.9558, 32.1508], capacity: 24, used: 18, note: '发车间隔 8 分钟，排队约 12 分钟' },
  { id: 'bus', name: '栖霞山公交站', kind: 'bus', coordinates: [118.9488, 32.1476], capacity: 100, used: 62, note: '南京地铁接驳专线运行中' },
]

export const SAFETY_ALERTS: SafetyAlert[] = [
  { id: 'a1', level: '预警', title: '千佛岩客流接近上限', detail: '当前承载率 92%，建议先游览乾隆行宫后返回。', coordinates: [118.9574, 32.154] },
  { id: 'a2', level: '关注', title: '叠浪崖石阶湿滑', detail: '晨露未干，请沿护栏内侧通行。', coordinates: [118.9576, 32.1573] },
  { id: 'a3', level: '提示', title: '枫岭步道单向通行', detail: '红叶季 10:00–16:00 实行单向游览。', coordinates: [118.9618, 32.156] },
]

const CURVES: Record<Poi['hourlyCurve'], number[]> = {
  morning: [0.55, 0.85, 1, 0.9, 0.7, 0.55, 0.5, 0.45, 0.35, 0.25, 0.15],
  midday: [0.2, 0.45, 0.75, 1, 0.95, 0.8, 0.7, 0.55, 0.4, 0.25, 0.12],
  afternoon: [0.1, 0.25, 0.45, 0.7, 0.85, 1, 0.95, 0.8, 0.6, 0.35, 0.15],
  sunset: [0.08, 0.15, 0.25, 0.4, 0.5, 0.6, 0.7, 0.85, 1, 0.75, 0.3],
}

export const OPEN_HOUR = 8
export const CLOSE_HOUR = 18

export function poiLoad(poi: Poi, hour: number) {
  const curve = CURVES[poi.hourlyCurve]
  const index = Math.min(curve.length - 1, Math.max(0, Math.round(hour - OPEN_HOUR)))
  return Math.round(poi.peakLoad * curve[index])
}

export function crowdLevel(ratio: number): { label: string; tone: 'low' | 'mid' | 'high' } {
  if (ratio >= 0.85) return { label: '拥挤', tone: 'high' }
  if (ratio >= 0.55) return { label: '适中', tone: 'mid' }
  return { label: '舒适', tone: 'low' }
}

function seededRandom(seed: number) {
  let s = seed
  return () => {
    s = (s * 16807) % 2147483647
    return (s - 1) / 2147483646
  }
}

export function buildHeatFeatures(hour: number) {
  const features: Feature<Point, { w: number }>[] = []
  POIS.forEach((poi, poiIndex) => {
    const rand = seededRandom(poiIndex * 977 + 13)
    const load = poiLoad(poi, hour)
    const count = Math.max(4, Math.round(load / 40))
    for (let i = 0; i < count; i++) {
      const angle = rand() * Math.PI * 2
      const dist = Math.sqrt(rand()) * 0.0009
      features.push({
        type: 'Feature',
        geometry: {
          type: 'Point',
          coordinates: [poi.coordinates[0] + Math.cos(angle) * dist, poi.coordinates[1] + Math.sin(angle) * dist * 0.85],
        },
        properties: { w: Math.min(1, (load / poi.peakLoad) * (0.4 + rand() * 0.6)) },
      })
    }
  })
  return { type: 'FeatureCollection' as const, features }
}

export function snapshot(hour: number) {
  const visitors = POIS.reduce((sum, p) => sum + poiLoad(p, hour), 0) * 3
  const capacity = 28000
  const online = DEVICES.filter((d) => d.status === 'online').length
  const parkingFree = TRAFFIC_NODES.filter((n) => n.kind === 'parking').reduce((s, n) => s + (n.capacity - n.used), 0)
  return {
    visitors,
    capacity,
    loadRatio: visitors / capacity,
    deviceOnlineRate: online / DEVICES.length,
    devicesTotal: DEVICES.length,
    devicesAbnormal: DEVICES.length - online,
    parkingFree,
    alerts: SAFETY_ALERTS.length,
  }
}

export const FOLIAGE = {
  colorRate: 46,
  stage: '转色期',
  peakForecast: '11 月 15 日 – 11 月 28 日',
  weather: '晴 · 14–21°C',
  sunset: '17:21',
}

export function formatDuration(min: number) {
  const h = Math.floor(min / 60)
  const m = min % 60
  return m ? `${h} 小时 ${m} 分` : `${h} 小时`
}
