# Workshop content model

Specification, version 1. Adopted 17 September 2026.

This document defines the data format of a workshop: the JSON document, the media files it
references, and the rules a document must satisfy to be saved, published and built. The
implementing module is `app/assets/js/workshop-schema.mjs`; the build tooling under `tools/`
enforces the rules that require access to the file system.

## 1. Scope and terms

- A **workshop** is one folder containing a **document** (`workshop.json`) and its **assets**
  (images and downloadable files).
- A document consists of **core fields** at the root and an ordered list of **sections**.
  A section holds structured **fields** and an ordered list of **subsections**. A subsection
  holds an ordered list of **blocks**. Blocks are the unit of author-composed content.
- A document is either a **draft** or **published**. Drafts may be incomplete; published
  documents must satisfy the publish rules in section 9.
- The words _must_, _must not_ and _may_ are normative.
- The JSON examples in this document are abbreviated illustrations of shape. They are not
  valid documents and are not validation fixtures; the fixtures accompany the
  implementing module.

## 2. Storage layout

```
app/workshops/<slug>/
├── workshop.json
├── thumbnail.jpg
├── images/        images referenced by the document
└── files/         downloadable files referenced by the document
```

Every asset path in a document is relative to the workshop folder and must not leave it.
The folder name is the document's `slug`.

## 3. Principles

- **Data, not markup.** Text is stored as plain strings. Newlines are permitted. HTML is
  never stored and never interpreted.
- **Two layers.** Core fields carry the information the site needs for listing, filtering
  and fixed layouts. Everything else is content composed from a closed set of block types.
  Whether a subsection holds text, images, a quotation, a list or a combination is the
  author's choice.
- **Structure and requirement are separate.** A field may be structured without being
  required. Which values must be present for publishing is stated in the tables below.
- **Empty means absent.** Where a value may be empty, an empty value is valid data; the
  renderer omits what is empty. Types are enforced regardless.
- **Labels are not data.** Fixed labels of the layout (for example "Durchführungsort") are
  defined by the renderer. The document stores values only.
- **Keys are English ASCII camelCase.** German text appears only in values.
- **Meaning is carried by `kind` and `type`, never by titles.** Titles are editable text.

## 4. Document

```json
{
  "schemaVersion": 1,
  "slug": "aliens",
  "published": true,
  "title": "Al(l)iens – wir sind alle anders!",
  "teaser": "Eine Reise durch die Dimensionen der Vielfalt.",
  "thumbnail": { "src": "thumbnail.jpg", "alt": "Schüler*innen im Stuhlkreis" },
  "slogan": "Wir sind alle anders!",
  "subject": "SK",
  "gradeRange": { "min": 5, "max": 10 },
  "tags": ["vielfalt", "identität"],
  "moreInfoUrl": "https://www.hs-duesseldorf.de/…",
  "sections": []
}
```

| field         | type             | rules                                                 | required for publish |
| ------------- | ---------------- | ----------------------------------------------------- | -------------------- |
| schemaVersion | integer          | equals the version this specification describes       | always               |
| slug          | string           | `^[a-z0-9]+(-[a-z0-9]+)*$`; equals the folder name    | always               |
| published     | boolean          |                                                       | always               |
| title         | string           |                                                       | yes                  |
| teaser        | string           | one or two sentences for the course card              | yes                  |
| thumbnail     | image            | `src` is a bare file name in the folder root          | yes                  |
| slogan        | string           |                                                       | no                   |
| subject       | string           | a value of the subject vocabulary, or `""`            | no                   |
| gradeRange    | object or `null` | `{ "min": integer, "max": integer }` with `min ≤ max` | no                   |
| tags          | string[]         |                                                       | no                   |
| moreInfoUrl   | string           | external URL (section 8) or `""`                      | no                   |
| sections      | section[]        | section 5                                             | always               |

