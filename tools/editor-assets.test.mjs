import { test } from "node:test";
import assert from "node:assert/strict";
import {
    createEmptyWorkshop,
    createBlock,
    isAssetPath,
    validateWorkshop,
} from "../app/assets/js/workshop-schema.mjs";
import { ROOT_OWNER } from "../app/workshop_creator/JS/editor-state.mjs";
import {
    normaliseFileName,
    uniqueAssetPath,
    isImageFile,
    collectAssetReferences,
} from "../app/workshop_creator/JS/editor-assets.mjs";
import { setup, fixture, filesFor, PLACEHOLDER } from "./editor-harness.mjs";

const pickerOf = (query, blockId, prefix = "") =>
    query(`[data-block-id="${blockId}"] ${prefix} .editor-asset-controls button`);

// ---------------------------------------------------------------------------------------
// File names and paths
// ---------------------------------------------------------------------------------------

test("file names are normalised to the schema grammar and keep their real extension", () => {
    assert.equal(normaliseFileName("Foto Größe.JPG"), "foto-groesse.jpg");
    assert.equal(
        normaliseFileName("Übersicht_März 2026 (final).PDF"),
        "uebersicht-maerz-2026-final.pdf",
    );
    assert.equal(normaliseFileName("scan.jpeg"), "scan.jpeg");
    assert.equal(normaliseFileName("archive.tar.gz"), "archive-tar.gz");
    assert.equal(normaliseFileName("---.png", { location: "image" }), "bild.png");
    assert.equal(normaliseFileName("clipboard", { type: "image/png" }), "clipboard.png");
    assert.equal(normaliseFileName("README"), null);
    assert.equal(normaliseFileName(".hidden"), null);
    assert.equal(normaliseFileName("x", { type: "constructor" }), null);
    for (const name of ["Foto Größe.JPG", "a b c.WebP", "---.png", "x".repeat(300) + ".png"]) {
        assert.ok(
            isAssetPath(`images/${normaliseFileName(name, { location: "image" })}`, "image"),
            name,
        );
    }
    assert.ok(isImageFile({ name: "a.png", type: "image/png" }));
    assert.ok(isImageFile({ name: "a.JPG", type: "" }));
    assert.ok(!isImageFile({ name: "a.pdf", type: "application/pdf" }));
});

test("taken paths get numeric suffixes, whether selected or only referenced by the document", () => {
    const taken = new Set(["images/experiment.jpg", "images/experiment-2.jpg"]);
    assert.equal(uniqueAssetPath("image", "experiment.jpg", taken), "images/experiment-3.jpg");
    assert.equal(uniqueAssetPath("file", "experiment.jpg", taken), "files/experiment.jpg");
    assert.equal(
        uniqueAssetPath("thumbnail", "kachel.png", new Set(["kachel.png"])),
        "kachel-2.png",
    );
    assert.throws(() => uniqueAssetPath("video", "a.mp4", new Set()), RangeError);

    const { state, assets, file } = setup();
    const description = state.document.sections[0].subsections[0];
    const first = state.addBlock(description.id, "image");
    const second = state.addBlock(description.id, "image");
    const original = file("Experiment.JPG");
    assert.equal(
        assets.choose({ owner: first.id, field: "src", location: "image" }, original),
        "images/experiment.jpg",
    );
    assert.equal(
        assets.choose(
            { owner: second.id, field: "src", location: "image" },
            file("experiment.jpg"),
        ),
        "images/experiment-2.jpg",
    );
    assert.equal(state.files.get("images/experiment.jpg"), original, "never overwritten");

    const overview = state.document.sections[0];
    state.set(overview.id, "fields.heroImage.src", "images/hero.jpg");
    assert.equal(
        assets.choose({ owner: first.id, field: "src", location: "image" }, file("hero.jpg")),
        "images/hero-2.jpg",
    );
    assert.equal(state.files.has("images/experiment.jpg"), false, "the replaced file is released");
    assert.equal(
        assets.choose(
            { owner: ROOT_OWNER, field: "thumbnail.src", location: "thumbnail" },
            file("Kachel.PNG", "image/png"),
        ),
        "kachel.png",
    );
    assert.deepEqual(validateWorkshop(state.document), []);
});

