import { getLocale, getTranslations } from "next-intl/server";
import { CameraIcon, DownloadIcon, MessageCircleIcon, MicIcon, PencilIcon, PhoneIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { PayButton } from "@/components/client/pay-button";
import { requireClient } from "@/lib/auth/session";
import { SUPPORT_WHATSAPP } from "@/lib/config";
import { formatDate } from "@/lib/format";
import type { Locale, Plan, Subscription } from "@/lib/types";

export default async function HelpPage() {
  const t = await getTranslations("help");
  const tSub = await getTranslations("subscription");
  const tStatus = await getTranslations("subscriptionStatus");
  const locale = (await getLocale()) as Locale;
  const { supabase, business } = await requireClient();
  const { data: sub } = await supabase
    .from("subscriptions")
    .select("status, current_period_end, plan:plans(name, price_inr)")
    .eq("business_id", business.id)
    .maybeSingle<Pick<Subscription, "status" | "current_period_end"> & { plan: Pick<Plan, "name" | "price_inr"> | null }>();
  const steps = [
    { icon: MessageCircleIcon, key: "ask" },
    { icon: MicIcon, key: "voice" },
    { icon: CameraIcon, key: "photos" },
    { icon: DownloadIcon, key: "download" },
    { icon: PencilIcon, key: "changes" },
  ] as const;
  const wa = SUPPORT_WHATSAPP.replace(/\D/g, "");

  return (
    <main className="w-full max-w-5xl flex-1 space-y-3 px-3 py-3 lg:space-y-5 lg:px-10 lg:py-8">
      <h1 className="text-[30px] leading-tight font-bold max-lg:sr-only">{t("title")}</h1>
      {sub && (
        <Card className="py-4">
          <CardContent className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-[18px] font-bold">
                {tSub("yourPlan")}{sub.plan ? `: ${sub.plan.name}` : ""}
              </h2>
              <p className="text-[17px] text-ink-muted">
                {sub.status === "active" && sub.current_period_end
                  ? tSub("activeTill", { date: formatDate(sub.current_period_end, locale) })
                  : tStatus(sub.status)}
              </p>
              {!(sub.plan && sub.plan.price_inr > 0) && <p className="text-[15px] text-ink-muted">{tSub("noPaidPlan")}</p>}
            </div>
            {sub.plan && sub.plan.price_inr > 0 && <PayButton price={sub.plan.price_inr} size="default" />}
          </CardContent>
        </Card>
      )}
      <div className="grid gap-2.5 lg:grid-cols-2">
        {steps.map(({ icon: Icon, key }) => (
          <Card key={key} className="py-4">
            <CardContent className="flex items-start gap-3">
              <span className="flex size-11 shrink-0 items-center justify-center rounded-[12px] bg-primary-soft text-primary">
                <Icon className="size-6" />
              </span>
              <div>
                <h2 className="text-[18px] font-bold">{t(`${key}.title`)}</h2>
                <p className="text-[17px] text-ink-muted">{t(`${key}.text`)}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
      {wa && (
        <div className="grid gap-2 pt-2">
          <Button asChild size="lg">
            <a href={`https://wa.me/${wa}`} target="_blank" rel="noreferrer">
              <MessageCircleIcon /> {t("whatsappUs")}
            </a>
          </Button>
          <Button asChild size="lg" variant="outline">
            <a href={`tel:+${wa}`}>
              <PhoneIcon /> {t("callUs")}
            </a>
          </Button>
        </div>
      )}
    </main>
  );
}
