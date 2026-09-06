# Configuration Guide

> **Superseded (2026-09-05).** The context file `config/pi-agent-nbg-design.yaml` this document describes was folded into `SKILL.md` and removed; every rule, default, palette token, template and asset path it held now lives there. The text below is kept as design history.

## Purpose
This guide defines the portable configuration and deterministic local setup process for using Pi Agent with the NBG presentation design-system context in this project.

The shared context file is:

- `config/pi-agent-nbg-design.yaml`

This YAML file is a Pi `@file` context bundle. It is not Pi native settings, and Pi does not parse it as structured runtime configuration. Pi includes its contents as prompt/context text.

## Configuration Sources and Priority

1. **Tracked shared context** — `config/pi-agent-nbg-design.yaml`
   - Defines project-root-relative design-system paths, presentation rules, NBG assets, approved defaults, and behavior constraints.
   - Must not contain machine-specific checkout roots, secrets, API keys, tokens, or expiring credentials.
2. **User prompt / deck-specific inputs**
   - Required per presentation: topic, target audience, and desired slide count or depth.
   - These values override generic context because they describe the requested deck.
3. **Approved YAML defaults**
   - `preferred_language`: default `en` when the user does not specify a language.
   - `final_output_format_or_delivery_target`: default `html` when the user does not specify an output format.
   - No other missing required value should be silently defaulted.
4. **External Pi login or environment-managed credentials**
   - Provider credentials must be supplied through Pi login or external environment/configuration mechanisms.
   - Do not store credentials in this repository's shared config or documentation.
5. **Local browser executable for screenshot automation and PDF export**
   - `scripts/screenshot-deck.mjs` and `scripts/export-pdf.mjs` look for Chrome/Chromium/Edge in this order: `--browser <path>` flag (authoritative; a non-executable path is an error), `NBG_BROWSER`, `CHROME_BIN`, `CHROME_PATH`, `BROWSER` environment variables, the standard macOS/Linux install locations, then `PATH`.
   - The project does not define a committed fallback browser path. With no browser found the scripts exit with code 3: screenshots are skipped in favour of `verify-deck.mjs --strict`; a PDF cannot be produced on that host and must be exported where a browser exists.
6. **Location of the skill's scripts for a delivered deck's rebuild script (`<deck>.rebuild.mjs`)**
   - The generated rebuild script looks the nbg-design `scripts/` directory up in this order: `--scripts <dir>` flag (authoritative), the `NBG_DESIGN_SCRIPTS` environment variable, then the directory recorded in the script when it was written (where the skill was at delivery time). The directory must hold `add-deck-menu.mjs`, `verify-deck.mjs`, `export-pdf.mjs` and `lib/`; otherwise the script exits 1 naming the source and the path. No other location is tried.
   - A recipient whose plugin is installed elsewhere sets `NBG_DESIGN_SCRIPTS` (or passes `--scripts`) to `<plugin>/skills/nbg-design/scripts`. The same variable is used by the development workspace's `html-editor` skill.

## Required Configuration Values

| Value | Required? | How to obtain / provide | Default |
|---|---:|---|---|
| Project root | Yes | The folder containing `config/`, `NBG-Design/`, `docs/`, `presentations/`, and `test_scripts/`. Run Pi commands from this folder. | None |
| Pi credentials / login | Yes for Pi usage | Configure through Pi login or supported external provider environment variables. | None |
| Presentation topic | Yes per deck | Provide in the Pi prompt. | None |
| Target audience | Yes per deck | Provide in the Pi prompt or answer when asked. | None |
| Slide count or depth | Yes per deck | Provide in the Pi prompt or answer when asked. | None |
| Preferred language | Optional | Provide in the Pi prompt (`en`, `gr`, or `bi`). | `en` |
| Output format / delivery target | Optional | Provide in the Pi prompt: `html`, `pdf` (exported from the HTML deck by `scripts/export-pdf.mjs`). PowerPoint is out of scope. | `html` |
| Browser executable path | Required only for automated screenshot capture and PDF export | `scripts/screenshot-deck.mjs` and `scripts/export-pdf.mjs` auto-detect Chrome/Chromium/Edge at the usual macOS/Linux locations and on `PATH`; override with `--browser <path>` or the `NBG_BROWSER` / `CHROME_BIN` environment variables. No committed fallback path. | None (auto-detect) |
| `NBG_DESIGN_SCRIPTS` (skill scripts directory) | Only when a delivered deck's `<deck>.rebuild.mjs` runs where the skill is not at the directory recorded in it | Set it (or pass `--scripts <dir>`) to the installed skill's `scripts/` directory — the one holding `add-deck-menu.mjs`, `verify-deck.mjs`, `export-pdf.mjs`. A directory without them is an error. | The directory recorded when the script was written |

## Deterministic Setup Process

Follow these steps on a new machine or after moving the project to a new folder.

1. **Obtain the project files**
   - Copy or clone the full project folder.
   - Ensure these folders/files are present:
     - `config/pi-agent-nbg-design.yaml`
     - `NBG-Design/`
     - `docs/`
     - `presentations/`
     - `test_scripts/`
2. **Install and configure Pi Agent outside this project**
   - Install Pi Agent according to the Pi installation instructions for the machine.
   - Complete Pi login or configure provider credentials externally.
   - Do not add credentials to `config/pi-agent-nbg-design.yaml`.
