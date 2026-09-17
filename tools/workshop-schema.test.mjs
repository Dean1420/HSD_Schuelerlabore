import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
    SCHEMA_VERSION,
    SECTION_ORDER,
    SECTION_KINDS,
    createEmptyWorkshop,
    createSection,
    createSubsection,
    createBlock,
    validateWorkshop,
    isBlockFilled,
    isSectionEmpty,
    isSubsectionEmpty,
    isAssetPath,
    isExternalUrl,
    slugify,
    BLOCK_TYPES,
    migrate,
    defaultTitle,
} from "../app/assets/js/workshop-schema.mjs";

// Helpers

const draft = (document) => validateWorkshop(document, { mode: "draft" });
const publish = (document) => validateWorkshop(document, { mode: "publish" });
const paths = (errors) => errors.map((error) => error.path);

function section(document, kind) {
    return document.sections.find((s) => s.kind === kind);
}

function subsection(document, sectionKind, kind) {
    return section(document, sectionKind).subsections.find((s) => s.kind === kind);
}

/** Covers all block types, custom content and empty optional content. */
function completeWorkshop() {
    const ws = createEmptyWorkshop();
    Object.assign(ws, {
        slug: "example-complete",
        published: true,
        title: "Beispielworkshop",
        teaser: "Ein Workshop, der jeden Blocktyp verwendet.",
        thumbnail: { src: "thumbnail.jpg", alt: "Schüler*innen im Labor" },
        slogan: "Alles drin",
        subject: "SK",
        gradeRange: { min: 5, max: 10 },
        tags: ["beispiel", "vollständig"],
        moreInfoUrl: "https://www.hs-duesseldorf.de/schuelerlabore",
    });

    const overview = section(ws, "overview");
    overview.fields.heroImage = { src: "images/hero.jpg", alt: "" };
    Object.assign(overview.fields.facts, {
        location: "Klassenraum",
        groupSize: "10 bis 30",
        topics: "Vielfalt",
        prerequisites: "keine",
        duration: "4 Stunden",
    });
    const [quote, text] = subsection(ws, "overview", "description").blocks;
    quote.text = "Vielfalt ist Stärke.";
    quote.author = "Team Schülerlabore";
    text.text = "Beschreibung des Workshops.";

    // Leave the optional intro empty.
    const schedule = subsection(ws, "instructions", "schedule").blocks[0];
    schedule.phases.push({
        title: "Phase 1 – Ankommen",
        steps: [
            { title: "01 / Intro", duration: "45 min", description: "Einstieg", method: "Glossar" },
            {
                title: "02 / Hauptphase",
                duration: "120 min",
                description: "Stationen",
                method: "AR-App",
            },
        ],
    });
    const banner = createBlock("image");
    Object.assign(banner, {
        src: "images/banner.jpg",
        alt: "Campus",
        caption: "Der Campus",
        width: "full",
    });
    subsection(ws, "instructions", "schedule").blocks.push(banner);

    const file = subsection(ws, "materials", "documents").blocks[0];
    Object.assign(file, { label: "Arbeitsblatt", file: "files/arbeitsblatt.pdf" });
    const link = subsection(ws, "materials", "resources").blocks[0];
    Object.assign(link, { label: "", url: "https://example.org/glossar" });
    const glossary = createSubsection("materials", "custom", { title: "Glossar" });
    const glossaryLink = createBlock("link");
    Object.assign(glossaryLink, { label: "Begriffe", url: "https://example.org/begriffe" });
    glossary.blocks.push(glossaryLink);
    section(ws, "materials").subsections.push(glossary);

    const teachers = section(ws, "teachers");
    teachers.fields.quote = { text: "Lernen ist Bewegung.", author: "Anonym" };
    teachers.fields.facts = { schoolTypes: "Gymnasium, Gesamtschule", requirements: "keine" };
    subsection(ws, "teachers", "learningContent").blocks[0].text = "Inhalt des Moduls.";
    subsection(ws, "teachers", "competencies").blocks[0].items = [
        "Algorithmisches Denken",
        "Teamarbeit",
    ];
    const curriculum = subsection(ws, "teachers", "curriculum");
    const table = createBlock("image");
    Object.assign(table, {
        src: "images/lehrplan.jpg",
        alt: "Lehrplantabelle",
        caption: "NRW",
        width: "full",
    });
    curriculum.blocks.unshift(table);
    curriculum.blocks[1].text = "Passgenau für den Kernlehrplan.";

    subsection(ws, "impressions", "highlights").blocks[0].images.push(
        {
            src: "images/eindruck-1.jpg",
            alt: "Illustration",
            caption: "Hass hinter Glas",
            width: "third",
        },
        { src: "images/eindruck-2.jpg", alt: "Illustration zwei", caption: "", width: "twoThirds" },
    );
    subsection(ws, "impressions", "gallery").blocks[0].images.push({
        src: "images/wald.jpg",
        alt: "Wald im Winter",
        caption: "",
        width: "full",
    });

    subsection(ws, "contributors", "people").blocks[0].people.push({
        image: { src: "images/laura.jpg", alt: "Porträt Laura Sistig" },
        name: "M.A. Laura Sistig",
        description: "Tel. 0211 …",
    });

    const extra = createSection("custom", { title: "Weitere Hinweise" });
    const extraSub = createSubsection("custom", "custom", { title: "Differenzierung" });
    const extraText = createBlock("text");
    extraText.text = "Hinweise zur Differenzierung.";
    extraSub.blocks.push(extraText);
    extra.subsections.push(extraSub);
    ws.sections.push(extra);

    return ws;
}

