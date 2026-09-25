import { test } from "node:test";
import assert from "node:assert/strict";
import {
    createEmptyWorkshop,
    createBlock,
    validateWorkshop,
} from "../app/assets/js/workshop-schema.mjs";
import {
    createEditorState,
    assignPath,
    parsePath,
    ROOT_OWNER,
} from "../app/workshop_creator/JS/editor-state.mjs";
import { ownerOf } from "../app/workshop_creator/JS/workshop-editor.mjs";
import { setup, fixture, filesFor } from "./editor-harness.mjs";

function section(state, kind) {
    return state.document.sections.find((s) => s.kind === kind);
}

test("assignPath and parsePath handle members, nested objects and indices", () => {
    assert.deepEqual(parsePath("phases[0].steps[1].title"), ["phases", 0, "steps", 1, "title"]);
    const object = { fields: { facts: { location: "" } }, items: ["a", "b"] };
    assert.equal(assignPath(object, "fields.facts.location", "Raum 1"), "");
    assert.equal(object.fields.facts.location, "Raum 1");
    assert.equal(assignPath(object, "items[1]", "c"), "b");
    assert.deepEqual(object.items, ["a", "c"]);
    assert.throws(() => assignPath(object, "fields.nope.x", 1), RangeError);
    assert.throws(() => assignPath(object, "missing", 1), RangeError);
    assert.throws(() => parsePath(""), RangeError);
});

test("state resolves owners by id and reports changes with their source", () => {
    const state = createEditorState(createEmptyWorkshop());
    const events = [];
    state.addEventListener("change", (event) => events.push(event.detail));
    const overview = section(state, "overview");
    const description = overview.subsections[0];
    const quote = description.blocks[0];

    state.set(ROOT_OWNER, "title", "Aliens", { source: "editor" });
    state.set(overview.id, "fields.facts.location", "Campus");
    state.set(description.id, "title", "Kurz gesagt");
    state.set(quote.id, "text", "Vielfalt");
    assert.equal(state.document.title, "Aliens");
    assert.equal(overview.fields.facts.location, "Campus");
    assert.equal(description.title, "Kurz gesagt");
    assert.equal(quote.text, "Vielfalt");
    assert.equal(events[0].source, "editor");
    assert.equal(events[1].field, "slug", "the slug follows the title");
    assert.equal(
        events.find((event) => event.field === "fields.facts.location").owner,
        overview.id,
    );
    assert.throws(() => state.set("no-such-id", "title", "x"), RangeError);
});

test("the slug follows the title until it is set explicitly, and resumes when cleared", () => {
    const state = createEditorState(createEmptyWorkshop());
    state.set(ROOT_OWNER, "title", "Über Größe & Maß");
    assert.equal(state.document.slug, "ueber-groesse-mass");
    state.setSlug("mein-slug");
    assert.equal(state.slugLocked, true);
    state.set(ROOT_OWNER, "title", "Neuer Titel");
    assert.equal(state.document.slug, "mein-slug");
    state.setSlug("");
    assert.equal(state.slugLocked, false);
    state.set(ROOT_OWNER, "title", "Noch ein Titel");
    assert.equal(state.document.slug, "noch-ein-titel");
});

test("every nonempty imported slug stays locked when the title changes", () => {
    const state = createEditorState(createEmptyWorkshop());
    for (const slug of ["example-complete", "beispielworkshop-mit-allen-inhalten"]) {
        const document = fixture("example-complete");
        document.slug = slug;
        state.load(document);
        assert.equal(state.slugLocked, true);
        state.set(ROOT_OWNER, "title", "Neuer Titel");
        assert.equal(state.document.slug, slug);
    }

    const document = fixture("example-complete");
    document.slug = "";
    state.load(document);
    assert.equal(state.slugLocked, false);
    state.set(ROOT_OWNER, "title", "Neuer Titel");
    assert.equal(state.document.slug, "neuer-titel");
});

test("loading validates before replacing and leaves current work untouched on failure", () => {
    const state = createEditorState(createEmptyWorkshop());
    state.set(ROOT_OWNER, "title", "Meine Arbeit");
    const invalid = fixture("example-complete");
    invalid.moreInfoUrl = "javascript:void(0)";
    assert.throws(() => state.load(invalid), /Validierungsfehler/);
    assert.equal(state.document.title, "Meine Arbeit");
    assert.throws(() => state.load({ schemaVersion: 99 }), /Unsupported schemaVersion/);
    assert.equal(state.document.title, "Meine Arbeit");
    state.load(fixture("example-complete"));
    assert.equal(state.document.title, "Beispielworkshop mit allen Inhalten");
});

