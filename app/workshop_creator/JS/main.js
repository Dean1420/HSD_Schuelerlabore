import { createHeader } from "../../assets/js/header.mjs";
import { PLACEHOLDER_URL } from "../../assets/js/assets.mjs";
import { createEmptyWorkshop } from "../../assets/js/workshop-schema.mjs";
import { createEditorState } from "./editor-state.mjs";
import { createAssetManager } from "./editor-assets.mjs";
import { openImageEditor } from "./image-editor.mjs";
import { mountEditor } from "./workshop-editor.mjs";
import { mountSettings } from "./workshop-settings.mjs";
import { mountValidationPanel } from "./validation-panel.mjs";
import { loadExampleWorkshop } from "./load-example.mjs";
import { buildPackage, packageErrors, readPackageFolder } from "./workshop-package.mjs";

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
editorBar.append(toolbar, settingsContainer, statusContainer);
body.append(editorBar, createHeader(), editorContainer);

const state = createEditorState(createEmptyWorkshop());
const assets = createAssetManager(state, {
    dom: document,
    placeholder: PLACEHOLDER_URL,
    transformImage: (file, options) => openImageEditor(document, file, options),
});
const settings = mountSettings(settingsContainer, state, { assets });
const editor = mountEditor(editorContainer, state, { assets });
const panel = mountValidationPanel(statusContainer, state, {
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
const saveButton = document.createElement("button");
saveButton.type = "button";
const updateSaveLabel = () => {
    saveButton.textContent = state.document.published ? "Workshop speichern" : "Entwurf speichern";
};
updateSaveLabel();
state.addEventListener("change", updateSaveLabel);
state.addEventListener("replace", updateSaveLabel);
saveButton.addEventListener("click", async () => {
    const errors = packageErrors(state, [...assets.missing(), ...settings.getPendingErrors()]);
    if (errors.length) {
        panel.showErrors(state.document.published ? "publish" : "draft");
        reportMessage(
            state.document.published
                ? `Für das Kursangebot fehlen noch ${errors.length} Angaben, siehe Prüfung. Ohne den Haken „Im Kursangebot aufführen“ lässt sich der Stand als Entwurf speichern.`
                : `Nicht gespeichert (${errors.length} Fehler), z. B. ${errors[0].path}: ${errors[0].message}`,
        );
        return;
    }
    saveButton.disabled = true;
    try {
        const { name, bytes } = await buildPackage(state);
        const url = URL.createObjectURL(new Blob([bytes], { type: "application/zip" }));
        const link = document.createElement("a");
        link.href = url;
        link.download = name;
        link.click();
        setTimeout(() => URL.revokeObjectURL(url), 1000);
        unsaved = false;
        reportMessage(`${name} gespeichert. Zum Weiterbearbeiten entpacken und den Ordner laden.`);
    } catch (error) {
        reportMessage(`Nicht gespeichert: ${error.message}`);
    } finally {
        saveButton.disabled = false;
    }
});

const folderInput = document.createElement("input");
folderInput.type = "file";
folderInput.webkitdirectory = true;
folderInput.hidden = true;
const folderButton = document.createElement("button");
folderButton.type = "button";
folderButton.textContent = "Workshop-Ordner laden";
folderButton.addEventListener("click", () => {
    if (confirmReplace()) folderInput.click();
});
folderInput.addEventListener("change", async () => {
    const files = [...folderInput.files];
    folderInput.value = "";
    if (!files.length) return;
    try {
        const { document: loaded, files: selected, missing } = await readPackageFolder(files);
        state.load(loaded, { files: selected });
        reportMessage(
            missing.length
                ? `Geladen. Im Ordner fehlen: ${missing.join(", ")}`
                : "Workshop geladen.",
        );
    } catch (error) {
        reportMessage(`Nicht geladen: ${error.message}`);
    }
});
toolbar.append(previewButton, saveButton, folderButton, folderInput);

const exampleButton = document.createElement("button");
exampleButton.type = "button";
exampleButton.textContent = "Beispiel laden";
exampleButton.addEventListener("click", async () => {
    if (!confirmReplace()) return;
    exampleButton.disabled = true;
    try {
        await loadExampleWorkshop(state);
        reportMessage("Beispiel geladen.");
    } catch (error) {
        reportMessage(`Beispiel nicht geladen: ${error.message}`);
    } finally {
        exampleButton.disabled = false;
    }
});
toolbar.append(exampleButton);

let unsaved = false;
state.addEventListener("change", () => (unsaved = true));
state.addEventListener("replace", () => (unsaved = false));
function confirmReplace() {
    return (
        !unsaved ||
        confirm("Der aktuelle Stand ist nicht gespeichert und wird ersetzt. Fortfahren?")
    );
}

let message = null;
function reportMessage(text) {
    message?.remove();
    message = document.createElement("p");
    message.className = "workshop-message editor-error";
    message.setAttribute("role", "status");
    message.textContent = text;
    toolbar.append(message);
    const current = message;
    setTimeout(() => current.remove(), 10000);
}
