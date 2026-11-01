"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type {
  GeoJSONSource,
  Map as MapLibreMap,
  Marker as MapLibreMarker,
  StyleSpecification,
} from "maplibre-gl";
import type { Feature, FeatureCollection, LineString } from "geojson";
import type { RouteSegment } from "@/lib/amap";
import type { NavProgress } from "@/lib/navigation";
import type { NavigationSession } from "@/lib/use-navigation";
import "maplibre-gl/dist/maplibre-gl.css";
import {
  DEFAULT_POI_IDS,
  DEVICES,
  POIS,
  POI_MAP,
  QIXIA_CENTER,
  TRAFFIC_NODES,
  buildHeatFeatures,
  type LngLat,
  type PersonaId,
  PERSONA_MAP,
} from "@/lib/qixia-data";

export interface LayerState {
  heat: boolean;
  devices: boolean;
  traffic: boolean;
  alerts: boolean;
}

/** 导航进行中的实时视图数据 */
export interface NavigationView {
  session: NavigationSession;
  progress: NavProgress | null;
  position: LngLat | null;
}

interface MapViewProps {
  layers: LayerState;
  hour: number;
  personaId: PersonaId;
  selectedPoiId: string | null;
  onSelectPoi: (id: string) => void;
  /** 有值时进入导航视图：绘制导航路线、显示用户位置并跟随 */
  navigation?: NavigationView | null;
}

const TERRAIN_TILES =
  "https://s3.amazonaws.com/elevation-tiles-prod/terrarium/{z}/{x}/{y}.png";

const MAP_STYLE: StyleSpecification = {
  version: 8,
  sources: {
    satellite: {
      type: "raster",
      tiles: [
        "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
      ],
      tileSize: 256,
      maxzoom: 18,
      attribution: "影像 © Esri · 高程 © Mapzen / AWS Terrain Tiles",
    },
    terrain: {
      type: "raster-dem",
      tiles: [TERRAIN_TILES],
      encoding: "terrarium",
      tileSize: 256,
      maxzoom: 15,
    },
    hillshade: {
      type: "raster-dem",
      tiles: [TERRAIN_TILES],
      encoding: "terrarium",
      tileSize: 256,
      maxzoom: 15,
    },
  },
  layers: [
    { id: "bg", type: "background", paint: { "background-color": "#0b100e" } },
    {
      id: "satellite",
      type: "raster",
      source: "satellite",
      paint: {
        "raster-saturation": -0.18,
        "raster-brightness-min": 0.08,
        "raster-brightness-max": 0.95,
        "raster-contrast": 0.08,
      },
    },
    {
      id: "hillshade",
      type: "hillshade",
      source: "hillshade",
      paint: {
        "hillshade-shadow-color": "#05100b",
        "hillshade-highlight-color": "#f3d9a4",
        "hillshade-accent-color": "#2a3a30",
        "hillshade-exaggeration": 0.22,
      },
    },
  ],
  terrain: { source: "terrain", exaggeration: 1.9 },
  sky: {
    "sky-color": "#0d1714",
    "horizon-color": "#3a2b22",
    "fog-color": "#0b100e",
    "sky-horizon-blend": 0.6,
    "horizon-fog-blend": 0.6,
    "fog-ground-blend": 0.25,
    "atmosphere-blend": 0.4,
  },
};

/** 地图初始视角：用户迷失方向时，重置按钮回到这里 */
const DEFAULT_VIEW = {
  center: QIXIA_CENTER,
  zoom: 15.2,
  pitch: 64,
  bearing: -24,
};

const STATUS_COLOR = [
  "match",
  ["get", "status"],
  "online",
  "#6fbf9a",
  "warning",
  "#e0a845",
  "#d9503a",
] as const;

function routeGeoJSON(personaId: PersonaId): Feature<LineString> {
  if (personaId === 'default') return { type: 'Feature', properties: {}, geometry: { type: 'LineString', coordinates: [] } }
  return {
    type: "Feature",
    properties: {},
    geometry: {
      type: "LineString",
      coordinates: PERSONA_MAP[personaId].stops.map(
        (id) => POI_MAP[id].coordinates,
      ),
    },
  };
}

