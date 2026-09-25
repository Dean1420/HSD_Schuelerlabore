import { isSectionEmpty, defaultTitle } from "../workshop-schema.mjs";
import { renderSection } from "./render-section.mjs";
import { sectionAnchor } from "./anchors.mjs";
import { createElement, isNonBlank } from "./element.mjs";

// Must match OPEN_CONTENTS_EVENT in header.mjs without importing the page shell.
const OPEN_CONTENTS_EVENT = "workshop:open-contents";

const observers = new WeakMap();

// Editable mode keeps empty content and adds editor bindings.
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

    const toggle = createElement(
        context,
        "button",
        { id: "workshop-navigation-toggle", type: "button", "aria-haspopup": "dialog" },
        [
            createElement(context, "span", { class: "workshop-navigation-current" }, [
                createElement(context, "span", { class: "workshop-navigation-current-number" }),
                createElement(context, "span", { class: "workshop-navigation-current-text" }),
            ]),
            createElement(context, "span", { class: "workshop-navigation-toggle-label" }, [
                "Inhalt",
            ]),
        ],
    );

    const navLabel = createElement(context, "p", { class: "workshop-navigation-label" }, [
        "Inhalt",
    ]);
    const aside = createElement(context, "aside", { id: "workshop-navigation-area" }, [
        toggle,
        navLabel,
        nav,
    ]);
    // Number public captions only; editor changes would leave the numbers stale.
    if (!context.editable) numberFigures(content);

    const main = createElement(context, "main", { class: "workshop-page" }, [aside, content]);
    attachNavigationBehaviour(main, context);
    return main;
}

// CSS counters cannot span the image grid's size containers, so number captions here.
function numberFigures(root) {
    const captions = [...root.querySelectorAll("figure > figcaption")];
    const total = String(captions.length).padStart(2, "0");
    captions.forEach((caption, index) => {
        const number = String(index + 1).padStart(2, "0");
        caption.setAttribute("data-number", number);
        caption.setAttribute("data-count", `${number}/${total}`);
    });
}

// Call before replacing or discarding a rendered workshop to detach its scroll spy.
export function disposeWorkshop(main) {
    const dispose = observers.get(main);
    if (dispose) {
        dispose();
        observers.delete(main);
    }
}

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

    const showCurrent = () => {
        const current = links.find((link) => link.classList.contains("active")) ?? links[0];
        const read = (selector) => current?.querySelector(selector)?.textContent ?? "";
        toggle.querySelector(".workshop-navigation-current-number").textContent = read(
            ".workshop-navigation-number",
        );
        toggle.querySelector(".workshop-navigation-current-text").textContent =
            read(".navigation-text");
    };
    showCurrent();
    area.hidden = links.length === 0;

    toggle.addEventListener("click", () => {
        showCurrent();
        const Event = context.dom.defaultView?.CustomEvent ?? globalThis.CustomEvent;
        if (typeof Event === "function") {
            toggle.dispatchEvent(new Event(OPEN_CONTENTS_EVENT, { bubbles: true }));
        }
    });

    // Activate the last section above 40% of the viewport, or the final section at page end.
    const view = context.dom.defaultView;
    if (!view || typeof view.requestAnimationFrame !== "function") return;
    const sections = [...main.querySelectorAll("#workshop-content > section")];
    let frame = 0;
    const update = () => {
        frame = 0;
        // The page shell attaches <main> after rendering; detached sections all measure zero.
        if (!sections.length || !main.isConnected) return;
        const line = view.innerHeight * 0.4;
        const atEnd =
            view.scrollY + view.innerHeight >= context.dom.documentElement.scrollHeight - 2;
        let current = sections[0];
        for (const section of sections) {
            if (section.getBoundingClientRect().top <= line) current = section;
        }
        if (atEnd) current = sections[sections.length - 1];
        const position = links.findIndex((link) => link.getAttribute("href") === `#${current.id}`);
        if (position < 0) return;
        const rect = current.getBoundingClientRect();
        const progress =
            atEnd || rect.height <= 0
                ? 1
                : Math.min(1, Math.max(0, (line - rect.top) / rect.height));
        links.forEach((link, index) => {
            link.classList.toggle("active", index === position);
            link.classList.toggle("passed", index < position);
            if (index === position) link.setAttribute("aria-current", "true");
            else link.removeAttribute("aria-current");
            const fill = index < position ? 1 : index === position ? progress : 0;
            link.style.setProperty("--section-progress", fill.toFixed(3));
        });
        showCurrent();
    };
    const schedule = () => {
        if (!frame) frame = view.requestAnimationFrame(update);
    };
    view.addEventListener("scroll", schedule, { passive: true });
    view.addEventListener("resize", schedule);
    // Images arrive after the first pass and change where the sections sit.
    main.addEventListener("load", schedule, true);
    view.addEventListener("load", schedule);
    // Use a timeout because animation frames are throttled in hidden tabs.
    const first = view.setTimeout(update, 0);
    observers.set(main, () => {
        view.removeEventListener("scroll", schedule);
        view.removeEventListener("resize", schedule);
        main.removeEventListener("load", schedule, true);
        view.removeEventListener("load", schedule);
        view.clearTimeout(first);
        if (frame) view.cancelAnimationFrame(frame);
    });
}
