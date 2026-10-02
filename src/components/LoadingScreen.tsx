import type { PagePreset } from '@/editor/ratios';
import { t } from '@/lib/i18n';

/**
 * CUSTOMIZATION: loading screen. Shown from the click on the start screen until the editor is set
 * up. It also covers CE.SDK's own loading state, so there is one loading screen in the look of
 * the rest of the app.
 */
export function LoadingScreen({ preset }: { preset: PagePreset }) {
  return (
    <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-(--cs-canvas)" role="status" aria-live="polite">
      <div className="w-8 h-8 rounded-full border-2 border-(--cs-border) border-t-(--cs-accent) animate-spin" />
      <div className="text-[10px] tracking-[0.16em] uppercase text-(--cs-eyebrow) mt-7">{t('start.eyebrow')}</div>
      <div className="text-[15px] text-(--cs-text) mt-2.5">{t('loading.title')}</div>
      <div className="text-[11px] text-(--cs-text-soft) mt-1.5">
        {preset.ratio} · {preset.width} × {preset.height} px
      </div>
    </div>
  );
}
