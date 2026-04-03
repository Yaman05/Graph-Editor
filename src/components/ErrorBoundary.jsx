import { Component } from "react";
import { DS, MONO } from "./GraphEditor/styles";

export default class ErrorBoundary extends Component {
  state = { error: null };

  static getDerivedStateFromError(error) {
    return { error };
  }

  render() {
    if (!this.state.error) return this.props.children;
    return (
      <div style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        height: "100vh",
        background: DS.bg,
        color: DS.textPrimary,
        fontFamily: MONO,
        gap: 16,
        padding: 32,
      }}>
        <div style={{ fontSize: 32, opacity: 0.3 }}>&#x26A0;</div>
        <div style={{ fontSize: 14, fontWeight: 700, color: DS.danger }}>
          Something went wrong
        </div>
        <pre style={{
          fontSize: 11,
          color: DS.textSecond,
          background: DS.bgCard,
          padding: "12px 20px",
          borderRadius: 4,
          maxWidth: 500,
          overflow: "auto",
          whiteSpace: "pre-wrap",
          border: `1px solid ${DS.border}`,
        }}>
          {this.state.error?.message || "Unknown error"}
        </pre>
        <button
          onClick={() => this.setState({ error: null })}
          style={{
            padding: "8px 20px",
            fontSize: 12,
            fontFamily: MONO,
            background: DS.accent,
            color: "#000",
            border: "none",
            borderRadius: 4,
            cursor: "pointer",
            fontWeight: 600,
          }}
        >
          Try Again
        </button>
      </div>
    );
  }
}
