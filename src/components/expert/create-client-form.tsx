"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { ArrowRightIcon, Loader2Icon, ShuffleIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createClientAccount } from "@/lib/actions/expert-clients";
import { INDUSTRIES, type Industry } from "@/lib/types";
import { cn } from "@/lib/utils";

function easyPassword() {
  // short and easy to read out loud: word + 4 digits
  const words = ["sunrise", "mango", "lotus", "tiger", "masala", "rose", "peacock", "chai"];
  return `${words[Math.floor(Math.random() * words.length)]}${Math.floor(1000 + Math.random() * 9000)}`;
}

export function CreateClientForm() {
  const t = useTranslations("expert.createClient");
  const tInd = useTranslations("industries");
  const router = useRouter();
  const [pending, start] = useTransition();
  const [industry, setIndustry] = useState<Industry>("restaurant");
  const [language, setLanguage] = useState<"en" | "hi">("hi");
  const [password, setPassword] = useState(easyPassword);

  const submit = (fd: FormData) =>
    start(async () => {
      const res = await createClientAccount({
        businessName: String(fd.get("businessName")),
        ownerName: String(fd.get("ownerName")),
        phone: String(fd.get("phone")),
        password,
        industry,
        language,
      });
      if (!res.ok) {
        toast.error(t.has(`errors.${res.error}` as never) ? t(`errors.${res.error}` as never) : res.error);
        return;
      }
      toast.success(t("created"));
      router.push(`/expert/clients/${res.businessId}?wizard=1`);
    });

  return (
    <form action={submit} className="space-y-5 rounded-2xl border bg-card p-5">
      <div className="space-y-1.5">
        <Label htmlFor="businessName">{t("businessName")}</Label>
        <Input id="businessName" name="businessName" required />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="ownerName">{t("ownerName")}</Label>
        <Input id="ownerName" name="ownerName" required placeholder={t("ownerNameHint")} />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="phone">{t("phone")}</Label>
        <Input id="phone" name="phone" inputMode="tel" required placeholder="98765 43210" />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="password">{t("password")}</Label>
        <div className="flex gap-2">
          <Input id="password" value={password} onChange={(e) => setPassword(e.target.value)} minLength={6} required className="font-mono" />
          <Button type="button" variant="outline" onClick={() => setPassword(easyPassword())}>
            <ShuffleIcon /> {t("newPassword")}
          </Button>
        </div>
        <p className="text-sm text-muted-foreground">{t("passwordHint")}</p>
      </div>
      <div className="space-y-1.5">
        <Label>{t("industry")}</Label>
        <div className="grid grid-cols-2 gap-2">
          {INDUSTRIES.map((i) => (
            <button
              key={i}
              type="button"
              onClick={() => setIndustry(i)}
              className={cn("h-12 rounded-xl border-2 font-semibold", industry === i ? "border-primary bg-secondary" : "bg-card")}
            >
              {tInd(i)}
            </button>
          ))}
        </div>
      </div>
      <div className="space-y-1.5">
        <Label>{t("language")}</Label>
        <div className="grid grid-cols-2 gap-2">
          {(["hi", "en"] as const).map((l) => (
            <button
              key={l}
              type="button"
              onClick={() => setLanguage(l)}
              className={cn("h-12 rounded-xl border-2 font-semibold", language === l ? "border-primary bg-secondary" : "bg-card")}
            >
              {l === "hi" ? "हिंदी" : "English"}
            </button>
          ))}
        </div>
      </div>
      <Button type="submit" size="lg" className="w-full" disabled={pending}>
        {pending ? <Loader2Icon className="animate-spin" /> : <ArrowRightIcon />} {t("submit")}
      </Button>
    </form>
  );
}
