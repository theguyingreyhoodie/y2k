import { useId, type ReactNode } from "react";
import { X } from "lucide-react";

export function StarMark({ className = "window__star" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" aria-hidden="true">
      <path
        d="M12 1.8l2.9 6.6 7.2.7-5.4 4.8 1.6 7.1L12 17.3 5.7 21l1.6-7.1L1.9 9.1l7.2-.7z"
        fill="currentColor"
        stroke="rgba(0,0,0,.35)"
        strokeWidth="1"
        strokeLinejoin="round"
      />
    </svg>
  );
}

interface WindowProps {
  title: string;
  children: ReactNode;
  /** Buttons shown at the right of the title bar. */
  actions?: ReactNode;
  onClose?: () => void;
  closeLabel?: string;
  status?: ReactNode;
  className?: string;
  bodyClassName?: string;
  /** Decorative jelly lights on the right of the bar (off when there's a real close button). */
  lights?: boolean;
  as?: "section" | "div" | "article" | "aside";
  id?: string;
}

/** A Y2K-era program window: glossy title bar named like a file, then a body and an optional status bar. */
export function Window({
  title,
  children,
  actions,
  onClose,
  closeLabel = "Close",
  status,
  className = "",
  bodyClassName = "",
  lights = true,
  as: Tag = "section",
  id,
}: WindowProps) {
  const titleId = useId();
  return (
    <Tag className={`window ${className}`} aria-labelledby={titleId} id={id}>
      <div className="window__bar">
        <div className="window__title" id={titleId}>
          <StarMark />
          <span>{title}</span>
        </div>
        {actions}
        {onClose ? (
          <button type="button" className="window__close" onClick={onClose} aria-label={closeLabel}>
            <X size={13} strokeWidth={3} aria-hidden="true" />
          </button>
        ) : lights ? (
          <div className="window__lights" aria-hidden="true">
            <i />
            <i />
            <i />
          </div>
        ) : null}
      </div>
      <div className={`window__body ${bodyClassName}`}>{children}</div>
      {status ? <div className="window__status">{status}</div> : null}
    </Tag>
  );
}
