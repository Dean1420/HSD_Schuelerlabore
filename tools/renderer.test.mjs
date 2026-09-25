import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { JSDOM } from "jsdom";
import {
    createEmptyWorkshop,
    createBlock,
    createSection,
    createSubsection,
} from "../app/assets/js/workshop-schema.mjs";
import { renderWorkshop } from "../app/assets/js/renderer/render-workshop.mjs";
import {
    renderBlock,
    linkFallbackText,
    fileFallbackText,
} from "../app/assets/js/renderer/render-blocks.mjs";
import { encodeAnchor, sectionAnchor } from "../app/assets/js/renderer/anchors.mjs";

function dom() {
    return new JSDOM("<!doctype html><html><body></body></html>").window.document;
}

function fixture(name) {
    return JSON.parse(
        readFileSync(
            new URL(`../app/workshops/_fixtures/${name}/workshop.json`, import.meta.url),
            "utf8",
        ),
    );
}

function render(workshop, options = {}) {
    return renderWorkshop(workshop, { dom: dom(), ...options });
}

function contextFor(document, editable = false) {
    return { workshop: null, editable, resolveAsset: (path) => path, dom: document };
}

const texts = (root, selector) =>
    [...root.querySelectorAll(selector)].map((n) => n.textContent.trim());

test("complete fixture renders all sections with contiguous numbers and matching navigation", () => {
    const main = render(fixture("example-complete"));
    assert.equal(main.tagName, "MAIN");
    assert.ok(main.classList.contains("workshop-page"));

    const sections = [...main.querySelectorAll("#workshop-content > section")];
    assert.equal(sections.length, 7);
    assert.deepEqual(
        sections.map((s) => s.querySelector(".workshop-navigation-number").textContent),
        ["01", "02", "03", "04", "05", "06", "07"],
    );
    const links = [...main.querySelectorAll("#workshop-navigation-link-container a")];
    assert.deepEqual(
        links.map((a) => a.getAttribute("href")),
        sections.map((s) => `#${s.id}`),
    );
    assert.deepEqual(
        links.map((a) => a.querySelector(".navigation-text").textContent),
        [
            "Übersicht",
            "Anleitung",
            "Materialien",
            "Für Lehrende",
            "Impressionen",
            "Ansprechpartner",
            "Weitere Hinweise",
        ],
    );
    assert.equal(main.querySelector("nav").getAttribute("aria-label"), "Workshop-Abschnitte");
});

test("heading hierarchy: one h1, an h2 per section, an h3 per subsection, h4 per phase", () => {
    const main = render(fixture("example-complete"));
    assert.deepEqual(texts(main, "h1"), ["Beispielworkshop mit allen Inhalten"]);
    assert.equal(main.querySelectorAll("h2").length, 7);
    for (const section of main.querySelectorAll("#workshop-content > section")) {
        const heading = section.querySelector("h2");
        assert.equal(section.getAttribute("aria-labelledby"), heading.id);
        assert.ok(heading.textContent.trim().length > 3, section.id);
    }
    assert.ok(texts(main, "h3").includes("Lerninhalt"));
    assert.ok(texts(main, "h3").includes("Glossar"));
    assert.ok(texts(main, "h3").includes("Rahmenbedingungen"));
    assert.deepEqual(texts(main, "h4"), [
        "Phase 1 – Ankommen & Sensibilisierung",
        "Phase 2 – Die interaktive Reise",
    ]);
});

test("empty sections are omitted in read-only mode and numbering re-flows", () => {
    const ws = fixture("example-complete");
    const instructions = ws.sections.find((s) => s.kind === "instructions");
    instructions.subsections = [];
    const main = render(ws);
    const numbers = [...main.querySelectorAll("#workshop-content > section")].map(
        (s) => `${s.querySelector(".workshop-navigation-number").textContent} ${s.id}`,
    );
    assert.deepEqual(numbers.slice(0, 3), ["01 overview", "02 materials", "03 teachers"]);
    assert.equal(main.querySelector("#instructions"), null);
    assert.equal(main.querySelectorAll("#workshop-navigation-link-container a").length, 6);
});

