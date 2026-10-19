"use client";

import { useTranslations } from "next-intl";
import { ClapperboardIcon, GalleryHorizontalIcon, TypeIcon } from "lucide-react";
import { BUCKETS } from "@/lib/config";
import type { ContentOption } from "@/lib/types";
import { cn } from "@/lib/utils";

export function mediaUrl(urls: Record<string, string>, path: string) {
  return urls[`${BUCKETS.deliverables}/${path}`];
}

/** Thumbnail of an option: first image/video, with a badge for carousels and reels */
export function OptionPreview({
  option,
  urls,
  className,
}: {
  option: Pick<ContentOption, "media" | "content_type" | "caption" | "reel_fields">;
  urls: Record<string, string>;
  className?: string;
}) {
  const t = useTranslations("delivery");
  const first = option.media[0];
  const url = first ? mediaUrl(urls, first.path) : undefined;
  const vertical = option.content_type === "story" || option.content_type === "reel";
  // text-only options (caption only, reel plan without video) don't need a tall photo frame
  const textOnly = !first;

  return (
    <div
      className={cn(
        "relative w-full overflow-hidden rounded-[12px] bg-muted",
        textOnly ? "min-h-40 pt-8" : vertical ? "aspect-[9/16] max-h-96" : "aspect-[4/5]",
        className,
      )}
    >
      {first && url ? (
        first.type === "video" ? (
          <video src={url} className="h-full w-full object-cover" muted playsInline preload="metadata" />
        ) : (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={url} alt="" loading="lazy" className="h-full w-full object-cover" />
        )
      ) : option.content_type === "reel" ? (
        <div className="flex h-full flex-col gap-2 p-4 text-left">
          <ClapperboardIcon className="size-8 text-primary" />
          <div className="font-bold">{t("reelPlan")}</div>
          <p className="line-clamp-[10] text-sm whitespace-pre-wrap text-muted-foreground">
            {option.reel_fields?.script}
          </p>
        </div>
      ) : (
        <div className="flex h-full flex-col gap-2 p-4 text-left">
          <TypeIcon className="size-6 text-primary" aria-hidden />
          <p className="line-clamp-[8] text-[16px] whitespace-pre-wrap">{option.caption}</p>
        </div>
      )}
      {option.media.length > 1 && (
        <span className="absolute top-2 right-2 flex items-center gap-1 rounded-full bg-black/60 px-2 py-0.5 text-[13px] font-bold text-white">
          <GalleryHorizontalIcon className="size-3.5" /> {option.media.length}
        </span>
      )}
      {option.content_type === "reel" && first && (
        <span className="absolute top-2 left-2 flex items-center gap-1 rounded-full bg-black/60 px-2 py-0.5 text-[13px] font-bold text-white">
          <ClapperboardIcon className="size-3.5" /> {t("reel")}
        </span>
      )}
    </div>
  );
}
