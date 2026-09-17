# HSD_Schuelerlabore

## Setup

Node.js ab Version 20 und npm installieren, dann im Projektordner ausführen:

```sh
npm ci
npm run dev
```

Die Startseite liegt unter <http://localhost:5500/>,
der Editor unter <http://localhost:5500/creator.html>.

## Webroot und Seiten

`app/` ist der vollständige Webroot. Zum Veröffentlichen wird dessen Inhalt
einschließlich der versteckten Datei `.nojekyll` bereitgestellt:

```text
app/
├── index.html          Startseite
├── info.html
├── contact.html
├── creator.html        Workshop-Editor
├── workshops.json     Liste der Workshop-Ordner
├── assets/            Gemeinsame Styles, Skripte und Bilder
├── pages/             Skripte der öffentlichen Seiten und Startseiten-CSS
├── workshop_creator/  Editor-Code und Editor-CSS
├── workshops/         Bestehende Workshop-Exporte mit ihren Dateien
└── .nojekyll           Deaktiviert Jekyll bei GitHub-Pages-Branch-Publishing
```

Die Pfade funktionieren auch, wenn der Webroot unter einem Unterpfad wie
`/schuelerlabore/` veröffentlicht wird. `.nojekyll` hat auf einem normalen
statischen Webserver keine Funktion; sie konfiguriert auch keine Veröffentlichung.

Die früheren Adressen unter `schülerlabore/` und
`workshop_creator/workshop_creator.html` wurden ersetzt. Es gibt keine
Weiterleitungen; vorhandene Lesezeichen und externe Links müssen auf die neuen
Adressen zeigen. Workshops sind jetzt unter `workshops/<Ordner>/Workshop.html`
erreichbar. Dateinamen sind englisch und Ordnerpfade enthalten keine Umlaute;
Eigennamen wie `erbeskopf.jpg` und sichtbare deutsche Texte bleiben erhalten.
JavaScript-Bezeichner sowie IDs und Klassen der aktiven Seiten sind englisch.
Die Kontaktseite heißt `contact.html`.

Das Reparaturskript für alte Exporte liegt mit einer Anleitung in
[`tools/legacy/`](tools/legacy/README.md), außerhalb des Webroots.

## Gemeinsame Dateien und Editor-UI

Gemeinsame Gestaltung und Bilder liegen in `app/assets/`. Seitenspezifische
Styles bleiben bei der jeweiligen Seite:

| Datei                                 | Aufgabe                                                            | Verwendet von                                                              |
| ------------------------------------- | ------------------------------------------------------------------ | -------------------------------------------------------------------------- |
| `app/assets/css/base.css`             | Farben, Schrift, Grundregeln und Seitenkopf                        | Startseite, Info, Kontakt, Editor                                          |
| `app/assets/css/workshop.css`         | Workshop-Inhalt und Navigation, einschließlich mobiler Darstellung | Workshop-Vorschau im Editor; wiederverwendbar für künftige Workshop-Seiten |
| `app/workshop_creator/CSS/editor.css` | Eingabefelder und Schaltflächen zum Bearbeiten                     | Nur Editor                                                                 |
| `app/pages/home.css`                  | Banner, Beschreibung und Kurskarten                                | Nur Startseite                                                             |
| `app/assets/js/header.mjs`            | Gemeinsamer Seitenkopf und Navigationsziele                        | Startseite, Info, Kontakt, Editor                                          |
| `app/assets/js/dom.mjs`               | Wiederverwendbare DOM-Helfer                                       | Startseite und Editor                                                      |
| `app/assets/js/assets.mjs`            | URLs für das gemeinsame Logo und Platzhalterbild                   | Gemeinsamer Seitenkopf, Startseite und Editor                              |
| `app/assets/images/`                  | Eine Kopie des Logos und des Platzhalterbilds                      | Aktive Seiten und Editor                                                   |

Workshop-Styles sind auf `main.workshop-page` bzw. dessen Inhalte begrenzt.
Editor-Styles gelten nur innerhalb von `body.workshop-editor`. Neue Editor-UI
gehört in `editor.css`, neue Regeln für den Workshop-Inhalt in `workshop.css`.
Für optionale Layout-Hilfslinien kann der Editor-Body zusätzlich die Klasse
`debug-outline` erhalten. Beim bisherigen Export wird die Editor-Stylesheet-Verknüpfung
zusammen mit den Bearbeitungssteuerelementen entfernt.

Info und Kontakt behalten ihre bisherigen seitenspezifischen Inline-Styles.
Die bestehenden Exporte unter `app/workshops/` behalten ihre eigenen
Dateien bis zur späteren Umstellung des Exportverfahrens.

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
