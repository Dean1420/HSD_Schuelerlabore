import { test } from "node:test";
import assert from "node:assert/strict";
import { cpSync, mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { buildWorkshops, renderShell } from "./build-workshops.mjs";
import { createEmptyWorkshop } from "../app/assets/js/workshop-schema.mjs";

const FIXTURES = fileURLToPath(new URL("../app/workshops/_fixtures/", import.meta.url));

function workshops() {
    const directory = mkdtempSync(join(tmpdir(), "workshops-"));
    cpSync(join(FIXTURES, "example-complete"), join(directory, "example-complete"), {
        recursive: true,
    });
    return directory;
}

const edit = (directory, name, change) => {
    const file = join(directory, name, "workshop.json");
    const document = JSON.parse(readFileSync(file, "utf8"));
    change(document);
    writeFileSync(file, JSON.stringify(document));
};

test("published workshops are indexed with their card data; drafts and _folders are not", () => {
    const directory = workshops();
    cpSync(join(FIXTURES, "draft-minimal"), join(directory, "entwurf"), { recursive: true });
    edit(directory, "entwurf", (document) => (document.slug = "entwurf"));
    mkdirSync(join(directory, "_intern"));
    const { index, shells, drafts, errors } = buildWorkshops(directory);
    assert.deepEqual(errors, []);
    assert.deepEqual([...shells.keys()], ["example-complete"]);
    assert.deepEqual(drafts, ["entwurf"]);
    assert.deepEqual(index, [
        {
            slug: "example-complete",
            title: "Beispielworkshop mit allen Inhalten",
            teaser: "Ein Workshop, der jeden Blocktyp, eine eigene Kategorie und ein eigenes Kapitel verwendet.",
            thumbnail: { src: "thumbnail.jpg", alt: "Schüler*innen arbeiten an einer Station" },
            subject: "SK",
            gradeRange: { min: 5, max: 10 },
            tags: ["beispiel", "vollständig", "demokratie"],
        },
    ]);
});

test("missing files, wrong folder names, failed publish checks and unreadable JSON are errors", () => {
    const directory = workshops();
    rmSync(join(directory, "example-complete/files/folien.pdf"));
    cpSync(join(directory, "example-complete"), join(directory, "anderer-name"), {
        recursive: true,
    });
    mkdirSync(join(directory, "leer"));
    mkdirSync(join(directory, "unfertig"));
    const unfinished = { ...createEmptyWorkshop(), slug: "unfertig", published: true };
    writeFileSync(join(directory, "unfertig/workshop.json"), JSON.stringify(unfinished));

    const { index, errors } = buildWorkshops(directory);
    assert.ok(errors.includes("example-complete: files/folien.pdf fehlt"));
    assert.ok(errors.some((error) => /^anderer-name: slug „example-complete“/.test(error)));
    assert.ok(errors.some((error) => error.startsWith("leer: workshop.json nicht lesbar")));
    assert.ok(errors.includes("unfertig: title: must not be blank for publishing"));
    assert.ok(!index.some((entry) => entry.slug === "unfertig"));
});

test("the committed workshops pass the checks", () => {
    const { errors } = buildWorkshops(fileURLToPath(new URL("../app/workshops/", import.meta.url)));
    assert.deepEqual(errors, []);
});

test("the shell carries escaped title, description and preview image and loads the renderer", () => {
    const html = renderShell({
        slug: "test",
        title: 'Strom & "Spannung" <neu>',
        teaser: "Kurz & gut",
        thumbnail: { src: "kachel.jpg", alt: "" },
    });
    assert.ok(
        html.includes(
            "<title>Strom &amp; &quot;Spannung&quot; &lt;neu&gt; – Schülerlabore HSD</title>",
        ),
    );
    assert.ok(html.includes('<meta name="description" content="Kurz &amp; gut" />'));
    assert.ok(html.includes('<meta property="og:image" content="kachel.jpg" />'));
    assert.ok(html.includes('<body data-workshop="test">'));
    assert.ok(html.includes('src="../../pages/workshop.js"'));
    assert.ok(!html.includes("<neu>"));
});
