import { test } from "node:test";
import assert from "node:assert/strict";
import {
    BLOCK_TYPES,
    createEmptyWorkshop,
    validateWorkshop,
} from "../app/assets/js/workshop-schema.mjs";
import { createEditorState, ROOT_OWNER } from "../app/workshop_creator/JS/editor-state.mjs";
import { setup, fixture } from "./editor-harness.mjs";

/** The toolbar of a section, subsection or block (blocks keep it in their shell). */
function controls(query, id) {
    const block = query(`[data-block-id="${id}"]`);
    if (block) return block.parentElement.querySelector(":scope > .editor-controls");
    return query(
        `[data-subsection-id="${id}"] > .editor-controls, [data-section-id="${id}"] > .editor-controls`,
    );
}

const itemControls = (query, blockId, path) =>
    query(`[data-block-id="${blockId}"] [data-item="${path}"] > .editor-item-controls`);

const addItemButton = (query, blockId, collection) => {
    const block = query(`[data-block-id="${blockId}"]`);
    const list = block.matches(`[data-items="${collection}"]`)
        ? block
        : block.querySelector(`[data-items="${collection}"]`);
    return list.nextElementSibling;
};

const detailOf = ({ owner, field, operation, target, structural }) => ({
    owner,
    field,
    operation,
    target,
    structural,
});

// ---------------------------------------------------------------------------------------
// State operations
// ---------------------------------------------------------------------------------------

test("built-in sections move but are never removed; custom sections are added and removed", () => {
    const state = createEditorState(createEmptyWorkshop());
    const events = [];
    state.addEventListener("change", (event) => events.push(detailOf(event.detail)));
    const [overview, instructions] = state.document.sections;

    assert.throws(() => state.remove(overview.id), RangeError);
    assert.equal(state.move(overview.id, -1), false);
    assert.equal(events.length, 0, "no event for a refused or impossible operation");

    assert.equal(state.move(overview.id, 1), true);
    assert.deepEqual(
        state.document.sections.slice(0, 2).map((section) => section.id),
        [instructions.id, overview.id],
    );
    assert.deepEqual(events, [
        {
            owner: ROOT_OWNER,
            field: "sections",
            operation: "move",
            target: overview.id,
            structural: true,
        },
    ]);

    const custom = state.addSection({ index: 0 });
    assert.equal(custom.kind, "custom");
    assert.equal(state.document.sections[0], custom);
    assert.equal(state.resolve(custom.id), custom);
    assert.equal(state.remove(custom.id), custom);
    assert.throws(() => state.resolve(custom.id), RangeError);
    assert.equal(events.length, 3);
    assert.equal(state.document.sections.filter((section) => section.kind !== "custom").length, 6);
    assert.deepEqual(validateWorkshop(state.document), []);
});

test("subsection kinds are offered only where permitted and absent; custom subsections repeat", () => {
    const state = createEditorState(createEmptyWorkshop());
    const teachers = state.document.sections[3];
    assert.deepEqual(state.addableSubsectionKinds(teachers.id), ["custom"]);
    assert.throws(() => state.addSubsection(teachers.id, "learningContent"), RangeError);
    assert.throws(() => state.addSubsection(teachers.id, "schedule"), RangeError);
    assert.throws(() => state.addSubsection(teachers.subsections[0].id, "custom"), RangeError);

    const competencies = teachers.subsections[1];
    state.remove(competencies.id);
    assert.deepEqual(state.addableSubsectionKinds(teachers.id), ["competencies", "custom"]);
    const restored = state.addSubsection(teachers.id, "competencies");
    assert.notEqual(restored.id, competencies.id, "added content gets fresh ids");
    assert.equal(restored.blocks[0].type, "list");

    state.addSubsection(teachers.id, "custom");
    state.addSubsection(teachers.id, "custom", { index: 0 });
    assert.equal(teachers.subsections[0].kind, "custom");
    assert.equal(teachers.subsections.filter((s) => s.kind === "custom").length, 2);
    assert.deepEqual(state.addableSubsectionKinds(state.addSection().id), ["custom"]);
    assert.deepEqual(validateWorkshop(state.document), []);
});

