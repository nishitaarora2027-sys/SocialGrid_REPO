/** 2×2 grid mark: primary / status cells, bottom-right cell shaped like a chat bubble */
export function LogoMark({ className = "size-8" }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" className={className} aria-hidden>
      <rect x="1" y="1" width="14" height="14" rx="4" fill="var(--primary)" />
      <rect x="17" y="1" width="14" height="14" rx="4" fill="var(--status)" />
      <rect x="1" y="17" width="14" height="14" rx="4" fill="var(--status)" />
      <path d="M24 17a7 7 0 1 1 0 14h-5a2 2 0 0 1-2-2v-5a7 7 0 0 1 7-7z" fill="var(--primary)" />
    </svg>
  );
}

export function Logo({ className = "" }: { className?: string }) {
  return (
    <div className={`flex items-center gap-2.5 font-bold text-ink ${className}`}>
      <LogoMark />
      <span className="text-xl">SocialGrid</span>
    </div>
  );
}
