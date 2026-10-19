"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { KeyRoundIcon, Loader2Icon, LockOpenIcon, StoreIcon, UserPlusIcon, UsersIcon } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { TeamMemberForm } from "@/components/shared/team-member-form";
import {
  rescueCreateCustomer,
  rescueCreateTeam,
  rescueListAccounts,
  rescueSetPassword,
  type RescueAccount,
} from "@/lib/actions/password";

const plain = { autoCapitalize: "none", autoCorrect: "off", spellCheck: false } as const;

export function ResetForm() {
  const t = useTranslations("reset");
  const [code, setCode] = useState("");
  const [accounts, setAccounts] = useState<RescueAccount[] | null>(null);
  const [error, setError] = useState("");
  const [pending, start] = useTransition();

  const message = (e: string) => (t.has(`errors.${e}` as never) ? t(`errors.${e}` as never) : e);

  const unlock = () =>
    start(async () => {
      setError("");
      const res = await rescueListAccounts(code);
      if (!res.ok) setError(message(res.error));
      else setAccounts(res.accounts);
    });

  const reload = async () => {
    const res = await rescueListAccounts(code);
    if (res.ok) setAccounts(res.accounts);
  };

  if (!accounts) {
    return (
      <form
        className="space-y-4"
        onSubmit={(e) => {
          e.preventDefault();
          unlock();
        }}
      >
        <div className="space-y-2">
          <Label htmlFor="code">{t("code")}</Label>
          <Input id="code" type="password" autoComplete="off" value={code} onChange={(e) => setCode(e.target.value)} required className="h-12" {...plain} />
        </div>
        {error && (
          <p role="alert" className="rounded-[12px] bg-danger/10 px-4 py-3 font-medium text-danger">
            {error}
          </p>
        )}
        <Button type="submit" size="lg" className="w-full" disabled={pending || !code.trim()}>
          {pending ? <Loader2Icon className="animate-spin" /> : <LockOpenIcon />} {t("unlock")}
        </Button>
      </form>
    );
  }

  const team = accounts.filter((a) => a.kind === "team");
  const customers = accounts.filter((a) => a.kind === "customer");
  const unfinished = accounts.filter((a) => a.kind === "unfinished");

  return (
    <div className="space-y-6">
      <Group title={t("teamTitle")} hint={t("teamHint")} icon={<UsersIcon className="size-5" />} accounts={team} code={code} message={message} />
      <section className="space-y-3 rounded-[16px] border border-primary/30 bg-primary/5 p-4">
        <h2 className="flex items-center gap-2 text-lg font-bold">
          <UsersIcon className="size-5" /> {t("createTeamTitle")}
        </h2>
        <p className="text-sm text-muted-foreground">{t("createTeamHint")}</p>
        <TeamMemberForm submit={(input) => rescueCreateTeam(code, input)} onDone={reload} />
      </section>
      <Group title={t("customersTitle")} hint={t("customersHint")} icon={<StoreIcon className="size-5" />} accounts={customers} code={code} message={message} />
      {unfinished.length > 0 && (
        <Group title={t("unfinishedTitle")} hint={t("unfinishedHint")} icon={<KeyRoundIcon className="size-5" />} accounts={unfinished} code={code} message={message} />
      )}
      <CreateCustomer code={code} message={message} onCreated={reload} />
      <Button asChild variant="outline" className="w-full">
        <Link href="/login">{t("goToLogin")}</Link>
      </Button>
    </div>
  );
}

