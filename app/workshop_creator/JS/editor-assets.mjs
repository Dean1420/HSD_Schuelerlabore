import { slugify } from "../../assets/js/workshop-schema.mjs";
import { ROOT_OWNER, parsePath, formatPath, readPath, findPath } from "./editor-state.mjs";

const IMAGE_EXTENSIONS = new Set(["avif", "gif", "jpeg", "jpg", "png", "svg", "webp"]);

const TYPE_EXTENSIONS = {
    "image/avif": "avif",
    "image/gif": "gif",
    "image/jpeg": "jpg",
    "image/png": "png",
    "image/svg+xml": "svg",
    "image/webp": "webp",
    "application/pdf": "pdf",
};

const DIRECTORIES = { image: "images/", thumbnail: "", file: "files/" };
const FALLBACK_NAMES = { image: "bild", thumbnail: "vorschaubild", file: "datei" };
const MAX_BASE_LENGTH = 80;

// Slugify the base, lowercase the extension (or infer it from MIME); null if none exists.
export function normaliseFileName(name, { type = "", location = "file" } = {}) {
    const text = String(name ?? "").trim();
    const dot = text.lastIndexOf(".");
    const extension =
        (dot > 0
            ? text
                  .slice(dot + 1)
                  .toLowerCase()
                  .replace(/[^a-z0-9]/g, "")
            : "") ||
        own(TYPE_EXTENSIONS, type) ||
        "";
    if (!extension) return null;
    const base =
        slugify(dot > 0 ? text.slice(0, dot) : text)
            .slice(0, MAX_BASE_LENGTH)
            .replace(/-+$/, "") ||
        own(FALLBACK_NAMES, location) ||
        "datei";
    return `${base}.${extension}`;
}

export function isImageFile(file) {
    if (typeof file?.type === "string" && file.type.startsWith("image/")) return true;
    const name = String(file?.name ?? "");
    const dot = name.lastIndexOf(".");
    return !file?.type && dot > 0 && IMAGE_EXTENSIONS.has(name.slice(dot + 1).toLowerCase());
}

export function uniqueAssetPath(location, name, taken) {
    const directory = own(DIRECTORIES, location);
    if (directory === undefined) throw new RangeError(`Unknown asset location '${location}'`);
    const dot = name.lastIndexOf(".");
    let path = `${directory}${name}`;
    for (let n = 2; taken.has(path); n += 1) {
        path = `${directory}${name.slice(0, dot)}-${n}${name.slice(dot)}`;
    }
    return path;
}

const IMAGE_BLOCK_ASPECTS = { third: 1, twoThirds: 2, full: 3 };

// Slot width / height, or null for a free crop.
export function aspectFor({ location, field }, owner = null) {
    if (location === "thumbnail") return 4 / 3;
    if (/(^|\.)heroImage\.src$/.test(field) || /^people\[\d+\]\.image\.src$/.test(field)) return 1;
    if (owner?.type === "image" && field === "src") return IMAGE_BLOCK_ASPECTS[owner.width] ?? 3;
    const galleryImage = owner?.type === "gallery" && /^images\[(\d+)\]\.src$/.exec(field);
    if (galleryImage) return IMAGE_BLOCK_ASPECTS[owner.images[Number(galleryImage[1])]?.width] ?? 3;
    return null;
}

export function isAssetField(field) {
    return typeof field === "string" && /(^|\.)(src|file)$/.test(field);
}

// References include owner/field bindings, location and the validation error path.
export function collectAssetReferences(document) {
    const references = [];
    const add = (path, location, owner, field, errorPath) => {
        if (typeof path === "string" && path !== "") {
            references.push({ path, location, owner, field, errorPath });
        }
    };
    add(document.thumbnail?.src, "thumbnail", ROOT_OWNER, "thumbnail.src", "thumbnail.src");
    document.sections.forEach((section, i) => {
        const sectionPath = `sections[${i}]`;
        if (section.kind === "overview") {
            const field = "fields.heroImage.src";
            add(
                section.fields?.heroImage?.src,
                "image",
                section.id,
                field,
                `${sectionPath}.${field}`,
            );
        }
        section.subsections.forEach((subsection, j) =>
            subsection.blocks.forEach((block, k) => {
                const blockPath = `${sectionPath}.subsections[${j}].blocks[${k}]`;
                const at = (value, field, location) =>
                    add(value, location, block.id, field, `${blockPath}.${field}`);
                if (block.type === "image") at(block.src, "src", "image");
                if (block.type === "file") at(block.file, "file", "file");
                if (block.type === "gallery") {
                    block.images.forEach((image, m) => at(image.src, `images[${m}].src`, "image"));
                }
                if (block.type === "people") {
                    block.people.forEach((person, m) =>
                        at(person.image.src, `people[${m}].image.src`, "image"),
                    );
                }
            }),
        );
    });
    return references;
}

