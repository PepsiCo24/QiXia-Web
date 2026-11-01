"use client";

import { useLanguage } from "./language-provider";
import { localizeText, translatePoiName } from "@/lib/i18n";
import { useState } from "react";
import { Leaf, MapPin, Navigation, X } from "lucide-react";
import { POI_MAP, crowdLevel, poiLoad } from "@/lib/qixia-data";
import { cn } from "@/lib/utils";

interface PoiCardProps {
  poiId: string;
  hour: number;
  onClose: () => void;
  onAsk: (question: string) => void;
  /** 从当前位置步行导航到该景点 */
  onNavigate?: (poiId: string) => void;
}

const BASE_PATH = process.env.NEXT_PUBLIC_BASE_PATH || ''

const TONE_CLASS = {
  low: "bg-jade/15 text-jade",
  mid: "bg-accent/15 text-accent",
  high: "bg-primary/15 text-primary",
};

export function PoiCard({
  poiId,
  hour,
  onClose,
  onAsk,
  onNavigate,
}: PoiCardProps) {
  const { locale, t } = useLanguage();
  const [collected, setCollected] = useState<string[]>([]);
  const poi = POI_MAP[poiId];
  const load = poiLoad(poi, hour);
  const level = crowdLevel(load / poi.peakLoad);

  return (
    <article aria-labelledby="poi-title" className="glass-panel w-full overflow-hidden p-4">
      <figure className="relative -mx-4 -mt-4 mb-3 aspect-[16/9] overflow-hidden bg-secondary">
        <img src={`${BASE_PATH}${poi.image}`} alt={t(`${poi.name}景观`, `View of ${translatePoiName(poi.name, locale)}`)} loading="lazy" decoding="async" className="size-full object-cover" />
        {poi.imageCredit && <figcaption className="absolute bottom-1 right-1.5 rounded-sm bg-black/45 px-1.5 py-0.5 text-[10px] text-white/85">{poi.imageCredit}</figcaption>}
      </figure>
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
            <MapPin className="size-3" aria-hidden="true" />
            {localizeText(poi.category, locale)} · {t(`海拔约 ${poi.elevation} m · 坐标待核验`, `Approx. elevation ${poi.elevation} m · coordinates unverified`)}
          </p>
          <h3
            id="poi-title"
            className="mt-1 font-serif text-xl font-bold text-foreground"
          >
            {translatePoiName(poi.name, locale)}
          </h3>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label={t("关闭景点卡片", "Close sight card")}
          className="rounded-md p-1 text-muted-foreground hover:bg-secondary hover:text-foreground"
        >
          <X className="size-4" />
        </button>
      </div>

      <p className="mt-2 text-sm leading-relaxed text-foreground/90">
        {localizeText(poi.brief, locale)}
      </p>
      <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
        {localizeText(poi.story, locale)}
      </p>

      <div className="mt-3 flex flex-wrap items-center gap-2 text-xs">
        <span className={cn("rounded-sm px-2 py-0.5", TONE_CLASS[level.tone])}>
          {String(hour).padStart(2, "0")}:00 · {localizeText(level.label, locale)} · {t(`约 ${load} 人`, `about ${load} visitors`)}
        </span>
        <button
          type="button"
          disabled={collected.includes(poiId)}
          onClick={() => {
            setCollected((prev) => [...prev, poiId]);
            window.dispatchEvent(
              new CustomEvent("qixia-leaf-collected", { detail: { poiId } }),
            );
          }}
          className="flex items-center gap-1 rounded-sm bg-secondary px-2 py-0.5 text-muted-foreground disabled:text-accent"
        >
          <Leaf className="size-3 text-primary" aria-hidden="true" />
          {collected.includes(poiId) ? t("已收集数字枫叶", "Digital maple leaf collected") : t("收集数字枫叶纪念", "Collect a digital maple leaf")}
        </button>
      </div>

      {onNavigate && (
        <button
          type="button"
          onClick={() => onNavigate(poiId)}
          className="mt-3 flex w-full items-center justify-center gap-1.5 rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90"
        >
          <Navigation className="size-3.5" aria-hidden="true" />
          {t("导航到这里", "Navigate here")}
        </button>
      )}

      <button
        type="button"
        onClick={() => onAsk(t(`给我讲讲${poi.name}，现在去合适吗？`, `Tell me about ${translatePoiName(poi.name, locale)}. Is now a good time to visit?`))}
        className="mt-3 w-full rounded-md border border-primary/50 px-3 py-2 text-sm text-primary transition-colors hover:bg-primary hover:text-primary-foreground"
      >
        {t("继续追问", "Ask about")} {translatePoiName(poi.name, locale)}
      </button>
    </article>
  );
}