test("moving preserves ids and objects; blocks and entries only move within their list", () => {
    const state = createEditorState(fixture("example-complete"));
    const intro = state.document.sections[1].subsections[0];
    const [text, banner] = intro.blocks;
    assert.equal(state.move(banner.id, -1), true);
    assert.deepEqual(intro.blocks, [banner, text]);
    assert.equal(state.move(banner.id, -1), false);
    assert.equal(state.index.get(banner.id), banner);

    const phases = state.document.sections[1].subsections[1].blocks[0];
    const [one, two] = phases.phases[1].steps;
    assert.equal(state.moveItem(phases.id, "phases[1].steps[1]", -1), "phases[1].steps[0]");
    assert.deepEqual(phases.phases[1].steps, [two, one]);
    assert.equal(state.moveItem(phases.id, "phases[1].steps[1]", 1), null);
    assert.throws(() => state.moveItem(phases.id, "phases[1].steps[5]", -1), RangeError);
    assert.throws(() => state.addItem(phases.id, "items"), RangeError);
    assert.throws(() => state.addItem(intro.id, "blocks"), RangeError);
    assert.throws(() => state.removeItem(phases.id, "phases"), RangeError);
    assert.deepEqual(validateWorkshop(state.document), []);
});

// ---------------------------------------------------------------------------------------
// Controls on the page
// ---------------------------------------------------------------------------------------

test("section controls add a custom section, reorder navigation and numbering, and remove it", () => {
    const { state, query, queryAll, dom, type } = setup();
    query('#workshop-content > .editor-add [data-action="add-section"]').click();
    const custom = state.document.sections.at(-1);
    assert.equal(custom.kind, "custom");
    assert.equal(dom.activeElement, query(`[data-section-id="${custom.id}"] .section-title-text`));
    type(dom.activeElement, "Extras");

    controls(query, custom.id).querySelector('[data-action="move-up"]').click();
    controls(query, custom.id).querySelector('[data-action="move-up"]').click();
    assert.deepEqual(
        queryAll(".navigation-text").map((node) => node.textContent),
        [
            "Übersicht",
            "Anleitung",
            "Materialien",
            "Für Lehrende",
            "Extras",
            "Impressionen",
            "Ansprechpartner",
        ],
    );
    assert.equal(
        query(`[data-section-id="${custom.id}"] .workshop-navigation-number`).textContent,
        "05",
    );
    assert.equal(
        dom.activeElement,
        controls(query, custom.id).querySelector('[data-action="move-up"]'),
    );

    const overview = state.document.sections[0];
    assert.equal(controls(query, overview.id).querySelector('[data-action="remove"]'), null);
    assert.equal(
        controls(query, overview.id)
            .querySelector('[data-action="move-up"]')
            .getAttribute("aria-disabled"),
        "true",
    );

    const impressions = state.document.sections[5];
    controls(query, custom.id).querySelector('[data-action="remove"]').click();
    assert.equal(state.document.sections.length, 6);
    assert.equal(dom.activeElement, controls(query, impressions.id).querySelector("button"));
});

test("every block type can be added with fresh ids and focus on its first control", () => {
    const { state, query, dom } = setup();
    const intro = state.document.sections[1].subsections[0];
    const expectedFocus = {
        text: (block) => query(`[data-block-id="${block.id}"]`),
        image: () => "Bild wählen",
        gallery: () => "Galeriebild hinzufügen",
        quote: (block) => query(`[data-block-id="${block.id}"] [data-field="text"]`),
        list: () => "Listenpunkt hinzufügen",
        link: (block) => query(`[data-block-id="${block.id}"] [data-field="label"]`),
        file: () => "Datei wählen",
        phases: () => "Phase hinzufügen",
        people: () => "Person hinzufügen",
    };
    for (const type of Object.keys(BLOCK_TYPES)) {
        const menu = query(`[data-subsection-id="${intro.id}"] > details.editor-add`);
        menu.open = true;
        menu.querySelector(`[data-option="${type}"]`).click();
        const block = intro.blocks.at(-1);
        assert.equal(block.type, type);
        const expected = expectedFocus[type](block);
        if (typeof expected === "string")
            assert.equal(dom.activeElement.textContent, expected, type);
        else assert.equal(dom.activeElement, expected, type);
    }
    assert.equal(intro.blocks.length, 10);
    assert.equal(new Set(intro.blocks.map((block) => block.id)).size, 10);
    assert.deepEqual(validateWorkshop(state.document), []);
});

