import { getTranslations } from "next-intl/server";
import { KeyRoundIcon } from "lucide-react";
import { LanguageToggle } from "@/components/shared/language-toggle";
import { Logo } from "@/components/shared/logo";
import { getSession } from "@/lib/auth/session";
import { UpdatePasswordForm } from "./update-password-form";

export const dynamic = "force-dynamic";

export default async function UpdatePasswordPage() {
  const t = await getTranslations("forgot");
  const session = await getSession();

  return (
    <main className="mx-auto max-w-md space-y-6 px-5 py-6">
      <div className="flex items-center justify-between">
        <Logo />
        <LanguageToggle />
      </div>
      <h1 className="flex items-center gap-2 text-2xl font-bold">
        <KeyRoundIcon className="size-6" /> {t("newTitle")}
      </h1>
      {session?.user.email && <p className="text-muted-foreground">{t("newFor", { email: session.user.email })}</p>}
      <UpdatePasswordForm home={session?.isExpert ? "/expert" : "/chat"} />
    </main>
  );
}
