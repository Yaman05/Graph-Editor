import { useEffect } from "react";
import { DS, MONO } from "./styles";

const TYPE_STYLES = {
  error:   { color: DS.danger,  bg: DS.dangerDim,  border: `${DS.danger}44` },
  warning: { color: DS.warning, bg: DS.warningDim, border: `${DS.warning}44` },
  success: { color: DS.accent,  bg: DS.accentDim,  border: `${DS.accent}44` },
  info:    { color: DS.textSecond, bg: "rgba(255,255,255,0.06)", border: DS.border },
};

function ToastItem({ toast, onDismiss }) {
  const s = TYPE_STYLES[toast.type] || TYPE_STYLES.info;

  useEffect(() => {
    const timer = setTimeout(onDismiss, 3500);
    return () => clearTimeout(timer);
  }, [onDismiss]);

  return (
    <div style={{
      background: s.bg,
      border: `1px solid ${s.border}`,
      borderLeft: `3px solid ${s.color}`,
      borderRadius: 2,
      padding: "8px 14px",
      color: s.color,
      fontSize: 12,
      fontFamily: MONO,
      letterSpacing: "0.03em",
      lineHeight: 1.5,
      animation: "fade-scale-in 150ms ease both",
      maxWidth: 340,
      wordBreak: "break-word",
    }}>
      {toast.message}
    </div>
  );
}

export default function ToastContainer({ toasts, removeToast }) {
  if (!toasts.length) return null;

  return (
    <div style={{
      position: "absolute",
      top: 14,
      right: 14,
      zIndex: 500,
      display: "flex",
      flexDirection: "column",
      gap: 8,
      pointerEvents: "none",
    }}>
      {toasts.map((t) => (
        <ToastItem key={t.id} toast={t} onDismiss={() => removeToast(t.id)} />
      ))}
    </div>
  );
}
