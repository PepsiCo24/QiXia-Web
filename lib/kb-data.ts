/**
 * 栖霞资料板块 · 数据层（PRD §6 / §8 / FR-2 ~ FR-6）
 *
 * 数据来源：
 * - 列表快照：构建期由 scripts/sync-kb.mjs 从知识库 /api/kb/cards 生成，静态 import 进 bundle，
 *   运行时不请求列表（PRD §8.8 / FR-6）。
 * - 详情：运行时 GET {KB_API_BASE}/api/kb/cards/{id}，模块级内存缓存 5 分钟 + 请求合并 + 3s 超时，
 *   失败降级为快照摘要（PRD FR-4 / FR-6）。
 * - 点位坐标优先级：verifiedGeo（双源核验）> 知识库 geo > 演示兜底坐标（PRD §8.1）。
 */
import { KB_CARDS_FILE, KB_POI_MAP_FILE, KB_SPOTS_FILE } from "./kb-snapshot";
import { wgs84ToGcj02 } from "./coord";

export type KbTabKey =
  | "attractions"
  | "ancillary"
  | "access"
  | "amenities"
  | "activities"
  | "packages";

export interface KbTabDef {
  key: KbTabKey;
  label: string;
}

/** 页签顺序按用户原话：景点 / 游客服务 / 交通停车 / 吃住 / 活动（门票套票经产品确认追加为第 6 类） */
export const KB_TABS: KbTabDef[] = [
  { key: "attractions", label: "景点" },
  { key: "ancillary", label: "游客服务" },
  { key: "access", label: "交通停车" },
  { key: "amenities", label: "吃住" },
  { key: "activities", label: "活动" },
  { key: "packages", label: "门票套票" },
];

export const KB_TAB_LABELS: Record<KbTabKey, string> = Object.fromEntries(
  KB_TABS.map((tab) => [tab.key, tab.label]),
) as Record<KbTabKey, string>;

export type KbCredibility = "A" | "B" | "C";
export type KbCardType = "place" | "event" | "org" | string;
export type KbCoordKind = "verified" | "kb-geo" | "demo-fallback" | "none";

export interface KbGeo {
  lat: number;
  lon: number;
  crs: "WGS84";
}

export interface KbCardLite {
  id: string;
  type: KbCardType;
  title: string;
  summary: string;
  aliases?: string[];
  sixA: string[];
  credibility: KbCredibility;
  status: string;
  updated?: string;
  facts: number;
  geo?: KbGeo;
}

/** 资料模式使用的点位：卡片 + 分类页签 + 坐标状态（PRD §8.2 KbSpot） */
export interface KbSpot extends KbCardLite {
  tabs: KbTabKey[];
  poiId?: string;
  /** [lng, lat] WGS84；未定位时为 undefined */
  coord?: [number, number];
  coordKind: KbCoordKind;
  verified: boolean;
  verifiedGeo?: [number, number];
  verifiedSource?: string;
  verifiedAt?: string;
  note?: string;
  /** 往期活动：start 早于当前日期且无 end（PRD §8.6） */
  past?: boolean;
}

export interface KbCardsFile {
  fetchedAt: string;
  source: string;
  cards: KbCardLite[];
}

export interface KbPoiMapping {
  kbId: string;
  poiId?: string;
  poiIds?: string[];
  coordKind: "kb-geo" | "demo-fallback" | "verified" | "none";
  fallbackGeo?: [number, number];
  verifiedGeo?: [number, number];
  verifiedSource?: string;
  verifiedAt?: string;
  note?: string;
}

export interface KbPoiMapFile {
  version: number;
  updated: string;
  exemptions?: { duplicateCoordinates?: string[] };
  mappings: KbPoiMapping[];
}

export interface KbSpotsFile {
  generatedAt: string;
  tabs: Record<KbTabKey, string[]>;
  spots: KbSpot[];
}

/** 详情接口字段均可能缺失（PRD §5.5 / 附录 C），前端必须可缺省 */
export interface KbFact {
  key?: string;
  value?: string;
  source?: string;
  credibility?: string;
}