test("asset references cover thumbnail, hero, image, gallery, portrait and file fields", () => {
    const references = collectAssetReferences(fixture("example-complete"));
    assert.deepEqual(
        references.map((reference) => [reference.errorPath, reference.path]),
        [
            ["thumbnail.src", "thumbnail.jpg"],
            ["sections[0].fields.heroImage.src", "images/hero.jpg"],
            ["sections[1].subsections[0].blocks[1].src", "images/campus.jpg"],
            ["sections[2].subsections[0].blocks[0].file", "files/arbeitsblatt-station-1.pdf"],
            ["sections[2].subsections[0].blocks[1].file", "files/folien.pdf"],
            ["sections[3].subsections[2].blocks[0].src", "images/lehrplan-nrw.jpg"],
            ["sections[4].subsections[0].blocks[0].images[0].src", "images/illustration-1.jpg"],
            ["sections[4].subsections[0].blocks[0].images[1].src", "images/illustration-2.jpg"],
            ["sections[4].subsections[1].blocks[0].images[0].src", "images/wald.jpg"],
            ["sections[5].subsections[0].blocks[0].people[0].image.src", "images/portrait.jpg"],
        ],
    );
    assert.equal(references[9].field, "people[0].image.src");
    assert.equal(references[0].owner, ROOT_OWNER);
});

// ---------------------------------------------------------------------------------------
// Picker
// ---------------------------------------------------------------------------------------

test("choosing, replacing and removing an image updates the reference, the page and the focus", async () => {
    const { state, query, dom, file, pickFile } = setup();
    const block = state.addBlock(state.document.sections[0].subsections[0].id, "image");
    const picker = () => pickerOf(query, block.id);
    assert.equal(picker().textContent, "Bild wählen");
    assert.ok(query(`[data-block-id="${block.id}"]`).classList.contains("is-empty"));

    await pickFile(picker(), file("Foto.jpg"));
    assert.equal(block.src, "images/foto.jpg");
    assert.equal(picker().textContent, "Bild ersetzen");
    assert.equal(dom.activeElement, picker());
    assert.ok(query(`[data-block-id="${block.id}"] img`));

    await pickFile(picker(), file("Neu.png", "image/png"));
    assert.equal(block.src, "images/neu.png");
    assert.deepEqual([...state.files.keys()], ["images/neu.png"]);

    query(`[data-block-id="${block.id}"] [data-action="remove-asset"]`).click();
    assert.equal(block.src, "");
    assert.equal(state.files.size, 0);
    assert.equal(dom.activeElement, picker());
    assert.equal(picker().textContent, "Bild wählen");
});

test("a cancelled or unsuitable selection keeps the existing asset", async () => {
    const { window, state, query, file, pickFile, settle } = setup();
    const block = state.addBlock(state.document.sections[0].subsections[0].id, "image");
    const picker = () => pickerOf(query, block.id);
    await pickFile(picker(), file("Foto.jpg"));
    const chosen = state.files.get("images/foto.jpg");

    await pickFile(picker(), file("notizen.pdf", "application/pdf"));
    assert.equal(block.src, "images/foto.jpg");
    assert.equal(state.files.get("images/foto.jpg"), chosen);
    assert.equal(
        query(`[data-block-id="${block.id}"] .editor-asset-status`).textContent,
        "Bitte eine Bilddatei wählen.",
    );

    await pickFile(picker(), null);
    picker().click();
    query(".editor-file-input").dispatchEvent(new window.Event("cancel"));
    await settle();
    assert.equal(block.src, "images/foto.jpg");
    assert.deepEqual([...state.files.keys()], ["images/foto.jpg"]);

    const fileBlock = state.addBlock(state.document.sections[0].subsections[0].id, "file");
    await pickFile(pickerOf(query, fileBlock.id), file("ohne-endung", ""));
    assert.equal(fileBlock.file, "");
    await pickFile(pickerOf(query, fileBlock.id), file("Arbeitsblatt 1.PDF", "application/pdf"));
    assert.equal(fileBlock.file, "files/arbeitsblatt-1.pdf");
});

