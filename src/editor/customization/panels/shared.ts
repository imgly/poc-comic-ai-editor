/**
 * CUSTOMIZATION: shared panel helpers
 *
 * Bits both tool panels share: the model dropdown, the generate state and the mechanics to
 * re-render a builder panel from asynchronous code.
 */
import type { BuilderRenderFunctionContext, ComponentPayload } from '@cesdk/cesdk-js';
import { DEFAULT_MODEL, type Capability, type ImageModel } from '../../ai/gateway';
import { t } from '../../i18n';
import { loadModels } from '../../variants';

type Ctx = BuilderRenderFunctionContext<ComponentPayload>;

/**
 * Builder panels re-render on engine events and when a panel `state` value changes. Async work
 * (model list, generation) keeps the setter of a counter state and bumps it to trigger a render.
 */
export function useRefresh(ctx: Ctx, id: string): () => void {
  const rev = ctx.state(`${id}.rev`, 0);
  const current = rev.value;
  return () => rev.setValue(current + 1);
}

type ModelCache = { models: ImageModel[] | null; error: string | null; requested: boolean; failedAt: number };
const caches: Record<Capability, ModelCache> = {
  text2image: { models: null, error: null, requested: false, failedAt: 0 },
  image2image: { models: null, error: null, requested: false, failedAt: 0 },
};

/** After a failed attempt the list is requested again on a render at least this much later. */
const RETRY_AFTER_MS = 5000;

/** Model dropdown for one capability; the list loads once and the panel re-renders when it arrives. */
export function modelSelect(ctx: Ctx, id: string, refresh: () => void, capability: Capability): { model: string } {
  const { builder } = ctx;
  const cache = caches[capability];
  const selected = ctx.state(`${id}.model`, DEFAULT_MODEL[capability]);
  const retry = cache.error !== null && Date.now() - cache.failedAt > RETRY_AFTER_MS;
  if (!cache.requested || retry) {
    cache.requested = true;
    cache.error = null;
    loadModels(capability)
      .then((list) => {
        cache.models = list;
        refresh();
      })
      .catch((err) => {
        cache.error = (err as Error).message;
        cache.failedAt = Date.now();
        refresh();
      });
  }
  const { models, error } = cache;
  const values = models?.map((m) => ({ id: m.id, label: m.creator ? `${m.name} · ${m.creator}` : m.name })) ?? [{ id: selected.value, label: error ? t('model.unavailable') : t('model.loading') }];
  // Keep the selection valid once the real list is known.
  const model = models && !models.some((m) => m.id === selected.value) ? models[0].id : selected.value;
  builder.Select(`${id}.model`, {
    inputLabel: t('model'),
    values,
    value: values.find((v) => v.id === model) ?? values[0],
    setValue: (v) => selected.setValue(v.id),
    isLoading: !models && !error,
    isDisabled: !models,
    searchable: (models?.length ?? 0) > 8,
  });
  if (error) builder.Text(`${id}.model.error`, { content: error });
  return { model };
}

export type GenerateState = { busy: boolean; setBusy: (b: boolean) => void; error: string; setError: (e: string) => void; progress: string; setProgress: (p: string) => void };

export function generateState(ctx: Ctx, id: string): GenerateState {
  const busy = ctx.state(`${id}.busy`, false);
  const error = ctx.state(`${id}.error`, '');
  const progress = ctx.state(`${id}.progress`, '');
  return { busy: busy.value, setBusy: busy.setValue, error: error.value, setError: error.setValue, progress: progress.value, setProgress: progress.setValue };
}
