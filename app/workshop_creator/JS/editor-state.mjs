// Owners use stable IDs (ROOT_OWNER for the document); field paths are relative to each owner.
// Structural edits preserve the document and files, rebuild the index and emit one change event.
import {
    slugify,
    migrate,
    validateWorkshop,
    createSection,
    createSubsection,
    createBlock,
    createItem,
    SECTION_KINDS,
    BLOCK_TYPES,
} from "../../assets/js/workshop-schema.mjs";

// A symbol keeps root ownership separate from all valid string IDs.
export const ROOT_OWNER = Symbol("workshop");

export function createEditorState(initialDocument) {
    const events = new EventTarget();
    /** Where each section, subsection and block sits: { list, owner, field }. */
    let places = new Map();

    const state = {
        document: null,
        /** Selected files by asset path. The document stores only the paths. */
        files: new Map(),
        slugLocked: false,
        index: new Map(),

        addEventListener: (type, listener) => events.addEventListener(type, listener),
        removeEventListener: (type, listener) => events.removeEventListener(type, listener),

        // Replacing the document drops its files unless replacements are supplied.
        replace(document, { files } = {}) {
            this.document = document;
            this.slugLocked = document.slug !== "";
            this.files.clear();
            for (const [path, file] of files ?? []) this.files.set(path, file);
            this.reindex();
            emit("replace", { document });
        },

        // Reject invalid imports with `errors` attached, leaving the current document untouched.
        load(raw, options) {
            const document = migrate(raw);
            const errors = validateWorkshop(document, { mode: "draft" });
            if (errors.length) {
                const first = errors[0];
                const error = new Error(
                    `${errors.length} Validierungsfehler, z. B. ${first.path}: ${first.message}`,
                );
                error.errors = errors;
                throw error;
            }
            this.replace(document, options);
            return document;
        },

        /** Rebuilds the id index; structural operations call it themselves. */
        reindex() {
            this.index = new Map();
            places = new Map();
            const add = (object, list, owner, field) => {
                this.index.set(object.id, object);
                places.set(object.id, { list, owner, field });
            };
            for (const section of this.document.sections) {
                add(section, this.document.sections, ROOT_OWNER, "sections");
                for (const subsection of section.subsections) {
                    add(subsection, section.subsections, section.id, "subsections");
                    for (const block of subsection.blocks) {
                        add(block, subsection.blocks, subsection.id, "blocks");
                    }
                }
            }
        },

        resolve(owner) {
            if (owner === ROOT_OWNER) return this.document;
            const object = this.index.get(owner);
            if (!object) throw new RangeError(`Unknown owner '${String(owner)}'`);
            return object;
        },

        set(owner, field, value, { source = "state" } = {}) {
            const object = this.resolve(owner);
            const previous = assignPath(object, field, value);
            emit("change", { owner, field, value, previous, source });
            if (owner === ROOT_OWNER && field === "title" && !this.slugLocked) {
                const slug = slugify(value);
                if (slug !== this.document.slug) {
                    const previousSlug = this.document.slug;
                    this.document.slug = slug;
                    emit("change", {
                        owner: ROOT_OWNER,
                        field: "slug",
                        value: slug,
                        previous: previousSlug,
                        source: "state",
                    });
                }
            }
            return previous;
        },

        /** An explicitly set slug stops following the title; clearing it resumes following. */
        setSlug(value, { source = "state" } = {}) {
            const previous = this.document.slug;
            this.document.slug = value;
            this.slugLocked = value !== "";
            emit("change", { owner: ROOT_OWNER, field: "slug", value, previous, source });
            return previous;
        },

        addSection({ index, source = "state" } = {}) {
            const section = createSection("custom");
            insert(this.document.sections, section, index);
            this.reindex();
            emitStructure(ROOT_OWNER, "sections", "add", section.id, source);
            return section;
        },

        addSubsection(sectionId, kind, { index, source = "state" } = {}) {
            const section = this.resolve(sectionId);
            if (places.get(sectionId)?.field !== "sections") {
                throw new RangeError(`'${sectionId}' is not a section`);
            }
            if (!this.addableSubsectionKinds(sectionId).includes(kind)) {
                throw new RangeError(
                    `Cannot add subsection '${kind}' to section '${section.kind}'`,
                );
            }
            const subsection = createSubsection(section.kind, kind);
            insert(section.subsections, subsection, index);
            this.reindex();
            emitStructure(sectionId, "subsections", "add", subsection.id, source);
            return subsection;
        },

        addBlock(subsectionId, type, { index, source = "state" } = {}) {
            if (places.get(subsectionId)?.field !== "subsections") {
                throw new RangeError(`'${subsectionId}' is not a subsection`);
            }
            const block = createBlock(type);
            insert(this.resolve(subsectionId).blocks, block, index);
            this.reindex();
            emitStructure(subsectionId, "blocks", "add", block.id, source);
            return block;
        },

        addableSubsectionKinds(sectionId) {
            const section = this.resolve(sectionId);
            const permitted = Object.hasOwn(SECTION_KINDS, section.kind)
                ? Object.keys(SECTION_KINDS[section.kind].subsections)
                : [];
            const present = new Set(section.subsections.map((subsection) => subsection.kind));
            return [...permitted.filter((kind) => !present.has(kind)), "custom"];
        },

        remove(id, { source = "state" } = {}) {
            const { object, place } = placed(id);
            if (place.field === "sections" && object.kind !== "custom") {
                throw new RangeError(`Built-in section '${object.kind}' cannot be removed`);
            }
            place.list.splice(place.list.indexOf(object), 1);
            this.reindex();
            emitStructure(place.owner, place.field, "remove", id, source);
            return object;
        },

        move(id, offset, { source = "state" } = {}) {
            const { object, place } = placed(id);
            if (!shift(place.list, place.list.indexOf(object), offset)) return false;
            this.reindex();
            emitStructure(place.owner, place.field, "move", id, source);
            return true;
        },

        // Array entries have no IDs and are addressed by path.

        addItem(blockId, collection, { index, source = "state" } = {}) {
            const block = itemBlock(blockId, collection);
            const list = readPath(block, collection);
            const position = insert(list, createItem(block.type, lastKey(collection)), index);
            const path = `${collection}[${position}]`;
            this.reindex();
            emitStructure(blockId, collection, "add", path, source);
            return path;
        },

        removeItem(blockId, path, { source = "state" } = {}) {
            const { list, position, collection } = itemPlace(blockId, path);
            const [item] = list.splice(position, 1);
            this.reindex();
            emitStructure(blockId, collection, "remove", path, source);
            return item;
        },

        moveItem(blockId, path, offset, { source = "state" } = {}) {
            const { list, position, collection } = itemPlace(blockId, path);
            if (!shift(list, position, offset)) return null;
            const moved = `${collection}[${position + offset}]`;
            this.reindex();
            emitStructure(blockId, collection, "move", moved, source);
            return moved;
        },
    };

    function emit(type, detail) {
        events.dispatchEvent(new CustomEvent(type, { detail }));
    }

    function emitStructure(owner, field, operation, target, source) {
        emit("change", { owner, field, operation, target, structural: true, source });
    }

    function placed(id) {
        const place = places.get(id);
        if (!place) throw new RangeError(`Unknown id '${String(id)}'`);
        return { object: state.index.get(id), place };
    }

    function itemBlock(blockId, collection) {
        if (places.get(blockId)?.field !== "blocks") {
            throw new RangeError(`'${String(blockId)}' is not a block`);
        }
        const block = state.index.get(blockId);
        const collections = BLOCK_TYPES[block.type]?.collections ?? {};
        if (!Object.hasOwn(collections, lastKey(collection))) {
            throw new RangeError(`Block type '${block.type}' has no array '${collection}'`);
        }
        if (!Array.isArray(readPath(block, collection))) {
            throw new RangeError(`Field path '${collection}' is not an array`);
        }
        return block;
    }

    function itemPlace(blockId, path) {
        const tokens = parsePath(path);
        const position = tokens.at(-1);
        if (typeof position !== "number") throw new RangeError(`'${path}' is not an entry path`);
        const collection = formatPath(tokens.slice(0, -1));
        const list = readPath(itemBlock(blockId, collection), collection);
        if (position >= list.length) throw new RangeError(`Entry '${path}' does not exist`);
        return { list, position, collection };
    }

    state.replace(initialDocument);
    return state;
}

