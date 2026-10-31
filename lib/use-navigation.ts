"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { LngLat } from "./qixia-data";
import { flattenSteps, type FlatNavStep, type RouteSegment } from "./amap";
import {
  buildRouteIndex,
  computeProgress,
  type NavProgress,
  type RouteIndex,
} from "./navigation";

export interface NavigationTarget {
  poiId: string;
  name: string;
}

export interface NavigationSession {
  target: NavigationTarget;
  destination: LngLat;
  segments: RouteSegment[];
  steps: FlatNavStep[];
  index: RouteIndex;
}

/** 取一次当前位置（用于规划起点） */
function getCurrentPosition(): Promise<LngLat> {
  return new Promise((resolve, reject) => {
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      reject(new Error("当前设备不支持定位"));
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => resolve([pos.coords.longitude, pos.coords.latitude]),
      (err) => reject(new Error(err.message || "定位失败，请允许获取位置")),
      { enableHighAccuracy: true, timeout: 12000, maximumAge: 0 },
    );
  });
}

export function useNavigation() {
  const [session, setSession] = useState<NavigationSession | null>(null);
  const [progress, setProgress] = useState<NavProgress | null>(null);
  const [position, setPosition] = useState<LngLat | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const watchRef = useRef<number | null>(null);
  /** 最新一次定位结果，重算时直接复用，避免再次等待 getCurrentPosition */
  const positionRef = useRef<LngLat | null>(null);

  // 导航中持续监听位置
  useEffect(() => {
    if (!session) return;
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      setError("当前设备不支持定位，无法导航");
      return;
    }

    const id = navigator.geolocation.watchPosition(
      (pos) => {
        // 成功拿到位置就清掉之前的定位错误
        setError(null);
        const next: LngLat = [pos.coords.longitude, pos.coords.latitude];
        positionRef.current = next;
        setPosition(next);
        setProgress(computeProgress(session.index, session.steps, next));
      },
      (err) => {
        setError(err.message || "定位中断，请检查定位权限");
      },
      { enableHighAccuracy: true, maximumAge: 1500, timeout: 15000 },
    );
    watchRef.current = id;

    return () => {
      navigator.geolocation.clearWatch(id);
      watchRef.current = null;
    };
  }, [session]);

  /** 开始导航：先取当前位置作为起点，再向高德要「当前位置 → 目的地」的路线 */
  const start = useCallback(
    async (target: NavigationTarget, destination: LngLat) => {
      setLoading(true);
      setError(null);
      try {
        // 已在导航中（偏航重算）直接用最新定位，避免再等一次 getCurrentPosition
        const origin = positionRef.current ?? (await getCurrentPosition());
        positionRef.current = origin;
        setPosition(origin);

        const res = await fetch("/api/route/walking", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ stops: [origin, destination] }),
        });
        if (!res.ok) throw new Error("路线规划失败，请稍后重试");
        const data = (await res.json()) as { segments?: RouteSegment[] };
        if (!data.segments?.length) throw new Error("没有可用路线");

        const steps = flattenSteps(data.segments);
        const index = buildRouteIndex(steps);
        setSession({
          target,
          destination,
          segments: data.segments,
          steps,
          index,
        });
        setProgress(computeProgress(index, steps, origin));
      } catch (e) {
        setError(e instanceof Error ? e.message : "导航启动失败");
        setSession(null);
      } finally {
        setLoading(false);
      }
    },
    [],
  );

  const stop = useCallback(() => {
    setSession(null);
    setProgress(null);
    setPosition(null);
    setError(null);
    positionRef.current = null;
  }, []);

  /**
   * 偏航自动重算：偏离路线持续 3 秒才重算，避免山区 GPS 抖动导致频繁重规划。
   */
  const reroutingRef = useRef(false);
  useEffect(() => {
    if (!session || !progress?.isOffRoute || reroutingRef.current) return;
    const { target, destination } = session;
    const timer = setTimeout(() => {
      reroutingRef.current = true;
      void start(target, destination).finally(() => {
        reroutingRef.current = false;
      });
    }, 3000);
    return () => clearTimeout(timer);
  }, [session, progress?.isOffRoute, start]);

  return { session, progress, position, error, loading, start, stop };
}
