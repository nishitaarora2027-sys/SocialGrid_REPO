"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { AlertTriangleIcon, CheckCheckIcon, FlameIcon, InboxIcon, LoaderIcon, MicIcon, RotateCcwIcon, SparklesIcon } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { NativeSelect } from "@/components/ui/native-select";
import { useRealtimeRefresh } from "@/components/shared/use-realtime";
import { formatTimeLeft } from "@/lib/format";
import { urgencyLevel } from "@/lib/turnaround";
import { CONTENT_TYPES, type Business, type Industry, type RequestRow } from "@/lib/types";
import { cn } from "@/lib/utils";

export type QueueRow = RequestRow & {
  businessName: string;
  industry: Industry;
  firstKind: string | null;
  unread: boolean;
};

export function StatusBadge({ status }: { status: RequestRow["status"] }) {
  const t = useTranslations("expert.status");
  const variant =
    status === "new"
      ? "default"
      : status === "revision_requested"
        ? "warning"
        : status === "delivered" || status === "completed"
          ? "success"
          : status === "cancelled"
            ? "outline"
            : "secondary";
  return <Badge variant={variant}>{t(status)}</Badge>;
}

export function TimeLeft({ dueAt, done }: { dueAt: string; done?: boolean }) {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 30_000);
    return () => clearInterval(id);
  }, []);
  if (done) return <span className="text-muted-foreground">—</span>;
  const level = urgencyLevel(dueAt, now);
  return (
    <span
      suppressHydrationWarning
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[14px] font-bold tabular-nums",
        level === "overdue" && "bg-danger text-white",
        level === "soon" && "bg-status-soft text-status-ink",
        level === "on_time" && "bg-primary-soft text-primary",
      )}
    >
      {level === "overdue" && <AlertTriangleIcon className="size-3.5" />}
      {formatTimeLeft(dueAt, now)}
    </span>
  );
}