test("phase numbers follow visible groups and stay outside editable titles", () => {
    const step = { title: "Tätigkeit", duration: "", description: "", method: "" };
    const block = {
        ...createBlock("phases"),
        phases: [
            { title: "", steps: [] },
            { title: "Phase 8 – Einführung", steps: [step] },
            { title: "", steps: [step] },
            { title: "Vertiefung", steps: [step, step] },
        ],
    };
    const original = structuredClone(block);
    const readOnly = renderBlock(block, contextFor(dom()));
    assert.deepEqual(texts(readOnly, ".phase-title"), [
        "Phase 1 – Einführung",
        "Phase 2",
        "Phase 3 – Vertiefung",
    ]);
    assert.equal(readOnly.querySelectorAll(".phase:last-child .step").length, 2);

    const editable = renderBlock(block, contextFor(dom(), true));
    assert.deepEqual(texts(editable, ".phase-number"), [
        "Phase 1",
        "Phase 2",
        "Phase 3",
        "Phase 4",
    ]);
    const title = editable.querySelector('[data-field="phases[1].title"]');
    assert.equal(title.textContent, "Einführung");
    assert.equal(title.getAttribute("contenteditable"), "plaintext-only");
    assert.equal(editable.querySelector(".phase-number").closest("[contenteditable]"), null);
    assert.deepEqual(block, original);
});

test("the minimal draft renders nothing read-only and everything in editable mode", () => {
    const ws = fixture("draft-minimal");
    const readOnly = render(ws);
    assert.equal(readOnly.querySelectorAll("#workshop-content > section").length, 0);
    assert.equal(readOnly.querySelectorAll("#workshop-navigation-link-container a").length, 0);

    const editable = render(ws, { editable: true });
    const sections = [...editable.querySelectorAll("#workshop-content > section")];
    assert.equal(sections.length, 6);
    assert.deepEqual(
        sections.map((s) => s.getAttribute("data-section-id")),
        ["s1", "s2", "s3", "s4", "s5", "s6"],
    );
    assert.deepEqual(texts(editable, ".navigation-text"), [
        "Übersicht",
        "Anleitung",
        "Materialien",
        "Für Lehrende",
        "Impressionen",
        "Ansprechpartner",
    ]);
});

test("editable mode marks subsections and blocks with their identifiers", () => {
    const ws = createEmptyWorkshop();
    const main = render(ws, { editable: true });
    const description = ws.sections[0].subsections[0];
    const node = main.querySelector(`[data-subsection-id="${description.id}"]`);
    assert.ok(node);
    assert.deepEqual(
        [...node.querySelectorAll("[data-block-id]")].map((b) => b.getAttribute("data-block-id")),
        description.blocks.map((b) => b.id),
    );
    const expected = ws.sections.flatMap((s) => s.subsections.flatMap((sub) => sub.blocks)).length;
    assert.equal(main.querySelectorAll("[data-block-id]").length, expected);
});

test("blank titles fall back to default titles; custom subsections without title get no heading", () => {
    const ws = fixture("example-complete");
    const teachers = ws.sections.find((s) => s.kind === "teachers");
    teachers.title = "   ";
    teachers.subsections.find((s) => s.kind === "learningContent").title = "";
    const custom = ws.sections.find((s) => s.kind === "custom");
    custom.subsections[0].title = "";
    const main = render(ws);
    assert.equal(main.querySelector("#teachers h2").textContent.trim(), "04 Für Lehrende");
    assert.ok(texts(main, "#teachers h3").includes("Lerninhalt"));
    const customSection = main.querySelector("#workshop-content > section[data-kind='custom']");
    assert.equal(customSection.querySelector("h3"), null);
    assert.equal(
        customSection.querySelector(".blocks p").textContent,
        "Für heterogene Lerngruppen stehen Stationen in zwei Schwierigkeitsgraden bereit.",
    );
});

test("assets are resolved through the context, alt text and lazy loading come from data", () => {
    const main = render(fixture("example-complete"), {
        resolveAsset: (path) => `workshops/x/${path}`,
    });
    const hero = main.querySelector("#overview-img");
    assert.equal(hero.getAttribute("src"), "workshops/x/images/hero.jpg");
    assert.equal(hero.getAttribute("alt"), "");
    assert.equal(hero.getAttribute("loading"), "eager");
    const gallery = main.querySelector(".block-gallery img");
    assert.equal(gallery.getAttribute("src"), "workshops/x/images/illustration-1.jpg");
    assert.equal(gallery.getAttribute("alt"), "Illustration zweier Personen an einem Tisch");
    assert.equal(gallery.getAttribute("loading"), "lazy");
    assert.equal(gallery.getAttribute("decoding"), "async");
    const file = main.querySelector(".block-file a");
    assert.equal(file.getAttribute("href"), "workshops/x/files/arbeitsblatt-station-1.pdf");
    assert.equal(file.getAttribute("download"), "arbeitsblatt-station-1.pdf");
});