function Group({
  title,
  hint,
  icon,
  accounts,
  code,
  message,
}: {
  title: string;
  hint: string;
  icon: React.ReactNode;
  accounts: RescueAccount[];
  code: string;
  message: (e: string) => string;
}) {
  const t = useTranslations("reset");
  return (
    <section className="space-y-3">
      <div>
        <h2 className="flex items-center gap-2 text-lg font-bold">
          {icon} {title} <Badge variant="secondary">{accounts.length}</Badge>
        </h2>
        <p className="text-sm text-muted-foreground">{hint}</p>
      </div>
      {accounts.length === 0 && <p className="rounded-[12px] border border-dashed p-3 text-sm text-muted-foreground">{t("none")}</p>}
      {accounts.map((a) => (
        <AccountRow key={a.id} account={a} code={code} message={message} />
      ))}
    </section>
  );
}

function AccountRow({ account, code, message }: { account: RescueAccount; code: string; message: (e: string) => string }) {
  const t = useTranslations("reset");
  const [password, setPassword] = useState("");
  const [pending, start] = useTransition();
  const save = () =>
    start(async () => {
      const res = await rescueSetPassword(code, account.id, password);
      if (!res.ok) {
        toast.error(message(res.error ?? "failed"));
        return;
      }
      toast.success(t("passwordSet", { email: account.email }));
      setPassword("");
    });
  return (
    <div className="space-y-2 rounded-[16px] border bg-card p-3" data-testid="account-row">
      <div className="text-[13px] font-semibold text-muted-foreground uppercase">{t("loginEmail")}</div>
      <div className="font-mono text-base break-all select-all" data-testid="account-email">
        {account.email}
      </div>
      <div className="text-sm text-muted-foreground">
        {[account.business, account.name].filter(Boolean).join(" · ") || "—"} ·{" "}
        {account.lastSignIn ? t("lastLogin", { date: account.lastSignIn.slice(0, 10) }) : t("neverLoggedIn")}
      </div>
      <div className="flex gap-2">
        <Input
          type="text"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder={t("newPassword")}
          aria-label={`${t("newPassword")} ${account.email}`}
          className="font-mono"
          {...plain}
        />
        <Button onClick={save} disabled={pending || password.trim().length < 8}>
          {pending ? <Loader2Icon className="animate-spin" /> : <KeyRoundIcon />} {t("setPassword")}
        </Button>
      </div>
    </div>
  );
}

function CreateCustomer({ code, message, onCreated }: { code: string; message: (e: string) => string; onCreated: () => Promise<void> }) {
  const t = useTranslations("reset");
  const [f, setF] = useState({ businessName: "Demo Salon", ownerName: "Demo Owner", email: "", password: "" });
  const [pending, start] = useTransition();
  const submit = () =>
    start(async () => {
      const res = await rescueCreateCustomer(code, f);
      if (!res.ok) {
        toast.error(message(res.error ?? "failed"));
        return;
      }
      toast.success(t("customerCreated", { email: f.email.trim().toLowerCase() }));
      setF({ ...f, email: "", password: "" });
      await onCreated();
    });
  return (
    <section className="space-y-3 rounded-[16px] border border-primary/30 bg-primary/5 p-4">
      <h2 className="flex items-center gap-2 text-lg font-bold">
        <UserPlusIcon className="size-5" /> {t("createTitle")}
      </h2>
      <p className="text-sm text-muted-foreground">{t("createHint")}</p>
      {(["businessName", "ownerName", "email", "password"] as const).map((k) => (
        <div key={k} className="space-y-1">
          <Label htmlFor={`new-${k}`}>{t(`create.${k}`)}</Label>
          <Input
            id={`new-${k}`}
            type={k === "email" ? "email" : "text"}
            value={f[k]}
            onChange={(e) => setF({ ...f, [k]: e.target.value })}
            className={k === "password" ? "font-mono" : undefined}
            {...(k === "email" || k === "password" ? plain : {})}
          />
        </div>
      ))}
      <Button onClick={submit} disabled={pending || !f.email.includes("@") || f.password.trim().length < 8 || !f.businessName.trim() || !f.ownerName.trim()}>
        {pending ? <Loader2Icon className="animate-spin" /> : <UserPlusIcon />} {t("createButton")}
      </Button>
    </section>
  );
}
