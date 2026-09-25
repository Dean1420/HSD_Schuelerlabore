/** @type {1} */
export const SCHEMA_VERSION = 1;

/** @type {readonly ValidationMode[]} */
export const MODES = Object.freeze(["draft", "publish"]);

/** @type {readonly ImageWidth[]} */
export const WIDTHS = Object.freeze(["third", "twoThirds", "full"]);

/**
 * Badge values. Additions need no schema version change.
 * @type {readonly Subject[]}
 */
export const SUBJECTS = Object.freeze(["D", "SK", "M"]);

export const SUBJECT_LABELS = Object.freeze({
    D: "Fachbereich Design",
    SK: "Fachbereich Sozial- und Kulturwissenschaften",
    M: "Fachbereich Medien",
});

export const SLUG_PATTERN = /^[a-z0-9]+(-[a-z0-9]+)*$/;

const ASSET_NAME_PATTERN = /^[a-z0-9][a-z0-9._-]*\.[a-z0-9]+$/;

const ROOT_KEYS = [
    "schemaVersion",
    "slug",
    "published",
    "title",
    "teaser",
    "thumbnail",
    "slogan",
    "authors",
    "subject",
    "gradeRange",
    "tags",
    "moreInfoUrl",
    "sections",
];

/**
 * Default section order.
 * @type {readonly Exclude<SectionKind, "custom">[]}
 */
export const SECTION_ORDER = Object.freeze([
    "overview",
    "instructions",
    "materials",
    "teachers",
    "impressions",
    "contributors",
]);

// `required` blocks publication when empty; `checklist` only prompts the author.
export const SECTION_KINDS = Object.freeze({
    overview: {
        title: "Übersicht",
        subsections: {
            description: {
                title: "Beschreibung",
                defaultBlocks: ["quote", "text"],
                required: true,
                checklist: false,
            },
        },
    },
    instructions: {
        title: "Anleitung",
        subsections: {
            intro: {
                title: "Einführung",
                defaultBlocks: ["text"],
                required: false,
                checklist: false,
            },
            schedule: {
                title: "Ablauf",
                defaultBlocks: ["phases"],
                required: false,
                checklist: true,
            },
        },
    },
    materials: {
        title: "Materialien",
        subsections: {
            documents: {
                title: "Unterlagen",
                defaultBlocks: ["file"],
                required: false,
                checklist: false,
            },
            resources: {
                title: "Ressourcen",
                defaultBlocks: ["link"],
                required: false,
                checklist: false,
            },
        },
    },
    teachers: {
        title: "Für Lehrende",
        subsections: {
            learningContent: {
                title: "Lerninhalt",
                defaultBlocks: ["text"],
                required: false,
                checklist: true,
            },
            competencies: {
                title: "Weiterführende Kompetenzen",
                defaultBlocks: ["list"],
                required: false,
                checklist: false,
            },
            curriculum: {
                title: "Lehrplanbezug",
                defaultBlocks: ["text"],
                required: false,
                checklist: false,
            },
        },
    },
    impressions: {
        title: "Impressionen",
        subsections: {
            highlights: {
                title: "Eindrücke",
                defaultBlocks: ["gallery"],
                required: false,
                checklist: false,
            },
            gallery: {
                title: "Bildergalerie",
                defaultBlocks: ["gallery"],
                required: false,
                checklist: false,
            },
        },
    },
    contributors: {
        title: "Ansprechpartner",
        subsections: {
            people: {
                title: "Beteiligte",
                defaultBlocks: ["people"],
                required: false,
                checklist: false,
            },
        },
    },
    custom: {
        title: "",
        subsections: {},
    },
});

