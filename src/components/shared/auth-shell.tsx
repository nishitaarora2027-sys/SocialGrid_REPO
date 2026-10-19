import Link from "next/link";
import { LanguageToggle } from "@/components/shared/language-toggle";
import { Logo } from "@/components/shared/logo";

/**
 * Login, forgot, reset and setup pages, modelled on the macOS login screen:
 * a soft colour "wallpaper" and one frosted-glass card holding the only task on the page.
 */
export function AuthShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="auth-wallpaper relative flex min-h-dvh flex-col">
      <header className="relative z-10 mx-auto flex w-full max-w-6xl items-center justify-between px-5 pt-[max(16px,env(safe-area-inset-top))] pb-2 lg:px-8 lg:pt-6">
        <Link href="/" aria-label="SocialGrid home">
          <Logo />
        </Link>
        <LanguageToggle />
      </header>
      <main className="relative z-10 flex flex-1 items-start justify-center px-4 pt-6 pb-10 sm:items-center sm:pt-2">
        <div className="glass-card w-full max-w-[440px] rounded-[28px] p-6 sm:p-8">{children}</div>
      </main>
    </div>
  );
}
