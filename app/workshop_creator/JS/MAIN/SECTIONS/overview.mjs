import { PLACEHOLDER_URL } from "../../../../assets/js/assets.mjs";
import { createSectionTitle } from "../../../../assets/js/dom.mjs";
import { createSubsectionTitle } from "../../../../assets/js/dom.mjs";

export function createOverview(id, title) {
    //
    // Setting up Overview section
    //
    const OVERVIEW = document.createElement("section");
    OVERVIEW.id = id;
    const TITLE = createSectionTitle(title);
    OVERVIEW.appendChild(TITLE);
    //
    // Introduction image, title, slogan and link
    //
    insertImpression(OVERVIEW);
    //
    // Vision and description
    //
    OVERVIEW.appendChild(createSubsectionTitle("Vision und Beschreibung"));
    insertDescription(OVERVIEW);
    //
    // Quick facts
    //
    OVERVIEW.appendChild(createSubsectionTitle("Rahmenbedingungen"));
    insertQuickFacts(OVERVIEW);

    return OVERVIEW;
}

function insertImpression(parentContainer) {
    //
    // impression container
    const CONTAINER = document.createElement("div");
    CONTAINER.id = "overview-impression";
    parentContainer.appendChild(CONTAINER);
    insertImpressionImage(CONTAINER);
    insertImpressionText(CONTAINER);
}

function insertDescription(parentContainer) {
    //
    // description container
    const CONTAINER = document.createElement("div");
    CONTAINER.id = "overview-description";
    parentContainer.appendChild(CONTAINER);
    insertDescriptionVision(CONTAINER);
    insertDescriptionSummary(CONTAINER);
}

function insertQuickFacts(parentContainer) {
    //
    // quick facts container
    const CONTAINER = document.createElement("div");
    CONTAINER.id = "overview-quick-facts";
    parentContainer.appendChild(CONTAINER);
    insertQuickFactsLeft(CONTAINER);
    insertQuickFactsRight(CONTAINER);
}

function insertQuickFactsLeft(overviewQuickFacts) {
    const CONTAINER = document.createElement("div");
    CONTAINER.id = "overview-facts-left";
    overviewQuickFacts.appendChild(CONTAINER);

    CONTAINER.appendChild(
        createFactItem("overview-location", "Durchführungsort", "....................."),
    );
    CONTAINER.appendChild(
        createFactItem("overview-group-size", "Gruppengröße", "....................."),
    );
}

function insertQuickFactsRight(overviewQuickFacts) {
    const CONTAINER = document.createElement("div");
    CONTAINER.id = "overview-facts-right";
    overviewQuickFacts.appendChild(CONTAINER);

    CONTAINER.appendChild(
        createFactItem("overview-topics", "Themen des Workshops", "....................."),
    );
    CONTAINER.appendChild(
        createFactItem(
            "overview-prerequisites",
            "Fachliche Voraussetzungen",
            ".....................",
        ),
    );
    CONTAINER.appendChild(
        createFactItem("overview-duration", "Workshop - Dauer", "....................."),
    );
}

function insertDescriptionVision(overviewDescription) {
    //
    // setting up the vision container
    const VISION_CONTAINER = document.createElement("div");
    VISION_CONTAINER.id = "overview-vision";
    overviewDescription.appendChild(VISION_CONTAINER);

    //
    // short sentence conveying the message of the workshop.
    // the vision text is editable.
    const VISION_TEXT = document.createElement("span");
    VISION_TEXT.contentEditable = true;
    VISION_TEXT.id = "overview-vision-text";
    VISION_TEXT.textContent = "Mein Wunsch ist es, dass jeder lernt, wie wichtig Freiheit ist!";

    VISION_CONTAINER.appendChild(VISION_TEXT);
}

