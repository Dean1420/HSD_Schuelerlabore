/** Renders workshops/<id>/workshop.json read-only. Shared by the workshop shells and preview.html. */
import { createHeader } from "../assets/js/header.mjs";
import { migrate, validateWorkshop } from "../assets/js/workshop-schema.mjs";
import { renderWorkshop } from "../assets/js/renderer/render-workshop.mjs";

const WORKSHOPS_URL = new URL("../workshops/", import.meta.url);

export function showWorkshopPage({ id, idPattern, publishedOnly }) {
    const body = document.body;
    body.appendChild(createHeader());
    show(id).catch((error) => {
        console.error("Workshop konnte nicht geladen werden:", error);
        showMessage("Dieser Workshop konnte nicht geladen werden.");
    });

    async function show(workshopId) {
        if (!workshopId || !idPattern.test(workshopId)) {
            throw new Error(`Ungültige Workshop-Kennung „${workshopId}“`);
        }
        const folder = new URL(`${workshopId}/`, WORKSHOPS_URL).href;
        const response = await fetch(`${folder}workshop.json`);
        if (!response.ok) throw new Error(`${workshopId}/workshop.json: HTTP ${response.status}`);

        const workshop = migrate(await response.json());
        if (publishedOnly && workshop.published !== true) {
            showMessage("Dieser Workshop ist noch nicht veröffentlicht.");
            return;
        }
        const errors = validateWorkshop(workshop, { mode: publishedOnly ? "publish" : "draft" });
        if (errors.length) {
            console.warn("Validierungsfehler:", errors);
            throw new Error(`${errors.length} Validierungsfehler`);
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
}
