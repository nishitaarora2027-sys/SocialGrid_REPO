import { getTranslations } from "next-intl/server";
import { CheckIcon, PlayIcon, SparklesIcon } from "lucide-react";
import { LanguageToggle } from "@/components/shared/language-toggle";
import { Logo, LogoMark } from "@/components/shared/logo";

/**
 * Login, forgot, reset and setup pages.
 * Phone: one column. Laptop: a calm brand panel on the left, the form on the right.
 */
export async function AuthShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-dvh bg-paper lg:grid lg:grid-cols-[minmax(0,1.05fr)_minmax(0,1fr)]">
      <BrandPanel />
      <main className="mx-auto flex min-h-dvh w-full max-w-[420px] flex-col px-6 pt-[max(56px,env(safe-area-inset-top))] lg:max-w-[460px] lg:justify-center lg:px-8 lg:py-12">
        <div className="flex items-center justify-between">
          <Logo className="lg:invisible" />
          <LanguageToggle />
        </div>
        <div className="flex flex-1 flex-col lg:flex-none">{children}</div>
      </main>
    </div>
  );
}

const WAVE = [6, 14, 22, 12, 28, 18, 9, 24, 30, 16, 8, 20, 26, 12, 6, 18, 24, 10, 15, 7];
// mini posts that fill the week strip, one after another
const WEEK = [
  { day: 0, bg: "linear-gradient(160deg,#5B1E33,#C9784E)", delay: 3700 },
  { day: 2, bg: "linear-gradient(160deg,#1F5C4C,#7FC4A8)", delay: 3900 },
  { day: 4, bg: "linear-gradient(160deg,#6B4E1E,#E9C27A)", delay: 4100 },
  { day: 5, bg: "linear-gradient(160deg,#2B2F6B,#8E8BE0)", delay: 4300 },
];

