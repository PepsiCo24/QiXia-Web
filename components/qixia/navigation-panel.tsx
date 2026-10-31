"use client";

import { useEffect, useRef } from "react";
import { ArrowUp, Volume2, VolumeX, X } from "lucide-react";
import type { NavProgress } from "@/lib/navigation";
import { formatDistance, formatRemainingTime } from "@/lib/navigation";
import type { NavigationSession } from "@/lib/use-navigation";
import { cn } from "@/lib/utils";

interface NavigationPanelProps {
  session: NavigationSession;
  progress: NavProgress | null;
  error: string | null;
  voiceOn: boolean;
  onToggleVoice: () => void;
  onExit: () => void;
}

export function NavigationPanel({
  session,
  progress,
  error,
  voiceOn,
  onToggleVoice,
  onExit,
}: NavigationPanelProps) {
  const current = progress?.current;
  const next = progress?.next;
  const remaining = progress?.remaining ?? 0;
  const lastSpoken = useRef("");

  // 进入新指令时语音播报一次
  useEffect(() => {
    const text = current?.instruction?.trim();
    if (!voiceOn || !text || text === lastSpoken.current) return;
    lastSpoken.current = text;
    if (typeof window === "undefined" || !window.speechSynthesis) return;
    try {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = "zh-CN";
      utterance.rate = 1;
      window.speechSynthesis.speak(utterance);
    } catch {
      // 浏览器不支持语音时静默降级
    }
  }, [voiceOn, current?.instruction]);

  return (
    <div className="pointer-events-none absolute inset-x-0 bottom-0 z-30 px-3 pb-3 sm:pb-4">
      <div className="pointer-events-auto mx-auto max-w-md overflow-hidden rounded-2xl border border-primary/30 bg-background/95 shadow-[0_-8px_32px_rgba(0,0,0,0.55)] backdrop-blur">
        <div className="flex items-start gap-3 p-4">
          <span className="mt-0.5 flex size-11 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground">
            <ArrowUp className="size-5" aria-hidden="true" />
          </span>

          <div className="min-w-0 flex-1">
            <p className="text-base leading-snug font-medium text-foreground">
              {current?.instruction || "正在定位…"}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              {formatDistance(remaining)} · {formatRemainingTime(remaining)}
              {progress?.isOffRoute ? " · 已偏离路线" : ""}
            </p>
            {error && (
              <p className="mt-1 text-xs leading-relaxed text-destructive">
                {error}
              </p>
            )}
          </div>

          <button
            type="button"
            onClick={onExit}
            aria-label="结束导航"
            className="flex size-8 shrink-0 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
          >
            <X className="size-4" aria-hidden="true" />
          </button>
        </div>

        {next && (
          <div className="border-t border-border/60 px-4 py-2.5 text-xs leading-relaxed text-muted-foreground">
            接下来：{next.instruction}
          </div>
        )}

        <div className="flex items-center justify-between border-t border-border/60 px-4 py-2">
          <button
            type="button"
            onClick={onToggleVoice}
            aria-pressed={voiceOn}
            className={cn(
              "flex items-center gap-1.5 rounded-md px-2 py-1 text-xs transition-colors",
              voiceOn
                ? "text-primary"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            {voiceOn ? (
              <Volume2 className="size-3.5" aria-hidden="true" />
            ) : (
              <VolumeX className="size-3.5" aria-hidden="true" />
            )}
            语音{voiceOn ? "开" : "关"}
          </button>
          <span className="text-[11px] text-muted-foreground">
            前往 {session.target.name}
          </span>
        </div>
      </div>
    </div>
  );
}
