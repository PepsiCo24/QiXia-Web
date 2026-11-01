"use client";

import { useLanguage } from "./language-provider";
import { localizeText, translatePoiName, translatePersonaName } from "@/lib/i18n";
import { ChevronDown, ChevronUp, X, ArrowUpRight, Route } from "lucide-react";
import {
  PERSONAS,
  PERSONA_MAP,
  POI_MAP,
  formatDuration,
  type PersonaId,
} from "@/lib/qixia-data";
import { cn } from "@/lib/utils";
interface PersonaPanelProps {
  personaId: PersonaId;
  onPersonaChange: (id: PersonaId) => void;
  onSelectPoi: (id: string) => void;
  onAsk: () => void;
  expanded?: boolean;
  onExpandedChange?: (open: boolean) => void;
  onClose?: () => void;
}
export function PersonaTabs({
  personaId,
  onPersonaChange,
  className,
}: Pick<PersonaPanelProps, "personaId" | "onPersonaChange"> & {
  className?: string;
}) {
  const { locale, t } = useLanguage();
  return (
    <div
      role="radiogroup"
      aria-label={t("选择同行方式", "Choose your travel style")}
      className={cn("persona-tabs", className)}
    >
      <button
        type="button"
        role="radio"
        aria-checked={personaId === "default"}
        title={t("默认景点", "Classic sights")}
        onClick={() => onPersonaChange("default")}
      >
        {t("默认", "Classic")}
      </button>
      {PERSONAS.map((p) => (
        <button
          key={p.id}
          type="button"
          role="radio"
          aria-checked={p.id === personaId}
          title={translatePersonaName(p.name, locale)}
          onClick={() => onPersonaChange(p.id)}
        >
          {translatePersonaName(p.short, locale)}
        </button>
      ))}
    </div>
  );
}
export function PersonaPanel({
  personaId,
  onPersonaChange,
  onSelectPoi,
  onAsk,
  expanded = false,
  onExpandedChange,
  onClose,
}: PersonaPanelProps) {
  const { locale, t } = useLanguage();
  const isDefault = personaId === "default";
  const p = isDefault
    ? null
    : PERSONA_MAP[personaId as Exclude<PersonaId, "default">];
  const route = p!;
  return (
    <section className="route-card glass-panel" aria-labelledby="persona-title">
      <header className="route-heading">
        <span>
          <Route size={16} />{" "}
          {isDefault ? t("默认景点", "Classic sights") : t(`为你推荐 · ${route.name}`, `Recommended · ${translatePersonaName(route.name, locale)}`)}
        </span>
        <button
          className="icon-button"
          aria-label={t("收起路线卡", "Close route card")}
          onClick={onClose}
        >
          <X size={17} />
        </button>
      </header>
      <PersonaTabs personaId={personaId} onPersonaChange={onPersonaChange} />
      {isDefault ? (
        <div className="route-title">
          <p className="eyebrow">CLASSIC SIGHTS</p>
          <h2 id="persona-title">{t("栖霞山经典景点", "Qixia Mountain classics")}</h2>
          <p className="route-preview">{t("选择同行方式，查看对应路线与沿途景点", "Choose a travel style to see a route and its sights")}</p>
        </div>
      ) : (
        <>
          <div className="route-title">
            <p className="eyebrow">YOUR WAY TO EXPLORE</p>
            <h2 id="persona-title">{localizeText(route.routeName, locale)}</h2>
          </div>
          <dl className="route-metrics">
            <div>
              <dt>{t("预计游玩", "Estimated visit")}</dt>
              <dd>{locale === "en" ? `${route.durationMin} min` : formatDuration(route.durationMin)}</dd>
            </div>
            <div>
              <dt>{t("距离示意", "Approx. distance")}</dt>
              <dd>
                {route.distanceKm} <small>km</small>
              </dd>
            </div>
            <div>
              <dt>{t("体力消耗", "Effort")}</dt>
              <dd>{localizeText(route.intensity, locale)}</dd>
            </div>
          </dl>
          {!expanded && (
            <p className="route-preview">
              {route.stops
                .slice(0, 4)
                .map((id) => translatePoiName(POI_MAP[id].name, locale))
                .join(" → ")}
              {route.stops.length > 4 ? " …" : ""}
            </p>
          )}
        </>
      )}
      {!isDefault && expanded && (
        <div id="route-details" className="route-details">
          <p>{localizeText(route.cares, locale)}</p>
          <ol>
            {route.stops.map((id, i) => (
              <li key={id}>
                <button
                  onClick={() => onSelectPoi(id)}
                  aria-label={t(`聚焦${translatePoiName(POI_MAP[id].name, locale)}`, `Focus on ${translatePoiName(POI_MAP[id].name, locale)}`)}
                >
                  <span className="stop-order">
                    {i === 0
                      ? t("起", "S")
                      : i === route.stops.length - 1
                        ? t("终", "E")
                        : i + 1}
                  </span>
                  <span>
                    <strong>{translatePoiName(POI_MAP[id].name, locale)}</strong>
                    <small>{localizeText(POI_MAP[id].brief, locale)}</small>
                  </span>
                  <ArrowUpRight size={16} />
                </button>
              </li>
            ))}
          </ol>
          <button className="outline-button" onClick={onAsk}>
            {t("让灵猫帮我调整行程", "Ask the spirit cat to tailor my trip")} <ArrowUpRight size={16} />
          </button>
        </div>
      )}
      {!isDefault && (
        <>
          <button
            className="route-expand"
            aria-expanded={expanded}
            aria-controls="route-details"
            onClick={() => onExpandedChange?.(!expanded)}
          >
            {expanded ? t("收起路线详情", "Hide route details") : t("查看完整路线", "View full route")}
            {expanded ? <ChevronUp size={17} /> : <ChevronDown size={17} />}
          </button>
          <p className="route-source">
            {t("推荐游览顺序 · 连线示意，非逐段导航", "Suggested visit order · illustrative connections, not turn-by-turn navigation")}
            <br />
            {t("坐标、距离与设施待实地核验，请以现场为准。", "Coordinates, distances and facilities await field verification. Follow on-site information.")}
          </p>
        </>
      )}
    </section>
  );
}