test("root title and section title are written to different owners", () => {
    const { state, query, type } = setup();
    const overview = section(state, "overview");
    type(query('[data-owner="root"][data-field="title"]'), "Aliens");
    assert.equal(state.document.title, "Aliens");
    assert.equal(overview.title, "Übersicht");

    const sectionTitle = query(`[data-section-id="${overview.id}"] .section-title-text`);
    type(sectionTitle, "Auf einen Blick");
    assert.equal(overview.title, "Auf einen Blick");
    assert.equal(state.document.title, "Aliens");
    assert.equal(
        query(`[data-section="${overview.id}"] .navigation-text`).textContent,
        "Auf einen Blick",
    );

    type(sectionTitle, "");
    assert.equal(overview.title, "");
    assert.equal(
        query(`[data-section="${overview.id}"] .navigation-text`).textContent,
        "Übersicht",
    );
    assert.equal(sectionTitle.getAttribute("data-placeholder"), "Übersicht");
});

test("ownerOf prefers the root marker over the enclosing section", () => {
    const { query } = setup();
    assert.equal(ownerOf(query("#overview-workshop-name")), ROOT_OWNER);
    assert.notEqual(ownerOf(query(".section-title-text")), ROOT_OWNER);
});

for (const level of ["section", "subsection", "block"]) {
    test(`a ${level} with ID root edits its own fields, not the workshop`, () => {
        const document = createEmptyWorkshop();
        const overview = document.sections[0];
        const description = overview.subsections[0];
        const owner = { section: overview, subsection: description, block: description.blocks[0] }[
            level
        ];
        owner.id = "root";
        assert.deepEqual(validateWorkshop(document), []);

        const { state, editor, settings, query, type, input } = setup(document);
        const field = level === "block" ? "text" : "title";
        const path = {
            section: "sections[0].title",
            subsection: "sections[0].subsections[0].title",
            block: "sections[0].subsections[0].blocks[0].text",
        }[level];
        const editable = query(`[data-${level}-id="root"] [data-field="${field}"]`);
        type(query("#overview-workshop-name"), "Workshop title");
        type(editable, "Own content");
        input(settings.form.elements.teaser, "Workshop teaser");

        assert.equal(state.resolve("root"), owner);
        assert.equal(owner[field], "Own content");
        assert.equal(document.title, "Workshop title");
        assert.equal(document.slug, "workshop-title");
        assert.equal(document.teaser, "Workshop teaser");
        assert.equal(editor.locate(path), editable);
        if (level === "section") {
            assert.equal(
                query('[data-section="root"] .navigation-text').textContent,
                "Own content",
            );
        }
    });
}

test("opaque IDs with quotes, backslashes and control characters support editing and error links", () => {
    const document = createEmptyWorkshop();
    const overview = document.sections[0];
    const description = overview.subsections[0];
    const quote = description.blocks[0];
    const unusual = '"\\\n\r\f\u0000[]';
    overview.id = `section-${unusual}`;
    description.id = `subsection-${unusual}`;
    quote.id = `block-${unusual}`;
    assert.deepEqual(validateWorkshop(document), []);

    const { editor, query, type } = setup(document);
    const title = query("#overview .section-title-text");
    const subsectionTitle = query('#overview [data-subsection-id] [data-field="title"]');
    const quoteText = query('#overview .block-quote [data-field="text"]');
    type(title, "Renamed overview");
    type(subsectionTitle, "Renamed description");
    type(quoteText, "Updated quote");

    assert.equal(overview.title, "Renamed overview");
    assert.equal(query("[data-section] .navigation-text").textContent, "Renamed overview");
    assert.equal(description.title, "Renamed description");
    assert.equal(quote.text, "Updated quote");
    assert.equal(editor.locate("sections[0].title"), title);
    assert.equal(editor.locate("sections[0].subsections[0].title"), subsectionTitle);
    assert.equal(editor.locate("sections[0].subsections[0].blocks[0].text"), quoteText);
});

