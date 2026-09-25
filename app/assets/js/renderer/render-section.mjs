import { defaultTitle, SUBJECT_LABELS } from "../workshop-schema.mjs";
import { renderSubsection } from "./render-subsection.mjs";
import { renderImage, renderAltInput } from "./render-blocks.mjs";
import { sectionAnchor } from "./anchors.mjs";
import { createElement, append, markEditable, markAsset, isNonBlank, isSet } from "./element.mjs";

const OVERVIEW_FACT_LABELS = {
    location: "Durchführungsort",
    groupSize: "Gruppengröße",
    topics: "Themen des Workshops",
    prerequisites: "Fachliche Voraussetzungen",
    duration: "Workshop-Dauer",
};

const TEACHER_FACT_LABELS = {
    gradeRange: "Klassenstufen",
    schoolTypes: "Schulform",
    requirements: "Technische Voraussetzungen",
};

export function workshopKicker(workshop) {
    const faculty = SUBJECT_LABELS[workshop.subject];
    return faculty ? `Schülerlabor · ${faculty}` : "Schülerlabor";
}

export function workshopMeta(workshop) {
    const range = workshop.gradeRange;
    const overview = (workshop.sections ?? []).find((section) => section.kind === "overview");
    const duration = overview?.fields?.facts?.duration;
    const items = [];
    if (range && Number.isInteger(range.min) && Number.isInteger(range.max)) {
        items.push(`Klasse ${range.min}–${range.max}`);
    }
    if (isNonBlank(duration)) items.push(duration.trim());
    return items.join(" · ");
}

/** `number` is the display number ("01"), computed by the caller over the rendered sections. */
export function renderSection(section, number, context) {
    const anchor = sectionAnchor(section);
    const headingId = `heading-${anchor}`;
    const fallback = defaultTitle(section.kind);

    const node = createElement(context, "section", {
        id: anchor,
        class: "workshop-section",
        "data-kind": section.kind,
        "aria-labelledby": headingId,
    });
    if (context.editable) node.setAttribute("data-section-id", section.id);

    const numberNode = createElement(context, "span", { class: "workshop-navigation-number" }, [
        number,
    ]);
    const title = isNonBlank(section.title) ? section.title : fallback;
    const titleNode = createElement(context, "span", { class: "section-title-text" }, [
        context.editable ? (section.title ?? "") : title,
    ]);
    if (context.editable) {
        markEditable(context, titleNode, {
            field: "title",
            placeholder: fallback || "Abschnittstitel",
        });
    }
    const heading = createElement(context, "h2", { class: "section-title", id: headingId }, [
        numberNode,
        " ",
        titleNode,
    ]);

    const subsections = (section.subsections ?? [])
        .map((subsection) => renderSubsection(subsection, context))
        .filter(Boolean);

    if (section.kind === "overview") {
        append(node, [
            heading,
            renderOverviewHero(section, context),
            ...subsections,
            renderOverviewFacts(section, context),
        ]);
    } else if (section.kind === "teachers") {
        append(node, [heading, renderTeachersIntro(section, context), ...subsections]);
    } else {
        append(node, [heading, ...subsections]);
    }
    return node;
}

function renderOverviewHero(section, context) {
    const { workshop } = context;
    const image = renderImage(section.fields?.heroImage, context, {
        id: "overview-img",
        loading: "eager",
    });
    let imageBox = image ? createElement(context, "div", { id: "overview-image" }, [image]) : null;
    if (context.editable) {
        const hero = section.fields?.heroImage;
        imageBox = markAsset(
            context,
            createElement(
                context,
                "div",
                { id: "overview-image", class: image ? null : "is-empty" },
                [
                    image,
                    renderAltInput(
                        context,
                        "fields.heroImage.alt",
                        hero?.alt,
                        "Alternativtext (optional)",
                    ),
                ],
            ),
            "fields.heroImage.src",
            "image",
        );
    }
    const title = markEditable(
        context,
        createElement(context, "h1", { id: "overview-workshop-name" }, [workshop.title]),
        {
            field: "title",
            placeholder: "Titel des Workshops",
            root: true,
        },
    );
    const slogan =
        isNonBlank(workshop.slogan) || context.editable
            ? markEditable(
                  context,
                  createElement(context, "p", { id: "overview-workshop-slogan" }, [
                      workshop.slogan,
                  ]),
                  {
                      field: "slogan",
                      placeholder: "Motto oder Slogan",
                      root: true,
                  },
              )
            : null;
    const moreInfo = isSet(workshop.moreInfoUrl)
        ? createElement(
              context,
              "a",
              { href: workshop.moreInfoUrl, target: "_blank", rel: "noopener" },
              ["Weitere Informationen"],
          )
        : null;
    const kicker = createElement(context, "p", { class: "workshop-kicker" }, [
        workshopKicker(workshop),
    ]);
    const byline = isNonBlank(workshop.authors)
        ? createElement(context, "p", { class: "workshop-byline" }, [
              `Von ${workshop.authors.trim()}`,
          ])
        : null;
    const metaText = workshopMeta(workshop);
    const meta =
        metaText || context.editable
            ? createElement(context, "p", { class: "workshop-meta" }, [metaText])
            : null;
    const intro = createElement(context, "div", { id: "overview-intro" }, [
        kicker,
        title,
        slogan,
        byline,
        meta,
        moreInfo,
    ]);
    return createElement(context, "div", { id: "overview-impression" }, [imageBox, intro]);
}

