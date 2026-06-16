import BrewlateLayout  from './BrewlateLayout';

export const LAYOUTS = {
  brewlate:  { label: '✦ Cofiswarm', component: BrewlateLayout },
};

/**
 * Registers a custom editor layout into LAYOUTS at runtime.
 * Called by EditorShell on save and by useCustomLayouts on startup.
 */
export function registerCustomLayout(id, label, component) {
  LAYOUTS[id] = { label, component };
}

export const THEMES = {
  dark:      { label: '☾ Dark' },
  light:     { label: '☀ Light' },
  overdrive: { label: '⚡ Overdrive' },
  synthwave: { label: '🌊 Synthwave' },
  cobalt:            { label: '💎 Cobalt' },
  greyscale:         { label: '◈ Greyscale' },
  'cvd-blue-orange':        { label: '⬡ CVD: Protanopia/Deuteranopia' },
  'cvd-teal-charcoal':     { label: '⬡ CVD: Tritanopia' },
  'cvd-amber':              { label: '⬡ CVD: Achromatopsia' },
  'cvd-light-blue-orange':  { label: '⬡ CVD Light: Protanopia/Deuteranopia' },
  'cvd-light-tritanopia':   { label: '⬡ CVD Light: Tritanopia' },
  'cvd-light-amber':        { label: '⬡ CVD Light: Achromatopsia' },
};