test("overview facts render as a definition list and teacher quick facts include the grade range", () => {
    const main = render(fixture("example-complete"));
    const facts = main.querySelector(".facts");
    assert.equal(facts.tagName, "DL");
    assert.deepEqual(texts(facts, "dt"), [
        "Durchführungsort",
        "Gruppengröße",
        "Themen des Workshops",
        "Fachliche Voraussetzungen",
        "Workshop-Dauer",
    ]);
    const quick = main.querySelector("#teachers-quick-facts");
    assert.deepEqual(texts(quick, "dt"), [
        "Klassenstufen",
        "Schulform",
        "Technische Voraussetzungen",
    ]);
    assert.equal(texts(quick, "dd")[0], "5 – 10");
    assert.equal(main.querySelector("#teachers-intro-quote footer").textContent, "Alan Watts");
});

test("a null grade range and blank facts leave no empty entries", () => {
    const ws = fixture("example-complete");
    ws.gradeRange = null;
    const teachers = ws.sections.find((s) => s.kind === "teachers");
    teachers.fields.facts.requirements = " ";
    const overview = ws.sections.find((s) => s.kind === "overview");
    overview.fields.facts = {
        location: "",
        groupSize: "",
        topics: "",
        prerequisites: "",
        duration: "",
    };
    const main = render(ws);
    assert.deepEqual(texts(main, "#teachers-quick-facts dt"), ["Schulform"]);
    assert.equal(main.querySelector(".facts"), null);
    assert.ok(!texts(main, "h3").includes("Rahmenbedingungen"));
});

test("author text is rendered as text, never as markup", () => {
    const ws = createEmptyWorkshop();
    const [quote, text] = ws.sections[0].subsections[0].blocks;
    quote.text = "<b>fett</b>";
    text.text = "Zeile 1\nZeile 2 <img src=x onerror=alert(1)>";
    ws.title = "<script>alert(1)</script>";
    const main = render(ws);
    assert.equal(main.querySelector("script"), null);
    assert.equal(main.querySelector("img"), null);
    assert.equal(main.querySelector("b"), null);
    assert.equal(main.querySelector("h1").textContent, "<script>alert(1)</script>");
    assert.equal(
        main.querySelector(".block-text").textContent,
        "Zeile 1\nZeile 2 <img src=x onerror=alert(1)>",
    );
});

test("unfilled blocks and unfilled items are omitted read-only but kept when editable", () => {
    const document = dom();
    const readOnly = contextFor(document, false);
    const editable = contextFor(document, true);

    const emptyText = { ...createBlock("text"), text: "  " };
    assert.equal(renderBlock(emptyText, readOnly), null);
    assert.equal(renderBlock(emptyText, editable).tagName, "P");

    const list = { ...createBlock("list"), items: ["a", "", " ", "b"] };
    assert.deepEqual(texts(renderBlock(list, readOnly), "li"), ["a", "b"]);
    assert.equal(renderBlock(list, editable).querySelectorAll("li").length, 4);

    const gallery = {
        ...createBlock("gallery"),
        images: [
            { src: "", alt: "", caption: "", width: "full" },
            { src: "images/a.jpg", alt: "A", caption: "Bild A", width: "third" },
        ],
    };
    const figures = renderBlock(gallery, readOnly).querySelectorAll("figure");
    assert.equal(figures.length, 1);
    assert.ok(figures[0].classList.contains("width-third"));
    assert.equal(figures[0].querySelector("figcaption").textContent, "Bild A");

    const phases = {
        ...createBlock("phases"),
        phases: [
            { title: "Leer", steps: [] },
            { title: "", steps: [{ title: "Schritt", duration: "", description: "", method: "" }] },
        ],
    };
    const rendered = renderBlock(phases, readOnly);
    assert.equal(rendered.querySelectorAll("li.phase").length, 2);
    assert.equal(rendered.querySelectorAll("li.step").length, 1);
    assert.equal(rendered.querySelector(".step-duration"), null);
    assert.equal(rendered.querySelector(".step-method"), null);
});

