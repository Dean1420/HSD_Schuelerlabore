/** Public workshop page, loaded by the generated shell workshops/<slug>/index.html. */
import { showWorkshopPage } from "./workshop-page.mjs";

showWorkshopPage({
    id: document.body.dataset.workshop,
    idPattern: /^[a-z0-9]+(-[a-z0-9]+)*$/,
    publishedOnly: true,
});
