/**
 * The title bar of each section
 * 
 * Assigned Classes: section-title
 * 
 * @param {string} title 
 * @returns {DOM}
 */
export function createSectionTitle(title){
    const SECTION_TITLE = document.createElement("span");
    SECTION_TITLE.classList.add("section-title")
    SECTION_TITLE.innerText = title;

    return SECTION_TITLE;
}



/**
 * The title bar for subsections
 * 
 * Assigned Classes: subsection-title
 * 
 * @param {string} title 
 * @returns {DOM}
 */
export function createSubsectionTitle(title){
    const SUBSECTION_TITLE = document.createElement("span");
    SUBSECTION_TITLE.classList.add("subsection-title")
    SUBSECTION_TITLE.innerText = title;

    return SUBSECTION_TITLE;
}