import type { LngLat } from "./qixia-data";

/** 单条真实路网转向指令，供 turn-by-turn 导航播报与匹配 */
export interface NavStep {
  instruction: string;
  distance: number;
  coordinates: LngLat[];
}

export interface RouteSegment {
  /** approx 仅保留旧数据类型兼容；在线规划与导航均不接受示意路径。 */
  mode: "real" | "approx";
  coordinates: LngLat[];
  distance: number;
  duration: number;
  detourRatio: number;
  steps: NavStep[];
}

export type RoutingErrorCode =
  | "ROUTING_NOT_CONFIGURED"
  | "ROUTING_PROVIDER_CONFIG"
  | "ROUTING_NO_ROUTE"
  | "ROUTING_UNAVAILABLE"
  | "ROUTING_INVALID_RESPONSE";

/** 只携带可公开的信息：不透传含密钥的请求 URL 或供应商原始异常。 */
export class RoutingError extends Error {
  constructor(
    public readonly code: RoutingErrorCode,
    message: string,
    public readonly status: number,
    public readonly retryable = false,
    public readonly providerCode?: string,
  ) {
    super(message);
    this.name = "RoutingError";
  }
}

/** 两点球面距离（米） */
export function haversine(a: LngLat, b: LngLat): number {
  const R = 6371000;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(b[1] - a[1]);
  const dLng = toRad(b[0] - a[0]);
  const lat1 = toRad(a[1]);
  const lat2 = toRad(b[1]);
  const h = Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(h)));
}

function isCoordinate(point: unknown): point is LngLat {
  return Array.isArray(point) && point.length === 2 &&
    point.every((value) => typeof value === "number" && Number.isFinite(value)) &&
    Math.abs(point[0]) <= 180 && Math.abs(point[1]) <= 90;
}

function hasGeometry(points: unknown): points is LngLat[] {
  return Array.isArray(points) && points.length >= 2 && points.every(isCoordinate) &&
    points.some((point) => point[0] !== points[0][0] || point[1] !== points[0][1]);
}

/** 客户端也校验：旧服务/缓存返回的 approx 或空几何绝不能启动导航。 */
export function isNavigableRoute(segments: unknown): segments is RouteSegment[] {
  return Array.isArray(segments) && segments.length > 0 && segments.every((segment) =>
    segment && segment.mode === "real" && hasGeometry(segment.coordinates) &&
    Number.isFinite(segment.distance) && segment.distance > 0 &&
    Number.isFinite(segment.duration) && segment.duration > 0 &&
    Array.isArray(segment.steps) && segment.steps.length > 0 &&
    segment.steps.every((step: NavStep) => step && typeof step.instruction === "string" &&
      Number.isFinite(step.distance) && step.distance >= 0 && hasGeometry(step.coordinates)),
  );
}

/** 不跳过坏坐标，以免把不连续的几何拼成虚假直线。 */
function parsePolylineString(polyline?: string): LngLat[] {
  if (typeof polyline !== "string" || !polyline) return [];
  const coordinates: LngLat[] = [];
  for (const pair of polyline.split(";")) {
    const parts = pair.split(",");
    if (parts.length !== 2 || parts.some((value) => !value.trim())) return [];
    const point = parts.map(Number);
    if (!isCoordinate(point)) return [];
    coordinates.push(point);
  }
  return coordinates;
}

const QPS_RETRY_DELAY = 350;
const SEGMENT_CACHE_TTL = 10 * 60 * 1000;
const SEGMENT_CACHE_MAX = 50;
const segmentCache = new Map<string, { at: number; segment: RouteSegment }>();

export async function planWalkingSegment(origin: LngLat, destination: LngLat): Promise<RouteSegment> {
  // 两个环境变量均仅在服务端使用，绝不使用 NEXT_PUBLIC_ 前缀。
  const key = process.env.AMAP_WEB_SERVICE_KEY?.trim() || process.env.AMAP_KEY?.trim();
  if (!key) {
    throw new RoutingError("ROUTING_NOT_CONFIGURED",
      "在线步行路线尚未配置，请管理员在服务端配置高德 Web 服务密钥 AMAP_WEB_SERVICE_KEY（兼容 AMAP_KEY）后重新部署。", 503);
  }
  const round = (value: number) => value.toFixed(5);
  const cacheKey = `${origin.map(round).join(",")}|${destination.map(round).join(",")}`;
  const cached = segmentCache.get(cacheKey);
  if (cached && Date.now() - cached.at < SEGMENT_CACHE_TTL) return cached.segment;
  if (cached) segmentCache.delete(cacheKey);

  const segment = await requestWalkingSegment(origin, destination, key);
  if (segmentCache.size >= SEGMENT_CACHE_MAX) {
    const oldest = segmentCache.keys().next().value;
    if (oldest !== undefined) segmentCache.delete(oldest);
  }
  segmentCache.set(cacheKey, { at: Date.now(), segment });
  return segment;
}

interface WalkingPayload {
  status?: string;
  infocode?: string;
  route?: { paths?: Array<{
    distance?: string;
    duration?: string;
    steps?: Array<{ instruction?: string; distance?: string; polyline?: string }>;
  }> };
}