test("initially empty fields are editable: quote author, caption, step and person fields", () => {
    const { state, query, type } = setup(fixture("example-complete"));
    const vision = state.document.sections[0].subsections[0].blocks[0];
    assert.equal(vision.author, "");
    type(query(`[data-block-id="${vision.id}"] [data-field="author"]`), "Team");
    assert.equal(vision.author, "Team");

    const banner = state.document.sections[1].subsections[0].blocks[1];
    type(query(`[data-block-id="${banner.id}"] [data-field="caption"]`), "Neue Unterschrift");
    assert.equal(banner.caption, "Neue Unterschrift");

    const phases = state.document.sections[1].subsections[1].blocks[0];
    type(
        query(`[data-block-id="${phases.id}"] [data-field="phases[1].steps[1].duration"]`),
        "30 Min",
    );
    assert.equal(phases.phases[1].steps[1].duration, "30 Min");

    const people = state.document.sections[5].subsections[0].blocks[0];
    type(
        query(`[data-block-id="${people.id}"] [data-field="people[1].description"]`),
        "Neue Rolle",
    );
    assert.equal(people.people[1].description, "Neue Rolle");

    const list = state.document.sections[3].subsections[1].blocks[0];
    type(query(`[data-block-id="${list.id}"] [data-field="items[2]"]`), "Geduld");
    assert.equal(list.items[2], "Geduld");
});

test("url and alt inputs write through, and facts of overview and teachers are editable", () => {
    const { state, query, input, type } = setup(fixture("example-complete"));
    const link = state.document.sections[2].subsections[1].blocks[0];
    input(query(`[data-block-id="${link.id}"] input[data-field="url"]`), "https://example.org/neu");
    assert.equal(link.url, "https://example.org/neu");

    const banner = state.document.sections[1].subsections[0].blocks[1];
    input(
        query(`[data-block-id="${banner.id}"] input[data-field="alt"]`),
        "Campus im Sonnenschein",
    );
    assert.equal(banner.alt, "Campus im Sonnenschein");

    const overview = section(state, "overview");
    type(
        query(`[data-section-id="${overview.id}"] [data-field="fields.facts.duration"]`),
        "6 Stunden",
    );
    assert.equal(overview.fields.facts.duration, "6 Stunden");

    const teachers = section(state, "teachers");
    type(query(`[data-section-id="${teachers.id}"] [data-field="fields.quote.author"]`), "Jemand");
    assert.equal(teachers.fields.quote.author, "Jemand");
    type(
        query(`[data-section-id="${teachers.id}"] [data-field="fields.facts.schoolTypes"]`),
        "Alle",
    );
    assert.equal(teachers.fields.facts.schoolTypes, "Alle");
});

test("Enter is blocked in single-line fields and allowed in multi-line fields", () => {
    const { window, query } = setup();
    const title = query("#overview-workshop-name");
    const enter = () =>
        new window.KeyboardEvent("keydown", { key: "Enter", bubbles: true, cancelable: true });
    const single = enter();
    title.dispatchEvent(single);
    assert.equal(single.defaultPrevented, true);
    const text = query('[data-field="text"][data-multiline]');
    const multi = enter();
    text.dispatchEvent(multi);
    assert.equal(multi.defaultPrevented, false);
});

test("pasting inserts plain text, collapsing newlines in single-line fields", () => {
    const { window, state, query } = setup();
    const title = query("#overview-workshop-name");
    const paste = new window.Event("paste", { bubbles: true, cancelable: true });
    Object.defineProperty(paste, "clipboardData", { value: { getData: () => "Zeile 1\nZeile 2" } });
    title.dispatchEvent(paste);
    assert.equal(paste.defaultPrevented, true);
    assert.equal(state.document.title, "Zeile 1 Zeile 2");
    assert.equal(title.querySelector("*"), null);
});

test("multi-line text survives the preview toggle and a JSON round trip", () => {
    const { state, query, type, editor } = setup();
    const text = state.document.sections[0].subsections[0].blocks[1];
    type(query(`[data-block-id="${text.id}"]`), "Zeile 1\nZeile 2");
    assert.equal(text.text, "Zeile 1\nZeile 2");
    editor.setPreview(true);
    assert.equal(query(".block-text").textContent, "Zeile 1\nZeile 2");
    assert.equal(query("[contenteditable]"), null);
    editor.setPreview(false);
    assert.equal(query(`[data-block-id="${text.id}"]`).textContent, "Zeile 1\nZeile 2");
    const copy = JSON.parse(JSON.stringify(state.document));
    assert.equal(copy.sections[0].subsections[0].blocks[1].text, "Zeile 1\nZeile 2");
});

