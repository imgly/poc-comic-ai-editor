'use client';

/**
 * Start screen: aspect ratio and image size of the canvas. Plain React outside of CE.SDK; the
 * chosen size is handed to the editor, which creates the page with it
 * (`src/editor/engine/scene.ts`). The ratios and sizes on offer are defined in
 * `src/editor/ratios.ts`.
 */
import { useState } from 'react';
import { t } from '@/lib/i18n';
import { PAGE_SIZES, pagePreset, RATIOS, ratioValue, type PagePreset, type PageSizeId, type Ratio } from '@/editor/ratios';

const DEFAULT_RATIO = RATIOS.find((r) => r.id === '16:9') ?? RATIOS[0];

/** Outline of the ratio, as tall as the icon row allows. */
function RatioIcon({ ratio, active }: { ratio: Ratio; active: boolean }) {
  const value = ratioValue(ratio);
  const width = value >= 1 ? 29 : Math.round(26 * value);
  const height = value >= 1 ? Math.round(29 / value) : 26;
  return (
    <span className="h-[26px] flex items-center justify-center">
      <span className={`block border ${active ? 'border-(--cs-accent)' : 'border-(--cs-text-muted)'}`} style={{ width, height }} />
    </span>
  );
}

export function StartScreen({ onCreate }: { onCreate: (preset: PagePreset) => void }) {
  const [ratio, setRatio] = useState<Ratio>(DEFAULT_RATIO);
  const [size, setSize] = useState<PageSizeId>('medium');
  const preset = pagePreset(ratio, size);
  const card = (active: boolean) =>
    `rounded-lg border transition-colors ${active ? 'border-(--cs-accent) bg-(--cs-selected) text-(--cs-accent)' : 'border-(--cs-border) text-(--cs-text-soft) hover:border-(--cs-border-strong)'}`;

  return (
    <div className="h-full flex items-center justify-center bg-(--cs-canvas) text-(--cs-text) p-6 overflow-auto">
      <div className="w-full max-w-[660px] bg-(--cs-card) border border-(--cs-border) rounded-[18px] px-[30px] pt-8 pb-[30px] shadow-2xl">
        <div className="text-[10px] tracking-[0.16em] uppercase text-(--cs-eyebrow)">{t('start.eyebrow')}</div>
        <h1 className="text-[28px] leading-tight mt-5">{t('start.title')}</h1>
        <p className="text-[13px] text-(--cs-text-soft) mt-5">{t('start.subtitle')}</p>

        <h2 className="text-[13px] font-medium mt-11 mb-3">{t('start.ratio')}</h2>
        <div className="grid grid-cols-5 gap-2" role="radiogroup" aria-label={t('start.ratio')}>
          {RATIOS.map((r) => {
            const active = r.id === ratio.id;
            return (
              <button key={r.id} type="button" role="radio" aria-checked={active} onClick={() => setRatio(r)} className={`${card(active)} h-[65px] flex flex-col items-center justify-center gap-2 text-[11px]`}>
                <RatioIcon ratio={r} active={active} />
                {r.id}
              </button>
            );
          })}
        </div>

        <h2 className="text-[13px] font-medium mt-7 mb-3">{t('start.size')}</h2>
        <div className="grid grid-cols-3 gap-2.5" role="radiogroup" aria-label={t('start.size')}>
          {PAGE_SIZES.map((s) => {
            const active = s.id === size;
            return (
              <button key={s.id} type="button" role="radio" aria-checked={active} onClick={() => setSize(s.id)} className={`${card(active)} h-[49px] px-3.5 flex items-center justify-between text-[13px]`}>
                <span className={`font-medium ${active ? '' : 'text-(--cs-text)'}`}>{t(`start.size.${s.id}`)}</span>
                <span className="text-[11px] text-(--cs-text-soft) self-start mt-2.5">{s.megapixels} MP</span>
              </button>
            );
          })}
        </div>
        <p className="text-[11px] text-(--cs-text-soft) mt-4">
          {preset.width} × {preset.height} px · {preset.ratio}
        </p>

        <p className="text-[10.5px] text-(--cs-text-soft) bg-(--cs-inset) rounded-md px-3.5 py-3 mt-8">{t('start.note')}</p>
        <button type="button" onClick={() => onCreate(preset)} className="mt-[18px] w-full h-11 rounded-full bg-(--cs-accent) hover:bg-(--cs-accent-hover) text-(--cs-on-accent) font-medium text-base">
          {t('start.create')} →
        </button>
      </div>
    </div>
  );
}