test("block controls move with focus, skip disabled edges, confirm removal of content and focus a neighbour", () => {
    const confirmations = [];
    let answer = false;
    const { state, query, dom, type } = setup(createEmptyWorkshop(), {
        confirmRemoval: (message) => {
            confirmations.push(message);
            return answer;
        },
    });
    const description = state.document.sections[0].subsections[0];
    const [quote, text] = description.blocks;

    controls(query, text.id).querySelector('[data-action="move-up"]').click();
    assert.deepEqual(description.blocks, [text, quote]);
    assert.equal(
        dom.activeElement,
        controls(query, text.id).querySelector('[data-action="move-up"]'),
    );
    assert.equal(dom.activeElement.getAttribute("aria-disabled"), "true");

    const events = [];
    state.addEventListener("change", (event) => events.push(event.detail));
    dom.activeElement.click();
    assert.equal(events.length, 0, "a disabled edge button does nothing");

    type(query(`[data-block-id="${text.id}"]`), "Inhalt");
    controls(query, text.id).querySelector('[data-action="remove"]').click();
    assert.equal(confirmations.length, 1);
    assert.deepEqual(description.blocks, [text, quote], "declined");

    answer = true;
    controls(query, text.id).querySelector('[data-action="remove"]').click();
    assert.deepEqual(description.blocks, [quote]);
    assert.equal(dom.activeElement, controls(query, quote.id).querySelector("button"));

    controls(query, quote.id).querySelector('[data-action="remove"]').click();
    assert.equal(confirmations.length, 2, "an empty block is removed without asking");
    assert.deepEqual(description.blocks, []);
    assert.equal(
        dom.activeElement,
        query(`[data-subsection-id="${description.id}"] > details.editor-add > summary`),
    );
});

test("removing the required description is a valid draft; the publish check explains it and the menu restores it", () => {
    const { state, panel, query, dom } = setup(fixture("example-complete"), { withFiles: true });
    const overview = state.document.sections[0];
    const description = overview.subsections[0];
    controls(query, description.id).querySelector('[data-action="remove"]').click();
    assert.equal(overview.subsections.length, 0);
    assert.deepEqual(validateWorkshop(state.document), []);

    const errors = panel.checkPublish();
    assert.deepEqual(
        errors.map((error) => [error.path, error.message]),
        [["sections[0].subsections", "required subsection 'description' is missing"]],
    );
    query(".editor-status-error").click();
    const menu = query(`[data-section-id="${overview.id}"] > details.editor-add`);
    assert.equal(dom.activeElement, menu.querySelector("summary"));

    menu.open = true;
    menu.querySelector('[data-option="description"]').click();
    const restored = overview.subsections[0];
    assert.equal(restored.kind, "description");
    assert.equal(dom.activeElement, query(`[data-subsection-id="${restored.id}"] h3`));
    assert.equal(
        query(
            `[data-section-id="${overview.id}"] > details.editor-add [data-option="description"]`,
        ),
        null,
    );
});

test("list entries are added, reordered and removed, and typing targets the moved entry", () => {
    const { state, query, dom, type } = setup();
    const list = state.addBlock(state.document.sections[1].subsections[0].id, "list");
    for (const text of ["Erster", "Zweiter", "Dritter"]) {
        addItemButton(query, list.id, "items").click();
        type(dom.activeElement, text);
    }
    assert.deepEqual(list.items, ["Erster", "Zweiter", "Dritter"]);

    itemControls(query, list.id, "items[2]").querySelector('[data-action="move-item-up"]').click();
    assert.deepEqual(list.items, ["Erster", "Dritter", "Zweiter"]);
    assert.equal(
        dom.activeElement,
        itemControls(query, list.id, "items[1]").querySelector('[data-action="move-item-up"]'),
    );
    type(query(`[data-block-id="${list.id}"] [data-field="items[1]"]`), "Dritter!");
    assert.deepEqual(list.items, ["Erster", "Dritter!", "Zweiter"]);

    itemControls(query, list.id, "items[0]").querySelector('[data-action="remove-item"]').click();
    assert.deepEqual(list.items, ["Dritter!", "Zweiter"]);
    assert.equal(
        dom.activeElement,
        itemControls(query, list.id, "items[0]").querySelector("button"),
    );
});