test("links and files fall back to readable text and never render empty", () => {
    const document = dom();
    const ctx = contextFor(document, false);
    const link = renderBlock({ ...createBlock("link"), url: "https://example.org/pfad/" }, ctx);
    assert.equal(link.querySelector("a").textContent, "example.org/pfad");
    assert.equal(link.querySelector("a").getAttribute("rel"), "noopener");
    const file = renderBlock({ ...createBlock("file"), file: "files/arbeitsblatt.pdf" }, ctx);
    assert.equal(file.querySelector("a").textContent, "arbeitsblatt.pdf");
    assert.equal(linkFallbackText("http://example.org"), "example.org");
    assert.equal(fileFallbackText("files/x.pdf"), "x.pdf");
    const labelled = renderBlock(
        { ...createBlock("link"), label: "Glossar", url: "https://example.org" },
        ctx,
    );
    assert.equal(labelled.querySelector("a").textContent, "Glossar");
});

test("people render with image, name and description; unknown block types render nothing", () => {
    const document = dom();
    const ctx = contextFor(document, false);
    const people = renderBlock(
        {
            ...createBlock("people"),
            people: [
                {
                    image: { src: "images/p.jpg", alt: "Porträt" },
                    name: "Erika Mustermann",
                    description: "Leitung",
                },
                { image: { src: "", alt: "" }, name: " ", description: "ohne Namen" },
            ],
        },
        ctx,
    );
    assert.equal(people.querySelectorAll("li.person").length, 1);
    assert.equal(people.querySelector("img").getAttribute("alt"), "Porträt");
    assert.equal(people.querySelector(".person-name").textContent, "Erika Mustermann");
    assert.equal(renderBlock({ id: "x", type: "video", url: "x" }, ctx), null);
    assert.equal(renderBlock({ id: "x", type: "constructor" }, ctx), null);
    assert.equal(renderBlock(null, ctx), null);
});

test("read-only rendering carries no editing hooks or inputs", () => {
    const main = render(fixture("example-complete"));
    assert.equal(
        main.querySelector(
            "[data-item], [data-items], [data-asset], [data-field], [contenteditable], input, select",
        ),
        null,
    );
});

test("editable rendering marks arrays, entries and asset slots and keeps empty image slots", () => {
    const main = render(fixture("example-complete"), { editable: true });
    const values = (attribute) =>
        [...main.querySelectorAll(`[${attribute}]`)].map((node) => node.getAttribute(attribute));
    assert.deepEqual(values("data-asset"), [
        "fields.heroImage.src",
        "src",
        "file",
        "file",
        "src",
        "images[0].src",
        "images[1].src",
        "images[0].src",
        "people[0].image.src",
        "people[1].image.src",
    ]);
    assert.deepEqual(values("data-items"), [
        "phases",
        "phases[0].steps",
        "phases[1].steps",
        "items",
        "items",
        "images",
        "images",
        "images",
        "people",
    ]);
    assert.equal(main.querySelectorAll('[data-item^="phases["][data-item$="]"]').length, 5);

    const portrait = main.querySelector('[data-asset="people[1].image.src"]');
    assert.ok(portrait.classList.contains("is-empty"));
    assert.equal(portrait.querySelector("img"), null);
    assert.ok(portrait.querySelector('input[data-field="people[1].image.alt"]'));
    assert.ok(main.querySelector('#overview-image input[data-field="fields.heroImage.alt"]'));

    const document = dom();
    const empty = renderBlock(createBlock("image"), contextFor(document, true));
    assert.ok(empty.classList.contains("is-empty"));
    assert.equal(empty.getAttribute("data-asset"), "src");
    assert.deepEqual(
        [...empty.querySelectorAll("[data-field]")].map((node) => node.getAttribute("data-field")),
        ["alt", "width", "caption"],
    );
    assert.equal(empty.querySelector("select").value, "full");
});

test("assets that resolve to no URL render no image and no download link", () => {
    const main = render(fixture("example-complete"), {
        resolveAsset: (path) => (path.startsWith("files/") ? "" : `x/${path}`),
    });
    const links = [...main.querySelectorAll(".block-file a")];
    assert.equal(links.length, 2);
    assert.ok(links.every((link) => !link.hasAttribute("href") && !link.hasAttribute("download")));

    const none = render(fixture("example-complete"), { resolveAsset: () => "" });
    assert.equal(none.querySelector("img"), null);
});

