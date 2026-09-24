import { test } from "node:test";
import assert from "node:assert/strict";
import { execFileSync, spawnSync } from "node:child_process";
import { mkdtempSync, readFileSync, writeFileSync, readdirSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createZip, crc32 } from "../app/workshop_creator/JS/zip-writer.mjs";
import {
    buildPackage,
    packageErrors,
    readPackageFolder,
} from "../app/workshop_creator/JS/workshop-package.mjs";
import { setup, fixture } from "./editor-harness.mjs";

const hasUnzip = spawnSync("unzip", ["-v"]).status === 0;
const fixtureBytes = (path) =>
    readFileSync(new URL(`../app/workshops/_fixtures/example-complete/${path}`, import.meta.url));

function folderFiles(window, entries, root = "example-complete") {
    return Object.entries(entries).map(([path, data]) => {
        const file = new window.File([data], path.split("/").pop());
        Object.defineProperty(file, "webkitRelativePath", { value: `${root}/${path}` });
        return file;
    });
}

test("crc32 matches the reference value", () => {
    assert.equal(crc32(new TextEncoder().encode("123456789")), 0xcbf43926);
});

test(
    "the ZIP extracts with unzip, keeping Unicode names and binary data",
    { skip: !hasUnzip },
    () => {
        const binary = Uint8Array.from({ length: 70000 }, (_, i) => (i * 31) % 256);
        const zip = createZip([
            { name: "ordner/größe ü.txt", data: new TextEncoder().encode("Grüße") },
            { name: "ordner/images/bild.bin", data: binary },
            { name: "ordner/leer.txt", data: new Uint8Array() },
        ]);
        const directory = mkdtempSync(join(tmpdir(), "zip-"));
        writeFileSync(join(directory, "test.zip"), zip);
        execFileSync("unzip", ["-tq", join(directory, "test.zip")]);
        execFileSync("unzip", ["-q", join(directory, "test.zip"), "-d", directory]);
        assert.deepEqual(
            readdirSync(join(directory, "ordner")).sort(),
            ["größe ü.txt", "images", "leer.txt"].sort(),
        );
        assert.equal(readFileSync(join(directory, "ordner/größe ü.txt"), "utf8"), "Grüße");
        assert.deepEqual(
            new Uint8Array(readFileSync(join(directory, "ordner/images/bild.bin"))),
            binary,
        );
    },
);

test("packageErrors uses the mode of the published flag and includes missing files", () => {
    const { state, assets } = setup(fixture("example-complete"));
    assert.equal(packageErrors(state, assets.missing()).length, 10);
    const draft = setup();
    assert.deepEqual(packageErrors(draft.state), [], "an empty, unnamed draft can be saved");
    draft.state.document.published = true;
    const paths = packageErrors(draft.state).map((error) => error.path);
    assert.ok(paths.includes("title") && paths.includes("slug"));
});

test(
    "a saved package extracts to a folder that reopens with every file",
    { skip: !hasUnzip },
    async () => {
        const { window, state } = setup(fixture("example-complete"), { withFiles: true });
        state.files.set(
            "images/hero.jpg",
            new window.File([fixtureBytes("images/hero.jpg")], "hero.jpg"),
        );
        const { name, bytes } = await buildPackage(state);
        assert.equal(name, "example-complete.zip");

        const directory = mkdtempSync(join(tmpdir(), "package-"));
        writeFileSync(join(directory, name), bytes);
        execFileSync("unzip", ["-q", join(directory, name), "-d", directory]);
        const root = join(directory, "example-complete");
        assert.deepEqual(
            JSON.parse(readFileSync(join(root, "workshop.json"), "utf8")),
            state.document,
        );
        assert.deepEqual(
            readFileSync(join(root, "images/hero.jpg")),
            fixtureBytes("images/hero.jpg"),
        );

        const entries = {};
        const walk = (folder, prefix) => {
            for (const entry of readdirSync(folder, { withFileTypes: true })) {
                if (entry.isDirectory()) walk(join(folder, entry.name), `${prefix}${entry.name}/`);
                else entries[prefix + entry.name] = readFileSync(join(folder, entry.name));
            }
        };
        walk(root, "");
        const reopened = await readPackageFolder(folderFiles(window, entries));
        assert.deepEqual(reopened.document, state.document);
        assert.deepEqual([...reopened.files.keys()].sort(), [...state.files.keys()].sort());
        assert.deepEqual(reopened.missing, []);
    },
);

test("reopening reports missing files, ignores unreferenced ones and rejects bad folders", async () => {
    const { window } = setup();
    const document = fixture("example-complete");
    const json = JSON.stringify(document);
    const result = await readPackageFolder(
        folderFiles(window, {
            "workshop.json": json,
            "thumbnail.jpg": "x",
            "images/hero.jpg": "x",
            "images/unbenutzt.jpg": "x",
            "__MACOSX/._workshop.json": "x",
        }),
    );
    assert.deepEqual([...result.files.keys()], ["thumbnail.jpg", "images/hero.jpg"]);
    assert.equal(result.missing.length, 8);
    assert.ok(result.missing.includes("files/folien.pdf"));

    await assert.rejects(
        readPackageFolder(folderFiles(window, { "a.txt": "x" })),
        /keine workshop\.json/,
    );
    await assert.rejects(
        readPackageFolder(folderFiles(window, { "workshop.json": "{" })),
        /kein gültiges JSON/,
    );
    const unsafe = structuredClone(document);
    unsafe.sections[0].fields.heroImage.src = "../geheim.jpg";
    await assert.rejects(
        readPackageFolder(folderFiles(window, { "workshop.json": JSON.stringify(unsafe) })),
        /heroImage\.src/,
    );

    const nested = await readPackageFolder(
        folderFiles(
            window,
            { "paket/workshop.json": json, "paket/thumbnail.jpg": "x" },
            "Downloads",
        ),
    );
    assert.deepEqual([...nested.files.keys()], ["thumbnail.jpg"]);
});

test("a folder with several workshops is rejected whatever the file order", async () => {
    const { window } = setup();
    const json = JSON.stringify(fixture("example-complete"));
    const files = folderFiles(
        window,
        { "a/workshop.json": json, "b/workshop.json": json },
        "workshops",
    );
    await assert.rejects(readPackageFolder(files), /mehrere Workshops/);
    await assert.rejects(readPackageFolder([...files].reverse()), /mehrere Workshops/);
});

test("a package keeps the state it was started with when the editor changes during saving", async () => {
    const { window, state } = setup(fixture("example-complete"), { withFiles: true });
    const original = new window.File(["original"], "thumbnail.jpg");
    state.files.set("thumbnail.jpg", original);
    const saving = buildPackage(state);
    const other = fixture("example-complete");
    other.title = "Anderer Workshop";
    state.load(other, {
        files: [["thumbnail.jpg", new window.File(["anderes"], "thumbnail.jpg")]],
    });
    const { bytes } = await saving;
    const text = new TextDecoder("latin1").decode(bytes);
    assert.ok(text.includes("Beispielworkshop mit allen Inhalten"));
    assert.ok(!text.includes("Anderer Workshop"));
    assert.ok(text.includes("original") && !text.includes("anderes"));
});

test("a draft without a folder name is saved as entwurf.zip", async () => {
    const { state } = setup();
    const { name, bytes } = await buildPackage(state);
    assert.equal(name, "entwurf.zip");
    assert.ok(new TextDecoder("latin1").decode(bytes).includes("entwurf/workshop.json"));
});
