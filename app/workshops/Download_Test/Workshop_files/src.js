document.addEventListener("DOMContentLoaded", () => {
    const logoLink = document.querySelector("#header-logo-container a");
    if (logoLink) logoLink.href = "../../index.html";

    document.querySelectorAll("#page-navigation a").forEach((link, i) => {
        link.href = ["../../index.html", "../../info.html", "../../contact.html"][i];
    });
});

document.addEventListener("DOMContentLoaded", () => {
    document.querySelectorAll("a[download]").forEach((link) => {
        const filename = link.getAttribute("download");
        link.href = `FILES/${filename}`;
    });
});

document.addEventListener("DOMContentLoaded", () => {
    document.querySelectorAll("img[data-filename]").forEach((img) => {
        img.src = `IMAGES/${img.dataset.filename}`;
    });
});
