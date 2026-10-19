import { getTranslations } from "next-intl/server";
import { CalendarDaysIcon, CheckIcon, MessageCircleIcon, MicIcon } from "lucide-react";
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

async function BrandPanel() {
  const t = await getTranslations("authPanel");
  const points = [
    { icon: MessageCircleIcon, text: t("point1") },
    { icon: MicIcon, text: t("point2") },
    { icon: CalendarDaysIcon, text: t("point3") },
  ];
  return (
    <aside className="sticky top-0 hidden h-dvh flex-col justify-between overflow-hidden bg-primary p-12 text-on-primary lg:flex xl:p-16">
      <div className="flex items-center gap-2.5 text-xl font-bold">
        <span className="rounded-[10px] bg-surface p-1">
          <LogoMark className="size-7" />
        </span>
        SocialGrid
      </div>

      <div className="max-w-[520px] space-y-8">
        <h2 className="text-[40px] leading-[1.15] font-bold xl:text-[46px]">{t("headline")}</h2>
        <ul className="space-y-4">
          {points.map(({ icon: Icon, text }) => (
            <li key={text} className="flex items-start gap-3 text-[18px] leading-snug opacity-95">
              <span className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-full bg-on-primary/15">
                <Icon className="size-[18px]" aria-hidden />
              </span>
              {text}
            </li>
          ))}
        </ul>

        {/* a glimpse of the chat */}
        <div className="space-y-2.5 rounded-[20px] bg-paper p-4 text-ink" aria-hidden>
          <div className="ml-auto w-fit max-w-[80%] rounded-[18px_18px_6px_18px] bg-primary-soft px-3.5 py-2 text-[16px]">
            {t("chatMine")}
          </div>
          <div className="w-fit max-w-[85%] rounded-[18px_18px_18px_6px] border border-line bg-surface px-3.5 py-2 text-[16px]">
            {t("chatTheirs")}
            <div className="pt-1 text-[13px] text-ink-muted">Priya · SocialGrid</div>
          </div>
          <div className="flex items-center gap-2 rounded-[14px] bg-status-soft px-3 py-2 text-[15px] font-semibold text-status-ink">
            <CheckIcon className="size-4" /> {t("chatStatus")}
          </div>
        </div>
      </div>

      <p className="text-[15px] opacity-80">{t("footer")}</p>
    </aside>
  );
}
