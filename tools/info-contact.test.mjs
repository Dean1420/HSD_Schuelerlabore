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

async function contactPage(t, fetch) {
    const { window } = new JSDOM(readFileSync(new URL("contact.html", APP), "utf8"), {
        url: new URL("contact.html", APP).href,
    });
    const globals = {
        document: window.document,
        location: window.location,
        FormData: window.FormData,
        fetch,
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
    await import(`../app/pages/contact.js?test=${encodeURIComponent(t.name)}`);
    return window;
}

test("contact submits every named field and shows success with the shared header", async (t) => {
    let request;
    const window = await contactPage(t, async (url, options) => {
        request = { url, ...options };
        return { ok: true, text: async () => "Nachricht versendet." };
    });
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
    assert.equal(request.url.href, new URL("send-mail.php", APP).href);
    assert.equal(request.method, "POST");
    assert.deepEqual([...request.body.entries()], expected);
    assert.equal(
        window.document.querySelector("#form-message").textContent,
        "Nachricht versendet.",
    );
    assert.equal(form.querySelector("input").value, "");
    const links = [...window.document.querySelectorAll(".site-nav a")];
    assert.deepEqual(
        links.map((link) => link.href),
        ["index.html", "info.html", "contact.html"].map((page) => new URL(page, APP).href),
    );
    assert.equal(links[2].getAttribute("aria-current"), "page");
});

test("unavailable contact backend keeps entered data and offers direct email", async (t) => {
    let networkFailure = false;
    const window = await contactPage(t, async () => {
        if (networkFailure) throw new TypeError("Network unavailable");
        return { ok: false, text: async () => "<html>Not Found</html>" };
    });
    const form = window.document.querySelector("form");
    const school = form.querySelector("#form-schule");
    school.value = "Beispielschule";
    for (const failure of [false, true]) {
        networkFailure = failure;
        form.dispatchEvent(new window.Event("submit", { bubbles: true, cancelable: true }));
        await setImmediate();
        const message = window.document.querySelector("#form-message");
        assert.match(message.textContent, /nicht gesendet/);
        assert.match(message.textContent, /info@hs-duesseldorf\.de/);
        assert.doesNotMatch(message.textContent, /<html>/);
        assert.equal(school.value, "Beispielschule");
    }
});
