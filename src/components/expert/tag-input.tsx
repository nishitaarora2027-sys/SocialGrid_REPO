"use client";

import { useState } from "react";
import { PlusIcon, XIcon } from "lucide-react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

/** Chips with suggestions; Enter or comma adds a free-text tag */
export function TagInput({
  value,
  onChange,
  suggestions = [],
  labelFor = (s) => s,
  placeholder,
}: {
  value: string[];
  onChange: (v: string[]) => void;
  suggestions?: readonly string[];
  labelFor?: (s: string) => string;
  placeholder?: string;
}) {
  const [draft, setDraft] = useState("");
  const add = (raw: string) => {
    const tag = raw.trim().toLowerCase().replace(/\s+/g, "_");
    if (tag && !value.includes(tag)) onChange([...value, tag]);
    setDraft("");
  };
  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-1.5">
        {value.map((v) => (
          <span key={v} className="flex h-8 items-center gap-1 rounded-full bg-primary pr-1 pl-3 text-sm font-semibold text-primary-foreground">
            {labelFor(v)}
            <button type="button" onClick={() => onChange(value.filter((x) => x !== v))} className="rounded-full p-1 hover:bg-white/20" aria-label={`Remove ${v}`}>
              <XIcon className="size-3.5" />
            </button>
          </span>
        ))}
        {suggestions
          .filter((s) => !value.includes(s))
          .map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => add(s)}
              className={cn("flex h-8 items-center gap-1 rounded-full border border-dashed px-3 text-sm text-muted-foreground hover:border-primary hover:text-primary")}
            >
              <PlusIcon className="size-3.5" /> {labelFor(s)}
            </button>
          ))}
      </div>
      <Input
        value={draft}
        placeholder={placeholder}
        className="h-10"
        onChange={(e) => {
          const v = e.target.value;
          if (v.endsWith(",")) add(v.slice(0, -1));
          else setDraft(v);
        }}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            add(draft);
          }
        }}
        onBlur={() => draft && add(draft)}
      />
    </div>
  );
}