function insertDescriptionSummary(overviewDescription) {
    //
    // setting up the description container
    const DESCRIPTION_CONTAINER = document.createElement("div");
    DESCRIPTION_CONTAINER.id = "overview-summary";
    overviewDescription.appendChild(DESCRIPTION_CONTAINER);

    //
    // description of the purpose of the workshop and its goals, and how it tries to achieve them.
    // the vision text is editable.
    const DESCRIPTION_TEXT = document.createElement("span");
    DESCRIPTION_TEXT.contentEditable = true;
    DESCRIPTION_TEXT.id = "overview-summary-text";
    DESCRIPTION_TEXT.textContent =
        "Freiheit ist nicht alles, aber ohne Freiheit ist man nicht. Ohne Freiheit kann man nicht träumen. Freiheit fängt aber schon bei der eigenen Einstellung und Perspektive auf die Welt an.";

    DESCRIPTION_CONTAINER.appendChild(DESCRIPTION_TEXT);
}

function insertImpressionText(overviewImpression) {
    //
    // seetting up the impression text container
    const TEXT_CONTAINER = document.createElement("div");
    TEXT_CONTAINER.id = "overview-intro";
    overviewImpression.appendChild(TEXT_CONTAINER);

    //
    // name of the workshop
    const WORKSHOP_NAME = document.createElement("span");
    WORKSHOP_NAME.contentEditable = true;
    WORKSHOP_NAME.id = "overview-workshop-name";
    WORKSHOP_NAME.textContent = "Titel des Workshops";
    TEXT_CONTAINER.appendChild(WORKSHOP_NAME);

    //
    // catchy slogan for the workshop
    const WORKSHOP_SLOGAN = document.createElement("span");
    WORKSHOP_SLOGAN.contentEditable = true;
    WORKSHOP_SLOGAN.id = "overview-workshop-slogan";
    WORKSHOP_SLOGAN.textContent = "Motto/Slogan des Workshops";
    TEXT_CONTAINER.appendChild(WORKSHOP_SLOGAN);

    //
    // linking to more information on another web page
    //
    // the linked address can be edited by the user
    const LINK_INPUT = document.createElement("input");
    LINK_INPUT.placeholder = "Link-URL";
    LINK_INPUT.id = "overview-url-input";
    LINK_INPUT.classList.add("remove-on-export");
    TEXT_CONTAINER.appendChild(LINK_INPUT);

    const LINK = document.createElement("a");
    LINK.textContent = "Weitere Informationen";
    TEXT_CONTAINER.appendChild(LINK);

    LINK_INPUT.addEventListener("input", () => {
        LINK.href = LINK_INPUT.value;
    });
}

function insertImpressionImage(overviewContent) {
    // image banner for the first visual impression of the student workshop
    const IMG_CONTAINER = document.createElement("div");
    IMG_CONTAINER.id = "overview-image";

    const IMAGE = document.createElement("img");
    IMAGE.id = "overview-img";
    IMAGE.src = PLACEHOLDER_URL;
    IMG_CONTAINER.appendChild(IMAGE);

    overviewContent.appendChild(IMG_CONTAINER);

    //
    // the image can be changed by the user
    const INPUT = document.createElement("input");
    INPUT.type = "file";
    INPUT.accept = "image/*";
    INPUT.id = "overview-image-input";
    INPUT.classList.add("remove-on-export");
    IMG_CONTAINER.appendChild(INPUT);

    INPUT.addEventListener("change", () => {
        IMAGE.src = URL.createObjectURL(INPUT.files[0]);
    });
}

function createFactItem(id, title, defaultText) {
    //
    // fact item container
    const CONTAINER = document.createElement("div");
    CONTAINER.id = id;
    //
    // fact title
    const TITLE = document.createElement("span");
    TITLE.classList.add("overview-quick-fact-title");
    TITLE.textContent = title;
    CONTAINER.appendChild(TITLE);
    //
    // fact text
    const TEXT = document.createElement("span");
    TEXT.classList.add("overview-quick-fact-text");
    TEXT.contentEditable = true;
    TEXT.textContent = defaultText;
    CONTAINER.appendChild(TEXT);

    return CONTAINER;
}
