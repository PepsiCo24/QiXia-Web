import type { LngLat } from "./qixia-data";

/**
 * 绕行比阈值：高德算出的路径长度 ÷ 直线距离。
 * 超过该值说明高德没覆盖景区内部步道，只能绕外围道路，此时用示意直线更贴近真实游览路径。
 */
const DETOUR_THRESHOLD = 2.0;

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

  try {
    const res = await fetch(url, { cache: "no-store" });
    const data = await res.json();
    if (data.status !== "1" || !data.route?.paths?.length)
      return approxSegment(origin, destination);

    const path = data.route.paths[0];
    const rawSteps: Array<{
      instruction?: string;
      distance?: string;
      polyline?: string;
    }> = path.steps ?? [];

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

    if (!routed || detourRatio > DETOUR_THRESHOLD) {
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
  } catch {
    return approxSegment(origin, destination);
  }
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
}

export function flattenSteps(segments: RouteSegment[]): FlatNavStep[] {
  const flat: FlatNavStep[] = [];
  segments.forEach((segment, segmentIndex) => {
    segment.steps.forEach((step, stepIndex) => {
      flat.push({ ...step, segmentIndex, stepIndex, mode: segment.mode });
    });
  });
  return flat;
}