// Factory

test("empty workshop is valid in draft mode and has the documented shape", () => {
    const ws = createEmptyWorkshop();
    assert.deepEqual(draft(ws), []);
    assert.equal(ws.schemaVersion, SCHEMA_VERSION);
    assert.equal(ws.slug, "");
    assert.equal(ws.published, false);
    assert.equal(ws.gradeRange, null);
    assert.deepEqual(ws.thumbnail, { src: "", alt: "" });
    assert.deepEqual(
        ws.sections.map((s) => s.kind),
        SECTION_ORDER,
    );
    for (const s of ws.sections) {
        assert.equal(s.title, SECTION_KINDS[s.kind].title);
        const expected = Object.keys(SECTION_KINDS[s.kind].subsections);
        assert.deepEqual(
            s.subsections.map((sub) => sub.kind),
            expected,
        );
        for (const sub of s.subsections) {
            assert.deepEqual(
                sub.blocks.map((b) => b.type),
                SECTION_KINDS[s.kind].subsections[sub.kind].defaultBlocks,
            );
        }
    }
    assert.equal(subsection(ws, "instructions", "schedule").blocks[0].type, "phases");
    assert.deepEqual(section(ws, "overview").fields.heroImage, { src: "", alt: "" });
    assert.deepEqual(section(ws, "materials").fields, {});
});

test("empty workshop fails publish mode only for the documented reasons", () => {
    const errors = publish(createEmptyWorkshop());
    assert.deepEqual(paths(errors).sort(), [
        "sections[0].subsections[0]",
        "slug",
        "teaser",
        "thumbnail.src",
        "title",
    ]);
});

test("all identifiers of a new workshop are unique", () => {
    const ws = createEmptyWorkshop();
    const ids = [];
    for (const s of ws.sections) {
        ids.push(s.id);
        for (const sub of s.subsections) {
            ids.push(sub.id);
            for (const b of sub.blocks) ids.push(b.id);
        }
    }
    assert.equal(new Set(ids).size, ids.length);
    assert.ok(ids.every((id) => typeof id === "string" && id.length > 0));
});

test("factories reject unknown kinds and types", () => {
    assert.throws(() => createSection("banner"), RangeError);
    assert.throws(() => createSubsection("teachers", "schedule"), RangeError);
    assert.throws(() => createBlock("video"), RangeError);
});

// Complete example

test("complete example is valid in both modes", () => {
    const ws = completeWorkshop();
    assert.deepEqual(draft(ws), []);
    assert.deepEqual(publish(ws), []);
});

test("complete example survives a JSON round trip", () => {
    const ws = completeWorkshop();
    const copy = JSON.parse(JSON.stringify(ws));
    assert.deepEqual(copy, ws);
    assert.deepEqual(publish(migrate(copy)), []);
});

// Draft-mode structure

