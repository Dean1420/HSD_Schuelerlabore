/**
 * Settings that are not page text: teaser, thumbnail, subject, grade range, tags, more-info URL,
 * slug and the published flag. A labelled form, collapsible above the workshop.
 *
 * The grade range is written to the document only when it is complete: both fields empty
 * means null, two integers with min ≤ max mean a range, anything in between stays in the
 * form with a hint and is reported as a pending error so a publish check cannot pass.
 */
import { SUBJECTS, SLUG_PATTERN } from "../../assets/js/workshop-schema.mjs";
import { ROOT_OWNER } from "./editor-state.mjs";
import { createAssetControls } from "./asset-controls.mjs";

const GRADE_HINT_INCOMPLETE =
    "Klassenstufe: beide Werte als ganze Zahlen angeben oder beide leer lassen.";
const GRADE_HINT_ORDER = "Klassenstufe: „von“ darf nicht größer als „bis“ sein.";

const THUMBNAIL = { owner: ROOT_OWNER, field: "thumbnail.src", location: "thumbnail" };

/** Without `assets` the thumbnail picker is left out. */
export function mountSettings(container, state, { assets = null } = {}) {
    const dom = container.ownerDocument;
    let pendingGradeError = null;

    const details = element("details", { class: "editor-settings", open: true });
    details.append(element("summary", {}, ["Einstellungen"]));
    const form = element("form", { class: "editor-settings-form", novalidate: true });
    form.addEventListener("submit", (event) => event.preventDefault());
    details.append(form);
    container.append(details);

    const teaser = field(
        "teaser",
        "Kurztext für die Kachel",
        element("textarea", { name: "teaser", rows: 2, required: true }),
    );
    const thumbnailPreview = element("div", { class: "editor-thumbnail-preview" });
    const thumbnailAlt = element("input", {
        name: "thumbnailAlt",
        type: "text",
        id: "editor-setting-thumbnailAlt",
    });
    const thumbnail = assets
        ? element("fieldset", { class: "editor-field editor-thumbnail" }, [
              element("legend", {}, ["Vorschaubild für die Kachel"]),
              thumbnailPreview,
              element("label", { for: "editor-setting-thumbnailAlt" }, [
                  "Alternativtext (optional)",
              ]),
              thumbnailAlt,
          ])
        : null;
    const subject = field(
        "subject",
        "Fach",
        element("select", { name: "subject" }, [
            element("option", { value: "" }, ["keine Angabe"]),
            ...SUBJECTS.map((value) => element("option", { value }, [value])),
        ]),
    );
    const gradeMin = element("input", {
        name: "gradeMin",
        type: "number",
        min: 1,
        max: 13,
        step: 1,
        inputmode: "numeric",
    });
    const gradeMax = element("input", {
        name: "gradeMax",
        type: "number",
        min: 1,
        max: 13,
        step: 1,
        inputmode: "numeric",
    });
    const gradeHint = element("p", {
        class: "editor-hint",
        role: "status",
        id: "editor-grade-hint",
    });
    const grade = element("fieldset", { class: "editor-field editor-grade" }, [
        element("legend", {}, ["Klassenstufen"]),
        element("label", {}, ["von ", gradeMin]),
        element("label", {}, ["bis ", gradeMax]),
        gradeHint,
    ]);
    const tags = field(
        "tags",
        "Schlagwörter (durch Komma getrennt)",
        element("input", { name: "tags", type: "text" }),
    );
    const moreInfoUrl = field(
        "moreInfoUrl",
        "Adresse für „Weitere Informationen“",
        element("input", { name: "moreInfoUrl", type: "url" }),
    );
    const slugInput = element("input", {
        name: "slug",
        type: "text",
        pattern: SLUG_PATTERN.source,
        spellcheck: false,
    });
    const slugHint = element("p", { class: "editor-hint" });
    const slug = field("slug", "Ordnername (Slug)", slugInput, slugHint);
    const publishedInput = element("input", { name: "published", type: "checkbox" });
    const published = element("div", { class: "editor-field editor-published" }, [
        element("label", {}, [publishedInput, " Im Kursangebot aufführen"]),
        element("p", { class: "editor-hint" }, [
            "Ohne Haken wird ein Entwurf gespeichert, der unvollständig sein darf. Mit Haken muss der Workshop vollständig sein; veröffentlicht wird er erst, wenn sein Ordner auf der Website liegt.",
        ]),
    ]);
    form.append(
        ...[teaser, thumbnail, subject, grade, tags, moreInfoUrl, slug, published].filter(Boolean),
    );

    function fill() {
        const document = state.document;
        form.elements.teaser.value = document.teaser;
        form.elements.subject.value = document.subject;
        gradeMin.value = document.gradeRange ? String(document.gradeRange.min) : "";
        gradeMax.value = document.gradeRange ? String(document.gradeRange.max) : "";
        form.elements.tags.value = document.tags.join(", ");
        form.elements.moreInfoUrl.value = document.moreInfoUrl;
        slugInput.value = document.slug;
        publishedInput.checked = document.published;
        thumbnailAlt.value = document.thumbnail.alt;
        renderThumbnail();
        setGradeError(null);
        updateSlugHint();
    }

    function onInput(event) {
        const input = event.target;
        switch (input.name) {
            case "teaser":
            case "moreInfoUrl":
            case "subject":
                state.set(ROOT_OWNER, input.name, input.value, { source: "settings" });
                break;
            case "tags":
                state.set(
                    ROOT_OWNER,
                    "tags",
                    input.value
                        .split(",")
                        .map((tag) => tag.trim())
                        .filter(Boolean),
                    { source: "settings" },
                );
                break;
            case "slug":
                state.setSlug(input.value.trim(), { source: "settings" });
                updateSlugHint();
                break;
            case "thumbnailAlt":
                state.set(ROOT_OWNER, "thumbnail.alt", input.value, { source: "settings" });
                break;
            case "published":
                state.set(ROOT_OWNER, "published", input.checked, { source: "settings" });
                break;
            case "gradeMin":
            case "gradeMax":
                applyGradeRange();
                break;
            default:
                break;
        }
    }

    function applyGradeRange() {
        const min = gradeMin.value.trim();
        const max = gradeMax.value.trim();
        if (min === "" && max === "") {
            setGradeError(null);
            if (state.document.gradeRange !== null)
                state.set(ROOT_OWNER, "gradeRange", null, { source: "settings" });
            return;
        }
        if (!/^\d+$/.test(min) || !/^\d+$/.test(max)) {
            setGradeError(GRADE_HINT_INCOMPLETE);
            return;
        }
        const range = { min: Number(min), max: Number(max) };
        if (range.min > range.max) {
            setGradeError(GRADE_HINT_ORDER);
            return;
        }
        setGradeError(null);
        const current = state.document.gradeRange;
        if (!current || current.min !== range.min || current.max !== range.max) {
            state.set(ROOT_OWNER, "gradeRange", range, { source: "settings" });
        }
    }

    function renderThumbnail() {
        if (!assets) return;
        const src = state.document.thumbnail.src;
        const image = src ? element("img", { src: assets.resolve(src), alt: "" }) : null;
        const controls = createAssetControls(dom, assets, THUMBNAIL, {
            run,
            find: () => thumbnailButton(),
        });
        thumbnailPreview.classList.toggle("is-empty", !src);
        thumbnailPreview.replaceChildren(...[image, controls].filter(Boolean));
    }

    function thumbnailButton() {
        return thumbnailPreview.querySelector(".editor-asset-controls button");
    }

    /** Runs a picker action and focuses the thumbnail control it names. */
    function run(action) {
        const focus = (find) => (typeof find === "function" ? find() : null)?.focus();
        const result = action();
        if (typeof result?.then === "function") return result.then(focus);
        focus(result);
        return undefined;
    }

    function setGradeError(message) {
        const changed = pendingGradeError !== message;
        pendingGradeError = message;
        gradeHint.textContent = message ?? "";
        gradeHint.hidden = !message;
        grade.classList.toggle("has-error", Boolean(message));
        if (changed) form.dispatchEvent(new dom.defaultView.Event("validationchange"));
    }

    function updateSlugHint() {
        slugHint.textContent = state.slugLocked
            ? "Fest gewählt. Leeren, um wieder dem Titel zu folgen."
            : "Folgt dem Titel, bis du ihn selbst änderst.";
    }

    function onStateChange(event) {
        const { owner, field, source } = event.detail;
        if (source === "settings" || owner !== ROOT_OWNER) return;
        if (field === "slug") {
            slugInput.value = state.document.slug;
            updateSlugHint();
        }
        if (field === "thumbnail.src") renderThumbnail();
    }

    form.addEventListener("input", onInput);
    state.addEventListener("replace", fill);
    state.addEventListener("change", onStateChange);
    fill();

    return {
        form,
        /** Errors that live only in the form, e.g. an unfinished grade range. */
        getPendingErrors: () =>
            pendingGradeError ? [{ path: "gradeRange", message: pendingGradeError }] : [],
        /** The input for a root field, for the validation panel to focus; opens the box. */
        locate(fieldName) {
            const input =
                fieldName === "gradeRange"
                    ? gradeMin
                    : fieldName === "thumbnail"
                      ? thumbnailButton()
                      : form.elements[fieldName] instanceof dom.defaultView.HTMLElement
                        ? form.elements[fieldName]
                        : null;
            if (input) details.open = true;
            return input;
        },
        refresh: fill,
        dispose() {
            form.removeEventListener("input", onInput);
            state.removeEventListener("replace", fill);
            state.removeEventListener("change", onStateChange);
            details.remove();
        },
    };

    function field(name, label, input, ...extra) {
        const id = `editor-setting-${name}`;
        input.id = id;
        return element("div", { class: "editor-field" }, [
            element("label", { for: id }, [label]),
            input,
            ...extra,
        ]);
    }

    function element(tag, attributes = {}, children = []) {
        const node = dom.createElement(tag);
        for (const [name, value] of Object.entries(attributes)) {
            if (value === null || value === undefined || value === false) continue;
            node.setAttribute(name, value === true ? "" : String(value));
        }
        node.append(
            ...children.filter((child) => child !== null && child !== undefined && child !== ""),
        );
        return node;
    }
}