export interface KbSourceLink {
  url?: string;
  title?: string;
  credibility?: string;
}

export interface KbTimelineItem {
  date?: string;
  what?: string;
  source?: string;
}

export interface KbCardDetail {
  id: string;
  type?: string;
  title: string;
  summary?: string;
  aliases?: string[];
  sixA?: string[];
  credibility?: string;
  status?: string;
  updated?: string;
  geo?: KbGeo;
  facts?: KbFact[] | number;
  sources?: KbSourceLink[];
  timeline?: KbTimelineItem[];
  sections?: Record<string, string>;
  address?: string;
  opening?: string;
  ticket?: string;
  access?: string;
  start?: string;
}

/* ------------------------------------------------------------------ */
/* 快照索引                                                            */
/* ------------------------------------------------------------------ */

const spotsById = new Map<string, KbSpot>(
  KB_SPOTS_FILE.spots.map((spot) => [spot.id, spot]),
);

const cardsById = new Map<string, KbCardLite>(
  KB_CARDS_FILE.cards.map((card) => [card.id, card]),
);

export const KB_SNAPSHOT_SOURCE = KB_CARDS_FILE.source;
export const KB_SNAPSHOT_FETCHED_AT = KB_CARDS_FILE.fetchedAt;

/** 知识库站点根地址（详情页 / 接口），可用环境变量覆盖自托管实例 */
export const KB_SITE_BASE = (
  process.env.NEXT_PUBLIC_KB_SITE_BASE || "https://qixia.winnielyu.com"
).replace(/\/$/, "");

/** 静态公开版（GitHub Pages）没有服务端 /api/route/walking（PRD §5.1 / FR-5） */
export function isStaticDeployment(): boolean {
  return process.env.NEXT_PUBLIC_GITHUB_PAGES === "true";
}

export function getKbSpot(id: string | null | undefined): KbSpot | null {
  if (!id) return null;
  return spotsById.get(id) ?? null;
}

export function getKbCard(id: string | null | undefined): KbCardLite | null {
  if (!id) return null;
  return cardsById.get(id) ?? null;
}

const UPDATED_FALLBACK = "0000-00-00";

function sortSpots(spots: KbSpot[]): KbSpot[] {
  // PRD FR-2 排序：有坐标优先 → facts 数量降序 → updated 降序；往期活动降权（§8.6）
  return [...spots].sort((a, b) => {
    const coordA = a.coord ? 1 : 0;
    const coordB = b.coord ? 1 : 0;
    if (coordA !== coordB) return coordB - coordA;
    const pastA = a.past ? 1 : 0;
    const pastB = b.past ? 1 : 0;
    if (pastA !== pastB) return pastA - pastB;
    if (a.facts !== b.facts) return b.facts - a.facts;
    const updated = (b.updated || UPDATED_FALLBACK).localeCompare(a.updated || UPDATED_FALLBACK);
    if (updated !== 0) return updated;
    return a.title.localeCompare(b.title, "zh-Hans-CN");
  });
}

/** 某页签下的条目（按 FR-2 排序） */
export function getSpotsForTab(tab: KbTabKey): KbSpot[] {
  const ids = KB_SPOTS_FILE.tabs[tab] ?? [];
  const spots: KbSpot[] = [];
  for (const id of ids) {
    const spot = spotsById.get(id);
    if (spot) spots.push(spot);
  }
  return sortSpots(spots);
}

export interface KbTabStats {
  total: number;
  locatable: number;
}

/** 页签计数："共 N 条 · M 条可定位" */
export function getTabStats(tab: KbTabKey): KbTabStats {
  const spots = getSpotsForTab(tab);
  return {
    total: spots.length,
    locatable: spots.reduce((count, spot) => count + (spot.coord ? 1 : 0), 0),
  };
}

/** 资料模式图上点位：只放"可定位"条目（PRD FR-3） */
export function getLocatableSpotsForTab(tab: KbTabKey): KbSpot[] {
  return getSpotsForTab(tab).filter((spot): spot is KbSpot & { coord: [number, number] } =>
    Array.isArray(spot.coord),
  );
}

