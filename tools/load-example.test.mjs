import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { loadExampleWorkshop } from "../app/workshop_creator/JS/load-example.mjs";
import { ROOT_OWNER } from "../app/workshop_creator/JS/editor-state.mjs";
import { setup, fixture } from "./editor-harness.mjs";

function fixtureResponse(url) {
    const path = url.replace("workshops/_fixtures/", "../app/workshops/_fixtures/");
    const type = path.endsWith(".json")
        ? "application/json"
        : path.endsWith(".pdf")
          ? "application/pdf"
          : "image/jpeg";
    return new Response(readFileSync(new URL(path, import.meta.url)), {
        headers: { "Content-Type": type },
    });
}

test("the example loads all ten files and renders without missing-asset errors", async () => {
    const { state, assets, panel, editor, query } = setup();
    let replacements = 0;
    state.addEventListener("replace", () => replacements++);

    await loadExampleWorkshop(state, async (url) => fixtureResponse(url));

    assert.equal(replacements, 1);
    assert.equal(state.files.size, 10);
    assert.deepEqual(assets.missing(), []);
    assert.deepEqual(panel.refresh(), []);
    assert.match(query("#overview-img").src, /^blob:/);
    assert.ok(state.files.get("images/hero.jpg").size > 0);
    assert.equal(state.files.get("files/folien.pdf").type, "application/pdf");
    editor.setPreview(true);
    assert.match(query(".block-file a").href, /^blob:/);
});

test("a missing example asset leaves the current document, files and rendering intact", async () => {
    const { state, assets, query, urls } = setup(fixture("example-complete"), {
        withFiles: true,
    });
    state.set(ROOT_OWNER, "title", "Meine Änderungen");
    const document = state.document;
    const files = [...state.files];
    const liveUrls = [...urls.live];
    const main = query("main");
    await assert.rejects(
        loadExampleWorkshop(state, async (url) =>
            url.endsWith("images/hero.jpg")
                ? new Response(null, { status: 404 })
                : fixtureResponse(url),
        ),
        /images\/hero.jpg.*HTTP 404/,
    );
    assert.equal(state.document, document);
    assert.equal(state.document.title, "Meine Änderungen");
    assert.deepEqual([...state.files], files);
    assert.deepEqual([...urls.live], liveUrls);
    assert.deepEqual(assets.missing(), []);
    assert.equal(query("main"), main);
});

test("an invalid example is rejected before any assets are requested", async () => {
    const { state } = setup();
    const document = state.document;
    const invalid = fixture("example-complete");
    invalid.thumbnail.src = "../outside.jpg";
    const requests = [];
    await assert.rejects(
        loadExampleWorkshop(state, async (url) => {
            requests.push(url);
            return Response.json(invalid);
        }),
        /Ungültiges Beispiel/,
    );
    assert.equal(requests.length, 1);
    assert.equal(state.document, document);
});
