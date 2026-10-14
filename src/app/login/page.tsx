import { getTranslations } from "next-intl/server";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/session";
import { LanguageToggle } from "@/components/shared/language-toggle";
import { Logo } from "@/components/shared/logo";
import { LoginForm } from "./login-form";

export default async function LoginPage() {
  const session = await getSession();
  if (session) redirect(session.isExpert ? "/expert" : "/chat");
  const t = await getTranslations("login");

  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col px-5 py-6">
      <div className="flex items-center justify-between">
        <Logo />
        <LanguageToggle />
      </div>
      <div className="flex flex-1 flex-col justify-center gap-8 py-10">
        <div className="space-y-2">
          <h1 className="text-3xl font-bold">{t("title")}</h1>
          <p className="text-lg text-muted-foreground">{t("subtitle")}</p>
        </div>
        <LoginForm />
        <p className="text-center text-muted-foreground">{t("help")}</p>
      </div>
    </main>
  );
}
