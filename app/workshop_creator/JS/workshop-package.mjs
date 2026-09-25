import { migrate, validateWorkshop } from "../../assets/js/workshop-schema.mjs";
import { collectAssetReferences } from "./editor-assets.mjs";
import { createZip } from "./zip-writer.mjs";

const DRAFT_NAME = "entwurf";

export function packageErrors(state, extraErrors = []) {
    const mode = state.document.published ? "publish" : "draft";
    return [...validateWorkshop(state.document, { mode }), ...extraErrors];
}

// Call packageErrors() first. Snapshot document and files before async reads to exclude later edits.
export async function buildPackage(state, { date } = {}) {
    const document = structuredClone(state.document);
    const files = new Map(state.files);
    const name = document.slug || DRAFT_NAME;
    const folder = `${name}/`;
    const entries = [
        {
            name: `${folder}workshop.json`,
            data: new TextEncoder().encode(`${JSON.stringify(document, null, 4)}\n`),
        },
    ];
    const paths = new Set(collectAssetReferences(document).map((reference) => reference.path));
    for (const path of [...paths].sort()) {
        const file = files.get(path);
        if (!file) throw new Error(`Datei „${path}“ fehlt.`);
        entries.push({ name: folder + path, data: new Uint8Array(await file.arrayBuffer()) });
    }
    return { name: `${name}.zip`, bytes: createZip(entries, { date }) };
}

// Expects File objects with webkitRelativePath; includes only referenced files.
export async function readPackageFolder(fileList) {
    const entries = [...fileList].map((file) => ({
        file,
        path: (file.webkitRelativePath || file.name).split("/"),
    }));
    const manifests = entries
        .filter(({ path }) => path.at(-1) === "workshop.json")
        .sort((a, b) => a.path.length - b.path.length);
    if (!manifests.length) {
        throw new Error(
            "Im Ordner liegt keine workshop.json. Bitte den entpackten Workshop-Ordner wählen.",
        );
    }
    if (manifests.length > 1 && manifests[1].path.length === manifests[0].path.length) {
        throw new Error(
            "Der Ordner enthält mehrere Workshops. Bitte den Ordner eines einzelnen Workshops wählen.",
        );
    }
    const base = manifests[0].path.slice(0, -1).join("/");
    let raw;
    try {
        raw = JSON.parse(await manifests[0].file.text());
    } catch {
        throw new Error("workshop.json ist kein gültiges JSON.");
    }
    const document = migrate(raw);
    const errors = validateWorkshop(document, { mode: "draft" });
    if (errors.length) {
        const error = new Error(
            `workshop.json hat ${errors.length} Fehler, z. B. ${errors[0].path}: ${errors[0].message}`,
        );
        error.errors = errors;
        throw error;
    }

    const byPath = new Map(entries.map(({ file, path }) => [path.join("/"), file]));
    const files = new Map();
    const missing = [];
    for (const { path } of collectAssetReferences(document)) {
        const file = byPath.get(base ? `${base}/${path}` : path);
        if (file) files.set(path, file);
        else if (!missing.includes(path)) missing.push(path);
    }
    return { document, files, missing };
}
