/**
 * Buttons and menus that add, remove and reorder sections, subsections, blocks and the entries
 * of arrays inside blocks. decorateStructure() adds them to a rendered editable page: a toolbar
 * per section, subsection and block (blocks are wrapped in a shell for it), an add control at
 * the end of each list and controls on every entry.
 *
 * Each control calls one state operation through `run` and returns a function that finds the
 * element to focus in the page rendered afterwards: the added or moved content, or a
 * neighbouring control after a removal.
 */
import {
    BLOCK_TYPES,
    defaultTitle,
    isBlockFilled,
    isSectionEmpty,
    isSubsectionEmpty,
} from "../../assets/js/workshop-schema.mjs";
import { parsePath, formatPath, readPath } from "./editor-state.mjs";
import {
    assetButton,
    childWithClass,
    controlHolder,
    findAction,
    findByAttribute,
    findOwned,
    findOwnerNode,
    firstFocusable,
} from "./editor-dom.mjs";

const BLOCK_LABELS = {
    text: "Text",
    image: "Bild",
    gallery: "Galerie",
    quote: "Zitat",
    list: "Liste",
    link: "Link",
    file: "Datei",
    phases: "Ablaufplan",
    people: "Personen",
};

const ITEM_LABELS = {
    items: "Listenpunkt",
    images: "Galeriebild",
    phases: "Phase",
    steps: "Tätigkeit",
    people: "Person",
};

