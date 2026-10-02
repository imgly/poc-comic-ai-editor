'use client';

/** The app has two states: the start screen, and the editor for the canvas chosen there. */
import { useState } from 'react';
import { EditorHost } from '@/editor/EditorHost';
import type { PagePreset } from '@/editor/presets';
import { StartScreen } from '@/editor/StartScreen';

export default function Page() {
  const [session, setSession] = useState<{ preset: PagePreset; nonce: number } | null>(null);

  if (!session) return <StartScreen onCreate={(preset) => setSession({ preset, nonce: Date.now() })} />;
  return <EditorHost key={session.nonce} preset={session.preset} onNew={() => setSession(null)} />;
}
