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

// Skip empty text nodes so the editor can use :empty for placeholders.
export function append(node, children) {
    node.append(
        ...children.filter(
            (child) => child !== null && child !== undefined && child !== false && child !== "",
        ),
    );
    return node;
}

// `field` is relative to its owner; `root` selects the document instead.
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

// `data-items` marks an array path; `data-item` marks an entry for editor controls.
export function markItems(context, node, path) {
    if (context.editable) node.setAttribute("data-items", path);
    return node;
}

export function markItem(context, node, path) {
    if (context.editable) node.setAttribute("data-item", path);
    return node;
}

// `field` is the src/file path; the editor adds a picker to this slot.
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