/** Laptop-only story: a voice note becomes a finished post, then the whole week fills up (plays once) */
async function BrandPanel() {
  const t = await getTranslations("authPanel");
  const days = (await getTranslations("week")).raw("days") as string[];
  const perks = [t("perk.voice"), t("perk.lang"), t("perk.people")];
  return (
    <aside className="auth-panel relative sticky top-0 hidden h-dvh flex-col justify-between gap-8 overflow-hidden p-12 text-white lg:flex xl:px-16 [@media(max-height:760px)]:gap-5 [@media(max-height:760px)]:py-8">
      <span className="auth-blob auth-blob-a" aria-hidden />
      <span className="auth-blob auth-blob-b" aria-hidden />
      <span className="auth-blob auth-blob-c" aria-hidden />

      <div className="relative flex items-center gap-2.5 text-xl font-bold">
        <span className="rounded-[10px] bg-white p-1">
          <LogoMark className="size-7" />
        </span>
        SocialGrid
      </div>

      <div className="relative grid gap-10 [@media(max-height:760px)]:gap-6">
        <div className="space-y-4">
          <h2 className="text-[46px] leading-[1.02] font-bold tracking-tight xl:text-[62px] [@media(max-height:860px)]:text-[48px] [@media(max-height:760px)]:text-[40px]">
            <span className="sg-rise block">{t("line1")}</span>
            <span className="sg-rise auth-gradient-text block pb-1" style={{ animationDelay: "120ms" }}>
              {t("line2")}
            </span>
            <span className="sg-rise mt-2 block text-[24px] font-semibold tracking-normal text-white/75 xl:text-[28px] [@media(max-height:760px)]:text-[22px]" style={{ animationDelay: "240ms" }}>
              {t("line3")}
            </span>
          </h2>
          <p className="sg-rise max-w-[470px] text-[18px] leading-relaxed text-white/70 [@media(max-height:760px)]:text-[16px]" style={{ animationDelay: "320ms" }}>
            {t("sub")}
          </p>
        </div>

        {/* the stage */}
        <div className="relative h-[360px] max-w-[560px] [@media(max-height:860px)]:h-[290px] [@media(max-height:760px)]:h-[220px] [@media(max-height:640px)]:hidden" aria-hidden>
          <div className="absolute inset-x-0 top-0 h-[360px] origin-top-left [@media(max-height:860px)]:scale-[0.8] [@media(max-height:760px)]:scale-[0.6]">
          {/* 1. voice note */}
          <div className="sg-rise absolute top-0 left-0 w-[290px] -rotate-3 rounded-[22px] bg-[#FAF7F2] p-4 text-ink shadow-[0_30px_70px_-25px_rgba(0,0,0,.8)]" style={{ animationDelay: "400ms" }}>
            <div className="flex items-center gap-2.5">
              <span className="flex size-9 items-center justify-center rounded-full bg-[linear-gradient(135deg,#E9C27A,#C9784E)] text-[13px] font-bold text-white">S</span>
              <div className="leading-tight">
                <div className="text-[15px] font-bold">Sunita</div>
                <div className="text-[13px] text-ink-muted">{t("voiceLabel")}</div>
              </div>
            </div>
            <div className="mt-3 ml-auto flex w-fit items-center gap-2.5 rounded-[18px_18px_6px_18px] bg-primary-soft px-3 py-2.5">
              <span className="flex size-8 items-center justify-center rounded-full bg-primary text-white">
                <PlayIcon className="size-4 fill-current" />
              </span>
              <span className="flex h-8 items-center gap-[3px]">
                {WAVE.map((h, i) => (
                  <span key={i} className="sg-bar w-[3px] rounded-full bg-primary" style={{ height: h, animationDelay: `${650 + i * 35}ms` }} />
                ))}
              </span>
              <span className="text-[13px] font-semibold text-primary-ink">0:12</span>
            </div>
            <p lang="hi" className="sg-rise mt-2.5 text-right text-[15px] leading-snug text-ink-muted italic" style={{ animationDelay: "1350ms" }}>
              “{t("voice")}”
            </p>
          </div>

          {/* 2. the post we created */}
          <div className="sg-pop absolute top-[6px] right-[8px] z-10 w-[220px] rotate-[5deg] rounded-[22px] bg-white/95 p-2 shadow-[0_40px_80px_-25px_rgba(0,0,0,.85)] xl:w-[238px]" style={{ animationDelay: "1900ms" }}>
            <div className="relative flex aspect-[4/5] flex-col justify-between overflow-hidden rounded-[16px] bg-[linear-gradient(160deg,#4A1529_0%,#8A3F52_55%,#D88A55_100%)] p-4 text-white">
              <span className="absolute -top-12 -right-12 size-44 rounded-full bg-[#F4D79B]/30 blur-2xl" />
              <span className="relative flex items-center gap-1.5 text-[12px] font-bold tracking-[0.2em] uppercase">
                <SparklesIcon className="size-3.5" /> Diwali Glow
              </span>
              <div className="relative">
                <div className="text-[54px] leading-none font-bold text-[#F4D79B]">20%</div>
                <div className="text-[21px] leading-tight font-bold">off on all facials</div>
                <div className="mt-1 text-[13px] text-white/80">Book before 2 Nov</div>
              </div>
              <span className="relative text-[12px] font-semibold text-white/85">Glow Beauty</span>
            </div>
            <span className="sg-pop absolute -top-4 -right-5 flex rotate-6 items-center gap-1.5 rounded-full bg-[#F4D79B] px-3.5 py-2 text-[14px] font-bold text-[#3B2A10] shadow-lg" style={{ animationDelay: "2400ms" }}>
              <CheckIcon className="size-4" strokeWidth={3} /> {t("ready")}
            </span>
          </div>

          {/* 3. and the whole week, planned */}
          <div className="sg-rise absolute bottom-0 left-[10px] w-[290px] rotate-[-1.5deg] rounded-[20px] border border-white/15 bg-white/10 p-3.5 shadow-[0_30px_60px_-25px_rgba(0,0,0,.7)] backdrop-blur-md xl:w-[350px]" style={{ animationDelay: "3200ms" }}>
            <div className="flex items-baseline justify-between">
              <span className="text-[15px] font-bold">{t("weekTitle")}</span>
              <span className="text-[13px] text-white/70">{t("weekCount")}</span>
            </div>
            <div className="mt-2.5 grid grid-cols-7 gap-1.5">
              {days.map((d, i) => {
                const post = WEEK.find((w) => w.day === i);
                return (
                  <div key={d} className="flex flex-col items-center gap-1">
                    <span className="text-[11px] font-semibold text-white/65">{d.slice(0, 1)}</span>
                    <span className={`relative aspect-[4/5] w-full overflow-hidden rounded-[7px] ${post ? "" : "border border-dashed border-white/25"}`}>
                      {post && <span className="sg-pop absolute inset-0" style={{ background: post.bg, animationDelay: `${post.delay}ms` }} />}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
          </div>
        </div>
      </div>

      <div className="relative flex flex-wrap items-center gap-x-5 gap-y-2 text-[15px] text-white/80">
        {perks.map((p) => (
          <span key={p} className="flex items-center gap-2">
            <span className="size-1.5 rounded-full bg-[#F4D79B]" /> {p}
          </span>
        ))}
      </div>
    </aside>
  );
}
