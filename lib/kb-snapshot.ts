import type { KbCardsFile, KbPoiMapFile, KbSpotsFile } from "./kb-data";
import cardsJson from "@/data/kb-cards.json";
import spotsJson from "@/data/kb-spots.json";
import mapJson from "@/data/kb-poi-map.json";

/**
 * 构建期快照（静态打包进 bundle，运行时不 fetch 列表）。
 * 数据由 scripts/sync-kb.mjs 生成，见 PRD §8.7 / §8.8。
 * JSON 结构与 lib/kb-data.ts 的 KbCardsFile / KbSpotsFile / KbPoiMapFile 对齐，
 * 构建期由 scripts/check-kb.mjs 与 TypeScript 双重校验。
 */
export const KB_CARDS_FILE = cardsJson as unknown as KbCardsFile;
export const KB_SPOTS_FILE = spotsJson as unknown as KbSpotsFile;
export const KB_POI_MAP_FILE = mapJson as unknown as KbPoiMapFile;

export const KB_SNAPSHOT_SOURCE = KB_CARDS_FILE.source ?? "";
export const KB_SNAPSHOT_FETCHED_AT = KB_CARDS_FILE.fetchedAt ?? "";
export const KB_SPOTS_GENERATED_AT = KB_SPOTS_FILE.generatedAt ?? "";
