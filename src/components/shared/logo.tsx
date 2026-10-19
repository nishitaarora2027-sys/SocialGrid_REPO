/**
 * The SocialGrid mark: a chat bubble (you just say it) holding a grid of posts (we create it),
 * one of them highlighted in gold (your next post). Same bubble shape as the chat; flat colours
 * so it stays crisp from favicon size up.
 */
export function LogoMark({ className = "size-8" }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" className={className} aria-hidden>
      <path d="M14 1h4a13 13 0 0 1 13 13v4a13 13 0 0 1-13 13H3.5A2.5 2.5 0 0 1 1 28.5V14A13 13 0 0 1 14 1z" fill="#2F5D50" />
      <rect x="8.5" y="8.5" width="6.5" height="6.5" rx="2" fill="#FAF7F2" />
      <rect x="17" y="8.5" width="6.5" height="6.5" rx="2" fill="#E9C27A" />
      <rect x="8.5" y="17" width="6.5" height="6.5" rx="2" fill="#FAF7F2" />
      <rect x="17" y="17" width="6.5" height="6.5" rx="2" fill="#FAF7F2" />
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
