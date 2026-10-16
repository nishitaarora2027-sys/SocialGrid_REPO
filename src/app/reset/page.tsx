import { getTranslations } from "next-intl/server";
import { KeyRoundIcon } from "lucide-react";
import { LanguageToggle } from "@/components/shared/language-toggle";
import { Logo } from "@/components/shared/logo";
import { isRecoveryEnabled } from "@/lib/actions/password";
import { ResetForm } from "./reset-form";

export const dynamic = "force-dynamic";

export default async function ResetPage() {
  const t = await getTranslations("reset");
  const enabled = await isRecoveryEnabled();

  return (
    <main className="mx-auto max-w-md space-y-6 px-5 py-6">
      <div className="flex items-center justify-between">
        <Logo />
        <LanguageToggle />
      </div>
      <h1 className="flex items-center gap-2 text-2xl font-bold">
        <KeyRoundIcon className="size-6" /> {t("title")}
      </h1>
      {enabled ? (
        <>
          <p className="text-muted-foreground">{t("intro")}</p>
          <ResetForm />
        </>
      ) : (
        <div className="space-y-3 rounded-2xl border-2 border-warning bg-warning/10 p-5">
          <h2 className="text-lg font-bold">{t("disabledTitle")}</h2>
          <p>{t("disabledText")}</p>
          <ol className="list-decimal space-y-1 pl-5">
            <li>{t("disabledStep1")}</li>
            <li>{t("disabledStep2")}</li>
            <li>{t("disabledStep3")}</li>
          </ol>
        </div>
      )}
    </main>
  );
}
