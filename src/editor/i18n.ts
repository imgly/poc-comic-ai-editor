/**
 * CUSTOMIZATION: texts
 *
 * The texts this PoC adds (panels, canvas menu, start, loading and login screen, error notices),
 * in German and English. The one exception are the default prompts in the two panels. CE.SDK ships its own German translation; `LOCALE` switches both
 * (`customization/translations.ts` passes it to CE.SDK). Set `NEXT_PUBLIC_UI_LOCALE=en` for
 * English. To add a language, add a dictionary here and load CE.SDK's translation for it.
 */
export type Locale = 'de' | 'en';

export const LOCALE: Locale = process.env.NEXT_PUBLIC_UI_LOCALE === 'en' ? 'en' : 'de';

const de = {
  'dock.background': 'Hinter­grund',
  'dock.object': 'Objekt erstellen',
  'panel.background': 'Hintergrund',
  'panel.object': 'Objekt erstellen',

  model: 'Modell',
  'model.loading': 'Modelle werden geladen …',
  'model.unavailable': 'Modelle nicht verfügbar',
  prompt: 'Prompt',
  generate: 'Generieren',
  generating: 'Wird generiert …',
  progress: '{done} von {count}',

  'background.placeholder': 'Beschreibe den Hintergrund, z. B. „Ein lichtdurchflutetes Gewächshaus mit einer ruhigen Pflanzbank, warme Farben, illustrativer Stil“',
  'background.hint': 'Die erste Variante erscheint direkt auf der Seite. Blättere im Menü an der Seite durch die Varianten und übernimm eine.',
  'variant.label': 'Variante {index} von {total}',
  'variant.previous': 'Vorherige Variante',
  'variant.next': 'Nächste Variante',
  'variant.accept': 'Übernehmen',
  'variant.accept.tooltip': 'Diese Variante als Hintergrund übernehmen',

  'area.title': 'Bildbereich',
  'area.empty': 'Leerer Bereich',
  'area.object': 'Objekt',
  'area.none': 'Kein Bildbereich ausgewählt.',
  'area.drag': 'Ziehe auf der Seite den Bereich für das Objekt auf. Er rastet auf ein Seitenverhältnis ein.',
  'area.mark': 'Bildbereich markieren',
  'area.mark.new': 'Neuen Bildbereich markieren',
  'area.mark.cancel': 'Markieren … zum Abbrechen klicken',
  'area.size': 'Größe oder Seitenverhältnis',
  'area.size.custom': 'Frei (wie aufgezogen)',
  'area.size.square': 'Quadrat',
  'area.size.landscape': 'Querformat',
  'area.size.portrait': 'Hochformat',
  'area.overlay': 'Ziehe auf der Seite den Bereich für das Objekt auf. Er rastet auf ein Seitenverhältnis ein.',
  'area.overlay.snapped': 'Eingerastet auf das hervorgehobene Seitenverhältnis',
  'area.block': 'Bildbereich',

  'object.placeholder': 'Beschreibe das Objekt, z. B. „Eine kleine grüne Topfpflanze, passend zum Licht der Szene“',
  'object.noBackground': 'Generiere zuerst einen Hintergrund. Er wird dem Modell als Stilreferenz mitgegeben.',
  'object.noArea': 'Markiere einen Bildbereich auf der Seite, um zu generieren.',
  'object.reference': 'Der Hintergrund der Seite wird als Stilreferenz mitgegeben. Objekte kommen ohne Hintergrund und lassen sich frei verschieben.',
  'object.results': 'Generierte Objekte',
  'object.hint': 'Klicke eine Variante an, um sie im Bildbereich zu platzieren.',
  'object.block': 'Objekt',

  place: 'Objekt platzieren',
  'place.busy': 'Wird platziert …',
  'place.progress.render': 'Objekt platzieren: Szene wird gerendert …',
  'place.progress.generate': 'Objekt platzieren: Die KI passt Licht und Schatten an …',
  'place.progress.compose': 'Objekt platzieren: Hintergrund wird aktualisiert …',
  'place.done': 'Objekt platziert. Es ist jetzt Teil des Hintergrunds.',
  'place.tooltip': 'Rechnet das Objekt in den Hintergrund ein: Die KI passt das Licht an und ergänzt einen Schatten. Danach lässt sich das Objekt nicht mehr auswählen.',

  'start.eyebrow': 'Bildeditor',
  'start.title': 'Platz für deine nächste Idee.',
  'start.subtitle': 'Lege die Arbeitsfläche für dein Bild fest.',
  'start.ratio': 'Seitenverhältnis',
  'start.size': 'Bildgröße',
  'start.size.small': 'Klein',
  'start.size.medium': 'Mittel',
  'start.size.large': 'Groß',
  'start.note': 'Proof of Concept mit dem IMG.LY CE.SDK. Hintergründe und Objekte entstehen live über das IMG.LY AI Gateway.',
  'start.create': 'Arbeitsfläche erstellen',

  'header.restart': 'Neustart',

  'error.license.title': 'CE.SDK-Lizenz fehlt',
  'error.license.text': 'Kopiere .env.example nach .env.local, trage NEXT_PUBLIC_CESDK_LICENSE ein und starte den Server neu.',
  'error.start.title': 'Der Editor konnte nicht gestartet werden',

  'login.title': 'Geschützter Bereich.',
  'login.subtitle': 'Dieser Proof of Concept ist nicht öffentlich. Bitte gib das Passwort ein.',
  'login.password': 'Passwort',
  'login.submit': 'Anmelden',
  'login.checking': 'Wird geprüft …',
  'login.wrong': 'Das Passwort ist nicht korrekt.',
  'login.failed': 'Die Anmeldung ist fehlgeschlagen. Bitte versuche es erneut.',
  'loading.title': 'Arbeitsfläche wird vorbereitet …',
  'page.name': 'Arbeitsfläche',
};

