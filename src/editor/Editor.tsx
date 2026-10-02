'use client';

/**
 * Mounts CE.SDK through its React wrapper and runs the setup once the editor instance exists:
 * the customizations (`./customization`), the empty scene (`./scene.ts`) and the first zoom.
 */
import CreativeEditor from '@cesdk/cesdk-js/react';
import type CreativeEditorSDK from '@cesdk/cesdk-js';
import { useCallback, useEffect, useRef, useState } from 'react';
import { setupEditor, watchPanels } from './customization';
import { t } from './i18n';
import type { PagePreset } from './presets';
import { createScene } from './scene';

const LICENSE = process.env.NEXT_PUBLIC_CESDK_LICENSE ?? '';

/**
 * CE.SDK configuration. Without a `baseURL` the engine and UI assets (WebAssembly, fonts, icons,
 * stylesheets) load from the IMG.LY CDN, which is fine for a PoC. For production, host them
 * yourself and point `baseURL` at them, as described in the starter kit's README.
 *
 * @see https://img.ly/docs/cesdk/js/configuration-2c1c3d/
 */
const CONFIG = { license: LICENSE, userId: 'comic-poc' };

export default function Editor({ preset, onReady }: { preset: PagePreset; onReady: (cesdk: CreativeEditorSDK | null) => void }) {
  const [error, setError] = useState<string | null>(null);
  const cleanup = useRef<(() => void) | null>(null);

  const init = useCallback(
    async (cesdk: CreativeEditorSDK) => {
      // The wrapper swallows errors thrown from `init`; surface them ourselves.
      try {
        // Handy for exploring the API from the browser console during development.
        if (process.env.NODE_ENV !== 'production') (window as unknown as { cesdk?: CreativeEditorSDK }).cesdk = cesdk;
        await setupEditor(cesdk);
        createScene(cesdk, preset);
        await cesdk.actions.run('zoom.toPage', { autoFit: true });
        cleanup.current = watchPanels(cesdk);
        onReady(cesdk);
      } catch (err) {
        const message = (err as Error).message ?? String(err);
        // The component unmounted mid-init (hot reload, navigation): nothing to report.
        if (/disposed/i.test(message)) return;
        console.error('[cesdk init]', err);
        setError(message);
      }
    },
    [onReady, preset]
  );

  useEffect(
    () => () => {
      cleanup.current?.();
      onReady(null);
    },
    [onReady]
  );

  if (!LICENSE) {
    return (
      <Notice title={t('error.license.title')}>{t('error.license.text')}</Notice>
    );
  }

  return (
    <>
      {error && <Notice title={t('error.start.title')}>{error}</Notice>}
      <CreativeEditor config={CONFIG} init={init} width="100%" height="100%" onError={(e) => setError(e.message)} />
    </>
  );
}

function Notice({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="absolute inset-0 z-20 flex items-center justify-center bg-(--cs-canvas)">
      <div className="bg-(--cs-card) border border-(--cs-border) rounded-xl p-6 max-w-md text-sm shadow-xl">
        <div className="font-medium mb-1 text-(--cs-text)">{title}</div>
        <div className="text-(--cs-text-soft)">{children}</div>
      </div>
    </div>
  );
}
