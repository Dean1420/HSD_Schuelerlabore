import { migrate, validateWorkshop } from "../../assets/js/workshop-schema.mjs";
import { collectAssetReferences } from "./editor-assets.mjs";

const EXAMPLE_FOLDER = "workshops/_fixtures/example-complete/";

export async function loadExampleWorkshop(state, fetchResource = globalThis.fetch) {
    const response = await read("workshop.json");
    const document = migrate(await response.json());
    const errors = validateWorkshop(document, { mode: "draft" });
    if (errors.length) throw new Error(`Ungültiges Beispiel: ${errors[0].message}`);

    const paths = new Set(collectAssetReferences(document).map(({ path }) => path));
    const files = new Map(
        await Promise.all(
            [...paths].map(async (path) => {
                const response = await read(path);
                const blob = await response.blob();
                return [path, new File([blob], path.split("/").pop(), { type: blob.type })];
            }),
        ),
    );
    state.load(document, { files });

    async function read(path) {
        const response = await fetchResource(EXAMPLE_FOLDER + path);
        if (!response.ok) {
            throw new Error(
                `Beispieldatei „${path}“ konnte nicht geladen werden (HTTP ${response.status}).`,
            );
        }
        return response;
    }
}
