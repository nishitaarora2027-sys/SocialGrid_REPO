"use client";

import { useActionState, useState } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { CheckCircle2Icon, EyeIcon, EyeOffIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { setNewPassword } from "@/lib/actions/recovery";

export function UpdatePasswordForm({ home }: { home: string }) {
  const t = useTranslations("forgot");
  const tLogin = useTranslations("login");
  const [state, action, pending] = useActionState(setNewPassword, undefined);
  const [show, setShow] = useState(false);

  if (state?.ok) {
    return (
      <div className="space-y-4 rounded-[16px] border border-primary/40 bg-primary-soft p-5">
        <p className="flex items-center gap-2 text-lg font-bold text-primary">
          <CheckCircle2Icon className="size-5" /> {t("changed")}
        </p>
        <Button asChild>
          <Link href={home}>{t("continue")}</Link>
        </Button>
      </div>
    );
  }

  return (
    <form action={action} className="space-y-5">
      <div className="space-y-2">
        <Label htmlFor="password">{t("newPassword")}</Label>
        <div className="relative">
          <Input
            id="password"
            name="password"
            type={show ? "text" : "password"}
            autoComplete="new-password"
            autoCapitalize="none"
            autoCorrect="off"
            spellCheck={false}
            minLength={8}
            required
            className="h-14 pr-28 text-lg"
          />
          <button
            type="button"
            onClick={() => setShow((s) => !s)}
            className="absolute top-1/2 right-2 flex h-11 -translate-y-1/2 items-center gap-1.5 rounded-lg px-3 text-sm font-semibold text-muted-foreground hover:bg-accent"
          >
            {show ? <EyeOffIcon className="size-5" /> : <EyeIcon className="size-5" />}
            {show ? tLogin("hide") : tLogin("show")}
          </button>
        </div>
      </div>
      {state && !state.ok && (
        <p role="alert" className="rounded-[12px] bg-danger/10 px-4 py-3 font-medium text-danger">
          {t.has(`errors.${state.error}` as never) ? t(`errors.${state.error}` as never) : state.error}
        </p>
      )}
      <Button type="submit" size="lg" className="w-full" disabled={pending}>
        {pending ? t("saving") : t("save")}
      </Button>
      {state && !state.ok && state.error === "expired" && (
        <Link href="/forgot" className="block text-center text-sm font-medium underline underline-offset-4">
          {t("requestNew")}
        </Link>
      )}
    </form>
  );
}
