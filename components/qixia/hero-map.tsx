"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Layers,
  Leaf,
  Users,
  Activity,
  X,
  Maximize2,
  Route,
  BookOpen,
} from "lucide-react";
import type { MapCommand } from "@/lib/pet/pet-actions";
import { MapView, type LayerState } from "./map-view";
import { TopBar } from "./top-bar";
import { HourSlider, LayerPanel, LayerToggles } from "./layer-panel";
import { PersonaPanel } from "./persona-panel";
import { PoiCard } from "./poi-card";
import { NavigationPanel } from "./navigation-panel";
import { KbPanel } from "./kb-panel";
import { KbSpotCard } from "./kb-spot-card";
import { FOLIAGE, POI_MAP, snapshot, type PersonaId } from "@/lib/qixia-data";
import { useNavigation } from "@/lib/use-navigation";
import {
  buildAmapNavigationUri,
  coordText,
  getKbSpot,
  getLocatableSpotsForTab,
  isStaticDeployment,
  type KbSpot,
  type KbTabKey,
} from "@/lib/kb-data";

interface HeroMapProps {
  personaId: PersonaId;
  onPersonaChange: (id: PersonaId) => void;
  onAsk: (question?: string) => void;
  command: { id: number; action: MapCommand } | null;
  onPoiSelect: (id: string) => void;
}
const tools = [
  { id: "layers", label: "地图图层", icon: Layers },
  { id: "foliage", label: "红叶情报", icon: Leaf },
  { id: "crowd", label: "游客客流", icon: Users },
  { id: "ops", label: "运行态势", icon: Activity },
] as const;
export function HeroMap({
  personaId,
  onPersonaChange,
  onAsk,
  command,
  onPoiSelect,
}: HeroMapProps) {
  const [layers, setLayers] = useState<LayerState>({
    heat: false,
    devices: false,
    traffic: false,
    alerts: false,
  });
  const [hour, setHour] = useState(11);
  const [selectedPoiId, setSelectedPoiId] = useState<string | null>(null);
  const [tool, setTool] = useState<string | null>(null);
  const [routeVisible, setRouteVisible] = useState(true);
  const [routeExpanded, setRouteExpanded] = useState(false);
  const [voiceOn, setVoiceOn] = useState(true);
  /** 栖霞资料（新增板块）状态 */
  const [kbOpen, setKbOpen] = useState(false);
  const [kbTab, setKbTab] = useState<KbTabKey>("attractions");
  const [selectedKbId, setSelectedKbId] = useState<string | null>(null);
  const [kbNotice, setKbNotice] = useState<string | null>(null);
  const [kbNavTarget, setKbNavTarget] = useState<KbSpot | null>(null);
  const toolRef = useRef<HTMLDivElement>(null);
  const nav = useNavigation();
  const navigating = Boolean(nav.session);
  const selectPoi = (id: string) => {
    setSelectedPoiId(id);
    setSelectedKbId(null);
    setKbOpen(false);
    setTool(null);
    onPoiSelect(id);
  };
  /** 从当前位置导航到该景点 */
  const startNavigation = useCallback(
    (poiId: string) => {
      const poi = POI_MAP[poiId];
      if (!poi) return;
      setSelectedPoiId(null);
      setTool(null);
      void nav.start({ poiId, name: poi.name }, poi.coordinates);
    },
    [nav],
  );

  const closeKb = useCallback(() => {
    setKbOpen(false);
    setSelectedKbId(null);
    setKbNotice(null);
    setKbNavTarget(null);
  }, []);

  const kbSpots = useMemo(
    () => (kbOpen ? getLocatableSpotsForTab(kbTab) : []),
    [kbOpen, kbTab],
  );
  const kbFitKey = `${kbTab}:${kbOpen ? "open" : "closed"}`;
  const selectedKbSpot = useMemo(() => getKbSpot(selectedKbId), [selectedKbId]);

  /** 外部高德兜底（FR-5 分支 2） */
  const openExternalMap = useCallback((spot: KbSpot) => {
    if (!spot.coord) return;
    const uri = buildAmapNavigationUri(spot.title, spot.coord);
    const link = document.createElement("a");
    link.href = uri;
    link.target = "_blank";
    link.rel = "noopener noreferrer";
    document.body.appendChild(link);
    link.click();
    link.remove();
    const coordHint =
      spot.coordKind === "verified"
        ? "坐标已双源核验（知识库 + OSM），导航仅供参考，请以现场标识为准。"
        : "坐标为示意位置，请以现场标识为准。";
    setKbNotice(
      `已在新标签打开高德地图前往「${spot.title}」。${coordHint}如未打开，可复制坐标：${coordText(spot.coord)}`,
    );
  }, []);

  const startKbNavigation = useCallback(
    (spot: KbSpot) => {
      if (!spot.coord) return;
      setKbNotice(null);
      if (spot.verified && !isStaticDeployment()) {
        setKbNavTarget(spot);
        setSelectedKbId(null);
        void nav.start({ poiId: `kb:${spot.id}`, name: spot.title }, spot.coord);
        return;
      }
      openExternalMap(spot);
    },
    [nav, openExternalMap],
  );

  useEffect(() => {
    if (!command) return;
    const action = command.action;
    if (action.type === "focus_place" || action.type === "show_poi_card") {
      setSelectedPoiId(action.poiId);
      setSelectedKbId(null);
      setKbOpen(false);
    }
    if (action.type === "toggle_layer")
      setLayers((prev) => ({ ...prev, [action.layer]: action.visible }));
    if (action.type === "show_route") {
      setRouteVisible(true);
      setRouteExpanded(true);
    }
  }, [command]);

  useEffect(() => {
    if (nav.session) setKbNavTarget(null);
  }, [nav.session]);

  useEffect(() => {
    const close = (e: PointerEvent) => {
      if (!toolRef.current?.contains(e.target as Node)) {
        setTool(null);
        if (kbOpen) {
          setKbOpen(false);
          setSelectedKbId(null);
          setKbNotice(null);
        }
      }
    };
    const escape = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setTool(null);
        setRouteExpanded(false);
        setSelectedPoiId(null);
        setKbOpen(false);
        setSelectedKbId(null);
        setKbNotice(null);
      }
    };
    document.addEventListener("pointerdown", close);
    document.addEventListener("keydown", escape);
    return () => {
      document.removeEventListener("pointerdown", close);
      document.removeEventListener("keydown", escape);
    };
  }, [kbOpen]);
  const toggleLayer = (key: keyof LayerState) =>
    setLayers((prev) => ({ ...prev, [key]: !prev[key] }));
  const s = snapshot(hour);
  return (
    <section
      id="map"
      aria-label="栖霞山三维地图"
      className="immersive-map"
      data-route-expanded={routeVisible && routeExpanded}
      data-poi-open={!!selectedPoiId || (kbOpen && !!selectedKbId)}
      data-kb-open={kbOpen}
      data-kb-card-open={Boolean(kbOpen && selectedKbSpot)}
    >
      <MapView
        layers={layers}
        hour={hour}
        personaId={personaId}
        selectedPoiId={selectedPoiId}
        onSelectPoi={selectPoi}
        kbMode={kbOpen}
        kbSpots={kbSpots}
        selectedKbId={selectedKbId}
        onSelectKb={(id) => {
          setSelectedKbId(id);
          setKbNotice(null);
        }}
        kbFitKey={kbFitKey}
        navigation={
          nav.session
            ? {
                session: nav.session,
                progress: nav.progress,
                position: nav.position,
              }
            : null
        }
      />
      <div
        className="map-vignette pointer-events-none absolute inset-0"
        aria-hidden="true"
      />
      {!navigating && <TopBar onFoliage={() => setTool("foliage")} />}
      {!navigating && (
        <div className="map-intro pointer-events-none">
          <p className="eyebrow">NANJING · QIXIA MOUNTAIN</p>
          <h1>一客一景，<br />一刻一路。</h1>
          <p>循着山林，找到属于你的栖霞。</p>
          <span>沉浸式地形探索 <i /> 灵猫陪伴游览</span>
        </div>
      )}
      {!navigating && <div className="falling-leaves" aria-hidden="true">
        {['8%', '19%', '31%', '44%', '58%', '71%', '86%'].map((left, index) => (
          <span key={left} style={{ left, animationDelay: `${-index * 2.1}s`, animationDuration: `${11 + index % 4}s` }}>🍁</span>
        ))}
      </div>}
      {!navigating && (
        <div ref={toolRef} className="map-tool-host">
          <nav className="map-tools glass-panel" aria-label="地图工具">
            {tools.map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                title={label}
                aria-label={label}
                aria-expanded={tool === id}
                aria-controls="map-tool-panel"
                className={tool === id ? "active" : ""}
                onClick={() => {
                  setTool(tool === id ? null : id);
                  closeKb();
                }}
              >
                <Icon size={19} />
                <span>{label}</span>
              </button>
            ))}
            <div className="tool-divider" />
            <button
              title="纯地图模式"
              aria-label="纯地图模式"
              onClick={() => {
                setTool(null);
                setRouteVisible(false);
                setSelectedPoiId(null);
                closeKb();
              }}
            >
              <Maximize2 size={18} />
              <span>纯地图</span>
            </button>
            <div className="tool-divider" />
            <button
              data-testid="kb-entry"
              title="栖霞资料"
              aria-label="栖霞资料"
              aria-expanded={kbOpen}
              aria-controls="kb-panel"
              className={kbOpen ? "active" : ""}
              onClick={() => {
                if (kbOpen) {
                  closeKb();
                  return;
                }
                setTool(null);
                setSelectedPoiId(null);
                setRouteExpanded(false);
                setKbNotice(null);
                setSelectedKbId(null);
                setKbTab("attractions");
                setKbOpen(true);
              }}
            >
              <BookOpen size={18} />
              <span>栖霞资料</span>
            </button>
          </nav>
          {tool && (
            <section
              id="map-tool-panel"
              aria-label={tools.find((t) => t.id === tool)?.label}
              className="tool-popover glass-panel"
            >
              <header>
                <h2>{tools.find((t) => t.id === tool)?.label}</h2>
                <button
                  className="icon-button"
                  aria-label="关闭工具面板"
                  onClick={() => setTool(null)}
                >
                  <X size={18} />
                </button>
              </header>
              <span className="data-badge">模拟数据 · 非实时</span>
              {tool === "ops" ? (
                <LayerPanel
                  layers={layers}
                  onToggle={toggleLayer}
                  hour={hour}
                  onHourChange={setHour}
                />
              ) : tool === "layers" ? (
                <>
                  <p>按需叠加信息，让山林保持清晰。</p>
                  <LayerToggles layers={layers} onToggle={toggleLayer} />
                </>
              ) : tool === "crowd" ? (
                <>
                  <p>
                    在园游客{" "}
                    <strong className="crowd-number">
                      {s.visitors.toLocaleString()} <small>人</small>
                    </strong>
                  </p>
                  <p>
                    承载率 {Math.round(s.loadRatio * 100)}% ·{" "}
                    {String(hour).padStart(2, "0")}:00 时段参考
                  </p>
                  <HourSlider hour={hour} onHourChange={setHour} />
                  <div className="heat-legend">
                    <span>疏</span>
                    <i />
                    <span>密</span>
                  </div>
                </>
              ) : (
                <>
                  <div className="foliage-value">
                    {FOLIAGE.colorRate}
                    <small>%</small>
                    <Leaf size={32} />
                  </div>
                  <h3>红叶 · {FOLIAGE.stage}</h3>
                  <p>
                    {FOLIAGE.weather} · 日落 {FOLIAGE.sunset}
                  </p>
                  <p>红叶与天气非实时信息，赏枫情况请以现场为准。</p>
                  <button
                    className="outline-button"
                    onClick={() => selectPoi("maple-ridge")}
                  >
                    在地图上看看枫岭
                  </button>
                  <p>红枫图鉴建设中 · 可在景点卡收集数字枫叶纪念。</p>
                </>
              )}
            </section>
          )}
          {kbOpen && (
            <div id="kb-panel" data-testid="kb-panel-host" className="kb-tool-popover">
              <KbPanel
                activeTab={kbTab}
                onTabChange={(tab) => {
                  setKbTab(tab);
                  setSelectedKbId(null);
                  setKbNotice(null);
                }}
                onSelectSpot={(spot) => {
                  setSelectedKbId(spot.id);
                  setKbNotice(null);
                }}
                onClose={closeKb}
                selectedSpotId={selectedKbId}
              />
            </div>
          )}
        </div>
      )}
      {!navigating &&
        (routeVisible ? (
          <aside
            className={`route-host ${routeExpanded ? "expanded" : ""}`}
            aria-label="推荐游览顺序"
          >
            <PersonaPanel
              personaId={personaId}
              onPersonaChange={onPersonaChange}
              onSelectPoi={selectPoi}
              onAsk={() => onAsk()}
              expanded={routeExpanded}
              onExpandedChange={setRouteExpanded}
              onClose={() => setRouteVisible(false)}
            />
          </aside>
        ) : (
          <button
            className="route-reopen glass-panel"
            onClick={() => setRouteVisible(true)}
          >
            <Route size={18} /> 推荐路线
          </button>
        ))}
      {!navigating && selectedPoiId && (
        <div className="poi-card-host">
          <PoiCard
            poiId={selectedPoiId}
            hour={hour}
            onClose={() => setSelectedPoiId(null)}
            onAsk={(q) => {
              setSelectedPoiId(null);
              onAsk(q);
            }}
            onNavigate={startNavigation}
          />
        </div>
      )}
      {!navigating && kbOpen && selectedKbSpot && (
        <div className="poi-card-host kb-card-host">
          <KbSpotCard
            spot={selectedKbSpot}
            onClose={() => setSelectedKbId(null)}
            onNavigate={startKbNavigation}
          />
        </div>
      )}
      {!navigating && kbNotice && (
        <div role="status" data-testid="kb-notice" className="kb-notice glass-panel">
          {kbNotice}
        </div>
      )}
      {!navigating && layers.heat && (
        <div className="map-heat-key glass-panel">
          客流模拟{" "}
          <span className="heat-legend">
            <span>疏</span>
            <i />
            <span>密</span>
          </span>{" "}
          {hour}:00
        </div>
      )}
      {nav.loading && (
        <div className="pointer-events-none absolute inset-0 z-40 flex items-center justify-center">
          <div className="rounded-lg bg-background/95 px-4 py-3 text-sm text-foreground shadow-lg backdrop-blur">
            正在获取位置并规划路线…
          </div>
        </div>
      )}
      {nav.error && !nav.session && (
        <div
          role="alert"
          className="pointer-events-auto absolute inset-x-3 bottom-4 z-40 mx-auto max-w-md rounded-lg border border-destructive/40 bg-background/95 px-4 py-3 text-sm leading-relaxed text-destructive shadow-lg backdrop-blur"
        >
          <p>{nav.error}</p>
          {kbNavTarget?.coord && (
            <button
              type="button"
              data-testid="kb-nav-fallback"
              onClick={() => openExternalMap(kbNavTarget)}
              className="mt-2 w-full rounded-md border border-destructive/50 px-3 py-2 text-sm text-destructive transition-colors hover:bg-destructive/10"
            >
              用高德地图打开「{kbNavTarget.title}」
            </button>
          )}
        </div>
      )}
      {nav.session && (
        <NavigationPanel
          session={nav.session}
          progress={nav.progress}
          error={nav.error}
          voiceOn={voiceOn}
          onToggleVoice={() => setVoiceOn((v) => !v)}
          onExit={() => {
            nav.stop();
            setKbNavTarget(null);
          }}
        />
      )}
    </section>
  );
}