test("preview shows the read-only page and switching back keeps edits and the single listener", () => {
    const { state, query, type, editor, disconnects } = setup();
    type(query("#overview-workshop-name"), "Aliens");
    const before = disconnects();
    editor.setPreview(true);
    assert.equal(disconnects(), before + 1);
    assert.equal(
        query("#workshop-content > section"),
        null,
        "empty sections are omitted in preview",
    );
    editor.setPreview(false);
    assert.equal(disconnects(), before + 2);
    assert.equal(query("#overview-workshop-name").textContent, "Aliens");

    const changes = [];
    state.addEventListener("change", (event) => changes.push(event.detail));
    type(query("#overview-workshop-name"), "Aliens 2");
    assert.equal(changes.filter((c) => c.field === "title").length, 1);
});

test("loading another document re-renders once and disposal removes the listeners", () => {
    const { state, query, type, editor, disconnects } = setup();
    const before = disconnects();
    state.load(fixture("example-complete"));
    assert.equal(disconnects(), before + 1);
    assert.equal(query("h1").textContent, "Beispielworkshop mit allen Inhalten");
    const changes = [];
    state.addEventListener("change", (event) => changes.push(event.detail));
    type(query("#overview-workshop-name"), "Geändert");
    assert.equal(changes.length, 1);

    editor.dispose();
    assert.equal(disconnects(), before + 2);
    assert.equal(query("#overview-workshop-name"), null);
});

test("settings write teaser, subject, tags, published and moreInfoUrl; the link appears on the page", () => {
    const { state, settings, query, input, window } = setup();
    const form = settings.form;
    input(form.elements.teaser, "Kurz und gut");
    assert.equal(state.document.teaser, "Kurz und gut");
    input(form.elements.subject, "SK");
    assert.equal(state.document.subject, "SK");
    input(form.elements.tags, " a, b ,, c ");
    assert.deepEqual(state.document.tags, ["a", "b", "c"]);
    form.elements.published.checked = true;
    form.elements.published.dispatchEvent(new window.Event("input", { bubbles: true }));
    assert.equal(state.document.published, true);
    input(form.elements.moreInfoUrl, "https://example.org/mehr");
    assert.equal(state.document.moreInfoUrl, "https://example.org/mehr");
    assert.equal(
        query('#overview-intro a[href="https://example.org/mehr"]').textContent,
        "Weitere Informationen",
    );
});

test("an incomplete grade range stays in the form, is reported, and never becomes a range", () => {
    const { state, settings, panel, input } = setup();
    const form = settings.form;
    input(form.elements.gradeMin, "5");
    assert.equal(state.document.gradeRange, null);
    assert.equal(settings.getPendingErrors().length, 1);
    assert.equal(form.querySelector("#editor-grade-hint").hidden, false);
    const publishErrors = panel.checkPublish();
    assert.ok(publishErrors.some((error) => error.path === "gradeRange"));

    input(form.elements.gradeMax, "10");
    assert.deepEqual(state.document.gradeRange, { min: 5, max: 10 });
    assert.equal(settings.getPendingErrors().length, 0);

    input(form.elements.gradeMax, "3");
    assert.deepEqual(
        state.document.gradeRange,
        { min: 5, max: 10 },
        "invalid order leaves the last range",
    );
    assert.match(settings.getPendingErrors()[0].message, /nicht größer/);

    input(form.elements.gradeMin, "");
    input(form.elements.gradeMax, "");
    assert.equal(state.document.gradeRange, null);
    assert.equal(settings.getPendingErrors().length, 0);
});

test("the slug field follows the title, locks on edit and resumes when cleared", () => {
    const { state, settings, query, type, input } = setup();
    const slug = settings.form.elements.slug;
    type(query("#overview-workshop-name"), "Al(l)iens – wir sind alle anders!");
    assert.equal(slug.value, "al-l-iens-wir-sind-alle-anders");
    input(slug, "aliens");
    assert.equal(state.document.slug, "aliens");
    type(query("#overview-workshop-name"), "Anderer Titel");
    assert.equal(slug.value, "aliens");
    input(slug, "");
    type(query("#overview-workshop-name"), "Dritter Titel");
    assert.equal(slug.value, "dritter-titel");
});

