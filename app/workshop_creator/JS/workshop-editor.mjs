// Typing updates state in place; structural, asset and page-setting changes render again.
import { renderWorkshop, disposeWorkshop } from "../../assets/js/renderer/render-workshop.mjs";
import { workshopMeta } from "../../assets/js/renderer/render-section.mjs";
import { applyWidthClass } from "../../assets/js/renderer/render-blocks.mjs";
import { defaultTitle } from "../../assets/js/workshop-schema.mjs";
import { ROOT_OWNER } from "./editor-state.mjs";
import { isAssetField } from "./editor-assets.mjs";
import { decorateAssetSlots } from "./asset-controls.mjs";
import { decorateStructure } from "./structure-controls.mjs";
import {
    ownerOf,
    findByAttribute,
    findOwned,
    findAssetSlot,
    childWithClass,
    firstFocusable,
} from "./editor-dom.mjs";

export { ownerOf };

const PAGE_AFFECTING_SETTINGS = new Set(["moreInfoUrl", "gradeRange", "subject", "authors"]);

export function mountEditor(
    container,
    state,
    { assets = null, resolveAsset, confirmRemoval } = {},
) {
    const dom = container.ownerDocument;
    const view = dom.defaultView;
    const plaintextSupported = supportsPlaintextOnly(dom);
    const resolve = resolveAsset ?? (assets ? (path) => assets.resolve(path) : undefined);
    const confirm = confirmRemoval ?? ((message) => view.confirm(message));
    let main = null;
    let preview = false;

    function render() {
        if (main) disposeWorkshop(main);
        const next = renderWorkshop(state.document, {
            editable: !preview,
            resolveAsset: resolve,
            dom,
        });
        if (!plaintextSupported) {
            next.querySelectorAll('[contenteditable="plaintext-only"]').forEach((node) =>
                node.setAttribute("contenteditable", "true"),
            );
        }
        if (!preview) {
            decorateStructure(next, state, { run, confirmRemoval: confirm });
            if (assets) decorateAssetSlots(next, assets, { run });
        }
        if (main?.parentNode === container) main.replaceWith(next);
        else container.replaceChildren(next);
        main = next;
    }

    // Actions return a focus lookup to run after rendering, synchronously or via a promise.
    function run(action, origin) {
        const top = origin.getBoundingClientRect().top;
        const result = action();
        if (typeof result?.then === "function") {
            return result.then((find) => restoreFocus(find, top));
        }
        restoreFocus(result, top);
        return undefined;
    }

    function restoreFocus(find, top) {
        if (typeof find !== "function" || !main) return;
        const target = find(main);
        if (!target) return;
        const distance = target.getBoundingClientRect().top - top;
        if (distance !== 0) view.scrollBy(0, distance);
        target.focus({ preventScroll: true });
    }

    function onInput(event) {
        if (preview) return;
        const field = event.target.closest?.("[data-field]");
        if (!field || !container.contains(field)) return;
        const owner = ownerOf(field);
        const name = field.getAttribute("data-field");
        const value = readValue(field);
        state.set(owner, name, value, { source: "editor" });
        if (field.matches("select.editor-width")) {
            const figure = field.closest("figure");
            if (figure) applyWidthClass(figure, value);
        }
        updateNavigationLabel(owner, name, value);
        if (name === "fields.facts.duration") updateMetaLine();
    }

    function updateMetaLine() {
        const meta = main?.querySelector(".workshop-meta");
        if (meta) meta.textContent = workshopMeta(state.document);
    }

    function onKeydown(event) {
        if (event.key !== "Enter") return;
        const field = event.target.closest?.("[contenteditable][data-field]");
        if (!field || field.hasAttribute("data-multiline")) return;
        event.preventDefault();
    }

    function onPaste(event) {
        const field = event.target.closest?.("[contenteditable][data-field]");
        if (!field) return;
        event.preventDefault();
        let text = event.clipboardData?.getData("text/plain") ?? "";
        if (!field.hasAttribute("data-multiline")) text = text.replace(/\s*\r?\n\s*/g, " ");
        insertText(dom, field, text);
    }

    function updateNavigationLabel(owner, field, value) {
        if (owner === ROOT_OWNER || field !== "title") return;
        const object = state.resolve(owner);
        const link = findByAttribute(main, "data-section", owner)?.querySelector(
            ".navigation-text",
        );
        if (link && object.kind !== undefined && !("blocks" in object)) {
            link.textContent = value.trim() || defaultTitle(object.kind);
        }
    }

    function onStateChange(event) {
        const { owner, field, source, structural } = event.detail;
        if (structural || (isAssetField(field) && owner !== ROOT_OWNER)) return render();
        if (source === "editor") return;
        if (owner === ROOT_OWNER && PAGE_AFFECTING_SETTINGS.has(field)) render();
    }

    container.addEventListener("input", onInput);
    container.addEventListener("keydown", onKeydown);
    container.addEventListener("paste", onPaste);
    state.addEventListener("replace", render);
    state.addEventListener("change", onStateChange);
    render();

    return {
        get preview() {
            return preview;
        },
        setPreview(on) {
            preview = Boolean(on);
            render();
        },
        refresh: render,
        locate(path) {
            return locateField(state, main, path);
        },
        dispose() {
            container.removeEventListener("input", onInput);
            container.removeEventListener("keydown", onKeydown);
            container.removeEventListener("paste", onPaste);
            state.removeEventListener("replace", render);
            state.removeEventListener("change", onStateChange);
            if (main) disposeWorkshop(main);
            container.replaceChildren();
            main = null;
        },
    };
}

