"use client";

import { useActionState } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { CheckCircle2Icon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { recoverPassword } from "@/lib/actions/password";

const KNOWN_ERRORS = ["not_enabled", "wrong_code", "short_password", "no_user"];

export function ResetForm() {
  const t = useTranslations("reset");
  const [state, action, pending] = useActionState(recoverPassword, undefined);

  if (state?.ok) {
    return (
      <div className="space-y-4 rounded-2xl border-2 border-success/40 bg-success/10 p-5">
        <p className="flex items-center gap-2 text-lg font-bold text-success">
          <CheckCircle2Icon className="size-5" /> {t("done")}
        </p>
        <Button asChild>
          <Link href="/login">{t("goToLogin")}</Link>
        </Button>
      </div>
    );
  }

  const plain = { autoCapitalize: "none", autoCorrect: "off", spellCheck: false } as const;
  const typedLogin = state && !state.ok ? (state.login ?? "") : "";
  return (
    <form action={action} className="space-y-5">
      <div className="space-y-2">
        <Label htmlFor="code">{t("code")}</Label>
        <Input id="code" name="code" type="password" autoComplete="off" required className="h-12" {...plain} />
      </div>
      <div className="space-y-2">
        <Label htmlFor="login">{t("login")}</Label>
        <Input key={typedLogin} id="login" name="login" type="text" defaultValue={typedLogin} placeholder={t("loginPlaceholder")} required className="h-12" {...plain} />
      </div>
      <div className="space-y-2">
        <Label htmlFor="password">{t("newPassword")}</Label>
        <Input id="password" name="password" type="text" minLength={8} autoComplete="new-password" required className="h-12 font-mono" {...plain} />
      </div>
      {state && !state.ok && (
        <p role="alert" className="rounded-xl bg-destructive/10 px-4 py-3 font-medium text-destructive">
          {KNOWN_ERRORS.includes(state.error) ? t(`errors.${state.error}`) : state.error}
        </p>
      )}
      <Button type="submit" size="lg" className="w-full" disabled={pending}>
        {pending ? t("saving") : t("submit")}
      </Button>
    </form>
  );
}
