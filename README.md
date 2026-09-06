# NBG Design

NBG Design - Claude Code plugin marketplace. It ships the `nbg-design` plugin: a presentation design
system for HTML slides inspired by the brand image of the National Bank of Greece (NBG), with the in-deck
editor, the AI assistant, PDF export and the per-deck rebuild script.

## Installation

The marketplace is distributed from the public repository
[BikS2013-coding-agents/nbg-design](https://github.com/BikS2013-coding-agents/nbg-design). Add it to
Claude Code and install the plugin:

```bash
/plugin marketplace add BikS2013-coding-agents/nbg-design
/plugin install nbg-design@nbg-design
```

The marketplace identifier (the part after `@`) is `nbg-design`, as declared in
`.claude-plugin/marketplace.json`.

## Available Plugins

See the `plugins/` directory for available plugins. For a guided tour of the `nbg-design` plugin, open
[The nbg-design skill — explained](https://biks2013-presentations.github.io/deck-work-nbgdesign/), a
38-slide deck built with the skill itself (HTML with the in-browser editor, PDF, and five standalone
diagrams of how the skill works).

## Development

This repository is a published snapshot: it holds the marketplace and its plugins, nothing else. Development,
release and mirroring happen in the `nbg-design-skill-dev` workspace, which checks this repository out as a
submodule and pushes each release here as one commit. Installations made earlier as `nbg-design@aihub-skills`
must be re-added under the identifier `nbg-design`.

## License

MIT

---

Managed with [manage-marketplaces](https://github.com/anthropics/claude-code) skill.