function renderOverviewFacts(section, context) {
    const facts = section.fields?.facts ?? {};
    const entries = Object.entries(OVERVIEW_FACT_LABELS).filter(
        ([key]) => context.editable || isNonBlank(facts[key]),
    );
    if (!entries.length) return null;
    const items = entries.map(([key, label]) =>
        createElement(context, "div", { class: "fact" }, [
            createElement(context, "dt", { class: "overview-quick-fact-title" }, [label]),
            markEditable(
                context,
                createElement(context, "dd", { class: "overview-quick-fact-text" }, [
                    facts[key] ?? "",
                ]),
                {
                    field: `fields.facts.${key}`,
                    placeholder: "Angabe",
                },
            ),
        ]),
    );
    return createElement(
        context,
        "div",
        { class: "workshop-subsection facts-block", "data-kind": "facts" },
        [
            createElement(context, "h3", { class: "subsection-title" }, ["Rahmenbedingungen"]),
            createElement(context, "dl", { class: "facts" }, items),
        ],
    );
}

function renderTeachersIntro(section, context) {
    const quote = renderTeacherQuote(section.fields?.quote, context);
    const facts = renderTeacherFacts(section.fields?.facts ?? {}, context);
    if (!quote && !facts) return null;
    return createElement(context, "div", { id: "teachers-overview" }, [
        createElement(context, "div", { id: "teachers-intro" }, [quote]),
        facts,
    ]);
}

function renderTeacherQuote(quote, context) {
    if (!isNonBlank(quote?.text) && !context.editable) return null;
    const text = markEditable(context, createElement(context, "p", {}, [quote?.text ?? ""]), {
        field: "fields.quote.text",
        placeholder: "Zitat",
        multiline: true,
    });
    const author =
        isNonBlank(quote?.author) || context.editable
            ? markEditable(context, createElement(context, "footer", {}, [quote?.author ?? ""]), {
                  field: "fields.quote.author",
                  placeholder: "Autor*in",
              })
            : null;
    return createElement(context, "blockquote", { id: "teachers-intro-quote" }, [text, author]);
}

/** The grade range lives at the document root and is edited in the settings, not inline. */
function renderTeacherFacts(facts, context) {
    const range = context.workshop.gradeRange;
    const values = {
        gradeRange:
            range && Number.isInteger(range.min) && Number.isInteger(range.max)
                ? `${range.min} – ${range.max}`
                : "",
        schoolTypes: facts.schoolTypes ?? "",
        requirements: facts.requirements ?? "",
    };
    const entries = Object.entries(TEACHER_FACT_LABELS).filter(
        ([key]) => isNonBlank(values[key]) || (context.editable && key !== "gradeRange"),
    );
    if (!entries.length) return null;
    const items = entries.map(([key, label]) => {
        const value = createElement(context, "dd", { class: "teachers-quick-facts-value" }, [
            values[key],
        ]);
        if (key !== "gradeRange") {
            markEditable(context, value, { field: `fields.facts.${key}`, placeholder: "Angabe" });
        }
        return createElement(context, "div", { class: "teachers-quick-facts-item" }, [
            createElement(context, "dt", { class: "teachers-quick-facts-label" }, [label]),
            value,
        ]);
    });
    return createElement(context, "div", { id: "teachers-quick-facts" }, [
        createElement(context, "p", { id: "teachers-quick-facts-title" }, ["Auf einen Blick"]),
        createElement(context, "dl", { class: "teachers-quick-facts-list" }, items),
    ]);
}