function emptyFeatureCollection(): FeatureCollection {
  return { type: "FeatureCollection", features: [] };
}

function segmentsToFeatureCollection(
  segments: RouteSegment[],
): FeatureCollection {
  return {
    type: "FeatureCollection",
    features: segments.map((segment) => ({
      type: "Feature" as const,
      properties: { distance: segment.distance, duration: segment.duration },
      geometry: {
        type: "LineString" as const,
        coordinates: segment.coordinates,
      },
    })),
  };
}

function overlayPadding(width: number) {
  if (width < 801) return { top: 155, bottom: 350, left: 55, right: 45 };
  if (width < 1024) return { top: 140, bottom: 120, left: 90, right: 320 };
  return { top: 120, bottom: 160, left: 110, right: 360 };
}

export function MapView({
  layers,
  hour,
  personaId,
  selectedPoiId,
  onSelectPoi,
  navigation = null,
}: MapViewProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MapLibreMap | null>(null);
  const poiElements = useRef<Map<string, HTMLElement>>(new Map());
  const trafficElements = useRef<HTMLElement[]>([]);
  const navMarkerRef = useRef<MapLibreMarker | null>(null);
  const lastNavKey = useRef("");
  const onSelectRef = useRef(onSelectPoi);
  const [ready, setReady] = useState(false);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    onSelectRef.current = onSelectPoi;
  }, [onSelectPoi]);

  useEffect(() => {
    let cancelled = false;
    let map: MapLibreMap | null = null;
    let frame = 0;
    let observer: ResizeObserver | undefined;
    let overlayObserver: MutationObserver | undefined;

    import("maplibre-gl").then((ml) => {
      if (cancelled || !containerRef.current) return;

      map = new ml.Map({
        container: containerRef.current,
        style: MAP_STYLE,
        center: DEFAULT_VIEW.center,
        zoom: DEFAULT_VIEW.zoom,
        pitch: DEFAULT_VIEW.pitch,
        bearing: DEFAULT_VIEW.bearing,
        maxPitch: 80,
        minZoom: 12.5,
        maxZoom: 18.5,
        scrollZoom: true,
        dragPan: true,
        dragRotate: true,
        touchZoomRotate: true,
        touchPitch: true,
        doubleClickZoom: true,
        keyboard: true,
        cooperativeGestures: false,
        attributionControl: { compact: true },
      })
      mapRef.current = map
      // Retain cursor-anchored wheel/trackpad zoom and give the canvas keyboard focus.
      map.scrollZoom.setWheelZoomRate(1 / 350)
      map.scrollZoom.setZoomRate(1 / 100)
      const canvas = map.getCanvas()
      canvas.tabIndex = 0
      canvas.setAttribute('aria-label', '栖霞山地图：滚轮缩放，左键拖动平移，右键拖动旋转与倾斜，方向键平移，加减键缩放')
      map.on('mousedown', () => canvas.focus({ preventScroll: true }))
      observer = new ResizeObserver(() => map?.resize())
      observer.observe(containerRef.current)
      overlayObserver = new MutationObserver(() => map?.resize())
      const section = containerRef.current.closest('section')
      if (section) overlayObserver.observe(section, { attributes: true })
      containerRef.current.dataset.mapReady = 'false'
      const publish = () => {
        if (!map || !containerRef.current) return;
        containerRef.current.dataset.zoom = map.getZoom().toFixed(2);
        containerRef.current.dataset.bearing = map.getBearing().toFixed(2);
        containerRef.current.dataset.pitch = map.getPitch().toFixed(2);
        containerRef.current.dataset.center = map
          .getCenter()
          .toArray()
          .join(",");
      };
      map.on("moveend", publish);
      map.on("load", () => {
        if (containerRef.current)
          containerRef.current.dataset.mapReady = "true";
        publish();
      });
      map.addControl(
        new ml.NavigationControl({ visualizePitch: true }),
        "bottom-right",
      );

      // 重置视角：回到景区初始视角
      const resetControl = {
        onAdd() {
          const button = document.createElement("button");
          button.type = "button";
          button.className = "reset-view-btn";
          button.setAttribute("aria-label", "重置地图视角，回到景区全景");
          button.title = "回到景区视角";
          button.innerHTML =
            '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="10"/><polygon points="16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88 16.24 7.76"/></svg>';
          button.addEventListener("click", () => {
            if (!map) return;
            containerRef.current?.dispatchEvent(new Event("stopspin"));
            map.easeTo({
              center: DEFAULT_VIEW.center,
              zoom: DEFAULT_VIEW.zoom,
              pitch: DEFAULT_VIEW.pitch,
              bearing: DEFAULT_VIEW.bearing,
              duration: 1200,
            });
          });
          return button;
        },
        onRemove() {},
      };
      map.addControl(resetControl, "bottom-right");
      // 移到最后，保证排在缩放/视角控件下方
      const corner = map
        .getContainer()
        .querySelector(".maplibregl-ctrl-bottom-right");
      const resetEl = corner?.querySelector(".reset-view-btn");
      if (corner && resetEl) {
        // 按钮可能直接挂在角容器下，此时不能 append 容器自身（会抛 HierarchyRequestError）
        const wrapper = resetEl.parentElement;
        const nodeToMove = wrapper && wrapper !== corner ? wrapper : resetEl;
        corner.appendChild(nodeToMove);
      }

      // The compass resets north; provide a separate, reversible pitch control.
      map.addControl(
        {
          onAdd(controlMap) {
            const group = document.createElement("div");
            group.className = "maplibregl-ctrl maplibregl-ctrl-group";
            const button = document.createElement("button");
            button.type = "button";
            button.className = "qixia-view-toggle";
            const sync = () => {
              const overhead = controlMap.getPitch() < 10;
              button.textContent = overhead ? "三维" : "俯视";
              button.title = overhead ? "切换三维视角" : "切换俯视视角";
              button.setAttribute("aria-label", button.title);
              button.setAttribute("aria-pressed", String(overhead));
            };
            button.onclick = () => {
              containerRef.current?.dispatchEvent(new Event("stopspin"));
              const overhead = controlMap.getPitch() < 10;
              controlMap.stop();
              controlMap.easeTo({
                pitch: overhead ? 64 : 0,
                duration: window.matchMedia("(prefers-reduced-motion: reduce)")
                  .matches
                  ? 0
                  : 700,
              });
            };
            group.append(button);
            controlMap.on("pitch", sync);
            sync();
            return group;
          },
          onRemove() {},
        },
        "bottom-right",
      );

      map.on("error", (e) => {
        console.error("Map error:", e.error?.message);
        if (String(e.error?.message ?? "").includes("WebGL")) setFailed(true);
      });

      const initLayers = () => {
        if (!map) return;
        map.addSource("heat", {
          type: "geojson",
          data: buildHeatFeatures(hour),
        });
        map.addLayer({
          id: "heat",
          type: "heatmap",
          source: "heat",
          paint: {
            "heatmap-weight": ["get", "w"],
            "heatmap-intensity": [
              "interpolate",
              ["linear"],
              ["zoom"],
              13,
              1.0,
              17,
              2.6,
            ],
            "heatmap-radius": [
              "interpolate",
              ["linear"],
              ["zoom"],
              13,
              12,
              15,
              26,
              17,
              60,
            ],
            "heatmap-opacity": 0.8,
            "heatmap-color": [
              "interpolate",
              ["linear"],
              ["heatmap-density"],
              0,
              "rgba(0,0,0,0)",
              0.2,
              "rgba(70,140,120,0.45)",
              0.45,
              "rgba(201,163,91,0.7)",
              0.7,
              "rgba(222,110,52,0.85)",
              1,
              "rgba(217,102,69,0.65)",
            ],
          },
        });

        // 真实路线段（高德路网覆盖）：实线
        map.addSource("route-real", {
          type: "geojson",
          data: emptyFeatureCollection(),
        });
        map.addLayer({
          id: "route-real-glow",
          type: "line",
          source: "route-real",
          layout: { "line-cap": "round", "line-join": "round" },
          paint: {
            "line-color": "#d9af69",
            "line-width": 10,
            "line-blur": 8,
            "line-opacity": 0.55,
          },
        });
        map.addLayer({
          id: "route-real",
          type: "line",
          source: "route-real",
          layout: { "line-cap": "round", "line-join": "round" },
          paint: { "line-color": "#d9af69", "line-width": 3.5 },
        });

        // 示意路线段（景区内部步道无路网数据）：虚线
        map.addSource("route-approx", {
          type: "geojson",
          data: routeGeoJSON(personaId),
        });
        map.addLayer({
          id: "route-approx",
          type: "line",
          source: "route-approx",
          layout: { "line-cap": "round", "line-join": "round" },
          paint: {
            "line-color": "#d9af69",
            "line-width": 3.5,
            "line-dasharray": [2, 1.5],
          },
        });

        // 导航路线 - 真实路网段（蓝色实线）
        map.addSource("nav-path-real", {
          type: "geojson",
          data: emptyFeatureCollection(),
        });
        map.addLayer({
          id: "nav-path-real-glow",
          type: "line",
          source: "nav-path-real",
          layout: { "line-cap": "round", "line-join": "round" },
          paint: {
            "line-color": "#2b7fff",
            "line-width": 14,
            "line-blur": 10,
            "line-opacity": 0.45,
          },
        });
        map.addLayer({
          id: "nav-path-real",
          type: "line",
          source: "nav-path-real",
          layout: { "line-cap": "round", "line-join": "round" },
          paint: { "line-color": "#4d9dff", "line-width": 5 },
        });

        // 导航路线 - 无路网数据的示意段（橙色虚线，明确区别于真实路线）
        map.addSource("nav-path-approx", {
          type: "geojson",
          data: emptyFeatureCollection(),
        });
        map.addLayer({
          id: "nav-path-approx",
          type: "line",
          source: "nav-path-approx",
          layout: { "line-cap": "round", "line-join": "round" },
          paint: {
            "line-color": "#e8a33c",
            "line-width": 4,
            "line-dasharray": [2, 2],
          },
        });

        map.addSource("devices", {
          type: "geojson",
          data: {
            type: "FeatureCollection",
            features: DEVICES.map((d) => ({
              type: "Feature",
              properties: { status: d.status, type: d.type },
              geometry: { type: "Point", coordinates: d.coordinates },
            })),
          },
        });
        map.addLayer({
          id: "devices-halo",
          type: "circle",
          source: "devices",
          paint: {
            "circle-radius": 11,
            "circle-color": STATUS_COLOR as never,
            "circle-opacity": 0.18,
          },
        });
        map.addLayer({
          id: "devices",
          type: "circle",
          source: "devices",
          paint: {
            "circle-radius": 4.5,
            "circle-color": STATUS_COLOR as never,
            "circle-stroke-color": "#0b100e",
            "circle-stroke-width": 1.5,
          },
        });

        POIS.forEach((poi) => {
          const el = document.createElement("button");
          el.type = "button";
          el.className = "poi-marker";
          el.setAttribute("aria-label", `查看${poi.name}`);
          el.innerHTML = `<img class="poi-thumb" src="${poi.image}" alt="${poi.name}缩略图" loading="lazy" decoding="async" /><span class="poi-dot"></span><span class="poi-label">${poi.name}</span>`;
          el.addEventListener("click", (ev) => {
            ev.stopPropagation();
            onSelectRef.current(poi.id);
          });
          poiElements.current.set(poi.id, el);
          new ml.Marker({ element: el, anchor: "bottom", opacity: "1", opacityWhenCovered: "1" })
            .setLngLat(poi.coordinates)
            .addTo(map!);
        });

        // 导航用的用户位置标记：初始化时就建好并隐藏，进入导航时只切换显示，避免异步创建竞态
        const navEl = document.createElement("div");
        navEl.className = "nav-user-marker";
        navEl.style.display = "none";
        navEl.innerHTML =
          '<svg width="32" height="32" viewBox="0 0 32 32" aria-hidden="true"><circle cx="16" cy="16" r="13" fill="#2b7fff" stroke="#ffffff" stroke-width="3"/><path d="M16 8 22 24l-6-3.2L10 24z" fill="#ffffff"/></svg>';
        navMarkerRef.current = new ml.Marker({
          element: navEl,
          anchor: "center",
          rotationAlignment: "map",
        })
          .setLngLat(QIXIA_CENTER)
          .addTo(map);

        TRAFFIC_NODES.forEach((node) => {
          const el = document.createElement("div");
          const ratio = node.used / node.capacity;
          const tone = ratio > 0.85 ? "high" : ratio > 0.6 ? "mid" : "low";
          el.className = `traffic-marker tone-${tone}`;
          const label =
            node.kind === "parking"
              ? `余 ${node.capacity - node.used} 位`
              : `${Math.round(ratio * 100)}%`;
          el.innerHTML = `<span class="traffic-kind">${node.kind === "parking" ? "P" : node.kind === "shuttle" ? "车" : "公"}</span><span class="traffic-text"><b>${node.name}</b>${label}</span>`;
          trafficElements.current.push(el);
          new ml.Marker({ element: el, anchor: "left" })
            .setLngLat(node.coordinates)
            .addTo(map!);
        });

        const declutter = () => {
          if (!map) return;
          const occupied: { x: number; y: number; w: number }[] = [];
          const entries = [...poiElements.current.entries()].sort(
            (a, b) =>
              Number(b[1].classList.contains("is-selected")) -
                Number(a[1].classList.contains("is-selected")) ||
              Number(b[1].classList.contains("is-on-route")) -
                Number(a[1].classList.contains("is-on-route")),
          );
          entries.forEach(([id, el]) => {
            const selected = el.classList.contains("is-selected");
            const major = [
              "gate",
              "temple",
              "grottoes",
              "maple-ridge",
              "summit",
            ].includes(id);
            const point = map!.project(POI_MAP[id].coordinates);
            const width = POI_MAP[id].name.length * 15 + 44;
            const collide = occupied.some(
              (p) =>
                Math.abs(p.x - point.x) < (p.w + width) / 2 &&
                Math.abs(p.y - point.y) < 46,
            );
            const show =
              selected ||
              el.classList.contains("is-default-twinkle") ||
              ((major ||
                el.classList.contains("is-on-route") ||
                map!.getZoom() >= 16.1) &&
                !collide);
            el.classList.toggle("label-muted", !show);
            if (show) occupied.push({ x: point.x, y: point.y, w: width });
          });
        };
        map.on("move", declutter);
        map.on("idle", declutter);
        declutter();
        setReady(true);
      };
      if (map.isStyleLoaded()) initLayers();
      else map.once("style.load", initLayers);

      const reduceMotion = window.matchMedia(
        "(prefers-reduced-motion: reduce)",
      ).matches;
      if (!reduceMotion) {
        const spin = () => {
          if (!map) return
          map.setBearing(map.getBearing() + 0.025)
          frame = requestAnimationFrame(spin)
        }
        let stopped = false
        const stop = () => { stopped = true; cancelAnimationFrame(frame) }
        map.once('load', () => {
          if (!stopped) frame = requestAnimationFrame(spin)
        })
        // Stop before MapLibre's wheel animation starts, so rotation cannot cancel zoom.
        map.getCanvas().addEventListener('wheel', stop, { passive: true })
        map.getCanvas().addEventListener('keydown', stop)
        map.on('zoomstart', stop)
        map.on('rotatestart', (e) => {
          if ((e as { originalEvent?: Event }).originalEvent) stop()
        })
        map.on('mousedown', stop)
        map.on('touchstart', stop)
        map.on('movestart', (e) => {
          if ((e as { originalEvent?: Event }).originalEvent) stop()
        })
        containerRef.current.addEventListener('stopspin', stop)
      }
    });

    const elementsAtMount = poiElements.current;
    return () => {
      cancelled = true;
      cancelAnimationFrame(frame);
      observer?.disconnect();
      overlayObserver?.disconnect();
      map?.remove();
      mapRef.current = null;
      elementsAtMount.clear();
      trafficElements.current = [];
    };
    // Map is created once; later prop changes are applied by the effects below.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    if (!ready || !map) return;
    map.setLayoutProperty(
      "heat",
      "visibility",
      layers.heat ? "visible" : "none",
    );
    map.setLayoutProperty(
      "devices",
      "visibility",
      layers.devices ? "visible" : "none",
    );
    map.setLayoutProperty(
      "devices-halo",
      "visibility",
      layers.devices ? "visible" : "none",
    );
    trafficElements.current.forEach(
      (el) => (el.style.display = layers.traffic ? "" : "none"),
    );
  }, [ready, layers]);

  useEffect(() => {
    const map = mapRef.current;
    if (!ready || !map) return;
    (map.getSource("heat") as GeoJSONSource | undefined)?.setData(
      buildHeatFeatures(hour),
    );
  }, [ready, hour]);

  // 路线：先用示意虚线兜底，再异步请求逐段真实/示意判定
  useEffect(() => {
    const map = mapRef.current;
    if (!ready || !map) return;

    const stops = personaId === 'default' ? [...DEFAULT_POI_IDS] : PERSONA_MAP[personaId].stops;
    const coords = stops.map((id) => POI_MAP[id].coordinates);

    (map.getSource("route-approx") as GeoJSONSource | undefined)?.setData(
      routeGeoJSON(personaId),
    );
    (map.getSource("route-real") as GeoJSONSource | undefined)?.setData(
      emptyFeatureCollection(),
    );

    poiElements.current.forEach((el, id) => {
      const index = stops.indexOf(id);
      const isOnRoute = index >= 0;
      const isDefaultMode = personaId === "default";
      el.style.display = isOnRoute ? "" : "none";
      el.style.setProperty("--poi-delay", isDefaultMode ? `${(DEFAULT_POI_IDS.indexOf(id as (typeof DEFAULT_POI_IDS)[number]) * 0.42).toFixed(2)}s` : "0s");
      el.classList.toggle("is-on-route", isOnRoute && !isDefaultMode);
      el.classList.toggle("is-default-twinkle", isDefaultMode && isOnRoute);
      el.dataset.order =
        index === 0
          ? "起"
          : index === stops.length - 1
            ? "终"
            : index >= 0
              ? String(index + 1)
              : "";
      el.querySelector(".poi-label")?.setAttribute(
        "data-order",
        el.dataset.order,
      );
    });

    if (personaId === 'default') return;

    let cancelled = false;
    fetch("/api/route/walking", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ stops: coords }),
    })
      .then((res) => (res.ok ? res.json() : null))
      .then((data: { segments?: RouteSegment[] } | null) => {
        if (cancelled || !data?.segments) return;
        const current = mapRef.current;
        if (!current) return;
        const real = data.segments.filter((s) => s.mode === "real");
        const approx = data.segments.filter((s) => s.mode === "approx");
        (current.getSource("route-real") as GeoJSONSource | undefined)?.setData(
          segmentsToFeatureCollection(real),
        );
        (
          current.getSource("route-approx") as GeoJSONSource | undefined
        )?.setData(segmentsToFeatureCollection(approx));
      })
      .catch(() => {
        // 接口不可用时保留示意虚线兜底
      });

    return () => {
      cancelled = true;
    };
  }, [ready, personaId]);

  const firstRun = useRef(true);
  useEffect(() => {
    const map = mapRef.current;
    if (!ready || !map) return;
    if (firstRun.current) {
      firstRun.current = false;
      return;
    }
    containerRef.current?.dispatchEvent(new Event("stopspin"));
    const coords = PERSONA_MAP[personaId].stops.map(
      (id) => POI_MAP[id].coordinates,
    );
    const lngs = coords.map((c) => c[0]);
    const lats = coords.map((c) => c[1]);
    map.fitBounds(
      [
        [Math.min(...lngs), Math.min(...lats)],
        [Math.max(...lngs), Math.max(...lats)],
      ],
      {
        padding: overlayPadding(map.getContainer().clientWidth),
        pitch: 60,
        bearing: map.getBearing(),
        duration: 1600,
        maxZoom: 16.3,
      },
    );
  }, [ready, personaId]);

  useEffect(() => {
    const map = mapRef.current;
    if (!ready || !map) return;
    poiElements.current.forEach((el, id) =>
      el.classList.toggle("is-selected", id === selectedPoiId),
    );
    if (!selectedPoiId) return;
    containerRef.current?.dispatchEvent(new Event("stopspin"));
    map.flyTo({
      center: POI_MAP[selectedPoiId].coordinates,
      zoom: 16.6,
      pitch: 66,
      duration: 1400,
      essential: false,
    });
  }, [ready, selectedPoiId]);

  /** 导航视图：绘制导航路线、更新用户位置标记、地图跟随行进方向 */
  useEffect(() => {
    const map = mapRef.current;
    if (!ready || !map) return;

    // 退出导航：隐藏标记、清掉路线、恢复常规路线
    if (!navigation) {
      const navEl = navMarkerRef.current?.getElement();
      if (navEl) navEl.style.display = "none";
      lastNavKey.current = "";
      (map.getSource("nav-path-real") as GeoJSONSource | undefined)?.setData(
        emptyFeatureCollection(),
      );
      (map.getSource("nav-path-approx") as GeoJSONSource | undefined)?.setData(
        emptyFeatureCollection(),
      );
      map.setLayoutProperty("route-real", "visibility", "visible");
      map.setLayoutProperty("route-real-glow", "visibility", "visible");
      map.setLayoutProperty("route-approx", "visibility", "visible");
      return;
    }

    // 导航中隐藏常规路线，只保留导航路线
    map.setLayoutProperty("route-real", "visibility", "none");
    map.setLayoutProperty("route-real-glow", "visibility", "none");
    map.setLayoutProperty("route-approx", "visibility", "none");

    // 1) 导航路线：真实段（蓝色实线）与示意段（橙色虚线）分开画，避免兜底直线冒充真实路线
    const realSegments = navigation.session.segments.filter(
      (segment) => segment.mode === "real",
    );
    const approxSegments = navigation.session.segments.filter(
      (segment) => segment.mode === "approx",
    );
    (map.getSource("nav-path-real") as GeoJSONSource | undefined)?.setData(
      segmentsToFeatureCollection(realSegments),
    );
    (map.getSource("nav-path-approx") as GeoJSONSource | undefined)?.setData(
      segmentsToFeatureCollection(approxSegments),
    );

    // 2) 用户位置 + 跟随
    const position = navigation.position;
    if (!position) return;

    const bearing = navigation.progress?.bearing ?? 0;
    const navKey = `${position[0].toFixed(6)},${position[1].toFixed(6)},${bearing.toFixed(0)}`;
    if (navKey === lastNavKey.current) return;
    lastNavKey.current = navKey;

    const marker = navMarkerRef.current;
    if (marker) {
      const navEl = marker.getElement();
      if (navEl) navEl.style.display = "";
      marker.setLngLat(position).setRotation(bearing);
    }

    // 3) 导航视角跟随：先停掉自动旋转，再用 padding 给底部导航条留出空间
    containerRef.current?.dispatchEvent(new Event("stopspin"));
    map.easeTo({
      center: position,
      zoom: 17.2,
      pitch: 55,
      bearing,
      padding: { top: 100, bottom: 280, left: 0, right: 0 },
      duration: 700,
      essential: true,
    });
  }, [ready, navigation]);

  return (
    <div className="absolute inset-0">
      <div ref={containerRef} className="h-full w-full" aria-label="栖霞山三维地形地图" role="application" />
      {!ready && !failed && (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center bg-background">
          <p className="font-serif text-sm tracking-[0.4em] text-muted-foreground">
            正在载入栖霞山地形
          </p>
        </div>
      )}
      {failed && (
        <div className="absolute inset-0 flex items-center justify-center bg-background p-6 text-center">
          <p className="max-w-sm text-sm leading-relaxed text-muted-foreground">
            当前设备不支持 WebGL
            三维地图，已切换为列表导览。可在下方“问栖霞”中继续查询路线与景点。
          </p>
        </div>
      )}
    </div>
  );
}
