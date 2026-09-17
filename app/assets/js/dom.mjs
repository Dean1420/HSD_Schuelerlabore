export function createElement(tag, id) {
    const ELEMENT = document.createElement(tag);
    if (id) ELEMENT.id = id;
    return ELEMENT;
}

export function createSectionTitle(title) {
    const TITLE = createElement("span");
    TITLE.classList.add("section-title");
    TITLE.innerText = title;
    return TITLE;
}

export function createSubsectionTitle(title) {
    const TITLE = createElement("span");
    TITLE.classList.add("subsection-title");
    TITLE.innerText = title;
    return TITLE;
}
