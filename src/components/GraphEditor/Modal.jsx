// src/components/GraphEditor/Modal.jsx
import { useState } from "react";
import { styles, DS, MONO, DISPLAY } from "./styles";

export default function Modal({ title, fields, onSubmit, onClose }) {
  const [vals, setVals] = useState(
    fields.reduce((a, f) => ({ ...a, [f.name]: f.defaultValue ?? "" }), {})
  );

  function handleKeyDown(e) {
    if (e.key === "Enter") onSubmit(vals);
    if (e.key === "Escape") onClose();
  }

  return (
    <div style={styles.modalBackdrop} onClick={onClose}>
      <div style={styles.modal} onClick={(e) => e.stopPropagation()}>

        {/* Top accent glow */}
        <div style={{
          position: "absolute",
          top: 0, left: 0, right: 0,
          height: 1,
          background: `linear-gradient(90deg, ${DS.accent} 0%, transparent 70%)`,
          borderRadius: "16px 16px 0 0",
        }} />

        {/* Title */}
        <div style={{
          display: "flex",
          alignItems: "center",
          gap: 12,
          marginBottom: 24,
          paddingBottom: 16,
          borderBottom: `1px solid ${DS.border}`,
        }}>
          <div style={{
            width: 32,
            height: 32,
            borderRadius: 10,
            background: DS.accentDim,
            border: `1px solid ${DS.accent}33`,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
          }}>
            <div style={{
              width: 8, height: 8,
              background: DS.accent,
              borderRadius: 3,
              boxShadow: `0 0 8px ${DS.accent}88`,
            }} />
          </div>
          <h3 style={{
            margin: 0,
            color: DS.textPrimary,
            fontSize: 15,
            fontWeight: 600,
            fontFamily: DISPLAY,
          }}>
            {title}
          </h3>
        </div>

        {/* Fields */}
        {fields.map((f) => (
          <ModalField
            key={f.name}
            field={f}
            value={vals[f.name]}
            onChange={(v) => setVals({ ...vals, [f.name]: v })}
            onKeyDown={handleKeyDown}
          />
        ))}

        {/* Actions */}
        <div style={{
          display: "flex",
          justifyContent: "flex-end",
          gap: 8,
          marginTop: 24,
          paddingTop: 16,
          borderTop: `1px solid ${DS.border}`,
        }}>
          <ModalBtn onClick={onClose} variant="ghost">Cancel</ModalBtn>
          <ModalBtn onClick={() => onSubmit(vals)} variant="accent">Confirm</ModalBtn>
        </div>
      </div>
    </div>
  );
}

function ModalField({ field: f, value, onChange, onKeyDown }) {
  const [focused, setFocused] = useState(false);

  return (
    <div style={{ marginBottom: 18 }}>
      <label style={{
        display: "block",
        color: DS.textMuted,
        fontSize: 11,
        letterSpacing: "0.04em",
        textTransform: "uppercase",
        marginBottom: 8,
        fontFamily: DISPLAY,
        fontWeight: 600,
      }}>
        {f.label}
      </label>

      {f.type === "message" ? (
        <div style={{
          fontSize: 13,
          color: DS.textSecond,
          fontFamily: DISPLAY,
          lineHeight: 1.7,
          padding: "12px 14px",
          background: DS.bgCard,
          border: `1px solid ${DS.border}`,
          borderRadius: 10,
        }}>
          {f.text}
        </div>
      ) : f.options ? (
        <select
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          style={{
            ...styles.input,
            cursor: "pointer",
            appearance: "none",
            backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='6'%3E%3Cpath d='M0 0l5 6 5-6z' fill='%237b7f9e'/%3E%3C/svg%3E")`,
            backgroundRepeat: "no-repeat",
            backgroundPosition: "right 12px center",
            paddingRight: 30,
            borderColor: focused ? `${DS.accent}55` : DS.border,
            boxShadow: focused ? `0 0 0 3px ${DS.accent}15` : "none",
          }}
        >
          {f.options.map((opt) => (
            <option key={opt} value={opt}>{opt}</option>
          ))}
        </select>
      ) : (
        <input
          autoFocus={f.autoFocus}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={onKeyDown}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          placeholder={f.placeholder ?? ""}
          style={{
            ...styles.input,
            borderColor: focused ? `${DS.accent}55` : DS.border,
            boxShadow: focused ? `0 0 0 3px ${DS.accent}15` : "none",
          }}
        />
      )}
    </div>
  );
}

function ModalBtn({ onClick, variant, children }) {
  const [hov, setHov] = useState(false);

  const isAccent = variant === "accent";
  const vs = isAccent
    ? {
        background: hov ? `${DS.accent}22` : DS.accentDim,
        color: DS.accent,
        border: `1px solid ${hov ? DS.accent : DS.accent + "44"}`,
        boxShadow: hov ? `0 0 16px ${DS.accent}22` : "none",
      }
    : {
        background: hov ? "rgba(255,255,255,0.04)" : "transparent",
        color: DS.textSecond,
        border: `1px solid ${DS.border}`,
        boxShadow: "none",
      };

  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        padding: "9px 24px",
        borderRadius: 10,
        cursor: "pointer",
        fontSize: 12,
        fontFamily: DISPLAY,
        fontWeight: 600,
        transition: "all 0.15s ease",
        ...vs,
      }}
    >
      {children}
    </button>
  );
}
