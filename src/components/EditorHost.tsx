'use client';

/**
 * The page around the editor: a slim header, the CE.SDK container, and the React layers that sit
 * on top of the canvas (loading screen, area overlays). These parts are the application's own UI,
 * not CE.SDK; they use the same design tokens (`--cs-*` in globals.css) so both look like one app.
 */
import type CreativeEditorSDK from '@cesdk/cesdk-js';
import dynamic from 'next/dynamic';
import { useCallback, useState } from 'react';
import { AreaOverlay } from '@/editor/overlays/AreaOverlay';
import { AreaTag } from '@/editor/overlays/AreaTag';
import type { PagePreset } from '@/editor/ratios';
import { t } from '@/lib/i18n';
import { LoadingScreen } from './LoadingScreen';

// CE.SDK touches `window` at import time, so it is loaded on the client only. The loading screen
// covers the wait for the chunk as well.
const Editor = dynamic(() => import('@/editor/Editor'), { ssr: false });

export function EditorHost({ preset, onNew }: { preset: PagePreset; onNew: () => void }) {
  const [cesdk, setCesdk] = useState<CreativeEditorSDK | null>(null);
  const [host, setHost] = useState<HTMLDivElement | null>(null);
  const onReady = useCallback((instance: CreativeEditorSDK | null) => setCesdk(instance), []);

  return (
    <div className="h-full flex flex-col min-h-0 bg-(--cs-canvas) text-(--cs-text)">
      <header className="h-9 shrink-0 flex items-center gap-2 px-4 border-b border-(--cs-border) bg-(--cs-bar) text-xs">
        <span className="font-medium">Comic Studio</span>
        <span className="text-(--cs-text-muted)">·</span>
        <span className="text-(--cs-text-soft)">
          {preset.ratio} · {preset.width} × {preset.height}
        </span>
        <div className="flex-1" />
        <button type="button" onClick={onNew} className="px-2 py-1 rounded-md text-(--cs-text) hover:bg-(--cs-raised)">
          ↻ {t('header.restart')}
        </button>
      </header>
      <div className="flex-1 relative min-h-0 min-w-0" ref={setHost}>
        <div className="cesdk-host">
          <Editor preset={preset} onReady={onReady} />
        </div>
        {cesdk ? (
          <>
            <AreaTag cesdk={cesdk} host={host} />
            <AreaOverlay cesdk={cesdk} host={host} />
          </>
        ) : (
          <LoadingScreen preset={preset} />
        )}
      </div>
    </div>
  );
}
