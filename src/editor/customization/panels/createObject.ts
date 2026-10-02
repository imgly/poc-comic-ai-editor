/**
 * CUSTOMIZATION: custom panel "Objekt erstellen" (Create Object)
 *
 * Needs an area on the page (drawn by dragging while the panel is open, see AreaOverlay.tsx) and
 * a background, which is sent to the model as the style reference. Sections from top to bottom:
 * the area with its size/ratio dropdown, model and prompt with Generate, and the four generated
 * variants as thumbnails (the stock asset library component). Clicking a variant places it into
 * the area. Generate is disabled without an area or a background.
 */
import type CreativeEditorSDK from '@cesdk/cesdk-js';
import { applyObject, backgroundImageUri, blockSize, currentPage, ratioLabel, resizeArea, selectedTarget, roleOf } from '../../blocks';
import { t } from '../../i18n';
import { RATIOS, ratioValue } from '../../ratios';
import { editorStore } from '../../store';
import { ensureVariantSet, generateVariants } from '../../variants';
import { OBJECT_PANEL } from '../ids';
import { generateState, modelSelect, useRefresh } from './shared';

const ID = 'comic.object';

/** Object generation always produces four variants. */
const VARIANT_COUNT = 4;

/** Prompt the panel starts with, so a demo can generate right away. */
const DEFAULT_PROMPT = 'Eine Katze sitzt auf dem Boden und putzt friedlich ihr Fell.';

/** Appended to every object prompt so the model treats the background as a style reference. */
const STYLE_INSTRUCTION = 'Match the art style, colour palette, line work and lighting of the reference image exactly. Show only the described object, centred and fully visible, isolated on a plain white background, no scene, no shadows on the ground.';

type SizeOption = { id: string; label: string; apply?: (w: number, h: number) => [number, number] };

/** The ratios an area snaps to (the width stays, the height follows), plus a few fixed square sizes. */
const SIZE_OPTIONS: SizeOption[] = [
  { id: 'custom', label: t('area.size.custom') },
  ...RATIOS.map((r): SizeOption => {
    const value = ratioValue(r);
    const kind = value === 1 ? t('area.size.square') : value > 1 ? t('area.size.landscape') : t('area.size.portrait');
    return { id: r.id, label: `${kind} ${r.id}`, apply: (w) => [w, w / value] };
  }),
  { id: '512', label: '512 × 512 px', apply: () => [512, 512] },
  { id: '768', label: '768 × 768 px', apply: () => [768, 768] },
  { id: '1024', label: '1024 × 1024 px', apply: () => [1024, 1024] },
];

export function registerCreateObjectPanel(cesdk: CreativeEditorSDK): void {
  cesdk.ui.registerPanel(OBJECT_PANEL, (ctx) => {
    const { builder, engine } = ctx;
    const refresh = useRefresh(ctx, ID);
    const prompt = ctx.state(`${ID}.prompt`, DEFAULT_PROMPT);
    const gen = generateState(ctx, ID);
    const target = selectedTarget(engine);
    const size = target !== null ? blockSize(engine, target) : null;
    const marking = editorStore.get().markArea;
    const page = currentPage(engine);
    const background = page !== null ? backgroundImageUri(engine, page) : null;

    builder.Section(`${ID}.area`, {
      title: t('area.title'),
      children: () => {
        if (size && target !== null) {
          const role = roleOf(engine, target);
          builder.Text(`${ID}.area.info`, {
            content: `${role === 'object' ? t('area.object') : t('area.empty')} · ${ratioLabel(size.width, size.height)} · ${Math.round(size.width)} × ${Math.round(size.height)} px`,
          });
        } else {
          builder.Text(`${ID}.area.info`, { content: marking ? t('area.drag') : t('area.none') });
        }
        builder.Button(`${ID}.area.mark`, {
          label: marking ? t('area.mark.cancel') : size ? t('area.mark.new') : t('area.mark'),
          icon: '@imgly/ShapeRectangle',
          isActive: marking,
          isDisabled: gen.busy,
          onClick: () => editorStore.setMarkArea(!marking),
        });
        const current = size ? SIZE_OPTIONS.find((o) => o.id === ratioLabel(size.width, size.height)) ?? SIZE_OPTIONS[0] : SIZE_OPTIONS[0];
        builder.Select(`${ID}.size`, {
          inputLabel: t('area.size'),
          values: SIZE_OPTIONS,
          value: current,
          isDisabled: target === null || gen.busy,
          setValue: (v) => {
            const option = SIZE_OPTIONS.find((o) => o.id === v.id);
            if (target === null || !size || !option?.apply) return;
            const [w, h] = option.apply(size.width, size.height);
            resizeArea(engine, target, w, h);
          },
        });
      },
    });

    builder.Section(`${ID}.form`, {
      children: () => {
        const { model } = modelSelect(ctx, ID, refresh, 'image2image');
        builder.TextArea(`${ID}.prompt`, {
          inputLabel: t('prompt'),
          placeholder: t('object.placeholder'),
          value: prompt.value,
          setValue: prompt.setValue,
        });
        const count = VARIANT_COUNT;
        builder.Button(`${ID}.generate`, {
          label: gen.busy ? gen.progress || t('generating') : t('generate'),
          color: 'accent',
          icon: '@imgly/Appearance',
          isLoading: gen.busy,
          isDisabled: gen.busy || target === null || background === null || prompt.value.trim() === '',
          onClick: async () => {
            if (target === null || !size || background === null) return;
            const set = ensureVariantSet(cesdk, `object.${target}`);
            gen.setBusy(true);
            gen.setError('');
            gen.setProgress(t('progress', { done: 0, count }));
            let error: string | null = null;
            try {
              const reference = await (await fetch(background)).blob();
              error = await generateVariants(cesdk, set, {
                model,
                prompt: `${prompt.value.trim()} ${STYLE_INSTRUCTION}`,
                ratio: ratioLabel(size.width, size.height),
                count,
                reference,
                transparent: true,
                onProgress: (done, failed) => gen.setProgress(t('progress', { done: done + failed, count })),
              });
            } catch (err) {
              error = (err as Error).message ?? String(err);
            }
            gen.setBusy(false);
            gen.setProgress('');
            if (error) gen.setError(error);
          },
        });
        if (background === null) builder.Text(`${ID}.noBackground`, { content: t('object.noBackground') });
        else if (target === null && !marking) builder.Text(`${ID}.disabled`, { content: t('object.noArea') });
        else builder.Text(`${ID}.reference`, { content: t('object.reference') });
        if (gen.error) builder.Text(`${ID}.error`, { content: gen.error });
      },
    });

    if (target !== null) {
      const set = ensureVariantSet(cesdk, `object.${target}`);
      builder.Section(`${ID}.results`, {
        title: t('object.results'),
        children: () => {
          builder.Text(`${ID}.hint`, { content: t('object.hint') });
          builder.Library(`${ID}.library.${target}`, {
            entries: [set.entryId],
            onSelect: async (asset) => {
              const uri = asset.meta?.uri;
              if (typeof uri === 'string' && engine.block.isValid(target)) applyObject(engine, target, uri, prompt.value.trim());
            },
          });
        },
      });
    }
  });
}
