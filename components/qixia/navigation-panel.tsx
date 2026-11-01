"use client";

import { useLanguage } from "./language-provider";
import { localizeText, translatePoiName } from "@/lib/i18n";
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
  const { locale, t } = useLanguage();
  const current = progress?.current;
  const next = progress?.next;
  const remaining = progress?.remaining ?? 0;
  const lastSpoken = useRef("");

  // 进入新指令时语音播报一次
  useEffect(() => {
    const text = current?.instruction ? localizeText(current.instruction.trim(), locale) : "";
    if (!voiceOn || !text || `${locale}:${text}` === lastSpoken.current) return;
    lastSpoken.current = `${locale}:${text}`;
    if (typeof window === "undefined" || !window.speechSynthesis) return;
    try {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = /[\u3400-\u9fff]/.test(text) ? "zh-CN" : locale === "en" ? "en-US" : "zh-CN";
      utterance.rate = 1;
      window.speechSynthesis.speak(utterance);
    } catch {
      // 浏览器不支持语音时静默降级
    }
  }, [voiceOn, current?.instruction, locale]);

  return (
    <div className="pointer-events-none absolute inset-x-0 bottom-0 z-30 px-3 pb-3 sm:pb-4">
      <div className="pointer-events-auto mx-auto max-w-md overflow-hidden rounded-2xl border border-primary/30 bg-background/95 shadow-[0_-8px_32px_rgba(0,0,0,0.55)] backdrop-blur">
        <div className="flex items-start gap-3 p-4">
          <span className="mt-0.5 flex size-11 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground">
            <ArrowUp className="size-5" aria-hidden="true" />
          </span>

          <div className="min-w-0 flex-1">
            <p className="text-base leading-snug font-medium text-foreground">
              {current?.instruction ? localizeText(current.instruction, locale) : t("正在定位…", "Finding your location…")}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              {locale === "en" ? (remaining >= 1000 ? `${(remaining / 1000).toFixed(1)} km` : `${Math.round(remaining)} m`) : formatDistance(remaining)} · {locale === "en" ? `${Math.max(1, Math.ceil(remaining / 1.2 / 60))} min` : formatRemainingTime(remaining)}
              {progress?.isOffRoute ? t(" · 已偏离路线", " · Off route") : ""}
            </p>
            {current?.mode === "approx" && (
              <p className="mt-1 text-xs leading-relaxed text-[#e8a33c]">
                {t("这一段暂无精确路网数据（图中不画线，避免误导），请以现场步道标识为准", "Precise path data is unavailable for this section; no line is shown to avoid misleading you. Follow on-site trail signs.")}
              </p>
            )}
            {current?.mode === "real" && current.detourRatio > 3 && (
              <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                {t(`这段直线只有约 ${formatDistance(current.straightDistance)}，但高德需绕行约 ${formatDistance(Math.round(current.straightDistance * current.detourRatio))}（该处未收录步道）。现场可能有更近的步道，请以标识为准`, `This section is about ${Math.round(current.straightDistance)} m in a straight line, but Amap routes around ${Math.round(current.straightDistance * current.detourRatio)} m because a trail is missing from its data. A shorter trail may exist on site; follow signs.`)}
              </p>
            )}
            {error && (
              <p className="mt-1 text-xs leading-relaxed text-destructive">
                {localizeText(error, locale)}
              </p>
            )}
          </div>

          <button
            type="button"
            onClick={onExit}
            aria-label={t("结束导航", "End navigation")}
            className="flex size-8 shrink-0 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
          >
            <X className="size-4" aria-hidden="true" />
          </button>
        </div>

        {next && (
          <div className="border-t border-border/60 px-4 py-2.5 text-xs leading-relaxed text-muted-foreground">
            {t("接下来：", "Next: ")}{localizeText(next.instruction, locale)}
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
            {voiceOn ? t("语音开", "Voice on") : t("语音关", "Voice off")}
          </button>
          <span className="text-[11px] text-muted-foreground">
            {t("前往", "To")} {translatePoiName(session.target.name, locale)}
          </span>
        </div>
      </div>
    </div>
  );
}