test("gallery entries keep image, alt text and width bound to the right entry after reordering", async () => {
    const { state, query, dom, input, file, pickFile } = setup();
    const gallery = state.addBlock(state.document.sections[4].subsections[0].id, "gallery");
    addItemButton(query, gallery.id, "images").click();
    addItemButton(query, gallery.id, "images").click();
    assert.equal(gallery.images.length, 2);
    assert.equal(dom.activeElement.textContent, "Bild wählen");
    const picker = (index) =>
        query(
            `[data-block-id="${gallery.id}"] [data-item="images[${index}]"] .editor-asset-controls button`,
        );

    await pickFile(picker(1), file("zweites.jpg"));
    input(query(`[data-block-id="${gallery.id}"] [data-field="images[1].alt"]`), "Zweites Bild");
    itemControls(query, gallery.id, "images[1]")
        .querySelector('[data-action="move-item-up"]')
        .click();
    assert.deepEqual(
        gallery.images.map((image) => [image.src, image.alt]),
        [
            ["images/zweites.jpg", "Zweites Bild"],
            ["", ""],
        ],
    );

    await pickFile(picker(1), file("erstes.jpg"));
    assert.deepEqual(
        gallery.images.map((image) => image.src),
        ["images/zweites.jpg", "images/erstes.jpg"],
    );
    const width = query(`[data-block-id="${gallery.id}"] [data-field="images[1].width"]`);
    input(width, "third");
    assert.equal(gallery.images[1].width, "third");
    assert.ok(width.closest("figure").classList.contains("width-third"));
    assert.equal(gallery.images[0].width, "full");
    assert.deepEqual(validateWorkshop(state.document), []);
});

test("phases and steps are added, reordered and removed with bindings regenerated", () => {
    const { state, query, dom, type } = setup();
    const phases = state.addBlock(state.document.sections[1].subsections[1].id, "phases");
    addItemButton(query, phases.id, "phases").click();
    assert.equal(phases.phases.length, 1);
    assert.equal(phases.phases[0].steps.length, 1, "a new phase starts with one step");
    assert.equal(
        dom.activeElement,
        query(`[data-block-id="${phases.id}"] [data-field="phases[0].title"]`),
    );
    type(dom.activeElement, "Phase A");

    addItemButton(query, phases.id, "phases[0].steps").click();
    assert.equal(
        dom.activeElement,
        query(`[data-block-id="${phases.id}"] [data-field="phases[0].steps[1].title"]`),
    );
    type(dom.activeElement, "Zweiter Schritt");
    type(
        query(`[data-block-id="${phases.id}"] [data-field="phases[0].steps[0].title"]`),
        "Erster Schritt",
    );
    itemControls(query, phases.id, "phases[0].steps[1]")
        .querySelector('[data-action="move-item-up"]')
        .click();
    assert.deepEqual(
        phases.phases[0].steps.map((step) => step.title),
        ["Zweiter Schritt", "Erster Schritt"],
    );
    type(
        query(`[data-block-id="${phases.id}"] [data-field="phases[0].steps[1].duration"]`),
        "10 Min",
    );
    assert.deepEqual(phases.phases[0].steps[1], {
        title: "Erster Schritt",
        duration: "10 Min",
        description: "",
        method: "",
    });

    addItemButton(query, phases.id, "phases").click();
    type(dom.activeElement, "Phase B");
    itemControls(query, phases.id, "phases[1]")
        .querySelector('[data-action="move-item-up"]')
        .click();
    assert.deepEqual(
        phases.phases.map((phase) => phase.title),
        ["Phase B", "Phase A"],
    );
    type(
        query(`[data-block-id="${phases.id}"] [data-field="phases[1].steps[0].method"]`),
        "Gruppenarbeit",
    );
    assert.equal(phases.phases[1].steps[0].method, "Gruppenarbeit");
    assert.equal(phases.phases[1].steps[0].title, "Zweiter Schritt");

    itemControls(query, phases.id, "phases[0].steps[0]")
        .querySelector('[data-action="remove-item"]')
        .click();
    assert.equal(phases.phases[0].steps.length, 0);
    assert.equal(dom.activeElement, addItemButton(query, phases.id, "phases[0].steps"));
    assert.deepEqual(validateWorkshop(state.document), []);
});

test("people entries keep portrait, alt text and name together when reordered", async () => {
    const { state, query, dom, type, input, file, pickFile } = setup();
    const people = state.addBlock(state.document.sections[5].subsections[0].id, "people");
    addItemButton(query, people.id, "people").click();
    assert.equal(
        dom.activeElement,
        query(`[data-block-id="${people.id}"] [data-field="people[0].name"]`),
    );
    type(dom.activeElement, "Erika");
    addItemButton(query, people.id, "people").click();
    type(dom.activeElement, "Max");

    await pickFile(
        query(
            `[data-block-id="${people.id}"] [data-item="people[1]"] .editor-asset-controls button`,
        ),
        file("max.jpg"),
    );
    input(
        query(`[data-block-id="${people.id}"] [data-field="people[1].image.alt"]`),
        "Porträt von Max",
    );
    itemControls(query, people.id, "people[1]")
        .querySelector('[data-action="move-item-up"]')
        .click();
    assert.deepEqual(people.people[0], {
        image: { src: "images/max.jpg", alt: "Porträt von Max" },
        name: "Max",
        description: "",
    });
    type(query(`[data-block-id="${people.id}"] [data-field="people[1].description"]`), "Leitung");
    assert.equal(people.people[1].name, "Erika");
    assert.equal(people.people[1].description, "Leitung");
    assert.ok(query(`[data-block-id="${people.id}"] [data-item="people[0]"] img`));
    assert.deepEqual(validateWorkshop(state.document), []);
});

