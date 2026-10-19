import Link from "next/link";
import { getTranslations } from "next-intl/server";
import {
  CameraIcon,
  CheckIcon,
  CoffeeIcon,
  DownloadIcon,
  MessageCircleIcon,
  MicIcon,
  ScissorsIcon,
  ShoppingBagIcon,
  SparklesIcon,
  UtensilsIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { LanguageToggle } from "@/components/shared/language-toggle";
import { Logo } from "@/components/shared/logo";
import { SUPPORT_WHATSAPP } from "@/lib/config";

/** Public home page for business owners who haven't joined yet */
export async function Landing() {
  const t = await getTranslations("landing");
  const wa = SUPPORT_WHATSAPP.replace(/\D/g, "");
  // Until the number is set, "Talk to us" scrolls to the contact section
  const talkHref = wa ? `https://wa.me/${wa}?text=${encodeURIComponent(t("waText"))}` : "#contact";

  const steps = [
    { icon: MicIcon, title: t("steps.1.title"), text: t("steps.1.text") },
    { icon: SparklesIcon, title: t("steps.2.title"), text: t("steps.2.text") },
    { icon: DownloadIcon, title: t("steps.3.title"), text: t("steps.3.text") },
  ];
  const audiences = [
    { icon: ScissorsIcon, title: t("who.salon.title"), text: t("who.salon.text") },
    { icon: UtensilsIcon, title: t("who.restaurant.title"), text: t("who.restaurant.text") },
    { icon: CoffeeIcon, title: t("who.cafe.title"), text: t("who.cafe.text") },
    { icon: ShoppingBagIcon, title: t("who.shop.title"), text: t("who.shop.text") },
  ];
  const faqs = ["instagram", "hindi", "speed", "changes", "photos", "price"] as const;

  return (
    <div className="min-h-dvh bg-paper text-ink">
      {/* top bar */}
      <header className="sticky top-0 z-30 border-b border-line bg-paper/95 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-3 px-4 lg:h-[72px] lg:px-8">
          <Logo />
          <nav className="hidden items-center gap-7 text-[16px] font-medium text-ink-muted md:flex">
            <a href="#how" className="hover:text-ink">{t("nav.how")}</a>
            <a href="#samples" className="hover:text-ink">{t("nav.samples")}</a>
            <a href="#faq" className="hover:text-ink">{t("nav.faq")}</a>
          </nav>
          <div className="flex items-center gap-2">
            <LanguageToggle />
            <Button asChild variant="outline" size="sm" className="h-10">
              <Link href="/login">{t("login")}</Link>
            </Button>
          </div>
        </div>
      </header>

      <main>
        {/* hero */}
        <section className="mx-auto grid max-w-6xl items-center gap-10 px-4 pt-10 pb-16 lg:grid-cols-[1.1fr_1fr] lg:gap-16 lg:px-8 lg:pt-20 lg:pb-24">
          <div className="space-y-6">
            <p className="inline-flex rounded-full bg-primary-soft px-3.5 py-1 text-[15px] font-semibold text-primary">
              {t("eyebrow")}
            </p>
            <h1 className="text-[36px] leading-[1.1] font-bold tracking-tight lg:text-[56px]">{t("headline")}</h1>
            <p className="max-w-xl text-[19px] leading-relaxed text-ink-muted lg:text-[21px]">{t("sub")}</p>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              <TalkButton href={talkHref} external={!!wa} label={t("talk")} className="sm:w-auto" />
              <a href="#how" className="px-2 py-2 text-center text-[17px] font-semibold text-primary">
                {t("seeHow")} →
              </a>
            </div>
            <ul className="flex flex-wrap gap-x-6 gap-y-2 pt-2 text-[16px] text-ink-muted">
              {[t("trust.1"), t("trust.2"), t("trust.3")].map((x) => (
                <li key={x} className="flex items-center gap-1.5">
                  <CheckIcon className="size-4 text-primary" aria-hidden /> {x}
                </li>
              ))}
            </ul>
          </div>
          <HeroChat />
        </section>

        {/* how it works */}
        <section id="how" className="scroll-mt-20 border-y border-line bg-surface">
          <div className="mx-auto max-w-6xl px-4 py-16 lg:px-8 lg:py-20">
            <h2 className="text-[30px] leading-tight font-bold lg:text-[40px]">{t("howTitle")}</h2>
            <p className="mt-2 max-w-2xl text-[18px] text-ink-muted">{t("howSub")}</p>
            <ol className="mt-10 grid gap-5 md:grid-cols-3">
              {steps.map(({ icon: Icon, title, text }, i) => (
                <li key={title} className="rounded-[20px] border border-line bg-paper p-6">
                  <div className="flex items-center gap-3">
                    <span className="flex size-12 items-center justify-center rounded-[14px] bg-primary text-on-primary">
                      <Icon className="size-6" aria-hidden />
                    </span>
                    <span className="text-[15px] font-semibold text-ink-muted">{t("stepN", { n: i + 1 })}</span>
                  </div>
                  <h3 className="mt-4 text-[21px] font-bold">{title}</h3>
                  <p className="mt-1.5 text-[17px] text-ink-muted">{text}</p>
                </li>
              ))}
            </ol>
          </div>
        </section>

        {/* sample posts */}
        <section id="samples" className="mx-auto max-w-6xl scroll-mt-20 px-4 py-16 lg:px-8 lg:py-20">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <h2 className="text-[30px] leading-tight font-bold lg:text-[40px]">{t("samplesTitle")}</h2>
              <p className="mt-2 max-w-2xl text-[18px] text-ink-muted">{t("samplesSub")}</p>
            </div>
            <span className="rounded-full bg-canvas px-3 py-1 text-[14px] font-semibold text-ink-muted">{t("sampleBadge")}</span>
          </div>
          <div className="mt-10 grid grid-cols-2 gap-3 md:grid-cols-4 md:gap-5">
            <SamplePost tone="rose" kicker={t("samples.salon.kicker")} title={t("samples.salon.title")} line={t("samples.salon.line")} biz="Glow Beauty Salon" />
            <SamplePost tone="status" kicker={t("samples.food.kicker")} title={t("samples.food.title")} line={t("samples.food.line")} biz="Sharma Bhojanalaya" />
            <SamplePost tone="primary" kicker={t("samples.shop.kicker")} title={t("samples.shop.title")} line={t("samples.shop.line")} biz="Kavya Fashion" />
            <SamplePost tone="ink" kicker={t("samples.cafe.kicker")} title={t("samples.cafe.title")} line={t("samples.cafe.line")} biz="Chai Point Café" />
          </div>
        </section>

        {/* who it's for */}
        <section className="border-y border-line bg-surface">
          <div className="mx-auto max-w-6xl px-4 py-16 lg:px-8 lg:py-20">
            <h2 className="text-[30px] leading-tight font-bold lg:text-[40px]">{t("whoTitle")}</h2>
            <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {audiences.map(({ icon: Icon, title, text }) => (
                <div key={title} className="rounded-[20px] border border-line bg-paper p-5">
                  <Icon className="size-7 text-primary" aria-hidden />
                  <h3 className="mt-3 text-[19px] font-bold">{title}</h3>
                  <p className="mt-1 text-[16px] text-ink-muted">{text}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* pricing */}
        <section className="mx-auto max-w-6xl px-4 py-16 lg:px-8 lg:py-20">
          <div className="grid items-center gap-8 rounded-[24px] bg-status-soft p-7 lg:grid-cols-[1fr_auto] lg:p-12">
            <div>
              <h2 className="text-[28px] leading-tight font-bold lg:text-[36px]">{t("priceTitle")}</h2>
              <p className="mt-2 max-w-2xl text-[18px] text-status-ink">{t("priceSub")}</p>
              <ul className="mt-5 grid gap-2 text-[17px] sm:grid-cols-2">
                {[t("includes.1"), t("includes.2"), t("includes.3"), t("includes.4")].map((x) => (
                  <li key={x} className="flex items-start gap-2">
                    <CheckIcon className="mt-1 size-4 shrink-0 text-primary" aria-hidden /> {x}
                  </li>
                ))}
              </ul>
            </div>
            <TalkButton href={talkHref} external={!!wa} label={t("talk")} className="w-full lg:w-auto" />
          </div>
        </section>

        {/* faq */}
        <section id="faq" className="mx-auto max-w-3xl scroll-mt-20 px-4 pb-16 lg:px-8 lg:pb-20">
          <h2 className="text-[30px] leading-tight font-bold lg:text-[40px]">{t("faqTitle")}</h2>
          <div className="mt-8 divide-y divide-line rounded-[20px] border border-line bg-surface">
            {faqs.map((k) => (
              <details key={k} className="group px-5 py-4 [&_summary::-webkit-details-marker]:hidden">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-[18px] font-semibold">
                  {t(`faq.${k}.q`)}
                  <span className="text-[22px] text-ink-muted transition-transform duration-150 group-open:rotate-45" aria-hidden>
                    +
                  </span>
                </summary>
                <p className="mt-2 text-[17px] text-ink-muted">{t(`faq.${k}.a`)}</p>
              </details>
            ))}
          </div>
        </section>

        {/* contact */}
        <section id="contact" className="scroll-mt-20 bg-primary text-on-primary">
          <div className="mx-auto flex max-w-6xl flex-col items-start gap-6 px-4 py-16 lg:flex-row lg:items-center lg:justify-between lg:px-8">
            <div>
              <h2 className="text-[30px] leading-tight font-bold lg:text-[38px]">{t("contactTitle")}</h2>
              <p className="mt-2 max-w-xl text-[18px] opacity-90">{wa ? t("contactSub") : t("contactSoon")}</p>
            </div>
            {wa && (
              <Button asChild size="lg" className="bg-surface text-primary hover:bg-surface/90">
                <a href={talkHref} target="_blank" rel="noreferrer">
                  <MessageCircleIcon /> {t("talk")}
                </a>
              </Button>
            )}
          </div>
        </section>
      </main>

      <footer className="border-t border-line">
        <div className="mx-auto flex max-w-6xl flex-col gap-3 px-4 py-8 text-[15px] text-ink-muted sm:flex-row sm:items-center sm:justify-between lg:px-8">
          <span>© {new Date().getFullYear()} SocialGrid · {t("footer")}</span>
          <Link href="/login" className="font-semibold text-primary">
            {t("loginLong")}
          </Link>
        </div>
      </footer>
    </div>
  );
}

function TalkButton({ href, external, label, className }: { href: string; external: boolean; label: string; className?: string }) {
  return (
    <Button asChild size="lg" className={className}>
      <a href={href} {...(external ? { target: "_blank", rel: "noreferrer" } : {})}>
        <MessageCircleIcon /> {label}
      </a>
    </Button>
  );
}

/** Mini chat that shows the whole idea in one glance */
async function HeroChat() {
  const t = await getTranslations("landing.chat");
  return (
    <div className="relative mx-auto w-full max-w-[440px]" aria-hidden>
      <div className="rounded-[28px] border border-line bg-surface p-4 lg:p-5">
        <div className="flex items-center gap-3 border-b border-line pb-3">
          <span className="flex size-10 items-center justify-center rounded-[12px] bg-rose-soft text-[15px] font-bold text-rose-ink">GB</span>
          <span className="text-[17px] font-bold">Glow Beauty Salon</span>
        </div>
        <div className="mt-3 rounded-[16px] bg-status-soft px-3.5 py-2.5">
          <div className="flex justify-between text-[15px]">
            <span className="font-bold">{t("post")}</span>
            <span className="font-semibold text-status-ink">{t("readyBy")}</span>
          </div>
          <div className="mt-2 grid grid-cols-3 gap-1">
            <span className="h-1.5 rounded-[3px] bg-status" />
            <span className="h-1.5 rounded-[3px] bg-status" />
            <span className="h-1.5 rounded-[3px] bg-status-track" />
          </div>
        </div>
        <div className="mt-4 space-y-3">
          <div className="ml-auto w-fit max-w-[85%] rounded-[18px_18px_6px_18px] bg-primary-soft px-3.5 py-2.5 text-[16px]">
            <span className="mb-1.5 flex items-center gap-1.5 text-[14px] font-semibold text-primary-ink">
              <MicIcon className="size-4" /> 0:12 · {t("voice")}
            </span>
            {t("mine")}
          </div>
          <div className="ml-auto flex w-fit gap-1">
            {["bg-rose-soft", "bg-status-soft", "bg-primary-soft"].map((c) => (
              <span key={c} className={`flex size-16 items-center justify-center rounded-[12px] ${c}`}>
                <CameraIcon className="size-5 text-ink-muted" />
              </span>
            ))}
          </div>
          <div className="w-fit max-w-[88%] rounded-[18px_18px_18px_6px] border border-line bg-surface px-3.5 py-2.5 text-[16px]">
            {t("theirs")}
            <div className="pt-1 text-[13px] text-ink-muted">Priya · SocialGrid · 4:02 PM</div>
          </div>
        </div>
      </div>
    </div>
  );
}

const TONES = {
  rose: "bg-rose-soft text-rose-ink",
  status: "bg-status-soft text-status-ink",
  primary: "bg-primary-soft text-primary",
  ink: "bg-ink text-paper",
} as const;

/** A drawn stand-in for a real post until we have customer examples */
function SamplePost({ tone, kicker, title, line, biz }: { tone: keyof typeof TONES; kicker: string; title: string; line: string; biz: string }) {
  return (
    <figure className="rounded-[20px] border border-line bg-surface p-2">
      <div className={`flex aspect-[4/5] flex-col justify-between rounded-[14px] p-4 ${TONES[tone]}`}>
        <span className="text-[13px] font-bold tracking-wider uppercase opacity-80">{kicker}</span>
        <div>
          <div className="text-[24px] leading-tight font-bold lg:text-[28px]">{title}</div>
          <div className="mt-1 text-[15px] opacity-90">{line}</div>
        </div>
        <span className="text-[13px] font-semibold opacity-80">{biz}</span>
      </div>
    </figure>
  );
}
