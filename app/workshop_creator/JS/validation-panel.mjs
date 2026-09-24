/**
 * Shows the state of the document: draft errors after every change, the publish check on
 * demand, and the checklist of recommended subsections that are still empty. Both modes add the
 * editor's own errors (missing files, unfinished form input) to the schema's errors. Typing
 * refreshes after a pause; structural and asset changes refresh at once, so every entry's path
 * matches the current order. Each entry focuses the element or input it refers to.
 */
import {
    validateWorkshop,
    SECTION_KINDS,
    defaultTitle,
    isSubsectionEmpty,
} from "../../assets/js/workshop-schema.mjs";
import { isAssetField } from "./editor-assets.mjs";

const DEBOUNCE_MS = 300;

export function mountValidationPanel(
    container,
    state,
    { locate, getPendingErrors = () => [], getAssetErrors = () => [], settingsForm } = {},
) {
    const dom = container.ownerDocument;
    let timer = null;
    let mode = "draft";

    const summary = element("button", {
        type: "button",
        class: "editor-status-summary",
        "aria-expanded": "false",
    });
    const publishButton = element("button", { type: "button", class: "editor-status-publish" }, [
        "Veröffentlichung prüfen",
    ]);
    const errorList = element("ul", { class: "editor-status-errors" });
    const checklist = element("ul", { class: "editor-status-checklist" });
    const detailsBox = element("div", { class: "editor-status-details", hidden: true }, [
        errorList,
        checklist,
    ]);
    const panel = element("aside", { class: "editor-status", "aria-label": "Prüfung" }, [
        element("div", { class: "editor-status-bar" }, [summary, publishButton]),
        detailsBox,
    ]);
    container.append(panel);

    summary.addEventListener("click", () => setExpanded(detailsBox.hidden));
    publishButton.addEventListener("click", () => {
        mode = "publish";
        refresh();
        setExpanded(true);
    });

    function setExpanded(open) {
        detailsBox.hidden = !open;
        summary.setAttribute("aria-expanded", String(open));
    }

    function refresh() {
        const errors = [
            ...validateWorkshop(state.document, { mode }),
            ...getAssetErrors(),
            ...getPendingErrors(),
        ];
        errorList.replaceChildren(...errors.map(renderError));
        checklist.replaceChildren(
            ...recommendations().map((text) =>
                element("li", { class: "editor-status-hint" }, [text]),
            ),
        );
        summary.textContent = summaryText(errors.length);
        panel.classList.toggle("has-errors", errors.length > 0);
        return errors;
    }

    function summaryText(count) {
        if (mode === "publish") {
            return count === 0
                ? "Bereit zur Veröffentlichung"
                : `${count} ${count === 1 ? "Punkt" : "Punkte"} vor der Veröffentlichung`;
        }
        return count === 0
            ? "Entwurf gültig"
            : `${count} ${count === 1 ? "Fehler" : "Fehler"} im Entwurf`;
    }

    function renderError(error) {
        const button = element("button", { type: "button", class: "editor-status-error" }, [
            element("code", {}, [error.path || "Dokument"]),
            " ",
            error.message,
        ]);
        button.addEventListener("click", () => {
            const target = locate?.(error.path);
            if (!target) return;
            target.scrollIntoView?.({ block: "center" });
            target.focus?.();
        });
        return element("li", {}, [button]);
    }

    /** Subsections marked `checklist` in the schema tables that are still empty. */
    function recommendations() {
        const hints = [];
        for (const section of state.document.sections) {
            const definition = SECTION_KINDS[section.kind];
            if (!definition || section.kind === "custom") continue;
            for (const [kind, subsectionDefinition] of Object.entries(definition.subsections)) {
                if (!subsectionDefinition.checklist) continue;
                const subsection = section.subsections.find((candidate) => candidate.kind === kind);
                if (!subsection || isSubsectionEmpty(subsection)) {
                    const sectionTitle = section.title.trim() || defaultTitle(section.kind);
                    hints.push(
                        `Empfohlen: „${defaultTitle(kind)}“ in „${sectionTitle}“ ausfüllen.`,
                    );
                }
            }
        }
        return hints;
    }

    function scheduleRefresh() {
        mode = "draft";
        if (timer) clearTimeout(timer);
        timer = setTimeout(() => {
            timer = null;
            refresh();
        }, DEBOUNCE_MS);
    }

    function refreshNow() {
        if (timer) clearTimeout(timer);
        timer = null;
        mode = "draft";
        refresh();
    }

    function onChange(event) {
        const { structural, field } = event.detail;
        if (structural || isAssetField(field)) refreshNow();
        else scheduleRefresh();
    }

    state.addEventListener("change", onChange);
    state.addEventListener("replace", refreshNow);
    settingsForm?.addEventListener("validationchange", scheduleRefresh);
    refresh();

    return {
        panel,
        refresh,
        /** Shows the errors of a mode, expanded. */
        showErrors(nextMode) {
            mode = nextMode;
            const errors = refresh();
            setExpanded(true);
            return errors;
        },
        /** Runs the publish check and returns its errors, including the editor's own errors. */
        checkPublish() {
            mode = "publish";
            const errors = refresh();
            setExpanded(true);
            return errors;
        },
        dispose() {
            if (timer) clearTimeout(timer);
            state.removeEventListener("change", onChange);
            state.removeEventListener("replace", refreshNow);
            settingsForm?.removeEventListener("validationchange", scheduleRefresh);
            panel.remove();
        },
    };

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
