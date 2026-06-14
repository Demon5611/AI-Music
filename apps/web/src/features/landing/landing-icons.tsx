type IconProps = {
  className?: string;
};

export function IconMusic({ className = "h-5 w-5" }: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      className={className}
      aria-hidden
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M9 9l10-3v7M9 9v10m0 0a2 2 0 1 1-4 0 2 2 0 0 1 4 0zm10-3a2 2 0 1 1-4 0 2 2 0 0 1 4 0z"
      />
    </svg>
  );
}

export function IconArrow({ className = "h-4 w-4" }: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      className={className}
      aria-hidden
    >
      <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5 21 12m0 0-7.5 7.5M21 12H3" />
    </svg>
  );
}

export function IconPlay({ className = "h-5 w-5" }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden>
      <path d="M6.3 2.84A1.5 1.5 0 0 0 4 4.11v15.78a1.5 1.5 0 0 0 2.3 1.27l11.54-7.89a1.5 1.5 0 0 0 0-2.54L6.3 2.84Z" />
    </svg>
  );
}

export function IconDice({ className = "h-5 w-5" }: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      className={className}
      aria-hidden
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M6.75 3h10.5A3.75 3.75 0 0 1 21 6.75v10.5A3.75 3.75 0 0 1 17.25 21H6.75A3.75 3.75 0 0 1 3 17.25V6.75A3.75 3.75 0 0 1 6.75 3ZM9 9h.008M15 15h.008M9 15h.008M15 9h.008M12 12h.008"
      />
    </svg>
  );
}
