import { PLACEHOLDER_URL } from "../../../../assets/js/assets.mjs";
import { createSectionTitle } from "../../../../assets/js/dom.mjs";
import { createSubsectionTitle } from "../../../../assets/js/dom.mjs";

export function createImpressions(id, title) {
    const IMPRESSIONS = document.createElement("section");
    IMPRESSIONS.id = id;

    const TITLE = createSectionTitle(title);
    IMPRESSIONS.appendChild(TITLE);

    //
    // Workshop highlights
    //
    IMPRESSIONS.appendChild(createSubsectionTitle("Eindrücke zum Workshop"));
    insertHighlights(IMPRESSIONS);

    //
    // Image gallery
    //
    IMPRESSIONS.appendChild(createSubsectionTitle("Bildergallerie"));
    insertImageGallery(IMPRESSIONS);

    return IMPRESSIONS;
}

function insertHighlights(impressions) {
    //
    // highlights container
    const CONTAINER = document.createElement("div");
    CONTAINER.id = "highlights-container";
    impressions.appendChild(CONTAINER);

    //
    // content container for the items
    const CONTENT = document.createElement("div");
    CONTENT.id = "highlights-content";
    CONTAINER.appendChild(CONTENT);

    //
    // buttons to add items with different column widths
    const BUTTONS = document.createElement("div");
    BUTTONS.id = "highlights-buttons";
    BUTTONS.classList.add("remove-on-export");
    CONTAINER.appendChild(BUTTONS);

    const sizes = [
        { label: "1/3 Breite hinzufügen", cls: "highlight-col-1" },
        { label: "2/3 Breite hinzufügen", cls: "highlight-col-2" },
        { label: "Volle Breite hinzufügen", cls: "highlight-col-3" },
    ];

    sizes.forEach(({ label, cls }) => {
        const BTN = document.createElement("button");
        BTN.textContent = label;
        BTN.classList.add("remove-on-export");
        BTN.addEventListener("click", () => insertHighlightItem(CONTENT, cls));
        BUTTONS.appendChild(BTN);
    });
}

function insertHighlightItem(highlightsContent, colClass) {
    //
    // item wrapper
    const WRAPPER = document.createElement("div");
    WRAPPER.classList.add("highlight-item", colClass);
    highlightsContent.appendChild(WRAPPER);

    //
    // image
    const IMAGE = document.createElement("img");
    IMAGE.classList.add("highlight-img");
    IMAGE.src = PLACEHOLDER_URL;
    WRAPPER.appendChild(IMAGE);

    //
    // image upload input
    const INPUT = document.createElement("input");
    INPUT.type = "file";
    INPUT.accept = "image/*";
    INPUT.classList.add("remove-on-export");
    INPUT.addEventListener("change", () => {
        IMAGE.src = URL.createObjectURL(INPUT.files[0]);
    });
    WRAPPER.appendChild(INPUT);

    //
    // text below image
    const TEXT = document.createElement("span");
    TEXT.classList.add("highlight-text");
    TEXT.contentEditable = true;
    TEXT.textContent = "Beschreibung...";
    WRAPPER.appendChild(TEXT);

    //
    // delete button
    const DELETE = document.createElement("button");
    DELETE.textContent = "X";
    DELETE.classList.add("remove-on-export");
    DELETE.addEventListener("click", () => WRAPPER.remove());
    WRAPPER.appendChild(DELETE);
}

function insertImageGallery(impressions) {
    //
    // image-gallery container
    const CONTAINER = document.createElement("div");
    CONTAINER.id = "image-gallery-container";
    impressions.appendChild(CONTAINER);

    //
    // content container for the items
    const CONTENT = document.createElement("div");
    CONTENT.id = "image-gallery-content";
    CONTAINER.appendChild(CONTENT);

    //
    // buttons to add images with different column widths
    const BUTTONS = document.createElement("div");
    BUTTONS.id = "image-gallery-buttons";
    BUTTONS.classList.add("remove-on-export");
    CONTAINER.appendChild(BUTTONS);

    const sizes = [
        { label: "1/3 Breite hinzufügen", cls: "gallery-col-1" },
        { label: "2/3 Breite hinzufügen", cls: "gallery-col-2" },
        { label: "Volle Breite hinzufügen", cls: "gallery-col-3" },
    ];

    sizes.forEach(({ label, cls }) => {
        const BTN = document.createElement("button");
        BTN.textContent = label;
        BTN.classList.add("remove-on-export");
        BTN.addEventListener("click", () => insertGalleryItem(CONTENT, cls));
        BUTTONS.appendChild(BTN);
    });
}

function insertGalleryItem(content, colClass) {
    //
    // item wrapper
    const WRAPPER = document.createElement("div");
    WRAPPER.classList.add("gallery-item", colClass);
    content.appendChild(WRAPPER);
    //
    // image
    const IMAGE = document.createElement("img");
    IMAGE.classList.add("gallery-img");
    IMAGE.src = PLACEHOLDER_URL;
    WRAPPER.appendChild(IMAGE);
    //
    // image upload input
    const INPUT = document.createElement("input");
    INPUT.type = "file";
    INPUT.accept = "image/*";
    INPUT.classList.add("remove-on-export");
    INPUT.addEventListener("change", () => {
        IMAGE.src = URL.createObjectURL(INPUT.files[0]);
    });
    WRAPPER.appendChild(INPUT);
    //
    // delete button
    const DELETE = document.createElement("button");
    DELETE.textContent = "X";
    DELETE.classList.add("remove-on-export");
    DELETE.addEventListener("click", () => WRAPPER.remove());
    WRAPPER.appendChild(DELETE);
}