export function QueueView({
  rows,
  businesses,
  counts,
  filters,
}: {
  rows: QueueRow[];
  businesses: Pick<Business, "id" | "name" | "industry">[];
  counts: { new: number; inProgress: number; overdue: number; deliveredToday: number };
  filters: { client?: string; status?: string; type?: string; overdue?: string };
}) {
  const t = useTranslations("expert.queue");
  const tTypes = useTranslations("contentTypes");
  const tInd = useTranslations("industries");
  const tStatus = useTranslations("expert.status");
  const router = useRouter();
  useRealtimeRefresh("requests");

  const setFilter = (key: string, value: string) => {
    const sp = new URLSearchParams(Object.entries(filters).filter(([, v]) => v) as [string, string][]);
    if (value) sp.set(key, value);
    else sp.delete(key);
    router.push(`/expert?${sp.toString()}`);
  };

  const tiles = [
    { key: "new", value: counts.new, icon: InboxIcon, onClick: () => setFilter("status", "new"), cls: "text-primary" },
    { key: "inProgress", value: counts.inProgress, icon: LoaderIcon, onClick: () => setFilter("status", "in_progress"), cls: "text-foreground" },
    { key: "overdue", value: counts.overdue, icon: AlertTriangleIcon, onClick: () => setFilter("overdue", "1"), cls: "text-danger" },
    { key: "deliveredToday", value: counts.deliveredToday, icon: CheckCheckIcon, onClick: () => setFilter("status", "delivered"), cls: "text-primary" },
  ];

  const summary = (r: QueueRow) =>
    r.summary || (r.firstKind === "voice" ? t("voiceNote") : r.firstKind === "images" ? t("photosOnly") : t("noText"));

  return (
    <main className="space-y-5 p-4 lg:p-6">
      <h1 className="text-2xl font-bold">{t("title")}</h1>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {tiles.map(({ key, value, icon: Icon, onClick, cls }) => (
          <button key={key} type="button" onClick={onClick} className="rounded-[16px] border bg-card p-4 text-left hover:border-primary">
            <div className="flex items-center gap-2 text-sm font-semibold text-muted-foreground">
              <Icon className={cn("size-4", cls)} /> {t(`tiles.${key}`)}
            </div>
            <div className={cn("mt-1 text-3xl font-bold", cls)}>{value}</div>
          </button>
        ))}
      </div>

      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-5">
        <NativeSelect value={filters.client ?? ""} onChange={(e) => setFilter("client", e.target.value)} aria-label={t("filters.client")}>
          <option value="">{t("filters.allClients")}</option>
          {businesses.map((b) => (
            <option key={b.id} value={b.id}>
              {b.name}
            </option>
          ))}
        </NativeSelect>
        <NativeSelect value={filters.status ?? "open"} onChange={(e) => setFilter("status", e.target.value)} aria-label={t("filters.status")}>
          <option value="open">{t("filters.open")}</option>
          {(["new", "in_progress", "revision_requested", "delivered", "completed", "cancelled"] as const).map((s) => (
            <option key={s} value={s}>
              {tStatus(s)}
            </option>
          ))}
        </NativeSelect>
        <NativeSelect value={filters.type ?? ""} onChange={(e) => setFilter("type", e.target.value)} aria-label={t("filters.type")}>
          <option value="">{t("filters.allTypes")}</option>
          {CONTENT_TYPES.map((c) => (
            <option key={c} value={c}>
              {tTypes(c)}
            </option>
          ))}
        </NativeSelect>
        <label className="flex h-12 items-center gap-2 rounded-[12px] border bg-card px-4 font-semibold">
          <input
            type="checkbox"
            className="size-5 accent-[var(--primary)]"
            checked={filters.overdue === "1"}
            onChange={(e) => setFilter("overdue", e.target.checked ? "1" : "")}
          />
          {t("filters.overdueOnly")}
        </label>
        {Object.values(filters).some(Boolean) && (
          <button type="button" onClick={() => router.push("/expert")} className="h-12 rounded-[12px] px-4 font-semibold text-primary hover:bg-accent">
            {t("filters.clear")}
          </button>
        )}
      </div>

      {rows.length === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-[20px] border border-dashed py-16 text-center">
          <SparklesIcon className="size-10 text-primary" />
          <p className="text-lg font-semibold">{t("empty")}</p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-[16px] border bg-card">
          <div className="hidden grid-cols-[1.3fr_2fr_1fr_1fr_0.8fr] gap-3 border-b bg-muted/50 px-4 py-2.5 text-[13px] font-bold tracking-wide text-muted-foreground uppercase md:grid">
            <span>{t("cols.client")}</span>
            <span>{t("cols.request")}</span>
            <span>{t("cols.type")}</span>
            <span>{t("cols.status")}</span>
            <span>{t("cols.timeLeft")}</span>
          </div>
          <ul className="divide-y">
            {rows.map((r) => {
              const done = ["delivered", "completed", "cancelled"].includes(r.status);
              return (
                <li key={r.id}>
                  <Link
                    href={`/expert/requests/${r.id}`}
                    className="grid gap-1.5 px-4 py-3 hover:bg-accent/50 md:grid-cols-[1.3fr_2fr_1fr_1fr_0.8fr] md:items-center md:gap-3"
                  >
                    <div className="flex items-center gap-2">
                      {r.unread && <span className="size-2.5 shrink-0 rounded-full bg-primary" title={t("unread")} />}
                      <div>
                        <div className="font-bold">{r.businessName}</div>
                        <div className="text-[13px] text-muted-foreground">{tInd(r.industry)}</div>
                      </div>
                    </div>
                    <div className="flex min-w-0 flex-wrap items-center gap-1.5">
                      {r.firstKind === "voice" && !r.summary && <MicIcon className="size-4 text-primary" />}
                      <span className="truncate">{summary(r)}</span>
                      {r.is_urgent && (
                        <Badge variant="destructive">
                          <FlameIcon /> {t("urgent")}
                        </Badge>
                      )}
                      {r.current_revision > 0 && (
                        <Badge variant="warning">
                          <RotateCcwIcon /> {t("revision", { n: r.current_revision })}
                        </Badge>
                      )}
                    </div>
                    <div className="text-sm">{r.content_type ? tTypes(r.content_type) : <span className="text-muted-foreground">{t("typeNotSet")}</span>}</div>
                    <div>
                      <StatusBadge status={r.status} />
                    </div>
                    <div>
                      <TimeLeft dueAt={r.due_at} done={done} />
                    </div>
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </main>
  );
}
