import { CameraIcon, CheckIcon, MicIcon, PlayIcon, SparklesIcon } from "lucide-react";
import { cn } from "@/lib/utils";

// Illustrations for the landing page. They are pictures of the product, so they're hidden from screen readers.

export const SAMPLE_POSTS = [
  { key: "diwali", bg: "linear-gradient(160deg,#4A1529 0%,#8A3F52 55%,#D88A55 100%)", accent: "#F4D79B", kicker: "Diwali Glow", big: "20%", line: "off on all facials", foot: "Glow Beauty" },
  { key: "special", bg: "linear-gradient(160deg,#7A2E0E 0%,#C7561E 50%,#F0A33A 100%)", accent: "#FFE7B0", kicker: "Today's special", big: "₹220", line: "Paneer tikka thali", foot: "Sharma Rasoi" },
  { key: "arrivals", bg: "linear-gradient(160deg,#0F3B31 0%,#1F6B57 55%,#7FC4A8 100%)", accent: "#D8F3E7", kicker: "New arrivals", big: "Festive", line: "kurtas are in", foot: "Kavya Fashion" },
  { key: "chai", bg: "linear-gradient(160deg,#1C1F4A 0%,#3E3F9A 55%,#8E8BE0 100%)", accent: "#E4E2FF", kicker: "Weekend deal", big: "2+1", line: "chai on the house", foot: "Chai Point" },
  { key: "review", bg: "linear-gradient(160deg,#F7EEDB 0%,#F3E3E6 100%)", accent: "#8A3F52", kicker: "Customer love", big: "“Best in town”", line: "— Meera, regular since 2019", foot: "Glow Beauty", dark: true },
  { key: "launch", bg: "linear-gradient(160deg,#111 0%,#2B2B2B 100%)", accent: "#F4D79B", kicker: "Now open", big: "Sunday", line: "brunch, 10 AM – 2 PM", foot: "The Corner Café" },
] as const;

export function PostTile({ post, className, size = "md" }: { post: (typeof SAMPLE_POSTS)[number]; className?: string; size?: "sm" | "md" | "lg" }) {
  const dark = "dark" in post && post.dark;
  return (
    <div
      aria-hidden
      className={cn("relative flex aspect-[4/5] flex-col justify-between overflow-hidden rounded-[18px]", size === "sm" ? "p-3" : "p-4 lg:p-5", className)}
      style={{ background: post.bg, color: dark ? "#3B1C26" : "#fff" }}
    >
      <span className="absolute -top-14 -right-14 size-44 rounded-full opacity-30 blur-2xl" style={{ background: post.accent }} />
      <span className={cn("relative flex items-center gap-1.5 font-bold tracking-[0.18em] uppercase", size === "sm" ? "text-[9px]" : "text-[11px]")}>
        <SparklesIcon className={size === "sm" ? "size-2.5" : "size-3"} /> {post.kicker}
      </span>
      <div className="relative">
        <div
          className={cn("leading-none font-bold tracking-tight", size === "sm" ? "text-[26px]" : size === "lg" ? "text-[56px]" : "text-[44px]")}
          style={{ color: post.accent }}
        >
          {post.big}
        </div>
        <div className={cn("mt-1 leading-tight font-bold", size === "sm" ? "text-[12px]" : "text-[18px]")}>{post.line}</div>
      </div>
      <span className={cn("relative font-semibold opacity-80", size === "sm" ? "text-[9px]" : "text-[12px]")}>{post.foot}</span>
    </div>
  );
}

const WAVE = [5, 11, 17, 9, 21, 14, 7, 18, 23, 12, 6, 15, 20, 9, 5, 13, 18, 8];

export function Waveform({ className, color = "currentColor" }: { className?: string; color?: string }) {
  return (
    <span aria-hidden className={cn("flex items-center gap-[2.5px]", className)}>
      {WAVE.map((h, i) => (
        <span key={i} className="w-[2.5px] rounded-full" style={{ height: h, background: color }} />
      ))}
    </span>
  );
}

