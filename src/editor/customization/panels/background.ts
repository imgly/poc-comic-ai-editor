/**
 * CUSTOMIZATION: custom panel "Hintergrund" (Background)
 *
 * Model dropdown, prompt and Generate. Generate produces four variants; the first one that
 * arrives is shown on the page, and the page's canvas menu steps through them (../canvas.ts).
 *
 * The render function below runs again when engine state it reads or a `ctx.state` value changes;
 * it describes the panel from top to bottom with builder calls.
 */
import type CreativeEditorSDK from '@cesdk/cesdk-js';
import { addBackgroundVariant, backgroundVariants, finishBackgroundVariants, startBackgroundVariants } from '@/editor/engine/backgroundVariants';
import { currentPage, ratioLabel } from '@/editor/engine/blocks';
import { t } from '@/lib/i18n';
import { generateVariants } from '@/editor/ai/generateVariants';
import { BACKGROUND_PANEL } from '../ids';
import { generateState, modelSelect, useRefresh } from './shared';

const ID = 'comic.background';

/** Background generation always produces four variants. */
const VARIANT_COUNT = 4;

/** Prompt the panel starts with, so a demo can generate right away. */
const DEFAULT_PROMPT = 'Ein lichtdurchflutetes Gewächshaus mit einer ruhigen Pflanzbank. Warme Farben, illustrativer Stil.';

export function registerBackgroundPanel(cesdk: CreativeEditorSDK): void {
  cesdk.ui.registerPanel(BACKGROUND_PANEL, (ctx) => {
    const { builder, engine } = ctx;
    const refresh = useRefresh(ctx, ID);
    const prompt = ctx.state(`${ID}.prompt`, DEFAULT_PROMPT);
    const gen = generateState(ctx, ID);
    const page = currentPage(engine);

    builder.Section(`${ID}.form`, {
      children: () => {
        const { model } = modelSelect(ctx, ID, refresh, 'text2image');
        builder.TextArea(`${ID}.prompt`, {
          inputLabel: t('prompt'),
          placeholder: t('background.placeholder'),
          value: prompt.value,
          setValue: prompt.setValue,
        });
        const count = VARIANT_COUNT;
        builder.Button(`${ID}.generate`, {
          label: gen.busy ? gen.progress || t('generating') : t('generate'),
          color: 'accent',
          icon: '@imgly/Appearance',
          isLoading: gen.busy,
          isDisabled: gen.busy || page === null || prompt.value.trim() === '',
          onClick: async () => {
            if (page === null) return;
            const { width, height } = { width: engine.block.getFrameWidth(page), height: engine.block.getFrameHeight(page) };
            gen.setBusy(true);
            gen.setError('');
            gen.setProgress(t('progress', { done: 0, count }));
            startBackgroundVariants(engine, page, count);
            const error = await generateVariants({
              model,
              prompt: prompt.value.trim(),
              ratio: ratioLabel(width, height),
              count,
              onVariant: ({ uri }) => addBackgroundVariant(engine, page, uri),
              onProgress: (done, failed) => gen.setProgress(t('progress', { done: done + failed, count })),
            });
            finishBackgroundVariants(engine, page);
            gen.setBusy(false);
            gen.setProgress('');
            if (error) gen.setError(error);
          },
        });
        if (gen.error) builder.Text(`${ID}.error`, { content: gen.error });
        if (gen.busy || (page !== null && backgroundVariants(engine, page) !== null)) builder.Text(`${ID}.hint`, { content: t('background.hint') });
      },
    });
  });
}
