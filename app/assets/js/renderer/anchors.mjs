// Escape IDs reversibly so arbitrary imported identifiers cannot collide or break fragments.
export function encodeAnchor(id) {
    return String(id).replace(/[^A-Za-z0-9-]/gu, (ch) =>
        ch === "_" ? "__" : `_${ch.codePointAt(0).toString(16)}_`,
    );
}

/** Fixed kinds use their kind name; custom sections get a prefix that no kind name has. */
export function sectionAnchor(section) {
    return section.kind === "custom" ? `custom-${encodeAnchor(section.id)}` : section.kind;
}