3. **Open a shell at the repository root**
   ```bash
   cd /path/to/nbg-theme-agent
   ```
4. **Validate required repository-relative files**
   - Confirm the files listed in the validation checklist below exist from the repository root.
5. **Run Pi with the portable context file**
   ```bash
   pi @config/pi-agent-nbg-design.yaml "Create a presentation about <topic> using the NBG-inspired design system."
   ```
6. **For one-shot outline/spec generation**
   ```bash
   pi -p @config/pi-agent-nbg-design.yaml "Create a presentation outline about <topic> using the NBG-inspired design system."
   ```
7. **For screenshot automation, supply local browser path explicitly**
   - Use the command template from `config/pi-agent-nbg-design.yaml`.
   - Replace `<browser-executable>` with the browser executable path for the current machine.
   - Build the `file://` URL from the current checkout location and the generated HTML path.

## Path Resolution Rules

- All project-internal paths in `config/pi-agent-nbg-design.yaml` are repository-root-relative.
- Pi resolves relative `@file` paths against the shell current working directory.
- Therefore, `pi @config/pi-agent-nbg-design.yaml ...` is deterministic only after `cd /path/to/nbg-theme-agent`.
- Pi does not automatically read nested file paths listed inside the YAML. They are context/instructions for the agent to inspect with tools when needed.
- Do not replace project paths with `${PROJECT_ROOT}` placeholders unless a future explicit wrapper expands them. Pi `@file` inclusion does not expand YAML variables.

## Validation Checklist

Run these checks from the repository root before using the config on a new machine.

### Required files and folders

Confirm these paths exist:

- `config/pi-agent-nbg-design.yaml`
- `NBG-Design/`
- `NBG-Design/NBG Design System.html`
- `NBG-Design/slide-templates.jsx`
- `NBG-Design/tweaks-panel.jsx`
- `NBG-Design/assets/logo-primary.png`
- `NBG-Design/assets/logo-knockout.png`
- `NBG-Design/assets/logo-small.png`
- `NBG-Design/assets/*.datauri.txt` (one per logo and photo)
- `scripts/embed-assets.mjs`, `scripts/verify-deck.mjs`, `scripts/screenshot-deck.mjs`, `scripts/export-pdf.mjs`, `scripts/add-deck-menu.mjs`
- `scripts/lib/find-browser.mjs`, `scripts/lib/cdp.mjs`, `scripts/lib/print-layout.js`, `scripts/lib/deck-menu.js`
- `test_scripts/screenshots/`

### Machine-specific path scan

The shared runtime/setup files should not contain checkout-specific machine roots such as macOS user-home roots, Linux home roots, temp checkout roots, or Windows drive-root paths for project-internal files.

Check these files:

- `config/pi-agent-nbg-design.yaml`
- `docs/design/project-design.md`
- `docs/design/project-functions.MD`
- `docs/design/configuration-guide.md`
- `Issues - Pending Items.md`

Historical reference artifacts under `docs/reference/`, `docs/research/`, and plan provenance sections may contain absolute paths for traceability. Those are not runtime portability blockers unless the project adopts a stricter documentation policy later.

### Expected success signals

- The required files/folders exist from the repository root.
- `config/pi-agent-nbg-design.yaml` does not contain the old local checkout path or any other committed project-root absolute path.
- Pi can include the context file when run from the repository root.
- The agent can inspect repository-relative NBG design-system files when generating a presentation.
- Screenshot outputs, when used, are saved under `test_scripts/screenshots/`.
- `node scripts/export-pdf.mjs <deck>.html` on a deck that passed `verify-deck.mjs --strict` prints `RESULT: PASS` with pages = slides and page box `1920x1080 px (20.00 x 11.25 in)`; `pdfinfo` reports `1440 x 810 pts` pages.

### Expected failure signals

- Running Pi from outside the repository root cannot resolve `@config/pi-agent-nbg-design.yaml`.
- Any required path above is missing.
- Shared runtime/setup files contain a machine-specific checkout root for project-internal files.
- A required deck input is missing and the agent silently guesses instead of asking.
- Browser screenshot automation or PDF export runs with a `--browser` path that is not executable (hard error), or no browser is found (exit 3).
- `export-pdf.mjs` reports more pages than slides or a slide box different from the page box — a slide sizing/overflow defect in the HTML; the deck must be fixed and re-exported, never patched with print CSS.

## Secret and Expiring Credential Handling

- Do not store API keys, tokens, Pi credentials, or expiring credentials in shared project files.
- Use Pi login or external environment/configuration mechanisms.
- If a future workflow documents expiring credentials, add an explicit expiration-date field or tracking item so renewal can be managed proactively.

## Open Decisions

- Confirm target operating systems for any future executable validation script: macOS only, macOS/Linux, or Windows too.
- Confirm whether documentation/checklist validation is sufficient or whether an executable script should be added under `test_scripts/`.
- Confirm whether `config/pi-agent-nbg-design.yaml` is only used through Pi CLI `@file` or also parsed by a custom Pi extension/workflow.
- Confirm whether screenshot automation should remain a manually adjusted command or use a future explicit local configuration mechanism.
