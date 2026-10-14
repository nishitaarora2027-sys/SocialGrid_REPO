"use client";

import * as React from "react";
import { Dialog as SheetPrimitive } from "radix-ui";
import { cn } from "@/lib/utils";

const Sheet = SheetPrimitive.Root;
const SheetTrigger = SheetPrimitive.Trigger;
const SheetClose = SheetPrimitive.Close;

function SheetContent({
  className,
  children,
  side = "bottom",
  ...props
}: React.ComponentProps<typeof SheetPrimitive.Content> & { side?: "bottom" | "right" | "left" }) {
  return (
    <SheetPrimitive.Portal>
      <SheetPrimitive.Overlay className="fixed inset-0 z-50 bg-black/50 data-[state=open]:animate-in data-[state=open]:fade-in-0" />
      <SheetPrimitive.Content
        className={cn(
          "fixed z-50 flex flex-col gap-4 bg-background shadow-lg data-[state=open]:animate-in data-[state=open]:duration-300",
          side === "bottom" &&
            "inset-x-0 bottom-0 max-h-[90dvh] overflow-y-auto rounded-t-3xl p-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] data-[state=open]:slide-in-from-bottom",
          side === "right" && "inset-y-0 right-0 h-full w-80 max-w-[85vw] p-5 data-[state=open]:slide-in-from-right",
          side === "left" && "inset-y-0 left-0 h-full w-80 max-w-[85vw] p-5 data-[state=open]:slide-in-from-left",
          className,
        )}
        {...props}
      >
        {side === "bottom" && <div className="mx-auto -mt-2 h-1.5 w-12 rounded-full bg-muted" aria-hidden />}
        {children}
      </SheetPrimitive.Content>
    </SheetPrimitive.Portal>
  );
}

function SheetTitle({ className, ...props }: React.ComponentProps<typeof SheetPrimitive.Title>) {
  return <SheetPrimitive.Title className={cn("text-xl font-bold", className)} {...props} />;
}
function SheetDescription({ className, ...props }: React.ComponentProps<typeof SheetPrimitive.Description>) {
  return <SheetPrimitive.Description className={cn("text-muted-foreground", className)} {...props} />;
}

export { Sheet, SheetTrigger, SheetClose, SheetContent, SheetTitle, SheetDescription };
