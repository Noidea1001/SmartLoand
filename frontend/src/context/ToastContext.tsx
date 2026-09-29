import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import {
  CheckCircle2,
  AlertOctagon,
  AlertTriangle,
  Info,
  X,
  Volume2,
  VolumeX,
} from "lucide-react";
import { playToastSound, type ToastSoundType } from "../utils/sound";

export type ToastKind = "success" | "error" | "warning" | "info";

export interface ToastOptions {
  title?: string;
  duration?: number; // ms, default 4500
  action?: {
    label: string;
    onClick: () => void;
  };
}

export interface ToastItem {
  id: number;
  kind: ToastKind;
  message: string;
  title?: string;
  duration: number;
  createdAt: number;
  action?: {
    label: string;
    onClick: () => void;
  };
}

export interface ToastContextValue {
  success: (message: string, options?: ToastOptions) => number;
  error: (message: string, options?: ToastOptions) => number;
  warning: (message: string, options?: ToastOptions) => number;
  info: (message: string, options?: ToastOptions) => number;
  dismiss: (id: number) => void;
  clearAll: () => void;
  soundEnabled: boolean;
  toggleSound: () => void;
}

const ToastContext = createContext<ToastContextValue | undefined>(undefined);

let nextId = 1;

const TOAST_ICONS: Record<ToastKind, typeof CheckCircle2> = {
  success: CheckCircle2,
  error: AlertOctagon,
  warning: AlertTriangle,
  info: Info,
};

const THEME_ACCENTS: Record<
  ToastKind,
  {
    border: string;
    iconBg: string;
    iconColor: string;
    barColor: string;
    glow: string;
    defaultTitle: string;
  }
> = {
  success: {
    border: "rgba(16, 185, 129, 0.4)",
    iconBg: "rgba(16, 185, 129, 0.15)",
    iconColor: "#10b981",
    barColor: "linear-gradient(90deg, #10b981, #059669)",
    glow: "0 10px 30px -5px rgba(16, 185, 129, 0.25)",
    defaultTitle: "Success",
  },
  error: {
    border: "rgba(239, 68, 68, 0.4)",
    iconBg: "rgba(239, 68, 68, 0.15)",
    iconColor: "#ef4444",
    barColor: "linear-gradient(90deg, #ef4444, #dc2626)",
    glow: "0 10px 30px -5px rgba(239, 68, 68, 0.25)",
    defaultTitle: "Action Failed",
  },
  warning: {
    border: "rgba(245, 158, 11, 0.4)",
    iconBg: "rgba(245, 158, 11, 0.15)",
    iconColor: "#f59e0b",
    barColor: "linear-gradient(90deg, #f59e0b, #d97706)",
    glow: "0 10px 30px -5px rgba(245, 158, 11, 0.25)",
    defaultTitle: "Attention",
  },
  info: {
    border: "rgba(99, 102, 241, 0.4)",
    iconBg: "rgba(99, 102, 241, 0.15)",
    iconColor: "#6366f1",
    barColor: "linear-gradient(90deg, #6366f1, #4f46e5)",
    glow: "0 10px 30px -5px rgba(99, 102, 241, 0.25)",
    defaultTitle: "Notice",
  },
};

interface SingleToastProps {
  toast: ToastItem;
  onDismiss: (id: number) => void;
}

