import { PLACEHOLDER_URL } from "../../../../assets/js/assets.mjs";
import { createSectionTitle } from "../../../../assets/js/dom.mjs";

export function createInstructions(id, title) {
    //
    // Setting up the Instructions section
    //
    const INSTRUCTIONS = document.createElement("section");
    INSTRUCTIONS.id = id;
    INSTRUCTIONS.appendChild(createSectionTitle(title));

    //
    // Instructions introduction text and image
    //
    insertIntroduction(INSTRUCTIONS);

    //
    // Instructions big banner
    //
    insertBigBanner(INSTRUCTIONS);

    //
    // Instruction tables
    //
    insertTables(INSTRUCTIONS);

    return INSTRUCTIONS;
}

function insertIntroduction(instructions) {
    //
    // introduction container
    const CONTAINER = document.createElement("div");
    CONTAINER.id = "instructions-introduction";
    instructions.appendChild(CONTAINER);

    insertIntroductionText(CONTAINER);
    insertIntroductionImage(CONTAINER);
}

function insertIntroductionText(introduction) {
    //
    // text container
    const CONTAINER = document.createElement("div");
    CONTAINER.id = "instructions-intro-text";
    introduction.appendChild(CONTAINER);

    //
    // title
    const TITLE = document.createElement("span");
    TITLE.id = "instructions-intro-title";
    TITLE.textContent = "Workshop-Anleitung";
    CONTAINER.appendChild(TITLE);
    //
    // text
    const TEXT = document.createElement("span");
    TEXT.id = "instructions-intro-description";
    TEXT.contentEditable = true;
    TEXT.textContent = "Hier erfährst du die wichtigsten Informationen zu dem Workshop";
    CONTAINER.appendChild(TEXT);
}

function insertIntroductionImage(introduction) {
    //
    // image container
    const CONTAINER = document.createElement("div");
    CONTAINER.id = "instructions-intro-image";
    introduction.appendChild(CONTAINER);

    //
    // image
    const IMAGE = document.createElement("img");
    IMAGE.id = "instructions-intro-img";
    IMAGE.src = PLACEHOLDER_URL;
    CONTAINER.appendChild(IMAGE);

    //
    // image can be changed by the user
    const INPUT = document.createElement("input");
    INPUT.type = "file";
    INPUT.accept = "image/*";
    INPUT.id = "instructions-intro-image-input";
    INPUT.classList.add("remove-on-export");
    INPUT.addEventListener("change", () => {
        IMAGE.src = URL.createObjectURL(INPUT.files[0]);
    });
    CONTAINER.appendChild(INPUT);
}

function insertBigBanner(instructions) {
    //
    // banner container
    const CONTAINER = document.createElement("div");
    CONTAINER.id = "instructions-banner";
    instructions.appendChild(CONTAINER);
    //
    // banner image
    const IMAGE = document.createElement("img");
    IMAGE.id = "instructions-banner-img";
    IMAGE.src = PLACEHOLDER_URL;
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

function insertTables(instructions) {
    //
    // tables wrapper
    const WRAPPER = document.createElement("div");
    WRAPPER.id = "instructions-tables-wrapper";
    instructions.appendChild(WRAPPER);
    //
    // tables container
    const TABLES_CONTAINER = document.createElement("div");
    TABLES_CONTAINER.classList.add("instructions-tables");
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
    WRAPPER.classList.add("instructions-table");
    tablesContainer.appendChild(WRAPPER);
    //
    // upper container (phase title)
    const UPPER = document.createElement("div");
    UPPER.classList.add("instructions-table-upper");
    WRAPPER.appendChild(UPPER);

    const PHASE_TITLE = document.createElement("span");
    PHASE_TITLE.classList.add("instructions-table-phase");
    PHASE_TITLE.contentEditable = true;
    PHASE_TITLE.textContent = "Phase 1: Vorbereitung";
    UPPER.appendChild(PHASE_TITLE);
    //
    // lower container (3 columns)
    const LOWER = document.createElement("div");
    LOWER.classList.add("instructions-table-lower");
    WRAPPER.appendChild(LOWER);

    const columns = [
        { class: "instructions-table-col-left", placeholder: "Intro\n\n10min" },
        {
            class: "instructions-table-col-middle",
            placeholder: "Beschreibung .....................",
        },
        { class: "instructions-table-col-right", placeholder: "Methode:\n\nOnline-Glossar" },
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