function insert(list, item, index) {
    const position =
        index === undefined ? list.length : Math.max(0, Math.min(list.length, Math.trunc(index)));
    list.splice(position, 0, item);
    return position;
}

function shift(list, position, offset) {
    const target = position + offset;
    if (!Number.isInteger(offset) || offset === 0 || target < 0 || target >= list.length) {
        return false;
    }
    const [item] = list.splice(position, 1);
    list.splice(target, 0, item);
    return true;
}

function lastKey(path) {
    return parsePath(path)
        .filter((token) => typeof token === "string")
        .at(-1);
}

const PATH_TOKEN = /([^.[\]]+)|\[(\d+)\]/g;

/** Parses "fields.facts.location" or "phases[0].steps[1].title" into keys and indices. */
export function parsePath(path) {
    const tokens = [];
    for (const match of String(path).matchAll(PATH_TOKEN)) {
        tokens.push(match[2] !== undefined ? Number(match[2]) : match[1]);
    }
    if (!tokens.length) throw new RangeError(`Empty field path '${path}'`);
    return tokens;
}

export function formatPath(tokens) {
    return tokens.reduce(
        (path, token) =>
            typeof token === "number" ? `${path}[${token}]` : path ? `${path}.${token}` : token,
        "",
    );
}

export function readPath(object, path) {
    let target = object;
    for (const token of parsePath(path)) {
        if (target === null || typeof target !== "object" || !(token in target)) {
            throw new RangeError(`Field path '${path}' does not exist`);
        }
        target = target[token];
    }
    return target;
}

export function findPath(root, target) {
    if (root === target) return [];
    if (root === null || typeof root !== "object") return null;
    const entries = Array.isArray(root) ? root.entries() : Object.entries(root);
    for (const [key, value] of entries) {
        const rest = findPath(value, target);
        if (rest) return [key, ...rest];
    }
    return null;
}

/** Assigns `value` at `path` inside `object`; every intermediate container must exist. */
export function assignPath(object, path, value) {
    const tokens = parsePath(path);
    let target = object;
    for (const token of tokens.slice(0, -1)) {
        target = target?.[token];
        if (target === null || typeof target !== "object") {
            throw new RangeError(`Field path '${path}' does not exist`);
        }
    }
    const last = tokens.at(-1);
    if (typeof target !== "object" || target === null || !(last in target)) {
        throw new RangeError(`Field path '${path}' does not exist`);
    }
    const previous = target[last];
    target[last] = value;
    return previous;
}
