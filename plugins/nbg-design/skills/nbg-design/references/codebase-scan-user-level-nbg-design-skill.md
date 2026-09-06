---
language:
  - YAML
  - Markdown
  - HTML
  - JavaScript/JSX
  - Python
framework:
  - Pi Agent context/skills
  - browser React/Babel templates
package_manager: none detected
build_command: not configured
test_command: not configured; ad hoc verification scripts exist under test_scripts/
lint_command: not configured
entry_points:
  - config/pi-agent-nbg-design.yaml
  - NBG-Design/NBG Design System.html
  - NBG-Design/slide-templates.jsx
  - NBG-Design/tweaks-panel.jsx
  - /Users/giorgosmarinos/.pi/agent/skills/<skill-slug>/SKILL.md
last_scanned_commit: "unavailable: repository has no resolved HEAD commit; branch main has uncommitted/untracked project files"
scanned_for_request: /Users/giorgosmarinos/contentwork/nbg-theme-agent/docs/reference/refined-request-user-level-nbg-design-skill.md
scanned_at: "2026-06-05T05:12:09Z"
---

# Codebase Scan: User-Level NBG Design Skill

## Summary

The requested user-level skill is not currently installed: `/Users/giorgosmarinos/.pi/agent/skills/nbg-design/` does not exist. The project already contains the source material needed to package it: a Pi context YAML, an NBG design-system folder, guardrail documentation, and project convention files.

This is a lightweight design/configuration repository rather than a packaged application. No `package.json`, `pyproject.toml`, `requirements.txt`, `go.mod`, or `Cargo.toml` was detected at depth 3, so build/lint/test commands are not centrally configured.

## Module Map

| Area | Key paths | Purpose |
|---|---|---|
| Project instructions | `AGENTS.md` | Project conventions, including docs/reference and skill-development documentation rules. |
| Pi presentation context | `config/pi-agent-nbg-design.yaml` | Canonical NBG presentation-generation context, required paths, defaults, asset list, and guardrails. |
| NBG design system | `NBG-Design/NBG Design System.html`, `NBG-Design/slide-templates.jsx`, `NBG-Design/tweaks-panel.jsx` | Human-readable design system, React slide templates, and reusable tweak UI helpers. |
| Brand assets | `NBG-Design/assets/` | Logos and NBG photography referenced by templates/config. |
| Visual references | `NBG-Design/screenshots/` | Presentation screenshots and newsletter/email screenshots; only presentation screenshots are in scope by default. |
| Project documentation | `docs/design/project-design.md`, `docs/design/project-functions.MD`, `docs/design/configuration-guide.md`, `Issues - Pending Items.md` | Current design decisions, functional requirements, setup/path semantics, and approved defaults/exceptions. |
| Generated outputs | `presentations/`, `test_scripts/screenshots/` | Prior generated decks and verification artifacts; useful provenance/examples, but not required for the skill unless explicitly selected. |
| Local user skill example | `/Users/giorgosmarinos/.pi/agent/skills/deep-dive-creator/SKILL.md` | Confirms the user-level skill root and frontmatter shape used locally. |

## Conventions and Evidence

- `config/pi-agent-nbg-design.yaml:16-30` currently assumes repository-root-relative paths and repository-root execution for `@config/...` usage. The skill must adapt this so bundled resources resolve from the installed skill folder instead of the project root.
- `config/pi-agent-nbg-design.yaml:75-78` identifies the core design-system files: `NBG-Design/`, `NBG Design System.html`, `slide-templates.jsx`, and `tweaks-panel.jsx`.
- `config/pi-agent-nbg-design.yaml:114-131` lists required logos, photos, and presentation screenshots.
- `config/pi-agent-nbg-design.yaml:231-257` instructs agents to inspect design-system files, use assets, treat screenshots as visual references, and run quality checks.
- `config/pi-agent-nbg-design.yaml:259-266` explicitly excludes newsletter/email prototype folders and screenshot patterns by default.
- `config/pi-agent-nbg-design.yaml:268-276` records the missing-information policy and the only approved defaults (`en`, `html`).
- `docs/design/project-design.md:8-25` documents that the YAML is context text, not native Pi settings, and that Pi does not automatically read nested references.
- `docs/design/configuration-guide.md:79-84` documents current path-resolution limitations that the user-level skill should remove or rewrite for skill portability.
- `/Users/giorgosmarinos/.pi/agent/skills/deep-dive-creator/SKILL.md:1-5` shows local Pi skill frontmatter format with `name` and `description`.

## Integration Points

### In-Scope

