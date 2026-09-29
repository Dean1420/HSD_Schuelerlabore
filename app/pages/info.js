import { createHeader } from "../assets/js/header.mjs";
import { createFooter } from "./footer.mjs";

document.body.prepend(createHeader());
document.body.append(createFooter());