test("non-objects and unknown or missing members are reported", () => {
    assert.deepEqual(paths(draft(null)), ["document"]);
    assert.deepEqual(paths(draft([])), ["document"]);
    const ws = createEmptyWorkshop();
    ws.extra = 1;
    delete ws.teaser;
    assert.deepEqual(paths(draft(ws)).sort(), ["extra", "teaser"]);
});

test("wrong schema version is reported and migrate rejects it", () => {
    const ws = createEmptyWorkshop();
    ws.schemaVersion = 2;
    assert.deepEqual(paths(draft(ws)), ["schemaVersion"]);
    assert.throws(() => migrate(ws), /Unsupported schemaVersion 2/);
});

test("migrate returns a current document unchanged and rejects non-objects", () => {
    const ws = createEmptyWorkshop();
    assert.equal(migrate(ws), ws);
    assert.throws(() => migrate("workshop"), TypeError);
    assert.throws(() => migrate({ schemaVersion: "1" }), /Unsupported schemaVersion "1"/);
});

test("duplicate identifiers are reported at the second occurrence", () => {
    const ws = createEmptyWorkshop();
    ws.sections[1].id = ws.sections[0].id;
    const errors = draft(ws);
    assert.deepEqual(paths(errors), ["sections[1].id"]);
    assert.match(errors[0].message, /first used at sections\[0\]\.id/);
});

test("empty identifiers are rejected", () => {
    const ws = createEmptyWorkshop();
    subsection(ws, "overview", "description").blocks[0].id = "";
    assert.deepEqual(paths(draft(ws)), ["sections[0].subsections[0].blocks[0].id"]);
});

test("each non-custom section kind must occur exactly once", () => {
    const ws = createEmptyWorkshop();
    ws.sections.push(createSection("teachers"));
    assert.deepEqual(paths(draft(ws)), ["sections[6].kind"]);
    ws.sections = ws.sections.filter((s) => s.kind !== "materials");
    assert.deepEqual(
        draft(ws).map((e) => e.message),
        ["section kind 'teachers' occurs more than once", "section kind 'materials' is missing"],
    );
});

test("unknown section kinds and subsection kinds outside their section are rejected", () => {
    const ws = createEmptyWorkshop();
    ws.sections[0].kind = "banner";
    assert.deepEqual(paths(draft(ws)).sort(), ["sections", "sections[0].kind"]);

    const ws2 = createEmptyWorkshop();
    section(ws2, "teachers").subsections.push({
        id: "x1",
        kind: "schedule",
        title: "Ablauf",
        blocks: [],
    });
    assert.deepEqual(paths(draft(ws2)), ["sections[3].subsections[3].kind"]);
});

test("a permitted subsection kind occurs at most once per section", () => {
    const ws = createEmptyWorkshop();
    section(ws, "teachers").subsections.push(createSubsection("teachers", "curriculum"));
    assert.deepEqual(paths(draft(ws)), ["sections[3].subsections[3].kind"]);
});

test("section fields must have exactly the declared shape", () => {
    const ws = createEmptyWorkshop();
    section(ws, "materials").fields = { note: "x" };
    delete section(ws, "overview").fields.facts.duration;
    section(ws, "teachers").fields.quote.text = 42;
    assert.deepEqual(paths(draft(ws)).sort(), [
        "sections[0].fields.facts.duration",
        "sections[2].fields.note",
        "sections[3].fields.quote.text",
    ]);
});

test("unknown block types and blocks with foreign members are rejected", () => {
    const ws = createEmptyWorkshop();
    const description = subsection(ws, "overview", "description");
    description.blocks.push({ id: "v1", type: "video", url: "x" });
    description.blocks[0].html = "<b>";
    assert.deepEqual(paths(draft(ws)).sort(), [
        "sections[0].subsections[0].blocks[0].html",
        "sections[0].subsections[0].blocks[2].type",
    ]);
});

test("draft mode accepts empty values and rejects wrong types", () => {
    const ws = createEmptyWorkshop();
    const description = subsection(ws, "overview", "description");
    const image = createBlock("image");
    description.blocks.push(image);
    assert.deepEqual(draft(ws), []);
    image.width = "half";
    ws.tags = ["ok", 3];
    ws.published = "yes";
    assert.deepEqual(paths(draft(ws)).sort(), [
        "published",
        "sections[0].subsections[0].blocks[2].width",
        "tags[1]",
    ]);
});

