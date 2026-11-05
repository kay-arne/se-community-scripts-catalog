# Contributing a script

Thanks for sharing! A script here is a **description** of something you built
and published elsewhere: the lab itself (its installer and code) lives in your
own public repository; this catalog only holds the page about it.

## Before you start

- A free **GitHub account** — <https://github.com/signup>.
- Your lab in a **public** GitHub repository, installable with one command
  that you tested on a fresh host, e.g.
  `bash -c "$(curl -fsSL https://raw.githubusercontent.com/<you>/<repo>/main/install.sh)"`.
- Optional: a few screenshots (PNG or JPG, under 3 MB each, nothing
  customer-related on them).

## The easy way: the script builder (no git needed)

1. In the SE Toolbox open **Community Scripts → Contribute → Open the script
   builder** and fill in the form. The preview shows the page as it will look.
2. Click **Copy & open GitHub**. GitHub opens a new file
   `scripts/<name>/script.json` in this repository.
3. If GitHub asks, click **Fork this repository** (your own copy to propose
   changes from). If the editor is empty, click in it and paste
   (<kbd>Ctrl</kbd>/<kbd>⌘</kbd>+<kbd>V</kbd>).
4. Click **Commit changes…** → **Propose changes** → **Create pull request** →
   **Create pull request**.
5. Screenshots: on your pull request, click your branch name (`<you>:patch-1`),
   open `scripts/<name>/`, choose **Add file → Upload files**, drop the images
   and commit to the same branch. File names must match what you entered in
   the builder.
6. Wait for the **Validate scripts** check. ✅ means a maintainer can merge it;
   ❌ — click **Details** for what to fix.

To change an existing script, use **Suggest a change** on its page in the
store; it opens the builder with the current content.

## With git

```bash
git clone https://github.com/<you>/se-community-scripts-catalog.git   # your fork
cd se-community-scripts-catalog
mkdir scripts/my-lab && $EDITOR scripts/my-lab/script.json
npm ci && npm run validate
```

Start `script.json` with `"$schema": "../../schema/script.schema.json"` and
editors like VS Code autocomplete every field and explain it on hover. Text
fields support `` `code` `` and `**bold**`. Then open a pull request.

`schema/script.schema.json` is generated from the store app
(`npm run schema` there); changes to the format start in that repository.
