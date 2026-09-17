// Resolve shared assets from this module so pages can live at different URL depths.
export const LOGO_URL = new URL("../images/HSD_Logo.svg", import.meta.url).href;
export const PLACEHOLDER_URL = new URL("../images/placeholder.jpg", import.meta.url).href;
