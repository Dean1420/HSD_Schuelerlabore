// Crop rectangles use pixels of the rotated image. SVG and GIF pass through unchanged.
const MAX_SIDE = 1600;
const MIN_CROP = 32;
const JPEG_QUALITY = 0.85;
const PASS_THROUGH = new Set(["image/svg+xml", "image/gif"]);

export function fitCrop(width, height, aspect) {
    if (!aspect) return { x: 0, y: 0, width, height };
    const cropWidth = Math.min(width, height * aspect);
    const cropHeight = cropWidth / aspect;
    return {
        x: (width - cropWidth) / 2,
        y: (height - cropHeight) / 2,
        width: cropWidth,
        height: cropHeight,
    };
}

export function clampCrop(crop, width, height) {
    return {
        ...crop,
        x: Math.min(Math.max(0, crop.x), width - crop.width),
        y: Math.min(Math.max(0, crop.y), height - crop.height),
    };
}

export function resizeCrop(anchor, pointer, width, height, aspect) {
    const directionX = pointer.x >= anchor.x ? 1 : -1;
    const directionY = pointer.y >= anchor.y ? 1 : -1;
    const roomX = directionX > 0 ? width - anchor.x : anchor.x;
    const roomY = directionY > 0 ? height - anchor.y : anchor.y;
    let cropWidth = Math.min(Math.max(Math.abs(pointer.x - anchor.x), MIN_CROP), roomX);
    let cropHeight = Math.min(Math.max(Math.abs(pointer.y - anchor.y), MIN_CROP), roomY);
    if (aspect) {
        cropWidth = Math.min(cropWidth, roomY * aspect);
        cropHeight = cropWidth / aspect;
    }
    return {
        x: directionX > 0 ? anchor.x : anchor.x - cropWidth,
        y: directionY > 0 ? anchor.y : anchor.y - cropHeight,
        width: cropWidth,
        height: cropHeight,
    };
}

/** Output size in whole pixels; images are only ever scaled down. */
export function outputSize(cropWidth, cropHeight, maxSide = MAX_SIDE) {
    const scale = Math.min(1, maxSide / Math.max(cropWidth, cropHeight));
    return {
        width: Math.max(1, Math.round(cropWidth * scale)),
        height: Math.max(1, Math.round(cropHeight * scale)),
    };
}

export function outputName(name, type) {
    const dot = name.lastIndexOf(".");
    return `${dot > 0 ? name.slice(0, dot) : name}.${type === "image/png" ? "png" : "jpg"}`;
}

