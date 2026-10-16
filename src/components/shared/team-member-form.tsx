"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { Loader2Icon, UserPlusIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type Res = { ok: boolean; error?: string; repaired?: boolean };

/** Name + email + password form for adding a SocialGrid team (founder) login. */
export function TeamMemberForm({ submit, onDone }: { submit: (input: { name: string; email: string; password: string }) => Promise<Res>; onDone?: () => void | Promise<void> }) {
  const t = useTranslations("teamForm");
  const [f, setF] = useState({ name: "", email: "", password: "" });
  const [pending, start] = useTransition();
  const plain = { autoCapitalize: "none", autoCorrect: "off", spellCheck: false } as const;

  const go = () =>
    start(async () => {
      const res = await submit(f);
      if (!res.ok) {
        const e = res.error ?? "failed";
        toast.error(t.has(`errors.${e}` as never) ? t(`errors.${e}` as never) : e);
        return;
      }
      toast.success(t(res.repaired ? "repaired" : "created", { email: f.email.trim().toLowerCase() }));
      setF({ name: "", email: "", password: "" });
      await onDone?.();
    });

  return (
    <div className="space-y-3">
      <div className="space-y-1">
        <Label htmlFor="team-name">{t("name")}</Label>
        <Input id="team-name" value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} />
      </div>
      <div className="space-y-1">
        <Label htmlFor="team-email">{t("email")}</Label>
        <Input id="team-email" type="email" value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} {...plain} />
      </div>
      <div className="space-y-1">
        <Label htmlFor="team-password">{t("password")}</Label>
        <Input id="team-password" type="text" className="font-mono" value={f.password} onChange={(e) => setF({ ...f, password: e.target.value })} {...plain} />
      </div>
      <Button onClick={go} disabled={pending || !f.name.trim() || !f.email.includes("@") || f.password.trim().length < 8}>
        {pending ? <Loader2Icon className="animate-spin" /> : <UserPlusIcon />} {t("submit")}
      </Button>
    </div>
  );
}
