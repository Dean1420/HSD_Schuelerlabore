import { createHeader } from "../assets/js/header.mjs";

document.body.prepend(createHeader());

const form = document.getElementById("contact-form");
const formMessage = document.getElementById("form-message");

if (form && formMessage) {
    form.addEventListener("submit", async (event) => {
        event.preventDefault();
        formMessage.textContent = "";

        try {
            const response = await fetch(new URL("../send-mail.php", import.meta.url), {
                method: "POST",
                body: new FormData(form),
            });
            if (!response.ok) throw new Error("Contact request failed");

            formMessage.style.color = "green";
            formMessage.textContent = await response.text();
            form.reset();
        } catch {
            formMessage.style.color = "red";
            formMessage.textContent =
                "Ihre Nachricht konnte nicht gesendet werden. Bitte kontaktieren Sie uns direkt unter info@hs-duesseldorf.de.";
        }
    });
}
