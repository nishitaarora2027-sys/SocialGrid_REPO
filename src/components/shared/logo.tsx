export function Logo({ className = "" }: { className?: string }) {
  return (
    <div className={`flex items-center gap-2 font-bold ${className}`}>
      <svg viewBox="0 0 64 64" className="size-9" aria-hidden>
        <rect width="64" height="64" rx="16" fill="#d9480f" />
        <g fill="#fff">
          <rect x="14" y="14" width="16" height="16" rx="4" />
          <rect x="34" y="14" width="16" height="16" rx="4" opacity=".75" />
          <rect x="14" y="34" width="16" height="16" rx="4" opacity=".75" />
          <rect x="34" y="34" width="16" height="16" rx="4" />
        </g>
      </svg>
      <span className="text-xl">SocialGrid</span>
    </div>
  );
}
