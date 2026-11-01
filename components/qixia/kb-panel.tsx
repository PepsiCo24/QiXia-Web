"use client";

import { useMemo, useRef, useState, type KeyboardEvent } from "react";
import { Search, X } from "lucide-react";
import {
  KB_CREDIBILITY_LABEL,
  KB_TABS,
  coordKindHint,
  coordKindLabel,
  credibilityBadge,
  getSpotsForTab,
  getTabStats,
  type KbSpot,
  type KbTabKey,
} from "@/lib/kb-data";
import { cn } from "@/lib/utils";

/**
 * 「栖霞资料」面板（PRD §6.2 / FR-2 / FR-7 / §9.1）。
 *
 * 列表来自构建期快照（同步读取，切换页签不请求网络）；
 * 面板本身不渲染全屏遮罩，滚动发生在面板内部（列表内部滚动，不触发地图缩放）。
 * 宿主元素 `.kb-panel-host` 由 hero-map 提供；组件根节点是 `.kb-panel`。
 */
export interface KbPanelProps {
  activeTab: KbTabKey;
  onTabChange: (tab: KbTabKey) => void;
  onSelectSpot: (spot: KbSpot) => void;
  onClose: () => void;
  selectedSpotId?: string | null;
}

/** 搜索：名称 / 别名精确优先，无直接命中时再按摘要兜底（FR-2 P1） */
function matchesName(spot: KbSpot, query: string): boolean {
  return [spot.title, ...(spot.aliases ?? [])]
    .join("\n")
    .toLowerCase()
    .includes(query);
}

function matchesSummary(spot: KbSpot, query: string): boolean {
  return spot.summary.toLowerCase().includes(query);
}

