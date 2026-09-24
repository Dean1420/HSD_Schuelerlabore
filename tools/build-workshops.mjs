/**
 * Checks every workshop folder under app/workshops/, then writes app/workshops.json (card data
 * of the published workshops) and a shell index.html into each published folder. `--check`
 * only verifies that these generated files are current. Folders starting with "_" are skipped.
 */
import { readdirSync, readFileSync, writeFileSync, existsSync, statSync, rmSync } from "node:fs";
import { join, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";
import { migrate, validateWorkshop } from "../app/assets/js/workshop-schema.mjs";
import { collectAssetReferences } from "../app/workshop_creator/JS/editor-assets.mjs";

const APP = fileURLToPath(new URL("../app/", import.meta.url));

/** Returns { index, shells, drafts, errors }; `shells` maps slug to its index.html text. */
export function buildWorkshops(workshopsDirectory) {
    const index = [];
    const shells = new Map();
    const drafts = [];
    const errors = [];
    const folders = readdirSync(workshopsDirectory, { withFileTypes: true })
        .filter((entry) => entry.isDirectory() && !entry.name.startsWith("_"))
        .map((entry) => entry.name)
        .sort();

    for (const name of folders) {
        const folder = join(workshopsDirectory, name);
        const fail = (message) => errors.push(`${name}: ${message}`);
        let document;
        try {
            document = migrate(JSON.parse(readFileSync(join(folder, "workshop.json"), "utf8")));
        } catch (error) {
            fail(`workshop.json nicht lesbar (${error.message})`);
            continue;
        }
        const mode = document.published === true ? "publish" : "draft";
        const problems = validateWorkshop(document, { mode });
        problems.forEach((problem) => fail(`${problem.path}: ${problem.message}`));
        if (problems.length) continue;
        if (document.slug !== name)
            fail(`slug „${document.slug}“ entspricht nicht dem Ordnernamen`);
        for (const { path } of collectAssetReferences(document)) {
            const target = resolve(folder, path);
            if (!target.startsWith(resolve(folder) + sep)) fail(`${path} verlässt den Ordner`);
            else if (!existsSync(target) || !statSync(target).isFile()) fail(`${path} fehlt`);
        }
        if (mode === "publish") {
            const { slug, title, teaser, thumbnail, subject, gradeRange, tags } = document;
            index.push({ slug, title, teaser, thumbnail, subject, gradeRange, tags });
            shells.set(name, renderShell(document));
        } else {
            drafts.push(name);
        }
    }
    return { index, shells, drafts, errors };
}

export function formatIndex(index) {
    return `${JSON.stringify(index, null, 4)}\n`;
}

/** Title, description and preview image for crawlers and link previews; the page itself is rendered by workshop.js. */
export function renderShell({ slug, title, teaser, thumbnail }) {
    const [name, description, image] = [title, teaser, thumbnail.src].map(escapeHtml);
    return `<!doctype html>
<!-- Generiert von tools/build-workshops.mjs aus workshop.json. Nicht von Hand bearbeiten. -->
<html lang="de">
    <head>
        <meta charset="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>${name} – Schülerlabore HSD</title>
        <meta name="description" content="${description}" />
        <meta property="og:type" content="article" />
        <meta property="og:title" content="${name}" />
        <meta property="og:description" content="${description}" />
        <meta property="og:image" content="${image}" />
        <link rel="stylesheet" href="../../assets/css/base.css" />
        <link rel="stylesheet" href="../../assets/css/workshop.css" />
        <script type="module" src="../../pages/workshop.js"></script>
    </head>
    <body data-workshop="${escapeHtml(slug)}">
        <noscript>
            <h1>${name}</h1>
            <p>${description}</p>
            <p>Diese Seite benötigt JavaScript, um den Workshop anzuzeigen.</p>
        </noscript>
    </body>
</html>
`;
}

function escapeHtml(text) {
    return String(text).replace(
        /[&<>"]/g,
        (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[character],
    );
}

const read = (file) => (existsSync(file) ? readFileSync(file, "utf8") : null);

if (process.argv[1] === fileURLToPath(import.meta.url)) {
    const workshops = join(APP, "workshops");
    const { index, shells, drafts, errors } = buildWorkshops(workshops);
    errors.forEach((error) => console.error(error));
    const files = new Map([[join(APP, "workshops.json"), formatIndex(index)]]);
    for (const [slug, html] of shells) files.set(join(workshops, slug, "index.html"), html);
    const stale = drafts.map((slug) => join(workshops, slug, "index.html")).filter(existsSync);

    if (process.argv.includes("--check")) {
        const outdated = [...files]
            .filter(([file, text]) => read(file) !== text)
            .map(([file]) => file);
        for (const file of [...outdated, ...stale]) {
            errors.push(file);
            console.error(`${file.slice(APP.length - 4)} ist veraltet: npm run build:workshops`);
        }
    } else if (!errors.length) {
        for (const [file, text] of files) writeFileSync(file, text);
        stale.forEach((file) => rmSync(file));
        console.log(
            `${index.length} veröffentlichte Workshops: workshops.json und index.html geschrieben`,
        );
    }
    if (errors.length) process.exit(1);
}
