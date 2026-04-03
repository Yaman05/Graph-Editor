import { useReducer, useCallback } from "react";

const MAX_HISTORY = 10;

function reducer(state, action) {
  switch (action.type) {
    case "update":
      return {
        current: action.payload,
        past: [...state.past, state.current].slice(-MAX_HISTORY),
        future: [],
      };
    case "undo": {
      if (!state.past.length) return state;
      return {
        current: state.past[state.past.length - 1],
        past: state.past.slice(0, -1),
        future: [state.current, ...state.future],
      };
    }
    case "redo": {
      if (!state.future.length) return state;
      return {
        current: state.future[0],
        past: [...state.past, state.current],
        future: state.future.slice(1),
      };
    }
    default:
      return state;
  }
}

export function useHistoryState(initial) {
  const [state, dispatch] = useReducer(reducer, {
    current: initial,
    past: [],
    future: [],
  });

  const update = useCallback((newState) => dispatch({ type: "update", payload: newState }), []);
  const undo = useCallback(() => dispatch({ type: "undo" }), []);
  const redo = useCallback(() => dispatch({ type: "redo" }), []);

  return [state.current, update, { undo, redo, canUndo: state.past.length > 0, canRedo: state.future.length > 0 }];
}
