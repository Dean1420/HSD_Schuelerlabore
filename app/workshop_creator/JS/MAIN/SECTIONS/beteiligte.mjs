import { createSectionTitle } from "./HELPER_FUNCTIONS/shared_dom_elements.mjs";
import { createSubsectionTitle } from "./HELPER_FUNCTIONS/shared_dom_elements.mjs";

export function createBeteiligte(id, title) {
    //
    // Setting up the Beteiligte section
    //
    const BETEILIGTE = document.createElement("section");
    BETEILIGTE.id = id;
    BETEILIGTE.appendChild(createSectionTitle(title));
    //
    // Beteiligte content
    //
    insertBeteiligte(BETEILIGTE);

    return BETEILIGTE;
}

function insertBeteiligte(beteiligte) {
    //
    // content container
    const CONTAINER = document.createElement("div");
    CONTAINER.id = "beteiligte-container";
    beteiligte.appendChild(CONTAINER);

    //
    // content wrapper for the person cards
    const CONTENT = document.createElement("div");
    CONTENT.id = "beteiligte-content";
    CONTAINER.appendChild(CONTENT);

    //
    // button to add a person card
    const ADD_BUTTON = document.createElement("button");
    ADD_BUTTON.textContent = "Person hinzufügen";
    ADD_BUTTON.classList.add("remove-on-export");
    ADD_BUTTON.addEventListener("click", () => insertPersonCard(CONTENT));
    CONTAINER.appendChild(ADD_BUTTON);

    //
    // insert one default card
    insertPersonCard(CONTENT);
}

function insertPersonCard(content) {
    //
    // card wrapper
    const WRAPPER = document.createElement("div");
    WRAPPER.classList.add("beteiligte-card");
    content.appendChild(WRAPPER);

    //
    // image
    const IMAGE = document.createElement("img");
    IMAGE.classList.add("beteiligte-img");
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
    // name
    const NAME = document.createElement("span");
    NAME.classList.add("beteiligte-name");
    NAME.contentEditable = true;
    NAME.textContent = "Name";
    WRAPPER.appendChild(NAME);

    //
    // description
    const DESCRIPTION = document.createElement("span");
    DESCRIPTION.classList.add("beteiligte-description");
    DESCRIPTION.contentEditable = true;
    DESCRIPTION.textContent = "Kontakt & Beschreibung";
    WRAPPER.appendChild(DESCRIPTION);

    //
    // delete button
    const DELETE = document.createElement("button");
    DELETE.textContent = "X";
    DELETE.classList.add("remove-on-export");
    DELETE.addEventListener("click", () => WRAPPER.remove());
    WRAPPER.appendChild(DELETE);
}