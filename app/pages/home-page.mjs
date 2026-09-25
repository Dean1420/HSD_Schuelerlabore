import { createHeader } from "../assets/js/header.mjs";
import { createFooter } from "./footer.mjs";
import { PLACEHOLDER_URL } from "../assets/js/assets.mjs";
import { SUBJECT_LABELS } from "../assets/js/workshop-schema.mjs";

const WORKSHOPS_URL = new URL("../workshops/", import.meta.url);
const INDEX_URL = new URL("../workshops.json", import.meta.url);

export const HOME_TEXT = Object.freeze({
    words: ["Lernen", "Erleben", "Forschung"],
    title: "Schülerlabore",
    deck: "Workshops für Schülerinnen und Schüler von der Hochschule Düsseldorf.",
    figure: "Schülerlabor der Hochschule Düsseldorf.",
    quote: "„Al(l)iens“ eröffnet neue Perspektiven und macht Vielfalt zur Stärke.",
    quoteBy: "Name, Schule",
    kicker: "Kursangebot",
    catalogueTitle: "Workshops für Schulklassen",
    catalogueIntro:
        "Unsere Kurse rund um Demokratie, digitale Medienkompetenz, Diversität und " +
        "Zukunftstechnologien verbinden gesellschaftliches Bewusstsein mit Technikverständnis.",
});

// Hero variants: title "regular"/"bold", words "outline"/"solid" (see home.css).
export const HERO_OPTIONS = Object.freeze({ title: "regular", words: "outline" });

export function showHomePage() {
    const body = document.body;
    body.appendChild(createHeader());
    const main = el("main", "home-page");
    main.append(createHero(), createSpread());
    const catalogue = createCatalogue([]);
    main.appendChild(catalogue.section);
    body.append(main, createFooter());

    loadIndex()
        .then((workshops) => catalogue.setWorkshops(workshops))
        .catch((error) => {
            console.error("Kursangebot konnte nicht geladen werden:", error);
            catalogue.showMessage("Das Kursangebot konnte nicht geladen werden.");
        });
}

async function loadIndex() {
    const response = await fetch(INDEX_URL);
    if (!response.ok) throw new Error(`workshops.json: HTTP ${response.status}`);
    return response.json();
}

export function createHero(text = HOME_TEXT, options = HERO_OPTIONS) {
    const section = el("section", "home-hero grid");
    section.dataset.title = options.title;
    section.dataset.words = options.words;

    const stage = el("div", "home-hero__stage");
    const words = el("p", "home-hero__words");
    words.setAttribute("aria-hidden", "true");
    text.words.forEach((word) => words.appendChild(el("span", "", word)));
    const title = el("h1", "home-hero__title", text.title);
    stage.append(words, title);

    section.append(stage, el("p", "home-hero__deck", text.deck));
    return section;
}

export function createSpread(text = HOME_TEXT) {
    const section = el("section", "home-spread grid");

    const figure = el("figure", "home-figure");
    const image = el("img", "home-figure__image");
    image.src = PLACEHOLDER_URL;
    image.alt = "";
    const caption = el("figcaption");
    caption.append(el("span", "home-figure__number", "Abb. 01"), ` — ${text.figure}`);
    figure.append(image, caption);

    const quote = el("blockquote", "home-quote");
    quote.append(el("p", "", text.quote), el("footer", "", text.quoteBy));

    section.append(figure, quote);
    return section;
}

export function filterWorkshops(workshops, { grade = "", subject = "", query = "" } = {}) {
    const needle = query.trim().toLowerCase();
    const level = grade === "" ? null : Number(grade);
    return workshops.filter((workshop) => {
        if (level !== null) {
            const range = workshop.gradeRange ?? {};
            if (!(range.min <= level && level <= range.max)) return false;
        }
        if (subject && workshop.subject !== subject) return false;
        if (needle) {
            const haystack = [workshop.title, workshop.teaser, ...(workshop.tags ?? [])]
                .join(" ")
                .toLowerCase();
            if (!haystack.includes(needle)) return false;
        }
        return true;
    });
}

export function countLabel(count) {
    return `${count} Workshop${count === 1 ? "" : "s"}`;
}

