/**
 * Picker controls for asset fields: choose or replace, remove, and a note when the referenced
 * file is missing. decorateAssetSlots() adds them to every [data-asset] slot of a rendered
 * editable page; the settings use createAssetControls() for the thumbnail.
 *
 * `run(action, origin)` performs an action. An action returns, or resolves to, a function that
 * finds the element to focus after the page has been rendered again.
 */
import { ownerOf, assetButton } from "./editor-dom.mjs";

const LABELS = {
    image: {
        choose: "Bild wählen",
        replace: "Bild ersetzen",
        remove: "Bild entfernen",
        edit: "Zuschneiden",
        missing: "Bilddatei fehlt",
        invalid: "Bitte eine Bilddatei wählen.",
    },
    file: {
        choose: "Datei wählen",
        replace: "Datei ersetzen",
        remove: "Datei entfernen",
        missing: "Datei fehlt",
        invalid: "Die Datei braucht eine Dateiendung.",
    },
};

/** `find(root, target)` returns the control to focus once the field changed. */
export function createAssetControls(dom, assets, target, { run, find }) {
    const labels = LABELS[target.location === "file" ? "file" : "image"];
    const value = assets.current(target);
    const controls = dom.createElement("span");
    controls.className = "editor-asset-controls";
    const status = dom.createElement("span");
    status.className = "editor-asset-status";
    status.setAttribute("role", "status");
    if (value && !assets.has(value)) {
        controls.classList.add("is-missing");
        status.textContent = labels.missing;
    }

    const choose = button(dom, value ? labels.replace : labels.choose, "choose-asset");
    choose.addEventListener("click", () =>
        run(
            () =>
                assets.pick(target).then((outcome) => {
                    if (outcome.status === "chosen") return (root) => find(root, outcome.target);
                    if (outcome.status === "invalid") status.textContent = labels.invalid;
                    return null;
                }),
            choose,
        ),
    );
    controls.append(choose);

    if (assets.canEdit?.(target)) {
        const edit = button(dom, labels.edit, "edit-asset");
        edit.addEventListener("click", () =>
            run(
                () =>
                    assets
                        .edit(target)
                        .then((outcome) =>
                            outcome.status === "chosen"
                                ? (root) => find(root, outcome.target)
                                : null,
                        ),
                edit,
            ),
        );
        controls.append(edit);
    }

    if (value) {
        const remove = button(dom, labels.remove, "remove-asset");
        remove.addEventListener("click", () =>
            run(() => {
                assets.remove(target);
                return (root) => find(root, target);
            }, remove),
        );
        controls.append(remove);
    }
    controls.append(status);
    return controls;
}

export function decorateAssetSlots(main, assets, { run }) {
    const dom = main.ownerDocument;
    const find = (root, target) => assetButton(root, target.owner, target.field);
    for (const slot of main.querySelectorAll("[data-asset]")) {
        const kind = slot.getAttribute("data-asset-kind") === "file" ? "file" : "image";
        const target = {
            owner: ownerOf(slot),
            field: slot.getAttribute("data-asset"),
            location: kind,
        };
        const controls = createAssetControls(dom, assets, target, { run, find });
        const image = [...slot.children].find((child) => child.localName === "img");
        if (image) image.after(controls);
        else if (kind === "file") slot.append(controls);
        else slot.prepend(controls);
    }
}

function button(dom, text, action) {
    const node = dom.createElement("button");
    node.type = "button";
    node.textContent = text;
    node.setAttribute("data-action", action);
    return node;
}
