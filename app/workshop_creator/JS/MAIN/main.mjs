import { createÜbersicht } from "./SECTIONS/übersicht.mjs";
import { createAnleitung } from "./SECTIONS/anleitung.mjs";
import { createMaterialien } from "./SECTIONS/materialien.mjs";
import { createFürLehrende } from "./SECTIONS/für_lehrende.mjs";
import { createImpressionen } from "./SECTIONS/impressionen.mjs";
import { createBeteiligte } from "./SECTIONS/beteiligte.mjs";

/**
 *  Creates and returns the main section of the page
 * 
 *  Following IDs exist within the Header: workshop-navigation-column, workshop-content
 * 
 * @returns DOM-Object
 */
export function createMain() {
    const MAIN = document.createElement("main");

    const WORKSHOP_NAVIGATION_AREA = createWorkshopNavigationContainer();
    MAIN.appendChild(WORKSHOP_NAVIGATION_AREA);

    const WORKSHOP_CONTENT = createWorkshopContent(WORKSHOP_NAVIGATION_AREA);
    MAIN.appendChild(WORKSHOP_CONTENT);

    return MAIN;
}


/**
 * Creates a container which will be used in the layout to create the navigation
 * sidebar, for navigating fast to each section of the workshop page
 * @returns DOM
 */
function createWorkshopNavigationContainer() {
    const WORKSHOP_NAVIGATION_AREA = document.createElement("aside");
    WORKSHOP_NAVIGATION_AREA.id = "workshop-navigation-area";

    return WORKSHOP_NAVIGATION_AREA;
}


/**
 * Creates an navigation link, for jumping across the workshop-sections.
 * The created links are inserted into provided navigationContainer.
 * There are titleNumber and titleText to make the css choices made for them easier.
 * 
 * @param {DOM} navigationContainer 
 * @param {string} sectionID
 * @param {string} titleNumber 
 * @param {string} titleText 
 */
function addToWorkshopNavigation(navigationContainer, sectionID, titleNumber, titleText) {
    const LINK = document.createElement("a");
    LINK.href = `#${sectionID}`;
    LINK.innerHTML = `<span class="workshop-navigation-number">${titleNumber}</span>
                    <span class="navigation-text">${titleText}</span>`;
    navigationContainer.appendChild(LINK);

}


function createWorkshopContent(workshopNavigationArea) {
    //
    // container for the content
    const WORKSHOP_CONTENT = document.createElement("div");
    WORKSHOP_CONTENT.id = "workshop-content";
    //
    // navigation link container
    const NAVIGATION_LINK_CONTAINER = document.createElement("nav");
    NAVIGATION_LINK_CONTAINER.id = "workshop-navigation-link-container";
    workshopNavigationArea.appendChild(NAVIGATION_LINK_CONTAINER);

    insertEditorControls(WORKSHOP_CONTENT);

    addSection(WORKSHOP_CONTENT, NAVIGATION_LINK_CONTAINER, "übersicht", "01", "Übersicht", createÜbersicht);
    addSection(WORKSHOP_CONTENT, NAVIGATION_LINK_CONTAINER, "anleitung", "02", "Anleitung", createAnleitung);
    addSection(WORKSHOP_CONTENT, NAVIGATION_LINK_CONTAINER, "materialien", "03", "Materialien", createMaterialien);
    addSection(WORKSHOP_CONTENT, NAVIGATION_LINK_CONTAINER, "für-lehrende", "04", "Für Lehrende", createFürLehrende);
    addSection(WORKSHOP_CONTENT, NAVIGATION_LINK_CONTAINER, "impressionen", "05", "Impressionen", createImpressionen);
    addSection(WORKSHOP_CONTENT, NAVIGATION_LINK_CONTAINER, "beteiligte", "06", "Beteiligte", createBeteiligte);

    setupScrollSpy(WORKSHOP_CONTENT, NAVIGATION_LINK_CONTAINER);

    return WORKSHOP_CONTENT;
}

/**
 * Highlights the navigation link of the section that is currently
 * scrolled into view by adding the "active" class to it.
 *
 * @param {DOM} workshopContent
 * @param {DOM} navigationContainer
 */
function setupScrollSpy(workshopContent, navigationContainer) {
    const SECTIONS = Array.from(workshopContent.querySelectorAll(":scope > section"));
    const LINKS = Array.from(navigationContainer.querySelectorAll("a"));

    const OBSERVER = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (!entry.isIntersecting) return;

            const ACTIVE_LINK = LINKS.find(link => link.getAttribute("href") === `#${entry.target.id}`);
            if (!ACTIVE_LINK) return;

            LINKS.forEach(link => link.classList.remove("active"));
            ACTIVE_LINK.classList.add("active");
        });
    }, { rootMargin: "-40% 0px -50% 0px", threshold: 0 });

    SECTIONS.forEach(section => OBSERVER.observe(section));
}

function addSection(workshopContent, navigationContainer, id, number, text, createFn) {
    const TITLE = number + "\t" + text;
    const SECTION = createFn(id, TITLE);
    workshopContent.appendChild(SECTION);
    addToWorkshopNavigation(navigationContainer, id, number, text);
}

function insertEditorControls(workshopContent) {
    //
    // editor controls container
    const CONTAINER = document.createElement("div");
    CONTAINER.id = "editor-controls";
    CONTAINER.classList.add("remove-on-export");
    workshopContent.appendChild(CONTAINER);

    //
    // export button
    const EXPORT_BUTTON = document.createElement("button");
    EXPORT_BUTTON.textContent = "Exportieren";
    EXPORT_BUTTON.addEventListener("click", () => {
        document.querySelectorAll(".remove-on-export").forEach(el => el.remove());
    });

    //
    // make content not editable
    EXPORT_BUTTON.addEventListener("click", () => {
        workshopContent.querySelectorAll("*").forEach(el => {
            el.contentEditable = "false";
        });
    });

    CONTAINER.appendChild(EXPORT_BUTTON);
}