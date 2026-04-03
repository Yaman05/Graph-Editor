// src/components/GraphEditor/Toast.jsx
import { useEffect } from "react";
import { DS, DISPLAY } from "./styles";

const TYPE_STYLES = {
  error:   { color: DS.danger,     bg: DS.dangerDim,  border: `${DS.danger}44`  },
  warning: { color: DS.warning,    bg: DS.warningDim, border: `${DS.warning}44` },
  success: { color: DS.success,    bg: DS.successDim, border: `${DS.success}44` },
  info:    { color: DS.textSecond, bg: "rgba(255,255,255,0.04)", border: DS.border },
};

function ToastItem({ toast, onDismiss }) {
  const s = TYPE_STYLES[toast.type] || TYPE_STYLES.info;

  useEffect(() => {
    const timer = setTimeout(onDismiss, 3500);
    return () => clearTimeout(timer);
  }, [onDismiss]);

  return (
    <div
      onClick={onDismiss}
      style={{
        background: s.bg,
        border: `1px solid ${s.border}`,
        borderLeft: `3px solid ${s.color}`,
        borderRadius: 10,
        padding: "10px 16px",
        color: s.color,
        fontSize: 12,
        fontFamily: DISPLAY,
        fontWeight: 500,
        lineHeight: 1.6,
        animation: "toast-slide-in 200ms ease both",
        maxWidth: 360,
        wordBreak: "break-word",
        cursor: "pointer",
        boxShadow: "0 12px 40px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.04)",
        backdropFilter: "blur(16px)",
      }}
    >
      {toast.message}
    </div>
  );
}

export default function ToastContainer({ toasts, removeToast }) {
  if (!toasts.length) return null;

  return (
    <div style={{
      position: "absolute",
      top: 16,
      right: 16,
      zIndex: 500,
      display: "flex",
      flexDirection: "column",
      gap: 8,
      pointerEvents: "none",
    }}>
      {toasts.map((t) => (
        <div key={t.id} style={{ pointerEvents: "auto" }}>
          <ToastItem toast={t} onDismiss={() => removeToast(t.id)} />
        </div>
      ))}
    </div>
  );
}
