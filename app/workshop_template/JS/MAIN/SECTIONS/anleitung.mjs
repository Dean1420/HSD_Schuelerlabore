import { createSectionTitle } from "./HELPER_FUNCTIONS/shared_dom_elements.mjs";

export function createAnleitung(id, title) {
    //
    // Setting up the Anleitung section
    //
    const ANLEITUNG = document.createElement("section");
    ANLEITUNG.id = id;
    ANLEITUNG.appendChild(createSectionTitle(title));

    //
    // Anleitung introduction text and image
    //
    insertIntroduction(ANLEITUNG);

    //
    // Anleitung big banner
    //
    insertBigBanner(ANLEITUNG);

    //
    // Instruction tables
    //
    insertTables(ANLEITUNG);

    return ANLEITUNG;
}



function insertIntroduction(anleitung) {
    //
    // introduction container
    const CONTAINER = document.createElement("div");
    CONTAINER.id = "anleitung-introduction";
    anleitung.appendChild(CONTAINER);

    insertIntroductionText(CONTAINER);
    insertIntroductionImage(CONTAINER);
}



function insertIntroductionText(introduction) {
    //
    // text container
    const CONTAINER = document.createElement("div");
    CONTAINER.id = "anleitung-intro-text";
    introduction.appendChild(CONTAINER);

    //
    // title
    const TITLE = document.createElement("span");
    TITLE.id = "anleitung-intro-title";
    TITLE.textContent = "Workshop-Anleitung";
    CONTAINER.appendChild(TITLE);
    //
    // text
    const TEXT = document.createElement("span");
    TEXT.id = "anleitung-intro-description";
    TEXT.contentEditable = true;
    TEXT.textContent = "Hier erfährst du die wichtigsten Informationen zu dem Workshop";
    CONTAINER.appendChild(TEXT);
}



function insertIntroductionImage(introduction) {
    //
    // image container
    const CONTAINER = document.createElement("div");
    CONTAINER.id = "anleitung-intro-image";
    introduction.appendChild(CONTAINER);

    //
    // image
    const IMAGE = document.createElement("img");
    IMAGE.id = "anleitung-intro-img";
    IMAGE.src = "IMAGES/placeholder.jpg";
    CONTAINER.appendChild(IMAGE);

    //
    // image can be changed by the user
    const INPUT = document.createElement("input");
    INPUT.type = "file";
    INPUT.accept = "image/*";
    INPUT.id = "anleitung-intro-image-input";
    INPUT.classList.add("remove-on-export");
    INPUT.addEventListener("change", () => {
        IMAGE.src = URL.createObjectURL(INPUT.files[0]);
    });
    CONTAINER.appendChild(INPUT);
}

function insertBigBanner(anleitung) {
    //
    // banner container
    const CONTAINER = document.createElement("div");
    CONTAINER.id = "anleitung-banner";
    anleitung.appendChild(CONTAINER);
    //
    // banner image
    const IMAGE = document.createElement("img");
    IMAGE.id = "anleitung-banner-img";
    IMAGE.src = "IMAGES/placeholder.jpg";
    CONTAINER.appendChild(IMAGE);
    //
    // image can be changed by the user
    const INPUT = document.createElement("input");
    INPUT.type = "file";
    INPUT.accept = "image/*";
    INPUT.classList.add("remove-on-export");
    INPUT.addEventListener("change", () => {
        IMAGE.src = URL.createObjectURL(INPUT.files[0]);
    });
    CONTAINER.appendChild(INPUT);
}



function insertTables(anleitung) {
    //
    // tables wrapper
    const WRAPPER = document.createElement("div");
    WRAPPER.id = "anleitung-tables-wrapper";
    anleitung.appendChild(WRAPPER);
    //
    // tables container
    const TABLES_CONTAINER = document.createElement("div");
    TABLES_CONTAINER.classList.add("anleitung-tables");
    WRAPPER.appendChild(TABLES_CONTAINER);
    //
    // insert one default table
    insertTable(TABLES_CONTAINER);
    //
    // button to add more tables
    const ADD_BUTTON = document.createElement("button");
    ADD_BUTTON.textContent = "Tabelle hinzufügen";
    ADD_BUTTON.classList.add("remove-on-export");
    ADD_BUTTON.addEventListener("click", () => insertTable(TABLES_CONTAINER));
    WRAPPER.appendChild(ADD_BUTTON);
}

function insertTable(tablesContainer) {
    //
    // wrapper container
    const WRAPPER = document.createElement("div");
    WRAPPER.classList.add("anleitung-table");
    tablesContainer.appendChild(WRAPPER);
    //
    // upper container (phase title)
    const UPPER = document.createElement("div");
    UPPER.classList.add("anleitung-table-upper");
    WRAPPER.appendChild(UPPER);

    const PHASE_TITLE = document.createElement("span");
    PHASE_TITLE.classList.add("anleitung-table-phase");
    PHASE_TITLE.contentEditable = true;
    PHASE_TITLE.textContent = "Phase 1: Vorbereitung";
    UPPER.appendChild(PHASE_TITLE);
    //
    // lower container (3 columns)
    const LOWER = document.createElement("div");
    LOWER.classList.add("anleitung-table-lower");
    WRAPPER.appendChild(LOWER);

    const columns = [
        { class: "anleitung-table-col-left", placeholder: "Intro\n\n10min" },
        { class: "anleitung-table-col-middle", placeholder: "Beschreibung ....................." },
        { class: "anleitung-table-col-right", placeholder: "Methode:\n\nOnline-Glossar" },
    ];

    columns.forEach(({ class: cls, placeholder }) => {
        const COL = document.createElement("span");
        COL.classList.add(cls);
        COL.contentEditable = true;
        COL.textContent = placeholder;
        LOWER.appendChild(COL);
    });
    //
    // delete button
    const DELETE_BUTTON = document.createElement("button");
    DELETE_BUTTON.textContent = "X";
    DELETE_BUTTON.classList.add("remove-on-export");
    DELETE_BUTTON.addEventListener("click", () => WRAPPER.remove());
    WRAPPER.appendChild(DELETE_BUTTON);
}