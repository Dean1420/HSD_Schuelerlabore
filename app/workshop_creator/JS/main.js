/**
 * Entry point of the new editor (creator-next.html): creates the document, the editor state and
 * the asset manager, then mounts header, toolbar, settings, the editable workshop and the
 * status panel.
 *
 * `?dev` adds an example with files and JSON load/download without files.
 * The real export arrives with a later step.
 */
import { createHeader } from "../../assets/js/header.mjs";
import { PLACEHOLDER_URL } from "../../assets/js/assets.mjs";
import { createEmptyWorkshop } from "../../assets/js/workshop-schema.mjs";
import { createEditorState } from "./editor-state.mjs";
import { createAssetManager } from "./editor-assets.mjs";
import { mountEditor } from "./workshop-editor.mjs";
import { mountSettings } from "./workshop-settings.mjs";
import { mountValidationPanel } from "./validation-panel.mjs";
import { loadExampleWorkshop } from "./load-example.mjs";

const dev = new URLSearchParams(location.search).has("dev");
const body = document.body;

const editorBar = document.createElement("section");
editorBar.className = "editor-bar";
editorBar.setAttribute("aria-label", "Workshop-Editor");
const toolbar = document.createElement("div");
toolbar.className = "editor-toolbar";
const settingsContainer = document.createElement("div");
const editorContainer = document.createElement("div");
editorContainer.className = "editor-page";
const statusContainer = document.createElement("div");
editorBar.append(toolbar, statusContainer, settingsContainer);
body.append(editorBar, createHeader(), editorContainer);

const state = createEditorState(createEmptyWorkshop());
// Images without a selected file show the shared placeholder.
const assets = createAssetManager(state, { dom: document, placeholder: PLACEHOLDER_URL });
const settings = mountSettings(settingsContainer, state, { assets });
const editor = mountEditor(editorContainer, state, { assets });
mountValidationPanel(statusContainer, state, {
    getPendingErrors: settings.getPendingErrors,
    getAssetErrors: assets.missing,
    settingsForm: settings.form,
    locate: (path) => editor.locate(path) ?? settings.locate(path.split(".")[0]),
});

const previewButton = document.createElement("button");
previewButton.type = "button";
previewButton.textContent = "Vorschau";
previewButton.setAttribute("aria-pressed", "false");
previewButton.addEventListener("click", () => {
    const on = !editor.preview;
    editor.setPreview(on);
    previewButton.setAttribute("aria-pressed", String(on));
    previewButton.textContent = on ? "Bearbeiten" : "Vorschau";
    body.classList.toggle("editor-preview", on);
});
toolbar.append(previewButton);

if (dev) {
    const exampleButton = document.createElement("button");
    exampleButton.type = "button";
    exampleButton.className = "editor-dev";
    exampleButton.textContent = "Beispiel laden (mit Dateien)";
    exampleButton.addEventListener("click", async () => {
        exampleButton.disabled = true;
        loadInput.disabled = true;
        exampleButton.textContent = "Beispiel wird geladen …";
        try {
            await loadExampleWorkshop(state);
        } catch (error) {
            reportError(`Beispiel nicht geladen: ${error.message}`);
        } finally {
            exampleButton.disabled = false;
            loadInput.disabled = false;
            exampleButton.textContent = "Beispiel laden (mit Dateien)";
        }
    });

    const loadInput = document.createElement("input");
    loadInput.type = "file";
    loadInput.accept = "application/json,.json";
    loadInput.id = "editor-dev-load";
    const loadLabel = document.createElement("label");
    loadLabel.htmlFor = loadInput.id;
    loadLabel.className = "editor-dev";
    loadLabel.append("JSON laden (ohne Dateien)", loadInput);
    loadInput.addEventListener("change", async () => {
        const file = loadInput.files?.[0];
        if (!file) return;
        try {
            state.load(JSON.parse(await file.text()));
        } catch (error) {
            reportError(`JSON nicht geladen: ${error.message}`);
        }
        loadInput.value = "";
    });

    const download = document.createElement("button");
    download.type = "button";
    download.className = "editor-dev";
    download.textContent = "JSON herunterladen (ohne Dateien)";
    download.addEventListener("click", () => {
        const blob = new Blob([JSON.stringify(state.document, null, 4)], {
            type: "application/json",
        });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = `${state.document.slug || "workshop"}.json`;
        link.click();
        setTimeout(() => URL.revokeObjectURL(url), 1000);
    });
    toolbar.append(exampleButton, loadLabel, download);
}

function reportError(text) {
    console.error(text);
    const message = document.createElement("p");
    message.className = "workshop-message editor-error";
    message.setAttribute("role", "alert");
    message.textContent = text;
    toolbar.append(message);
    setTimeout(() => message.remove(), 8000);
}
