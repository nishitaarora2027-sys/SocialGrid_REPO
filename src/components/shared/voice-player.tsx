"use client";

import { useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { PauseIcon, PlayIcon } from "lucide-react";
import { cn } from "@/lib/utils";

function mmss(s: number) {
  if (!Number.isFinite(s)) return "0:00";
  const m = Math.floor(s / 60);
  return `${m}:${String(Math.floor(s % 60)).padStart(2, "0")}`;
}

export function VoicePlayer({ src, duration, className }: { src?: string; duration?: number; className?: string }) {
  const t = useTranslations("chat");
  const audio = useRef<HTMLAudioElement>(null);
  const [playing, setPlaying] = useState(false);
  const [current, setCurrent] = useState(0);
  const [total, setTotal] = useState(duration ?? 0);

  useEffect(() => {
    const a = audio.current;
    if (!a) return;
    const onTime = () => setCurrent(a.currentTime);
    const onMeta = () => Number.isFinite(a.duration) && setTotal(a.duration);
    const onEnd = () => {
      setPlaying(false);
      setCurrent(0);
    };
    a.addEventListener("timeupdate", onTime);
    a.addEventListener("loadedmetadata", onMeta);
    a.addEventListener("ended", onEnd);
    return () => {
      a.removeEventListener("timeupdate", onTime);
      a.removeEventListener("loadedmetadata", onMeta);
      a.removeEventListener("ended", onEnd);
    };
  }, []);

  const toggle = () => {
    const a = audio.current;
    if (!a) return;
    if (playing) a.pause();
    else void a.play();
    setPlaying(!playing);
  };

  const pct = total ? Math.min(100, (current / total) * 100) : 0;

  return (
    <div className={cn("flex min-w-56 items-center gap-3", className)}>
      <button
        type="button"
        onClick={toggle}
        disabled={!src}
        className="flex h-12 shrink-0 items-center gap-1.5 rounded-full bg-primary px-4 font-semibold text-primary-foreground disabled:opacity-50"
      >
        {playing ? <PauseIcon className="size-5" /> : <PlayIcon className="size-5" />}
        {playing ? t("pause") : t("play")}
      </button>
      <div className="flex-1">
        <div className="h-2 overflow-hidden rounded-full bg-black/10">
          <div className="h-full bg-primary transition-[width]" style={{ width: `${pct}%` }} />
        </div>
        <div className="mt-1 text-[13px] text-muted-foreground tabular-nums">
          {mmss(playing || current ? current : total)} {t("voiceNote")}
        </div>
      </div>
      {src && <audio ref={audio} src={src} preload="metadata" />}
    </div>
  );
}
