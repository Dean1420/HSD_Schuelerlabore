# HSD_Schuelerlabore

## Setup

Node.js ab Version 20 und npm installieren, dann im Projektordner ausführen:

```sh
npm ci
npm run dev
```

## Formatierung

`.editorconfig` legt UTF-8, LF-Zeilenenden und vier Leerzeichen für die Einrückung
fest (zwei in Markdown und YAML). Prettier übernimmt diese Einstellungen und
formatiert die Quelldateien einheitlich:

```sh
npm run format
npm run format:check
```

`format` schreibt die Formatierung; `format:check` prüft sie ohne Änderungen.
Abhängigkeiten, IDE-Dateien, die generierte Lockdatei und SVG-Assets sind ausgenommen.