`gradeRange: null` means _not specified_. A range covering the whole scale, for example
`{ "min": 1, "max": 13 }`, means _all grades_. The two are distinct (section 10).

The subject vocabulary is a short controlled list defined by the implementing module. It
may be extended without a version change. Values are used for the badge on course cards.

## 5. Sections

```json
{
  "id": "5c2b…",
  "kind": "teachers",
  "title": "Für Lehrende",
  "fields": {},
  "subsections": []
}
```

| field       | type         | rules                                                                                          |
| ----------- | ------------ | ---------------------------------------------------------------------------------------------- |
| id          | identifier   | section 8                                                                                      |
| kind        | string       | `overview`, `instructions`, `materials`, `teachers`, `impressions`, `contributors` or `custom` |
| title       | string       |                                                                                                |
| fields      | object       | shape determined by `kind`; `{}` for kinds without fields                                      |
| subsections | subsection[] |                                                                                                |

- `sections` is ordered. Array order is display order and navigation order. Navigation
  numbering is derived from position and is not stored.
- A document contains exactly one section of each non-custom kind and any number of
  `custom` sections. Custom sections are additional; they do not replace a required kind.
- Sections may appear in any order.

Fields by kind:

| kind            | fields                                                                                                                 |
| --------------- | ---------------------------------------------------------------------------------------------------------------------- |
| overview        | `heroImage`: image; `facts`: object with string members `location`, `groupSize`, `topics`, `prerequisites`, `duration` |
| teachers        | `quote`: `{ "text": string, "author": string }`; `facts`: object with string members `schoolTypes`, `requirements`     |
| all other kinds | `{}`                                                                                                                   |

## 6. Subsections

```json
{
  "id": "9f1a…",
  "kind": "learningContent",
  "title": "Lerninhalt",
  "blocks": []
}
```

| field  | type       | rules                                               |
| ------ | ---------- | --------------------------------------------------- |
| id     | identifier | section 8                                           |
| kind   | string     | a kind permitted by the parent section, or `custom` |
| title  | string     |                                                     |
| blocks | block[]    |                                                     |

The kinds permitted in a section depend on the section's kind. Each permitted kind appears
at most once per section. `custom` subsections may appear any number of times in any
section. Materials categories are subsections: a further category is a `custom`
subsection of the `materials` section.

| section kind | subsection kind | default block | required for publish | checklist   |
| ------------ | --------------- | ------------- | -------------------- | ----------- |
| overview     | description     | quote, text   | yes                  |             |
| instructions | intro           | text          | no                   |             |
| instructions | schedule        | phases        | no                   | recommended |
| materials    | documents       | file          | no                   |             |
| materials    | resources       | link          | no                   |             |
| teachers     | learningContent | text          | no                   | recommended |
| teachers     | competencies    | list          | no                   |             |
| teachers     | curriculum      | text          | no                   |             |
| impressions  | highlights      | gallery       | no                   |             |
| impressions  | gallery         | gallery       | no                   |             |
| contributors | people          | people        | no                   |             |

- _Default block_ is the block a new document contains in that subsection (section 11).
  It is a starting point, not a constraint: any block type is permitted in any subsection.
- _Required for publish_: the subsection must exist and contain at least one filled block.
- _Checklist_: the editor's completeness checklist lists these subsections while they are
  empty. This is guidance, not validation.

## 7. Blocks

```json
{
  "id": "c0de…",
  "type": "image",
  "src": "images/aufbau.jpg",
  "alt": "Versuchsaufbau",
  "caption": "",
  "width": "full"
}
```

Every block has an `id` (section 8) and a `type`. The type list is closed; adding a type
requires a new schema version.

