import { createHeader } from "./header.mjs";

document.addEventListener("DOMContentLoaded", () => {
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

    const form = document.getElementById("contact-form");
    const formMessage = document.getElementById("form-message");

    if (form) {
        form.addEventListener("submit", async (e) => {
            e.preventDefault();

            const formData = new FormData(form);

            try {
                const response = await fetch("send-mail.php", {
                    method: "POST",
                    body: formData
                });

                const resultText = await response.text();

                if (response.ok) {
                    formMessage.style.color = "green";
                    formMessage.textContent = resultText;
                    form.reset();
                } else {
                    formMessage.style.color = "red";
                    formMessage.textContent = resultText;
                }
            } catch (error) {
                formMessage.style.color = "red";
                formMessage.textContent = "Ein Netzwerkfehler ist aufgetreten.";
            }
        });
    }
});