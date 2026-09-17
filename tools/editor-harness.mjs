/**
 * Test harness for the editor modules: mounts state, asset manager, settings, editor and status
 * panel into a fresh jsdom, with a counting IntersectionObserver and fake object URLs.
 * Not a test file itself; the *.test.mjs files import it.
 */
import { readFileSync } from "node:fs";
import { JSDOM } from "jsdom";
import { createEmptyWorkshop } from "../app/assets/js/workshop-schema.mjs";
import { createEditorState } from "../app/workshop_creator/JS/editor-state.mjs";
import {
    createAssetManager,
    collectAssetReferences,
} from "../app/workshop_creator/JS/editor-assets.mjs";
import { mountEditor } from "../app/workshop_creator/JS/workshop-editor.mjs";
import { mountSettings } from "../app/workshop_creator/JS/workshop-settings.mjs";
import { mountValidationPanel } from "../app/workshop_creator/JS/validation-panel.mjs";

export const PLACEHOLDER = "placeholder.jpg";

export function fixture(name) {
    return JSON.parse(
        readFileSync(new URL(`./fixtures/${name}/workshop.json`, import.meta.url), "utf8"),
    );
}

/** Object URLs that are counted; `live` holds the ones not yet revoked. */
export function createFakeUrls() {
    let next = 0;
    const urls = {
        created: [],
        revoked: [],
        live: new Set(),
        createObjectURL() {
            next += 1;
            const url = `blob:test/${next}`;
            urls.created.push(url);
            urls.live.add(url);
            return url;
        },
        revokeObjectURL(url) {
            urls.revoked.push(url);
            urls.live.delete(url);
        },
    };
    return urls;
}

/** A File for every asset path the document references, as if the author had chosen them. */
export function filesFor(window, document) {
    return new Map(
        collectAssetReferences(document).map(({ path, location }) => [
            path,
            new window.File(["data"], path.split("/").pop(), {
                type: location === "file" ? "application/pdf" : "image/jpeg",
            }),
        ]),
    );
}

export function setup(
    document = createEmptyWorkshop(),
    { withFiles = false, confirmRemoval = () => true } = {},
) {
    const { window } = new JSDOM("<!doctype html><html><body></body></html>", {
        url: "http://localhost/",
    });
    const dom = window.document;
    let disconnects = 0;
    window.IntersectionObserver = class {
        observe() {}
        disconnect() {
            disconnects += 1;
        }
    };
    const [settingsContainer, editorContainer, panelContainer] = [
        "settings",
        "editor",
        "panel",
    ].map((name) => {
        const node = dom.createElement("div");
        node.id = name;
        dom.body.append(node);
        return node;
    });

    const state = createEditorState(document);
    if (withFiles) {
        for (const [path, file] of filesFor(window, document)) state.files.set(path, file);
    }
    const urls = createFakeUrls();
    const assets = createAssetManager(state, { dom, urls, placeholder: PLACEHOLDER });
    const settings = mountSettings(settingsContainer, state, { assets });
    const editor = mountEditor(editorContainer, state, { assets, confirmRemoval });
    const panel = mountValidationPanel(panelContainer, state, {
        getPendingErrors: settings.getPendingErrors,
        getAssetErrors: assets.missing,
        settingsForm: settings.form,
        locate: (path) => editor.locate(path) ?? settings.locate(path.split(".")[0]),
    });

    const query = (selector) => dom.querySelector(selector);
    const queryAll = (selector) => [...dom.querySelectorAll(selector)];
    const type = (element, text) => {
        element.textContent = text;
        element.dispatchEvent(new window.Event("input", { bubbles: true }));
    };
    const input = (element, value) => {
        element.value = value;
        element.dispatchEvent(new window.Event("input", { bubbles: true }));
    };
    const file = (name, type = "image/jpeg") => new window.File(["data"], name, { type });
    const settle = () => new Promise((resolve) => setTimeout(resolve, 0));

    /** Answers the open file dialog with `selected`; null or no file cancels. */
    async function answerPicker(selected) {
        const picker = dom.querySelector(".editor-file-input");
        Object.defineProperty(picker, "files", {
            value: selected ? [selected] : [],
            configurable: true,
        });
        picker.dispatchEvent(new window.Event("change"));
        await settle();
    }

    /** Clicks a picker button and answers the dialog. */
    async function pickFile(button, selected) {
        button.click();
        await answerPicker(selected);
    }

    return {
        window,
        dom,
        state,
        assets,
        settings,
        editor,
        panel,
        urls,
        query,
        queryAll,
        type,
        input,
        file,
        settle,
        answerPicker,
        pickFile,
        disconnects: () => disconnects,
    };
}