const SECTION_FIELDS = {
    overview: {
        create: () => ({
            heroImage: createImage(),
            facts: { location: "", groupSize: "", topics: "", prerequisites: "", duration: "" },
        }),
        validate(fields, path, ctx) {
            if (!checkMembers(fields, path, ["heroImage", "facts"], ctx)) return;
            validateImage(fields.heroImage, `${path}.heroImage`, ctx, {
                location: "image",
                allowEmptyAlt: true,
            });
            checkStringMembers(
                fields.facts,
                `${path}.facts`,
                ["location", "groupSize", "topics", "prerequisites", "duration"],
                ctx,
            );
        },
        hasContent: (fields) =>
            isSet(fields?.heroImage?.src) || Object.values(fields?.facts ?? {}).some(isNonBlank),
    },
    teachers: {
        create: () => ({
            quote: { text: "", author: "" },
            facts: { schoolTypes: "", requirements: "" },
        }),
        validate(fields, path, ctx) {
            if (!checkMembers(fields, path, ["quote", "facts"], ctx)) return;
            checkStringMembers(fields.quote, `${path}.quote`, ["text", "author"], ctx);
            checkStringMembers(fields.facts, `${path}.facts`, ["schoolTypes", "requirements"], ctx);
        },
        hasContent: (fields) =>
            isNonBlank(fields?.quote?.text) || Object.values(fields?.facts ?? {}).some(isNonBlank),
    },
};

// `collections` creates empty array entries; a new phase starts with one empty step.
export const BLOCK_TYPES = Object.freeze({
    text: {
        keys: ["text"],
        create: () => ({ text: "" }),
        validate: (block, path, ctx) =>
            checkStringMembers(block, path, ["text"], ctx, ["id", "type"]),
        isFilled: (block) => isNonBlank(block.text),
    },
    image: {
        keys: ["src", "alt", "caption", "width"],
        create: () => createImage({ caption: true, width: true }),
        validate: (block, path, ctx) =>
            validateImage(block, path, ctx, {
                location: "image",
                allowEmptyAlt: false,
                extras: true,
                ignore: ["id", "type"],
            }),
        isFilled: (block) => isSet(block.src),
    },
    gallery: {
        keys: ["images"],
        create: () => ({ images: [] }),
        collections: { images: () => createImage({ caption: true, width: true }) },
        validate(block, path, ctx) {
            if (!checkMembers(block, path, ["images"], ctx, ["id", "type"])) return;
            if (!checkArray(block.images, `${path}.images`, ctx)) return;
            block.images.forEach((image, i) =>
                validateImage(image, `${path}.images[${i}]`, ctx, {
                    location: "image",
                    allowEmptyAlt: false,
                    extras: true,
                }),
            );
        },
        isFilled: (block) =>
            Array.isArray(block.images) && block.images.some((image) => isSet(image?.src)),
    },
    quote: {
        keys: ["text", "author"],
        create: () => ({ text: "", author: "" }),
        validate: (block, path, ctx) =>
            checkStringMembers(block, path, ["text", "author"], ctx, ["id", "type"]),
        isFilled: (block) => isNonBlank(block.text),
    },
    list: {
        keys: ["items"],
        create: () => ({ items: [] }),
        collections: { items: () => "" },
        validate(block, path, ctx) {
            if (!checkMembers(block, path, ["items"], ctx, ["id", "type"])) return;
            checkStringArray(block.items, `${path}.items`, ctx);
        },
        isFilled: (block) => Array.isArray(block.items) && block.items.some(isNonBlank),
    },
    link: {
        keys: ["label", "url"],
        create: () => ({ label: "", url: "" }),
        validate(block, path, ctx) {
            if (!checkStringMembers(block, path, ["label", "url"], ctx, ["id", "type"])) return;
            if (isSet(block.url) && !isExternalUrl(block.url)) {
                ctx.error(`${path}.url`, "must be an absolute http(s) URL");
            }
        },
        isFilled: (block) => isSet(block.url),
    },
    file: {
        keys: ["label", "file"],
        create: () => ({ label: "", file: "" }),
        validate(block, path, ctx) {
            if (!checkStringMembers(block, path, ["label", "file"], ctx, ["id", "type"])) return;
            if (isSet(block.file) && !isAssetPath(block.file, "file")) {
                ctx.error(`${path}.file`, "must be an asset path of the form files/<name>");
            }
        },
        isFilled: (block) => isSet(block.file),
    },
    phases: {
        keys: ["phases"],
        create: () => ({ phases: [] }),
        collections: {
            phases: () => ({ title: "", steps: [createStep()] }),
            steps: () => createStep(),
        },
        validate(block, path, ctx) {
            if (!checkMembers(block, path, ["phases"], ctx, ["id", "type"])) return;
            if (!checkArray(block.phases, `${path}.phases`, ctx)) return;
            block.phases.forEach((phase, i) => {
                const phasePath = `${path}.phases[${i}]`;
                if (!checkMembers(phase, phasePath, ["title", "steps"], ctx)) return;
                checkString(phase.title, `${phasePath}.title`, ctx);
                if (!checkArray(phase.steps, `${phasePath}.steps`, ctx)) return;
                phase.steps.forEach((step, j) =>
                    checkStringMembers(
                        step,
                        `${phasePath}.steps[${j}]`,
                        ["title", "duration", "description", "method"],
                        ctx,
                    ),
                );
            });
        },
        isFilled: (block) =>
            Array.isArray(block.phases) &&
            block.phases.some(
                (phase) =>
                    Array.isArray(phase?.steps) &&
                    phase.steps.some((step) => isNonBlank(step?.title)),
            ),
    },
    people: {
        keys: ["people"],
        create: () => ({ people: [] }),
        collections: {
            people: () => ({ image: createImage(), name: "", description: "" }),
        },
        validate(block, path, ctx) {
            if (!checkMembers(block, path, ["people"], ctx, ["id", "type"])) return;
            if (!checkArray(block.people, `${path}.people`, ctx)) return;
            block.people.forEach((person, i) => {
                const personPath = `${path}.people[${i}]`;
                if (!checkMembers(person, personPath, ["image", "name", "description"], ctx))
                    return;
                validateImage(person.image, `${personPath}.image`, ctx, {
                    location: "image",
                    allowEmptyAlt: false,
                });
                checkString(person.name, `${personPath}.name`, ctx);
                checkString(person.description, `${personPath}.description`, ctx);
            });
        },
        isFilled: (block) =>
            Array.isArray(block.people) && block.people.some((person) => isNonBlank(person?.name)),
    },
});

