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

const COMMONS = '维基共享资源'

export const POIS: Poi[] = [
  {
    id: 'gate',
    name: '南门游客中心',
    category: '服务',
    coordinates: [118.952, 32.1495],
    brief: '入园主入口，提供咨询、寄存、轮椅借用与红枫叶章领取，开放 9:00—17:00，旁边有卫生间。',
    story: '游客中心是“一客一景”路线的起点。首次打开导览时在这里选择同行方式，系统会据此生成节奏合适的路线。',
    elevation: 18,
    peakLoad: 900,
    hourlyCurve: 'morning',
    image: '/images/poi/gate.jpg',
  },
  {
    id: 'mirror-lake',
    name: '明镜湖',
    category: '山水',
    coordinates: [118.95144, 32.15414],
    brief: '栖霞寺前的半月形水面，倒映寺院与秋日红枫，是入园第一处取景点。',
    story: '明镜湖是栖霞山的自然景观之一，湖中常见黑天鹅游弋。湖畔步道、台阶与婴儿车通行条件请以景区指引为准。',
    elevation: 22,
    peakLoad: 700,
    hourlyCurve: 'midday',
    image: '/images/poi/kb-mirror-lake.jpg',
    imageCredit: `Leiem · CC0 · ${COMMONS}`,
  },
  {
    id: 'temple',
    name: '栖霞寺',
    category: '寺院',
    coordinates: [118.95417, 32.15417],
    brief: '始建于南齐永明七年（489 年），中国佛教三论宗祖庭，江南著名古刹。',
    story: '南齐隐士明僧绍舍宅为寺，初名“栖霞精舍”。千余年间屡毁屡建，现存建筑多为清末民初重建，毗卢宝殿、藏经楼依山层叠。',
    elevation: 35,
    peakLoad: 1200,
    hourlyCurve: 'midday',
    image: '/images/poi/kb-temple.jpg',
    imageCredit: `Bt4wang · CC BY-SA 3.0 · ${COMMONS}`,
  },
  {
    id: 'zhonggulou',
    name: '钟鼓楼',
    category: '寺院',
    coordinates: [118.95389, 32.15389],
    brief: '栖霞寺里的钟楼和鼓楼，约 2000 年前后建成，大鼓重约 400 公斤。',
    story: '寺中早晚叩钟 108 响，晨钟暮鼓是古寺一日作息的开始与结束。',
    elevation: 33,
    peakLoad: 400,
    hourlyCurve: 'morning',
    image: '/images/poi/zhonggulou.jpg',
  },
  {
    id: 'stele',
    name: '明征君碑',
    category: '古迹',
    coordinates: [118.95317, 32.15432],
    brief: '唐高宗李治撰文、书法家高正臣书写，记述明僧绍生平，碑阴“栖霞”二字相传为高宗手书。',
    story: '此碑立于唐上元三年（676 年），2001 年列为第五批全国重点文物保护单位，是南京地区现存最重要的唐碑之一。',
    elevation: 30,
    peakLoad: 300,
    hourlyCurve: 'midday',
    image: '/images/poi/kb-stele.jpg',
    imageCredit: `Siyuwj · CC BY-SA 4.0 · ${COMMONS}`,
  },
  {
    id: 'pagoda',
    name: '舍利塔',
    category: '古迹',
    coordinates: [118.95468, 32.1539],
    brief: '隋文帝仁寿元年始建，现塔为南唐重建，五级八面石塔，塔身浮雕“八相成道”。',
    story: '塔基与塔身满布精美浮雕，描绘释迦牟尼从降生到涅槃的八个阶段，是研究五代石刻艺术的重要实物。',
    elevation: 42,
    peakLoad: 600,
    hourlyCurve: 'midday',
    image: '/images/poi/kb-pagoda.jpg',
    imageCredit: `西安兵马俑 · CC BY-SA 4.0 · ${COMMONS}`,
  },
  {
    id: 'grottoes',
    name: '千佛岩',
    category: '石刻',
    coordinates: [118.95503, 32.15385],
    brief: '始凿于南齐，历代续凿，现存佛龛约 250 个、造像 500 余尊，被誉为“江南云冈”。',
    story: '最大的无量寿佛高近 11 米，最小的造像仅十几厘米。孩子们可以玩“找最小的佛”小任务，完成后解锁一枚叶章。',
    elevation: 55,
    peakLoad: 1000,
    hourlyCurve: 'midday',
    image: '/images/poi/kb-grottoes.jpg',
    imageCredit: `Farm · CC BY-SA 3.0 · ${COMMONS}`,
  },
  {
    id: 'shamaofeng',
    name: '纱帽峰',
    category: '观景',
    coordinates: [118.95609, 32.15413],
    brief: '位于千佛岩之巅，被众佛龛环抱；乾隆南巡时嫌其名俗，赐名“玉冠峰”。',
    story: '今人仍习惯称纱帽峰。站在峰顶回望，可俯瞰千佛岩佛龛层层排布的格局。',
    elevation: 75,
    peakLoad: 250,
    hourlyCurve: 'afternoon',
    image: '/images/poi/shamaofeng.jpg',
  },
  {
    id: 'palace',
    name: '乾隆行宫遗址',
    category: '古迹',
    coordinates: [118.95684, 32.15369],
    brief: '清代两江总督尹继善为乾隆所建，乾隆南巡多次驻跸，行宫毁于咸丰年间。',
    story: '乾隆对栖霞山极为喜爱，称其为“第一金陵明秀山”。遗址经考古整理后对外开放，可看到宫殿台基与石砌墙垣。',
    elevation: 70,
    peakLoad: 400,
    hourlyCurve: 'afternoon',
    image: '/images/poi/kb-palace.jpg',
    imageCredit: `Remixia · CC0 · ${COMMONS}`,
  },
  {
    id: 'boreta',
    name: '般若台',
    category: '石刻',
    coordinates: [118.95644, 32.15573],
    brief: '位于西峰，沙门慧光建立，因《四十二章经》善本由名士书刻、勒石四面以封而得名。',
    story: '般若台旁有泉与果园，是西峰一带安静的文化停留点，适合慢慢看石刻。',
    elevation: 110,
    peakLoad: 200,
    hourlyCurve: 'afternoon',
    image: '/images/poi/boreta.jpg',
  },
  {
    id: 'peach-creek',
    name: '桃花湖',
    category: '山水',
    coordinates: [118.95546, 32.156225],
    brief: '在桃花涧中游建成，为纪念李香君；桃花涧自明代以来逢春桃花争妍。',
    story: '湖畔有座椅和补给点，适合中途休息。春季桃花沿涧盛开，秋季则以林荫与溪声为主。',
    elevation: 48,
    peakLoad: 350,
    hourlyCurve: 'afternoon',
    image: '/images/poi/peach-creek.jpg',
  },
  {
    id: 'dielang',
    name: '叠浪岩',
    category: '观景',
    coordinates: [118.95444, 32.15542],
    brief: '层崖起伏如波澜，乱石交错，若海波万沸；其下平阪数亩，旧传为栖霞观故址。',
    story: '午后侧光下岩层纹理最清晰，秋日枫叶与岩壁形成强烈色彩对比。雨后石阶湿滑，请沿护栏内侧行走。',
    elevation: 130,
    peakLoad: 500,
    hourlyCurve: 'afternoon',
    image: '/images/poi/dielang.jpg',
  },
  {
    id: 'liaofanwendao',
    name: '了凡问道',
    category: '古迹',
    coordinates: [118.95953, 32.15671],
    brief: '讲述 1570 年袁了凡与云谷禅师在栖霞山问道的故事，出自《了凡四训》。',
    story: '云谷禅师是袁了凡的开悟导师，“命由我作，福自己求”的思想由此而来。',
    elevation: 120,
    peakLoad: 220,
    hourlyCurve: 'afternoon',
    image: '/images/poi/liaofanwendao.jpg',
  },
  {
    id: 'woyunting',
    name: '卧云亭',
    category: '观景',
    coordinates: [118.95812, 32.15722],
    brief: '为再现明代“卧云”景观，景区在卧云景区修建山道、广植名贵花草树木后恢复的亭子。',
    story: '晨间山雾未散时最有“卧云”意境，是登山途中歇脚的好位置。',
    elevation: 140,
    peakLoad: 220,
    hourlyCurve: 'morning',
    image: '/images/poi/woyunting.jpg',
  },
  {
    id: 'tiankai',
    name: '天开岩',
    category: '石刻',
    coordinates: [118.95919, 32.15731],
    brief: '两崖对峙如天门初开，崖壁上保留历代文人题刻。',
    story: '岩下石壁“试茶亭白乳泉”六个大字题刻仍在，传说陆羽曾在此品泉试茶，是文化爱好者驻足最久的点位之一。',
    elevation: 95,
    peakLoad: 300,
    hourlyCurve: 'afternoon',
    image: '/images/poi/tiankai.jpg',
  },
  {
    id: 'yuhuayuan',
    name: '乾隆御花园',
    category: '古迹',
    coordinates: [118.95917, 32.15858],
    brief: '位于乾隆行宫范围内，为高宗花园旧址。',
    story: '园中山石、池水与花木延续了行宫园林的格局，是线路 B 上碧云亭之前的一站。',
    elevation: 150,
    peakLoad: 300,
    hourlyCurve: 'afternoon',
    image: '/images/poi/yuhuayuan.jpg',
  },
  {
    id: 'hongyegu',
    name: '红叶谷',
    category: '观景',
    coordinates: [118.95908, 32.1593],
    brief: '成片枫叶形成的山谷，中间点缀几棵银杏，空气清新，望江视线较好。',
    story: '从景区入口一直往北即可到达。红叶季这里色彩最浓，建议上午人少时前往。',
    elevation: 165,
    peakLoad: 800,
    hourlyCurve: 'afternoon',
    image: '/images/poi/hongyegu.jpg',
  },
  {
    id: 'maple-ridge',
    name: '枫岭',
    category: '观景',
    coordinates: [118.9618, 32.156],
    brief: '栖霞山西侧称枫岭，是红枫最集中的山脊步道，“春牛首、秋栖霞”的“秋”即在于此。',
    story: '栖霞山红叶以枫香、鸡爪槭、乌桕为主，通常 11 月中下旬进入最佳观赏期。当前处于转色期，向阳坡已大面积泛红。',
    elevation: 160,
    peakLoad: 900,
    hourlyCurve: 'afternoon',
    image: '/images/poi/maple-ridge.jpg',
  },
  {
    id: 'biyun',
    name: '碧云亭',
    category: '观景',
    coordinates: [118.95371, 32.15898],
    brief: '观光车行程的站点之一，线路 B 上位于御花园与红叶谷之间，视野开阔。',
    story: '这里适合拍摄日落与江景，10 月底日落约 17:20，最佳光线窗口在 16:30–17:15。平台面积有限，高峰时段请错峰停留。',
    elevation: 240,
    peakLoad: 260,
    hourlyCurve: 'sunset',
    image: '/images/poi/biyun.jpg',
  },
  {
    id: 'youlingyunyi',
    name: '有凌云意观景平台',
    category: '观景',
    coordinates: [118.95289, 32.15859],
    brief: '原为乾隆行宫中的建筑之一，行宫规模宏大、建筑鳞次栉比，现为观景平台。',
    story: '平台视野开阔，可远眺山林与长江。',
    elevation: 200,
    peakLoad: 240,
    hourlyCurve: 'sunset',
    image: '/images/poi/youlingyunyi.jpg',
  },
  {
    id: 'hushan',
    name: '虎山',
    category: '山水',
    coordinates: [118.95301, 32.15866],
    brief: '位于栖霞山西北，山形状如伏虎。',
    story: '与东北的龙山遥相呼应，林木茂密，适合想避开主线人流的游客。',
    elevation: 180,
    peakLoad: 150,
    hourlyCurve: 'afternoon',
    image: '/images/poi/hushan.jpg',
  },
  {
    id: 'longshan',
    name: '龙山',
    category: '山水',
    coordinates: [118.95935, 32.15191],
    brief: '位于栖霞山东北，山形若卧龙；山巅有陆羽茶庄，可小憩品茶、尝农家菜。',
    story: '陆羽茶庄取“与陆羽对饮”之意，是登山途中补给与休息的地方。',
    elevation: 120,
    peakLoad: 300,
    hourlyCurve: 'midday',
    image: '/images/poi/longshan.jpg',
  },
  {
    id: 'summit',
    name: '凤翔峰',
    category: '观景',
    coordinates: [118.96492, 32.16034],
    brief: '栖霞山主峰三茅峰，又名凤翔峰，海拔 286 米，峰顶可远眺长江与南京城东。',
    story: '主峰旧有三茅宫，是登高望江的经典位置。山顶风大，秋冬季节请准备外套。',
    elevation: 286,
    peakLoad: 450,
    hourlyCurve: 'sunset',
    image: '/images/poi/summit.jpg',
  },
  {
    id: 'shihuanglinjiang',
    name: '始皇临江处',
    category: '观景',
    coordinates: [118.96328, 32.1617],
    brief: '线路 B 中的景点，观光车从碧云亭到此，之后可乘车下山。',
    story: '这里是山北面向长江的开阔处，适合远眺江景。',
    elevation: 200,
    peakLoad: 300,
    hourlyCurve: 'sunset',
    image: '/images/poi/kb-shihuanglinjiang.jpg',
    imageCredit: `fish4fish · CC BY-SA 3.0 · ${COMMONS}`,
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
    highlights: ['叠浪崖红枫岩壁机位', '凤翔峰望江打卡', '同伴叶章合成纪念卡'],
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
