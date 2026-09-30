import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { AlertTriangle, HelpCircle, X } from "lucide-react";

interface ConfirmOptions {
  title: string;
  message?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  danger?: boolean;
}

type ConfirmFn = (options: ConfirmOptions) => Promise<boolean>;

const ConfirmContext = createContext<ConfirmFn | undefined>(undefined);

export function ConfirmProvider({ children }: { children: ReactNode }) {
  const [options, setOptions] = useState<ConfirmOptions | null>(null);
  const resolveRef = useRef<(value: boolean) => void>();

  const confirm = useCallback<ConfirmFn>((opts) => {
    setOptions(opts);
    return new Promise((resolve) => {
      resolveRef.current = resolve;
    });
  }, []);

  const handle = useCallback((result: boolean) => {
    setOptions(null);
    if (resolveRef.current) {
      resolveRef.current(result);
    }
  }, []);

  // Keyboard navigation: Enter confirms, Escape cancels
  useEffect(() => {
    if (!options) return;
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        e.preventDefault();
        handle(false);
      } else if (e.key === "Enter") {
        e.preventDefault();
        handle(true);
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [options, handle]);

  return (
    <ConfirmContext.Provider value={confirm}>
      {children}
      {options && (
        <div
          className="no-print modal-overlay"
          onClick={() => handle(false)}
          style={{
            position: "fixed",
            inset: 0,
            backgroundColor: "rgba(15, 23, 42, 0.65)",
            backdropFilter: "blur(6px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 10005,
            padding: 16,
            animation: "fade-in 0.15s ease-out",
          }}
        >
          <div
            className="card"
            style={{
              width: "100%",
              maxWidth: 440,
              padding: 0,
              boxShadow: "var(--shadow-xl)",
              borderRadius: "var(--radius-xl, 16px)",
              animation: "modal-in 0.22s cubic-bezier(0.16, 1, 0.3, 1)",
              overflow: "hidden",
              border: options.danger
                ? "1px solid rgba(239, 68, 68, 0.3)"
                : "1px solid var(--color-border)",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header banner */}
            <div
              style={{
                display: "flex",
                alignItems: "flex-start",
                gap: 14,
                padding: "20px 24px 16px",
              }}
            >
              <div
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: "var(--radius-lg, 12px)",
                  backgroundColor: options.danger ? "var(--color-danger-soft)" : "var(--color-accent-soft)",
                  color: options.danger ? "var(--color-danger)" : "var(--color-accent)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0,
                }}
              >
                {options.danger ? <AlertTriangle size={24} /> : <HelpCircle size={24} />}
              </div>
              <div style={{ flex: 1 }}>
                <h2 style={{ fontSize: 17, fontWeight: 700, margin: 0, color: "var(--color-text)", letterSpacing: "-0.02em" }}>
                  {options.title}
                </h2>
                {options.message && (
                  <p
                    style={{
                      fontSize: 13.5,
                      color: "var(--color-text-secondary)",
                      marginTop: 8,
                      lineHeight: 1.55,
                      margin: "8px 0 0 0",
                    }}
                  >
                    {options.message}
                  </p>
                )}
              </div>
              <button
                type="button"
                onClick={() => handle(false)}
                className="btn-icon"
                aria-label="Close"
                style={{ marginTop: -4, marginRight: -4 }}
              >
                <X size={16} />
              </button>
            </div>

            {/* Footer actions */}
            <div
              style={{
                display: "flex",
                gap: 10,
                justifyContent: "flex-end",
                padding: "16px 24px 20px",
                borderTop: "1px solid var(--color-border)",
                backgroundColor: "var(--color-surface-sunken)",
              }}
            >
              <button
                type="button"
                className="btn"
                onClick={() => handle(false)}
                style={{ minWidth: 84 }}
              >
                {options.cancelLabel || "Cancel"}
              </button>
              <button
                type="button"
                autoFocus
                className={options.danger ? "btn btn-danger" : "btn btn-primary"}
                onClick={() => handle(true)}
                style={{ minWidth: 96 }}
              >
                {options.confirmLabel || "Confirm"}
              </button>
            </div>
          </div>
        </div>
      )}
    </ConfirmContext.Provider>
  );
}

export function useConfirm(): ConfirmFn {
  const ctx = useContext(ConfirmContext);
  if (!ctx) throw new Error("useConfirm must be used within ConfirmProvider");
  return ctx;
}
