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

  // summary tiles work like Reminders' smart lists: a coloured icon, a big number, tap to filter
  const tiles = [
    { key: "new", value: counts.new, icon: InboxIcon, dot: "bg-ink text-paper", on: filters.status === "new", onClick: () => setFilter("status", filters.status === "new" ? "" : "new") },
    { key: "inProgress", value: counts.inProgress, icon: LoaderIcon, dot: "bg-status text-white", on: filters.status === "in_progress", onClick: () => setFilter("status", filters.status === "in_progress" ? "" : "in_progress") },
    { key: "overdue", value: counts.overdue, icon: AlertTriangleIcon, dot: "bg-danger text-white", on: filters.overdue === "1", onClick: () => setFilter("overdue", filters.overdue === "1" ? "" : "1") },
    { key: "deliveredToday", value: counts.deliveredToday, icon: CheckCheckIcon, dot: "sunset-bg text-white", on: filters.status === "delivered", onClick: () => setFilter("status", filters.status === "delivered" ? "" : "delivered") },
  ];
  const openCount = counts.new + counts.inProgress;

  const summary = (r: QueueRow) =>
    r.summary || (r.firstKind === "voice" ? t("voiceNote") : r.firstKind === "images" ? t("photosOnly") : t("noText"));

  return (
    <main className="mx-auto max-w-6xl space-y-6 px-4 py-6 lg:px-8 lg:py-8">
      <header>
        <h1 className="display text-[34px] leading-tight font-bold lg:text-[40px]">{t("title")}</h1>
        <p className="mt-1 text-[17px] text-ink-muted">
          {counts.overdue > 0 ? t("subtitleLate", { open: openCount, late: counts.overdue }) : t("subtitle", { open: openCount })}
        </p>
      </header>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {tiles.map(({ key, value, icon: Icon, dot, on, onClick }) => (
          <button
            key={key}
            type="button"
            onClick={onClick}
            aria-pressed={on}
            className={cn(
              "flex flex-col gap-3 rounded-[22px] bg-surface p-4 text-left ring-1 transition duration-150 hover:-translate-y-0.5",
              on ? "ring-2 ring-ink" : "ring-line hover:ring-line-strong",
            )}
          >
            <span className="flex items-start justify-between">
              <span className={cn("flex size-9 items-center justify-center rounded-full", dot)}>
                <Icon className="size-[18px]" />
              </span>
              <span className={cn("display text-[34px] leading-none font-bold tabular-nums", key === "overdue" && value > 0 && "text-danger")}>{value}</span>
            </span>
            <span className="text-[15px] font-semibold text-ink-muted">{t(`tiles.${key}`)}</span>
          </button>
        ))}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <NativeSelect compact value={filters.client ?? ""} onChange={(e) => setFilter("client", e.target.value)} aria-label={t("filters.client")}>
          <option value="">{t("filters.allClients")}</option>
          {businesses.map((b) => (
            <option key={b.id} value={b.id}>
              {b.name}
            </option>
          ))}
        </NativeSelect>
        <NativeSelect compact value={filters.status ?? "open"} onChange={(e) => setFilter("status", e.target.value)} aria-label={t("filters.status")}>
          <option value="open">{t("filters.open")}</option>
          {(["new", "in_progress", "revision_requested", "delivered", "completed", "cancelled"] as const).map((s) => (
            <option key={s} value={s}>
              {tStatus(s)}
            </option>
          ))}
        </NativeSelect>
        <NativeSelect compact value={filters.type ?? ""} onChange={(e) => setFilter("type", e.target.value)} aria-label={t("filters.type")}>
          <option value="">{t("filters.allTypes")}</option>
          {CONTENT_TYPES.map((c) => (
            <option key={c} value={c}>
              {tTypes(c)}
            </option>
          ))}
        </NativeSelect>
        <button
          type="button"
          aria-pressed={filters.overdue === "1"}
          onClick={() => setFilter("overdue", filters.overdue === "1" ? "" : "1")}
          className={cn(
            "flex h-10 items-center gap-1.5 rounded-full px-4 text-[15px] font-semibold ring-1 transition-colors",
            filters.overdue === "1" ? "bg-danger text-white ring-danger" : "bg-surface ring-line hover:ring-line-strong",
          )}
        >
          <AlertTriangleIcon className="size-4" /> {t("filters.overdueOnly")}
        </button>
        {Object.values(filters).some(Boolean) && (
          <button type="button" onClick={() => router.push("/expert")} className="h-10 rounded-full px-3 text-[15px] font-semibold text-sun hover:underline">
            {t("filters.clear")}
          </button>
        )}
      </div>

      {rows.length === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-[22px] bg-surface py-16 text-center ring-1 ring-line">
          <SparklesIcon className="size-10 text-sun" />
          <p className="text-lg font-semibold">{t("empty")}</p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-[22px] bg-surface ring-1 ring-line">
          <div className="hidden grid-cols-[1.3fr_2fr_1fr_1fr_0.8fr] gap-3 border-b border-line px-5 py-3 text-[12px] font-semibold tracking-wide text-ink-muted uppercase md:grid">
            <span>{t("cols.client")}</span>
            <span>{t("cols.request")}</span>
            <span>{t("cols.type")}</span>
            <span>{t("cols.status")}</span>
            <span>{t("cols.timeLeft")}</span>
          </div>
          <ul className="divide-y divide-line">
            {rows.map((r) => {
              const done = ["delivered", "completed", "cancelled"].includes(r.status);
              return (
                <li key={r.id}>
                  <Link
                    href={`/expert/requests/${r.id}`}
                    className="grid gap-1.5 px-5 py-3.5 transition-colors hover:bg-canvas/60 md:grid-cols-[1.3fr_2fr_1fr_1fr_0.8fr] md:items-center md:gap-3"
                  >
                    <div className="flex items-center gap-3">
                      <span className="relative flex size-10 shrink-0 items-center justify-center rounded-full bg-rose-soft text-[14px] font-bold text-rose-ink">
                        {r.businessName.split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]!.toUpperCase()).join("")}
                        {r.unread && <span className="absolute -top-0.5 -right-0.5 size-3 rounded-full bg-sun ring-2 ring-surface" title={t("unread")} />}
                      </span>
                      <div className="min-w-0 leading-tight">
                        <div className={cn("truncate", r.unread ? "font-bold" : "font-semibold")}>{r.businessName}</div>
                        <div className="text-[13px] text-ink-muted">{tInd(r.industry)}</div>
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