// Cards retain their original numbers when filtered.
export function createCatalogue(initial = [], text = HOME_TEXT) {
    const section = el("section", "home-catalogue grid");
    section.setAttribute("aria-labelledby", "home-catalogue-title");

    const kicker = el("p", "home-kicker");
    const count = el("span", "home-count");
    count.setAttribute("role", "status");
    kicker.append(`${text.kicker} · `, count);
    const heading = el("h2", "home-catalogue__title", text.catalogueTitle);
    heading.id = "home-catalogue-title";
    const intro = el("p", "home-intro", text.catalogueIntro);

    const filter = createFilterRow();
    const list = el("ul", "home-cards");
    const message = el("p", "home-message");
    message.setAttribute("role", "status");
    message.hidden = true;

    section.append(kicker, heading, intro, filter.form, list, message);

    let workshops = [];

    function render() {
        const shown = filterWorkshops(workshops, filter.criteria());
        list.replaceChildren(...shown.map((workshop) => createCard(workshop, workshops)));
        count.textContent = countLabel(shown.length);
        const empty = workshops.length > 0 && shown.length === 0;
        message.textContent = empty ? "Keine Workshops für diese Auswahl." : "";
        message.hidden = !empty;
    }

    function setWorkshops(next) {
        workshops = Array.isArray(next) ? next : [];
        filter.fill(workshops);
        if (workshops.length === 0) showMessage("Zurzeit sind keine Workshops eingetragen.");
        else render();
    }

    function showMessage(textContent) {
        list.replaceChildren();
        count.textContent = countLabel(0);
        message.textContent = textContent;
        message.hidden = false;
    }

    filter.form.addEventListener("input", render);
    filter.form.addEventListener("reset", () => setTimeout(render, 0));
    filter.form.addEventListener("submit", (event) => event.preventDefault());

    setWorkshops(initial);
    return { section, setWorkshops, showMessage };
}

function createFilterRow() {
    const form = el("form", "home-filter");
    form.setAttribute("role", "search");
    form.setAttribute("aria-label", "Workshops filtern");

    const label = el("span", "home-filter__label", "Filter");

    const grade = el("select", "home-filter__select");
    grade.name = "grade";
    grade.setAttribute("aria-label", "Klassenstufe");

    const subject = el("select", "home-filter__select");
    subject.name = "subject";
    subject.setAttribute("aria-label", "Fachbereich");

    const search = el("input", "home-filter__search");
    search.type = "search";
    search.name = "query";
    search.placeholder = "Stichwortsuche";
    search.setAttribute("aria-label", "Stichwortsuche");

    const reset = el("button", "home-filter__reset", "Filter zurücksetzen");
    reset.type = "reset";

    form.append(label, grade, subject, search, reset);

    function fill(workshops) {
        const grades = new Set();
        const subjects = new Set();
        workshops.forEach((workshop) => {
            const { min, max } = workshop.gradeRange ?? {};
            if (Number.isInteger(min) && Number.isInteger(max)) {
                for (let level = min; level <= max; level += 1) grades.add(level);
            }
            if (SUBJECT_LABELS[workshop.subject]) subjects.add(workshop.subject);
        });
        setOptions(
            grade,
            "Klassenstufe · Alle",
            [...grades].sort((a, b) => a - b),
            String,
        );
        setOptions(
            subject,
            "Fachbereich · Alle",
            Object.keys(SUBJECT_LABELS).filter((code) => subjects.has(code)),
            (code) => SUBJECT_LABELS[code].replace(/^Fachbereich /, ""),
        );
    }

    function criteria() {
        return { grade: grade.value, subject: subject.value, query: search.value };
    }

    return { form, fill, criteria };
}

function setOptions(select, allLabel, values, labelFor) {
    const current = select.value;
    select.replaceChildren(option("", allLabel));
    values.forEach((value) => select.appendChild(option(String(value), labelFor(value))));
    select.value = [...select.options].some((item) => item.value === current) ? current : "";
}

function option(value, label) {
    const node = el("option", "", label);
    node.value = value;
    return node;
}

export function createCard(workshop, all) {
    const number = String(all.indexOf(workshop) + 1).padStart(2, "0");
    const item = el("li", "home-card");
    const link = el("a", "home-card__link");
    link.href = new URL(`${workshop.slug}/`, WORKSHOPS_URL).href;

    const kicker = el("p", "home-card__kicker");
    kicker.appendChild(el("span", "home-card__number", `Nº ${number}`));
    const { min, max } = workshop.gradeRange ?? {};
    if (Number.isInteger(min) && Number.isInteger(max)) {
        kicker.appendChild(el("span", "", min === max ? `Klasse ${min}` : `Klasse ${min}–${max}`));
    }

    const image = el("img", "home-card__image");
    image.src = new URL(`${workshop.slug}/${workshop.thumbnail?.src ?? ""}`, WORKSHOPS_URL).href;
    image.alt = workshop.thumbnail?.alt ?? "";
    image.loading = "lazy";

    link.append(
        kicker,
        image,
        el("h3", "home-card__title", workshop.title),
        el("p", "home-card__teaser", workshop.teaser),
    );
    const faculty = SUBJECT_LABELS[workshop.subject];
    if (faculty) link.appendChild(el("p", "home-card__faculty", faculty));

    item.appendChild(link);
    return item;
}

function el(tag, className = "", text) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined) node.textContent = text;
    return node;
}
