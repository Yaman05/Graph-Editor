// Mission Control design system

export const NODE_TYPE_COLORS = {
  server:       "#4a8db7",   // steel blue
  database:     "#5b5fcc",   // indigo
  api:          "#2f9e7a",   // emerald
  client:       "#c4893d",   // warm amber
  loadbalancer: "#b0426a",   // rose / magenta
  cache:        "#1e9db3",   // cyan
  queue:        "#7c5cbf",   // violet
  firewall:     "#c45c2a",   // orange-red
  microservice: "#7ba82a",   // lime / chartreuse
};

export const NODE_TYPES = [
  "server", "database", "api", "client", "loadbalancer",
  "cache", "queue", "firewall", "microservice",
];

export const NODE_TYPE_LABELS = {
  server:       "Server",
  database:     "Database",
  api:          "API",
  client:       "Client",
  loadbalancer: "Load Balancer",
  cache:        "Cache",
  queue:        "Queue",
  firewall:     "Firewall",
  microservice: "Microservice",
};

export const FAILURE_COLORS = {
  failed:   "#ef4444",
  affected: "#f59e0b",
};

// Design tokens
export const DS = {
  bg:           "#0a0e17",
  bgPanel:      "#111827",
  bgCard:       "#0f172a",
  bgInput:      "#0d1424",
  border:       "rgba(255,255,255,0.06)",
  borderStrong: "rgba(255,255,255,0.10)",
  accent:       "#06d6a0",
  accentDim:    "rgba(6,214,160,0.12)",
  accentGlow:   "rgba(6,214,160,0.28)",
  danger:       "#ef4444",
  dangerDim:    "rgba(239,68,68,0.12)",
  warning:      "#f59e0b",
  warningDim:   "rgba(245,158,11,0.12)",
  gold:         "#f59e0b",
  textPrimary:  "#f1f5f9",
  textSecond:   "#94a3b8",
  textMuted:    "#475569",
};

export const MONO = "'JetBrains Mono', monospace";

export const styles = {
  brandColor: DS.accent,

  input: {
    display: "block",
    width: "100%",
    padding: "6px 10px",
    borderRadius: 2,
    border: `1px solid ${DS.border}`,
    background: DS.bgInput,
    color: DS.textPrimary,
    boxSizing: "border-box",
    fontSize: 11,
    fontFamily: MONO,
    letterSpacing: "0.02em",
  },

  btn: {
    background: "transparent",
    color: DS.accent,
    border: `1px solid ${DS.accent}`,
    padding: "6px 10px",
    borderRadius: 2,
    cursor: "pointer",
    fontWeight: 600,
    textAlign: "center",
    fontSize: 11,
    fontFamily: MONO,
    letterSpacing: "0.06em",
    width: "100%",
    boxSizing: "border-box",
    transition: "background 0.12s",
  },

  btnSmall: {
    background: "transparent",
    color: DS.accent,
    border: `1px solid ${DS.accent}`,
    padding: "4px 8px",
    borderRadius: 2,
    cursor: "pointer",
    fontWeight: 600,
    fontSize: 10,
    fontFamily: MONO,
    letterSpacing: "0.06em",
    boxSizing: "border-box",
  },

  btnDanger: {
    background: "transparent",
    color: DS.danger,
    border: `1px solid ${DS.danger}`,
    padding: "6px 10px",
    borderRadius: 2,
    cursor: "pointer",
    fontWeight: 600,
    textAlign: "center",
    fontSize: 11,
    fontFamily: MONO,
    letterSpacing: "0.06em",
    width: "100%",
    boxSizing: "border-box",
  },

  ghostBtn: {
    background: "transparent",
    color: DS.textSecond,
    border: `1px solid ${DS.border}`,
    padding: "6px 10px",
    borderRadius: 2,
    cursor: "pointer",
    fontSize: 11,
    fontFamily: MONO,
    letterSpacing: "0.04em",
    width: "100%",
    boxSizing: "border-box",
  },

  modalBackdrop: {
    position: "fixed",
    inset: 0,
    background: "rgba(10,14,23,0.88)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 2000,
    backdropFilter: "blur(12px)",
  },

  modal: {
    width: 420,
    maxWidth: "90vw",
    background: DS.bgPanel,
    padding: 24,
    borderRadius: 4,
    boxShadow: "0 32px 80px rgba(0,0,0,0.9), inset 0 1px 0 rgba(255,255,255,0.04)",
    border: `1px solid ${DS.border}`,
    animation: "fade-scale-in 150ms ease both",
  },
};