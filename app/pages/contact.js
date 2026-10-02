import { createHeader } from "../assets/js/header.mjs";
import { createFooter } from "./footer.mjs";

const fieldLabels = {
    schule: "Schule",
    schulform: "Schulform",
    klassenstufe: "Klassenstufe",
    klassengrosse: "Klassengröße",
    ansprechpartner: "Ansprechpartner*in",
    kurstage: "Anzahl der Kurstage",
    thematik: "Thematik / Kursangebot",
    ort: "Veranstaltungsort",
    datum: "Gewünschtes Datum / Zeitraum",
    email: "E-Mail-Adresse",
    telefon: "Telefonnummer",
};

export function createMailtoUrl(formData) {
    const body = [...formData.entries()]
        .map(([name, value]) => `${fieldLabels[name] ?? name}: ${value}`)
        .join("\n");
    const subject = `Anfrage für ein Schülerlabor: ${formData.get("schule")}`;

    return `mailto:nada.ilic@hs-duesseldorf.de?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
}

document.body.prepend(createHeader());
document.body.append(createFooter());

const form = document.getElementById("contact-form");
const formMessage = document.getElementById("form-message");

if (form && formMessage) {
    form.addEventListener("submit", (event) => {
        event.preventDefault();
        const formData = new FormData(form);

        formMessage.style.color = "green";
        formMessage.textContent =
            "Ihr E-Mail-Programm wird geöffnet. Bitte prüfen Sie die Nachricht und senden Sie sie dort ab.";
        globalThis.location.href = createMailtoUrl(formData);
    });
}
