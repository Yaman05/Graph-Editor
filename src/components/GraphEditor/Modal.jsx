import React, { useState } from "react";
import { styles } from "./styles";

export default function Modal({ title, fields, onSubmit, onClose }) {
  const [vals, setVals] = useState(
    fields.reduce((a, f) => ({ ...a, [f.name]: f.defaultValue ?? "" }), {})
  );

  return (
    <div style={styles.modalBackdrop}>
      <div style={styles.modal}>
        <h3 style={{ margin: 0, marginBottom: 12, color: styles.brandColor }}>{title}</h3>
        {fields.map((f) => (
          <div key={f.name} style={{ marginBottom: 10 }}>
            <label style={{ color: "#cfcfe0", fontSize: 13 }}>{f.label}</label>
            {f.options ? (
              <select
                value={vals[f.name]}
                onChange={(e) => setVals({ ...vals, [f.name]: e.target.value })}
                style={{ ...styles.input, width: "100%" }}
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
                placeholder={f.placeholder ?? ""}
                style={styles.input}
              />
            )}
          </div>
        ))}

        <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
          <button onClick={onClose} style={styles.ghostBtn}>Cancel</button>
          <button onClick={() => onSubmit(vals)} style={{ ...styles.btn, minWidth: 80 }}>
            OK
          </button>
        </div>
      </div>
    </div>
  );
}
