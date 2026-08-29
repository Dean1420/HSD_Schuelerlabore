import { createHeader } from "../../workshop_creator/JS/HEADER/header.mjs";

const BODY = document.body;
const HEADER = createHeader();

const navLinks = HEADER.querySelectorAll("a");

navLinks.forEach(link => {
    if (link.textContent.includes("Home")) {
        link.href = "./home.html";
    } 
    else if (link.textContent.includes("Infos")) {
        link.href = "./info.html";
    } 
    else if (link.textContent.includes("Kontakt")) {
        link.href = "./kontakt.html"; 
    }
});

BODY.prepend(HEADER);