"use client";

import { useEffect, useRef, useState } from "react";
import { loadAMap, type AMapMap, type AMapSDK, type AMapMarker, type AMapPolyline, type AMapHeatMap } from "@/lib/amap-js";
import { POIS, POI_MAP, PERSONA_MAP, DEVICES, TRAFFIC_NODES, SAFETY_ALERTS, buildHeatFeatures } from "@/lib/qixia-data";
import type { RouteSegment } from "@/lib/amap";
import type { NavProgress } from "@/lib/navigation";
import type { NavigationSession } from "@/lib/use-navigation";
import { QIXIA_CENTER, type LngLat, type PersonaId } from "@/lib/qixia-data";
import "./amap-view.css";

export interface LayerState { heat: boolean; devices: boolean; traffic: boolean; alerts: boolean }
export interface NavigationView { session: NavigationSession; progress: NavProgress | null; position: LngLat | null }
interface MapViewProps {
  layers: LayerState;
  hour: number;
  personaId: PersonaId;
  selectedPoiId: string | null;
  onSelectPoi: (id: string) => void;
  navigation?: NavigationView | null;
}
const DEFAULT_VIEW = { zoom: 16, pitch: 60, rotation: 24 };

export function MapView({ layers, hour, personaId, selectedPoiId, onSelectPoi, navigation }: MapViewProps) {
  const sdkRef = useRef<AMapSDK | null>(null);
  const selectRef = useRef(onSelectPoi);
  selectRef.current = onSelectPoi;
  const poiRef = useRef<Array<{ id: string; marker: AMapMarker; button: HTMLButtonElement }>>([]);
  const heatRef = useRef<AMapHeatMap | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<AMapMap | null>(null);
  const stopSpinRef = useRef<() => void>(() => {});
  const [ready, setReady] = useState(false);
  const [failure, setFailure] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);
  const [overhead, setOverhead] = useState(false);

  useEffect(() => {
    const host = containerRef.current;
    if (!host) return;
    let cancelled = false;
    let map: AMapMap | null = null;
    let observer: ResizeObserver | undefined;
    let overlayObserver: MutationObserver | undefined;
    let frame = 0;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const stop = () => { cancelAnimationFrame(frame); frame = 0; };
    stopSpinRef.current = stop;
    setReady(false);
    setFailure(null);
    host.dataset.mapReady = "false";
    host.addEventListener("wheel", stop, { passive: true });
    host.addEventListener("pointerdown", stop);
    host.addEventListener("keydown", stop);
    host.addEventListener("stopspin", stop);

    loadAMap().then(sdk => {
      if (cancelled) return;
      map = new sdk.Map(host, {
        viewMode: "3D", terrain: true,
        center: QIXIA_CENTER, ...DEFAULT_VIEW, zooms: [13, 20],
        layers: [new sdk.TileLayer.Satellite(), new sdk.TileLayer.RoadNet()],
        showBuildingBlock: true, features: ["bg", "road", "building", "point"],
        pitchEnable: true, rotateEnable: true, dragEnable: true, zoomEnable: true,
        scrollWheel: true, doubleClickZoom: true, touchZoom: true, touchZoomCenter: 1,
        keyboardEnable: true, animateEnable: true, resizeEnable: true,
      });
      mapRef.current = map;
      sdkRef.current = sdk;
      const publish = () => {
        if (!map || cancelled) return;
        host.dataset.zoom = map.getZoom().toFixed(2);
        host.dataset.bearing = (-map.getRotation()).toFixed(2);
        host.dataset.pitch = map.getPitch().toFixed(2);
        const center = map.getCenter();
        host.dataset.center = `${center.lng},${center.lat}`;
        setOverhead(map.getPitch() < 10);
      };
      ["rotatechange", "pitchchange", "moveend", "zoomend"].forEach(event => map?.on(event, publish));
      observer = new ResizeObserver(() => map?.resize());
      observer.observe(host);
      overlayObserver = new MutationObserver(() => map?.resize());
      const section = host.closest("section");
      if (section) overlayObserver.observe(section, { attributes: true });
      map.on("error", () => {
        if (!cancelled) { stop(); setFailure("高德地图加载失败，请检查 Key、域名白名单和网络后重试。"); }
      });
      map.on("complete", () => {
        if (!map || cancelled || host.dataset.mapReady === "true") return;
        clearTimeout(timer);
        host.dataset.mapReady = "true";
        poiRef.current = POIS.map(poi => {
          const button = document.createElement("button");
          button.type = "button";
          button.className = "poi-marker";
          button.setAttribute("aria-label", `查看${poi.name}`);
          const image = document.createElement("img");
          image.className = "poi-thumb";
          image.src = `${process.env.NEXT_PUBLIC_BASE_PATH || ""}${poi.image}`;
          image.alt = "";
          const label = document.createElement("span");
          label.className = "poi-label";
          label.textContent = poi.name;
          const dot = document.createElement("span");
          dot.className = "poi-dot";
          button.append(image, label, dot);
          button.onclick = () => { stop(); selectRef.current(poi.id); };
          const marker = new sdk.Marker({ map, position: poi.coordinates, content: button, anchor: "bottom-center", zIndex: 120 });
          return { id: poi.id, marker, button };
        });
        publish();
        setReady(true);
        setFailure(null);
        if (!window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
          let previous = 0;
          const spin = (now: number) => {
            if (!map || cancelled) return;
            if (previous && now - previous >= 33) {
              map.setRotation(map.getRotation() + (now - previous) * 0.0015, true);
              previous = now;
            }
            if (!previous) previous = now;
            frame = requestAnimationFrame(spin);
          };
          frame = requestAnimationFrame(spin);
        }
      });
      timer = setTimeout(() => {
        if (!cancelled && host.dataset.mapReady !== "true") setFailure("高德地图响应超时，请检查网络、Key 和安全密钥后重试。");
      }, 25000);
    }).catch(error => {
      if (!cancelled) setFailure(error instanceof Error ? error.message : "高德地图加载失败，请稍后重试。");
    });

    return () => {
      cancelled = true;
      stop();
      clearTimeout(timer);
      observer?.disconnect();
      overlayObserver?.disconnect();
      host.removeEventListener("wheel", stop);
      host.removeEventListener("pointerdown", stop);
      host.removeEventListener("keydown", stop);
      host.removeEventListener("stopspin", stop);
      heatRef.current?.setMap(null);
      heatRef.current = null;
      poiRef.current = [];
      sdkRef.current = null;
      map?.destroy();
      if (mapRef.current === map) mapRef.current = null;
      host.dataset.mapReady = "false";
    };
  }, [attempt]);

  useEffect(() => {
    const map = mapRef.current;
    if (!ready || !map) return;
    const stops = PERSONA_MAP[personaId].stops;
    poiRef.current.forEach(({ id, button }) => {
      button.classList.toggle("is-selected", id === selectedPoiId);
      button.classList.toggle("is-on-route", stops.includes(id));
      button.dataset.order = stops.includes(id) ? String(stops.indexOf(id) + 1) : "";
    });
    const poi = selectedPoiId ? POI_MAP[selectedPoiId] : null;
    if (poi) { stopSpinRef.current(); map.setZoomAndCenter(Math.max(17, map.getZoom()), poi.coordinates); }
  }, [ready, personaId, selectedPoiId]);

  useEffect(() => {
    const map = mapRef.current, sdk = sdkRef.current;
    if (!ready || !map || !sdk) return;
    const markers: AMapMarker[] = [];
    const add = (position: LngLat, text: string, title: string) => {
      const node = document.createElement("span");
      node.className = "traffic-marker";
      node.textContent = text;
      node.title = title;
      markers.push(new sdk.Marker({ map, position, content: node, anchor: "center", zIndex: 110 }));
    };
    if (layers.devices) DEVICES.forEach(d => add(d.coordinates, d.status === "online" ? "●" : "⚠", `${d.type} · ${d.status}`));
    if (layers.traffic) TRAFFIC_NODES.forEach(n => add(n.coordinates, n.kind === "parking" ? "P" : "巴", `${n.name} · ${n.note}`));
    if (layers.alerts) SAFETY_ALERTS.forEach(a => add(a.coordinates, "⚠", `${a.title}：${a.detail}`));
    return () => markers.forEach(marker => marker.setMap(null));
  }, [ready, layers.devices, layers.traffic, layers.alerts]);

  useEffect(() => {
    const map = mapRef.current, sdk = sdkRef.current;
    if (!ready || !map || !sdk) return;
    let cancelled = false;
    if (!layers.heat) { heatRef.current?.hide(); return; }
    sdk.plugin("AMap.HeatMap", () => {
      if (cancelled || mapRef.current !== map) return;
      const heat = heatRef.current || new sdk.HeatMap(map, { radius: 32, opacity: [0, 0.7] });
      heatRef.current = heat;
      heat.setDataSet({ data: buildHeatFeatures(hour).features.map(f => ({ lng: f.geometry.coordinates[0], lat: f.geometry.coordinates[1], count: f.properties.w * 100 })), max: 100 });
      heat.show();
    });
    return () => { cancelled = true; };
  }, [ready, layers.heat, hour]);

  useEffect(() => {
    const map = mapRef.current, sdk = sdkRef.current;
    if (!ready || !map || !sdk || navigation) return;
    const controller = new AbortController();
    const stops = PERSONA_MAP[personaId].stops.map(id => POI_MAP[id].coordinates);
    let lines: AMapPolyline[] = [];
    const draw = (segments: Array<{ coordinates: LngLat[]; mode: string }>) => {
      lines.forEach(line => line.setMap(null));
      lines = segments.filter(s => s.coordinates.length > 1).map(s => new sdk.Polyline({ map, path: s.coordinates, strokeColor: "#e6b85c", strokeWeight: 5, strokeOpacity: 0.9, strokeStyle: s.mode === "approx" ? "dashed" : "solid", zIndex: 70 }));
    };
    draw([{ coordinates: stops, mode: "approx" }]);
    if (process.env.NEXT_PUBLIC_GITHUB_PAGES !== "true") {
      fetch(`${process.env.NEXT_PUBLIC_BASE_PATH || ""}/api/route/walking`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ stops }), signal: controller.signal })
        .then(r => r.ok ? r.json() : null)
        .then((data: { segments?: RouteSegment[] } | null) => { if (!controller.signal.aborted && data?.segments?.length) draw(data.segments); })
        .catch(() => {});
    }
    return () => { controller.abort(); lines.forEach(line => line.setMap(null)); };
  }, [ready, personaId, navigation?.session]);

  useEffect(() => {
    const map = mapRef.current, sdk = sdkRef.current;
    if (!ready || !map || !sdk || !navigation) return;
    stopSpinRef.current();
    const lines = navigation.session.segments.map(s => new sdk.Polyline({ map, path: s.coordinates, strokeColor: s.mode === "approx" ? "#e6b85c" : "#42b8ef", strokeWeight: 7, strokeStyle: s.mode === "approx" ? "dashed" : "solid", zIndex: 90 }));
    return () => lines.forEach(line => line.setMap(null));
  }, [ready, navigation?.session]);

  useEffect(() => {
    const map = mapRef.current, sdk = sdkRef.current;
    if (!ready || !map || !sdk || !navigation?.position) return;
    const node = document.createElement("span");
    node.className = "nav-user-marker";
    node.setAttribute("aria-label", "当前位置");
    const marker = new sdk.Marker({ map, position: navigation.position, content: node, anchor: "center", angle: navigation.progress?.bearing || 0, zIndex: 200 });
    return () => marker.setMap(null);
  }, [ready, navigation?.position, navigation?.progress?.bearing]);

  const act = (action: (map: AMapMap) => void) => { const map = mapRef.current; if (map) { stopSpinRef.current(); action(map); } };
  return (
    <div className="absolute inset-0 qixia-amap-view">
      <div ref={containerRef} className="h-full w-full" tabIndex={0} aria-label="栖霞山高德三维地图" role="application" />
      {ready && !failure && <div className="qixia-amap-controls glass-panel" aria-label="地图视角控制">
        <button type="button" title="放大地图" aria-label="放大地图" onClick={()=>act(m=>m.setZoom(Math.min(20,m.getZoom()+1)))}>+</button>
        <button type="button" title="缩小地图" aria-label="缩小地图" onClick={()=>act(m=>m.setZoom(Math.max(13,m.getZoom()-1)))}>−</button>
        <button type="button" title="朝向正北" aria-label="朝向正北" onClick={()=>act(m=>m.setRotation(0))}>北</button>
        <button type="button" title="回到景区视角" aria-label="重置地图视角，回到景区全景" onClick={()=>act(m=>{m.setPitch(DEFAULT_VIEW.pitch);m.setRotation(DEFAULT_VIEW.rotation);m.setZoomAndCenter(DEFAULT_VIEW.zoom,QIXIA_CENTER,false,1200);})}>⌖</button>
        <button type="button" title={overhead ? "切换三维视角" : "切换俯视视角"} aria-label={overhead ? "切换三维视角" : "切换俯视视角"} aria-pressed={overhead} onClick={()=>act(m=>m.setPitch(overhead ? 60 : 0, true))}>{overhead ? "三维" : "俯视"}</button>
      </div>}
      {!ready && !failure && <div className="pointer-events-none absolute inset-0 flex items-center justify-center bg-background"><p className="font-serif text-sm tracking-[0.4em] text-muted-foreground">正在载入栖霞山高德三维地图</p></div>}
      {failure && <div className="absolute inset-0 flex items-center justify-center bg-background p-6 text-center"><div className="max-w-sm text-sm leading-relaxed text-muted-foreground" role="alert"><p>{failure}</p><button type="button" className="outline-button mt-4" onClick={()=>setAttempt(n=>n+1)}>重新加载地图</button></div></div>}

    </div>
  );
}