test("the panel reports draft state, publish readiness and the recommended checklist", async () => {
    const { window, state, panel, query, type } = setup();
    assert.equal(query(".editor-status-summary").textContent, "Entwurf gültig");
    assert.equal(
        query(".editor-status-checklist").children.length,
        2,
        "schedule and learning content",
    );

    const errors = panel.checkPublish();
    assert.deepEqual(errors.map((error) => error.path).sort(), [
        "sections[0].subsections[0]",
        "slug",
        "teaser",
        "thumbnail.src",
        "title",
    ]);
    assert.match(query(".editor-status-summary").textContent, /^5 Punkte/);
    assert.equal(query(".editor-status-details").hidden, false);

    type(query("#overview-workshop-name"), "Aliens");
    await new Promise((resolve) => setTimeout(resolve, 400));
    assert.equal(
        query(".editor-status-summary").textContent,
        "Entwurf gültig",
        "typing returns to draft mode",
    );

    const complete = fixture("example-complete");
    state.load(complete, { files: filesFor(window, complete) });
    assert.equal(query(".editor-status-checklist").children.length, 0);
    assert.deepEqual(panel.checkPublish(), []);
    assert.equal(query(".editor-status-summary").textContent, "Bereit zur Veröffentlichung");
});

test("pending grade errors update and clear the panel without changing the document", async () => {
    const { state, settings, panel, query, input } = setup(fixture("example-complete"), {
        withFiles: true,
    });
    const min = settings.form.elements.gradeMin;
    const changes = [];
    state.addEventListener("change", (event) => changes.push(event.detail));
    assert.deepEqual(panel.checkPublish(), []);

    input(min, "");
    await new Promise((resolve) => setTimeout(resolve, 400));
    assert.equal(query(".editor-status-summary").textContent, "1 Fehler im Entwurf");
    assert.match(query(".editor-status-errors").textContent, /gradeRange/);
    assert.deepEqual(state.document.gradeRange, { min: 5, max: 10 });

    input(min, "5");
    await new Promise((resolve) => setTimeout(resolve, 400));
    assert.equal(query(".editor-status-summary").textContent, "Entwurf gültig");
    assert.equal(query(".editor-status-errors").children.length, 0);
    assert.equal(changes.length, 0, "only the pending form error changed");
});

test("clearing an unfinished grade range clears its live error when the stored range is null", async () => {
    const { state, settings, query, input } = setup();
    const min = settings.form.elements.gradeMin;
    input(min, "5");
    await new Promise((resolve) => setTimeout(resolve, 400));
    assert.equal(query(".editor-status-summary").textContent, "1 Fehler im Entwurf");

    input(min, "");
    await new Promise((resolve) => setTimeout(resolve, 400));
    assert.equal(state.document.gradeRange, null);
    assert.equal(query(".editor-status-summary").textContent, "Entwurf gültig");
    assert.equal(query(".editor-status-errors").children.length, 0);
});

test("error entries locate page elements and settings inputs", () => {
    const { state, editor, settings, query } = setup(fixture("example-complete"));
    const teachers = section(state, "teachers");
    assert.equal(editor.locate("title"), query("#overview-workshop-name"));
    assert.equal(editor.locate("sections[0].subsections[0]"), query('[data-kind="description"]'));
    assert.equal(
        editor.locate("sections[3].fields.facts.schoolTypes"),
        query(`[data-section-id="${teachers.id}"] [data-field="fields.facts.schoolTypes"]`),
    );
    const banner = state.document.sections[1].subsections[0].blocks[1];
    assert.equal(
        editor.locate("sections[1].subsections[0].blocks[1].alt"),
        query(`[data-block-id="${banner.id}"] input[data-field="alt"]`),
    );
    assert.equal(editor.locate("teaser"), null);
    settings.form.parentElement.open = false;
    assert.equal(settings.locate("teaser"), settings.form.elements.teaser);
    assert.equal(settings.form.parentElement.open, true, "locating a field opens the settings box");
    assert.equal(settings.locate("gradeRange"), settings.form.elements.gradeMin);
    assert.equal(editor.locate("sections[9].title"), null);
});

test("editing a block that was added to the document works after reindexing", () => {
    const { state, query, type, editor } = setup();
    const description = state.document.sections[0].subsections[0];
    const block = createBlock("text");
    description.blocks.push(block);
    state.reindex();
    editor.refresh();
    type(query(`[data-block-id="${block.id}"]`), "Nachtrag");
    assert.equal(block.text, "Nachtrag");
});
