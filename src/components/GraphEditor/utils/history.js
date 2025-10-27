import { useState } from "react";

export function useHistoryState(initial) {
  const [state, setState] = useState(initial);
  const [history, setHistory] = useState([]);
  const [future, setFuture] = useState([]);

  function update(newState) {
    setHistory((h) => {
      const newHist = [...h, state];
      return newHist.length > 10 ? newHist.slice(newHist.length - 10) : newHist;
    });
    setFuture([]);
    setState(newState);
  }

  function undo() {
    setHistory((h) => {
      if (!h.length) return h;
      const prev = h[h.length - 1];
      setFuture((f) => [state, ...f]);
      setState(prev);
      return h.slice(0, -1);
    });
  }

  function redo() {
    setFuture((f) => {
      if (!f.length) return f;
      const next = f[0];
      setHistory((h) => [...h, state]);
      setState(next);
      return f.slice(1);
    });
  }

  return [state, update, { undo, redo, canUndo: history.length > 0, canRedo: future.length > 0 }];
}
