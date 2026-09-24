# HSD_Schuelerlabore

## Setup

Node.js ab Version 20.19 und npm installieren, dann im Projektordner ausführen:

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
├── workshops.json     Generierte Liste der veröffentlichten Workshops
├── assets/            Gemeinsame Styles, Skripte, Bilder und die Hausschrift HSD Sans
├── pages/             Skripte der öffentlichen Seiten und Startseiten-CSS
├── workshop_creator/  Editor-Code und Editor-CSS
├── workshops/         Ein Ordner je Workshop: workshop.json, Vorschaubild, images/, files/
└── .nojekyll           Deaktiviert Jekyll bei GitHub-Pages-Branch-Publishing
```

Die Pfade funktionieren auch, wenn der Webroot unter einem Unterpfad wie
`/schuelerlabore/` veröffentlicht wird. `.nojekyll` hat auf einem normalen
statischen Webserver keine Funktion; sie konfiguriert auch keine Veröffentlichung.

Workshops sind unter `workshops/<ordner>/` erreichbar. Frühere Adressen
(`workshops/<Ordner>/Workshop.html`, `schülerlabore/`) wurden ohne Weiterleitung ersetzt.
Ordner- und Dateinamen sind klein geschrieben und enthalten keine Umlaute.

## Gemeinsame Dateien und Editor-UI

Gemeinsame Gestaltung und Bilder liegen in `app/assets/`. Seitenspezifische
Styles bleiben bei der jeweiligen Seite:

| Datei                                 | Aufgabe                                                            | Verwendet von                                 |
| ------------------------------------- | ------------------------------------------------------------------ | --------------------------------------------- |
| `app/assets/css/base.css`             | Farben, Schrift, Grundregeln und Seitenkopf                        | Startseite, Info, Kontakt, Editor             |
| `app/assets/css/workshop.css`         | Workshop-Inhalt und Navigation, einschließlich mobiler Darstellung | Workshop-Seite, Vorschau und Editor           |
| `app/workshop_creator/CSS/editor.css` | Eingabefelder und Schaltflächen zum Bearbeiten                     | Nur Editor                                    |
| `app/pages/home.css`                  | Banner, Beschreibung und Kurskarten                                | Nur Startseite                                |
| `app/assets/js/header.mjs`            | Gemeinsamer Seitenkopf und Navigationsziele                        | Startseite, Info, Kontakt, Editor             |
| `app/assets/js/dom.mjs`               | Wiederverwendbare DOM-Helfer                                       | Startseite und Editor                         |
| `app/assets/js/assets.mjs`            | URLs für das gemeinsame Logo und Platzhalterbild                   | Gemeinsamer Seitenkopf, Startseite und Editor |
| `app/assets/images/`                  | Eine Kopie des Logos und des Platzhalterbilds                      | Aktive Seiten und Editor                      |

Workshop-Styles sind auf `main.workshop-page` begrenzt, Editor-Styles auf
`body.workshop-editor`. Neue Editor-UI gehört in `editor.css`, neue Regeln für den
Workshop-Inhalt in `workshop.css`. Info und Kontakt behalten ihre Inline-Styles.

## Vorschau und Test-Fixtures

`preview.html?id=<ordner>` rendert `workshops/<ordner>/workshop.json` schreibgeschützt mit dem
gemeinsamen Renderer (`app/assets/js/renderer/`). Die Beispiel-Dokumente für Tests und den
Editor liegen in `app/workshops/_fixtures/`, zum Beispiel
<http://localhost:5500/preview.html?id=_fixtures/example-complete>. Ordner, die mit `_`
beginnen, gelten als Entwicklungsinhalt und werden nie im Workshop-Index geführt.

`serve.json` beschränkt die URL-Umschreibung des Entwicklungsservers auf `/` und
`workshops/`, damit Abfrageparameter wie `?id=` auf den übrigen Seiten erhalten bleiben; die
Datei gehört nicht zum Webroot. Wer den Server zuvor mit
Umschreibung genutzt hat, hat in seinem Browser dauerhafte Weiterleitungen (301) von
`…/seite.html` auf `…/seite` gespeichert; einmalig die Website-Daten für `localhost:5500`
löschen (Entwicklerwerkzeuge → Anwendung → „Website-Daten löschen“), dann laden die
`.html`-Adressen wieder direkt.

## Workshop speichern, weiterbearbeiten, veröffentlichen

1. <http://localhost:5500/creator.html> öffnen und den Workshop anlegen: Texte direkt auf der
   Seite, Bilder und Dateien über „Bild wählen“ bzw. „Datei wählen“, alles Weitere unter
   „Einstellungen“. Die Leiste „Prüfung“ zeigt, was noch fehlt. Nach der Bildauswahl lässt sich
   das Bild zuschneiden und drehen; gespeichert wird eine verkleinerte Kopie (längste Seite
   1600 px) ohne Kamera-Metadaten. „Zuschneiden“ öffnet den Dialog später erneut.
2. „Entwurf speichern“ lädt den aktuellen Stand als `<ordnername>.zip` herunter, auch wenn
   noch Angaben fehlen (ohne Titel als `entwurf.zip`). Mit Haken bei „Im Kursangebot
   aufführen“ heißt die Schaltfläche „Workshop speichern“ und speichert nur, wenn die
   Veröffentlichungsprüfung besteht.
3. Zum Weiterbearbeiten die ZIP-Datei entpacken und den Ordner mit „Workshop-Ordner laden“
   öffnen. Ausgewählte Dateien liegen sonst nur im Browser-Tab und gehen beim Neuladen verloren.
4. Zum Veröffentlichen den entpackten Ordner nach `app/workshops/` legen und ausführen:

   ```sh
   npm run build:workshops
   ```

   Das Skript prüft alle Ordner (Ordnername gleich Slug, alle Dateien vorhanden, gültiges
   Dokument). Für veröffentlichte Workshops schreibt es `app/workshops.json` für die Startseite
   und je Ordner eine `index.html` mit Titel, Beschreibung und Vorschaubild für Suchmaschinen
   und Link-Vorschauen; den Inhalt rendert weiterhin der gemeinsame Renderer. Beide Dateien nie
   von Hand bearbeiten. Entwürfe werden geprüft, aber weder aufgeführt noch mit einer
   `index.html` versehen; sie lassen sich mit `preview.html?id=<ordner>` ansehen. `npm test`
   schlägt fehl, wenn eine generierte Datei veraltet ist.

Das Format beschreibt `docs/workshop-schema.md`. „Beispiel laden“ im Editor öffnet einen
vollständigen Beispiel-Workshop mit allen Blocktypen. Vor dem Laden eines Beispiels oder
Ordners fragt der Editor nach, wenn der aktuelle Stand nicht gespeichert ist.

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