| type    | fields                                                                                               | filled when                                |
| ------- | ---------------------------------------------------------------------------------------------------- | ------------------------------------------ |
| text    | `text`: string                                                                                       | `text` is non-blank                        |
| image   | `src`: asset path; `alt`, `caption`: string; `width`                                                 | `src` is set                               |
| gallery | `images`: array of `{ src, alt, caption, width }`                                                    | at least one image has `src`               |
| quote   | `text`, `author`: string                                                                             | `text` is non-blank                        |
| list    | `items`: string[]                                                                                    | at least one item is non-blank             |
| link    | `label`: string; `url`: external URL                                                                 | `url` is set                               |
| file    | `label`: string; `file`: asset path                                                                  | `file` is set                              |
| phases  | `phases`: array of `{ title, steps }`; step: `{ title, duration, description, method }`, all strings | at least one step has a non-blank `title`  |
| people  | `people`: array of `{ image, name, description }`; `image`: `{ src, alt }`                           | at least one person has a non-blank `name` |

_Non-blank_ means non-empty after trimming whitespace. _Set_ means a non-empty string.

## 8. Value types

- **identifier**: an opaque, non-empty string, unique among all identifiers in the
  document. Producers generate UUIDs. Identifiers are stable across reordering, renaming,
  export and import.
- **image**: `{ "src": asset path, "alt": string }`, with `caption` (string) and `width`
  where the containing block defines them. The rules for asset paths and for `alt` apply
  to every image value wherever it appears: `thumbnail`, `heroImage`, image blocks,
  gallery images and person images.
- **width**: one of `third`, `twoThirds`, `full`. Presentation classes are never stored.
- **asset path**: `images/<name>` for every image except the thumbnail, `files/<name>`
  for downloads, and `<name>` alone for `thumbnail.src`, where `<name>` matches
  `^[a-z0-9][a-z0-9._-]*\.[a-z0-9]+$`. An asset path therefore contains at most one
  slash and never a `.` or `..` segment, a leading `/`, a backslash, a percent sign, a
  scheme or whitespace. Producers normalise file names to this form. Resolved against
  the workshop folder, every asset path stays inside it; the build tooling verifies the
  resolved path in addition to the grammar.
- **external URL**: an absolute URL with the scheme `http` or `https`. Never relative.
- **string**: any string; empty where section 9 permits.

## 9. Validation

`validateWorkshop(document, { mode })` returns a list of errors, each with the path of the
offending value (for example `sections[3].subsections[0].blocks[2].alt`). An empty list
means the document is valid in that mode.

### 9.1 Draft mode

Valid when all of the following hold:

- every section, subsection and block has an identifier, and all identifiers in the
  document are unique;
- every `kind` and `type` is a known value permitted in its position; each non-custom
  section kind occurs exactly once; each permitted subsection kind occurs at most once
  within its section;
- every value has its declared type; objects contain exactly their declared members;
- every set `url` and `moreInfoUrl` is an external URL; every set asset path satisfies
  section 8; `width` is a permitted value; `subject` is in the vocabulary or empty;
  `gradeRange` is `null` or satisfies section 4.

Emptiness is permitted only as follows:

| value                                                                                                  | may be empty in a draft |
| ------------------------------------------------------------------------------------------------------ | ----------------------- |
| slug                                                                                                   | `""`                    |
| title, teaser, slogan, moreInfoUrl; all string fields of blocks, facts and quotes                      | `""`                    |
| `src` of any image (thumbnail, heroImage, image blocks, gallery images, person images), `file`, `url`  | `""`                    |
| tags, items, images, phases, steps, people, subsections, blocks                                        | `[]`                    |
| `alt` and `caption` of every image (thumbnail, heroImage, image blocks, gallery images, person images) | `""`                    |
| gradeRange                                                                                             | `null`                  |

Identifiers, `kind`, `type`, `width`, `published` and `schemaVersion` are never empty.

### 9.2 Publish mode

Valid when draft mode holds and additionally:

- `slug` is set and satisfies its pattern;
- `title` and `teaser` are non-blank; `thumbnail.src` is set;
- every `custom` section and every `custom` subsection that contains a filled block has
  a non-blank `title`; sections and subsections of a defined kind fall back to the
  kind's default title when their `title` is blank (sections 10 and 11);