export function getTabsForSpot(spot: KbSpot): KbTabKey[] {
  return spot.tabs;
}

/* ------------------------------------------------------------------ */
/* 展示辅助                                                            */
/* ------------------------------------------------------------------ */

export const KB_CREDIBILITY_LABEL: Record<KbCredibility, string> = {
  A: "A 级 · 官方/学术原文",
  B: "B 级 · 可靠媒体或两源一致",
  C: "C 级 · 单一来源或说法不一",
};

export function credibilityBadge(credibility: KbCredibility): string {
  return `${credibility} 级`;
}

/** 坐标状态标签（PRD FR-2 / §9.1） */
export function coordKindLabel(spot: KbSpot): string {
  if (!spot.coord) return "未定位";
  return spot.coordKind === "kb-geo" || spot.coordKind === "verified"
    ? "知识库坐标"
    : "示意坐标";
}

/** 未定位 / 示意坐标提示（PRD §9.1 文案） */
export function coordKindHint(spot: KbSpot): string {
  if (!spot.coord) return "暂无核验坐标，无法在图上定位";
  if (spot.coordKind === "kb-geo") return "知识库坐标，尚未核验";
  if (spot.coordKind === "demo-fallback") return "示意位置，待现场核验";
  return "坐标已双源核验";
}

export function formatUpdated(updated?: string): string {
  if (!updated) return "未提供更新时间";
  return `更新于 ${updated}`;
}

export function categoryLabel(spot: KbSpot): string {
  return spot.tabs.map((tab) => KB_TAB_LABELS[tab]).join(" / ");
}

/** 知识库详情页（PRD §5.5：/place.html?id=） */
export function kbPlaceUrl(id: string): string {
  return `${KB_SITE_BASE}/place.html?id=${encodeURIComponent(id)}`;
}

/** 只允许 http/https 外链（PRD §8.9 安全） */
export function safeExternalUrl(url: string | undefined | null): string | null {
  if (!url) return null;
  try {
    const parsed = new URL(url);
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") return null;
    if (parsed.username || parsed.password) return null;
    return parsed.toString();
  } catch {
    return null;
  }
}

/** 高德外部地图 URI：步行导航 + 名称 + GCJ-02（PRD FR-5 / §8.5） */
export function buildAmapNavigationUri(name: string, coord: [number, number]): string {
  const [lng, lat] = wgs84ToGcj02(coord);
  const url = new URL("https://uri.amap.com/navigation");
  url.searchParams.set("to", `${lng.toFixed(6)},${lat.toFixed(6)},${name}`);
  url.searchParams.set("mode", "walk");
  url.searchParams.set("callnative", "1");
  url.searchParams.set("src", "qixia-web");
  // 高德导航 URI 以 GCJ-02 解释 to 参数；保留 coordinate 参数便于人工核对来源
  url.searchParams.set("coordinate", "gaode");
  return url.toString();
}

/** 可复制的坐标文本（外部地图唤起失败时的兜底，PRD R10） */
export function coordText(coord: [number, number] | undefined): string {
  if (!coord) return "";
  return `${coord[0].toFixed(6)}, ${coord[1].toFixed(6)}`;
}

/* ------------------------------------------------------------------ */
/* 详情：运行时拉取 + 内存缓存 5 分钟 + 请求合并 + 3s 超时（FR-6）      */
/* ------------------------------------------------------------------ */

const DETAIL_TTL_MS = 5 * 60 * 1000;
const DETAIL_FAILURE_TTL_MS = 30 * 1000;
const DETAIL_TIMEOUT_MS = 3000;

interface DetailCacheEntry {
  expires: number;
  value: KbCardDetail | null;
}

const detailCache = new Map<string, DetailCacheEntry>();
const detailPending = new Map<string, Promise<KbCardDetail | null>>();

function isKbCardDetail(value: unknown): value is KbCardDetail {
  if (!value || typeof value !== "object") return false;
  const record = value as Record<string, unknown>;
  return typeof record.id === "string" && typeof record.title === "string";
}

