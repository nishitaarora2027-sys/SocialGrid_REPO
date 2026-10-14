"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { SendIcon, Trash2Icon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { LIMITS } from "@/lib/config";

function pickMimeType() {
  if (typeof MediaRecorder === "undefined") return "";
  for (const type of ["audio/webm;codecs=opus", "audio/webm", "audio/mp4", "audio/ogg;codecs=opus"]) {
    if (MediaRecorder.isTypeSupported(type)) return type;
  }
  return "";
}

/**
 * Tap to start (from the composer), then "Send" or "Delete". Shows a timer and a moving
 * waveform. Stops by itself at 2 minutes.
 */
export function VoiceRecorder({
  onDone,
  onCancel,
  onError,
}: {
  onDone: (blob: Blob, seconds: number) => void;
  onCancel: () => void;
  onError: (reason: "denied" | "unsupported") => void;
}) {
  const t = useTranslations("chat");
  const recorder = useRef<MediaRecorder | null>(null);
  const chunks = useRef<Blob[]>([]);
  const stream = useRef<MediaStream | null>(null);
  const startedAt = useRef(0);
  const sendOnStop = useRef(false);
  const [seconds, setSeconds] = useState(0);

  const cleanup = () => {
    stream.current?.getTracks().forEach((tr) => tr.stop());
    stream.current = null;
  };

  const stop = useCallback((send: boolean) => {
    sendOnStop.current = send;
    if (recorder.current && recorder.current.state !== "inactive") recorder.current.stop();
    else if (!send) onCancel();
  }, [onCancel]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === "undefined") {
        onError("unsupported");
        return;
      }
      try {
        const s = await navigator.mediaDevices.getUserMedia({ audio: true });
        if (cancelled) {
          s.getTracks().forEach((tr) => tr.stop());
          return;
        }
        stream.current = s;
        const mimeType = pickMimeType();
        const r = new MediaRecorder(s, mimeType ? { mimeType } : undefined);
        recorder.current = r;
        r.ondataavailable = (e) => e.data.size && chunks.current.push(e.data);
        r.onstop = () => {
          cleanup();
          const secs = Math.round((Date.now() - startedAt.current) / 1000);
          if (sendOnStop.current && chunks.current.length) {
            onDone(new Blob(chunks.current, { type: (r.mimeType || mimeType || "audio/webm").split(";")[0] }), secs);
          } else {
            onCancel();
          }
        };
        startedAt.current = Date.now();
        r.start(250);
      } catch {
        onError("denied");
      }
    })();
    return () => {
      cancelled = true;
      if (recorder.current && recorder.current.state !== "inactive") {
        sendOnStop.current = false;
        recorder.current.stop();
      }
      cleanup();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const id = setInterval(() => {
      if (!startedAt.current) return;
      const s = Math.floor((Date.now() - startedAt.current) / 1000);
      setSeconds(s);
      if (s >= LIMITS.voiceMaxSeconds) stop(true);
    }, 250);
    return () => clearInterval(id);
  }, [stop]);

  const mm = Math.floor(seconds / 60);
  const ss = String(seconds % 60).padStart(2, "0");

  return (
    <div className="flex items-center gap-2">
      <Button variant="outline" onClick={() => stop(false)} aria-label={t("deleteRecording")} className="px-3">
        <Trash2Icon /> <span className="hidden sm:inline">{t("deleteRecording")}</span>
      </Button>
      <div className="flex h-12 flex-1 items-center gap-3 rounded-full bg-destructive/10 px-4">
        <span className="size-3 animate-pulse rounded-full bg-destructive" aria-hidden />
        <span className="font-bold text-destructive tabular-nums">
          {mm}:{ss}
        </span>
        <div className="flex h-6 flex-1 items-center gap-[3px] overflow-hidden" aria-hidden>
          {Array.from({ length: 24 }).map((_, i) => (
            <span
              key={i}
              className="wave-bar h-full w-[3px] rounded-full bg-destructive/70"
              style={{ animationDelay: `${(i * 97) % 900}ms` }}
            />
          ))}
        </div>
        <span className="sr-only">{t("recording")}</span>
      </div>
      <Button onClick={() => stop(true)} className="px-4">
        <SendIcon /> {t("send")}
      </Button>
    </div>
  );
}
