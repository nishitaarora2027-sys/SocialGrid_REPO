import { getTranslations } from "next-intl/server";
import { AuthShell } from "@/components/shared/auth-shell";
import { getSession } from "@/lib/auth/session";
import { UpdatePasswordForm } from "./update-password-form";

export const dynamic = "force-dynamic";

export default async function UpdatePasswordPage() {
  const t = await getTranslations("forgot");
  const session = await getSession();

  return (
    <AuthShell>
      <div className="space-y-6 py-10">
      <h1 className="text-[28px] leading-tight font-bold">
        {t("newTitle")}
      </h1>
      {session?.user.email && <p className="text-[18px] text-ink-muted">{t("newFor", { email: session.user.email })}</p>}
      <UpdatePasswordForm home={session?.isExpert ? "/expert" : "/chat"} />
      </div>
    </AuthShell>
  );
}
