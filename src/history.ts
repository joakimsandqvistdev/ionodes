import type { GraphDocument } from './graph';

export type History<T> = { past: T[]; present: T; future: T[]; limit: number };
export function createHistory<T>(present: T, limit = 100): History<T> {
  return { past: [], present, future: [], limit };
}
export function commit<T>(history: History<T>, next: T): History<T> {
  if (next === history.present) return history;
  return {
    ...history,
    past: [...history.past, history.present].slice(-history.limit),
    present: next,
    future: []
  };
}
export function undo<T>(history: History<T>): History<T> {
  if (!history.past.length) return history;
  return {
    ...history,
    past: history.past.slice(0, -1),
    present: history.past.at(-1)!,
    future: [history.present, ...history.future]
  };
}
export function redo<T>(history: History<T>): History<T> {
  if (!history.future.length) return history;
  return {
    ...history,
    past: [...history.past, history.present],
    present: history.future[0]!,
    future: history.future.slice(1)
  };
}
export type GraphHistory = History<GraphDocument>;
