import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { ChevronDownIcon, ChevronRightIcon, DownloadIcon, MicIcon, PenToolIcon, Share2Icon } from "lucide-react";
import { LanguageToggle } from "@/components/shared/language-toggle";
import { Logo, LogoMark } from "@/components/shared/logo";
import { Reveal } from "@/components/landing/reveal";
import { ChangesVisual, PhoneMock, PostTile, ReadyVisual, SAMPLE_POSTS, WeekVisual, Waveform } from "@/components/landing/visuals";
import { SUPPORT_WHATSAPP } from "@/lib/config";
import { cn } from "@/lib/utils";

/**
 * Public home page. Built like a product page: one idea per section, big type,
 * the product itself as the hero image, and one action colour (green) for "Talk to us".
 */
export async function Landing() {
  const t = await getTranslations("landing");
  const days = (await getTranslations("week")).raw("days") as string[];
  const wa = SUPPORT_WHATSAPP.replace(/\D/g, "");
  // Until the number is set, "Talk to us" goes to the closing section, which says it's coming soon
  const talk = wa ? { href: `https://wa.me/${wa}?text=${encodeURIComponent(t("waText"))}`, target: "_blank", rel: "noreferrer" } : { href: "#talk" };
  const faqs = ["instagram", "hindi", "speed", "changes", "photos", "price"] as const;

  return (
    <div className="min-h-dvh bg-paper text-ink">
      {/* nav: thin glass bar, the only layer that floats over content */}
      <header className="glass-bar sticky top-0 z-40 border-b border-line/70">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between gap-4 px-5 lg:px-8">
          <Link href="/" aria-label="SocialGrid">
            <Logo className="[&_span]:text-[18px]" />
          </Link>
          <nav className="hidden items-center gap-8 text-[15px] text-ink-muted md:flex">
            <a href="#how" className="transition-colors hover:text-ink">{t("nav.how")}</a>
            <a href="#work" className="transition-colors hover:text-ink">{t("nav.work")}</a>
            <a href="#features" className="transition-colors hover:text-ink">{t("nav.features")}</a>
            <a href="#faq" className="transition-colors hover:text-ink">{t("nav.faq")}</a>
          </nav>
          <div className="flex items-center gap-2">
            <LanguageToggle className="hidden sm:flex" />
            <Link href="/login" className="rounded-full px-3 py-1.5 text-[15px] font-semibold text-ink hover:bg-canvas">
              {t("login")}
            </Link>
            <a {...talk} className="rounded-full bg-primary px-4 py-1.5 text-[15px] font-semibold text-on-primary hover:bg-primary/90">
              {t("talkShort")}
            </a>
          </div>
        </div>
      </header>

      <main>
        {/* 1. hero: the promise, then the product */}
        <section className="overflow-hidden px-5 pt-16 text-center lg:pt-24">
          <p className="text-[17px] font-semibold text-primary lg:text-[19px]">{t("eyebrow")}</p>
          <h1 className="display mx-auto mt-3 max-w-4xl text-[48px] leading-[1.02] font-bold sm:text-[64px] lg:text-[88px]">
            {t("h1a")}
            <br />
            <span className="bg-[linear-gradient(90deg,#2F5D50,#B8873A_55%,#8A3F52)] bg-clip-text pb-[0.08em] text-transparent">{t("h1b")}</span>
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-[19px] leading-relaxed text-ink-muted lg:text-[22px]">{t("sub")}</p>
          <div className="mt-8 flex flex-col items-center justify-center gap-4 sm:flex-row sm:gap-7">
            <a {...talk} className="inline-flex h-12 items-center rounded-full bg-primary px-7 text-[17px] font-semibold text-on-primary hover:bg-primary/90">
              {t("talk")}
            </a>
            <a href="#how" className="inline-flex items-center text-[17px] font-semibold text-primary hover:underline">
              {t("seeHow")} <ChevronRightIcon className="size-4" />
            </a>
          </div>

          {/* product shot: the real chat, with the posts it produced around it */}
          <div className="relative mx-auto mt-16 flex h-[640px] max-w-6xl justify-center lg:mt-20 lg:h-[700px]">
            <div className="absolute inset-x-0 bottom-0 h-1/2 bg-[radial-gradient(50%_60%_at_50%_100%,rgb(184_135_58_/_0.18),transparent)]" />
            <FloatingPost post={0} className="top-[70px] left-[calc(50%-440px)] w-[200px] -rotate-6" delay={150} />
            <FloatingPost post={3} className="top-[400px] left-[calc(50%-520px)] w-[170px] rotate-3" delay={300} />
            <FloatingPost post={1} className="top-[110px] left-[calc(50%+250px)] w-[190px] rotate-6" delay={220} />
            <FloatingPost post={2} className="top-[420px] left-[calc(50%+350px)] w-[175px] -rotate-3" delay={380} />
            <Reveal className="relative z-10">
              <PhoneMock
                labels={{
                  post: t("phone.post"),
                  readyBy: t("phone.readyBy"),
                  reply: t("phone.reply"),
                  ready: t("phone.ready"),
                  choose: t("phone.choose"),
                  type: t("phone.type"),
                }}
              />
            </Reveal>
          </div>
        </section>

        {/* 2. how it works */}
        <section id="how" className="scroll-mt-14 bg-canvas px-5 py-24 lg:py-32">
          <div className="mx-auto max-w-6xl">
            <Reveal className="text-center">
              <h2 className="display text-[40px] leading-[1.05] font-bold lg:text-[64px]">{t("howTitle")}</h2>
              <p className="mx-auto mt-4 max-w-2xl text-[19px] text-ink-muted lg:text-[21px]">{t("howSub")}</p>
            </Reveal>
            <div className="mt-14 grid gap-4 md:grid-cols-3 lg:gap-5">
              <Step n={1} title={t("steps.1.title")} text={t("steps.1.text")} delay={0}>
                <div className="flex items-center gap-3 rounded-full bg-primary-soft py-2.5 pr-5 pl-2.5 text-primary">
                  <span className="flex size-10 items-center justify-center rounded-full bg-primary text-on-primary">
                    <MicIcon className="size-5" />
                  </span>
                  <Waveform className="h-6" />
                  <span className="text-[14px] font-semibold">0:12</span>
                </div>
              </Step>
              <Step n={2} title={t("steps.2.title")} text={t("steps.2.text")} delay={120}>
                <div className="flex items-center gap-3">
                  <span className="flex size-12 items-center justify-center rounded-full bg-[linear-gradient(135deg,#F4D79B,#C9784E)] text-[17px] font-bold text-white">P</span>
                  <div className="text-left">
                    <div className="text-[16px] font-bold">Priya</div>
                    <div className="flex items-center gap-1.5 text-[14px] text-ink-muted">
                      <PenToolIcon className="size-3.5" /> {t("steps.2.badge")}
                    </div>
                  </div>
                </div>
              </Step>
              <Step n={3} title={t("steps.3.title")} text={t("steps.3.text")} delay={240}>
                <div className="flex gap-2">
                  <span className="inline-flex h-10 items-center gap-1.5 rounded-full bg-primary px-4 text-[14px] font-semibold text-on-primary">
                    <DownloadIcon className="size-4" /> {t("steps.3.download")}
                  </span>
                  <span className="inline-flex h-10 items-center gap-1.5 rounded-full border border-line-strong bg-surface px-4 text-[14px] font-semibold">
                    <Share2Icon className="size-4" /> {t("steps.3.share")}
                  </span>
                </div>
              </Step>
            </div>
          </div>
        </section>

        {/* 3. the work, on a dark stage so the colour of the posts carries it */}
        <section id="work" className="scroll-mt-14 bg-[#111110] px-5 py-24 text-white lg:py-32">
          <div className="mx-auto max-w-6xl">
            <Reveal className="text-center">
              <h2 className="display text-[40px] leading-[1.05] font-bold lg:text-[64px]">{t("workTitle")}</h2>
              <p className="mx-auto mt-4 max-w-2xl text-[19px] text-white/65 lg:text-[21px]">{t("workSub")}</p>
            </Reveal>
            <div className="mt-14 grid grid-cols-2 gap-3 md:grid-cols-3 lg:gap-5">
              {SAMPLE_POSTS.map((p, i) => (
                <Reveal key={p.key} delay={(i % 3) * 100}>
                  <PostTile post={p} size="lg" className="rounded-[22px]" />
                </Reveal>
              ))}
            </div>
            <p className="mt-6 text-center text-[14px] text-white/45">{t("sampleNote")}</p>
          </div>
        </section>

        {/* 4. features, as a bento grid */}
        <section id="features" className="scroll-mt-14 px-5 py-24 lg:py-32">
          <div className="mx-auto max-w-6xl">
            <Reveal className="text-center">
              <h2 className="display text-[40px] leading-[1.05] font-bold lg:text-[64px]">{t("featuresTitle")}</h2>
            </Reveal>
            <div className="mt-14 grid gap-4 lg:grid-cols-6 lg:gap-5">
              <Tile className="lg:col-span-4" title={t("f.plan.title")} text={t("f.plan.text")}>
                <WeekVisual days={days} />
              </Tile>
              <Tile className="lg:col-span-2" title={t("f.lang.title")} text={t("f.lang.text")}>
                <div aria-hidden className="flex items-baseline gap-3 font-bold tracking-tight">
                  <span lang="hi" className="text-[64px] leading-none text-primary">हिं</span>
                  <span className="text-[40px] leading-none text-line-strong">/</span>
                  <span className="text-[64px] leading-none">EN</span>
                </div>
              </Tile>
              <Tile className="lg:col-span-3" title={t("f.time.title")} text={t("f.time.text")}>
                <ReadyVisual post={t("phone.post")} readyBy={t("phone.readyBy")} steps={[t("f.time.s1"), t("f.time.s2"), t("f.time.s3")]} />
              </Tile>
              <Tile className="lg:col-span-3" title={t("f.changes.title")} text={t("f.changes.text")}>
                <ChangesVisual chips={[t("f.changes.c1"), t("f.changes.c2"), t("f.changes.c3")]} count={t("f.changes.count")} />
              </Tile>
            </div>
          </div>
        </section>

        {/* 5. pricing */}
        <section className="bg-canvas px-5 py-24 text-center lg:py-32">
          <Reveal className="mx-auto max-w-3xl">
            <h2 className="display text-[40px] leading-[1.05] font-bold lg:text-[64px]">{t("priceTitle")}</h2>
            <p className="mx-auto mt-4 max-w-2xl text-[19px] text-ink-muted lg:text-[21px]">{t("priceSub")}</p>
            <ul className="mx-auto mt-8 flex max-w-3xl flex-wrap justify-center gap-2">
              {[t("includes.1"), t("includes.2"), t("includes.3"), t("includes.4")].map((x) => (
                <li key={x} className="rounded-full border border-line bg-surface px-4 py-2 text-[16px]">
                  {x}
                </li>
              ))}
            </ul>
            <a {...talk} className="mt-10 inline-flex h-12 items-center rounded-full bg-primary px-7 text-[17px] font-semibold text-on-primary hover:bg-primary/90">
              {t("talk")}
            </a>
          </Reveal>
        </section>

        {/* 6. questions */}
        <section id="faq" className="scroll-mt-14 px-5 py-24 lg:py-32">
          <div className="mx-auto max-w-3xl">
            <Reveal>
              <h2 className="display text-center text-[40px] leading-[1.05] font-bold lg:text-[56px]">{t("faqTitle")}</h2>
            </Reveal>
            <div className="mt-12 border-t border-line">
              {faqs.map((k) => (
                <details key={k} className="group border-b border-line">
                  <summary className="flex cursor-pointer list-none items-center justify-between gap-6 py-5 text-[19px] font-semibold [&::-webkit-details-marker]:hidden">
                    {t(`faq.${k}.q`)}
                    <ChevronDownIcon className="size-5 shrink-0 text-ink-muted transition-transform duration-200 group-open:rotate-180" aria-hidden />
                  </summary>
                  <p className="-mt-1 pr-10 pb-6 text-[17px] leading-relaxed text-ink-muted">{t(`faq.${k}.a`)}</p>
                </details>
              ))}
            </div>
          </div>
        </section>

        {/* 7. close: same wallpaper as the login, so the last thing seen is where they'll arrive */}
        <section id="talk" className="relative scroll-mt-14 overflow-hidden px-5 py-28 text-center lg:py-36">
          <div aria-hidden className="auth-wallpaper absolute inset-0 [mask-image:linear-gradient(transparent,black_25%,black_75%,transparent)]" />
          <Reveal className="relative mx-auto max-w-3xl">
            <LogoMark className="mx-auto size-14" />
            <h2 className="display mt-6 text-[40px] leading-[1.05] font-bold lg:text-[64px]">{t("closeTitle")}</h2>
            <p className="mx-auto mt-4 max-w-xl text-[19px] text-ink-muted lg:text-[21px]">{wa ? t("closeSub") : t("closeSoon")}</p>
            {wa && (
              <a {...talk} className="mt-9 inline-flex h-12 items-center rounded-full bg-primary px-7 text-[17px] font-semibold text-on-primary hover:bg-primary/90">
                {t("talk")}
              </a>
            )}
          </Reveal>
        </section>
      </main>

      <footer className="border-t border-line px-5 py-8 text-[14px] text-ink-muted">
        <div className="mx-auto flex max-w-6xl flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <span>© {new Date().getFullYear()} SocialGrid. {t("footer")}</span>
          <div className="flex items-center gap-5">
            <a href="#faq" className="hover:text-ink">{t("nav.faq")}</a>
            <Link href="/login" className="hover:text-ink">{t("login")}</Link>
            <LanguageToggle className="sm:hidden" />
          </div>
        </div>
      </footer>
    </div>
  );
}

