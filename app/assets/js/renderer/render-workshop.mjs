/**
 * Renders a workshop document as <main class="workshop-page">: section navigation with its
 * mobile toggle and scroll spy, then the sections. Shared by the public page and the editor.
 *
 * Read-only mode omits empty sections (specification section 10) and numbers the rendered
 * ones contiguously. Editable mode keeps every section and marks nodes with data-*-id
 * attributes for the editor's bindings.
 */
import { isSectionEmpty, defaultTitle } from "../workshop-schema.mjs";
import { renderSection } from "./render-section.mjs";
import { sectionAnchor } from "./anchors.mjs";
import { createElement, isNonBlank } from "./element.mjs";

const TOGGLE_ICON =
    '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" ' +
    'stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
    '<path d="M6 15l6-6 6 6"/></svg>';

/** Scroll-spy observers by rendered <main>, so disposeWorkshop() can disconnect them. */
const observers = new WeakMap();

/**
 * options.editable      keep empty content and add binding hooks (default false)
 * options.resolveAsset  maps an asset path to a URL (default: identity)
 * options.dom           the Document to create nodes with (default: globalThis.document)
 */
export function renderWorkshop(workshop, options = {}) {
    const context = createRenderContext(workshop, options);
    const sections = context.editable
        ? workshop.sections
        : workshop.sections.filter((section) => !isSectionEmpty(section));

    const nav = createElement(context, "nav", {
        id: "workshop-navigation-link-container",
        "aria-label": "Workshop-Abschnitte",
    });
    const content = createElement(context, "div", { id: "workshop-content" });

    sections.forEach((section, index) => {
        const number = String(index + 1).padStart(2, "0");
        const title = isNonBlank(section.title) ? section.title : defaultTitle(section.kind);
        nav.append(
            createElement(
                context,
                "a",
                { href: `#${sectionAnchor(section)}`, "data-section": section.id },
                [
                    createElement(context, "span", { class: "workshop-navigation-number" }, [
                        number,
                    ]),
                    createElement(context, "span", { class: "navigation-text" }, [title]),
                ],
            ),
        );
        content.append(renderSection(section, number, context));
    });

    const toggle = createElement(context, "button", {
        id: "workshop-navigation-toggle",
        type: "button",
        "aria-expanded": "true",
        "aria-controls": "workshop-navigation-link-container",
    });
    toggle.innerHTML = TOGGLE_ICON; // static markup, no data involved
    toggle.append(
        createElement(context, "span", { class: "workshop-navigation-toggle-label" }, ["Menü"]),
    );

    const aside = createElement(context, "aside", { id: "workshop-navigation-area" }, [
        toggle,
        nav,
    ]);
    const main = createElement(context, "main", { class: "workshop-page" }, [aside, content]);
    attachNavigationBehaviour(main, context);
    return main;
}

/** Disconnects the scroll spy of a rendered <main>. Call before replacing or discarding it. */
export function disposeWorkshop(main) {
    const observer = observers.get(main);
    if (observer) {
        observer.disconnect();
        observers.delete(main);
    }
}

/** The Document is injected so the renderer can run under Node with jsdom. */
function createRenderContext(workshop, { editable = false, resolveAsset, dom } = {}) {
    const document = dom ?? globalThis.document;
    if (!document || typeof document.createElement !== "function") {
        throw new TypeError("renderWorkshop needs a Document; pass options.dom outside a browser");
    }
    return {
        workshop,
        editable: Boolean(editable),
        resolveAsset: typeof resolveAsset === "function" ? resolveAsset : (path) => path,
        dom: document,
    };
}

function attachNavigationBehaviour(main, context) {
    const area = main.querySelector("#workshop-navigation-area");
    const toggle = main.querySelector("#workshop-navigation-toggle");
    const links = [...main.querySelectorAll("#workshop-navigation-link-container a")];

    toggle.addEventListener("click", () => {
        const collapsed = area.classList.toggle("collapsed");
        toggle.setAttribute("aria-expanded", String(!collapsed));
    });

    // The scroll spy needs a real browser; jsdom has no IntersectionObserver.
    const Observer = context.dom.defaultView?.IntersectionObserver;
    if (typeof Observer !== "function") return;
    const observer = new Observer(
        (entries) => {
            for (const entry of entries) {
                if (!entry.isIntersecting) continue;
                const active = links.find(
                    (link) => link.getAttribute("href") === `#${entry.target.id}`,
                );
                if (!active) continue;
                links.forEach((link) => link.classList.remove("active"));
                active.classList.add("active");
            }
        },
        { rootMargin: "-40% 0px -50% 0px", threshold: 0 },
    );
    main.querySelectorAll("#workshop-content > section").forEach((section) =>
        observer.observe(section),
    );
    observers.set(main, observer);
}
