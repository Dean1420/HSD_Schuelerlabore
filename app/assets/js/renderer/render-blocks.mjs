import { isBlockFilled, WIDTHS } from "../workshop-schema.mjs";
import {
    createElement,
    append,
    markEditable,
    markItem,
    markItems,
    markAsset,
    isNonBlank,
    isSet,
} from "./element.mjs";

const WIDTH_CLASS = { third: "width-third", twoThirds: "width-two-thirds", full: "width-full" };
// Roughly ten lines at the reading width.
const WIDE_TEXT_LENGTH = 700;
const WIDTH_LABELS = { third: "Ein Drittel", twoThirds: "Zwei Drittel", full: "Volle Breite" };

export function renderBlock(block, context) {
    if (!block || typeof block.type !== "string" || !Object.hasOwn(RENDERERS, block.type)) {
        return null;
    }
    if (!context.editable && !isBlockFilled(block)) return null;
    const node = RENDERERS[block.type](block, context);
    if (!node) return null;
    node.classList.add("block", `block-${block.type}`);
    if (context.editable) node.setAttribute("data-block-id", block.id);
    return node;
}

export function renderImage(image, context, attributes = {}) {
    if (!image || !isSet(image.src)) return null;
    const src = context.resolveAsset(image.src);
    if (!src) return null;
    return createElement(context, "img", {
        src,
        alt: typeof image.alt === "string" ? image.alt : "",
        loading: "lazy",
        decoding: "async",
        ...attributes,
    });
}

export function applyWidthClass(node, width) {
    node.classList.remove(...Object.values(WIDTH_CLASS));
    node.classList.add(Object.hasOwn(WIDTH_CLASS, width) ? WIDTH_CLASS[width] : WIDTH_CLASS.full);
}

export function renderAltInput(context, field, value, placeholder = "Alternativtext") {
    return createElement(context, "input", {
        type: "text",
        class: "editor-alt",
        "data-field": field,
        value: value ?? "",
        placeholder,
        "aria-label": "Alternativtext (Bildbeschreibung)",
    });
}

/** `field` is the image's path relative to the block: "" for an image block, "images[2]" in a gallery. */
function renderFigure(image, context, field) {
    const img = renderImage(image, context);
    if (!img && !context.editable) return null;
    const prefix = field ? `${field}.` : "";
    const figure = createElement(context, "figure", {}, [img]);
    applyWidthClass(figure, image.width);
    if (!context.editable) {
        // Keep empty captions so every figure can be numbered.
        const text = isNonBlank(image.caption) ? [image.caption] : [];
        figure.append(createElement(context, "figcaption", {}, text));
        return figure;
    }
    markAsset(context, figure, `${prefix}src`, "image");
    if (!img) figure.classList.add("is-empty");
    const width = createElement(
        context,
        "select",
        { class: "editor-width", "data-field": `${prefix}width`, "aria-label": "Breite" },
        WIDTHS.map((value) =>
            createElement(context, "option", { value, selected: image.width === value }, [
                WIDTH_LABELS[value],
            ]),
        ),
    );
    const caption = markEditable(
        context,
        createElement(context, "figcaption", {}, [image.caption ?? ""]),
        { field: `${prefix}caption`, placeholder: "Bildunterschrift" },
    );
    return append(figure, [
        renderAltInput(context, `${prefix}alt`, image.alt, "Alternativtext (Bildbeschreibung)"),
        width,
        caption,
    ]);
}

