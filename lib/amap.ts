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

export async function planWalkingSegment(
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
      const res = await fetch(url, { cache: "no-store" });
      const data = await res.json();
      if (data.status === "1" && data.route?.paths?.length) payload = data;
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

/** 逐段规划：相邻两个 POI 之间分别判定 real / approx */
export async function planWalkingRoute(
  stops: LngLat[],
): Promise<RouteSegment[]> {
  const segments: RouteSegment[] = [];
  for (let i = 0; i < stops.length - 1; i++) {
    segments.push(await planWalkingSegment(stops[i], stops[i + 1]));
  }
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
