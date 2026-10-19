import { getTranslations } from "next-intl/server";
import { AuthShell } from "@/components/shared/auth-shell";
import { isRecoveryEnabled } from "@/lib/actions/password";
import { ResetForm } from "./reset-form";

export const dynamic = "force-dynamic";

export default async function ResetPage() {
  const t = await getTranslations("reset");
  const enabled = await isRecoveryEnabled();

  return (
    <AuthShell>
      <div className="space-y-6">
      <h1 className="text-[28px] leading-tight font-bold">
        {t("title")}
      </h1>
      {enabled ? (
        <>
          <p className="text-[18px] text-ink-muted">{t("intro")}</p>
          <ResetForm />
        </>
      ) : (
        <div className="space-y-3 rounded-[16px] border border-status bg-status-soft p-5">
          <h2 className="text-lg font-bold">{t("disabledTitle")}</h2>
          <p>{t("disabledText")}</p>
          <ol className="list-decimal space-y-1 pl-5">
            <li>{t("disabledStep1")}</li>
            <li>{t("disabledStep2")}</li>
            <li>{t("disabledStep3")}</li>
          </ol>
        </div>
      )}
      </div>
    </AuthShell>
  );
}
