/** Development preview, drafts included: preview.html?id=<slug> or ?id=_fixtures/<name> */
import { showWorkshopPage } from "./workshop-page.mjs";

showWorkshopPage({
    id: new URLSearchParams(location.search).get("id") ?? "_fixtures/example-complete",
    idPattern: /^[a-z0-9_][a-z0-9_-]*(\/[a-z0-9][a-z0-9-]*)?$/,
    publishedOnly: false,
});
