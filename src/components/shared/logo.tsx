import { useId } from "react";

/**
 * The SocialGrid mark: a chat bubble (you just say it) holding a grid of posts (we create it),
 * one lit by the sunset (your next post). Ink on light backgrounds, cream on dark; the sunset
 * is the only colour, so it reads like a single accent the way Apple marks do.
 */
export function LogoMark({ className = "size-8" }: { className?: string }) {
  const id = useId().replace(/:/g, "");
  return (
    <svg viewBox="0 0 32 32" className={className} aria-hidden>
      <defs>
        <linearGradient id={`sun${id}`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#FFB13B" />
          <stop offset="0.5" stopColor="#FF5E62" />
          <stop offset="1" stopColor="#C2338B" />
        </linearGradient>
      </defs>
      <path d="M14 1h4a13 13 0 0 1 13 13v4a13 13 0 0 1-13 13H3.5A2.5 2.5 0 0 1 1 28.5V14A13 13 0 0 1 14 1z" fill="var(--logo-bubble, #17140F)" />
      <rect x="8.5" y="8.5" width="6.5" height="6.5" rx="2" fill="var(--logo-cell, #FBF8F3)" />
      <rect x="17" y="8.5" width="6.5" height="6.5" rx="2" fill={`url(#sun${id})`} />
      <rect x="8.5" y="17" width="6.5" height="6.5" rx="2" fill="var(--logo-cell, #FBF8F3)" />
      <rect x="17" y="17" width="6.5" height="6.5" rx="2" fill="var(--logo-cell, #FBF8F3)" />
    </svg>
  );
}

export function Logo({ className = "" }: { className?: string }) {
  return (
    <div className={`flex items-center gap-2 text-ink ${className}`}>
      <LogoMark className="size-7" />
      <span className="text-[19px] font-bold tracking-[-0.02em]">SocialGrid</span>
    </div>
  );
}