test("grade range must be null or an integer range with min ≤ max", () => {
    const ws = createEmptyWorkshop();
    ws.gradeRange = { min: 8, max: 5 };
    assert.deepEqual(paths(draft(ws)), ["gradeRange"]);
    ws.gradeRange = { min: 5.5, max: 10, note: "" };
    assert.deepEqual(paths(draft(ws)).sort(), ["gradeRange.min", "gradeRange.note"]);
    ws.gradeRange = { min: 1, max: 13 };
    assert.deepEqual(draft(ws), []);
});

test("subject must come from the vocabulary or be empty", () => {
    const ws = createEmptyWorkshop();
    ws.subject = "XY";
    assert.deepEqual(paths(draft(ws)), ["subject"]);
});

// Value types

test("asset path grammar rejects traversal, encoding, backslashes and nesting", () => {
    assert.equal(isAssetPath("images/aufbau.jpg", "image"), true);
    assert.equal(isAssetPath("files/arbeitsblatt.pdf", "file"), true);
    assert.equal(isAssetPath("thumbnail.jpg", "thumbnail"), true);
    for (const bad of [
        "images/%2e%2e/%2e%2e/outside.jpg",
        "images/../secret.jpg",
        "images\\aufbau.jpg",
        "/images/aufbau.jpg",
        "images/sub/aufbau.jpg",
        "images/Aufbau.jpg",
        "images/a b.jpg",
        "images/.hidden.jpg",
        "images/noextension",
        "files/aufbau.jpg",
        "http://example.org/aufbau.jpg",
        "",
    ]) {
        assert.equal(isAssetPath(bad, "image"), false, bad);
    }
    assert.equal(isAssetPath("images/aufbau.jpg", "file"), false);
    assert.equal(isAssetPath("images/aufbau.jpg", "thumbnail"), false);
});

test("set asset paths and URLs are validated in drafts, empty ones are accepted", () => {
    const ws = createEmptyWorkshop();
    ws.thumbnail.src = "images/thumb.jpg";
    section(ws, "overview").fields.heroImage.src = "hero.jpg";
    subsection(ws, "materials", "documents").blocks[0].file = "images/x.pdf";
    subsection(ws, "materials", "resources").blocks[0].url = "www.example.org";
    ws.moreInfoUrl = "javascript:alert(1)";
    assert.deepEqual(paths(draft(ws)).sort(), [
        "moreInfoUrl",
        "sections[0].fields.heroImage.src",
        "sections[2].subsections[0].blocks[0].file",
        "sections[2].subsections[1].blocks[0].url",
        "thumbnail.src",
    ]);
});

test("external URLs need an http(s) scheme and a host", () => {
    assert.equal(isExternalUrl("https://example.org/x?y=1"), true);
    assert.equal(isExternalUrl("http://example.org"), true);
    assert.equal(isExternalUrl("HTTPS://example.org"), true);
    assert.equal(isExternalUrl("example.org"), false);
    assert.equal(isExternalUrl("ftp://example.org"), false);
    assert.equal(isExternalUrl("https://"), false);
    assert.equal(isExternalUrl("../local.html"), false);
});

test("slugify produces lowercase ASCII kebab-case with German transliteration", () => {
    assert.equal(slugify("Al(l)iens – wir sind alle anders!"), "al-l-iens-wir-sind-alle-anders");
    assert.equal(slugify("Über Größe & Maß"), "ueber-groesse-mass");
    assert.equal(
        slugify("  Zeitkapsel Zukunft. Ich im Morgen "),
        "zeitkapsel-zukunft-ich-im-morgen",
    );
    assert.equal(slugify("Café Été"), "cafe-ete");
    assert.equal(slugify("!!!"), "");
});

test("default titles are defined for every kind and empty for custom", () => {
    assert.equal(defaultTitle("overview"), "Übersicht");
    assert.equal(defaultTitle("learningContent"), "Lerninhalt");
    assert.equal(defaultTitle("custom"), "");
    assert.equal(defaultTitle("nope"), "");
});

// Filled and empty rules

