/**
 * Development preview of a workshop document: renders workshops/<id>/workshop.json read-only
 * with the shared renderer. The public workshop page of the migration builds on this file.
 *
 *   preview.html?id=<slug>                 a workshop folder under app/workshops/
 *   preview.html?id=_fixtures/<name>       a fixture copied there by `npm run fixtures`
 */
import { createHeader } from "../assets/js/header.mjs";
import { migrate, validateWorkshop } from "../assets/js/workshop-schema.mjs";
import { renderWorkshop } from "../assets/js/renderer/render-workshop.mjs";

const ID_PATTERN = /^[a-z0-9_][a-z0-9_-]*(\/[a-z0-9][a-z0-9-]*)?$/;

const body = document.body;
body.appendChild(createHeader());

const id = new URLSearchParams(location.search).get("id") ?? "_fixtures/example-complete";
showPreview(id).catch((error) => {
    console.error("Vorschau konnte nicht geladen werden:", error);
    showMessage(`Vorschau konnte nicht geladen werden: ${error.message}`);
});

async function showPreview(workshopId) {
    if (!ID_PATTERN.test(workshopId)) throw new Error(`Ungültige Workshop-Kennung „${workshopId}“`);
    const folder = `workshops/${workshopId}/`;
    const response = await fetch(`${folder}workshop.json`);
    if (!response.ok) throw new Error(`${folder}workshop.json: HTTP ${response.status}`);

    const workshop = migrate(await response.json());
    const errors = validateWorkshop(workshop, { mode: "draft" });
    if (errors.length) {
        console.warn("Das Dokument ist kein gültiger Entwurf:", errors);
        showMessage(
            `Das Dokument hat ${errors.length} Validierungsfehler und wird nicht angezeigt (siehe Konsole).`,
        );
        return;
    }

    document.title = `${workshop.title || "Workshop"} – Schülerlabore HSD`;
    const main = renderWorkshop(workshop, { resolveAsset: (path) => folder + path });
    body.appendChild(main);
    if (!main.querySelector("#workshop-content > section")) {
        showMessage("Dieser Workshop enthält noch keine Inhalte.");
    }
}

function showMessage(text) {
    const message = document.createElement("p");
    message.className = "workshop-message";
    message.setAttribute("role", "status");
    message.textContent = text;
    body.appendChild(message);
}