/**
 * Creates a draft with all standard sections and their default blocks.
 * @returns {Workshop}
 */
export function createEmptyWorkshop() {
    return {
        schemaVersion: SCHEMA_VERSION,
        slug: "",
        published: false,
        title: "",
        teaser: "",
        thumbnail: createImage(),
        slogan: "",
        authors: "",
        subject: "",
        gradeRange: null,
        tags: [],
        moreInfoUrl: "",
        sections: SECTION_ORDER.map((kind) => createSection(kind)),
    };
}

/**
 * Includes default subsections; custom sections start empty.
 * @template {SectionKind} K
 * @param {K} kind
 * @param {{ title?: string }} [options]
 * @returns {SectionMap[K]}
 */
export function createSection(kind, { title } = {}) {
    const definition = lookup(SECTION_KINDS, kind);
    if (!definition) throw new RangeError(`Unknown section kind '${kind}'`);
    const fields = lookup(SECTION_FIELDS, kind);
    return {
        id: newId(),
        kind,
        title: title ?? definition.title,
        fields: fields ? fields.create() : {},
        subsections: Object.keys(definition.subsections).map((subsectionKind) =>
            createSubsection(kind, subsectionKind),
        ),
    };
}

/**
 * Creates a permitted subsection with its defaults.
 * @template {SectionKind} S
 * @template {SubsectionKinds[S]} K
 * @param {S} sectionKind
 * @param {K} kind
 * @param {{ title?: string }} [options]
 * @returns {Subsection<K>}
 */
export function createSubsection(sectionKind, kind, { title } = {}) {
    if (kind === "custom") {
        return { id: newId(), kind, title: title ?? "", blocks: [] };
    }
    const definition = lookup(lookup(SECTION_KINDS, sectionKind)?.subsections ?? {}, kind);
    if (!definition) {
        throw new RangeError(
            `Subsection kind '${kind}' is not permitted in section '${sectionKind}'`,
        );
    }
    return {
        id: newId(),
        kind,
        title: title ?? definition.title,
        blocks: definition.defaultBlocks.map((type) => createBlock(type)),
    };
}

