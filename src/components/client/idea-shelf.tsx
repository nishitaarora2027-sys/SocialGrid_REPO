"use client";

import { useLocale, useTranslations } from "next-intl";
import { MicIcon } from "lucide-react";
import type { Locale, QuickStartCard } from "@/lib/types";

// Each idea is shown as a tiny poster of the post it leads to, not as an icon
const POSTERS: Record<string, { bg: string; accent: string; dark?: boolean }> = {
  new_offer: { bg: "linear-gradient(160deg,#4A1529,#8A3F52 55%,#D88A55)", accent: "#F4D79B" },
  todays_special: { bg: "linear-gradient(160deg,#7A2E0E,#C7561E 50%,#F0A33A)", accent: "#FFE7B0" },
  festival_post: { bg: "linear-gradient(160deg,#2B0F3A,#7A2D6B 55%,#FF8A5B)", accent: "#FFD38A" },
  menu_spotlight: { bg: "linear-gradient(160deg,#0F3B31,#1F6B57 55%,#7FC4A8)", accent: "#D8F3E7" },
  new_service: { bg: "linear-gradient(160deg,#0F3B31,#1F6B57 55%,#7FC4A8)", accent: "#D8F3E7" },
  before_after: { bg: "linear-gradient(160deg,#1C1F4A,#3E3F9A 55%,#8E8BE0)", accent: "#E4E2FF" },
  customer_review: { bg: "linear-gradient(160deg,#F7EEDB,#F3E3E6)", accent: "#C2338B", dark: true },
  reel_idea: { bg: "linear-gradient(160deg,#111,#2B2B2B)", accent: "#F4D79B" },
};
const FALLBACK = { bg: "linear-gradient(160deg,#17140F,#3A332B)", accent: "#FFB13B" };

/** The first thing a new owner sees: one question, one big voice button, and ideas as mini posts */
export function FirstPostHero({
  firstName,
  dayPart,
  cards,
  onCard,
  canRequest,
}: {
  firstName: string;
  dayPart: string;
  cards: QuickStartCard[];
  onCard: (c: QuickStartCard) => void;
  canRequest: boolean;
}) {
  const t = useTranslations("chat");
  const locale = useLocale() as Locale;
  return (
    <section className="my-auto py-8 lg:py-12">
      <div className="px-4">
        <p className="text-[17px] font-medium text-ink-muted">{t(`hello.${dayPart as "morning" | "afternoon" | "evening"}`, { name: firstName })}</p>
        <h1 className="display mt-2 text-[40px] leading-[1.04] font-bold lg:text-[56px]">
          {t("heroA")}
          <br />
          <span className="sunset-text pb-[0.08em]">{t("heroB")}</span>
        </h1>

        <button
          type="button"
          disabled={!canRequest}
          onClick={() => window.dispatchEvent(new Event("sg:voice"))}
          className="group mt-8 flex w-full max-w-[460px] items-center gap-4 rounded-full bg-primary p-2 pr-6 text-left text-on-primary transition-transform duration-150 active:scale-[0.99] disabled:opacity-50"
        >
          <span className="sunset-bg flex size-14 shrink-0 items-center justify-center rounded-full text-white">
            <MicIcon className="size-6" strokeWidth={2.25} />
          </span>
          <span className="min-w-0">
            <span className="block text-[19px] leading-tight font-semibold">{t("speakTitle")}</span>
            <span className="block text-[14px] leading-snug opacity-70">{t("speakSub")}</span>
          </span>
          <span aria-hidden className="ml-auto hidden items-center gap-[3px] sm:flex">
            {[8, 16, 11, 22, 14, 9, 18, 12].map((h, i) => (
              <span key={i} className="w-[3px] rounded-full bg-current opacity-50" style={{ height: h }} />
            ))}
          </span>
        </button>
      </div>

      {cards.length > 0 && (
        <div className="mt-10">
          <p className="px-4 text-[13px] font-semibold tracking-wide text-ink-muted uppercase">{t("startFromIdea")}</p>
          <div className="scrollbar-none mt-3 flex snap-x scroll-px-4 gap-3 overflow-x-auto px-4 pt-1 pb-3 [mask-image:linear-gradient(to_right,black_88%,transparent)]">
            {cards.map((c) => {
              const look = POSTERS[c.key] ?? FALLBACK;
              const label = locale === "hi" ? c.label_hi : c.label_en;
              const big = t.has(`ideaBig.${c.key}` as never) ? t(`ideaBig.${c.key}` as never) : label;
              return (
                <button
                  key={c.id}
                  type="button"
                  disabled={!canRequest}
                  onClick={() => onCard(c)}
                  className="group w-[148px] shrink-0 snap-start text-left disabled:opacity-50 lg:w-[160px]"
                >
                  <span
                    className="flex aspect-[4/5] flex-col justify-between overflow-hidden rounded-[18px] p-3.5 shadow-[0_18px_36px_-22px_rgb(23_20_15/0.5)] transition-transform duration-200 group-hover:-translate-y-1 group-hover:rotate-[-1deg]"
                    style={{ background: look.bg, color: look.dark ? "#3B1C26" : "#fff" }}
                  >
                    <span className="text-[10px] font-bold tracking-[0.16em] uppercase opacity-85">{label}</span>
                    <span className="text-[28px] leading-[1] font-bold tracking-tight" style={{ color: look.accent }}>
                      {big}
                    </span>
                    <span className="text-[12px] font-semibold opacity-80">{t("tapToStart")} →</span>
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </section>
  );
}
