# WCAG Audit Report — Dev Launcher Cards & UI

## Generated: 2026-05-09

## Source: /Volumes/Storage/Development/dev-launcher/frontend/src/

### CRITICAL (WCAG Level A — must fix)

| #   | Issue                                                                      | WCAG                               | File:Line               | Fix                                                      |
| --- | -------------------------------------------------------------------------- | ---------------------------------- | ----------------------- | -------------------------------------------------------- |
| 1   | Status dot uses **color only** to convey running/stopped state             | 1.4.1 Use of Color                 | AppCard.jsx:82          | Add `aria-label` and hidden text                         |
| 2   | Icon-only buttons missing `aria-label` (Terminal, Stop, GripVertical)      | 1.1.1 Non-text Content, 4.1.2 Name | AppCard.jsx:181,188,195 | Add `aria-label` to each                                 |
| 3   | App icon `<img alt="">` — decorative but no `role="presentation"`          | 1.1.1 Non-text Content             | AppCard.jsx:57          | Add `role="presentation"`                                |
| 4   | Sidebar collapse button has no accessible label                            | 4.1.2 Name                         | App.jsx:652             | Add `aria-label`                                         |
| 5   | Header search `<input>` has no `<label>` or `aria-label`                   | 1.3.1 Info and Relationships       | App.jsx:666             | Add `aria-label="Search apps"`                           |
| 6   | Sidebar nav "Dashboard" button has no accessible label beyond visible text | 2.4.4 Link Purpose                 | App.jsx:612             | Text content is sufficient but add `aria-current="page"` |

### SERIOUS (WCAG Level AA — should fix)

| #   | Issue                                                                   | WCAG                          | File:Line       | Fix                                                    |
| --- | ----------------------------------------------------------------------- | ----------------------------- | --------------- | ------------------------------------------------------ |
| 7   | Service status dots color-only (green/grey)                             | 1.4.1 Use of Color            | AppCard.jsx:131 | Add screen reader text                                 |
| 8   | Drag handle relies on `title` tooltip for instructions — not accessible | 2.5.5 Target Size, 4.1.2 Name | App.jsx:802     | Already has `aria-label` — OK but `title` is redundant |
| 9   | `autoFocus` on command palette input can trap screen readers            | 2.4.3 Focus Order             | App.jsx:896     | Add `role="dialog"` and `aria-modal="true"` to parent  |
| 10  | Command palette overlay has no `role="dialog"`                          | 4.1.2 Name, 2.4.3 Focus Order | App.jsx:887     | Add `role="dialog" aria-label="Command palette"`       |
| 11  | Shortcut help overlay has no `role="dialog"`                            | 4.1.2 Name                    | App.jsx:905     | Add `role="dialog" aria-label="Keyboard shortcuts"`    |
| 12  | Activity log `<aside>` has no accessible label                          | 4.1.2 Name                    | App.jsx:836     | Add `aria-label="Activity log"`                        |
| 13  | Toast region lacks clear semantics                                      | 4.1.3 Status Messages         | App.jsx:829     | Already has `aria-live="polite"` — OK                  |

### IMPROVEMENTS (Best practice)

| #   | Issue                                                 | File:Line       | Fix                                         |
| --- | ----------------------------------------------------- | --------------- | ------------------------------------------- |
| 14  | Running/stopped counts in stats cards use color alone | App.jsx:740-760 | Add visually hidden text                    |
| 15  | Filter buttons have no `aria-pressed` state           | App.jsx:714     | Add `aria-pressed={activeFilter === value}` |
| 16  | `disabled:opacity-30` may not meet 3:1 contrast       | App.jsx:687-690 | Increase disabled contrast                  |
| 17  | Stat cards have no `role="status"` or live region     | App.jsx:733     | Add `aria-live="polite"` to stats grid      |

### TOTAL FINDINGS: 17

### CRITICAL: 6 | SERIOUS: 7 | IMPROVEMENT: 4
