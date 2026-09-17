import { defaultTitle, isSubsectionEmpty } from "../workshop-schema.mjs";
import { renderBlock } from "./render-blocks.mjs";
import { createElement, markEditable, isNonBlank } from "./element.mjs";

/**
 * A blank title falls back to the kind's default title on the page; custom subsections have
 * none. In editable mode the stored title is shown and the default is only the placeholder.
 */
export function renderSubsection(subsection, context) {
    if (!context.editable && isSubsectionEmpty(subsection)) return null;
    const blocks = (subsection.blocks ?? [])
        .map((block) => renderBlock(block, context))
        .filter(Boolean);
    const fallback = defaultTitle(subsection.kind);

    const node = createElement(context, "section", {
        class: "workshop-subsection",
        "data-kind": subsection.kind,
    });
    if (context.editable) {
        node.setAttribute("data-subsection-id", subsection.id);
        const heading = createElement(context, "h3", { class: "subsection-title" }, [
            subsection.title ?? "",
        ]);
        node.append(
            markEditable(context, heading, {
                field: "title",
                placeholder: fallback || "Untertitel",
            }),
        );
    } else {
        const title = isNonBlank(subsection.title) ? subsection.title : fallback;
        if (title)
            node.append(createElement(context, "h3", { class: "subsection-title" }, [title]));
    }
    node.append(createElement(context, "div", { class: "blocks" }, blocks));
    return node;
}