test("anchors are injective, fragment-safe and never collide with fixed kinds", () => {
    const ids = [
        "a b",
        "a_b",
        "a-b",
        "Kapitel #3",
        "constructor",
        "overview",
        "ü",
        "🙂",
        "a__b",
        "a_20_b",
    ];
    const anchors = ids.map(encodeAnchor);
    assert.equal(new Set(anchors).size, anchors.length);
    for (const anchor of anchors) assert.match(anchor, /^[A-Za-z0-9_-]+$/);
    assert.equal(encodeAnchor("a b"), "a_20_b");
    assert.equal(encodeAnchor("a_b"), "a__b");
    assert.notEqual(encodeAnchor("a_b"), encodeAnchor("a__b"));
    assert.equal(sectionAnchor({ kind: "custom", id: "overview" }), "custom-overview");
    assert.equal(sectionAnchor({ kind: "overview", id: "whatever" }), "overview");
});

test("two custom sections get distinct anchors and headings in the rendered page", () => {
    const ws = createEmptyWorkshop();
    ws.sections[0].subsections[0].blocks[0].text = "Vision";
    for (const title of ["Erstes Extra", "Zweites Extra"]) {
        const section = createSection("custom", { title });
        const subsection = createSubsection("custom", "custom", { title: "Kapitel" });
        const block = createBlock("text");
        block.text = title;
        subsection.blocks.push(block);
        section.subsections.push(subsection);
        ws.sections.push(section);
    }
    const main = render(ws);
    const ids = [...main.querySelectorAll("#workshop-content > section")].map((s) => s.id);
    assert.equal(ids.length, 3);
    assert.equal(new Set(ids).size, 3);
    assert.ok(ids[1].startsWith("custom-") && ids[2].startsWith("custom-"));
    assert.equal(main.querySelectorAll(`[id="heading-${ids[1]}"]`).length, 1);
});

test("rendering outside a browser requires a Document", () => {
    assert.throws(() => renderWorkshop(createEmptyWorkshop(), {}), TypeError);
});

test("section ids that end in -heading cannot collide with heading ids", () => {
    const ws = createEmptyWorkshop();
    ws.sections[0].subsections[0].blocks[0].text = "Vision";
    for (const id of ["foo", "foo-heading", "heading-foo"]) {
        const section = createSection("custom", { title: id });
        section.id = id;
        const subsection = createSubsection("custom", "custom", { title: "Kapitel" });
        const block = createBlock("text");
        block.text = id;
        subsection.blocks.push(block);
        section.subsections.push(subsection);
        ws.sections.push(section);
    }
    const main = render(ws);
    const ids = [...main.querySelectorAll("[id]")].map((node) => node.id);
    assert.equal(new Set(ids).size, ids.length, `duplicate ids: ${ids.join(", ")}`);
    for (const section of main.querySelectorAll("#workshop-content > section")) {
        const heading = main.querySelector(`[id="${section.getAttribute("aria-labelledby")}"]`);
        assert.equal(heading.closest("section"), section);
    }
});

test("unusual custom section ids survive the round trip from navigation fragment to section id", () => {
    const ids = ["a\nb", "Kapitel #3", "mit Leerzeichen", "ü_ö", "a__b"];
    const ws = createEmptyWorkshop();
    ws.sections[0].subsections[0].blocks[0].text = "Vision";
    for (const id of ids) {
        const section = createSection("custom", { title: `Titel ${id}` });
        section.id = id;
        const subsection = createSubsection("custom", "custom", { title: "Kapitel" });
        const block = createBlock("text");
        block.text = "Inhalt";
        subsection.blocks.push(block);
        section.subsections.push(subsection);
        ws.sections.push(section);
    }
    const main = render(ws);
    const links = [...main.querySelectorAll("#workshop-navigation-link-container a")].slice(1);
    assert.equal(links.length, ids.length);
    for (const link of links) {
        const fragment = new URL(link.getAttribute("href"), "https://example.org/x").hash.slice(1);
        assert.match(fragment, /^custom-[A-Za-z0-9_-]+$/);
        const target = main.querySelector(`[id="${fragment}"]`);
        assert.ok(target, `no section for fragment ${fragment}`);
        assert.equal(target.tagName, "SECTION");
    }
    for (const id of ids) {
        assert.equal(sectionAnchor({ kind: "custom", id }), `custom-${encodeAnchor(id)}`);
    }
});
