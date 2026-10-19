import { getTranslations } from "next-intl/server";
import { CameraIcon, DownloadIcon, MessageCircleIcon, MicIcon, PencilIcon, PhoneIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { SUPPORT_WHATSAPP } from "@/lib/config";

export default async function HelpPage() {
  const t = await getTranslations("help");
  const steps = [
    { icon: MessageCircleIcon, key: "ask" },
    { icon: MicIcon, key: "voice" },
    { icon: CameraIcon, key: "photos" },
    { icon: DownloadIcon, key: "download" },
    { icon: PencilIcon, key: "changes" },
  ] as const;
  const wa = SUPPORT_WHATSAPP.replace(/\D/g, "");

  return (
    <main className="mx-auto w-full max-w-2xl flex-1 space-y-3 px-3 py-3 lg:space-y-5 lg:px-10 lg:py-8">
      <h1 className="text-[30px] leading-tight font-bold max-lg:sr-only">{t("title")}</h1>
      <div className="space-y-2.5">
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
