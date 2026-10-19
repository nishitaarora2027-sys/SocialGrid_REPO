import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { CheckCircle2Icon, DatabaseIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { LanguageToggle } from "@/components/shared/language-toggle";
import { Logo } from "@/components/shared/logo";
import { getSetupStatus } from "@/lib/actions/setup";
import { SetupForm } from "./setup-form";

export const dynamic = "force-dynamic";

export default async function SetupPage() {
  const t = await getTranslations("setup");
  const status = await getSetupStatus();

  return (
    <main className="mx-auto max-w-xl space-y-6 bg-paper px-6 pt-14 pb-10">
      <div className="flex items-center justify-between">
        <Logo />
        <LanguageToggle />
      </div>
      <h1 className="text-[28px] leading-tight font-bold">{t("title")}</h1>

      {status.stage === "no_supabase" && (
        <div className="space-y-3 rounded-[16px] border border-status bg-status-soft p-5">
          <h2 className="flex items-center gap-2 text-lg font-bold">
            <DatabaseIcon className="size-5" /> {t("noSupabaseTitle")}
          </h2>
          <p>{t("noSupabaseText")}</p>
        </div>
      )}

      {status.stage === "done" && (
        <div className="space-y-4 rounded-[16px] border border-primary/40 bg-primary-soft p-5">
          <p className="flex items-center gap-2 text-lg font-bold text-primary">
            <CheckCircle2Icon className="size-5" /> {t("doneText")}
          </p>
          <Button asChild>
            <Link href="/login">{t("goToLogin")}</Link>
          </Button>
        </div>
      )}

      {status.stage === "ready" && (
        <>
          <p className="text-muted-foreground">{status.schema ? t("introSchemaReady") : t("intro")}</p>
          {!status.schema && !status.canMigrate && (
            <p className="rounded-[12px] bg-danger/10 p-4 font-medium text-danger">{t("errors.no_database")}</p>
          )}
          <SetupForm />
        </>
      )}
    </main>
  );
}