| Path | Classification | Why it matters for `NBG Design` skill |
|---|---|---|
| `config/pi-agent-nbg-design.yaml` | Copy/adapt | Canonical source of NBG presentation behavior, assets, templates, defaults, and guardrails. Must be made skill-relative or summarized safely. |
| `NBG-Design/NBG Design System.html` | Copy | Main design-system reference; includes palette, typography, layout documentation, and template previews. |
| `NBG-Design/slide-templates.jsx` | Copy | Defines reusable 1920×1080 NBG slide templates and references `assets/...` paths, so copy with matching relative asset layout or rewrite references. |
| `NBG-Design/tweaks-panel.jsx` | Copy | Reusable tweak/edit-mode helpers used by prototypes/templates; include if skill expects agents to inspect or reuse template host behavior. |
| `NBG-Design/assets/logo-primary.png` | Copy | Primary logo used by templates and brand references. |
| `NBG-Design/assets/logo-knockout.png` | Copy | Knockout logo used in dark/accent slides. |
| `NBG-Design/assets/logo-small.png` | Copy | Small footer/logo mark referenced by `slide-templates.jsx`. |
| `NBG-Design/assets/photo-fields.jpeg`, `photo-heart.jpeg`, `photo-parthenon.jpeg`, `photo-skate.jpeg`, `photo-street.jpeg` | Copy | NBG photography referenced in config/templates and useful for covers/dividers. |
| `NBG-Design/screenshots/01-editorial.png`, `01b-editorial-prog.png`, `01c-editorial-end.png`, `02-bold.png`, `03-report.png`, `03b-report-mid.png`, `03c-report-learn.png`, `03d-report-end.png` | Copy or include selected subset | These are the presentation screenshots explicitly listed in config as visual references. |
| `docs/design/project-design.md` | Reference/summarize | Contains design decisions and guardrails to preserve; copy only if useful as provenance, otherwise summarize in `SKILL.md`. |
| `docs/design/project-functions.MD` | Reference/summarize | Functional requirements define current behavior; useful for validating skill instructions. |
| `docs/design/configuration-guide.md` | Reference/adapt | Documents current repository-root path semantics; downstream skill should adapt away from original repository-root coupling. |
| `Issues - Pending Items.md` | Reference | Contains approved defaults/exceptions and open questions; do not copy wholesale into skill unless provenance is desired. |
| `/Users/giorgosmarinos/.pi/agent/skills/deep-dive-creator/SKILL.md` | Reference only | Local example confirming user-level skill root and valid frontmatter style. Do not modify. |

### Out-of-Scope

| Path | Reason |
|---|---|
| `.git/`, `.venv/`, `__pycache__/`, `.DS_Store` | Disallowed metadata, virtual environment, cache, and local OS artifacts. |
| `NBG-Design/newsletter/`, `NBG-Design/nbg-gpt/`, `NBG-Design/notebooklm/` | Explicitly out of scope by default in `config/pi-agent-nbg-design.yaml`; include only if user later requests newsletter/email prototypes. |
| `NBG-Design/screenshots/email-*.png`, `gpt-*.png`, `lm-*.png`, `train-email-*.png` | Email/newsletter visual references, excluded by current config default. |
| `NBG-Design/uploads/NBG-GPT_May2026.docx`, `NotebookLM Enterprise_ v2.docx`, `AI_Trainings_Newsletter.md` | Source uploads for adjacent newsletter/prototype work, not required for the reusable presentation design skill by default. |
| `test_scripts/` and `test_scripts/screenshots/` | Verification scripts/artifacts for prior deliverables, not part of the skill package unless downstream adds validation tooling. |
| `docs/reference/codebase-scan-*`, `refined-request-*`, visual verification docs | Workflow provenance; keep in project reference docs, not in the user-level skill package unless a small provenance note is desired. |
| Secrets/provider credentials/Pi login data/browser executable paths | No secrets detected in scanned project files, but these must not be copied or hardcoded into the skill. |

### New Integration Points

| Target | Needed action |
|---|---|
| `/Users/giorgosmarinos/.pi/agent/skills/nbg-design/` | Create/update the user-level Pi skill folder. It does not currently exist. |
| `/Users/giorgosmarinos/.pi/agent/skills/nbg-design/SKILL.md` | Create valid Pi skill frontmatter (`name: nbg-design`, user-facing title in body/description) and instructions preserving current NBG behavior. |
| `/Users/giorgosmarinos/.pi/agent/skills/nbg-design/config/pi-agent-nbg-design.yaml` | Optional copied/adapted config. If included, rewrite repository-root-only wording and resource references so they are skill-internal. |
| `/Users/giorgosmarinos/.pi/agent/skills/nbg-design/NBG-Design/` | Recommended bundled resource layout if preserving existing relative references like `assets/logo-primary.png` inside templates. |
| Skill validation documentation under project docs | If implementation proceeds, document included/excluded files, path-portability checks, and validation results per project conventions. |
| Dedicated skill-development docs folder | Project instructions require a `[skill-name]-docs` folder when creating/changing a skill in project context; likely `nbg-design-docs/` if downstream implementation documents skill development artifacts. |

## Duplication Check

- Existing project-level NBG presentation context is partially implemented in `config/pi-agent-nbg-design.yaml` and `NBG-Design/**`.
- No existing user-level `nbg-design` skill package was found under `/Users/giorgosmarinos/.pi/agent/skills/`.
- Downstream work should package/adapt the existing implementation, not create a parallel design system or new visual language.

## Recommended Packaging Boundary

Minimum self-contained skill content should include:

1. `SKILL.md` with Pi-compatible frontmatter and portable instructions.
2. `config/pi-agent-nbg-design.yaml` adapted for skill-relative resource resolution, or equivalent instructions embedded in `SKILL.md`.
3. `NBG-Design/NBG Design System.html`.
4. `NBG-Design/slide-templates.jsx`.
5. `NBG-Design/tweaks-panel.jsx`.
6. `NBG-Design/assets/logo-*.png` and all five `photo-*.jpeg` files.
7. Presentation screenshots listed by the config (`01*`, `02-bold`, `03*`) as visual references.

Avoid copying the whole repository. Keep generated presentations and newsletter/email prototypes out unless the user explicitly expands scope.

## Open Risks / Questions for Downstream Planning

- Confirm whether `docs/design/*` should be copied into the skill as provenance or summarized in `SKILL.md` to avoid project-doc bloat.
- If copied YAML remains machine/project-root coupled, downstream must rewrite it before validation; current repository-root wording is not portable from arbitrary working directories.
- If future synchronization is expected, consider a documented copy/update process, but no script/tool exists today.