/** The real customer chat, as a phone */
export function PhoneMock({ labels }: { labels: { post: string; readyBy: string; reply: string; ready: string; choose: string; type: string } }) {
  return (
    <div aria-hidden className="relative w-[290px] rounded-[48px] bg-[#1b1b1d] p-[10px] shadow-[0_50px_100px_-30px_rgba(30,25,20,.45)] lg:w-[320px]">
      <div className="relative h-[600px] overflow-hidden rounded-[38px] bg-[#FAF7F2] lg:h-[660px]">
        <div className="absolute top-2.5 left-1/2 h-[26px] w-[92px] -translate-x-1/2 rounded-full bg-[#1b1b1d]" />
        {/* header */}
        <div className="flex items-center gap-2.5 border-b border-[#E4DED4] bg-white px-4 pt-11 pb-2.5">
          <span className="flex size-8 items-center justify-center rounded-[10px] bg-[#F3E3E6] text-[11px] font-bold text-[#8A3F52]">GB</span>
          <span className="text-[14px] font-bold text-[#24211D]">Glow Beauty</span>
          <span className="ml-auto rounded-full border border-[#E4DED4] px-2 py-0.5 text-[10px] font-semibold text-[#5E574F]">EN · हिं</span>
        </div>
        {/* status */}
        <div className="mx-3 mt-2.5 rounded-[14px] bg-[#F7EEDB] px-3 py-2">
          <div className="flex justify-between text-[11px]">
            <span className="font-bold text-[#24211D]">{labels.post}</span>
            <span className="font-semibold text-[#6B4E1E]">{labels.readyBy}</span>
          </div>
          <div className="mt-1.5 grid grid-cols-3 gap-1">
            <span className="h-1 rounded bg-[#B8873A]" />
            <span className="h-1 rounded bg-[#B8873A]" />
            <span className="h-1 rounded bg-[#B8873A]" />
          </div>
        </div>
        {/* messages */}
        <div className="space-y-2 px-3 pt-3">
          <div className="ml-auto flex w-fit items-center gap-2 rounded-[16px_16px_5px_16px] bg-[#E3ECE7] px-2.5 py-2 text-[#2F5D50]">
            <span className="flex size-6 items-center justify-center rounded-full bg-[#2F5D50] text-white">
              <PlayIcon className="size-3 fill-current" />
            </span>
            <Waveform color="#2F5D50" />
            <span className="text-[10px] font-semibold">0:12</span>
          </div>
          <div className="ml-auto flex w-fit gap-1">
            {["#F3E3E6", "#F7EEDB", "#E3ECE7"].map((c) => (
              <span key={c} className="flex size-11 items-center justify-center rounded-[9px]" style={{ background: c }}>
                <CameraIcon className="size-3.5 text-[#8A8177]" />
              </span>
            ))}
          </div>
          <div className="w-fit max-w-[85%] rounded-[16px_16px_16px_5px] border border-[#E4DED4] bg-white px-2.5 py-2 text-[12px] leading-snug text-[#24211D]">
            {labels.reply}
            <div className="pt-0.5 text-[10px] text-[#5E574F]">Priya · SocialGrid</div>
          </div>
          <div className="rounded-[18px] border border-[#E4DED4] bg-white p-2.5">
            <div className="mb-2 text-[13px] font-bold text-[#24211D]">{labels.ready}</div>
            <PostTile post={SAMPLE_POSTS[0]} size="sm" className="rounded-[12px]" />
            <div className="mt-2 flex justify-center gap-1">
              <span className="size-1.5 rounded-full bg-[#2F5D50]" />
              <span className="size-1.5 rounded-full bg-[#CFC7BA]" />
              <span className="size-1.5 rounded-full bg-[#CFC7BA]" />
            </div>
            <div className="mt-2 flex h-9 items-center justify-center rounded-[11px] bg-[#2F5D50] text-[12px] font-bold text-white">{labels.choose}</div>
          </div>
        </div>
        {/* composer */}
        <div className="absolute inset-x-0 bottom-0 flex items-center gap-1.5 bg-[#FAF7F2] px-3 pt-2 pb-5">
          <span className="flex size-8 items-center justify-center rounded-full border border-[#CFC7BA] bg-white">
            <CameraIcon className="size-3.5 text-[#24211D]" />
          </span>
          <span className="flex h-8 flex-1 items-center rounded-full border border-[#CFC7BA] bg-white px-3 text-[11px] text-[#8A8177]">{labels.type}</span>
          <span className="flex size-9 items-center justify-center rounded-full bg-[#2F5D50] text-white">
            <MicIcon className="size-4" />
          </span>
        </div>
      </div>
    </div>
  );
}

export function WeekVisual({ days }: { days: string[] }) {
  const filled: Record<number, number> = { 0: 0, 2: 2, 4: 1, 5: 3 };
  return (
    <div aria-hidden className="grid grid-cols-7 gap-2">
      {days.map((d, i) => (
        <div key={d} className="flex flex-col items-center gap-1.5">
          <span className={cn("text-[12px] font-semibold", i === 1 ? "text-primary" : "text-ink-muted")}>{d}</span>
          {i in filled ? (
            <PostTile post={SAMPLE_POSTS[filled[i]]} size="sm" className="w-full rounded-[10px] [&>*:not(:first-child)]:hidden" />
          ) : (
            <span className={cn("aspect-[4/5] w-full rounded-[10px] border-[1.5px] border-dashed", i === 1 ? "border-primary" : "border-line-strong")} />
          )}
        </div>
      ))}
    </div>
  );
}

export function ReadyVisual({ post, readyBy, steps }: { post: string; readyBy: string; steps: string[] }) {
  return (
    <div aria-hidden className="rounded-[18px] bg-status-soft px-4 py-3.5">
      <div className="flex items-baseline justify-between gap-3">
        <span className="text-[16px] font-bold">{post}</span>
        <span className="text-[15px] font-semibold text-status-ink">{readyBy}</span>
      </div>
      <div className="mt-2.5 grid grid-cols-3 gap-1">
        <span className="h-1.5 rounded bg-status" />
        <span className="h-1.5 rounded bg-status" />
        <span className="h-1.5 rounded bg-status-track" />
      </div>
      <div className="mt-2 grid grid-cols-3 gap-1 text-[13px] text-status-ink">
        {steps.map((s, i) => (
          <span key={s} className={i === 1 ? "font-bold text-ink" : ""}>
            {s}
          </span>
        ))}
      </div>
    </div>
  );
}

export function ChangesVisual({ chips, count }: { chips: string[]; count: string }) {
  return (
    <div aria-hidden className="space-y-3">
      <div className="flex flex-wrap gap-2">
        {chips.map((c, i) => (
          <span key={c} className={cn("rounded-full border px-3.5 py-1.5 text-[15px] font-semibold", i === 0 ? "border-primary bg-primary text-on-primary" : "border-line bg-surface")}>
            {c}
          </span>
        ))}
      </div>
      <span className="inline-flex items-center gap-1.5 text-[14px] font-semibold text-ink-muted">
        <CheckIcon className="size-4 text-primary" /> {count}
      </span>
    </div>
  );
}