/**
 * Creates an empty block with the fields belonging to its type.
 * @template {BlockType} T
 * @param {T} type
 * @returns {BlockMap[T]}
 */
export function createBlock(type) {
    const definition = lookup(BLOCK_TYPES, type);
    if (!definition) throw new RangeError(`Unknown block type '${type}'`);
    return { id: newId(), type, ...definition.create() };
}

/**
 * An empty, draft-valid entry for an array inside a block, e.g. createItem("phases", "steps").
 * @template {keyof CollectionItems} T
 * @template {keyof CollectionItems[T]} K
 * @param {T} blockType
 * @param {K} collection
 * @returns {CollectionItems[T][K]}
 */
export function createItem(blockType, collection) {
    const factory = lookup(lookup(BLOCK_TYPES, blockType)?.collections ?? {}, collection);
    if (!factory) throw new RangeError(`Block type '${blockType}' has no array '${collection}'`);
    return factory();
}

function createStep() {
    return { title: "", duration: "", description: "", method: "" };
}

function createImage({ caption = false, width = false } = {}) {
    const image = { src: "", alt: "" };
    if (caption) image.caption = "";
    if (width) image.width = "full";
    return image;
}

export function newId() {
    const cryptoApi = globalThis.crypto;
    if (cryptoApi && typeof cryptoApi.randomUUID === "function") return cryptoApi.randomUUID();
    let id = "";
    while (id.length < 32) id += Math.floor(Math.random() * 16).toString(16);
    return id;
}

/**
 * Title fallback; empty for custom or unknown kinds.
 * @param {string} kind
 */
export function defaultTitle(kind) {
    const section = lookup(SECTION_KINDS, kind);
    if (section) return section.title;
    for (const definition of Object.values(SECTION_KINDS)) {
        const subsection = lookup(definition.subsections, kind);
        if (subsection) return subsection.title;
    }
    return "";
}

/**
 * @param {unknown} block
 * @returns {boolean}
 */
export function isBlockFilled(block) {
    const definition = isPlainObject(block) ? lookup(BLOCK_TYPES, block.type) : undefined;
    return definition ? definition.isFilled(block) : false;
}

/**
 * @param {unknown} subsection
 * @returns {boolean}
 */
export function isSubsectionEmpty(subsection) {
    return !(Array.isArray(subsection?.blocks) && subsection.blocks.some(isBlockFilled));
}

/**
 * @param {unknown} section
 * @returns {boolean}
 */
export function isSectionEmpty(section) {
    if (
        Array.isArray(section?.subsections) &&
        section.subsections.some((s) => !isSubsectionEmpty(s))
    ) {
        return false;
    }
    const fields = lookup(SECTION_FIELDS, section?.kind);
    return !(fields && fields.hasContent(section.fields));
}

/**
 * Local paths: images/<name>, files/<name>, or <name> for thumbnails.
 * @param {unknown} value
 * @param {AssetLocation} location
 * @returns {boolean}
 */
export function isAssetPath(value, location) {
    if (typeof value !== "string") return false;
    const parts = value.split("/");
    if (location === "thumbnail") return parts.length === 1 && ASSET_NAME_PATTERN.test(parts[0]);
    const directory = location === "file" ? "files" : "images";
    return parts.length === 2 && parts[0] === directory && ASSET_NAME_PATTERN.test(parts[1]);
}

/**
 * @param {unknown} value
 * @returns {boolean}
 */
export function isExternalUrl(value) {
    if (typeof value !== "string" || !/^https?:\/\//i.test(value)) return false;
    try {
        const url = new URL(value);
        return (url.protocol === "http:" || url.protocol === "https:") && url.hostname !== "";
    } catch {
        return false;
    }
}

/**
 * ASCII kebab-case with ä→ae, ö→oe, ü→ue and ß→ss.
 * @param {string} text
 */
export function slugify(text) {
    const umlauts = { ä: "ae", ö: "oe", ü: "ue", ß: "ss" };
    return String(text)
        .normalize("NFC")
        .toLowerCase()
        .replace(/[äöüß]/g, (ch) => umlauts[ch])
        .normalize("NFD")
        .replace(/\p{M}+/gu, "")
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "");
}

