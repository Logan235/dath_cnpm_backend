"use client";

import { useEffect } from "react";
import { X } from "lucide-react";

export default function Modal({ open, title, onClose, children, footer, width = 640 }) {
  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => e.key === "Escape" && onClose?.();
    window.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [open, onClose]);

  if (!open) return null;
  return (
    <div className="ui-modal-backdrop" onMouseDown={(e) => e.target === e.currentTarget && onClose?.()}>
      <div className="ui-modal" style={{ maxWidth: width }} role="dialog" aria-modal="true" aria-label={typeof title === "string" ? title : undefined}>
        <div className="ui-modal-head">
          <h2 className="ui-modal-title">{title}</h2>
          <button type="button" className="ui-modal-close" onClick={onClose} aria-label="Đóng">
            <X size={18} />
          </button>
        </div>
        <div className="ui-modal-body">{children}</div>
        {footer && <div className="ui-modal-foot">{footer}</div>}
      </div>
    </div>
  );
}
