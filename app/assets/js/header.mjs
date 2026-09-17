import { LOGO_URL } from "./assets.mjs";
import { createElement } from "./dom.mjs";

// Relative to the module, including when the site is hosted under a subdirectory.
const SITE_URL = new URL("../../schülerlabore/", import.meta.url);
const PAGES = [
    { file: "home.html", text: "Schülerlabore" },
    { file: "info.html", text: "Infos" },
    { file: "kontakt.html", text: "Kontakt" },
];

export function createHeader() {
    const HEADER = createElement("header");
    const LOGO_CONTAINER = createElement("div", "header-logo-container");
    const LOGO_LINK = createElement("a");
    LOGO_LINK.href = new URL("home.html", SITE_URL).href;

    const LOGO = createElement("img", "header-logo");
    LOGO.src = LOGO_URL;
    LOGO.alt = "Hochschule Düsseldorf – Schülerlabore";
    LOGO_LINK.appendChild(LOGO);
    LOGO_CONTAINER.appendChild(LOGO_LINK);

    const NAVIGATION = createElement("nav", "page-navigation");
    NAVIGATION.setAttribute("aria-label", "Hauptnavigation");
    PAGES.forEach(({ file, text }) => {
        const LINK = createElement("a");
        LINK.href = new URL(file, SITE_URL).href;
        LINK.textContent = text;
        NAVIGATION.appendChild(LINK);
    });

    HEADER.append(LOGO_CONTAINER, NAVIGATION);
    return HEADER;
}
