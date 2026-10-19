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

/** Laptop-only story: a Hindi voice note turns into a finished post while you watch (plays once) */
async function BrandPanel() {
  const t = await getTranslations("authPanel");
  const kinds = [t("kind.salon"), t("kind.dhaba"), t("kind.boutique"), t("kind.mithai"), t("kind.cafe")];
  return (
    <aside className="auth-panel sticky top-0 hidden h-dvh flex-col justify-between gap-8 overflow-hidden p-12 text-white lg:flex xl:px-16">
      <div className="relative flex items-center gap-2.5 text-xl font-bold">
        <span className="rounded-[10px] bg-white p-1">
          <LogoMark className="size-7" />
        </span>
        SocialGrid
      </div>

      <div className="relative grid gap-10 xl:gap-12">
        <div className="space-y-4">
          <h2 className="text-[44px] leading-[1.02] font-bold tracking-tight xl:text-[60px]">
            <span className="sg-rise block">{t("line1")}</span>
            <span className="sg-rise relative inline-block text-[#E9C27A]" style={{ animationDelay: "120ms" }}>
              {t("line2")}
              <svg viewBox="0 0 300 18" preserveAspectRatio="none" className="sg-draw absolute -bottom-2 left-0 h-3 w-full" aria-hidden>
                <path d="M3 12 C 60 2, 120 18, 180 8 S 270 4, 297 10" fill="none" stroke="#E9C27A" strokeWidth="4" strokeLinecap="round" />
              </svg>
            </span>
          </h2>
          <p className="sg-rise max-w-[480px] text-[18px] leading-relaxed text-white/80 xl:text-[19px]" style={{ animationDelay: "220ms" }}>
            {t("sub")}
          </p>
        </div>

        {/* the stage */}
        <div className="relative h-[330px] max-w-[540px] xl:h-[360px]" aria-hidden>
          {/* voice note card */}
          <div className="sg-rise absolute top-0 left-0 w-[300px] -rotate-3 rounded-[22px] bg-[#FAF7F2] p-4 text-ink shadow-[0_24px_60px_-20px_rgba(0,0,0,.55)]" style={{ animationDelay: "350ms" }}>
            <div className="flex items-center gap-2.5">
              <span className="flex size-9 items-center justify-center rounded-[10px] bg-rose-soft text-[13px] font-bold text-rose-ink">GB</span>
              <div className="leading-tight">
                <div className="text-[15px] font-bold">Sunita</div>
                <div className="text-[13px] text-ink-muted">Glow Beauty Salon</div>
              </div>
            </div>
            <div className="mt-3 ml-auto flex w-fit items-center gap-2.5 rounded-[18px_18px_6px_18px] bg-primary-soft px-3 py-2.5">
              <span className="flex size-8 items-center justify-center rounded-full bg-primary text-white">
                <PlayIcon className="size-4 fill-current" />
              </span>
              <span className="flex h-8 items-center gap-[3px]">
                {WAVE.map((h, i) => (
                  <span key={i} className="sg-bar w-[3px] rounded-full bg-primary" style={{ height: h, animationDelay: `${600 + i * 35}ms` }} />
                ))}
              </span>
              <span className="text-[13px] font-semibold text-primary-ink">0:12</span>
            </div>
            <p lang="hi" className="sg-rise mt-2.5 text-right text-[15px] leading-snug text-ink-muted italic" style={{ animationDelay: "1300ms" }}>
              “{t("voice")}”
            </p>
          </div>

          {/* progress pill */}
          <div className="sg-rise absolute top-[205px] left-[24px] w-[250px] rotate-[1.5deg] rounded-[16px] bg-status-soft px-3.5 py-2.5 text-status-ink shadow-[0_18px_40px_-18px_rgba(0,0,0,.5)]" style={{ animationDelay: "1600ms" }}>
            <div className="flex items-center gap-2 text-[13px] font-semibold">
              <span className="size-2 rounded-full bg-status" /> {t("onIt")}
            </div>
            <div className="mt-2 grid grid-cols-3 gap-1">
              {[1900, 2350, 2800].map((d) => (
                <span key={d} className="h-1.5 overflow-hidden rounded-[3px] bg-status-track">
                  <span className="sg-fill block h-full bg-status" style={{ animationDelay: `${d}ms` }} />
                </span>
              ))}
            </div>
          </div>

          {/* the finished post */}
          <div className="sg-pop absolute top-[20px] right-0 w-[230px] rotate-[5deg] rounded-[22px] bg-white p-2 shadow-[0_30px_70px_-20px_rgba(0,0,0,.6)] xl:w-[250px]" style={{ animationDelay: "3100ms" }}>
            <div className="relative flex aspect-[4/5] flex-col justify-between overflow-hidden rounded-[16px] bg-[linear-gradient(160deg,#5B1E33_0%,#8A3F52_55%,#C9784E_100%)] p-4 text-white">
              <span className="absolute -top-10 -right-10 size-40 rounded-full bg-[#E9C27A]/25 blur-2xl" />
              <span className="relative flex items-center gap-1.5 text-[12px] font-bold tracking-[0.2em] uppercase">
                <SparklesIcon className="size-3.5" /> Diwali Glow
              </span>
              <div className="relative">
                <div className="text-[52px] leading-none font-bold text-[#F4D79B]">20%</div>
                <div className="text-[22px] leading-tight font-bold">off on all facials</div>
                <div className="mt-1 text-[13px] text-white/80">Book before 2 Nov</div>
              </div>
              <span className="relative text-[12px] font-semibold text-white/85">Glow Beauty Salon</span>
            </div>
            <span className="sg-pop absolute -bottom-4 -left-6 flex -rotate-6 items-center gap-1.5 rounded-full bg-[#E9C27A] px-3.5 py-2 text-[14px] font-bold text-[#3B2A10] shadow-lg" style={{ animationDelay: "3500ms" }}>
              <CheckIcon className="size-4" strokeWidth={3} /> {t("ready")}
            </span>
          </div>
        </div>
      </div>

      <div className="relative space-y-3">
        <div className="flex flex-wrap gap-2">
          {kinds.map((k) => (
            <span key={k} className="rounded-full border border-white/20 px-3 py-1 text-[14px] text-white/85">
              {k}
            </span>
          ))}
        </div>
        <p className="text-[15px] text-white/65">{t("footer")}</p>
      </div>
    </aside>
  );
}
