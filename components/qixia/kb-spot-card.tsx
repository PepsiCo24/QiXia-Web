"use client";

import { useEffect, useId, useState } from "react";
import { ExternalLink, Navigation, X } from "lucide-react";
import {
  KB_CREDIBILITY_LABEL,
  categoryLabel,
  coordKindHint,
  coordKindLabel,
  credibilityBadge,
  fetchKbCardDetail,
  formatUpdated,
  kbPlaceUrl,
  pickAliases,
  pickFacts,
  pickSources,
  type KbCardDetail,
  type KbCredibility,
  type KbSpot,
} from "@/lib/kb-data";

/**
 * 资料点位卡（PRD §6.3 流程 B / FR-4 / FR-5 / §9.1）。
 *
 * 打开即拉详情（lib/kb-data 内已做 5 分钟缓存 + 请求合并 + 3s 超时），
 * 失败 / 超时降级为快照摘要；演示 story/brief 一律不展示（PRD §6.5）。
 * 宿主由 hero-map 提供（`.poi-card-host kb-card-host`），组件根节点是 `.kb-card`。
 */
export interface KbSpotCardProps {
  spot: KbSpot;
  onClose: () => void;
  onNavigate: (spot: KbSpot) => void;
}

type DetailState = "loading" | "ready" | "failed";

function normalizeCredibility(
  value: string | undefined,
  fallback: KbCredibility,
): KbCredibility {
  return value === "A" || value === "B" || value === "C" ? value : fallback;
}

export function KbSpotCard({ spot, onClose, onNavigate }: KbSpotCardProps) {
  const titleId = useId();
  const hintId = useId();
  const [state, setState] = useState<DetailState>("loading");
  const [detail, setDetail] = useState<KbCardDetail | null>(null);

  useEffect(() => {
    let alive = true;
    setState("loading");
    setDetail(null);
    fetchKbCardDetail(spot.id)
      .then((data) => {
        if (!alive) return;
        setDetail(data);
        setState(data ? "ready" : "failed");
      })
      .catch(() => {
        if (alive) setState("failed");
      });
    return () => {
      alive = false;
    };
  }, [spot.id]);

  const loading = state === "loading";
  const failed = state === "failed";
  const summary = (detail?.summary?.trim() || spot.summary || "").trim();
  const aliases = pickAliases({
    title: detail?.title?.trim() || spot.title,
    aliases: detail?.aliases?.length ? detail.aliases : spot.aliases,
  });
  const facts = loading ? [] : pickFacts(detail, 5);
  const sources = loading ? [] : pickSources(detail, 4);
  const credibility = normalizeCredibility(detail?.credibility, spot.credibility);
  const updated = formatUpdated(detail?.updated ?? spot.updated);
  const category = categoryLabel(spot);
  const hasCoord = Boolean(spot.coord);
  // §9.1：未核验坐标 → 导航提示；无坐标 → 未定位文案。
  const navigationHint = !hasCoord
    ? coordKindHint(spot)
    : spot.coordKind !== "verified"
      ? "坐标为示意位置，请以现场标识为准"
      : coordKindHint(spot);

  return (
    <article
      className="kb-card glass-panel"
      data-testid="kb-spot-card"
      aria-labelledby={titleId}
      aria-busy={loading}
    >
      <header className="kb-card-head">
        <div className="kb-card-title-group">
          <p className="kb-card-kicker">
            <span
              className="kb-tag kb-tag-coord"
              data-coord-kind={spot.coordKind}
              title={coordKindHint(spot)}
            >
              {coordKindLabel(spot)}
            </span>
            <span
              className="kb-tag kb-tag-cred"
              title={KB_CREDIBILITY_LABEL[credibility]}
            >
              {credibilityBadge(credibility)}
            </span>
            {spot.past && <span className="kb-tag kb-tag-past">往期</span>}
          </p>
          <h3 className="kb-card-title" id={titleId}>
            {spot.title}
          </h3>
          {aliases.length > 0 && (
            <p className="kb-card-aliases">别名：{aliases.join("、")}</p>
          )}
          <p className="kb-card-category">分类：{category}</p>
        </div>
        <button
          type="button"
          className="kb-card-close"
          aria-label="关闭资料卡"
          onClick={onClose}
        >
          <X aria-hidden="true" />
        </button>
      </header>

      {loading ? (
        <div className="kb-skeleton-list" role="status" aria-label="正在加载资料">
          <span className="kb-skeleton" />
          <span className="kb-skeleton" />
          <span className="kb-skeleton" />
        </div>
      ) : (
        <>
          {summary.length > 0 && <p className="kb-card-summary">{summary}</p>}
          {facts.length > 0 && (
            <ul className="kb-card-facts" role="list" aria-label="关键事实">
              {facts.map((fact, index) => (
                <li
                  key={`${fact.key}-${index}`}
                  className="kb-fact"
                  data-testid="kb-fact"
                >
                  {fact.key.length > 0 && (
                    <span className="kb-fact-key">{fact.key}</span>
                  )}
                  <span className="kb-fact-value">{fact.value}</span>
                </li>
              ))}
            </ul>
          )}
          {failed && (
            <p className="kb-card-note" role="status">
              资料暂时读不到，请稍后重试
            </p>
          )}
          <p className="kb-card-meta">
            <span>可信度 {credibilityBadge(credibility)}</span>
            <span aria-hidden="true">·</span>
            <span>{updated}</span>
            <span aria-hidden="true">·</span>
            <span className="kb-card-draft">草稿未人工审核</span>
          </p>
        </>
      )}

      {sources.length > 0 && (
        <div className="kb-card-sources">
          <p className="kb-card-section-title">出处</p>
          <ul role="list">
            {sources.map((source) => (
              <li key={source.url}>
                <a
                  href={source.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  title={source.url}
                >
                  {source.title?.trim() || source.url}
                </a>
                {source.credibility && (
                  <span className="kb-source-cred">{source.credibility}</span>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="kb-card-actions">
        {hasCoord ? (
          <button
            type="button"
            className="kb-nav-button"
            data-testid="kb-nav"
            aria-describedby={hintId}
            onClick={() => onNavigate(spot)}
          >
            <Navigation aria-hidden="true" />
            导航到这里
          </button>
        ) : null}
        <p className="kb-card-hint" id={hintId}>
          {navigationHint}
        </p>
        <a
          className="kb-place-link"
          data-testid="kb-place-link"
          href={kbPlaceUrl(spot.id)}
          target="_blank"
          rel="noopener noreferrer"
        >
          <ExternalLink aria-hidden="true" />
          在知识库查看完整资料
          <span className="sr-only">（在新标签页打开）</span>
        </a>
      </div>
    </article>
  );
}
