# Factory entities

Only files in the four entity subfolders are indexed by the Software Factory. This README is not an entity.

```text
features/   FEAT-*
bugs/       BUG-*
stories/    STORY-*
diagrams/   ERD-* / DIAG-*
```

Use `../templates/entity.md`. Keep one entity per file. Use the YAML
frontmatter contract exactly. Link deeper prose specs by path in the body.

Do not put long-form specs, meeting notes, session logs, or archived material
here. Those belong elsewhere in `spec/`.

`threads/` holds grooming conversations and is not indexed.
