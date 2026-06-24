import { createSectionTitle } from "./HELPER_FUNCTIONS/shared_dom_elements.mjs";
import { createSubsectionTitle } from "./HELPER_FUNCTIONS/shared_dom_elements.mjs";

export function createImpressionen(id, title) {
    const IMPRESSIONEN = document.createElement("section");
    IMPRESSIONEN.id = id;

    const TITLE = createSectionTitle(title);
    IMPRESSIONEN.appendChild(TITLE);



    //
    // Eindrücke zum Workshop
    //
    IMPRESSIONEN.appendChild(createSubsectionTitle("Eindrücke zum Workshop"));
    insertEindrücke(IMPRESSIONEN);


    //
    // Bildergallerie
    //
    IMPRESSIONEN.appendChild(createSubsectionTitle("Bildergallerie"));
    insertBildergalerie(IMPRESSIONEN);



    return IMPRESSIONEN;
}

function insertEindrücke(impressionen) {
    //
    // eindrücke container
    const CONTAINER = document.createElement("div");
    CONTAINER.id = "eindrücke-container";
    impressionen.appendChild(CONTAINER);

    //
    // content container for the items
    const CONTENT = document.createElement("div");
    CONTENT.id = "eindrücke-content";
    CONTAINER.appendChild(CONTENT);

    //
    // buttons to add items with different column widths
    const BUTTONS = document.createElement("div");
    BUTTONS.id = "eindrücke-buttons";
    BUTTONS.classList.add("remove-on-export");
    CONTAINER.appendChild(BUTTONS);

    const sizes = [
        { label: "1/3 Breite hinzufügen", cls: "eindrück-col-1" },
        { label: "2/3 Breite hinzufügen", cls: "eindrück-col-2" },
        { label: "Volle Breite hinzufügen", cls: "eindrück-col-3" },
    ];

    sizes.forEach(({ label, cls }) => {
        const BTN = document.createElement("button");
        BTN.textContent = label;
        BTN.classList.add("remove-on-export");
        BTN.addEventListener("click", () => insertEindruckItem(CONTENT, cls));
        BUTTONS.appendChild(BTN);
    });
}

function insertEindruckItem(eindrückeContent, colClass) {
    //
    // item wrapper
    const WRAPPER = document.createElement("div");
    WRAPPER.classList.add("eindrück-item", colClass);
    eindrückeContent.appendChild(WRAPPER);

    //
    // image
    const IMAGE = document.createElement("img");
    IMAGE.classList.add("eindrück-img");
    IMAGE.src = "IMAGES/placeholder.jpg";
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
    TEXT.classList.add("eindrück-text");
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

function insertBildergalerie(impressionen) {
    //
    // bildergalerie container
    const CONTAINER = document.createElement("div");
    CONTAINER.id = "bildergalerie-container";
    impressionen.appendChild(CONTAINER);

    //
    // content container for the items
    const CONTENT = document.createElement("div");
    CONTENT.id = "bildergalerie-content";
    CONTAINER.appendChild(CONTENT);

    //
    // buttons to add images with different column widths
    const BUTTONS = document.createElement("div");
    BUTTONS.id = "bildergalerie-buttons";
    BUTTONS.classList.add("remove-on-export");
    CONTAINER.appendChild(BUTTONS);

    const sizes = [
        { label: "1/3 Breite hinzufügen", cls: "galerie-col-1" },
        { label: "2/3 Breite hinzufügen", cls: "galerie-col-2" },
        { label: "Volle Breite hinzufügen", cls: "galerie-col-3" },
    ];

    sizes.forEach(({ label, cls }) => {
        const BTN = document.createElement("button");
        BTN.textContent = label;
        BTN.classList.add("remove-on-export");
        BTN.addEventListener("click", () => insertGalerieItem(CONTENT, cls));
        BUTTONS.appendChild(BTN);
    });
}

function insertGalerieItem(content, colClass) {
    //
    // item wrapper
    const WRAPPER = document.createElement("div");
    WRAPPER.classList.add("galerie-item", colClass);
    content.appendChild(WRAPPER);
    //
    // image
    const IMAGE = document.createElement("img");
    IMAGE.classList.add("galerie-img");
    IMAGE.src = "IMAGES/placeholder.jpg";
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