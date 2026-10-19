"use client";

import { useActionState, useState } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { ArrowLeftIcon, CircleAlertIcon, Loader2Icon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { login } from "@/lib/actions/auth";

/** Business owners see their form by default; the team form is one quiet button away (same page, same URL). */
export function LoginForm() {
  const t = useTranslations("login");
  const [state, action, pending] = useActionState(login, undefined);
  const [show, setShow] = useState(false);
  // React clears the form after each submit; put back what was typed so only the password needs retyping
  const typed = state?.identifier ?? "";
  const [mode, setMode] = useState<"customer" | "team">(state?.mode ?? "customer");
  const [modeFrom, setModeFrom] = useState(state);
  if (state !== modeFrom) {
    // right password, wrong form: switch to the form the account belongs to
    setModeFrom(state);
    if (state?.error === "use_team_tab") setMode("team");
    else if (state?.error === "use_customer_tab") setMode("customer");
  }
  const switched = state?.error === "use_team_tab" || state?.error === "use_customer_tab";
  const team = mode === "team";

  return (
    <div className="flex flex-1 flex-col">
      {team ? (
        <div className="mt-10 flex flex-col gap-2 rounded-[16px] bg-ink px-4 py-3.5 text-paper">
          <h1 className="text-[22px] leading-tight font-bold">{t("teamTitle")}</h1>
          <button
            type="button"
            onClick={() => setMode("customer")}
            className="inline-flex items-center gap-1.5 self-start text-[16px] font-semibold underline-offset-4 hover:underline"
          >
            <ArrowLeftIcon className="size-4" /> {t("ownerLogin")}
          </button>
        </div>
      ) : (
        <div className="mt-10 space-y-1.5">
          <h1 className="text-[28px] leading-tight font-bold">{t("title")}</h1>
          <p className="text-[18px] text-ink-muted">{t("subtitle")}</p>
        </div>
      )}

      <form action={action} className="flex flex-col gap-4 pt-7" data-mode={mode}>
        <input type="hidden" name="mode" value={mode} />
        {switched && (
          <p role="status" className="rounded-[14px] bg-primary-soft px-4 py-3 text-[16px] font-semibold text-primary">
            {t(`errors.${state!.error}`)}
          </p>
        )}
        <div className="space-y-1.5">
          <Label htmlFor="email" className="text-[16px] font-semibold">
            {t("email")}
          </Label>
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
            placeholder="name@example.com"
            defaultValue={typed}
            required
            aria-invalid={state?.error === "invalid_email" || undefined}
            className="h-14 text-[18px]"
          />
          {state?.error === "invalid_email" && <FieldError>{t("errors.invalid_email")}</FieldError>}
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="password" className="text-[16px] font-semibold">
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
              aria-invalid={(!!state?.error && !switched && state.error !== "invalid_email") || undefined}
              className="h-14 pr-20 text-[18px]"
            />
            <button
              type="button"
              onClick={() => setShow((s) => !s)}
              className="absolute top-1/2 right-2 flex h-11 -translate-y-1/2 items-center rounded-[10px] px-2.5 text-[16px] font-semibold text-primary"
            >
              {show ? t("hide") : t("show")}
            </button>
          </div>
          {state?.error && !switched && state.error !== "invalid_email" && (
            <FieldError>{t(`errors.${state.error}`, { code: state.code ?? "" })}</FieldError>
          )}
        </div>
        <Button type="submit" size="lg" className="mt-1 w-full" disabled={pending}>
          {pending && <Loader2Icon className="animate-spin" />}
          {pending ? t("signingIn") : t("submit")}
        </Button>
        <Link href="/forgot" className="py-1 text-center text-[16px] font-semibold text-primary">
          {t("forgot")}
        </Link>
        {team && (
          <Link href="/reset" className="text-center text-[15px] text-ink-muted underline underline-offset-4">
            {t("rescue")}
          </Link>
        )}
      </form>

      {!team && <p className="mt-6 text-center text-[15px] text-ink-muted">{t("help")}</p>}

      <div className="mt-auto -mx-1 flex items-center justify-between gap-3 border-t border-line pt-[18px] pb-7 lg:mt-10 lg:pb-0">
        {team ? (
          <>
            <span className="text-[16px] text-ink-muted">{t("ownerQuestion")}</span>
            <Button type="button" variant="outline" size="sm" className="h-auto px-3.5 py-2.5 text-[16px]" onClick={() => setMode("customer")}>
              {t("ownerLoginShort")}
            </Button>
          </>
        ) : (
          <>
            <span className="text-[16px] text-ink-muted">{t("teamQuestion")}</span>
            <Button type="button" variant="outline" size="sm" className="h-auto px-3.5 py-2.5 text-[16px]" onClick={() => setMode("team")}>
              {t("teamLogin")}
            </Button>
          </>
        )}
      </div>
    </div>
  );
}

function FieldError({ children }: { children: React.ReactNode }) {
  return (
    <p role="alert" className="flex items-start gap-1.5 text-[15px] text-danger">
      <CircleAlertIcon className="mt-0.5 size-4 shrink-0" aria-hidden />
      {children}
    </p>
  );
}
