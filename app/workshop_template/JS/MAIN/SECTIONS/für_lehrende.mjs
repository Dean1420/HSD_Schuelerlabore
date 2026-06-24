import { createSectionTitle } from "./HELPER_FUNCTIONS/shared_dom_elements.mjs";
import { createSubsectionTitle } from "./HELPER_FUNCTIONS/shared_dom_elements.mjs";

/**
 * 
 * Assigned IDs: [id] 
 * 
 * @param {sting} id 
 * @param {string} title 
 * @returns {DOM}
 */
export function createFürLehrende(id, title) {
    //
    // Setting up the Für Lehrende section
    //
    const FÜR_LEHRENDE = document.createElement("section");
    FÜR_LEHRENDE.id = id;

    const TITLE = createSectionTitle(title);
    FÜR_LEHRENDE.appendChild(TITLE);



    //
    // Titel, Zitat und Quick Facts
    //
    insertOverview(FÜR_LEHRENDE);

    //
    // Lerninhalt
    FÜR_LEHRENDE.appendChild(createSubsectionTitle("Lerninhalt"));
    insertLerninhalt(FÜR_LEHRENDE);

    //
    // Weiterführende Kompetenzen
    FÜR_LEHRENDE.appendChild(createSubsectionTitle("Weiterführende Kompetenzen"));
    insertWeiterführendeKompetenzen(FÜR_LEHRENDE);

    //
    // Lehrplanbezug
    FÜR_LEHRENDE.appendChild(createSubsectionTitle("Lehrplanbezug"));
    insertLehrplanbezug(FÜR_LEHRENDE);


    return FÜR_LEHRENDE;
}



function insertOverview(fürLehrende) {
    //
    // overview container
    const CONTAINER = document.createElement("div");
    CONTAINER.id = "lehrende-overview";
    fürLehrende.appendChild(CONTAINER);
    //
    // overview text container
    const TEXT_CONTAINER = document.createElement("div");
    TEXT_CONTAINER.id = "lehrende-intro";
    CONTAINER.appendChild(TEXT_CONTAINER);
    insertTitleAndQuote(TEXT_CONTAINER);
    //
    // quick facts container
    const QUICK_FACTS_CONTAINER = document.createElement("div");
    QUICK_FACTS_CONTAINER.id = "lehrende-quick-facts";
    CONTAINER.appendChild(QUICK_FACTS_CONTAINER);
    insertQuickFacts(QUICK_FACTS_CONTAINER);
}





function insertTitleAndQuote(overviewContainer) {
    //
    // oerview tile
    const TITLE = document.createElement("span");
    TITLE.id = "lehrende-intro-title";
    TITLE.textContent = "Für Lehrende";
    overviewContainer.appendChild(TITLE);

    //
    // overview quote
    const QUOTE = document.createElement("span");
    QUOTE.id = "lehrende-intro-quote";
    QUOTE.contentEditable = true;
    QUOTE.textContent = '"A computer is like air conditioning – it becomes useless when you open Windows" ~Linus Torvalds';
    overviewContainer.appendChild(QUOTE);
}


/**
 * 
 * Assigned IDs: lehrende-quick-facts-title
 * 
 * Assigned Classes: lehrende-quick-facts-item, lehrende-quick-facts-label,
 *                   lehrende-quick-facts-value
 * 
 * @param {DOM} quickFactsContainer 
 */
function insertQuickFacts(quickFactsContainer) {
    //
    // Quick Facts title
    const QUICK_FACTS_TITLE = document.createElement("span");
    QUICK_FACTS_TITLE.id = "lehrende-quick-facts-title";
    QUICK_FACTS_TITLE.textContent = "Quick Facts";
    quickFactsContainer.appendChild(QUICK_FACTS_TITLE);

    const facts = [
        { label: "Klassenstufen", value: "5 - 10" },
        { label: "Schulform", value: "Gymnasium, Gesamtschule" },
        { label: "Technische Vorraussetzungen", value: "Excel, Windows, Elektrik" },
    ];

    facts.forEach(({ label, value }) => {
        //
        // fact item wrapper
        const FACT_ITEM = document.createElement("div");
        FACT_ITEM.classList.add("lehrende-quick-facts-item");
       
        //
        // fact label
        const FACT_LABEL = document.createElement("span");
        FACT_LABEL.classList.add("lehrende-quick-facts-label");
        FACT_LABEL.textContent = label;
        FACT_ITEM.appendChild(FACT_LABEL);
        
        //
        // fact value
        const FACT_VALUE = document.createElement("span");
        FACT_VALUE.classList.add("lehrende-quick-facts-value");
        FACT_VALUE.textContent = value;
        FACT_VALUE.contentEditable = true;
        FACT_ITEM.appendChild(FACT_VALUE);

        quickFactsContainer.appendChild(FACT_ITEM);
    });
}


/**
 * 
 * Assigned IDs: lehrende-lerninhalt, lerninhalt-title,
 *               lerninhalt-text
 * 
 * @param {DOM} fürLehrende 
 */
function insertLerninhalt(fürLehrende) {
    //
    // Lerninhalt container
    const CONTAINER = document.createElement("div");
    CONTAINER.id = "lehrende-lerninhalt";
    fürLehrende.appendChild(CONTAINER);

    //
    // Lerninhalt text
    const TEXT = document.createElement("span");
    TEXT.id = "lerninhalt-text";
    TEXT.contentEditable = true;
    TEXT.textContent = "In diesem Schülerlabor lernen Schüler . . .";
    CONTAINER.appendChild(TEXT);
}



/**
 * 
 * Assigned IDs: lehrende-kompetenzen, lehrende-kompetenzen-title,
 *               lehrende-kompetenzen-text
 * 
 * @param {DOM} fürLehrende 
 */
function insertWeiterführendeKompetenzen(fürLehrende) {
    //
    // Weiterführende Kompetenzen container
    const CONTAINER = document.createElement("div");
    CONTAINER.id = "lehrende-kompetenzen";
    fürLehrende.appendChild(CONTAINER);

    //
    // Weiterführende Kompetenzen text
    const TEXT = document.createElement("span");
    TEXT.id = "lehrende-kompetenzen-text";
    TEXT.contentEditable = true;
    TEXT.textContent = "Kollaborative Problemlösung, . . .";
    CONTAINER.appendChild(TEXT);
}



/**
 * 
 * Assigned IDs: lehrende-lehrplanbezug, lehrplanbezug-title",
 *               lehrplanbezug-text
 * 
 * @param {DOM} fürLehrende 
 */
function insertLehrplanbezug(fürLehrende) {
    //
    // Lehrplanbezug container
    const CONTAINER = document.createElement("div");
    CONTAINER.id = "lehrende-lehrplanbezug";
    fürLehrende.appendChild(CONTAINER);

    //
    // Lehrplanbezug text
    const TEXT = document.createElement("span");
    TEXT.id = "lehrplanbezug-text";
    TEXT.contentEditable = true;
    TEXT.textContent = "Für den Unterricht in allen Schulformen, in NRW, mit dem Inhalt . . .";
    CONTAINER.appendChild(TEXT);
}