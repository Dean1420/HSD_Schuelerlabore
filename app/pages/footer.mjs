import { createElement } from "../assets/js/dom.mjs";

const SITE_URL = new URL("../", import.meta.url);

export function createFooter() {
    const footer = createElement("footer");
    footer.className = "site-footer";
    const inner = createElement("div");
    inner.className = "site-footer__inner grid";

    const mark = createElement("a");
    mark.className = "site-footer__mark";
    mark.href = new URL("index.html", SITE_URL).href;
    mark.setAttribute("aria-label", "Hochschule Düsseldorf, zur Startseite");
    const acronym = createElement("span");
    acronym.className = "hsd-mark__acronym hsd-caps";
    acronym.textContent = "HSD";
    mark.appendChild(acronym);

    const about = createElement("p");
    about.className = "site-footer__about";
    about.textContent = "Schülerlabore der Hochschule Düsseldorf";

    const links = createElement("nav");
    links.className = "site-footer__links";
    links.setAttribute("aria-label", "Rechtliches");
    const contact = createElement("a");
    contact.href = new URL("contact.html", SITE_URL).href;
    contact.textContent = "Kontakt & Impressum";
    links.appendChild(contact);

    inner.append(mark, about, links);
    footer.appendChild(inner);
    return footer;
}