test("picker results follow a moved entry and are ignored when the target was removed or replaced", async () => {
    const { state, query, file, answerPicker } = setup();
    const gallery = state.addBlock(state.document.sections[0].subsections[0].id, "gallery");
    state.addItem(gallery.id, "images");
    state.addItem(gallery.id, "images");
    const picker = (index) => pickerOf(query, gallery.id, `[data-item="images[${index}]"]`);

    const second = gallery.images[1];
    picker(1).click();
    state.moveItem(gallery.id, "images[1]", -1);
    await answerPicker(file("verschoben.jpg"));
    assert.equal(gallery.images[0], second);
    assert.equal(second.src, "images/verschoben.jpg");

    picker(1).click();
    state.removeItem(gallery.id, "images[1]");
    await answerPicker(file("entfernt.jpg"));
    assert.deepEqual(
        gallery.images.map((image) => image.src),
        ["images/verschoben.jpg"],
    );
    assert.equal(state.files.has("images/entfernt.jpg"), false);

    picker(0).click();
    state.set(gallery.id, "images[0].src", "");
    await answerPicker(file("zu-spaet.jpg"));
    assert.equal(gallery.images[0].src, "");
    assert.equal(state.files.size, 0);

    picker(0).click();
    state.load(fixture("draft-minimal"));
    await answerPicker(file("anderes-dokument.jpg"));
    assert.equal(state.files.size, 0);
});

// ---------------------------------------------------------------------------------------
// Object URLs and cleanup
// ---------------------------------------------------------------------------------------

test("object URLs are created once per file, reused across renders and preview, and revoked when released", async () => {
    const { state, editor, urls, query, file, pickFile } = setup();
    const description = state.document.sections[0].subsections[0];
    const block = state.addBlock(description.id, "image");
    const image = () => query(`[data-block-id="${block.id}"] img, .block-image img`);

    await pickFile(pickerOf(query, block.id), file("a.jpg"));
    const first = image().getAttribute("src");
    assert.deepEqual(urls.created, [first]);

    editor.setPreview(true);
    assert.equal(query(".block-image img").getAttribute("src"), first);
    editor.setPreview(false);
    editor.refresh();
    state.addBlock(description.id, "text");
    assert.equal(image().getAttribute("src"), first);
    assert.equal(urls.created.length, 1, "renders reuse the cached URL");

    await pickFile(pickerOf(query, block.id), file("b.jpg"));
    const second = image().getAttribute("src");
    assert.deepEqual(urls.revoked, [first]);

    query(`[data-block-id="${block.id}"] [data-action="remove-asset"]`).click();
    assert.deepEqual(urls.revoked, [first, second]);
    assert.equal(urls.live.size, 0);
});

test("a path shared by two fields keeps its file and URL until the last reference goes", () => {
    const document = createEmptyWorkshop();
    const description = document.sections[0].subsections[0];
    const image = { ...createBlock("image"), src: "images/geteilt.jpg", alt: "A" };
    const gallery = createBlock("gallery");
    gallery.images.push({ src: "images/geteilt.jpg", alt: "B", caption: "", width: "full" });
    description.blocks.push(image, gallery);
    const { state, urls, query } = setup(document, { withFiles: true });

    const url = query(`[data-block-id="${image.id}"] img`).getAttribute("src");
    assert.equal(query(`[data-block-id="${gallery.id}"] img`).getAttribute("src"), url);
    assert.equal(urls.created.length, 1);

    state.remove(image.id);
    assert.ok(state.files.has("images/geteilt.jpg"));
    assert.deepEqual(urls.revoked, []);

    state.removeItem(gallery.id, "images[0]");
    assert.equal(state.files.has("images/geteilt.jpg"), false);
    assert.deepEqual(urls.revoked, [url]);
});

