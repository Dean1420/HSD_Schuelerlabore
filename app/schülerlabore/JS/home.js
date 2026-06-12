import { createHeader } from "./header.mjs";

//
// =================================================
//

const BODY = document.body;

const HEADER = createHeader();
BODY.appendChild(HEADER);

createMain().then(MAIN => BODY.appendChild(MAIN));

//TODO generate footer

//
// =================================================
//



function createElement(tag, id) {
    const ELEMENT = document.createElement(tag);
    if (id) ELEMENT.id = id;
    return ELEMENT;
}



async function createMain() {
    const MAIN = document.createElement("main");
    const CONTENT = await createSchülerlaboreContent();
    MAIN.appendChild(CONTENT);
    return MAIN;
}

async function createSchülerlaboreContent() {
    const CONTENT = createElement("div", "schülerlabore-content");
    insertBanner(CONTENT);
    insertDescription(CONTENT);
    const KURSANGEBOT_CONTENT = insertKursangebot(CONTENT);
    const workshops = await loadWorkshops();
    console.log(workshops);
    fillKursangebot(workshops, KURSANGEBOT_CONTENT);
    return CONTENT;
}

function insertBanner(parent) {
    const SECTION = createElement("section", "schülerlabore-banner");
    const IMAGE = createElement("img", "schülerlabore-banner-img");
    IMAGE.src = "IMAGES/placeholder.jpg";
    SECTION.appendChild(IMAGE);
    parent.appendChild(SECTION);
}

function insertDescription(parent) {
    const SECTION = createElement("section", "schülerlabore-description");
    parent.appendChild(SECTION);

    const TEXT_WRAPPER = createElement("div", "schülerlabore-description-text");
    const TEXT = createElement("span", "schülerlabore-description-text-content");
    TEXT.textContent = "Beschreibungstext...";
    TEXT_WRAPPER.appendChild(TEXT);
    SECTION.appendChild(TEXT_WRAPPER);

    const BOTTOM = createElement("div", "schülerlabore-description-bottom");
    SECTION.appendChild(BOTTOM);

    const LEFT = createElement("div", "schülerlabore-description-left");
    const LINK = createElement("a", "schülerlabore-description-link");
    const LINK_IMAGE = createElement("img", "schülerlabore-description-link-img");
    LINK_IMAGE.src = "IMAGES/placeholder.jpg";
    LINK.appendChild(LINK_IMAGE);
    LEFT.appendChild(LINK);
    BOTTOM.appendChild(LEFT);

    const RIGHT = createElement("div", "schülerlabore-description-right");
    const PREV = createElement("button", "schülerlabore-description-prev");
    PREV.textContent = "▲";
    PREV.addEventListener("click", () => { });
    const QUOTE = createElement("span", "schülerlabore-description-quote");
    QUOTE.textContent = "Zitat...";
    const NEXT = createElement("button", "schülerlabore-description-next");
    NEXT.textContent = "▼";
    NEXT.addEventListener("click", () => { });
    RIGHT.append(PREV, QUOTE, NEXT);
    BOTTOM.appendChild(RIGHT);
}

function insertKursangebot(parent) {
    const SECTION = createElement("section", "schülerlabore-kursangebot");
    parent.appendChild(SECTION);
    const LEFT = createElement("div", "schülerlabore-kursangebot-left");
    const TITLE = createElement("span", "schülerlabore-kursangebot-title");
    TITLE.textContent = "Kursangebot";
    const DESC = createElement("span", "schülerlabore-kursangebot-description");
    DESC.textContent = "Beschreibung...";
    LEFT.append(TITLE, DESC);
    SECTION.appendChild(LEFT);
    const RIGHT = createElement("div", "schülerlabore-kursangebot-right");
    const KURSANGEBOT_CONTENT = createElement("div", "schülerlabore-kursangebot-content"); // CHANGED: stored in variable
    RIGHT.append(
        createElement("div", "schülerlabore-kursangebot-filter"),
        KURSANGEBOT_CONTENT
    );
    SECTION.appendChild(RIGHT);
    return KURSANGEBOT_CONTENT;
}



function getWorkshopPaths(name) {
    const BASE = `./WORKSHOPS/${name}`;
    return {
        name,
        workshopPath: `${BASE}/Workshop.html`,
        thumbnail: `${BASE}/thumbnail.jpg`,
        searchTags: `${BASE}/seachTags.json`,
        thumbnailText: `${BASE}/thumbnailText.json`
    };
}

async function loadWorkshops() {
    //
    // load the list of workshop names from the index
    const names = await fetch("./workshops.json").then(response => response.json());

    //
    // for each name, build the paths and fetch the tags and text in parallel
    return Promise.all(names.map(async (name) => {
        const WORKSHOP = getWorkshopPaths(name);

        //
        // fetch tags and text simultaneously
        const [searchTags, thumbnailText] = await Promise.all([
            fetch(WORKSHOP.searchTags).then(response => response.json()),
            fetch(WORKSHOP.thumbnailText).then(response => response.json())
        ]);

        //
        // return the workshop object with all data merged in
        return { ...WORKSHOP, searchTags, thumbnailText };
    }));
}

function fillKursangebot(workshops, content) {
    workshops.forEach(workshop => {
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