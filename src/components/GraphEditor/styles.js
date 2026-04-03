// src/components/GraphEditor/styles.js
// Midnight Flow — n8n-inspired design system

export const NODE_TYPE_COLORS = {
  server:       "#60a5fa",
  database:     "#818cf8",
  api:          "#5de4c7",
  client:       "#ffd173",
  loadbalancer: "#f0abfc",
  cache:        "#22d3ee",
  queue:        "#fb923c",
  firewall:     "#f87171",
  microservice: "#a3e635",
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

export const DS = {
  bg:           "#0a0a0f",
  bgPanel:      "#111118",
  bgCard:       "#17172a",
  bgInput:      "#0d0d18",
  border:       "rgba(255,255,255,0.06)",
  borderStrong: "rgba(255,255,255,0.12)",
  accent:       "#5de4c7",
  accentDim:    "rgba(93,228,199,0.08)",
  accentGlow:   "rgba(93,228,199,0.25)",
  success:      "#5de4c7",
  successDim:   "rgba(93,228,199,0.08)",
  danger:       "#ef4444",
  dangerDim:    "rgba(239,68,68,0.08)",
  warning:      "#f59e0b",
  warningDim:   "rgba(245,158,11,0.08)",
  gold:         "#ffd173",
  textPrimary:  "#e4e2ec",
  textSecond:   "#7b7f9e",
  textMuted:    "#3d4058",
};

export const MONO    = "'JetBrains Mono', monospace";
export const DISPLAY = "'Outfit', sans-serif";

export const styles = {
  brandColor: DS.accent,

  input: {
    display: "block",
    width: "100%",
    padding: "8px 11px",
    borderRadius: 8,
    border: `1px solid ${DS.border}`,
    background: DS.bgInput,
    color: DS.textPrimary,
    boxSizing: "border-box",
    fontSize: 12,
    fontFamily: DISPLAY,
    letterSpacing: "0.01em",
    transition: "border-color 0.15s, box-shadow 0.15s",
    outline: "none",
  },

  btn: {
    background: DS.accentDim,
    color: DS.accent,
    border: `1px solid ${DS.accent}44`,
    padding: "8px 12px",
    borderRadius: 8,
    cursor: "pointer",
    fontWeight: 600,
    textAlign: "center",
    fontSize: 11,
    fontFamily: DISPLAY,
    letterSpacing: "0.02em",
    width: "100%",
    boxSizing: "border-box",
    transition: "all 0.15s",
  },

  btnSmall: {
    background: DS.accentDim,
    color: DS.accent,
    border: `1px solid ${DS.accent}33`,
    padding: "4px 10px",
    borderRadius: 6,
    cursor: "pointer",
    fontWeight: 600,
    fontSize: 11,
    fontFamily: DISPLAY,
    boxSizing: "border-box",
  },

  btnDanger: {
    background: DS.dangerDim,
    color: DS.danger,
    border: `1px solid ${DS.danger}33`,
    padding: "8px 12px",
    borderRadius: 8,
    cursor: "pointer",
    fontWeight: 600,
    textAlign: "center",
    fontSize: 11,
    fontFamily: DISPLAY,
    letterSpacing: "0.02em",
    width: "100%",
    boxSizing: "border-box",
  },

  ghostBtn: {
    background: "transparent",
    color: DS.textSecond,
    border: `1px solid ${DS.border}`,
    padding: "8px 12px",
    borderRadius: 8,
    cursor: "pointer",
    fontSize: 11,
    fontFamily: DISPLAY,
    width: "100%",
    boxSizing: "border-box",
  },

  modalBackdrop: {
    position: "fixed",
    inset: 0,
    background: "rgba(6,6,10,0.85)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 2000,
    backdropFilter: "blur(24px)",
  },

  modal: {
    position: "relative",
    width: 440,
    maxWidth: "92vw",
    background: DS.bgPanel,
    padding: 28,
    borderRadius: 16,
    boxShadow: "0 40px 120px rgba(0,0,0,0.8), 0 0 0 1px rgba(93,228,199,0.08), inset 0 1px 0 rgba(255,255,255,0.04)",
    border: `1px solid ${DS.borderStrong}`,
    animation: "fade-scale-in 180ms ease both",
    overflow: "hidden",
  },
};
