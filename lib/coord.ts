/**
 * WGS84 ↔ GCJ-02 坐标转换（标准算法，无第三方依赖）。
 *
 * 现状与决策（PRD §8.5，2026-10-31）：
 * - 应用内部 / MapLibre / Esri / 知识库声明均为 WGS84；高德服务与高德 URI 使用 GCJ-02。
 * - PRD 要求 M0 现场基准核对后再决定是否全量转换。当前 mapping 中 verified 坐标来自
 *   “知识库 geo + 第二独立来源一致”的核验（见 reports/kb-coord-crosscheck.md），
 *   在核验结论明确前，不做地图内部坐标的全量转换。
 * - 本模块只在【外部高德 URI】这一服务边界使用：高德按照 GCJ-02 解释传入坐标，
 *   因此把 WGS84 转成 GCJ-02 后再拼 URI，避免外部导航落点偏移。
 *
 * 单元测试：node --experimental-strip-types scripts/test-coord.ts（见 scripts/）
 */
export type LngLat = [number, number];

const PI = Math.PI;
const AXIS = 6378245.0;
const EE = 0.00669342162296594323;

function outOfChina(lng: number, lat: number): boolean {
  return lng < 72.004 || lng > 137.8347 || lat < 0.8293 || lat > 55.8271;
}

function transformLat(x: number, y: number): number {
  let ret =
    -100.0 + 2.0 * x + 3.0 * y + 0.2 * y * y + 0.1 * x * y + 0.2 * Math.sqrt(Math.abs(x));
  ret +=
    ((20.0 * Math.sin(6.0 * x * PI) + 20.0 * Math.sin(2.0 * x * PI)) * 2.0) / 3.0;
  ret +=
    ((20.0 * Math.sin(y * PI) + 40.0 * Math.sin((y / 3.0) * PI)) * 2.0) / 3.0;
  ret +=
    ((160.0 * Math.sin((y / 12.0) * PI) + 320 * Math.sin((y * PI) / 30.0)) * 2.0) / 3.0;
  return ret;
}

function transformLng(x: number, y: number): number {
  let ret =
    300.0 + x + 2.0 * y + 0.1 * x * x + 0.1 * x * y + 0.1 * Math.sqrt(Math.abs(x));
  ret +=
    ((20.0 * Math.sin(6.0 * x * PI) + 20.0 * Math.sin(2.0 * x * PI)) * 2.0) / 3.0;
  ret +=
    ((20.0 * Math.sin(x * PI) + 40.0 * Math.sin((x / 3.0) * PI)) * 2.0) / 3.0;
  ret +=
    ((150.0 * Math.sin((x / 12.0) * PI) + 300.0 * Math.sin((x / 30.0) * PI)) * 2.0) / 3.0;
  return ret;
}

/** WGS84（GPS 原始坐标）→ GCJ-02（高德/国测局坐标） */
export function wgs84ToGcj02([lng, lat]: LngLat): LngLat {
  if (outOfChina(lng, lat)) return [lng, lat];
  let dLat = transformLat(lng - 105.0, lat - 35.0);
  let dLng = transformLng(lng - 105.0, lat - 35.0);
  const radLat = (lat / 180.0) * PI;
  let magic = Math.sin(radLat);
  magic = 1 - EE * magic * magic;
  const sqrtMagic = Math.sqrt(magic);
  dLat = (dLat * 180.0) / (((AXIS * (1 - EE)) / (magic * sqrtMagic)) * PI);
  dLng = (dLng * 180.0) / ((AXIS / sqrtMagic) * Math.cos(radLat) * PI);
  return [lng + dLng, lat + dLat];
}

/** GCJ-02 → WGS84（迭代反解，往返误差 < 1e-6 度；用于将来接收高德返回折线时转回） */
export function gcj02ToWgs84([lng, lat]: LngLat): LngLat {
  if (outOfChina(lng, lat)) return [lng, lat];
  let wgsLng = lng;
  let wgsLat = lat;
  for (let i = 0; i < 5; i += 1) {
    const [gcjLng, gcjLat] = wgs84ToGcj02([wgsLng, wgsLat]);
    wgsLng -= gcjLng - lng;
    wgsLat -= gcjLat - lat;
  }
  return [wgsLng, wgsLat];
}
