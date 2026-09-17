import { createSectionTitle } from "../../../../assets/js/dom.mjs";
import { createSubsectionTitle } from "../../../../assets/js/dom.mjs";

/**
 *
 * Assigned IDs: [id]
 *
 * @param {sting} id
 * @param {string} title
 * @returns {DOM}
 */
export function createTeachers(id, title) {
    //
    // Setting up the Teachers section
    //
    const TEACHERS = document.createElement("section");
    TEACHERS.id = id;

    const TITLE = createSectionTitle(title);
    TEACHERS.appendChild(TITLE);

    //
    // Title, quote and quick facts
    //
    insertOverview(TEACHERS);

    //
    // Learning content
    TEACHERS.appendChild(createSubsectionTitle("Lerninhalt"));
    insertLearningContent(TEACHERS);

    //
    // Additional skills
    TEACHERS.appendChild(createSubsectionTitle("Weiterführende Kompetenzen"));
    insertAdditionalSkills(TEACHERS);

    //
    // Curriculum alignment
    TEACHERS.appendChild(createSubsectionTitle("Lehrplanbezug"));
    insertCurriculumAlignment(TEACHERS);

    return TEACHERS;
}

function insertOverview(teachers) {
    //
    // overview container
    const CONTAINER = document.createElement("div");
    CONTAINER.id = "teachers-overview";
    teachers.appendChild(CONTAINER);
    //
    // overview text container
    const TEXT_CONTAINER = document.createElement("div");
    TEXT_CONTAINER.id = "teachers-intro";
    CONTAINER.appendChild(TEXT_CONTAINER);
    insertTitleAndQuote(TEXT_CONTAINER);
    //
    // quick facts container
    const QUICK_FACTS_CONTAINER = document.createElement("div");
    QUICK_FACTS_CONTAINER.id = "teachers-quick-facts";
    CONTAINER.appendChild(QUICK_FACTS_CONTAINER);
    insertQuickFacts(QUICK_FACTS_CONTAINER);
}

function insertTitleAndQuote(overviewContainer) {
    //
    // oerview tile
    const TITLE = document.createElement("span");
    TITLE.id = "teachers-intro-title";
    TITLE.textContent = "Für Lehrende";
    overviewContainer.appendChild(TITLE);

    //
    // overview quote
    const QUOTE = document.createElement("span");
    QUOTE.id = "teachers-intro-quote";
    QUOTE.contentEditable = true;
    QUOTE.textContent =
        '"A computer is like air conditioning – it becomes useless when you open Windows" ~Linus Torvalds';
    overviewContainer.appendChild(QUOTE);
}

/**
 *
 * Assigned IDs: teachers-quick-facts-title
 *
 * Assigned Classes: teachers-quick-facts-item, teachers-quick-facts-label,
 *                   teachers-quick-facts-value
 *
 * @param {DOM} quickFactsContainer
 */
function insertQuickFacts(quickFactsContainer) {
    //
    // Quick Facts title
    const QUICK_FACTS_TITLE = document.createElement("span");
    QUICK_FACTS_TITLE.id = "teachers-quick-facts-title";
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
        FACT_ITEM.classList.add("teachers-quick-facts-item");

        //
        // fact label
        const FACT_LABEL = document.createElement("span");
        FACT_LABEL.classList.add("teachers-quick-facts-label");
        FACT_LABEL.textContent = label;
        FACT_ITEM.appendChild(FACT_LABEL);

        //
        // fact value
        const FACT_VALUE = document.createElement("span");
        FACT_VALUE.classList.add("teachers-quick-facts-value");
        FACT_VALUE.textContent = value;
        FACT_VALUE.contentEditable = true;
        FACT_ITEM.appendChild(FACT_VALUE);

        quickFactsContainer.appendChild(FACT_ITEM);
    });
}

/**
 *
 * Assigned IDs: teachers-learning-content, learning-content-title,
 *               learning-content-text
 *
 * @param {DOM} teachers
 */
function insertLearningContent(teachers) {
    //
    // Learning content container
    const CONTAINER = document.createElement("div");
    CONTAINER.id = "teachers-learning-content";
    teachers.appendChild(CONTAINER);

    //
    // Learning content text
    const TEXT = document.createElement("span");
    TEXT.id = "learning-content-text";
    TEXT.contentEditable = true;
    TEXT.textContent = "In diesem Schülerlabor lernen Schüler . . .";
    CONTAINER.appendChild(TEXT);
}

/**
 *
 * Assigned IDs: teachers-additional-skills, teachers-additional-skills-title,
 *               teachers-additional-skills-text
 *
 * @param {DOM} teachers
 */
function insertAdditionalSkills(teachers) {
    //
    // Additional skills container
    const CONTAINER = document.createElement("div");
    CONTAINER.id = "teachers-additional-skills";
    teachers.appendChild(CONTAINER);

    //
    // Additional skills text
    const TEXT = document.createElement("span");
    TEXT.id = "teachers-additional-skills-text";
    TEXT.contentEditable = true;
    TEXT.textContent = "Kollaborative Problemlösung, . . .";
    CONTAINER.appendChild(TEXT);
}

/**
 *
 * Assigned IDs: teachers-curriculum-alignment, curriculum-alignment-title",
 *               curriculum-alignment-text
 *
 * @param {DOM} teachers
 */
function insertCurriculumAlignment(teachers) {
    //
    // Curriculum alignment container
    const CONTAINER = document.createElement("div");
    CONTAINER.id = "teachers-curriculum-alignment";
    teachers.appendChild(CONTAINER);

    //
    // Curriculum alignment text
    const TEXT = document.createElement("span");
    TEXT.id = "curriculum-alignment-text";
    TEXT.contentEditable = true;
    TEXT.textContent = "Für den Unterricht in allen Schulformen, in NRW, mit dem Inhalt . . .";
    CONTAINER.appendChild(TEXT);
}
