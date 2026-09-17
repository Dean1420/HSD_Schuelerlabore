/**
 * Creates an element through the Document held in the render context, so the same renderer
 * runs in the browser and in tests. Text children become text nodes; nothing is parsed as HTML.
 */
export function createElement(context, tag, attributes = {}, children = []) {
    const node = context.dom.createElement(tag);
    for (const [name, value] of Object.entries(attributes)) {
        if (value === null || value === undefined || value === false) continue;
        if (name === "class") node.className = value;
        else node.setAttribute(name, value === true ? "" : String(value));
    }
    append(node, children);
    return node;
}

/**
 * Appends children, skipping null, undefined, false and empty strings so callers can pass
 * conditionals and empty values. Not appending an empty text node keeps an element `:empty`,
 * which the editor's placeholder styling relies on.
 */
export function append(node, children) {
    node.append(
        ...children.filter(
            (child) => child !== null && child !== undefined && child !== false && child !== "",
        ),
    );
    return node;
}

/**
 * Marks an element as an editable text field in editable mode; a no-op otherwise.
 * `field` names the member relative to the owner (block, subsection, section or the root when
 * `root` is set); `placeholder` is a display hint and never stored.
 */
export function markEditable(
    context,
    node,
    { field, placeholder = "", multiline = false, root = false },
) {
    if (!context.editable) return node;
    node.setAttribute("contenteditable", "plaintext-only");
    node.setAttribute("data-field", field);
    if (placeholder) node.setAttribute("data-placeholder", placeholder);
    if (multiline) node.setAttribute("data-multiline", "");
    if (root) node.setAttribute("data-owner", "root");
    return node;
}

/**
 * Editable mode only: `data-items` marks an array inside a block ("items", "phases[0].steps"),
 * `data-item` one of its entries ("items[2]"). The editor adds its entry controls there.
 */
export function markItems(context, node, path) {
    if (context.editable) node.setAttribute("data-items", path);
    return node;
}

export function markItem(context, node, path) {
    if (context.editable) node.setAttribute("data-item", path);
    return node;
}

/**
 * Editable mode only: marks the slot of an asset field (`field` is the path of the `src` or
 * `file` member, `kind` is "image" or "file"). The editor adds the file picker there.
 */
export function markAsset(context, node, field, kind) {
    if (!context.editable) return node;
    node.setAttribute("data-asset", field);
    node.setAttribute("data-asset-kind", kind);
    return node;
}

export function isNonBlank(value) {
    return typeof value === "string" && value.trim() !== "";
}

export function isSet(value) {
    return typeof value === "string" && value !== "";
}