export function linkFallbackText(url) {
    return String(url)
        .replace(/^https?:\/\//i, "")
        .replace(/\/$/, "");
}

export function fileFallbackText(path) {
    return String(path).split("/").pop();
}

const RENDERERS = {
    text(block, context) {
        if (context.editable) {
            const node = createElement(context, "p", {}, [block.text]);
            return markEditable(context, node, {
                field: "text",
                placeholder: "Text",
                multiline: true,
            });
        }
        // Wrap the first paragraph for lede styling without changing text or line breaks.
        const text = String(block.text ?? "");
        const attributes =
            text.trim().length > WIDE_TEXT_LENGTH ? { class: "block-text--wide" } : {};
        const match = /^([^\n]*\S[^\n]*)(\n[\s\S]*)$/.exec(text);
        if (!match) return createElement(context, "p", attributes, [text]);
        return createElement(context, "p", attributes, [
            createElement(context, "span", { class: "block-text-lead" }, [match[1]]),
            match[2],
        ]);
    },

    image(block, context) {
        return renderFigure(block, context, "");
    },

    gallery(block, context) {
        const images = Array.isArray(block.images) ? block.images : [];
        const figures = images
            .map((image, i) => {
                const figure = renderFigure(image, context, `images[${i}]`);
                return figure && markItem(context, figure, `images[${i}]`);
            })
            .filter(Boolean);
        if (!figures.length && !context.editable) return null;
        return markItems(context, createElement(context, "div", {}, figures), "images");
    },

    quote(block, context) {
        const text = markEditable(context, createElement(context, "p", {}, [block.text]), {
            field: "text",
            placeholder: "Zitat",
            multiline: true,
        });
        const author =
            isNonBlank(block.author) || context.editable
                ? markEditable(
                      context,
                      createElement(context, "footer", {}, [block.author ?? ""]),
                      {
                          field: "author",
                          placeholder: "Autor*in",
                      },
                  )
                : null;
        return createElement(context, "blockquote", {}, [text, author]);
    },

    list(block, context) {
        const items = Array.isArray(block.items) ? block.items : [];
        const listItems = items
            .map((item, i) => {
                if (!context.editable) {
                    return isNonBlank(item) ? createElement(context, "li", {}, [item]) : null;
                }
                const text = markEditable(
                    context,
                    createElement(context, "span", { class: "list-item-text" }, [item]),
                    { field: `items[${i}]`, placeholder: "Listenpunkt" },
                );
                return markItem(context, createElement(context, "li", {}, [text]), `items[${i}]`);
            })
            .filter(Boolean);
        return markItems(context, createElement(context, "ul", {}, listItems), "items");
    },

    link(block, context) {
        if (context.editable) {
            const label = markEditable(
                context,
                createElement(context, "span", { class: "link-label" }, [block.label]),
                {
                    field: "label",
                    placeholder: "Linktext",
                },
            );
            const url = createElement(context, "input", {
                type: "url",
                class: "editor-url",
                "data-field": "url",
                value: block.url ?? "",
                placeholder: "https://…",
                "aria-label": "Link-Adresse",
            });
            return createElement(context, "p", {}, [label, url]);
        }
        const text = isNonBlank(block.label) ? block.label : linkFallbackText(block.url || "Link");
        const attributes = isSet(block.url)
            ? { href: block.url, target: "_blank", rel: "noopener" }
            : {};
        return createElement(context, "p", {}, [createElement(context, "a", attributes, [text])]);
    },

    file(block, context) {
        if (context.editable) {
            const label = markEditable(
                context,
                createElement(context, "span", { class: "link-label" }, [block.label]),
                {
                    field: "label",
                    placeholder: "Bezeichnung der Datei",
                },
            );
            const path = createElement(context, "span", { class: "file-path" }, [
                isSet(block.file) ? block.file : "Keine Datei ausgewählt",
            ]);
            return markAsset(
                context,
                createElement(context, "p", {}, [label, path]),
                "file",
                "file",
            );
        }
        const text = isNonBlank(block.label)
            ? block.label
            : fileFallbackText(block.file || "Datei");
        const href = isSet(block.file) ? context.resolveAsset(block.file) : "";
        const attributes = href ? { href, download: fileFallbackText(block.file) } : {};
        return createElement(context, "p", {}, [createElement(context, "a", attributes, [text])]);
    },

    phases(block, context) {
        const phases = Array.isArray(block.phases) ? block.phases : [];
        const items = [];
        phases.forEach((phase, index) => {
            const item = renderPhase(phase, index, items.length + 1, context);
            if (item) items.push(item);
        });
        if (!items.length && !context.editable) return null;
        return markItems(
            context,
            createElement(context, "ol", { class: "phases" }, items),
            "phases",
        );
    },

    people(block, context) {
        const people = Array.isArray(block.people) ? block.people : [];
        const items = people
            .map((person, i) => {
                if (!context.editable && !isNonBlank(person?.name)) return null;
                return markItem(context, renderPerson(person, i, context), `people[${i}]`);
            })
            .filter(Boolean);
        return markItems(
            context,
            createElement(context, "ul", { class: "people" }, items),
            "people",
        );
    },
};

function renderPhase(phase, index, number, context) {
    const steps = Array.isArray(phase?.steps) ? phase.steps : [];
    const visibleSteps = steps
        .map((step, j) => ({ step, j }))
        .filter(({ step }) => context.editable || isNonBlank(step?.title));
    if (!visibleSteps.length && !isNonBlank(phase?.title) && !context.editable) return null;
    const field = `phases[${index}]`;
    // Older documents stored the phase number as part of the title.
    const titleText = (phase.title ?? "").replace(/^\s*Phase\s+\d+\s*(?:[–—:-]\s*|$)/iu, "");
    const titleField =
        isNonBlank(titleText) || context.editable
            ? markEditable(
                  context,
                  createElement(context, "span", { class: "phase-title-text" }, [titleText]),
                  {
                      field: `${field}.title`,
                      placeholder: "Titel der Phase",
                  },
              )
            : null;
    const title = createElement(context, "h4", { class: "phase-title" }, [
        createElement(context, "span", { class: "phase-number" }, [`Phase ${number}`]),
        titleField ? " – " : null,
        titleField,
    ]);
    const stepList = markItems(
        context,
        createElement(
            context,
            "ol",
            { class: "steps" },
            visibleSteps.map(({ step, j }) =>
                markItem(
                    context,
                    renderStep(step, `${field}.steps[${j}]`, context),
                    `${field}.steps[${j}]`,
                ),
            ),
        ),
        `${field}.steps`,
    );
    return markItem(
        context,
        createElement(context, "li", { class: "phase" }, [title, stepList]),
        field,
    );
}

function renderStep(step, field, context) {
    const editable = context.editable;
    const text = (member, tag, className, placeholder, multiline = false) => {
        const value = step[member] ?? "";
        if (!isNonBlank(value) && !editable) return null;
        const node = createElement(context, tag, { class: className }, [value]);
        return markEditable(context, node, { field: `${field}.${member}`, placeholder, multiline });
    };
    const timing =
        isNonBlank(step.duration) || editable
            ? createElement(context, "div", { class: "step-timing" }, [
                  createElement(context, "span", { class: "step-duration-label" }, ["Dauer"]),
                  text("duration", "span", "step-duration", "Dauer"),
              ])
            : null;
    const content = createElement(context, "div", { class: "step-content" }, [
        text("title", "span", "step-title", "Tätigkeit"),
        text("description", "p", "step-description", "Beschreibung", true),
    ]);
    const method =
        isNonBlank(step.method) || editable
            ? createElement(context, "p", { class: "step-method" }, [
                  createElement(context, "span", { class: "step-method-label" }, ["Methode: "]),
                  text("method", "span", "step-method-text", "Methode"),
              ])
            : null;
    return createElement(context, "li", { class: "step" }, [timing, content, method]);
}

function renderPerson(person, index, context) {
    const field = `people[${index}]`;
    const image = renderImage(person.image, context, { class: "person-image" });
    const portrait = context.editable
        ? markAsset(
              context,
              createElement(
                  context,
                  "div",
                  { class: image ? "person-portrait" : "person-portrait is-empty" },
                  [
                      image,
                      renderAltInput(
                          context,
                          `${field}.image.alt`,
                          person.image?.alt,
                          "Alternativtext (Porträt)",
                      ),
                  ],
              ),
              `${field}.image.src`,
              "image",
          )
        : image;
    const name = markEditable(
        context,
        createElement(context, "span", { class: "person-name" }, [person.name ?? ""]),
        {
            field: `${field}.name`,
            placeholder: "Name",
        },
    );
    const description =
        isNonBlank(person.description) || context.editable
            ? markEditable(
                  context,
                  createElement(context, "p", { class: "person-description" }, [
                      person.description ?? "",
                  ]),
                  {
                      field: `${field}.description`,
                      placeholder: "Kontakt & Beschreibung",
                      multiline: true,
                  },
              )
            : null;
    return append(createElement(context, "li", { class: "person" }), [portrait, name, description]);
}
