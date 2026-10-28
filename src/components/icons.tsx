const base = {
  width: 18,
  height: 18,
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.6,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
  'aria-hidden': true,
}

export const IconArrowSwap = () => (
  <svg {...base} width={14} height={14} strokeWidth={2}>
    <path d="M4 8h14l-3.5-3.5M20 16H6l3.5 3.5" />
  </svg>
)

export const IconStop = () => (
  <svg {...base} width={14} height={14} strokeWidth={2}>
    <rect x="6.5" y="6.5" width="11" height="11" rx="2.5" fill="currentColor" stroke="none" />
  </svg>
)

export const IconPlay = () => (
  <svg {...base} width={14} height={14}>
    <path
      d="M8 5.8v12.4a1 1 0 0 0 1.5.86l10-6.2a1 1 0 0 0 0-1.72l-10-6.2A1 1 0 0 0 8 5.8Z"
      fill="currentColor"
      stroke="none"
    />
  </svg>
)

export const IconLogo = () => (
  <svg width={22} height={22} viewBox="0 0 24 24" aria-hidden>
    <rect width="24" height="24" rx="6" fill="var(--accent)" />
    <circle cx="12" cy="12" r="6.5" fill="none" stroke="#fff" strokeWidth="1.8" />
    <path d="M12 8.6V12l2.4 1.5" fill="none" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" />
  </svg>
)