/** Resolves with the edited File, or null when the author cancels. Rejects for unreadable images. */
export async function openImageEditor(dom, file, { aspect = null } = {}) {
    if (PASS_THROUGH.has(file.type)) return file;
    const view = dom.defaultView;
    const source = await loadImage(view, file);
    const type = file.type === "image/png" ? "image/png" : "image/jpeg";

    let turns = 0;
    let rotated = renderRotated(dom, source, turns);
    let crop = fitCrop(rotated.width, rotated.height, aspect);
    let scale = 1;

    const dialog = element("dialog", "editor-image-dialog");
    dialog.setAttribute("aria-label", "Bild zuschneiden");
    const stage = element("div", "editor-image-stage");
    const preview = element("canvas");
    const frame = element("div", "editor-image-crop");
    frame.tabIndex = 0;
    frame.setAttribute("role", "group");
    frame.setAttribute(
        "aria-label",
        "Ausschnitt: Pfeiltasten verschieben, Plus und Minus ändern die Größe",
    );
    const handles = ["nw", "ne", "sw", "se"].map((corner) => {
        const handle = element("span", `editor-image-handle editor-image-handle-${corner}`);
        handle.dataset.corner = corner;
        return handle;
    });
    frame.append(...handles);
    stage.append(preview, frame);

    const hint = element("p", "editor-hint");
    hint.textContent = aspect
        ? "Ausschnitt verschieben oder an den Ecken ziehen. Das Seitenverhältnis ist für diese Stelle fest."
        : "Ausschnitt verschieben oder an den Ecken ziehen.";
    const left = button("Nach links drehen", () => rotate(-1));
    const right = button("Nach rechts drehen", () => rotate(1));
    const reset = button("Ganzes Bild", () => {
        crop = fitCrop(rotated.width, rotated.height, aspect);
        draw();
    });
    let finish = () => {};
    const cancel = button("Abbrechen", () => finish(false));
    const apply = button("Übernehmen", () => finish(true));
    apply.classList.add("editor-image-apply");
    const tools = element("div", "editor-image-tools");
    tools.append(left, right, reset);
    const actions = element("div", "editor-image-actions");
    actions.append(cancel, apply);
    dialog.append(stage, hint, tools, actions);
    dom.body.append(dialog);

    function rotate(direction) {
        turns = (turns + direction + 4) % 4;
        rotated = renderRotated(dom, source, turns);
        crop = fitCrop(rotated.width, rotated.height, aspect);
        draw();
    }

    function draw() {
        const maxWidth = Math.min(view.innerWidth * 0.9 - 48, 900);
        const maxHeight = view.innerHeight * 0.6;
        scale = Math.min(1, maxWidth / rotated.width, maxHeight / rotated.height);
        preview.width = Math.round(rotated.width * scale);
        preview.height = Math.round(rotated.height * scale);
        preview.getContext("2d").drawImage(rotated, 0, 0, preview.width, preview.height);
        Object.assign(frame.style, {
            left: `${crop.x * scale}px`,
            top: `${crop.y * scale}px`,
            width: `${crop.width * scale}px`,
            height: `${crop.height * scale}px`,
        });
    }

    function toImage(event) {
        const box = preview.getBoundingClientRect();
        return {
            x: Math.min(Math.max(0, (event.clientX - box.left) / scale), rotated.width),
            y: Math.min(Math.max(0, (event.clientY - box.top) / scale), rotated.height),
        };
    }

    frame.addEventListener("pointerdown", (event) => {
        event.preventDefault();
        frame.focus();
        frame.setPointerCapture(event.pointerId);
        const corner = event.target.dataset?.corner;
        const start = toImage(event);
        const origin = { ...crop };
        const anchor = corner && {
            x: corner.includes("w") ? origin.x + origin.width : origin.x,
            y: corner.includes("n") ? origin.y + origin.height : origin.y,
        };
        const onMove = (move) => {
            const point = toImage(move);
            crop = anchor
                ? resizeCrop(anchor, point, rotated.width, rotated.height, aspect)
                : clampCrop(
                      {
                          ...origin,
                          x: origin.x + point.x - start.x,
                          y: origin.y + point.y - start.y,
                      },
                      rotated.width,
                      rotated.height,
                  );
            draw();
        };
        const onUp = () => {
            frame.removeEventListener("pointermove", onMove);
            frame.removeEventListener("pointerup", onUp);
            frame.removeEventListener("pointercancel", onUp);
        };
        frame.addEventListener("pointermove", onMove);
        frame.addEventListener("pointerup", onUp);
        frame.addEventListener("pointercancel", onUp);
    });

    frame.addEventListener("keydown", (event) => {
        const step = Math.max(rotated.width, rotated.height) * 0.02;
        const moves = {
            ArrowLeft: [-step, 0],
            ArrowRight: [step, 0],
            ArrowUp: [0, -step],
            ArrowDown: [0, step],
        };
        if (moves[event.key]) {
            const [dx, dy] = moves[event.key];
            crop = clampCrop(
                { ...crop, x: crop.x + dx, y: crop.y + dy },
                rotated.width,
                rotated.height,
            );
        } else if (event.key === "+" || event.key === "-") {
            const factor = event.key === "+" ? 1.05 : 0.95;
            const ratio = aspect || crop.width / crop.height;
            const width = Math.min(
                Math.max(crop.width * factor, MIN_CROP),
                rotated.width,
                rotated.height * ratio,
            );
            const height = width / ratio;
            crop = clampCrop(
                {
                    x: crop.x + (crop.width - width) / 2,
                    y: crop.y + (crop.height - height) / 2,
                    width,
                    height,
                },
                rotated.width,
                rotated.height,
            );
        } else {
            return;
        }
        event.preventDefault();
        draw();
    });

    const onResize = () => draw();
    view.addEventListener("resize", onResize);

    return new Promise((resolve, reject) => {
        // Finishes from the buttons and Escape directly; a hidden page never fires "close".
        finish = (accepted) => {
            finish = () => {};
            view.removeEventListener("resize", onResize);
            dialog.close();
            dialog.remove();
            if (!accepted) return resolve(null);
            const size = outputSize(crop.width, crop.height);
            const output = element("canvas");
            output.width = size.width;
            output.height = size.height;
            output
                .getContext("2d")
                .drawImage(
                    rotated,
                    crop.x,
                    crop.y,
                    crop.width,
                    crop.height,
                    0,
                    0,
                    size.width,
                    size.height,
                );
            output.toBlob(
                (blob) =>
                    blob
                        ? resolve(new view.File([blob], outputName(file.name, type), { type }))
                        : reject(new Error("Das Bild konnte nicht gespeichert werden.")),
                type,
                JPEG_QUALITY,
            );
        };
        dialog.addEventListener("cancel", (event) => {
            event.preventDefault();
            finish(false);
        });
        dialog.showModal();
        draw();
        frame.focus();
    });

    function button(text, onClick) {
        const node = element("button");
        node.type = "button";
        node.textContent = text;
        node.addEventListener("click", onClick);
        return node;
    }

    function element(tag, className) {
        const node = dom.createElement(tag);
        if (className) node.className = className;
        return node;
    }
}

function loadImage(view, file) {
    return new Promise((resolve, reject) => {
        const url = view.URL.createObjectURL(file);
        const image = new view.Image();
        image.onload = () => {
            view.URL.revokeObjectURL(url);
            resolve(image);
        };
        image.onerror = () => {
            view.URL.revokeObjectURL(url);
            reject(new Error("Das Bild konnte nicht gelesen werden."));
        };
        image.src = url;
    });
}

/** The image turned by `turns` quarter turns clockwise, at full size. */
function renderRotated(dom, image, turns) {
    const canvas = dom.createElement("canvas");
    const swap = turns % 2 === 1;
    canvas.width = swap ? image.naturalHeight : image.naturalWidth;
    canvas.height = swap ? image.naturalWidth : image.naturalHeight;
    const context = canvas.getContext("2d");
    context.translate(canvas.width / 2, canvas.height / 2);
    context.rotate((turns * Math.PI) / 2);
    context.drawImage(image, -image.naturalWidth / 2, -image.naturalHeight / 2);
    return canvas;
}
