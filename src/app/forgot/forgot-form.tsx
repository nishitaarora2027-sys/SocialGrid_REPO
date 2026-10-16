"use client";

import { useActionState } from "react";
import { useTranslations } from "next-intl";
import { CheckCircle2Icon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { requestPasswordReset } from "@/lib/actions/recovery";

export function ForgotForm() {
  const t = useTranslations("forgot");
  const [state, action, pending] = useActionState(requestPasswordReset, undefined);

  if (state?.ok) {
    return (
      <div className="space-y-2 rounded-2xl border-2 border-success/40 bg-success/10 p-5">
        <p className="flex items-center gap-2 text-lg font-bold text-success">
          <CheckCircle2Icon className="size-5" /> {t("sentTitle")}
        </p>
        <p>{t("sentText")}</p>
      </div>
    );
  }

  const typed = state && !state.ok ? (state.email ?? "") : "";
  return (
    <form action={action} className="space-y-5">
      <div className="space-y-2">
        <Label htmlFor="email">{t("email")}</Label>
        <Input
          key={typed}
          id="email"
          name="email"
          type="email"
          inputMode="email"
          autoComplete="username"
          autoCapitalize="none"
          autoCorrect="off"
          spellCheck={false}
          defaultValue={typed}
          placeholder="name@example.com"
          required
          className="h-14 text-lg"
        />
      </div>
      {state && !state.ok && (
        <p role="alert" className="rounded-xl bg-destructive/10 px-4 py-3 font-medium text-destructive">
          {t(`errors.${state.error}` as never)}
        </p>
      )}
      <Button type="submit" size="lg" className="w-full" disabled={pending}>
        {pending ? t("sending") : t("submit")}
      </Button>
    </form>
  );
}
