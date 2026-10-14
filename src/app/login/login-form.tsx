"use client";

import { useActionState, useState } from "react";
import { useTranslations } from "next-intl";
import { EyeIcon, EyeOffIcon, LogInIcon, PhoneIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { login } from "@/lib/actions/auth";

export function LoginForm() {
  const t = useTranslations("login");
  const [state, action, pending] = useActionState(login, undefined);
  const [show, setShow] = useState(false);

  return (
    <form action={action} className="space-y-5">
      <div className="space-y-2">
        <Label htmlFor="phone" className="text-base">
          {t("phone")}
        </Label>
        <div className="relative">
          <PhoneIcon className="absolute top-1/2 left-4 size-5 -translate-y-1/2 text-muted-foreground" />
          <Input
            id="phone"
            name="phone"
            inputMode="tel"
            autoComplete="username"
            placeholder="98765 43210"
            required
            className="h-14 pl-12 text-lg"
          />
        </div>
      </div>
      <div className="space-y-2">
        <Label htmlFor="password" className="text-base">
          {t("password")}
        </Label>
        <div className="relative">
          <Input
            id="password"
            name="password"
            type={show ? "text" : "password"}
            autoComplete="current-password"
            required
            className="h-14 pr-28 text-lg"
          />
          <button
            type="button"
            onClick={() => setShow((s) => !s)}
            className="absolute top-1/2 right-2 flex h-11 -translate-y-1/2 items-center gap-1.5 rounded-lg px-3 text-sm font-semibold text-muted-foreground hover:bg-accent"
          >
            {show ? <EyeOffIcon className="size-5" /> : <EyeIcon className="size-5" />}
            {show ? t("hide") : t("show")}
          </button>
        </div>
      </div>
      {state?.error && (
        <p role="alert" className="rounded-xl bg-destructive/10 px-4 py-3 font-medium text-destructive">
          {t(`errors.${state.error}`)}
        </p>
      )}
      <Button type="submit" size="lg" className="w-full" disabled={pending}>
        <LogInIcon />
        {pending ? t("signingIn") : t("submit")}
      </Button>
    </form>
  );
}
