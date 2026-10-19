import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { AuthShell } from "@/components/shared/auth-shell";
import { ForgotForm } from "./forgot-form";

export const dynamic = "force-dynamic";

export default async function ForgotPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const t = await getTranslations("forgot");
  const { error } = await searchParams;

  return (
    <AuthShell>
      <div className="space-y-6 py-10">
      <h1 className="text-[28px] leading-tight font-bold">
        {t("title")}
      </h1>
      {error === "link" && (
        <p role="alert" className="rounded-[12px] bg-danger/10 px-4 py-3 font-medium text-danger">
          {t("linkExpired")}
        </p>
      )}
      <p className="text-[18px] text-ink-muted">{t("intro")}</p>
      <ForgotForm />
      <Link href="/login" className="block text-center text-[16px] font-semibold text-primary">
        {t("backToLogin")}
      </Link>
      </div>
    </AuthShell>
  );
}
