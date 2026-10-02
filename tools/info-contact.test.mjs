import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";
import { setImmediate } from "node:timers/promises";
import { JSDOM } from "jsdom";

const APP = new URL("../app/", import.meta.url);

test("info and contact load their scripts, styles and images from the new webroot", () => {
    for (const page of ["info.html", "contact.html"]) {
        const url = new URL(page, APP);
        const { window } = new JSDOM(readFileSync(url, "utf8"));
        try {
            for (const element of window.document.querySelectorAll(
                "img[src], script[src], link[rel=stylesheet]",
            )) {
                const path = element.getAttribute("src") ?? element.getAttribute("href");
                const asset = new URL(path, url);
                assert.ok(asset.href.startsWith(APP.href), `${page}: ${path} leaves webroot`);
                assert.ok(existsSync(asset), `${page}: missing ${path}`);
                assert.doesNotMatch(path, /schülerlabore|IMAGES|\.\/CSS|\.\/JS/);
            }
        } finally {
            window.close();
        }
    }
});

async function contactPage(t) {
    const { window } = new JSDOM(readFileSync(new URL("contact.html", APP), "utf8"), {
        url: new URL("contact.html", APP).href,
    });
    const globals = {
        document: window.document,
        location: window.location,
        FormData: window.FormData,
    };
    for (const [key, value] of Object.entries(globals)) {
        const original = Object.getOwnPropertyDescriptor(globalThis, key);
        Object.defineProperty(globalThis, key, { value, writable: true, configurable: true });
        t.after(() => {
            if (original) Object.defineProperty(globalThis, key, original);
            else delete globalThis[key];
        });
    }
    t.after(() => window.close());
    const module = await import(`../app/pages/contact.js?test=${encodeURIComponent(t.name)}`);
    return { window, module };
}

test("contact opens a prefilled email with every named field", async (t) => {
    const { window, module } = await contactPage(t);
    const form = window.document.querySelector("form");
    const fields = [...form.querySelectorAll("input, select, textarea")];
    for (const field of fields) {
        assert.ok(field.name, `${field.id} must be included in FormData`);
        field.value = field.tagName === "SELECT" ? field.options[1].value : "Test";
    }
    const expected = fields.map((field) => [field.name, field.value]);
    const event = new window.Event("submit", { bubbles: true, cancelable: true });
    form.dispatchEvent(event);
    await setImmediate();

    assert.ok(event.defaultPrevented);
    const mailto = new URL(module.createMailtoUrl(new window.FormData(form)));
    assert.equal(mailto.protocol, "mailto:");
    const mailtoBody = decodeURIComponent(mailto.searchParams.get("body"));
    for (const [, value] of expected) {
        assert.match(mailtoBody, new RegExp(value));
    }
    assert.equal(
        window.document.querySelector("#form-message").textContent,
        "Ihr E-Mail-Programm wird geöffnet. Bitte prüfen Sie die Nachricht und senden Sie sie dort ab.",
    );
    const links = [...window.document.querySelectorAll(".site-nav a")];
    assert.equal(links[2].getAttribute("aria-current"), "page");
});