/**
 * Keeps current documents; rejects unsupported versions. Validation is a separate step.
 * @template T
 * @param {T} document
 * @returns {T}
 */
export function migrate(document) {
    if (!isPlainObject(document)) throw new TypeError("Expected a workshop document object");
    if (document.schemaVersion === SCHEMA_VERSION) {
        // Backfill `authors` for older documents with the same schema version.
        return "authors" in document ? document : { ...document, authors: "" };
    }
    throw new Error(
        `Unsupported schemaVersion ${JSON.stringify(document.schemaVersion)}; supported: ${SCHEMA_VERSION}`,
    );
}

/**
 * Returns { path, message } errors, or [] when valid. Call migrate() first.
 * @param {unknown} document
 * @param {{ mode?: ValidationMode }} [options]
 * @returns {ValidationError[]}
 */
export function validateWorkshop(document, { mode = "draft" } = {}) {
    if (!MODES.includes(mode)) throw new RangeError(`Unknown validation mode '${mode}'`);
    const errors = [];
    const ctx = {
        mode,
        publish: mode === "publish",
        ids: new Map(),
        error: (path, message) => errors.push({ path, message }),
    };

    if (!checkMembers(document, "", ROOT_KEYS, ctx)) return errors;

    if (document.schemaVersion !== SCHEMA_VERSION) {
        ctx.error("schemaVersion", `must be ${SCHEMA_VERSION}; call migrate() first`);
    }
    if (checkString(document.slug, "slug", ctx)) {
        if ((ctx.publish || document.slug !== "") && !SLUG_PATTERN.test(document.slug)) {
            ctx.error("slug", `must match ${SLUG_PATTERN}`);
        }
    }
    if (typeof document.published !== "boolean") ctx.error("published", "must be a boolean");
    for (const key of ["title", "teaser", "slogan", "authors", "moreInfoUrl"])
        checkString(document[key], key, ctx);
    if (ctx.publish) {
        if (!isNonBlank(document.title)) ctx.error("title", "must not be blank for publishing");
        if (!isNonBlank(document.teaser)) ctx.error("teaser", "must not be blank for publishing");
    }
    validateImage(document.thumbnail, "thumbnail", ctx, {
        location: "thumbnail",
        allowEmptyAlt: true,
    });
    if (ctx.publish && !isSet(document.thumbnail?.src)) {
        ctx.error("thumbnail.src", "must be set for publishing");
    }
    if (checkString(document.subject, "subject", ctx)) {
        if (document.subject !== "" && !SUBJECTS.includes(document.subject)) {
            ctx.error("subject", `must be one of ${SUBJECTS.join(", ")} or empty`);
        }
    }
    validateGradeRange(document.gradeRange, "gradeRange", ctx);
    checkStringArray(document.tags, "tags", ctx);
    if (isSet(document.moreInfoUrl) && !isExternalUrl(document.moreInfoUrl)) {
        ctx.error("moreInfoUrl", "must be an absolute http(s) URL");
    }
    if (checkArray(document.sections, "sections", ctx)) validateSections(document.sections, ctx);

    return errors;
}

function validateGradeRange(value, path, ctx) {
    if (value === null) return;
    if (!checkMembers(value, path, ["min", "max"], ctx)) return;
    const { min, max } = value;
    if (!Number.isInteger(min)) ctx.error(`${path}.min`, "must be an integer");
    if (!Number.isInteger(max)) ctx.error(`${path}.max`, "must be an integer");
    if (Number.isInteger(min) && Number.isInteger(max) && min > max) {
        ctx.error(path, "min must not exceed max");
    }
}