function invalidResponse(): RoutingError {
  return new RoutingError("ROUTING_INVALID_RESPONSE",
    "路线服务未返回完整的真实步行路径，无法开始导航。请稍后重试或更换起终点；不会使用直线示意路线。", 502);
}

function providerError(code?: string): RoutingError {
  // 高德平台类型不匹配、无效 key、权限/白名单/签名等配置错误不应盲目重试。
  if (code && ["10001", "10002", "10005", "10006", "10007", "10008", "10009", "10012", "10013"].includes(code)) {
    return new RoutingError("ROUTING_PROVIDER_CONFIG",
      code === "10009"
        ? "步行路线服务密钥的平台类型不匹配。请管理员配置高德「Web 服务」类型密钥 AMAP_WEB_SERVICE_KEY 后重新部署（不能使用浏览器 JS API 密钥）。"
        : "步行路线服务的密钥或权限配置无效。请管理员检查高德 Web 服务密钥、服务权限及服务器白名单后重新部署。",
      503, false, code);
  }
  const safeCode = code && /^\d{5}$/.test(code) ? code : undefined;
  return new RoutingError("ROUTING_UNAVAILABLE",
    code === "10003" || code === "10044"
      ? "步行路线服务配额已用尽，请管理员检查高德服务配额，恢复后重试。"
      : "步行路线服务暂时不可用，请稍后重试；不会使用直线示意路线。",
    503, !["10003", "10044"].includes(code ?? ""), safeCode);
}

async function requestWalkingSegment(origin: LngLat, destination: LngLat, key: string): Promise<RouteSegment> {
  const url = new URL("https://restapi.amap.com/v3/direction/walking");
  url.searchParams.set("origin", origin.join(","));
  url.searchParams.set("destination", destination.join(","));
  url.searchParams.set("key", key);

  let payload: WalkingPayload | undefined;
  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      const res = await fetch(url, { cache: "no-store", signal: AbortSignal.timeout(4000) });
      if (!res.ok) {
        throw new RoutingError("ROUTING_UNAVAILABLE", "步行路线服务暂时不可用，请稍后重试。", 503,
          res.status === 429 || res.status >= 500);
      }
      const data = await res.json() as WalkingPayload | null;
      if (!data || typeof data !== "object") throw invalidResponse();
      if (data.status !== "1") throw providerError(data.infocode);
      if (!Array.isArray(data.route?.paths)) throw invalidResponse();
      if (!data.route.paths.length) {
        throw new RoutingError("ROUTING_NO_ROUTE", "未找到起终点之间可用的真实步行路线，请更换起点或目的地；不会使用直线示意路线。", 422);
      }
      payload = data;
      break;
    } catch (error) {
      const failure = error instanceof RoutingError ? error :
        new RoutingError("ROUTING_UNAVAILABLE", "步行路线服务连接失败或超时，请稍后重试。", 503, true);
      if (!failure.retryable || attempt === 2) throw failure;
      await new Promise((resolve) => setTimeout(resolve, QPS_RETRY_DELAY * (attempt + 1)));
    }
  }
  const path = payload?.route?.paths?.[0];
  if (!path || !Array.isArray(path.steps) || !path.steps.length) throw invalidResponse();
  const steps: NavStep[] = path.steps.map((step) => ({
    instruction: String(step.instruction ?? "").trim(),
    distance: Number(step.distance),
    coordinates: parsePolylineString(step.polyline),
  }));
  const distance = Number(path.distance);
  const straight = haversine(origin, destination);
  const segment: RouteSegment = {
    mode: "real",
    coordinates: steps.flatMap((step) => step.coordinates),
    distance,
    duration: Number(path.duration),
    detourRatio: straight > 0 ? distance / straight : 1,
    steps,
  };
  if (!isNavigableRoute([segment])) throw invalidResponse();
  return segment;
}

/** 真实路网逐段规划；任意一段失败则整条失败，不拼接虚构路径。 */
export async function planWalkingRoute(stops: LngLat[]): Promise<RouteSegment[]> {
  const segments: RouteSegment[] = new Array(Math.max(stops.length - 1, 0));
  let cursor = 0;
  let failed = false;
  const workers = Array.from({ length: Math.min(2, segments.length) }, async () => {
    while (!failed && cursor < segments.length) {
      const index = cursor++;
      try {
        segments[index] = await planWalkingSegment(stops[index], stops[index + 1]);
      } catch (error) {
        failed = true;
        throw error;
      }
    }
  });
  await Promise.all(workers);
  return segments;
}

export interface FlatNavStep extends NavStep {
  segmentIndex: number;
  stepIndex: number;
  mode: "real" | "approx";
  detourRatio: number;
  straightDistance: number;
}

export function flattenSteps(segments: RouteSegment[]): FlatNavStep[] {
  const flat: FlatNavStep[] = [];
  segments.forEach((segment, segmentIndex) => {
    const straightDistance = segment.detourRatio > 0
      ? segment.distance / segment.detourRatio : segment.distance;
    segment.steps.forEach((step, stepIndex) => {
      flat.push({ ...step, segmentIndex, stepIndex, mode: segment.mode,
        detourRatio: segment.detourRatio, straightDistance: Math.round(straightDistance) });
    });
  });
  return flat;
}
