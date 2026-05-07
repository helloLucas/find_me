import React from "react";

export type WindowControlVariant = "minimize" | "maximize" | "restore" | "close";

interface WindowControlButtonProps
  extends Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, "type"> {
  variant: WindowControlVariant;
  label: string;
}

const ICON_PATHS: Record<WindowControlVariant, React.ReactNode> = {
  minimize: <path d="M4 8h8" />,
  maximize: <rect x="4.25" y="4.25" width="7.5" height="7.5" rx="1" />,
  restore: (
    <>
      <rect x="4.25" y="5.25" width="6.5" height="6.5" rx="0.9" />
      <path d="M7.25 4.25h4.5v4.5" />
    </>
  ),
  close: (
    <>
      <path d="M4.75 4.75l6.5 6.5" />
      <path d="M11.25 4.75l-6.5 6.5" />
    </>
  ),
};

export const WindowControlButton: React.FC<WindowControlButtonProps> = ({
  variant,
  label,
  className = "",
  children,
  ...buttonProps
}) => (
  <button
    type="button"
    aria-label={label}
    title={label}
    className={`inline-flex h-6 w-7 shrink-0 items-center justify-center rounded-sm border outline-none transition-colors focus-visible:ring-1 focus-visible:ring-current/70 ${className}`}
    {...buttonProps}
  >
    <svg
      viewBox="0 0 16 16"
      aria-hidden="true"
      className="h-4 w-4"
      fill="none"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="1.7"
    >
      {ICON_PATHS[variant]}
    </svg>
    {children}
  </button>
);
