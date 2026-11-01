import type { LngLat } from "./qixia-data";

/** 步行速度（米/秒），用于估算示意段的时长 */
const WALK_SPEED = 1.2;

/** 单条转向指令，供 turn-by-turn 导航播报与匹配 */
export interface NavStep {
  /** 高德给出的中文指令，如「向西南步行129米右转」 */
  instruction: string;
  distance: number;
  coordinates: LngLat[];
}

export interface RouteSegment {
  /** real = 高德真实路网；approx = 景区内部示意路径 */
  mode: "real" | "approx";
  coordinates: LngLat[];
  distance: number;
  duration: number;
  detourRatio: number;
  /** 逐条转向指令；approx 段只有一条 */
  steps: NavStep[];
}

/** 两点球面距离（米） */
export function haversine(a: LngLat, b: LngLat): number {
  const R = 6371000;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(b[1] - a[1]);
  const dLng = toRad(b[0] - a[0]);
  const lat1 = toRad(a[1]);
  const lat2 = toRad(b[1]);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

function approxSegment(origin: LngLat, destination: LngLat): RouteSegment {
  const distance = haversine(origin, destination);
  return {
    mode: "approx",
    coordinates: [origin, destination],
    distance: Math.round(distance),
    duration: Math.round(distance / WALK_SPEED),
    detourRatio: 1,
    steps: [
      {
        instruction: "沿景区内步道前往目的地",
        distance: Math.round(distance),
        coordinates: [origin, destination],
      },
    ],
  };
}

/** 解析高德 polyline 字符串（格式 "lng,lat;lng,lat"） */
function parsePolylineString(polyline?: string): LngLat[] {
  if (!polyline) return [];
  const coordinates: LngLat[] = [];
  for (const pair of polyline.split(";")) {
    const [lng, lat] = pair.split(",").map(Number);
    if (Number.isFinite(lng) && Number.isFinite(lat))
      coordinates.push([lng, lat]);
  }
  return coordinates;
}

/** 触发高德 QPS 限流后的等待时间（毫秒），免费 key 限 3 次/秒 */
const QPS_RETRY_DELAY = 350;

/** 路线段缓存：相同起终点 10 分钟内直接复用，避免重复消耗高德配额 */
const SEGMENT_CACHE_TTL = 10 * 60 * 1000;
const SEGMENT_CACHE_MAX = 50;
const segmentCache = new Map<string, { at: number; segment: RouteSegment }>();

function segmentCacheKey(a: LngLat, b: LngLat): string {
  const round = (v: number) => v.toFixed(5);
  return `${round(a[0])},${round(a[1])}|${round(b[0])},${round(b[1])}`;
}

function readSegmentCache(key: string): RouteSegment | null {
  const hit = segmentCache.get(key);
  if (!hit) return null;
  if (Date.now() - hit.at > SEGMENT_CACHE_TTL) {
    segmentCache.delete(key);
    return null;
  }
  return hit.segment;
}

function writeSegmentCache(key: string, segment: RouteSegment): void {
  if (segmentCache.size >= SEGMENT_CACHE_MAX) {
    const oldest = segmentCache.keys().next().value;
    if (oldest !== undefined) segmentCache.delete(oldest);
  }
  segmentCache.set(key, { at: Date.now(), segment });
}

export async function planWalkingSegment(
  origin: LngLat,
  destination: LngLat,
): Promise<RouteSegment> {
  const cacheKey = segmentCacheKey(origin, destination);
  const cached = readSegmentCache(cacheKey);
  if (cached) return cached;

  const segment = await requestWalkingSegment(origin, destination);
  // 只缓存真实路网结果：approx 多为限流/超时的临时退化，下次应重试而不是吃缓存
  if (segment.mode === "real") writeSegmentCache(cacheKey, segment);
  return segment;
}

async function requestWalkingSegment(
  origin: LngLat,
  destination: LngLat,
): Promise<RouteSegment> {
  const key = process.env.AMAP_KEY;
  if (!key) return approxSegment(origin, destination);

  const url = new URL("https://restapi.amap.com/v3/direction/walking");
  url.searchParams.set("origin", `${origin[0]},${origin[1]}`);
  url.searchParams.set("destination", `${destination[0]},${destination[1]}`);
  url.searchParams.set("key", key);

  // 高德偶发超时/限流：重试一次再兜底，减少不必要的示意段
  const isQpsLimited = (data: { info?: string; infocode?: string }) =>
    (data.info ?? "").includes("CUQPS_HAS_EXCEEDED_THE_LIMIT") ||
    data.infocode === "10021";

  let payload: {
    status?: string;
    route?: {
      paths?: Array<{
        distance?: string;
        duration?: string;
        steps?: Array<{
          instruction?: string;
          distance?: string;
          polyline?: string;
        }>;
      }>;
    };
  } | null = null;

  for (let attempt = 0; attempt < 2 && !payload; attempt += 1) {
    try {
      const res = await fetch(url, {
        cache: "no-store",
        signal: AbortSignal.timeout(4000),
      });
      const data = await res.json();
      if (data.status === "1" && data.route?.paths?.length) {
        payload = data;
      } else if (isQpsLimited(data) && attempt === 0) {
        // 高德 QPS 限流：稍等片刻重试，而不是直接退化成示意段
        await new Promise((resolve) => setTimeout(resolve, QPS_RETRY_DELAY));
      }
    } catch {
      // 网络异常：进入下一轮重试
    }
  }

  if (!payload) return approxSegment(origin, destination);

  const path = payload.route!.paths![0];
  const rawSteps = path.steps ?? [];

  const steps: NavStep[] = rawSteps
    .map((step) => ({
      instruction: String(step.instruction ?? "").trim(),
      distance: Number(step.distance) || 0,
      coordinates: parsePolylineString(step.polyline),
    }))
    .filter((step) => step.coordinates.length >= 2);

  const coordinates = steps.flatMap((step) => step.coordinates);
  if (coordinates.length < 2) return approxSegment(origin, destination);

  const straight = haversine(origin, destination);
  const routed = Number(path.distance) || 0;
  const detourRatio = straight > 0 && routed > 0 ? routed / straight : 1;

  // 只要高德给了有效路径就用它：绕远也好过两点直线穿山体。
  // 仅当高德确实没给出距离（无法成路）时才退回示意段。
  if (!routed) {
    return approxSegment(origin, destination);
  }

  return {
    mode: "real",
    coordinates,
    distance: Math.round(routed),
    duration: Number(path.duration) || Math.round(routed / WALK_SPEED),
    detourRatio,
    steps,
  };
}

/** 同时打高德的段数上限：免费 key 限 3 QPS，留出余量给其他请求 */
const ROUTE_CONCURRENCY = 2;

/** 逐段规划：相邻两个 POI 之间分别判定 real / approx。
 *  用并发 2 的工作池代替串行 await——串行在 4s 超时 × 2 次重试下，
 *  5 停靠点最坏要 32 秒，线上 serverless 函数会先被平台超时掐死。 */
export async function planWalkingRoute(
  stops: LngLat[],
): Promise<RouteSegment[]> {
  const segmentCount = Math.max(stops.length - 1, 0);
  const segments: RouteSegment[] = new Array(segmentCount);

  let cursor = 0;
  const workerCount = Math.min(ROUTE_CONCURRENCY, segmentCount) || 1;
  const workers = Array.from({ length: workerCount }, async () => {
    while (cursor < segmentCount) {
      const index = cursor;
      cursor += 1;
      segments[index] = await planWalkingSegment(
        stops[index],
        stops[index + 1],
      );
    }
  });
  await Promise.all(workers);
  return segments;
}

/** 把整条路线的 steps 展平成一维指令序列，并标注所属 segment */
export interface FlatNavStep extends NavStep {
  segmentIndex: number;
  stepIndex: number;
  mode: "real" | "approx";
  /** 所属段的绕行比（高德路径 ÷ 直线距离），用于提示「这段其实可走近道」 */
  detourRatio: number;
  /** 所属段的直线距离（米） */
  straightDistance: number;
}

export function flattenSteps(segments: RouteSegment[]): FlatNavStep[] {
  const flat: FlatNavStep[] = [];
  segments.forEach((segment, segmentIndex) => {
    const straightDistance =
      segment.detourRatio > 0
        ? segment.distance / segment.detourRatio
        : segment.distance;
    segment.steps.forEach((step, stepIndex) => {
      flat.push({
        ...step,
        segmentIndex,
        stepIndex,
        mode: segment.mode,
        detourRatio: segment.detourRatio,
        straightDistance: Math.round(straightDistance),
      });
    });
  });
  return flat;
}