function readValue(field) {
    if (field.matches("input, textarea, select")) return field.value;
    let text = field.textContent;
    if (text === "") field.replaceChildren(); // drop a stray <br> so the placeholder shows again
    if (!field.hasAttribute("data-multiline")) text = text.replace(/\r?\n/g, " ");
    return text;
}

function insertText(dom, field, text) {
    if (typeof dom.execCommand === "function" && dom.execCommand("insertText", false, text)) return;
    const selection = dom.getSelection?.();
    if (selection && selection.rangeCount) {
        const range = selection.getRangeAt(0);
        range.deleteContents();
        range.insertNode(dom.createTextNode(text));
        range.collapse(false);
    } else {
        field.append(dom.createTextNode(text));
    }
    field.dispatchEvent(new dom.defaultView.Event("input", { bubbles: true }));
}

function supportsPlaintextOnly(dom) {
    const probe = dom.createElement("div");
    probe.setAttribute("contenteditable", "plaintext-only");
    return probe.contentEditable === "plaintext-only";
}

const PATH_STEP = /^(sections|subsections|blocks)\[(\d+)\]\.?/;
const ID_ATTRIBUTES = {
    sections: "data-section-id",
    subsections: "data-subsection-id",
    blocks: "data-block-id",
};

// Resolve validation paths to editor controls, falling back to the containing owner.
function locateField(state, main, path) {
    if (!main) return null;
    let rest = String(path);
    let container = main;
    let object = state.document;
    for (let match = PATH_STEP.exec(rest); match; match = PATH_STEP.exec(rest)) {
        object = object?.[match[1]]?.[Number(match[2])];
        if (!object) return null;
        container = findByAttribute(container, ID_ATTRIBUTES[match[1]], object.id);
        if (!container) return null;
        rest = rest.slice(match[0].length);
    }
    if (container === main) {
        return rest === "" ? null : findOwned(main, ROOT_OWNER, "data-field", rest);
    }
    if (rest === "") return container;
    return (
        findOwned(container, object.id, "data-field", rest) ??
        findAssetSlot(container, object.id, rest)?.querySelector(".editor-asset-controls button") ??
        findOwned(container, object.id, "data-item", rest) ??
        (rest === "subsections" || rest === "blocks"
            ? firstFocusable(childWithClass(container, "editor-add"))
            : null) ??
        container
    );
}
