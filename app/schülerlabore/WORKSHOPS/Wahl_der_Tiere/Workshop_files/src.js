document.addEventListener("DOMContentLoaded", () => {
    document.querySelectorAll("#page-navigation a").forEach((link, i) => {
        link.href = ["../../home.html", "../../infos.html", "../../kontakt.html"][i];
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