export function KbPanel({
  activeTab,
  onTabChange,
  onSelectSpot,
  onClose,
  selectedSpotId = null,
}: KbPanelProps) {
  const [query, setQuery] = useState("");
  const tabRefs = useRef<Array<HTMLButtonElement | null>>([]);

  const spots = useMemo(() => getSpotsForTab(activeTab), [activeTab]);
  const stats = useMemo(() => getTabStats(activeTab), [activeTab]);

  const normalizedQuery = query.trim().toLowerCase();
  const visibleSpots = useMemo(() => {
    if (!normalizedQuery) return spots;
    // 「千佛岩」这类名称命中时只列直接命中项，避免被正文提及的条目淹没；
    // 名称/别名无命中时再退回摘要检索，保证 FR-2 的摘要过滤能力。
    const nameMatches = spots.filter((spot) =>
      matchesName(spot, normalizedQuery),
    );
    if (nameMatches.length > 0) return nameMatches;
    return spots.filter((spot) => matchesSummary(spot, normalizedQuery));
  }, [spots, normalizedQuery]);

  const activeTabLabel =
    KB_TABS.find((tab) => tab.key === activeTab)?.label ?? "资料";
  // FR-3：该分类 0 条可定位时，面板底部给出说明。
  const showNoCoordHint = stats.total > 0 && stats.locatable === 0;

  /** 左右方向键在页签间移动并切换（FR-7）；以当前焦点页签为基准，避免快速连按时状态滞后 */
  const focusAdjacentTab = (offset: number) => {
    const focusedIndex = tabRefs.current.findIndex(
      (element) => element === document.activeElement,
    );
    const baseIndex =
      focusedIndex >= 0
        ? focusedIndex
        : KB_TABS.findIndex((tab) => tab.key === activeTab);
    const nextIndex =
      (baseIndex + offset + KB_TABS.length) % KB_TABS.length;
    onTabChange(KB_TABS[nextIndex].key);
    tabRefs.current[nextIndex]?.focus();
  };

  const handleTabKeyDown = (event: KeyboardEvent<HTMLButtonElement>) => {
    switch (event.key) {
      case "ArrowRight":
        event.preventDefault();
        focusAdjacentTab(1);
        break;
      case "ArrowLeft":
        event.preventDefault();
        focusAdjacentTab(-1);
        break;
      case "Home":
        event.preventDefault();
        onTabChange(KB_TABS[0].key);
        tabRefs.current[0]?.focus();
        break;
      case "End":
        event.preventDefault();
        onTabChange(KB_TABS[KB_TABS.length - 1].key);
        tabRefs.current[KB_TABS.length - 1]?.focus();
        break;
      default:
        break;
    }
  };

  const handlePanelKeyDown = (event: KeyboardEvent<HTMLElement>) => {
    // FR-7：Esc 关闭；只处理焦点在面板内的情况，地图区域的 Esc 由 hero-map 统一处理。
    if (event.key === "Escape") onClose();
  };

  return (
    <section
      className="kb-panel glass-panel"
      data-testid="kb-panel"
      aria-label="栖霞资料"
      onKeyDown={handlePanelKeyDown}
    >
      <header className="kb-panel-header">
        <h2 className="kb-panel-title">栖霞资料</h2>
        <button
          type="button"
          className="kb-panel-close"
          aria-label="关闭栖霞资料"
          onClick={onClose}
        >
          <X aria-hidden="true" />
        </button>
      </header>

      <div className="kb-tabs" role="tablist" aria-label="资料分类">
        {KB_TABS.map((tab, index) => {
          const selected = tab.key === activeTab;
          return (
            <button
              key={tab.key}
              ref={(element) => {
                tabRefs.current[index] = element;
              }}
              type="button"
              role="tab"
              id={`kb-tab-${tab.key}`}
              aria-selected={selected}
              aria-controls="kb-panel-body"
              tabIndex={selected ? 0 : -1}
              data-testid={`kb-tab-${tab.key}`}
              className={cn("kb-tab", selected && "is-selected")}
              onClick={() => onTabChange(tab.key)}
              onKeyDown={handleTabKeyDown}
            >
              {tab.label}
            </button>
          );
        })}
      </div>

      <div
        className="kb-panel-body"
        id="kb-panel-body"
        role="tabpanel"
        aria-labelledby={`kb-tab-${activeTab}`}
      >
        <p className="kb-count" data-testid="kb-count" aria-live="polite">
          共 {stats.total} 条 · {stats.locatable} 条可定位
        </p>

        <div className="kb-search">
          <Search className="kb-search-icon" aria-hidden="true" />
          <input
            type="search"
            data-testid="kb-search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="搜索名称"
            aria-label="搜索栖霞资料"
            autoComplete="off"
            spellCheck={false}
          />
          {query.length > 0 && (
            <button
              type="button"
              className="kb-search-clear"
              aria-label="清除搜索"
              onClick={() => setQuery("")}
            >
              <X aria-hidden="true" />
            </button>
          )}
        </div>

        {spots.length === 0 ? (
          <p className="kb-empty" data-testid="kb-empty" role="status">
            这一类资料还在整理中
          </p>
        ) : visibleSpots.length === 0 ? (
          <p className="kb-empty" data-testid="kb-empty" role="status">
            没有匹配的条目
          </p>
        ) : (
          <ul
            className="kb-list"
            role="list"
            aria-label={`${activeTabLabel}资料列表`}
          >
            {visibleSpots.map((spot) => {
              const selected = spot.id === selectedSpotId;
              return (
                <li key={spot.id}>
                  <button
                    type="button"
                    className={cn("kb-row", selected && "is-selected")}
                    data-testid="kb-spot-row"
                    data-kb-id={spot.id}
                    aria-current={selected ? "true" : undefined}
                    onClick={() => onSelectSpot(spot)}
                  >
                    <span className="kb-row-head">
                      <span className="kb-row-title">{spot.title}</span>
                      <span className="kb-tags">
                        {spot.past && (
                          <span className="kb-tag kb-tag-past">往期</span>
                        )}
                        <span
                          className="kb-tag kb-tag-coord"
                          data-coord-kind={spot.coordKind}
                          title={coordKindHint(spot)}
                        >
                          {coordKindLabel(spot)}
                        </span>
                        <span
                          className="kb-tag kb-tag-cred"
                          title={KB_CREDIBILITY_LABEL[spot.credibility]}
                        >
                          {credibilityBadge(spot.credibility)}
                        </span>
                      </span>
                    </span>
                    <span className="kb-row-summary">{spot.summary}</span>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      <footer className="kb-panel-foot">
        {showNoCoordHint && (
          <p className="kb-nocoord" role="status">
            该分类 {stats.total} 条暂无核验坐标
          </p>
        )}
        <p className="kb-source-note">资料来自栖霞知识库 · 草稿未人工审核</p>
      </footer>
    </section>
  );
}
