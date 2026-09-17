import { PLACEHOLDER_URL } from "../../../../assets/js/assets.mjs";
import { createSectionTitle } from "../../../../assets/js/dom.mjs";
import { createSubsectionTitle } from "../../../../assets/js/dom.mjs";

export function createContributors(id, title) {
    //
    // Setting up the Contributors section
    //
    const CONTRIBUTORS = document.createElement("section");
    CONTRIBUTORS.id = id;
    CONTRIBUTORS.appendChild(createSectionTitle(title));
    //
    // Contributors content
    //
    insertContributors(CONTRIBUTORS);

    return CONTRIBUTORS;
}

function insertContributors(contributors) {
    //
    // content container
    const CONTAINER = document.createElement("div");
    CONTAINER.id = "contributors-container";
    contributors.appendChild(CONTAINER);

    //
    // content wrapper for the person cards
    const CONTENT = document.createElement("div");
    CONTENT.id = "contributors-content";
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
    WRAPPER.classList.add("contributors-card");
    content.appendChild(WRAPPER);

    //
    // image
    const IMAGE = document.createElement("img");
    IMAGE.classList.add("contributors-img");
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
    // name
    const NAME = document.createElement("span");
    NAME.classList.add("contributors-name");
    NAME.contentEditable = true;
    NAME.textContent = "Name";
    WRAPPER.appendChild(NAME);

    //
    // description
    const DESCRIPTION = document.createElement("span");
    DESCRIPTION.classList.add("contributors-description");
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
