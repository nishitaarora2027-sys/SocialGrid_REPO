"use client";

import { useActionState, useState } from "react";
import { useTranslations } from "next-intl";
import { EyeIcon, EyeOffIcon, LogInIcon, MailIcon, PhoneIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { login } from "@/lib/actions/auth";

export function LoginForm() {
  const t = useTranslations("login");
  const [state, action, pending] = useActionState(login, undefined);
  const [show, setShow] = useState(false);
  // experts log in with an email; the phone keypad has no "@", so let them switch keyboards
  const [byEmail, setByEmail] = useState(false);
  const FieldIcon = byEmail ? MailIcon : PhoneIcon;

  return (
    <form action={action} className="space-y-5">
      <div className="space-y-2">
        <Label htmlFor="phone" className="text-base">
          {byEmail ? t("email") : t("phone")}
        </Label>
        <div className="relative">
          <FieldIcon className="absolute top-1/2 left-4 size-5 -translate-y-1/2 text-muted-foreground" />
          <Input
            key={byEmail ? "email" : "phone"}
            id="phone"
            name="phone"
            type={byEmail ? "email" : "text"}
            inputMode={byEmail ? "email" : "tel"}
            autoComplete="username"
            autoCapitalize="none"
            autoCorrect="off"
            spellCheck={false}
            placeholder={byEmail ? "name@example.com" : "98765 43210"}
            required
            className="h-14 pl-12 text-lg"
          />
        </div>
        <button
          type="button"
          onClick={() => setByEmail((v) => !v)}
          className="text-sm font-medium text-muted-foreground underline underline-offset-4"
        >
          {byEmail ? t("usePhone") : t("useEmail")}
        </button>
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
            autoCapitalize="none"
            autoCorrect="off"
            spellCheck={false}
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
          {t(`errors.${state.error}`, { code: state.code ?? "" })}
        </p>
      )}
      <Button type="submit" size="lg" className="w-full" disabled={pending}>
        <LogInIcon />
        {pending ? t("signingIn") : t("submit")}
      </Button>
    </form>
  );
}