// ---------------------------------------------------------------------------------------
// Rendering, focus, validation and listeners
// ---------------------------------------------------------------------------------------

test("structural edits keep the slug lock and files, re-render once each and never while typing", () => {
    const { state, assets, file, query, type, disconnects } = setup();
    state.setSlug("mein-workshop");
    const description = state.document.sections[0].subsections[0];
    const block = state.addBlock(description.id, "image");
    assets.choose({ owner: block.id, field: "src", location: "image" }, file("a.jpg"));

    const renders = disconnects();
    const events = [];
    state.addEventListener("change", (event) => events.push(event.detail));
    state.addSection();
    state.move(block.id, -1);
    state.addItem(state.addBlock(description.id, "list").id, "items");
    assert.equal(disconnects(), renders + 4, "one render per operation");
    assert.equal(events.length, 4);
    assert.equal(state.slugLocked, true);
    assert.equal(state.document.slug, "mein-workshop");
    assert.deepEqual([...state.files.keys()], ["images/a.jpg"]);

    type(query("#overview-workshop-name"), "Neuer Titel");
    assert.equal(state.document.slug, "mein-workshop");
    assert.equal(disconnects(), renders + 4, "typing does not re-render");
});

test("focus restoration scrolls by the distance the focused control moved", () => {
    const { window, state, query } = setup();
    const order = () => [...window.document.querySelectorAll("*")];
    window.HTMLElement.prototype.getBoundingClientRect = function () {
        return {
            top: order().indexOf(this) * 10,
            left: 0,
            width: 0,
            height: 0,
            bottom: 0,
            right: 0,
        };
    };
    const scrolls = [];
    window.scrollBy = (x, y) => scrolls.push(y);

    const materials = state.document.sections[2];
    const button = controls(query, materials.id).querySelector('[data-action="move-up"]');
    const before = button.getBoundingClientRect().top;
    button.click();
    const after = window.document.activeElement.getBoundingClientRect().top;
    assert.equal(window.document.activeElement.getAttribute("data-action"), "move-up");
    assert.ok(after < before, "the section moved up in the page");
    assert.deepEqual(scrolls, [after - before]);
});

test("preview renders without editing controls and returns to them", () => {
    const { editor, query } = setup(fixture("example-complete"), { withFiles: true });
    const hooks =
        ".editor-controls, .editor-add, .editor-block, .editor-item-controls, .editor-asset-controls, [data-item], [data-items], [data-asset], [contenteditable]";
    assert.ok(query(hooks));
    editor.setPreview(true);
    assert.equal(query(`#editor ${hooks.split(", ").join(", #editor ")}`), null);
    editor.setPreview(false);
    assert.ok(query(".editor-block"));
});

test("structural changes refresh validation at once so error links follow the new order", () => {
    const { state, panel, query, queryAll, dom } = setup(fixture("example-complete"), {
        withFiles: true,
    });
    const custom = state.addSection();
    const subsection = state.addSubsection(custom.id, "custom", {});
    state.set(state.addBlock(subsection.id, "text").id, "text", "Inhalt");

    const paths = () => panel.checkPublish().map((error) => error.path);
    assert.deepEqual(paths(), ["sections[7].subsections[0].title", "sections[7].title"]);
    state.move(custom.id, -1);
    assert.deepEqual(
        queryAll(".editor-status-error code").map((code) => code.textContent),
        [],
        "the draft list is current right after the move",
    );
    assert.deepEqual(paths(), ["sections[6].subsections[0].title", "sections[6].title"]);
    const [subsectionError, sectionError] = queryAll(".editor-status-error");
    subsectionError.click();
    assert.equal(dom.activeElement, query(`[data-subsection-id="${subsection.id}"] h3`));
    sectionError.click();
    assert.equal(dom.activeElement, query(`[data-section-id="${custom.id}"] .section-title-text`));
});
