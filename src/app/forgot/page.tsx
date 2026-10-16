import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { MailIcon } from "lucide-react";
import { LanguageToggle } from "@/components/shared/language-toggle";
import { Logo } from "@/components/shared/logo";
import { ForgotForm } from "./forgot-form";

export const dynamic = "force-dynamic";

export default async function ForgotPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const t = await getTranslations("forgot");
  const { error } = await searchParams;

  return (
    <main className="mx-auto max-w-md space-y-6 px-5 py-6">
      <div className="flex items-center justify-between">
        <Logo />
        <LanguageToggle />
      </div>
      <h1 className="flex items-center gap-2 text-2xl font-bold">
        <MailIcon className="size-6" /> {t("title")}
      </h1>
      {error === "link" && (
        <p role="alert" className="rounded-xl bg-destructive/10 px-4 py-3 font-medium text-destructive">
          {t("linkExpired")}
        </p>
      )}
      <p className="text-muted-foreground">{t("intro")}</p>
      <ForgotForm />
      <Link href="/login" className="block text-center text-sm font-medium text-muted-foreground underline underline-offset-4">
        {t("backToLogin")}
      </Link>
    </main>
  );
}
