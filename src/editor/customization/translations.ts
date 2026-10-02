/**
 * CUSTOMIZATION: language
 *
 * CE.SDK ships English and German; `setLocale` switches its whole UI. The PoC's own texts live in
 * `src/lib/i18n.ts` and are passed to the builder API as ready-made strings. Only labels that
 * CE.SDK looks up by key itself have to be registered as translations: dock entries and panel
 * titles (a panel's title is the translation of `panel.<panel id>`).
 *
 * To change a stock CE.SDK label, add its key here; the keys are listed in
 * `node_modules/@cesdk/cesdk-js/assets/i18n/en.json`.
 *
 * @see https://img.ly/docs/cesdk/js/user-interface/localization-508e20/
 */
import type CreativeEditorSDK from '@cesdk/cesdk-js';
import { LOCALE, t } from '@/lib/i18n';
import { BACKGROUND_PANEL, DOCK_LABEL, OBJECT_PANEL } from './ids';

export function setupTranslations(cesdk: CreativeEditorSDK): void {
  cesdk.i18n.setLocale(LOCALE);
  cesdk.i18n.setTranslations({
    [LOCALE]: {
      [DOCK_LABEL.background]: t('dock.background'),
      [DOCK_LABEL.object]: t('dock.object'),
      [`panel.${BACKGROUND_PANEL}`]: t('panel.background'),
      [`panel.${OBJECT_PANEL}`]: t('panel.object'),
    },
  });
}