function SingleToast({ toast, onDismiss }: SingleToastProps) {
  const [isPaused, setIsPaused] = useState(false);
  const [remaining, setRemaining] = useState(toast.duration);
  const startTimeRef = useRef<number>(Date.now());
  const timerRef = useRef<any>(null);

  const theme = THEME_ACCENTS[toast.kind];
  const Icon = TOAST_ICONS[toast.kind];

  useEffect(() => {
    if (isPaused) {
      if (timerRef.current) clearTimeout(timerRef.current);
      return;
    }

    startTimeRef.current = Date.now();
    timerRef.current = setTimeout(() => {
      onDismiss(toast.id);
    }, remaining);

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [isPaused, remaining, onDismiss, toast.id]);

  const handleMouseEnter = () => {
    const elapsed = Date.now() - startTimeRef.current;
    setRemaining((prev) => Math.max(0, prev - elapsed));
    setIsPaused(true);
  };

  const handleMouseLeave = () => {
    setIsPaused(false);
  };

  return (
    <div
      role="alert"
      aria-live="polite"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      style={{
        position: "relative",
        display: "flex",
        flexDirection: "column",
        minWidth: 320,
        maxWidth: 420,
        backgroundColor: "var(--color-surface, #ffffff)",
        backdropFilter: "blur(14px)",
        borderRadius: "var(--radius-lg, 12px)",
        border: `1px solid ${theme.border}`,
        boxShadow: `${theme.glow}, var(--shadow-xl)`,
        overflow: "hidden",
        animation: "toast-slide-in 0.28s cubic-bezier(0.16, 1, 0.3, 1)",
        transition: "transform 0.2s ease, box-shadow 0.2s ease",
        color: "var(--color-text, #0f172a)",
      }}
    >
      <div style={{ display: "flex", alignItems: "flex-start", gap: 12, padding: "14px 16px" }}>
        {/* Glowing badge icon */}
        <div
          style={{
            width: 36,
            height: 36,
            borderRadius: "var(--radius-md, 10px)",
            backgroundColor: theme.iconBg,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
            marginTop: 1,
          }}
        >
          <Icon size={20} color={theme.iconColor} strokeWidth={2.2} />
        </div>

        {/* Content */}
        <div style={{ flex: 1, minWidth: 0, paddingRight: 4 }}>
          <div
            style={{
              fontSize: 13,
              fontWeight: 700,
              letterSpacing: "-0.01em",
              color: "var(--color-text)",
              marginBottom: 2,
              display: "flex",
              alignItems: "center",
              gap: 6,
            }}
          >
            <span>{toast.title || theme.defaultTitle}</span>
          </div>
          <div
            style={{
              fontSize: 12.5,
              lineHeight: 1.45,
              color: "var(--color-text-secondary, #475569)",
              wordBreak: "break-word",
            }}
          >
            {toast.message}
          </div>

          {/* Action button if present */}
          {toast.action && (
            <div style={{ marginTop: 8 }}>
              <button
                type="button"
                onClick={() => {
                  toast.action?.onClick();
                  onDismiss(toast.id);
                }}
                style={{
                  fontSize: 12,
                  fontWeight: 600,
                  color: theme.iconColor,
                  background: theme.iconBg,
                  padding: "4px 10px",
                  borderRadius: "var(--radius-sm, 6px)",
                  border: `1px solid ${theme.border}`,
                  cursor: "pointer",
                  transition: "opacity 0.15s ease",
                }}
              >
                {toast.action.label}
              </button>
            </div>
          )}
        </div>

        {/* Close Button */}
        <button
          type="button"
          onClick={() => onDismiss(toast.id)}
          aria-label="Dismiss toast"
          style={{
            background: "none",
            border: "none",
            padding: 4,
            cursor: "pointer",
            color: "var(--color-text-muted, #94a3b8)",
            borderRadius: "var(--radius-xs, 4px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            transition: "color 0.15s ease, background-color 0.15s ease",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.color = "var(--color-text)";
            e.currentTarget.style.backgroundColor = "var(--color-surface-sunken)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.color = "var(--color-text-muted)";
            e.currentTarget.style.backgroundColor = "transparent";
          }}
        >
          <X size={15} />
        </button>
      </div>

      {/* Dynamic Animated Progress Bar */}
      <div
        style={{
          width: "100%",
          height: 3,
          backgroundColor: "var(--color-surface-sunken, #e2e8f0)",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            height: "100%",
            background: theme.barColor,
            width: "100%",
            animation: `toast-progress ${toast.duration}ms linear forwards`,
            animationPlayState: isPaused ? "paused" : "running",
          }}
        />
      </div>
    </div>
  );
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const [soundEnabled, setSoundEnabled] = useState<boolean>(() => {
    try {
      const stored = localStorage.getItem("smartloan_toast_sound");
      return stored !== "false";
    } catch {
      return true;
    }
  });

  const toggleSound = useCallback(() => {
    setSoundEnabled((prev) => {
      const next = !prev;
      try {
        localStorage.setItem("smartloan_toast_sound", String(next));
      } catch {}
      return next;
    });
  }, []);

  const dismiss = useCallback((id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const clearAll = useCallback(() => {
    setToasts([]);
  }, []);

  const push = useCallback(
    (kind: ToastKind, message: string, options?: ToastOptions) => {
      const id = nextId++;
      const duration = options?.duration || 4500;
      const toastItem: ToastItem = {
        id,
        kind,
        message,
        title: options?.title,
        duration,
        createdAt: Date.now(),
        action: options?.action,
      };

      playToastSound(kind as ToastSoundType, soundEnabled);

      setToasts((prev) => {
        // Keep maximum 5 toasts at a time
        const updated = [...prev, toastItem];
        if (updated.length > 5) {
          return updated.slice(updated.length - 5);
        }
        return updated;
      });

      return id;
    },
    [soundEnabled]
  );

  const value: ToastContextValue = {
    success: (m, opt) => push("success", m, opt),
    error: (m, opt) => push("error", m, opt),
    warning: (m, opt) => push("warning", m, opt),
    info: (m, opt) => push("info", m, opt),
    dismiss,
    clearAll,
    soundEnabled,
    toggleSound,
  };

  return (
    <ToastContext.Provider value={value}>
      {children}

      {/* Floating Toast Notification Dock */}
      <div
        className="no-print"
        style={{
          position: "fixed",
          top: 20,
          right: 24,
          zIndex: 9999,
          display: "flex",
          flexDirection: "column",
          gap: 10,
          alignItems: "flex-end",
          pointerEvents: "none",
        }}
      >
        {toasts.length > 1 && (
          <div
            style={{
              pointerEvents: "auto",
              display: "flex",
              alignItems: "center",
              gap: 8,
              padding: "4px 10px",
              borderRadius: "var(--radius-sm, 6px)",
              background: "var(--color-surface, #ffffff)",
              border: "1px solid var(--color-border)",
              boxShadow: "var(--shadow-sm)",
              fontSize: 11,
              fontWeight: 600,
              color: "var(--color-text-muted)",
              marginBottom: 2,
            }}
          >
            <span>{toasts.length} alerts</span>
            <button
              type="button"
              onClick={toggleSound}
              style={{
                display: "inline-flex",
                alignItems: "center",
                background: "none",
                border: "none",
                cursor: "pointer",
                padding: 2,
                color: soundEnabled ? "var(--color-accent)" : "var(--color-text-muted)",
              }}
              title={soundEnabled ? "Mute audio cues" : "Unmute audio cues"}
            >
              {soundEnabled ? <Volume2 size={13} /> : <VolumeX size={13} />}
            </button>
            <span style={{ opacity: 0.4 }}>•</span>
            <button
              type="button"
              onClick={clearAll}
              style={{
                background: "none",
                border: "none",
                cursor: "pointer",
                padding: 0,
                color: "var(--color-accent)",
                fontWeight: 600,
                fontSize: 11,
              }}
            >
              Clear all
            </button>
          </div>
        )}

        {toasts.map((toast) => (
          <div key={toast.id} style={{ pointerEvents: "auto" }}>
            <SingleToast toast={toast} onDismiss={dismiss} />
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used within ToastProvider");
  return ctx;
}
