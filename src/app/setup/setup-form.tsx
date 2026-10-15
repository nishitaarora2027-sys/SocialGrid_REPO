"use client";

import { useActionState } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { CheckCircle2Icon, Loader2Icon, RocketIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { runSetup } from "@/lib/actions/setup";

export function SetupForm() {
  const t = useTranslations("setup");
  const [state, action, pending] = useActionState(runSetup, undefined);

  if (state?.ok) {
    return (
      <div className="space-y-4 rounded-2xl border-2 border-success/40 bg-card p-5">
        <p className="flex items-center gap-2 text-lg font-bold text-success">
          <CheckCircle2Icon className="size-5" /> {t("success")}
        </p>
        <p className="font-semibold text-destructive">{t("saveNow")}</p>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <tbody className="divide-y">
              {state.credentials.map((c) => (
                <tr key={c.login}>
                  <td className="py-2 pr-3 font-semibold">{c.label}</td>
                  <td className="py-2 pr-3 font-mono">{c.login}</td>
                  <td className="py-2 font-mono">{c.password}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <Button asChild size="lg" className="w-full">
          <Link href="/login">{t("goToLogin")}</Link>
        </Button>
      </div>
    );
  }

  return (
    <form action={action} className="space-y-5">
      {[1, 2].map((n) => (
        <fieldset key={n} className="space-y-3 rounded-2xl border bg-card p-4">
          <legend className="px-1 font-bold">
            {t("founder", { n })} {n === 2 && <span className="font-normal text-muted-foreground">({t("optional")})</span>}
          </legend>
          <div className="space-y-1">
            <Label htmlFor={`name${n}`}>{t("name")}</Label>
            <Input id={`name${n}`} name={`name${n}`} required={n === 1} />
          </div>
          <div className="space-y-1">
            <Label htmlFor={`email${n}`}>{t("email")}</Label>
            <Input id={`email${n}`} name={`email${n}`} type="email" required={n === 1} autoComplete="off" />
          </div>
          <div className="space-y-1">
            <Label htmlFor={`password${n}`}>{t("password")}</Label>
            <Input id={`password${n}`} name={`password${n}`} type="text" minLength={8} required={n === 1} autoComplete="off" className="font-mono" />
          </div>
        </fieldset>
      ))}
      <label className="flex min-h-12 items-center gap-3 rounded-xl border-2 bg-card px-4">
        <input type="checkbox" name="samples" defaultChecked className="size-5" />
        <span className="font-semibold">{t("samples")}</span>
      </label>
      {state && !state.ok && (
        <div role="alert" className="rounded-xl bg-destructive/10 p-4 font-medium text-destructive">
          {t(`errors.${state.error}` as never)}
          {state.detail && <pre className="mt-2 text-xs whitespace-pre-wrap">{state.detail}</pre>}
        </div>
      )}
      <Button type="submit" size="lg" className="w-full" disabled={pending}>
        {pending ? <Loader2Icon className="animate-spin" /> : <RocketIcon />} {pending ? t("working") : t("submit")}
      </Button>
    </form>
  );
}
