// Resolve shared assets from this module so pages can live at different URL depths.
export const PLACEHOLDER_URL = new URL("../images/placeholder.jpg", import.meta.url).href;
