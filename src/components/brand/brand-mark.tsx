type BrandMarkProps = {
  compact?: boolean
}

export function BrandMark({ compact = false }: BrandMarkProps) {
  return (
    <span className="brand-mark">
      <svg aria-hidden="true" className="brand-mark__icon" viewBox="0 0 64 58">
        <path d="M8 27h48v7H8z" fill="currentColor" />
        <path d="M11 34h42v19H11z" fill="var(--paper-raised)" />
        <path d="M15 34h5v19h-5zm29 0h5v19h-5z" fill="currentColor" />
        <path d="M6 11h52l-5 16H11z" fill="var(--tomato)" />
        <path
          d="m19 11-3 16h10l1-16zm18 0 1 16h10l-3-16z"
          fill="var(--paper)"
        />
        <path d="M22 43h20v5H22z" fill="var(--mustard)" />
        <path d="M7 54h50" fill="none" stroke="currentColor" strokeWidth="4" />
      </svg>
      {!compact && (
        <span className="brand-mark__wordmark">
          Bench<span>Bazaar</span>
        </span>
      )}
    </span>
  )
}