const en: Record<keyof typeof de, string> = {
  'dock.background': 'Back­ground',
  'dock.object': 'Create Object',
  'panel.background': 'Background',
  'panel.object': 'Create Object',

  model: 'Model',
  'model.loading': 'Loading models …',
  'model.unavailable': 'Models unavailable',
  prompt: 'Prompt',
  generate: 'Generate',
  generating: 'Generating …',
  progress: '{done} of {count}',

  'background.placeholder': 'Describe the background, e.g. "A sunlit greenhouse with a calm potting bench, warm colours, illustrative style"',
  'background.hint': 'The first variant appears on the page right away. Step through the variants in the menu at the page and apply one.',
  'variant.label': 'Variant {index} of {total}',
  'variant.previous': 'Previous variant',
  'variant.next': 'Next variant',
  'variant.accept': 'Apply',
  'variant.accept.tooltip': 'Use this variant as the background',

  'area.title': 'Area',
  'area.empty': 'Empty area',
  'area.object': 'Object',
  'area.none': 'No area selected.',
  'area.drag': 'Drag on the page to mark where the object goes. The area snaps to an aspect ratio.',
  'area.mark': 'Mark area',
  'area.mark.new': 'Mark a new area',
  'area.mark.cancel': 'Marking … click to cancel',
  'area.size': 'Size or aspect ratio',
  'area.size.custom': 'Custom (as drawn)',
  'area.size.square': 'Square',
  'area.size.landscape': 'Landscape',
  'area.size.portrait': 'Portrait',
  'area.overlay': 'Drag on the page to mark where the object goes. The area snaps to an aspect ratio.',
  'area.overlay.snapped': 'Snapped to the highlighted aspect ratio',
  'area.block': 'Object area',

  'object.placeholder': 'Describe the object, e.g. "A small green potted plant, matching the light of the scene"',
  'object.noBackground': 'Generate a background first. It is sent to the model as the style reference.',
  'object.noArea': 'Mark an area on the page to enable Generate.',
  'object.reference': 'The page background is sent as the style reference. Objects come without a background, so they can be moved anywhere.',
  'object.results': 'Generated objects',
  'object.hint': 'Click a variant to place it in the area.',
  'object.block': 'Object',

  place: 'Place object',
  'place.busy': 'Placing …',
  'place.progress.render': 'Placing object: rendering the scene …',
  'place.progress.generate': 'Placing object: the AI is adjusting lighting and shadow …',
  'place.progress.compose': 'Placing object: updating the background …',
  'place.done': 'Object placed. It is now part of the background.',
  'place.tooltip': 'Bakes the object into the background: the AI adjusts lighting and adds a shadow. The object can no longer be selected afterwards.',

  'start.eyebrow': 'Image editor',
  'start.title': 'Room for your next idea.',
  'start.subtitle': 'Set the canvas for your image.',
  'start.ratio': 'Aspect ratio',
  'start.size': 'Image size',
  'start.size.small': 'Small',
  'start.size.medium': 'Medium',
  'start.size.large': 'Large',
  'start.note': 'Proof of concept built with IMG.LY CE.SDK. Backgrounds and objects are generated live through the IMG.LY AI Gateway.',
  'start.create': 'Create canvas',

  'header.restart': 'Restart',

  'error.license.title': 'CE.SDK license missing',
  'error.license.text': 'Copy .env.example to .env.local, set NEXT_PUBLIC_CESDK_LICENSE and restart the server.',
  'error.start.title': 'The editor could not start',

  'login.title': 'Protected area.',
  'login.subtitle': 'This proof of concept is not public. Please enter the password.',
  'login.password': 'Password',
  'login.submit': 'Sign in',
  'login.checking': 'Checking …',
  'login.wrong': 'The password is not correct.',
  'login.failed': 'Signing in failed. Please try again.',
  'loading.title': 'Preparing your canvas …',
  'page.name': 'Canvas',
};

export type TextKey = keyof typeof de;

const TEXTS: Record<Locale, Record<TextKey, string>> = { de, en };

/** The text for `key` in the active locale; `{name}` placeholders are filled from `values`. */
export function t(key: TextKey, values: Record<string, string | number> = {}): string {
  return TEXTS[LOCALE][key].replace(/\{(\w+)\}/g, (match, name: string) => (name in values ? String(values[name]) : match));
}
