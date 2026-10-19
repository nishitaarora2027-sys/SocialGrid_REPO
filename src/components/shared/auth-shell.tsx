import { LanguageToggle } from "@/components/shared/language-toggle";
import { Logo } from "@/components/shared/logo";

/** One centred column with the logo and language pill on top: login, forgot, reset, setup */
export function AuthShell({ children }: { children: React.ReactNode }) {
  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-[420px] flex-col bg-paper px-6 pt-[max(56px,env(safe-area-inset-top))] lg:pt-16">
      <div className="flex items-center justify-between">
        <Logo />
        <LanguageToggle />
      </div>
      {children}
    </main>
  );
}
