import { twMerge } from 'tailwind-merge';

interface LogoProps {
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  withText?: boolean;
  className?: string;
  badgeText?: string;
  glow?: boolean;
}

export function AeromaxIcon({ size = 'md', className = '', glow = false }: { size?: LogoProps['size']; className?: string; glow?: boolean }) {
  const sizeMap = {
    xs: 'h-7 w-7 rounded-lg',
    sm: 'h-8 w-8 rounded-xl',
    md: 'h-10 w-10 rounded-xl',
    lg: 'h-12 w-12 rounded-2xl',
    xl: 'h-16 w-16 rounded-[22px]',
  };

  return (
    <div
      className={twMerge(
        'relative inline-grid place-items-center bg-gradient-to-br from-[#0c1610] via-[#142319] to-[#080e0a] text-lime shadow-md ring-1 ring-white/10 overflow-hidden shrink-0 transition-transform active:scale-95',
        sizeMap[size],
        glow && 'shadow-[0_0_24px_rgba(16,185,129,0.35)] ring-emerald-500/30',
        className
      )}
    >
      {/* Background ambient gradient glow */}
      <div className="absolute inset-0 bg-gradient-to-tr from-emerald-600/20 via-transparent to-lime/20 pointer-events-none" />

      {/* Modern Aeromax Wing Prism SVG */}
      <svg
        viewBox="0 0 64 64"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="h-[75%] w-[75%] relative z-10 drop-shadow-[0_2px_4px_rgba(0,0,0,0.4)]"
      >
        <defs>
          <linearGradient id="logoLeftWing" x1="0%" y1="100%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#059669" />
            <stop offset="100%" stopColor="#34d399" />
          </linearGradient>
          <linearGradient id="logoRightWing" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#84cc16" />
            <stop offset="100%" stopColor="#d9f99d" />
          </linearGradient>
          <linearGradient id="logoCore" x1="50%" y1="0%" x2="50%" y2="100%">
            <stop offset="0%" stopColor="#ffffff" />
            <stop offset="100%" stopColor="#a3e635" />
          </linearGradient>
        </defs>

        {/* Dynamic Facets */}
        <path d="M32 12 L17 48 L26 48 L32 34 L32 12 Z" fill="url(#logoLeftWing)" />
        <path d="M32 12 L32 34 L38 48 L47 48 L32 12 Z" fill="url(#logoRightWing)" />
        <path d="M24 39 L40 39 L38 34 L26 34 Z" fill="url(#logoCore)" />
        <circle cx="32" cy="14" r="2" fill="#ffffff" />
      </svg>
    </div>
  );
}

export function Logo({
  size = 'md',
  withText = true,
  className = '',
  badgeText = 'NOTES',
  glow = false,
}: LogoProps) {
  return (
    <div className={twMerge('flex items-center gap-2.5 select-none', className)}>
      <AeromaxIcon size={size} glow={glow} />
      {withText && (
        <div className="flex flex-col">
          <div className="flex items-center gap-1.5 leading-none">
            <span className="font-extrabold tracking-tight text-ink text-base sm:text-lg">
              AEROMAX
            </span>
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
            {badgeText && (
              <span className="rounded-md bg-emerald-500/10 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-emerald-700">
                {badgeText}
              </span>
            )}
          </div>
          <span className="text-[10px] font-medium tracking-wide text-slate-400">
            Event Marketing & CRM
          </span>
        </div>
      )}
    </div>
  );
}