test("isBlockFilled follows the specification table", () => {
    const cases = [
        [{ ...createBlock("text"), text: "  " }, false],
        [{ ...createBlock("text"), text: "x" }, true],
        [{ ...createBlock("image"), alt: "only alt" }, false],
        [{ ...createBlock("image"), src: "images/a.jpg" }, true],
        [
            {
                ...createBlock("gallery"),
                images: [{ src: "", alt: "a", caption: "", width: "full" }],
            },
            false,
        ],
        [
            {
                ...createBlock("gallery"),
                images: [{ src: "images/a.jpg", alt: "", caption: "", width: "full" }],
            },
            true,
        ],
        [{ ...createBlock("quote"), author: "only author" }, false],
        [{ ...createBlock("quote"), text: "q" }, true],
        [{ ...createBlock("list"), items: ["", " "] }, false],
        [{ ...createBlock("list"), items: ["", "x"] }, true],
        [{ ...createBlock("link"), label: "only label" }, false],
        [{ ...createBlock("link"), url: "https://example.org" }, true],
        [{ ...createBlock("file"), file: "files/a.pdf" }, true],
        [{ ...createBlock("phases"), phases: [{ title: "P", steps: [] }] }, false],
        [
            {
                ...createBlock("phases"),
                phases: [
                    {
                        title: "",
                        steps: [{ title: "S", duration: "", description: "", method: "" }],
                    },
                ],
            },
            true,
        ],
        [
            {
                ...createBlock("people"),
                people: [{ image: { src: "images/a.jpg", alt: "a" }, name: " ", description: "" }],
            },
            false,
        ],
        [
            {
                ...createBlock("people"),
                people: [{ image: { src: "", alt: "" }, name: "N", description: "" }],
            },
            true,
        ],
        [{ id: "x", type: "video" }, false],
        [null, false],
    ];
    for (const [block, expected] of cases) {
        assert.equal(isBlockFilled(block), expected, JSON.stringify(block));
    }
});

test("section emptiness is decided by content, not by alt text or author alone", () => {
    const ws = createEmptyWorkshop();
    const overview = section(ws, "overview");
    const teachers = section(ws, "teachers");
    assert.equal(isSectionEmpty(overview), true);
    overview.fields.heroImage.alt = "alt without image";
    assert.equal(isSectionEmpty(overview), true);
    overview.fields.facts.duration = "4 h";
    assert.equal(isSectionEmpty(overview), false);
    assert.equal(isSectionEmpty(teachers), true);
    teachers.fields.quote.author = "author without quote";
    assert.equal(isSectionEmpty(teachers), true);
    teachers.fields.quote.text = "quote";
    assert.equal(isSectionEmpty(teachers), false);
    const materials = section(ws, "materials");
    assert.equal(isSectionEmpty(materials), true);
    subsection(ws, "materials", "resources").blocks[0].url = "https://example.org";
    assert.equal(isSectionEmpty(materials), false);
    assert.equal(isSubsectionEmpty(subsection(ws, "materials", "documents")), true);
});

// Publish mode

test("blank titles and teasers are rejected for publishing", () => {
    const ws = completeWorkshop();
    ws.title = "   ";
    ws.teaser = "\n";
    assert.deepEqual(paths(publish(ws)).sort(), ["teaser", "title"]);
    assert.deepEqual(draft(ws), []);
});

test("the required description subsection must exist and be filled", () => {
    const ws = completeWorkshop();
    const description = subsection(ws, "overview", "description");
    for (const block of description.blocks) block.text = "";
    assert.deepEqual(paths(publish(ws)), ["sections[0].subsections[0]"]);
    section(ws, "overview").subsections = [];
    assert.deepEqual(paths(publish(ws)), ["sections[0].subsections"]);
    assert.deepEqual(draft(ws), []);
});

test("custom sections and filled custom subsections need titles for publishing", () => {
    const ws = completeWorkshop();
    const custom = ws.sections[6];
    custom.title = " ";
    custom.subsections[0].title = "";
    assert.deepEqual(paths(publish(ws)).sort(), [
        "sections[6].subsections[0].title",
        "sections[6].title",
    ]);
    custom.subsections[0].blocks[0].text = "";
    assert.deepEqual(paths(publish(ws)), ["sections[6].title"]);
});

