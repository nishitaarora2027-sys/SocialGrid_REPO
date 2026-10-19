"use client";

import { Toaster as Sonner, type ToasterProps } from "sonner";

function Toaster(props: ToasterProps) {
  return (
    <Sonner
      position="top-center"
      richColors
      toastOptions={{ classNames: { toast: "!rounded-[16px] !text-base !font-sans" } }}
      {...props}
    />
  );
}

export { Toaster };