async function loadKbCardDetail(id: string): Promise<KbCardDetail | null> {
  // AbortSignal.timeout 在 iOS 15 / Safari 15 缺失（PRD §10 要求兼容 iOS 15+），
  // 这里用 AbortController + setTimeout 实现同样的 3s 超时语义。
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), DETAIL_TIMEOUT_MS);
  try {
    const response = await fetch(`${KB_SITE_BASE}/api/kb/cards/${encodeURIComponent(id)}`, {
      signal: controller.signal,
      cache: "no-store",
      headers: { Accept: "application/json" },
    });
    if (!response.ok) return null;
    const data: unknown = await response.json();
    return isKbCardDetail(data) ? data : null;
  } catch {
    // 超时 / 断网 / CORS / 解析失败：降级为快照摘要（FR-6）
    return null;
  } finally {
    clearTimeout(timer);
  }
}

/**
 * 拉取知识库卡片详情。同一 id 并发请求会被合并；成功缓存 5 分钟，失败缓存 30 秒，
 * 满足 FR-4「同一卡片重复打开 10 次，详情网络请求仅 1 次」。
 */
export async function fetchKbCardDetail(id: string): Promise<KbCardDetail | null> {
  if (!id || typeof window === "undefined") return null;
  const now = Date.now();
  const cached = detailCache.get(id);
  if (cached && cached.expires > now) return cached.value;

  const pending = detailPending.get(id);
  if (pending) return pending;

  const work = loadKbCardDetail(id).then((value) => {
    detailCache.set(id, {
      expires: Date.now() + (value ? DETAIL_TTL_MS : DETAIL_FAILURE_TTL_MS),
      value,
    });
    return value;
  });
  detailPending.set(id, work);
  try {
    return await work;
  } finally {
    detailPending.delete(id);
  }
}

/** 仅供测试/调试：清空详情缓存 */
export function clearKbDetailCache(): void {
  detailCache.clear();
  detailPending.clear();
}

/* ------------------------------------------------------------------ */
/* 详情字段归一化（缺字段降级，PRD FR-4）                               */
/* ------------------------------------------------------------------ */

export interface KbFactView {
  key: string;
  value: string;
}

/** 取 3～5 条关键事实：优先带 key/value 的 facts，去重，最多 5 条 */
export function pickFacts(detail: KbCardDetail | null, limit = 5): KbFactView[] {
  if (!detail || !Array.isArray(detail.facts)) return [];
  const seen = new Set<string>();
  const facts: KbFactView[] = [];
  for (const fact of detail.facts) {
    if (!fact || typeof fact !== "object") continue;
    const key = typeof fact.key === "string" ? fact.key.trim() : "";
    const value = typeof fact.value === "string" ? fact.value.trim() : "";
    if (!value) continue;
    const dedupeKey = `${key}::${value}`;
    if (seen.has(dedupeKey)) continue;
    seen.add(dedupeKey);
    facts.push({ key, value });
    if (facts.length >= limit) break;
  }
  return facts;
}

/** 取可用的出处链接（只保留 http/https，去重，最多 4 条） */
export function pickSources(detail: KbCardDetail | null, limit = 4): KbSourceLink[] {
  if (!detail || !Array.isArray(detail.sources)) return [];
  const seen = new Set<string>();
  const sources: KbSourceLink[] = [];
  for (const source of detail.sources) {
    if (!source || typeof source !== "object") continue;
    const url = safeExternalUrl(source.url);
    if (!url || seen.has(url)) continue;
    seen.add(url);
    sources.push({ url, title: source.title, credibility: source.credibility });
    if (sources.length >= limit) break;
  }
  return sources;
}

/** 别名展示：去重且排除与标题相同的项，最多 4 个 */
export function pickAliases(card: { title: string; aliases?: string[] }): string[] {
  const aliases = card.aliases ?? [];
  return [...new Set(aliases)]
    .filter((alias) => alias.trim() && alias.trim() !== card.title)
    .slice(0, 4);
}
