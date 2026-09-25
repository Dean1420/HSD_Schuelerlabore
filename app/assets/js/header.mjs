import { createElement } from "./dom.mjs";

const SITE_URL = new URL("../../", import.meta.url);
const PAGES = [
    { file: "index.html", text: "Schülerlabore" },
    { file: "info.html", text: "Infos" },
    { file: "contact.html", text: "Kontakt" },
];

// The workshop contents bar dispatches this event to open the header menu.
export const OPEN_CONTENTS_EVENT = "workshop:open-contents";
const SECTION_LINKS = "#workshop-navigation-link-container a";

export function createHeader() {
    const header = createElement("header");
    header.className = "site-header";
    const inner = createElement("div");
    inner.className = "site-header__inner grid";

    const menu = createMenu();
    const menuButton = createElement("button");
    menuButton.type = "button";
    menuButton.className = "site-header__menu-button";
    menuButton.textContent = "Menü";
    menuButton.setAttribute("aria-haspopup", "dialog");
    menuButton.addEventListener("click", () => menu.open("pages"));

    inner.append(createHomeLink(), createNavigation("site-nav"), menuButton);
    header.append(inner, menu.dialog);

    document.addEventListener(OPEN_CONTENTS_EVENT, () => menu.open("sections"));
    return header;
}

// "HSD" in HSD Sans renders the logo glyph.
function createMark() {
    const mark = createElement("span");
    mark.className = "hsd-mark";
    const byline = createElement("span");
    byline.className = "hsd-mark__byline";
    const german = createElement("strong");
    german.textContent = "Hochschule Düsseldorf";
    const english = createElement("span");
    english.textContent = "University of Applied Sciences";
    byline.append(german, english);
    const acronym = createElement("span");
    acronym.className = "hsd-mark__acronym hsd-caps";
    acronym.textContent = "HSD";
    mark.append(byline, acronym);
    return mark;
}

function createHomeLink() {
    const link = createElement("a");
    link.className = "site-header__home";
    link.href = new URL("index.html", SITE_URL).href;
    link.setAttribute("aria-label", "Hochschule Düsseldorf, Schülerlabore, zur Startseite");
    link.appendChild(createMark());
    return link;
}

function createNavigation(className) {
    const nav = createElement("nav");
    nav.className = className;
    nav.setAttribute("aria-label", "Hauptnavigation");
    const current = currentPage();
    PAGES.forEach(({ file, text }) => {
        const link = createElement("a");
        link.href = new URL(file, SITE_URL).href;
        link.textContent = text;
        if (file === current.file)
            link.setAttribute("aria-current", current.exact ? "page" : "true");
        nav.appendChild(link);
    });
    return nav;
}

/** Workshop pages belong to "Schülerlabore" without being that page. */
function currentPage() {
    const path = location.pathname;
    const name = path.endsWith("/") ? "index.html" : path.slice(path.lastIndexOf("/") + 1);
    const site = SITE_URL.pathname;
    const atRoot = path.startsWith(site) && !path.slice(site.length).includes("/");
    const exact = atRoot ? PAGES.find(({ file }) => file === name) : undefined;
    if (exact) return { file: exact.file, exact: true };
    const inWorkshops = path.includes("/workshops/") || name === "preview.html";
    return inWorkshops ? { file: "index.html", exact: false } : { file: null, exact: false };
}

function createMenu() {
    const dialog = createElement("dialog", "site-menu");
    dialog.className = "site-menu";
    dialog.setAttribute("aria-label", "Menü");

    const bar = createElement("div");
    bar.className = "site-menu__bar";
    const acronym = createElement("span");
    acronym.className = "hsd-mark__acronym hsd-caps";
    acronym.textContent = "HSD";
    acronym.setAttribute("aria-hidden", "true");
    const close = createElement("button");
    close.type = "button";
    close.className = "site-header__menu-button";
    close.textContent = "Schließen";
    close.addEventListener("click", () => dialog.close());
    bar.append(acronym, close);

    const body = createElement("div");
    body.className = "site-menu__body";
    dialog.append(bar, body);

    dialog.addEventListener("click", (event) => {
        if (event.target.closest?.("a")) dialog.close();
    });

    function open(first) {
        const groups = [pagesGroup(), sectionsGroup()].filter(Boolean);
        if (first === "sections") groups.reverse();
        groups.forEach((group, index) =>
            group.classList.toggle("site-menu__group--lead", index === 0),
        );
        body.replaceChildren(...groups);
        if (typeof dialog.showModal === "function") dialog.showModal();
        else dialog.setAttribute("open", "");
    }

    return { dialog, open };
}

function group(label, className) {
    const section = createElement("section");
    section.className = `site-menu__group ${className}`;
    const heading = createElement("h2");
    heading.className = "site-menu__label";
    heading.textContent = label;
    section.appendChild(heading);
    return section;
}

function pagesGroup() {
    const section = group("Seiten", "site-menu__group--pages");
    section.appendChild(createNavigation("site-menu__pages"));
    return section;
}

function sectionsGroup() {
    const links = [...document.querySelectorAll(SECTION_LINKS)];
    if (!links.length) return null;
    const title = document.querySelector("#overview-workshop-name")?.textContent?.trim();
    const section = group(title ? `Inhalt · ${title}` : "Inhalt", "site-menu__group--sections");
    const nav = createElement("nav");
    nav.className = "site-menu__sections";
    nav.setAttribute("aria-label", "Workshop-Abschnitte");
    links.forEach((source) => {
        const link = createElement("a");
        link.href = source.getAttribute("href");
        if (source.classList.contains("active")) link.setAttribute("aria-current", "true");
        const number = createElement("span");
        number.className = "site-menu__number";
        number.textContent = source.querySelector(".workshop-navigation-number")?.textContent ?? "";
        const text = createElement("span");
        text.textContent = source.querySelector(".navigation-text")?.textContent ?? "";
        link.append(number, text);
        nav.appendChild(link);
    });
    section.appendChild(nav);
    return section;
}