test("removing a subsection or a custom section releases the files only it referenced", () => {
    const { state, assets, urls, file } = setup();
    const section = state.addSection();
    const subsection = state.addSubsection(section.id, "custom");
    const people = state.addBlock(subsection.id, "people");
    const person = state.addItem(people.id, "people");
    assets.choose(
        { owner: people.id, field: `${person}.image.src`, location: "image" },
        file("portrait.jpg"),
    );
    const download = state.addBlock(subsection.id, "file");
    assets.choose(
        { owner: download.id, field: "file", location: "file" },
        file("Plan.pdf", "application/pdf"),
    );
    assert.deepEqual([...state.files.keys()].sort(), ["files/plan.pdf", "images/portrait.jpg"]);
    assert.equal(urls.live.size, 1, "only the portrait is shown while editing");

    state.remove(subsection.id);
    assert.equal(state.files.size, 0);
    assert.equal(urls.live.size, 0);

    const again = state.addSubsection(section.id, "custom");
    const block = state.addBlock(again.id, "image");
    assets.choose({ owner: block.id, field: "src", location: "image" }, file("x.jpg"));
    state.remove(section.id);
    assert.equal(state.files.size, 0);
    assert.equal(urls.live.size, 0);
});

test("replacing the document drops files and URLs; a rejected import keeps them", () => {
    const { window, state, assets, urls, query, file } = setup();
    const block = state.addBlock(state.document.sections[0].subsections[0].id, "image");
    assets.choose({ owner: block.id, field: "src", location: "image" }, file("a.jpg"));
    assert.equal(urls.live.size, 1);

    const invalid = fixture("example-complete");
    invalid.moreInfoUrl = "javascript:alert(1)";
    assert.throws(() => state.load(invalid), /Validierungsfehler/);
    assert.deepEqual([...state.files.keys()], ["images/a.jpg"]);
    assert.equal(query(`[data-block-id="${block.id}"] img`).getAttribute("src"), [...urls.live][0]);

    state.load(fixture("example-complete"));
    assert.equal(state.files.size, 0);
    assert.equal(urls.live.size, 0);

    const complete = fixture("example-complete");
    state.load(complete, { files: filesFor(window, complete) });
    assert.deepEqual(assets.missing(), []);
});

test("missing images show the placeholder and missing downloads stay unlinked", () => {
    const { state, editor, query, queryAll } = setup(fixture("example-complete"));
    assert.equal(query("#overview-img").getAttribute("src"), PLACEHOLDER);
    assert.equal(
        query('[data-block-id="blk-worksheet"] .editor-asset-status').textContent,
        "Datei fehlt",
    );
    assert.equal(
        query('[data-block-id="blk-intro-banner"] .editor-asset-status').textContent,
        "Bilddatei fehlt",
    );

    editor.setPreview(true);
    const links = queryAll(".block-file a");
    assert.equal(links.length, 2);
    assert.ok(links.every((link) => !link.hasAttribute("href")));
    assert.ok(queryAll("img").every((image) => image.getAttribute("src") === PLACEHOLDER));
    assert.equal(state.files.size, 0);
});

test("chosen downloads link to their object URL with the file name in preview", async () => {
    const { state, editor, query, file, pickFile, urls } = setup();
    const block = state.addBlock(state.document.sections[0].subsections[0].id, "file");
    await pickFile(pickerOf(query, block.id), file("Plan A.pdf", "application/pdf"));
    assert.equal(query(`[data-block-id="${block.id}"] .file-path`).textContent, "files/plan-a.pdf");
    editor.setPreview(true);
    const link = query(".block-file a");
    assert.equal(link.getAttribute("href"), urls.created.at(-1));
    assert.equal(link.getAttribute("download"), "plan-a.pdf");
});

