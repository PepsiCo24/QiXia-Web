/** Minimal browser-only AMap JS API 2.0 surface used by the map layer. */
export type AMapPosition =
  | [number, number]
  | { lng: number; lat: number }
  | { getLng(): number; getLat(): number };

export interface AMapLngLat {
  lng: number;
  lat: number;
  getLng(): number;
  getLat(): number;
}

export interface AMapPixel {
  x: number;
  y: number;
  getX(): number;
  getY(): number;
}

export interface AMapMarker {
  show(): void;
  hide(): void;
  setPosition(position: AMapPosition): void;
  setAngle(angle: number): void;
  setMap(map: AMapMap | null): void;
}

export interface AMapPolyline {
  show(): void;
  hide(): void;
  setMap(map: AMapMap | null): void;
}

export interface AMapHeatMap {
  setDataSet(data: {
    data: Array<{ lng: number; lat: number; count: number }>;
    max?: number;
  }): void;
  show(): void;
  hide(): void;
  setMap(map: AMapMap | null): void;
}

export interface AMapTileLayer {
  setMap(map: AMapMap | null): void;
  show(): void;
  hide(): void;
}

export type AMapOverlay = AMapMarker | AMapPolyline | AMapHeatMap | AMapTileLayer;

export interface AMapMap {
  on<Event = unknown>(type: string, handler: (event: Event) => void, context?: unknown): void;
  off<Event = unknown>(type: string, handler: (event: Event) => void, context?: unknown): void;
  destroy(): void;
  resize(): void;
  getZoom(): number;
  getPitch(): number;
  getRotation(): number;
  getCenter(): AMapLngLat;
  lngLatToContainer(position: AMapPosition): AMapPixel;
  setZoom(zoom: number, immediately?: boolean, duration?: number): void;
  setPitch(pitch: number, immediately?: boolean, duration?: number): void;
  setRotation(rotation: number, immediately?: boolean, duration?: number): void;
  setCenter(center: AMapPosition, immediately?: boolean, duration?: number): void;
  setZoomAndCenter(zoom: number, center: AMapPosition, immediately?: boolean, duration?: number): void;
  setFitView(overlays?: AMapOverlay[], immediately?: boolean, avoid?: number[], maxZoom?: number): void;
  add(overlays: AMapOverlay | AMapOverlay[]): void;
  remove(overlays: AMapOverlay | AMapOverlay[]): void;
}

export interface AMapSDK {
  Map: new (container: string | HTMLElement, options?: Record<string, unknown>) => AMapMap;
  Marker: new (options?: Record<string, unknown>) => AMapMarker;
  Polyline: new (options?: Record<string, unknown>) => AMapPolyline;
  HeatMap: new (map: AMapMap, options?: Record<string, unknown>) => AMapHeatMap;
  TileLayer: {
    Satellite: new (options?: Record<string, unknown>) => AMapTileLayer;
    RoadNet: new (options?: Record<string, unknown>) => AMapTileLayer;
  };
  plugin(plugins: string | string[], callback: () => void): void;
}

type SecurityConfig = { securityJsCode?: string; serviceHost?: string };
type AMapWindow = Window & {
  AMap?: AMapSDK;
  _AMapSecurityConfig?: SecurityConfig;
};

const LOAD_TIMEOUT_MS = 15_000;
let sdkPromise: Promise<AMapSDK> | undefined;

/**
 * Load one shared base-map SDK instance. Call from an effect or event
 * handler in the browser. A failed attempt is cleaned up so the next call retries.
 */
export function loadAMap(): Promise<AMapSDK> {
  if (typeof window === "undefined" || typeof document === "undefined") {
    return Promise.reject(new Error("AMap JS API can only be loaded in the browser."));
  }
  if (sdkPromise) return sdkPromise;

  const key = process.env.NEXT_PUBLIC_AMAP_KEY?.trim();
  const securityJsCode = process.env.NEXT_PUBLIC_AMAP_SECURITY_JS_CODE?.trim();
  const serviceHost = process.env.NEXT_PUBLIC_AMAP_SERVICE_HOST?.trim();
  if (!key || (!securityJsCode && !serviceHost)) {
    return Promise.reject(new Error(
      "请在 .env.local 配置 AMAP_KEY 和 AMAP_SECURITY_JS_CODE（或安全代理），然后重启开发服务。", 
    ));
  }

  const browser = window as AMapWindow;
  const previousSDK = browser.AMap;
  const previousSecurity = browser._AMapSecurityConfig;
  // A configured proxy takes precedence, avoiding a browser security code.
  const security: SecurityConfig = serviceHost ? { serviceHost } : { securityJsCode };
  browser._AMapSecurityConfig = security;

  sdkPromise = new Promise<AMapSDK>((resolve, reject) => {
    let script: HTMLScriptElement | undefined;
    let settled = false;
    const timer = window.setTimeout(() => {
      finish(new Error("高德地图 SDK 加载超时，请检查网络后重试。"));
    }, LOAD_TIMEOUT_MS);

    function finish(error?: Error, sdk?: AMapSDK) {
      if (settled) return;
      settled = true;
      window.clearTimeout(timer);
      if (script) {
        script.onload = null;
        script.onerror = null;
      }
      if (error) {
        script?.remove();
        if (!previousSDK) delete browser.AMap;
        if (browser._AMapSecurityConfig === security) {
          if (previousSecurity) browser._AMapSecurityConfig = previousSecurity;
          else delete browser._AMapSecurityConfig;
        }
        reject(error);
      } else if (sdk) {
        resolve(sdk);
      }
    }

    function ready() {
      if (settled) return;
      try {
        const sdk = browser.AMap;
        if (!sdk?.Map || !sdk.TileLayer?.Satellite || !sdk.TileLayer?.RoadNet) {
          finish(new Error("AMap JS API script loaded without the expected base-map SDK."));
          return;
        }
        finish(undefined, sdk);
      } catch (error) {
        finish(error instanceof Error ? error : new Error("AMap initialization failed."));
      }
    }

    try {
      if (previousSDK) {
        ready();
        return;
      }
      script = document.createElement("script");
      const url = new URL("https://webapi.amap.com/maps");
      url.searchParams.set("v", "2.0");
      url.searchParams.set("key", key);
      script.src = url.toString();
      script.async = true;
      script.dataset.amapLoader = "qixia";
      script.onload = ready;
      script.onerror = () => finish(new Error("高德地图 SDK 下载失败，请检查网络及 Key 的域名白名单（线上 pepsico24.github.io；本地 localhost / 127.0.0.1）。"));
      document.head.appendChild(script);
    } catch (error) {
      finish(error instanceof Error ? error : new Error("Failed to load AMap JS API."));
    }
  }).catch((error: unknown) => {
    sdkPromise = undefined;
    throw error;
  });
  return sdkPromise;
}