test("images with a source need alt text for publishing, except hero image and thumbnail", () => {
    const ws = completeWorkshop();
    ws.thumbnail.alt = "";
    section(ws, "overview").fields.heroImage.alt = "";
    assert.deepEqual(publish(ws), []);
    subsection(ws, "contributors", "people").blocks[0].people[0].image.alt = " ";
    subsection(ws, "impressions", "gallery").blocks[0].images[0].alt = "";
    subsection(ws, "teachers", "curriculum").blocks[0].alt = "";
    assert.deepEqual(paths(publish(ws)).sort(), [
        "sections[3].subsections[2].blocks[0].alt",
        "sections[4].subsections[1].blocks[0].images[0].alt",
        "sections[5].subsections[0].blocks[0].people[0].image.alt",
    ]);
    assert.deepEqual(draft(ws), []);
});

test("publishing requires a valid slug and a thumbnail", () => {
    const ws = completeWorkshop();
    ws.slug = "";
    ws.thumbnail.src = "";
    assert.deepEqual(paths(publish(ws)).sort(), ["slug", "thumbnail.src"]);
    ws.slug = "Not A Slug";
    assert.deepEqual(paths(draft(ws)), ["slug"]);
});

test("unknown validation modes are rejected", () => {
    assert.throws(() => validateWorkshop(createEmptyWorkshop(), { mode: "strict" }), RangeError);
});

// ---------------------------------------------------------------------------------------
// Keys that exist on Object.prototype must not pass as kinds or types
// ---------------------------------------------------------------------------------------

test("prototype property names are rejected as kinds and types without throwing", () => {
    const ws = createEmptyWorkshop();
    subsection(ws, "overview", "description").blocks.push({ id: "p1", type: "constructor" });
    section(ws, "teachers").subsections.push({
        id: "p2",
        kind: "constructor",
        title: "",
        blocks: [],
    });
    section(ws, "materials").subsections.push({
        id: "p3",
        kind: "toString",
        title: "",
        blocks: [],
    });
    ws.sections.push({ id: "p4", kind: "hasOwnProperty", title: "", fields: {}, subsections: [] });
    assert.deepEqual(paths(draft(ws)).sort(), [
        "sections[0].subsections[0].blocks[2].type",
        "sections[2].subsections[2].kind",
        "sections[3].subsections[3].kind",
        "sections[6].kind",
    ]);
    assert.equal(isBlockFilled({ id: "x", type: "constructor" }), false);
    assert.equal(isBlockFilled({ id: "x", type: ["text"] }), false);
    assert.equal(isSectionEmpty({ kind: "constructor", fields: {}, subsections: [] }), true);
    assert.equal(defaultTitle("constructor"), "");
    assert.throws(() => createBlock("constructor"), RangeError);
    assert.throws(() => createSection("__proto__"), RangeError);
    assert.throws(() => createSubsection("overview", "constructor"), RangeError);
});

test("slugify treats precomposed and decomposed umlauts alike", () => {
    assert.equal(slugify("Über"), "ueber");
    assert.equal(slugify("U\u0308ber"), "ueber");
    assert.equal(slugify("Gro\u00dfe A\u0308nderung"), "grosse-aenderung");
    assert.equal(slugify("o\u0308"), "oe");
});

// ---------------------------------------------------------------------------------------
// Independent, hand-written fixtures (no factories involved)
// ---------------------------------------------------------------------------------------

function fixture(name) {
    return JSON.parse(
        readFileSync(new URL(`./fixtures/${name}/workshop.json`, import.meta.url), "utf8"),
    );
}

test("hand-written complete fixture is valid for publishing and uses every block type", () => {
    const ws = migrate(fixture("example-complete"));
    assert.deepEqual(publish(ws), []);
    const types = new Set();
    for (const s of ws.sections)
        for (const sub of s.subsections) for (const b of sub.blocks) types.add(b.type);
    assert.deepEqual([...types].sort(), Object.keys(BLOCK_TYPES).sort());
    assert.ok(ws.sections.some((s) => s.kind === "custom"));
    assert.ok(ws.sections.some((s) => s.subsections.some((sub) => sub.kind === "custom")));
    assert.ok(ws.sections.every((s) => !isSectionEmpty(s)));
});

test("hand-written minimal draft fixture is a valid draft but not publishable", () => {
    const ws = migrate(fixture("draft-minimal"));
    assert.deepEqual(draft(ws), []);
    assert.deepEqual(paths(publish(ws)).sort(), [
        "sections[0].subsections",
        "slug",
        "teaser",
        "thumbnail.src",
        "title",
    ]);
    assert.ok(ws.sections.every(isSectionEmpty));
});
