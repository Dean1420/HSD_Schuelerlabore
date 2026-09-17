import { createHeader } from "../assets/js/header.mjs";
import { createElement } from "../assets/js/dom.mjs";
import { PLACEHOLDER_URL } from "../assets/js/assets.mjs";

//
// =================================================
//

const BODY = document.body;

const HEADER = createHeader();
BODY.appendChild(HEADER);

const MAIN = createMain();
BODY.appendChild(MAIN);

//TODO generate footer

//
// =================================================
//

function createMain() {
    const MAIN = document.createElement("main");
    MAIN.appendChild(createHomeContent());
    return MAIN;
}

/**
 * Builds the static parts of the page synchronously so they paint immediately,
 * then fills the workshop catalog once the workshop data has been fetched.
 */
function createHomeContent() {
    const CONTENT = createElement("div", "home-content");
    insertBanner(CONTENT);
    insertDescription(CONTENT);
    const WORKSHOP_CATALOG_CONTENT = insertWorkshopCatalog(CONTENT);
    loadWorkshopCatalog(WORKSHOP_CATALOG_CONTENT);
    return CONTENT;
}

async function loadWorkshopCatalog(content) {
    try {
        const workshops = await loadWorkshops();
        fillWorkshopCatalog(workshops, content);
    } catch (error) {
        console.error("Could not load workshop catalog:", error);
        showWorkshopCatalogMessage(content, "Das Kursangebot konnte nicht geladen werden.");
    }
}

function showWorkshopCatalogMessage(content, text) {
    const MESSAGE = createElement("p");
    MESSAGE.classList.add("workshop-message");
    MESSAGE.textContent = text;
    content.appendChild(MESSAGE);
}

function insertBanner(parent) {
    const SECTION = createElement("section", "home-banner");
    const IMAGE = createElement("img", "home-banner-img");
    IMAGE.src = PLACEHOLDER_URL;
    SECTION.appendChild(IMAGE);
    parent.appendChild(SECTION);
}

function insertDescription(parent) {
    const SECTION = createElement("section", "home-description");
    parent.appendChild(SECTION);

    const TEXT_WRAPPER = createElement("div", "home-description-text");
    const TEXT = createElement("span", "home-description-text-content");
    TEXT.textContent = "Beschreibungstext...";
    TEXT_WRAPPER.appendChild(TEXT);
    SECTION.appendChild(TEXT_WRAPPER);

    const BOTTOM = createElement("div", "home-description-bottom");
    SECTION.appendChild(BOTTOM);

    const LEFT = createElement("div", "home-description-left");
    const LINK = createElement("a", "home-description-link");
    const LINK_IMAGE = createElement("img", "home-description-link-img");
    LINK_IMAGE.src = PLACEHOLDER_URL;
    LINK.appendChild(LINK_IMAGE);
    LEFT.appendChild(LINK);
    BOTTOM.appendChild(LEFT);

    const RIGHT = createElement("div", "home-description-right");
    const PREV = createElement("button", "home-description-prev");
    PREV.textContent = "▲";
    PREV.addEventListener("click", () => {});
    const QUOTE = createElement("span", "home-description-quote");
    QUOTE.textContent = "Zitat...";
    const NEXT = createElement("button", "home-description-next");
    NEXT.textContent = "▼";
    NEXT.addEventListener("click", () => {});
    RIGHT.append(PREV, QUOTE, NEXT);
    BOTTOM.appendChild(RIGHT);
}

function insertWorkshopCatalog(parent) {
    const SECTION = createElement("section", "home-workshop-catalog");
    parent.appendChild(SECTION);
    const LEFT = createElement("div", "home-workshop-catalog-left");
    const TITLE = createElement("span", "home-workshop-catalog-title");
    TITLE.textContent = "Kursangebot";
    const DESC = createElement("span", "home-workshop-catalog-description");
    DESC.textContent = "Beschreibung...";
    LEFT.append(TITLE, DESC);
    SECTION.appendChild(LEFT);
    const RIGHT = createElement("div", "home-workshop-catalog-right");
    const WORKSHOP_CATALOG_CONTENT = createElement("div", "home-workshop-catalog-content"); // CHANGED: stored in variable
    RIGHT.append(createElement("div", "home-workshop-catalog-filter"), WORKSHOP_CATALOG_CONTENT);
    SECTION.appendChild(RIGHT);
    return WORKSHOP_CATALOG_CONTENT;
}

function getWorkshopPaths(name) {
    const BASE = `./workshops/${encodeURIComponent(name)}`;
    return {
        name,
        workshopPath: `${BASE}/Workshop.html`,
        thumbnail: `${BASE}/thumbnail.jpg`,
        searchTags: `${BASE}/seachTags.json`,
        thumbnailText: `${BASE}/thumbnailText.json`,
    };
}

/**
 * fetch() only rejects on network failure, so a 404 has to be turned into an error here;
 * otherwise response.json() throws on the HTML error page and hides the real cause.
 */
async function fetchJson(url) {
    const response = await fetch(url);
    if (!response.ok) throw new Error(`${url}: HTTP ${response.status}`);
    return response.json();
}

async function loadWorkshops() {
    //
    // load the list of workshop names from the index
    const names = await fetchJson("./workshops.json");

    //
    // load every workshop independently: a broken or missing folder costs one card, not the page
    const results = await Promise.allSettled(names.map(loadWorkshop));
    results
        .filter((result) => result.status === "rejected")
        .forEach((result) => console.warn("Workshop skipped:", result.reason.message));
    return results.filter((result) => result.status === "fulfilled").map((result) => result.value);
}

async function loadWorkshop(name) {
    const WORKSHOP = getWorkshopPaths(name);

    //
    // fetch tags and text simultaneously
    const [searchTags, thumbnailText] = await Promise.all([
        fetchJson(WORKSHOP.searchTags),
        fetchJson(WORKSHOP.thumbnailText),
    ]);

    //
    // return the workshop object with all data merged in
    return { ...WORKSHOP, searchTags, thumbnailText };
}

function fillWorkshopCatalog(workshops, content) {
    if (workshops.length === 0) {
        showWorkshopCatalogMessage(content, "Zurzeit sind keine Workshops eingetragen.");
        return;
    }
    workshops.forEach((workshop) => {
        const CARD = createElement("div");
        CARD.classList.add("workshop-card");
        const LINK = createElement("a");
        LINK.href = workshop.workshopPath;
        const IMG = createElement("img");
        IMG.src = workshop.thumbnail;
        IMG.classList.add("workshop-thumbnail");
        LINK.appendChild(IMG);
        const TEXT = createElement("span");
        TEXT.textContent = workshop.thumbnailText.content;
        TEXT.classList.add("workshop-text");
        CARD.append(LINK, TEXT);
        content.appendChild(CARD);
    });
}