function FloatingPost({ post, className, delay }: { post: number; className: string; delay: number }) {
  return (
    <div className={cn("absolute hidden lg:block", className)}>
      <Reveal delay={delay}>
        <PostTile post={SAMPLE_POSTS[post]} className="rounded-[22px] shadow-[0_40px_80px_-30px_rgba(30,25,20,.45)]" />
      </Reveal>
    </div>
  );
}

function Step({ n, title, text, delay, children }: { n: number; title: string; text: string; delay: number; children: React.ReactNode }) {
  return (
    <Reveal delay={delay} className="flex flex-col rounded-[28px] bg-surface p-7 lg:p-8">
      <div className="flex h-16 items-center">{children}</div>
      <span className="mt-8 text-[15px] font-semibold text-primary">{String(n).padStart(2, "0")}</span>
      <h3 className="mt-1 text-[24px] leading-tight font-bold tracking-tight">{title}</h3>
      <p className="mt-2 text-[17px] leading-relaxed text-ink-muted">{text}</p>
    </Reveal>
  );
}

function Tile({ title, text, className, children }: { title: string; text: string; className?: string; children: React.ReactNode }) {
  return (
    <Reveal className={cn("flex flex-col justify-between gap-10 rounded-[28px] bg-canvas p-7 lg:p-9", className)}>
      <div>
        <h3 className="text-[26px] leading-tight font-bold tracking-tight">{title}</h3>
        <p className="mt-2 max-w-md text-[17px] leading-relaxed text-ink-muted">{text}</p>
      </div>
      {children}
    </Reveal>
  );
}
