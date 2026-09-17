import { createSectionTitle } from "../../../../assets/js/dom.mjs";
import { createSubsectionTitle } from "../../../../assets/js/dom.mjs";

export function createMaterials(id, title) {
    //
    // Setting up the Materials section
    //
    const MATERIALS = document.createElement("section");
    MATERIALS.id = id;
    MATERIALS.appendChild(createSectionTitle(title));
    //
    // Materials and Resources
    //
    insertMaterialSubsection(MATERIALS, "Materialien", "materials-list");
    insertMaterialSubsection(MATERIALS, "Ressourcen", "resources-list");

    return MATERIALS;
}

function insertMaterialSubsection(materials, title, id) {
    //
    // subsection title
    materials.appendChild(createSubsectionTitle(title));

    //
    // list container
    const CONTAINER = document.createElement("div");
    CONTAINER.id = id;
    materials.appendChild(CONTAINER);

    //
    // content container
    const CONTENT = document.createElement("div");
    CONTENT.id = id + "-content";
    CONTAINER.appendChild(CONTENT);

    insertAddMaterialContentButton(CONTENT);
}

function insertAddMaterialContentButton(contentContainer) {
    //
    // container for buttons
    const BUTTONS_CONTAINER = document.createElement("div");
    BUTTONS_CONTAINER.classList.add("add-material-content-buttons-container");
    BUTTONS_CONTAINER.classList.add("remove-on-export");

    contentContainer.appendChild(BUTTONS_CONTAINER);

    //
    // button for adding link elements
    const ADD_LINK_BUTTON = document.createElement("button");
    ADD_LINK_BUTTON.textContent = "Link hinzufügen";
    ADD_LINK_BUTTON.classList.add("remove-on-export");
    ADD_LINK_BUTTON.classList.add("add-material-link-button");

    ADD_LINK_BUTTON.addEventListener("click", () =>
        insertLinkItem(contentContainer, BUTTONS_CONTAINER),
    );

    BUTTONS_CONTAINER.appendChild(ADD_LINK_BUTTON);

    //
    // button for adding file elements
    const ADD_FILE_BUTTON = document.createElement("button");
    ADD_FILE_BUTTON.textContent = "Datei hinzufügen";
    ADD_FILE_BUTTON.classList.add("remove-on-export");
    ADD_LINK_BUTTON.classList.add("add-material-file-button");

    ADD_FILE_BUTTON.addEventListener("click", () =>
        insertFileItem(contentContainer, BUTTONS_CONTAINER),
    );

    BUTTONS_CONTAINER.appendChild(ADD_FILE_BUTTON);
}

function insertLinkItem(contentContainer, buttonsContainer) {
    //
    // link container
    const CONTAINER = document.createElement("div");
    CONTAINER.classList.add("material-link-container");

    contentContainer.insertBefore(CONTAINER, buttonsContainer);

    //
    // setting up link
    const LINK = document.createElement("a");
    LINK.textContent = "Link";
    LINK.target = "_blank";
    LINK.contentEditable = true;
    CONTAINER.appendChild(LINK);

    //
    // input for changing link
    const INPUT = document.createElement("input");
    INPUT.type = "text";
    INPUT.placeholder = "URL eingeben";
    INPUT.classList.add("remove-on-export");
    INPUT.addEventListener("input", () => (LINK.href = INPUT.value));
    CONTAINER.appendChild(INPUT);

    const DELETE_BUTTON = document.createElement("button");
    DELETE_BUTTON.textContent = "X";
    DELETE_BUTTON.classList.add("remove-on-export");
    DELETE_BUTTON.classList.add("delete-material-content");
    CONTAINER.appendChild(DELETE_BUTTON);

    DELETE_BUTTON.addEventListener("click", () => CONTAINER.remove());
}

function insertFileItem(contentContainer, buttonsContainer) {
    //
    // file container
    const CONTAINER = document.createElement("div");
    CONTAINER.classList.add("material-file-container");
    contentContainer.insertBefore(CONTAINER, buttonsContainer);

    //
    // setting up file download link
    const LINK = document.createElement("a");
    LINK.textContent = "Datei";
    LINK.contentEditable = true;
    CONTAINER.appendChild(LINK);

    //
    // input for uploading file that will be downloadable
    const FILE_INPUT = document.createElement("input");
    FILE_INPUT.type = "file";
    FILE_INPUT.classList.add("remove-on-export");
    FILE_INPUT.addEventListener("change", () => {
        LINK.href = URL.createObjectURL(FILE_INPUT.files[0]);
        LINK.download = FILE_INPUT.files[0].name;
        LINK.textContent = FILE_INPUT.files[0].name;
    });
    CONTAINER.appendChild(FILE_INPUT);

    const DELETE_BUTTON = document.createElement("button");
    DELETE_BUTTON.textContent = "X";
    DELETE_BUTTON.classList.add("remove-on-export");
    DELETE_BUTTON.classList.add("delete-material-content");
    DELETE_BUTTON.addEventListener("click", () => CONTAINER.remove());

    CONTAINER.appendChild(DELETE_BUTTON);
}
