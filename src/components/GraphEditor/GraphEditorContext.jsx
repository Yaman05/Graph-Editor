import { createContext, useContext } from "react";

export const GraphEditorContext = createContext(null);

export function useGraphEditor() {
  const ctx = useContext(GraphEditorContext);
  if (!ctx) throw new Error("useGraphEditor must be used within GraphEditorContext.Provider");
  return ctx;
}