// Targets are { owner, field, location }; location is "image", "thumbnail" or "file".
export function createAssetManager(
    state,
    {
        dom = globalThis.document,
        urls = dom?.defaultView?.URL ?? globalThis.URL,
        placeholder = "",
        transformImage = null,
    } = {},
) {
    const cache = new Map();
    let picker = null;
    let pending = null;

    function resolve(path) {
        const file = state.files.get(path);
        if (!file) return String(path).startsWith("files/") ? "" : placeholder;
        const cached = cache.get(path);
        if (cached?.file === file) return cached.url;
        if (cached) urls.revokeObjectURL(cached.url);
        const url = urls.createObjectURL(file);
        cache.set(path, { file, url });
        return url;
    }

    function current({ owner, field }) {
        return readPath(state.resolve(owner), field);
    }

    function referencedPaths() {
        return new Set(collectAssetReferences(state.document).map((reference) => reference.path));
    }

    function choose({ owner, field, location }, file) {
        if (!file || typeof file.name !== "string") return null;
        if (location !== "file" && !isImageFile(file)) return null;
        const name = normaliseFileName(file.name, { type: file.type, location });
        if (!name) return null;
        const path = uniqueAssetPath(
            location,
            name,
            new Set([...state.files.keys(), ...referencedPaths()]),
        );
        state.files.set(path, file);
        state.set(owner, field, path, { source: "assets" });
        return path;
    }

    function remove(target) {
        if (current(target) !== "") state.set(target.owner, target.field, "", { source: "assets" });
    }

    function sweep() {
        const referenced = referencedPaths();
        for (const path of [...state.files.keys()]) {
            if (!referenced.has(path)) state.files.delete(path);
        }
        for (const [path, { file, url }] of [...cache]) {
            if (state.files.get(path) !== file) {
                urls.revokeObjectURL(url);
                cache.delete(path);
            }
        }
    }

    function missing() {
        return collectAssetReferences(state.document)
            .filter((reference) => !state.files.has(reference.path))
            .map((reference) => ({
                path: reference.errorPath,
                message: `Datei „${reference.path}“ fehlt; bitte erneut auswählen.`,
            }));
    }

    // Track moved entries; return "stale" if the target is removed or changed during selection.
    function pick(target) {
        settle({ status: "cancelled" });
        const token = capture(target);
        const input = ensurePicker();
        input.accept = target.location === "file" ? "" : "image/*";
        const outcome = new Promise((done) => {
            pending = { token, done };
        });
        input.click();
        return outcome;
    }

    function capture({ owner, field, location }) {
        const ownerObject = state.resolve(owner);
        const tokens = parsePath(field);
        const parentPath = formatPath(tokens.slice(0, -1));
        const parent = parentPath ? readPath(ownerObject, parentPath) : ownerObject;
        const key = tokens.at(-1);
        return {
            owner,
            location,
            document: state.document,
            ownerObject,
            parent,
            key,
            value: parent[key],
        };
    }

    function revalidate(token) {
        if (state.document !== token.document) return null;
        if (token.owner !== ROOT_OWNER && state.index.get(token.owner) !== token.ownerObject) {
            return null;
        }
        const parentTokens = findPath(token.ownerObject, token.parent);
        if (!parentTokens || token.parent[token.key] !== token.value) return null;
        return {
            owner: token.owner,
            field: formatPath([...parentTokens, token.key]),
            location: token.location,
        };
    }

    function onPickerChange() {
        const file = picker.files?.[0] ?? null;
        const request = pending;
        pending = null;
        picker.value = "";
        if (!request) return;
        if (!file) return request.done({ status: "cancelled" });
        place(request.token, file).then(request.done);
    }

    async function place(token, file) {
        let target = revalidate(token);
        if (!target) return { status: "stale" };
        let chosen = file;
        if (transformImage && target.location !== "file" && isImageFile(file)) {
            try {
                const owner = target.owner === ROOT_OWNER ? null : state.index.get(target.owner);
                chosen = await transformImage(file, { aspect: aspectFor(target, owner) });
            } catch {
                return { status: "invalid" };
            }
            if (!chosen) return { status: "cancelled" };
            target = revalidate(token);
            if (!target) return { status: "stale" };
        }
        const path = choose(target, chosen);
        return path ? { status: "chosen", target, path } : { status: "invalid" };
    }

    function edit(target) {
        const file = state.files.get(current(target));
        if (!file || !transformImage) return Promise.resolve({ status: "invalid" });
        return place(capture(target), file);
    }

    function settle(outcome) {
        const request = pending;
        pending = null;
        request?.done(outcome);
    }

    const onPickerCancel = () => settle({ status: "cancelled" });

    function ensurePicker() {
        if (picker) return picker;
        picker = dom.createElement("input");
        picker.type = "file";
        picker.hidden = true;
        picker.tabIndex = -1;
        picker.className = "editor-file-input";
        picker.addEventListener("change", onPickerChange);
        picker.addEventListener("cancel", onPickerCancel);
        dom.body.append(picker);
        return picker;
    }

    function onChange(event) {
        if (event.detail.structural || isAssetField(event.detail.field)) sweep();
    }

    function onReplace() {
        settle({ status: "stale" });
        sweep();
    }

    state.addEventListener("change", onChange);
    state.addEventListener("replace", onReplace);

    return {
        resolve,
        current,
        has: (path) => state.files.has(path),
        choose,
        remove,
        pick,
        edit,
        canEdit: (target) =>
            Boolean(transformImage) &&
            target.location !== "file" &&
            state.files.has(current(target)),
        missing,
        dispose() {
            state.removeEventListener("change", onChange);
            state.removeEventListener("replace", onReplace);
            settle({ status: "stale" });
            for (const { url } of cache.values()) urls.revokeObjectURL(url);
            cache.clear();
            picker?.remove();
            picker = null;
        },
    };
}

function own(table, key) {
    return typeof key === "string" && Object.hasOwn(table, key) ? table[key] : undefined;
}