export function decorateStructure(main, state, { run, confirmRemoval = () => true }) {
    const dom = main.ownerDocument;
    const content = main.querySelector("#workshop-content");

    for (const sectionNode of [...content.children]) {
        const section = state.index.get(sectionNode.getAttribute("data-section-id"));
        if (!section) continue;
        const name = section.kind === "custom" ? "Eigener Abschnitt" : defaultTitle(section.kind);
        childWithClass(sectionNode, "section-title").after(
            toolbar(`Abschnitt ${name}`, [
                ...moveButtons(section, state.document.sections),
                section.kind === "custom"
                    ? removeButton("Abschnitt löschen", section, state.document.sections, () =>
                          isSectionEmpty(section),
                      )
                    : null,
            ]),
        );
        for (const subsectionNode of [...sectionNode.querySelectorAll("[data-subsection-id]")]) {
            decorateSubsection(subsectionNode, section);
        }
        sectionNode.append(addSubsectionControl(section));
    }
    content.append(addSectionControl());

    function decorateSubsection(node, section) {
        const subsection = state.index.get(node.getAttribute("data-subsection-id"));
        const name = defaultTitle(subsection.kind) || "eigener";
        childWithClass(node, "subsection-title").after(
            toolbar(`Unterabschnitt ${name}`, [
                ...moveButtons(subsection, section.subsections),
                removeButton("Unterabschnitt löschen", subsection, section.subsections, () =>
                    isSubsectionEmpty(subsection),
                ),
            ]),
        );
        for (const blockNode of [...node.querySelectorAll("[data-block-id]")]) {
            decorateBlock(blockNode, subsection);
        }
        node.append(addBlockControl(subsection));
    }

    function decorateBlock(node, subsection) {
        const block = state.index.get(node.getAttribute("data-block-id"));
        const shell = element("div", "editor-block");
        node.before(shell);
        shell.append(
            toolbar(`Block ${BLOCK_LABELS[block.type]}`, [
                ...moveButtons(block, subsection.blocks),
                removeButton(
                    "Block löschen",
                    block,
                    subsection.blocks,
                    () => !isBlockFilled(block),
                ),
            ]),
            node,
        );
        for (const itemNode of [...node.querySelectorAll("[data-item]")]) {
            const controls = itemControls(block, itemNode.getAttribute("data-item"));
            const heading = childWithClass(itemNode, "phase-title");
            if (heading) heading.after(controls);
            else itemNode.append(controls);
        }
        const lists = [node, ...node.querySelectorAll("[data-items]")];
        for (const listNode of lists.filter((candidate) => candidate.hasAttribute("data-items"))) {
            listNode.after(addItemButton(block, listNode.getAttribute("data-items")));
        }
    }

    // Sections, subsections and blocks

    function moveButtons(object, list) {
        const position = list.indexOf(object);
        const move = (offset, action) => () => {
            state.move(object.id, offset, { source: "editor" });
            return (root) => findAction(toolbarOf(root, object.id), action);
        };
        return [
            button("Nach oben", "move-up", move(-1, "move-up"), position === 0),
            button("Nach unten", "move-down", move(1, "move-down"), position === list.length - 1),
        ];
    }

    function removeButton(label, object, list, isEmpty) {
        return button(label, "remove", () => {
            if (!isEmpty() && !confirmRemoval(`${label}? Der Inhalt geht dabei verloren.`)) {
                return null;
            }
            const position = list.indexOf(object);
            const neighbour = list[position + 1] ?? list[position - 1] ?? null;
            const owner = findOwnerNode(main, object.id)?.parentElement?.closest(
                "[data-subsection-id], [data-section-id]",
            );
            const ownerId =
                owner?.getAttribute("data-subsection-id") ?? owner?.getAttribute("data-section-id");
            state.remove(object.id, { source: "editor" });
            return (root) => {
                if (neighbour) return firstFocusable(toolbarOf(root, neighbour.id));
                const holder = ownerId
                    ? findOwnerNode(root, ownerId)
                    : root.querySelector("#workshop-content");
                return firstFocusable(childWithClass(holder, "editor-add"));
            };
        });
    }

    function addSectionControl() {
        const add = button("Abschnitt hinzufügen", "add-section", () => {
            const section = state.addSection({ source: "editor" });
            return (root) =>
                findByAttribute(root, "data-section-id", section.id)?.querySelector(
                    ".section-title-text",
                ) ?? null;
        });
        const wrapper = element("div", "editor-add");
        wrapper.setAttribute("data-add", "section");
        wrapper.append(add);
        return wrapper;
    }

    function addSubsectionControl(section) {
        const options = state.addableSubsectionKinds(section.id).map((kind) => ({
            label: kind === "custom" ? "Eigener Unterabschnitt" : defaultTitle(kind),
            option: kind,
            action: () => {
                const subsection = state.addSubsection(section.id, kind, { source: "editor" });
                return (root) =>
                    firstFocusable(findByAttribute(root, "data-subsection-id", subsection.id));
            },
        }));
        return menu("Unterabschnitt hinzufügen", "subsection", options);
    }

    function addBlockControl(subsection) {
        const options = Object.keys(BLOCK_TYPES).map((type) => ({
            label: BLOCK_LABELS[type],
            option: type,
            action: () => {
                const block = state.addBlock(subsection.id, type, { source: "editor" });
                return (root) => focusTargetOfBlock(root, block);
            },
        }));
        return menu("Block hinzufügen", "block", options);
    }

    // Entries of arrays inside blocks

    function itemControls(block, path) {
        const tokens = parsePath(path);
        const position = tokens.at(-1);
        const collection = formatPath(tokens.slice(0, -1));
        const length = readPath(block, collection).length;
        const label = ITEM_LABELS[lastKey(collection)];
        const move = (offset, action) => () => {
            const moved = state.moveItem(block.id, path, offset, { source: "editor" }) ?? path;
            return (root) => findAction(itemControlsOf(root, block.id, moved), action);
        };
        const remove = () => {
            state.removeItem(block.id, path, { source: "editor" });
            const remaining = readPath(block, collection).length;
            return (root) => {
                if (remaining === 0) return addItemButtonOf(root, block.id, collection);
                const neighbour = `${collection}[${Math.min(position, remaining - 1)}]`;
                return firstFocusable(itemControlsOf(root, block.id, neighbour));
            };
        };
        const controls = toolbar(`${label} ${position + 1}`, [
            button("Nach oben", "move-item-up", move(-1, "move-item-up"), position === 0),
            button(
                "Nach unten",
                "move-item-down",
                move(1, "move-item-down"),
                position === length - 1,
            ),
            button(`${label} löschen`, "remove-item", remove),
        ]);
        controls.className = "editor-item-controls";
        return controls;
    }

    function addItemButton(block, collection) {
        const node = button(`${ITEM_LABELS[lastKey(collection)]} hinzufügen`, "add-item", () => {
            const path = state.addItem(block.id, collection, { source: "editor" });
            return (root) => {
                const item = findOwned(root, block.id, "data-item", path);
                if (lastKey(collection) === "images") {
                    return assetButton(root, block.id, `${path}.src`);
                }
                if (lastKey(collection) === "steps") {
                    return findOwned(root, block.id, "data-field", `${path}.title`);
                }
                return item?.querySelector("[contenteditable]") ?? firstFocusable(item);
            };
        });
        node.classList.add("editor-add-item");
        return node;
    }

    // Building blocks

    function menu(label, kind, options) {
        if (options.length === 1) {
            const [only] = options;
            const wrapper = element("div", "editor-add");
            wrapper.setAttribute("data-add", kind);
            const single = button(`${only.label} hinzufügen`, `add-${kind}`, only.action);
            single.setAttribute("data-option", only.option);
            wrapper.append(single);
            return wrapper;
        }
        const details = element("details", "editor-add editor-menu");
        details.setAttribute("data-add", kind);
        const summary = element("summary");
        summary.textContent = label;
        const list = element("div", "editor-menu-options");
        list.setAttribute("role", "group");
        list.setAttribute("aria-label", label);
        for (const { label: text, option, action } of options) {
            const choice = button(text, `add-${kind}`, action);
            choice.setAttribute("data-option", option);
            list.append(choice);
        }
        details.addEventListener("keydown", (event) => {
            if (event.key !== "Escape" || !details.open) return;
            details.open = false;
            summary.focus();
        });
        details.append(summary, list);
        return details;
    }

    function toolbar(label, buttons) {
        const bar = element("div", "editor-controls");
        bar.setAttribute("role", "group");
        bar.setAttribute("aria-label", label);
        bar.append(...buttons.filter(Boolean));
        return bar;
    }

    /** aria-disabled keeps an edge button focusable, so focus can stay on a moved item. */
    function button(text, action, handler, disabled = false) {
        const node = element("button");
        node.type = "button";
        node.textContent = text;
        node.setAttribute("data-action", action);
        if (disabled) node.setAttribute("aria-disabled", "true");
        node.addEventListener("click", () => {
            if (node.getAttribute("aria-disabled") !== "true") run(handler, node);
        });
        return node;
    }

    function element(tag, className) {
        const node = dom.createElement(tag);
        if (className) node.className = className;
        return node;
    }
}

function toolbarOf(root, id) {
    return childWithClass(controlHolder(root, id), "editor-controls");
}

function itemControlsOf(root, blockId, path) {
    return childWithClass(findOwned(root, blockId, "data-item", path), "editor-item-controls");
}

function addItemButtonOf(root, blockId, collection) {
    const list = findOwned(root, blockId, "data-items", collection);
    const next = list?.nextElementSibling;
    return next?.classList.contains("editor-add-item") ? next : null;
}

/** New image and file blocks focus their picker, list-like blocks their add button. */
function focusTargetOfBlock(root, block) {
    const node = findOwnerNode(root, block.id);
    if (block.type === "image") return assetButton(root, block.id, "src");
    if (block.type === "file") return assetButton(root, block.id, "file");
    const editable = node?.matches("[contenteditable]")
        ? node
        : node?.querySelector("[contenteditable]");
    return editable ?? node?.parentElement?.querySelector(".editor-add-item") ?? null;
}

function lastKey(path) {
    return parsePath(path)
        .filter((token) => typeof token === "string")
        .at(-1);
}