function validateSections(sections, ctx) {
    const seenKinds = new Map();
    sections.forEach((section, i) => {
        const path = `sections[${i}]`;
        if (!checkMembers(section, path, ["id", "kind", "title", "fields", "subsections"], ctx))
            return;
        checkId(section.id, `${path}.id`, ctx);
        checkString(section.title, `${path}.title`, ctx);
        if (!lookup(SECTION_KINDS, section.kind)) {
            ctx.error(`${path}.kind`, "unknown section kind");
            return;
        }
        if (section.kind !== "custom") {
            if (seenKinds.has(section.kind)) {
                ctx.error(`${path}.kind`, `section kind '${section.kind}' occurs more than once`);
            }
            seenKinds.set(section.kind, path);
        }
        const fields = lookup(SECTION_FIELDS, section.kind);
        if (fields) fields.validate(section.fields, `${path}.fields`, ctx);
        else checkMembers(section.fields, `${path}.fields`, [], ctx);
        if (checkArray(section.subsections, `${path}.subsections`, ctx)) {
            validateSubsections(section, path, ctx);
        }
        if (ctx.publish && section.kind === "custom" && !isNonBlank(section.title)) {
            ctx.error(`${path}.title`, "custom sections need a title for publishing");
        }
    });
    for (const kind of SECTION_ORDER) {
        if (!seenKinds.has(kind)) ctx.error("sections", `section kind '${kind}' is missing`);
    }
}

function validateSubsections(section, sectionPath, ctx) {
    const permitted = lookup(SECTION_KINDS, section.kind).subsections;
    const seenKinds = new Map();
    section.subsections.forEach((subsection, i) => {
        const path = `${sectionPath}.subsections[${i}]`;
        if (!checkMembers(subsection, path, ["id", "kind", "title", "blocks"], ctx)) return;
        checkId(subsection.id, `${path}.id`, ctx);
        checkString(subsection.title, `${path}.title`, ctx);
        if (subsection.kind !== "custom" && !lookup(permitted, subsection.kind)) {
            ctx.error(`${path}.kind`, `subsection kind not permitted in section '${section.kind}'`);
            return;
        }
        if (subsection.kind !== "custom") {
            if (seenKinds.has(subsection.kind)) {
                ctx.error(
                    `${path}.kind`,
                    `subsection kind '${subsection.kind}' occurs more than once`,
                );
            }
            seenKinds.set(subsection.kind, { path, index: i });
        }
        if (checkArray(subsection.blocks, `${path}.blocks`, ctx)) {
            subsection.blocks.forEach((block, j) =>
                validateBlock(block, `${path}.blocks[${j}]`, ctx),
            );
        }
        if (
            ctx.publish &&
            subsection.kind === "custom" &&
            !isSubsectionEmpty(subsection) &&
            !isNonBlank(subsection.title)
        ) {
            ctx.error(
                `${path}.title`,
                "custom subsections with content need a title for publishing",
            );
        }
    });
    if (!ctx.publish) return;
    for (const [kind, definition] of Object.entries(permitted)) {
        if (!definition.required) continue;
        const seen = seenKinds.get(kind);
        if (!seen) {
            ctx.error(`${sectionPath}.subsections`, `required subsection '${kind}' is missing`);
        } else if (isSubsectionEmpty(section.subsections[seen.index])) {
            ctx.error(seen.path, `required subsection '${kind}' has no filled block`);
        }
    }
}

function validateBlock(block, path, ctx) {
    if (!isPlainObject(block)) {
        ctx.error(path, "expected an object");
        return;
    }
    const definition = lookup(BLOCK_TYPES, block.type);
    if (!definition) {
        ctx.error(`${path}.type`, "unknown block type");
        return;
    }
    checkId(block.id, `${path}.id`, ctx);
    definition.validate(block, path, ctx);
}

/** `extras` enables caption/width. `allowEmptyAlt` exempts hero images and thumbnails. */
function validateImage(image, path, ctx, { location, allowEmptyAlt, extras = false, ignore = [] }) {
    const keys = extras ? ["src", "alt", "caption", "width"] : ["src", "alt"];
    if (!checkMembers(image, path, keys, ctx, ignore)) return;
    if (
        checkString(image.src, `${path}.src`, ctx) &&
        isSet(image.src) &&
        !isAssetPath(image.src, location)
    ) {
        const form = location === "thumbnail" ? "<name>" : `${location}s/<name>`;
        ctx.error(`${path}.src`, `must be an asset path of the form ${form}`);
    }
    checkString(image.alt, `${path}.alt`, ctx);
    if (extras) {
        checkString(image.caption, `${path}.caption`, ctx);
        if (!WIDTHS.includes(image.width))
            ctx.error(`${path}.width`, `must be one of ${WIDTHS.join(", ")}`);
    }
    if (ctx.publish && !allowEmptyAlt && isSet(image.src) && !isNonBlank(image.alt)) {
        ctx.error(`${path}.alt`, "images need alt text for publishing");
    }
}

