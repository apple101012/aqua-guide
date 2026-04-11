import { useEffect, useRef } from "react";

export default function ActionModal({ isOpen, onClose, action, regionName }) {
  const panelRef = useRef(null);

  useEffect(() => {
    if (!isOpen) return;

    const handleKey = (e) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [isOpen, onClose]);

  useEffect(() => {
    if (isOpen && panelRef.current) {
      panelRef.current.focus();
    }
  }, [isOpen]);

  if (!isOpen || !action) return null;

  return (
    <div className="modal" role="dialog" aria-modal="true">
      <div className="modal-backdrop" onClick={onClose}></div>
      <div className="modal-panel" ref={panelRef} tabIndex={-1}>
        <button
          className="modal-close"
          onClick={onClose}
          aria-label="Close modal"
        >
          &times;
        </button>
        {regionName && <p className="modal-eyebrow">{regionName}</p>}
        <h2 className="modal-title">{action.title}</h2>
        {action.detail && (
          <p className="modal-description">{action.detail}</p>
        )}
        {action.steps && action.steps.length > 0 && (
          <ol className="modal-steps">
            {action.steps.map((step, i) => (
              <li key={i}>{step}</li>
            ))}
          </ol>
        )}
      </div>
    </div>
  );
}
