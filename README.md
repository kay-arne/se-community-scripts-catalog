# SE Community Scripts — catalog

The script definitions behind **Community Scripts** in the SE Toolbox: a
catalog of reusable labs and demo environments built by Fortinet SEs.

Each folder under [`scripts/`](scripts/) is one entry in the store:

```
scripts/fortigate-ot-lab/
├── script.json        ← name, description, requirements, install commands, …
├── 00-overview.jpg    ← optional screenshots, listed in script.json
└── …
```

The store reads this repository directly: a few minutes after a change is
merged into `main`, it shows up in the SE Toolbox. No redeploy needed.

> [!IMPORTANT]
> **This repository is public.** Never add customer names, internal hostnames
> or IP addresses, passwords, tokens or licence files — not in `script.json`
> and not in screenshots.

## Add or change a script

You don't need git or a code editor. Open **SE Toolbox → Community Scripts →
Contribute** and follow the steps: the script builder there fills in
`script.json` for you and opens the right page on GitHub. See
[CONTRIBUTING.md](CONTRIBUTING.md) for the same steps in short, and for
working with git directly.

Every pull request is checked automatically (**Validate scripts**) and
reviewed before it is merged.

## What's in here

| Path | |
|---|---|
| `scripts/<name>/script.json` | One script. The folder name is its URL. |
| `schema/script.schema.json` | The format of `script.json`. Generated from the store app — don't edit by hand. |
| `tools/validate.mjs` | The pull-request check. Run locally with `npm ci && npm run validate`. |
