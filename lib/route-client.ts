import type { LngLat } from "./qixia-data";
import type { NavStep, RouteSegment } from "./amap";
import { haversine } from "./amap";

/** 浏览器端直连高德算路：静态站点（GitHub Pages 等）没有服务端
 * /api/route/walking 代理，导航与路线在这里直接请求高德 REST。
 * 高德 REST 返回 Access-Control-Allow-Origin: *，浏览器可直接 fetch。
 * 坐标约定与服务端一致：调用方传入的已是高德坐标系（GCJ-02），
 * 返回的 polyline 也保持原样，不做二次转换。 */

const WALK_SPEED = 1.2;
const QPS_RETRY_DELAY = 350;
const ROUTE_CONCURRENCY = 2;

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

async function requestWalkingSegment(
  origin: LngLat,
  destination: LngLat,
): Promise<RouteSegment> {
  const key = process.env.NEXT_PUBLIC_AMAP_KEY;
  if (!key) return approxSegment(origin, destination);

  const url = new URL("https://restapi.amap.com/v3/direction/walking");
  url.searchParams.set("origin", `${origin[0]},${origin[1]}`);
  url.searchParams.set("destination", `${destination[0]},${destination[1]}`);
  url.searchParams.set("key", key);

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

  for (let attempt = 0; attempt < 3 && !payload; attempt += 1) {
    try {
      const res = await fetch(url.toString(), {
        cache: "no-store",
        signal: AbortSignal.timeout(4000),
      });
      const data = await res.json();
      if (data.status === "1" && data.route?.paths?.length) {
        payload = data;
      } else if (attempt < 2) {
        await new Promise((resolve) =>
          setTimeout(resolve, QPS_RETRY_DELAY * (attempt + 1)),
        );
      }
    } catch {
      // 网络异常：进入下一轮重试
    }
  }

  if (!payload) return approxSegment(origin, destination);

  const path = payload.route!.paths![0];
  const routed = Number(path.distance) || 0;
  if (!routed) return approxSegment(origin, destination);

  const steps: NavStep[] = (path.steps ?? [])
    .map((step) => ({
      instruction: String(step.instruction ?? "").trim(),
      distance: Number(step.distance) || 0,
      coordinates: parsePolylineString(step.polyline),
    }))
    .filter((step) => step.coordinates.length >= 2);

  // polyline 保持高德原样返回（GCJ-02 世界，与 POI/标记同一坐标系）
  const coordinates = steps.flatMap((step) => step.coordinates);
  if (coordinates.length < 2) return approxSegment(origin, destination);

  const straight = haversine(origin, destination);
  const detourRatio = straight > 0 ? routed / straight : 1;

  return {
    mode: "real",
    coordinates,
    distance: Math.round(routed),
    duration: Number(path.duration) || Math.round(routed / WALK_SPEED),
    detourRatio,
    steps,
  };
}

/** 逐段规划（并发 2 + 对示意段二次补算，与服务端策略一致） */
export async function planWalkingRouteClient(
  stops: LngLat[],
): Promise<RouteSegment[]> {
  const segmentCount = Math.max(stops.length - 1, 0);
  const plan = async (targets: number[]): Promise<RouteSegment[]> => {
    const segments: RouteSegment[] = new Array(targets.length);
    let cursor = 0;
    const workerCount = Math.min(ROUTE_CONCURRENCY, targets.length) || 1;
    await Promise.all(
      Array.from({ length: workerCount }, async () => {
        while (cursor < targets.length) {
          const slot = cursor;
          cursor += 1;
          const index = targets[slot];
          segments[slot] = await requestWalkingSegment(
            stops[index],
            stops[index + 1],
          );
        }
      }),
    );
    return segments;
  };

  const all = Array.from({ length: segmentCount }, (_, i) => i);
  const segments = await plan(all);
  const pending = segments
    .map((segment, index) => (segment.mode === "approx" ? index : -1))
    .filter((index) => index >= 0);
  if (pending.length) {
    await new Promise((resolve) => setTimeout(resolve, 600));
    const retried = await plan(pending);
    pending.forEach((index, i) => {
      if (retried[i].mode === "real") segments[index] = retried[i];
    });
  }
  return segments;
}
