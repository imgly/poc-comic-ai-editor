/**
 * Small external store shared between the CE.SDK panels (builder API, outside of React) and the
 * React overlays on the canvas. It holds the one piece of UI state CE.SDK does not know about:
 * whether the editor is waiting for the user to draw an object area.
 */
import { useSyncExternalStore } from 'react';

export type EditorState = {
  /** The Create Object panel is waiting for a drag on the page that marks the area. */
  markArea: boolean;
};

type Listener = () => void;

let state: EditorState = { markArea: false };
const listeners = new Set<Listener>();

function set(patch: Partial<EditorState>) {
  state = { ...state, ...patch };
  listeners.forEach((l) => l());
}

export const editorStore = {
  get: () => state,
  subscribe(l: Listener) {
    listeners.add(l);
    return () => {
      listeners.delete(l);
    };
  },
  setMarkArea(markArea: boolean) {
    if (state.markArea !== markArea) set({ markArea });
  },
};

export function useEditorState(): EditorState {
  return useSyncExternalStore(editorStore.subscribe, editorStore.get, editorStore.get);
}