// ---------------------------------------------------------------------------------------
// Thumbnail, validation and teardown
// ---------------------------------------------------------------------------------------

test("the thumbnail picker in the settings stores a root-level file with preview and alt text", async () => {
    const { state, settings, dom, urls, input, file, pickFile } = setup();
    const picker = () =>
        settings.form.querySelector(".editor-thumbnail .editor-asset-controls button");
    assert.equal(picker().textContent, "Bild wählen");

    await pickFile(picker(), file("Kachel Bild.PNG", "image/png"));
    assert.equal(state.document.thumbnail.src, "kachel-bild.png");
    assert.equal(
        settings.form.querySelector(".editor-thumbnail-preview img").getAttribute("src"),
        urls.created.at(-1),
    );
    assert.equal(dom.activeElement, picker());
    assert.equal(settings.locate("thumbnail"), picker());

    input(settings.form.elements.thumbnailAlt, "Kinder an Tablets");
    assert.equal(state.document.thumbnail.alt, "Kinder an Tablets");

    settings.form.querySelector('.editor-thumbnail [data-action="remove-asset"]').click();
    assert.equal(state.document.thumbnail.src, "");
    assert.equal(state.files.size, 0);
    assert.equal(urls.live.size, 0);
});

test("missing files are errors in both modes, locate their picker after reordering, and prevent “Bereit”", () => {
    const { state, panel, query, queryAll, dom, settings } = setup(fixture("example-complete"), {
        withFiles: true,
    });
    assert.deepEqual(panel.checkPublish(), []);
    assert.equal(query(".editor-status-summary").textContent, "Bereit zur Veröffentlichung");

    state.files.delete("images/wald.jpg");
    assert.deepEqual(
        panel.checkPublish().map((error) => error.path),
        ["sections[4].subsections[1].blocks[0].images[0].src"],
    );
    assert.equal(query(".editor-status-summary").textContent, "1 Punkt vor der Veröffentlichung");

    state.move("blk-gallery", 1);
    assert.deepEqual(
        queryAll(".editor-status-error code").map((code) => code.textContent),
        ["sections[4].subsections[1].blocks[1].images[0].src"],
    );
    assert.equal(query(".editor-status-summary").textContent, "1 Fehler im Entwurf");
    query(".editor-status-error").click();
    assert.equal(dom.activeElement, pickerOf(query, "blk-gallery", '[data-item="images[0]"]'));

    state.files.delete("thumbnail.jpg");
    panel.refresh();
    const thumbnailError = queryAll(".editor-status-error").find((entry) =>
        entry.textContent.startsWith("thumbnail.src"),
    );
    thumbnailError.click();
    assert.equal(dom.activeElement, settings.locate("thumbnail"));
});

test("disposing every module removes its listeners, URLs and picker", () => {
    const { state, assets, editor, panel, settings, urls, query, file, disconnects } = setup();
    const block = state.addBlock(state.document.sections[0].subsections[0].id, "image");
    assets.choose({ owner: block.id, field: "src", location: "image" }, file("a.jpg"));
    const pending = assets.pick({ owner: block.id, field: "src", location: "image" });
    assert.ok(query(".editor-file-input"));

    editor.dispose();
    panel.dispose();
    settings.dispose();
    assets.dispose();
    assert.equal(urls.live.size, 0);
    assert.equal(query(".editor-file-input"), null);

    const renders = disconnects();
    state.addSection();
    state.remove(block.id);
    state.set(ROOT_OWNER, "title", "Nach dem Abbau");
    assert.equal(disconnects(), renders, "no render after dispose");
    assert.equal(query("#workshop-content"), null);
    assert.equal(query(".editor-status"), null);
    assert.equal(state.files.size, 1, "a disposed manager no longer sweeps");
    return pending.then((outcome) => assert.equal(outcome.status, "stale"));
});