- every subsection marked _required for publish_ exists and contains at least one filled
  block;
- every image with a set `src`, wherever it appears (section 8), has a non-blank `alt`,
  with exactly two exceptions: `overview.fields.heroImage` and `thumbnail`, whose
  accessible name is the workshop title, may have an empty `alt`. No other image is
  decorative.

### 9.3 Build checks

The build tooling, running with file-system access, additionally verifies for every
workshop folder:

- the folder name equals `slug`;
- every referenced asset path, resolved against the workshop folder, lies inside the
  folder and exists;
- a document with `published: true` is valid in publish mode; any other document is valid
  in draft mode;
- the workshop index is regenerated from the folders present.

The shared validator never accesses the file system. An export produced by the editor must
include a file for every referenced asset path and must use a valid slug, because the slug
names the folder.

## 10. Presentation rules with data semantics

- Empty blocks, empty subsections and empty optional fields are not rendered.
- A section is _non-empty_ when at least one of its subsections contains a filled block,
  or when its `fields` carry content: for `overview`, a `heroImage` with a set `src` or a
  non-blank fact; for `teachers`, a non-blank `quote.text` or a non-blank fact. An `alt`
  text alone or a quote `author` alone is not content. Any other section is _empty_.
  Empty sections are not rendered and do not appear in the navigation. Navigation numbers
  are assigned to the rendered sections in document order, so they are contiguous. The
  editor shows every section regardless.
- A section or subsection of a defined kind whose `title` is blank is rendered with the
  kind's default title (section 11).
- A link renders `label`, or the URL without its scheme when `label` is empty. A file
  renders `label`, or the file's base name when `label` is empty. A rendered link is never
  empty.
- `gradeRange: null` renders no grade information; such a workshop is listed only while no
  grade filter is active. A range covering the whole scale may be rendered as
  "alle Klassenstufen".
- `width` maps to the renderer's column classes; `third` and `twoThirds` occupy one and
  two of three columns, `full` occupies the row.

## 11. New documents

A new document, as produced by `createEmptyWorkshop()`:

- `schemaVersion` equals the current version; `published` is `false`; `slug` and all root
  strings are empty; `thumbnail` has an empty `src` and `alt`; `gradeRange` is `null`;
  `tags` is empty;
- `sections` contains the six non-custom kinds in the order overview, instructions,
  materials, teachers, impressions, contributors, each with its default title and empty
  `fields` values;
- every subsection of section 6 exists in its section, with its default title and its
  default block, all values empty and every `width` set to `full`.

Default titles, also used as rendering fallbacks (section 10):

| kind            | default title              |
| --------------- | -------------------------- |
| overview        | Übersicht                  |
| instructions    | Anleitung                  |
| materials       | Materialien                |
| teachers        | Für Lehrende               |
| impressions     | Impressionen               |
| contributors    | Ansprechpartner            |
| description     | Beschreibung               |
| intro           | Einführung                 |
| schedule        | Ablauf                     |
| documents       | Unterlagen                 |
| resources       | Ressourcen                 |
| learningContent | Lerninhalt                 |
| competencies    | Weiterführende Kompetenzen |
| curriculum      | Lehrplanbezug              |
| highlights      | Eindrücke                  |
| gallery         | Bildergalerie              |
| people          | Beteiligte                 |

The tables of sections 5, 6 and 11 are the single definition used by the factory, the
validator and the renderer.

## 12. Versioning

- `SCHEMA_VERSION` is `1`.
- `migrate(document)` returns a document of the current version. For a document whose
  `schemaVersion` is already current it returns the document unchanged. For any
  unsupported version it throws. Import and build call `migrate` before validation.
- Adding an optional field or a block type is a new version with a migration case that
  fills defaults.
- Renaming or removing a field is a new version with a migration case that rewrites older
  documents.
