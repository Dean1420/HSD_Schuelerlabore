import { test } from "node:test";
import assert from "node:assert/strict";
import { JSDOM } from "jsdom";

const { window } = new JSDOM("<!doctype html><html><body></body></html>", {
    url: "http://localhost/index.html",
});
globalThis.window = window;
globalThis.document = window.document;

const { filterWorkshops, createCatalogue, createHero, countLabel } =
    await import("../app/pages/home-page.mjs");

const WORKSHOPS = [
    {
        slug: "hass-hinter-glas",
        title: "Hass hinter Glas",
        teaser: "Gegen digitale Gewalt.",
        thumbnail: { src: "thumbnail.jpg", alt: "" },
        subject: "D",
        gradeRange: { min: 8, max: 13 },
        tags: ["medien"],
    },
    {
        slug: "alliens",
        title: "Al(l)iens",
        teaser: "Wir sind alle anders.",
        thumbnail: { src: "thumbnail.jpg", alt: "Klasse" },
        subject: "M",
        gradeRange: { min: 5, max: 10 },
        tags: ["vielfalt"],
    },
    {
        slug: "demokratiere",
        title: "DemokraTiere",
        teaser: "Un jeu démocratique.",
        thumbnail: { src: "thumbnail.jpg", alt: "" },
        subject: "",
        gradeRange: { min: 5, max: 8 },
        tags: [],
    },
];

test("filterWorkshops narrows by grade, subject and free text", () => {
    assert.equal(filterWorkshops(WORKSHOPS).length, 3);
    assert.deepEqual(
        filterWorkshops(WORKSHOPS, { grade: "9" }).map((w) => w.slug),
        ["hass-hinter-glas", "alliens"],
    );
    assert.deepEqual(
        filterWorkshops(WORKSHOPS, { subject: "M" }).map((w) => w.slug),
        ["alliens"],
    );
    assert.deepEqual(
        filterWorkshops(WORKSHOPS, { query: "  VIELFALT " }).map((w) => w.slug),
        ["alliens"],
    );
    assert.deepEqual(
        filterWorkshops(WORKSHOPS, { grade: "5", query: "jeu" }).map((w) => w.slug),
        ["demokratiere"],
    );
});

test("countLabel uses the singular for one workshop", () => {
    assert.equal(countLabel(0), "0 Workshops");
    assert.equal(countLabel(1), "1 Workshop");
    assert.equal(countLabel(6), "6 Workshops");
});

test("catalogue numbers the cards from the full list and names the faculty", () => {
    const { section } = createCatalogue(WORKSHOPS);
    const cards = section.querySelectorAll(".home-card");
    assert.equal(cards.length, 3);
    assert.equal(section.querySelector(".home-count").textContent, "3 Workshops");
    assert.deepEqual(
        [...section.querySelectorAll(".home-card__number")].map((n) => n.textContent),
        ["Nº 01", "Nº 02", "Nº 03"],
    );
    assert.equal(cards[0].querySelector(".home-card__faculty").textContent, "Fachbereich Design");
    assert.equal(cards[2].querySelector(".home-card__faculty"), null);
    assert.equal(
        cards[0].querySelector(".home-card__kicker span:last-child").textContent,
        "Klasse 8–13",
    );
    const workshops = new URL("../app/workshops/", import.meta.url).href;
    assert.equal(cards[1].querySelector("a").getAttribute("href"), `${workshops}alliens/`);
    assert.equal(
        cards[1].querySelector("img").getAttribute("src"),
        `${workshops}alliens/thumbnail.jpg`,
    );
    assert.ok(section.querySelector(".home-message").hidden);
});

test("filter row offers only the grades and faculties in the data and keeps card numbers", () => {
    const { section } = createCatalogue(WORKSHOPS);
    const [grade, subject] = section.querySelectorAll("select");
    assert.deepEqual(
        [...grade.options].map((o) => o.value),
        ["", "5", "6", "7", "8", "9", "10", "11", "12", "13"],
    );
    assert.deepEqual(
        [...subject.options].map((o) => o.textContent),
        ["Fachbereich · Alle", "Design", "Medien"],
    );

    subject.value = "M";
    subject.dispatchEvent(new window.Event("input", { bubbles: true }));
    assert.deepEqual(
        [...section.querySelectorAll(".home-card__number")].map((n) => n.textContent),
        ["Nº 02"],
    );
    assert.equal(section.querySelector(".home-count").textContent, "1 Workshop");

    const search = section.querySelector("input[type=search]");
    search.value = "nichts";
    search.dispatchEvent(new window.Event("input", { bubbles: true }));
    assert.equal(section.querySelectorAll(".home-card").length, 0);
    const message = section.querySelector(".home-message");
    assert.equal(message.hidden, false);
    assert.equal(message.textContent, "Keine Workshops für diese Auswahl.");
});

test("an empty index shows a message instead of cards", () => {
    const { section, showMessage } = createCatalogue([]);
    assert.equal(
        section.querySelector(".home-message").textContent,
        "Zurzeit sind keine Workshops eingetragen.",
    );
    showMessage("Fehler");
    assert.equal(section.querySelector(".home-message").textContent, "Fehler");
    assert.equal(section.querySelector(".home-count").textContent, "0 Workshops");
});

test("hero carries the three words, the title and the two switches", () => {
    const hero = createHero();
    assert.deepEqual(
        [...hero.querySelectorAll(".home-hero__words span")].map((s) => s.textContent),
        ["Lernen", "Erleben", "Forschung"],
    );
    assert.equal(hero.querySelector(".home-hero__words").getAttribute("aria-hidden"), "true");
    assert.equal(hero.querySelector("h1").textContent, "Schülerlabore");
    assert.equal(hero.dataset.title, "regular");
    assert.equal(hero.dataset.words, "outline");
});