function isPlainObject(value) {
    return typeof value === "object" && value !== null && !Array.isArray(value);
}

/** Own-property lookup so that keys such as "constructor" never resolve to Object.prototype. */
function lookup(table, key) {
    return typeof key === "string" && Object.hasOwn(table, key) ? table[key] : undefined;
}

function isSet(value) {
    return typeof value === "string" && value !== "";
}

function isNonBlank(value) {
    return typeof value === "string" && value.trim() !== "";
}

// Missing keys stop deeper checks to avoid duplicate errors; `ignore` is checked elsewhere.
function checkMembers(value, path, keys, ctx, ignore = []) {
    if (!isPlainObject(value)) {
        ctx.error(path || "document", "expected an object");
        return false;
    }
    const expected = new Set([...keys, ...ignore]);
    for (const key of Object.keys(value)) {
        if (!expected.has(key)) ctx.error(path ? `${path}.${key}` : key, "unknown member");
    }
    let complete = true;
    for (const key of keys) {
        if (!(key in value)) {
            ctx.error(path ? `${path}.${key}` : key, "missing member");
            complete = false;
        }
    }
    return complete;
}

function checkString(value, path, ctx) {
    if (typeof value === "string") return true;
    ctx.error(path, "must be a string");
    return false;
}

function checkStringMembers(value, path, keys, ctx, ignore = []) {
    if (!checkMembers(value, path, keys, ctx, ignore)) return false;
    let ok = true;
    for (const key of keys) ok = checkString(value[key], `${path}.${key}`, ctx) && ok;
    return ok;
}

function checkArray(value, path, ctx) {
    if (Array.isArray(value)) return true;
    ctx.error(path, "must be an array");
    return false;
}

function checkStringArray(value, path, ctx) {
    if (!checkArray(value, path, ctx)) return false;
    let ok = true;
    value.forEach((item, i) => {
        ok = checkString(item, `${path}[${i}]`, ctx) && ok;
    });
    return ok;
}

function checkId(value, path, ctx) {
    if (!isSet(value)) {
        ctx.error(path, "must be a non-empty string");
        return;
    }
    const firstPath = ctx.ids.get(value);
    if (firstPath) ctx.error(path, `duplicate identifier; first used at ${firstPath}`);
    else ctx.ids.set(value, path);
}

/** @typedef {"draft" | "publish"} ValidationMode */

/** @typedef {"third" | "twoThirds" | "full"} ImageWidth */

/** @typedef {"D" | "SK" | "M"} Subject */

/** @typedef {"image" | "thumbnail" | "file"} AssetLocation */

/** @typedef {{ path: string, message: string }} ValidationError */

/** @typedef {{ min: number, max: number }} GradeRange */

/**
 * An image reference. Paths are relative to the workshop folder.
 * @typedef {object} WorkshopImage
 * @property {string} src A root filename for the thumbnail, otherwise images/<name>; empty in drafts.
 * @property {string} alt Accessible description; required for publishing except on the thumbnail and hero.
 */

/** @typedef {WorkshopImage & { caption: string, width: ImageWidth }} FigureImage */

/** @typedef {{ title: string, duration: string, description: string, method: string }} Step */

/** @typedef {{ title: string, steps: Step[] }} Phase */

/** @typedef {{ image: WorkshopImage, name: string, description: string }} Person */

