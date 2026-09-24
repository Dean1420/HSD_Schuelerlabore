/** Store-only ZIP writer (no compression, UTF-8 names). Entries: { name, data: Uint8Array }. */

const CRC_TABLE = new Uint32Array(256).map((_, n) => {
    let c = n;
    for (let k = 0; k < 8; k += 1) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    return c >>> 0;
});

// Host "Unix" makes older unzip tools read names as raw UTF-8 bytes.
const FILE_MODE = (0o100644 << 16) >>> 0;
const MADE_BY_UNIX = (3 << 8) | 20;

export function crc32(bytes) {
    let crc = 0xffffffff;
    for (const byte of bytes) crc = CRC_TABLE[(crc ^ byte) & 0xff] ^ (crc >>> 8);
    return (crc ^ 0xffffffff) >>> 0;
}

export function createZip(entries, { date = new Date() } = {}) {
    const encoder = new TextEncoder();
    const time = (date.getHours() << 11) | (date.getMinutes() << 5) | (date.getSeconds() >> 1);
    const day =
        ((Math.max(1980, date.getFullYear()) - 1980) << 9) |
        ((date.getMonth() + 1) << 5) |
        date.getDate();
    const parts = [];
    const directory = [];
    let offset = 0;

    for (const { name, data } of entries) {
        const nameBytes = encoder.encode(name);
        // version, flags (UTF-8), method (store), time, date, crc, sizes, name length, extra length
        const shared = [20, 0x0800, 0, time, day, crc32(data), data.length, data.length];
        const local = record(30, [0x04034b50, ...shared, nameBytes.length, 0], "LSSSSSLLLSS");
        const central = record(
            46,
            [0x02014b50, MADE_BY_UNIX, ...shared, nameBytes.length, 0, 0, 0, 0, FILE_MODE, offset],
            "LSSSSSSLLLSSSSSLL",
        );
        parts.push(local, nameBytes, data);
        directory.push(central, nameBytes);
        offset += local.length + nameBytes.length + data.length;
    }

    const directorySize = directory.reduce((sum, part) => sum + part.length, 0);
    const end = record(
        22,
        [0x06054b50, 0, 0, entries.length, entries.length, directorySize, offset, 0],
        "LSSSSLLS",
    );
    return concat([...parts, ...directory, end]);
}

/** Packs values as little-endian 16-bit (S) or 32-bit (L) fields. */
function record(size, values, layout) {
    const bytes = new Uint8Array(size);
    const view = new DataView(bytes.buffer);
    let position = 0;
    values.forEach((value, i) => {
        if (layout[i] === "L") view.setUint32(position, value, true);
        else view.setUint16(position, value, true);
        position += layout[i] === "L" ? 4 : 2;
    });
    return bytes;
}

function concat(parts) {
    const result = new Uint8Array(parts.reduce((sum, part) => sum + part.length, 0));
    let position = 0;
    for (const part of parts) {
        result.set(part, position);
        position += part.length;
    }
    return result;
}
