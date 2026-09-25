// IDs and paths are opaque: compare attribute values instead of interpolating selectors.
import { ROOT_OWNER } from "./editor-state.mjs";

const FOCUSABLE = "[contenteditable], input, select, textarea, button, summary";

/** Root fields carry data-owner="root"; everything else belongs to the nearest marked ancestor. */
export function ownerOf(element) {
    if (element.getAttribute("data-owner") === "root") return ROOT_OWNER;
    const owner = element.closest("[data-block-id], [data-subsection-id], [data-section-id]");
    if (!owner) return ROOT_OWNER;
    return (
        owner.getAttribute("data-block-id") ??
        owner.getAttribute("data-subsection-id") ??
        owner.getAttribute("data-section-id")
    );
}

export function findByAttribute(root, attribute, value) {
    return (
        candidates(root, attribute).find((node) => node.getAttribute(attribute) === value) ?? null
    );
}

/** An element with `attribute` = `value` that belongs to `owner` itself, not to a nested owner. */
export function findOwned(root, owner, attribute, value) {
    return (
        candidates(root, attribute).find(
            (node) => node.getAttribute(attribute) === value && ownerOf(node) === owner,
        ) ?? null
    );
}

/** `root` itself (when it has the attribute) and its descendants with the attribute. */
function candidates(root, attribute) {
    const nodes = [...root.querySelectorAll(`[${attribute}]`)];
    return root.hasAttribute(attribute) ? [root, ...nodes] : nodes;
}

export function findOwnerNode(root, id) {
    return (
        findByAttribute(root, "data-block-id", id) ??
        findByAttribute(root, "data-subsection-id", id) ??
        findByAttribute(root, "data-section-id", id)
    );
}

/** The element holding an owner's controls: the block shell for blocks, else the owner itself. */
export function controlHolder(root, id) {
    const node = findOwnerNode(root, id);
    if (!node) return null;
    return node.hasAttribute("data-block-id") &&
        node.parentElement?.classList.contains("editor-block")
        ? node.parentElement
        : node;
}

export function childWithClass(node, className) {
    return node
        ? ([...node.children].find((child) => child.classList.contains(className)) ?? null)
        : null;
}

export function findAction(container, action) {
    return container
        ? ([...container.querySelectorAll("[data-action]")].find(
              (node) => node.getAttribute("data-action") === action,
          ) ?? null)
        : null;
}

export function firstFocusable(node) {
    if (!node) return null;
    return node.matches(FOCUSABLE) ? node : node.querySelector(FOCUSABLE);
}

export function findAssetSlot(root, owner, field) {
    return findOwned(root, owner, "data-asset", field);
}

export function assetButton(root, owner, field) {
    return (
        findAssetSlot(root, owner, field)?.querySelector(".editor-asset-controls button") ?? null
    );
}
