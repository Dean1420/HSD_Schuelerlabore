/**
 * Encodes an identifier for use in a fragment or DOM id. ASCII letters, digits and hyphens
 * stay; `_` becomes `__`; every other character becomes `_<hex code point>_`. The mapping is
 * reversible, so two different identifiers never share an anchor, and an arbitrary imported
 * identifier (with spaces, `#` or newlines) never breaks the fragment.
 */
export function encodeAnchor(id) {
    return String(id).replace(/[^A-Za-z0-9-]/gu, (ch) =>
        ch === "_" ? "__" : `_${ch.codePointAt(0).toString(16)}_`,
    );
}

/** Fixed kinds use their kind name; custom sections get a prefix that no kind name has. */
export function sectionAnchor(section) {
    return section.kind === "custom" ? `custom-${encodeAnchor(section.id)}` : section.kind;
}
