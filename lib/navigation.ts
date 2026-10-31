import type { LngLat } from "./qixia-data";
import { haversine, type FlatNavStep } from "./amap";

/** 偏航判定阈值（米）。山区 GPS 精度差，给足余量，避免频繁重算 */
export const DEFAULT_OFF_ROUTE_THRESHOLD = 60;

export interface RouteIndex {
  points: LngLat[];
  cumulative: number[];
  total: number;
  /** 每条指令在整条路线上的距离区间 */
  ranges: Array<{ start: number; end: number; flatIndex: number }>;
}

/** 把展平的指令序列预处理成可快速查询的索引 */
export function buildRouteIndex(steps: FlatNavStep[]): RouteIndex {
  const points: LngLat[] = [];
  const cumulative: number[] = [];
  const ranges: Array<{ start: number; end: number; flatIndex: number }> = [];
  let total = 0;

  steps.forEach((step, flatIndex) => {
    const start = total;
    step.coordinates.forEach((point) => {
      const last = points[points.length - 1];
      if (last && last[0] === point[0] && last[1] === point[1]) return;
      if (last) total += haversine(last, point);
      points.push(point);
      cumulative.push(total);
    });
    ranges.push({ start, end: total, flatIndex });
  });

  return { points, cumulative, total, ranges };
}

/** 方位角：从 a 指向 b 的角度（0=正北，顺时针） */
export function bearingBetween(a: LngLat, b: LngLat): number {
  const toRad = (d: number) => (d * Math.PI) / 180;
  const toDeg = (r: number) => (r * 180) / Math.PI;
  const lat1 = toRad(a[1]);
  const lat2 = toRad(b[1]);
  const dLng = toRad(b[0] - a[0]);
  const y = Math.sin(dLng) * Math.cos(lat2);
  const x =
    Math.cos(lat1) * Math.sin(lat2) -
    Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLng);
  return (toDeg(Math.atan2(y, x)) + 360) % 360;
}

export interface NavProgress {
  /** 已走距离（米） */
  traveled: number;
  /** 剩余距离（米） */
  remaining: number;
  /** 当前所处指令 */
  current: FlatNavStep | null;
  /** 下一条指令（即将到来的转向） */
  next: FlatNavStep | null;
  /** 距离当前指令结束（下一次转向）还有多远 */
  distanceToTurn: number;
  /** 偏离路线的直线距离（米） */
  offRouteDistance: number;
  /** 是否已偏航 */
  isOffRoute: boolean;
  /** 距离用户最近的路线点索引，用于地图高亮 */
  closestIndex: number;
  /** 当前应保持的朝向（度） */
  bearing: number;
  /** 是否已到达终点（剩余不足 20 米） */
  arrived: boolean;
}

/**
 * 根据用户实时位置计算导航进度。
 * 用「最近路线点」近似投影，景区内几百个点的规模下精度足够且开销可忽略。
 */
export function computeProgress(
  index: RouteIndex,
  steps: FlatNavStep[],
  position: LngLat,
  offRouteThreshold = DEFAULT_OFF_ROUTE_THRESHOLD,
): NavProgress {
  const { points, cumulative, total, ranges } = index;

  if (points.length === 0) {
    return {
      traveled: 0,
      remaining: 0,
      current: null,
      next: null,
      distanceToTurn: 0,
      offRouteDistance: 0,
      isOffRoute: false,
      closestIndex: 0,
      bearing: 0,
      arrived: true,
    };
  }

  let closestIndex = 0;
  let closestDistance = Number.POSITIVE_INFINITY;
  for (let i = 0; i < points.length; i++) {
    const d = haversine(points[i], position);
    if (d < closestDistance) {
      closestDistance = d;
      closestIndex = i;
    }
  }

  const traveled = cumulative[closestIndex] ?? 0;
  const remaining = Math.max(0, total - traveled);

  // 当前指令：已走距离落在哪个区间
  let rangeIndex = ranges.findIndex(
    (range) => traveled >= range.start && traveled < range.end,
  );
  if (rangeIndex < 0) rangeIndex = ranges.length - 1;

  const currentStep = steps[ranges[rangeIndex]?.flatIndex ?? 0] ?? null;
  const nextStep = steps[(ranges[rangeIndex]?.flatIndex ?? 0) + 1] ?? null;
  const distanceToTurn = Math.max(
    0,
    (ranges[rangeIndex]?.end ?? total) - traveled,
  );

  // 朝向：用当前位置之后一小段路线点的方向，模拟真正的行进方向
  const lookAheadIndex = Math.min(points.length - 1, closestIndex + 3);
  const bearing =
    lookAheadIndex > closestIndex
      ? bearingBetween(points[closestIndex], points[lookAheadIndex])
      : 0;

  return {
    traveled,
    remaining,
    current: currentStep,
    next: nextStep,
    distanceToTurn,
    offRouteDistance: closestDistance,
    isOffRoute: closestDistance > offRouteThreshold,
    closestIndex,
    bearing,
    arrived: remaining < 20,
  };
}

/** 把米数转成人话距离，用于导航面板 */
export function formatDistance(meters: number): string {
  if (meters < 1000) return `${Math.round(meters)} 米`;
  return `${(meters / 1000).toFixed(1)} 公里`;
}

/** 估算剩余步行时间（按 1.2 m/s） */
export function formatRemainingTime(meters: number): string {
  const minutes = Math.round(meters / 1.2 / 60);
  if (minutes < 1) return "不到 1 分钟";
  if (minutes < 60) return `约 ${minutes} 分钟`;
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return rest ? `${hours} 小时 ${rest} 分` : `${hours} 小时`;
}
