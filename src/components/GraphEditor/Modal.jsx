import { useState } from "react";
import { styles, DS, MONO } from "./styles";

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

        {/* Title */}
        <div style={{
          display: "flex",
          alignItems: "center",
          gap: 10,
          marginBottom: 20,
          paddingBottom: 14,
          borderBottom: `1px solid ${DS.border}`,
        }}>
          <span style={{
            display: "inline-block",
            width: 3,
            height: 16,
            background: DS.accent,
            borderRadius: 1,
            flexShrink: 0,
          }} />
          <h3 style={{
            margin: 0,
            color: DS.textPrimary,
            fontSize: 11,
            fontWeight: 700,
            letterSpacing: "0.12em",
            textTransform: "uppercase",
            fontFamily: MONO,
          }}>
            {title}
          </h3>
        </div>

        {/* Fields */}
        {fields.map((f) => (
          <div key={f.name} style={{ marginBottom: 14 }}>
            <label style={{
              display: "block",
              color: DS.textMuted,
              fontSize: 12,
              letterSpacing: "0.08em",
              textTransform: "uppercase",
              marginBottom: 6,
              fontFamily: MONO,
            }}>
              {f.label}
            </label>
            {f.type === "message" ? (
              <div style={{
                fontSize: 12,
                color: DS.textSecond,
                fontFamily: MONO,
                lineHeight: 1.6,
              }}>
                {f.text}
              </div>
            ) : f.options ? (
              <select
                value={vals[f.name]}
                onChange={(e) => setVals({ ...vals, [f.name]: e.target.value })}
                style={{
                  ...styles.input,
                  cursor: "pointer",
                  appearance: "none",
                  backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='6'%3E%3Cpath d='M0 0l5 6 5-6z' fill='%2394a3b8'/%3E%3C/svg%3E")`,
                  backgroundRepeat: "no-repeat",
                  backgroundPosition: "right 10px center",
                  paddingRight: 28,
                }}
              >
                {f.options.map((opt) => (
                  <option key={opt} value={opt}>{opt}</option>
                ))}
              </select>
            ) : (
              <input
                autoFocus={f.autoFocus}
                value={vals[f.name]}
                onChange={(e) => setVals({ ...vals, [f.name]: e.target.value })}
                onKeyDown={handleKeyDown}
                placeholder={f.placeholder ?? ""}
                style={styles.input}
              />
            )}
          </div>
        ))}

        {/* Actions */}
        <div style={{
          display: "flex",
          justifyContent: "flex-end",
          gap: 8,
          marginTop: 22,
          paddingTop: 14,
          borderTop: `1px solid ${DS.border}`,
        }}>
          <button
            onClick={onClose}
            style={{ ...styles.ghostBtn, width: "auto", padding: "6px 18px" }}
          >
            CANCEL
          </button>
          <button
            onClick={() => onSubmit(vals)}
            style={{ ...styles.btn, width: "auto", padding: "6px 18px" }}
          >
            CONFIRM
          </button>
        </div>
      </div>
    </div>
  );
}