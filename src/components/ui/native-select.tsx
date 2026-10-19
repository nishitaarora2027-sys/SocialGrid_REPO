import * as React from "react";
import { ChevronDownIcon } from "lucide-react";
import { cn } from "@/lib/utils";

/** Native <select> styled like the other inputs. Native pickers work best on Android. */
function NativeSelect({ className, children, compact, ...props }: React.ComponentProps<"select"> & { compact?: boolean }) {
  return (
    <div className={cn("relative", className)}>
      <select
        className={cn(
          "w-full appearance-none bg-surface outline-none focus-visible:ring-[3px] focus-visible:ring-primary/20 disabled:opacity-50",
          compact
            ? "h-10 rounded-full pr-9 pl-4 text-[15px] font-semibold ring-1 ring-line hover:ring-line-strong"
            : "h-12 rounded-[14px] border border-input pr-10 pl-4 text-[17px] focus-visible:border-primary",
        )}
        {...props}
      >
        {children}
      </select>
      <ChevronDownIcon className={cn("pointer-events-none absolute top-1/2 -translate-y-1/2 text-muted-foreground", compact ? "right-3 size-4" : "right-3 size-5")} />
    </div>
  );
}

export { NativeSelect };