/**
 * Payloads for the closed set of block types. Factories add the id and type.
 * @typedef {object} BlockFields
 * @property {{ text: string }} text
 * @property {FigureImage} image
 * @property {{ images: FigureImage[] }} gallery
 * @property {{ text: string, author: string }} quote
 * @property {{ items: string[] }} list
 * @property {{ label: string, url: string }} link
 * @property {{ label: string, file: string }} file
 * @property {{ phases: Phase[] }} phases
 * @property {{ people: Person[] }} people
 */

/**
 * @typedef {"text" | "image" | "gallery" | "quote" | "list" | "link" | "file" | "phases" | "people"} BlockType
 */

/**
 * @typedef {{ [T in BlockType]: { id: string, type: T } & BlockFields[T] }} BlockMap
 */

/**
 * Narrow a Block by its type, e.g. `if (block.type === "image") block.src`.
 * @typedef {BlockMap[BlockType]} Block
 */

/**
 * The entry returned by createItem depends on both the block type and collection.
 * @typedef {object} CollectionItems
 * @property {{ images: FigureImage }} gallery
 * @property {{ items: string }} list
 * @property {{ phases: Phase, steps: Step }} phases
 * @property {{ people: Person }} people
 */

/**
 * Section kinds are explicit so editors can resolve them without evaluating Object.freeze.
 * @typedef {"overview" | "instructions" | "materials" | "teachers" | "impressions" | "contributors" | "custom"} SectionKind
 */

/**
 * @typedef {object} SubsectionKinds
 * @property {"description" | "custom"} overview
 * @property {"intro" | "schedule" | "custom"} instructions
 * @property {"documents" | "resources" | "custom"} materials
 * @property {"learningContent" | "competencies" | "curriculum" | "custom"} teachers
 * @property {"highlights" | "gallery" | "custom"} impressions
 * @property {"people" | "custom"} contributors
 * @property {"custom"} custom
 */

/**
 * @typedef {SubsectionKinds[SectionKind]} SubsectionKind
 */

/**
 * An ordered group of blocks. Any block type can appear in any subsection.
 * @template {SubsectionKind} [K=SubsectionKind]
 * @typedef {object} Subsection
 * @property {string} id Stable, unique identifier generated by the factory.
 * @property {K} kind
 * @property {string} title Blank built-in titles fall back to their defaults.
 * @property {Block[]} blocks
 */

/**
 * @typedef {object} OverviewFields
 * @property {WorkshopImage} heroImage
 * @property {{ location: string, groupSize: string, topics: string, prerequisites: string, duration: string }} facts
 */

/**
 * @typedef {object} TeacherFields
 * @property {{ text: string, author: string }} quote
 * @property {{ schoolTypes: string, requirements: string }} facts
 */

/**
 * Only overview and teachers carry structured fields; other sections use blocks.
 * @typedef {{ overview: OverviewFields, teachers: TeacherFields }} SectionFields
 */

/**
 * @typedef {{ [K in SectionKind]: {
 *   id: string,
 *   kind: K,
 *   title: string,
 *   fields: K extends keyof SectionFields ? SectionFields[K] : Record<string, never>,
 *   subsections: Subsection<SubsectionKinds[K]>[]
 * } }} SectionMap
 */

/**
 * @typedef {SectionMap[SectionKind]} Section
 */

/**
 * A workshop document. Start with createEmptyWorkshop(), then fill the returned data.
 * Types describe the shape; validateWorkshop checks content and publication requirements.
 * @typedef {object} Workshop
 * @property {1} schemaVersion
 * @property {string} slug Folder name in lowercase kebab-case; use slugify(title).
 * @property {boolean} published
 * @property {string} title Required for publishing.
 * @property {string} teaser Short course-card description; required for publishing.
 * @property {WorkshopImage} thumbnail Required for publishing; src is a root filename.
 * @property {string} slogan
 * @property {Subject | ""} subject Empty means unspecified.
 * @property {GradeRange | null} gradeRange Null means unspecified.
 * @property {string[]} tags
 * @property {string} authors Who made the workshop, shown as a byline; free text, or empty.
 * @property {string} moreInfoUrl Absolute http(s) URL, or empty.
 * @property {Section[]} sections Ordered sections; each built-in kind occurs exactly once.
 */
