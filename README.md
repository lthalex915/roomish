# Roomish — a paper notebook of short lessons

Roomish turns a topic or a pile of notes into a short guided lesson. You read a page, then answer. It is **not** a hacking platform and is not affiliated with TryHackMe or any CTF site.

Quizzes, answers, course folders, and your API key live in a **local database on your device**. There is no Roomish account.

---

## Download and install

### What you need

1. A computer (Windows, Mac, or Linux).
2. **Node.js 22** (20+ is fine) from [nodejs.org](https://nodejs.org) — choose LTS, then reopen the terminal.

### From GitHub

```bash
git clone https://github.com/lthalex915/roomish.git
cd roomish
npm install
npm run dev
```

Open the address the terminal prints (usually `http://localhost:8080`).

### From a zip

1. Unzip the file.
2. Open a terminal in that folder.
3. Run `npm install`, then `npm run dev`.

Stop later with `Ctrl+C`.

The `.gitignore` file keeps `node_modules`, `.env`, build folders, and logs off GitHub. **Never commit an API key.**

---

## Update without losing lessons

Your quizzes, answers, courses, and API key live in **this browser**, not in the GitHub folder. Updating the code does not wipe them.

1. Open a terminal in the `roomish` folder you already cloned.
2. Save any lesson you care about as JSON (open it, or copy from Compose) if you want a backup file.
3. Run:

```bash
git pull
npm install
npm run dev
```

4. Open the **same browser** and the **same address** you used before (for example `http://localhost:8080`).

Stay on that address. A different port, a different computer, or a private window is a blank library.

**Do not** delete the `roomish` folder unless you have JSON backups. **Do not** use the browser’s “Clear site data” / “Clear cookies” for this site if you want to keep progress.

If `git pull` complains about local edits, copy your JSON files somewhere safe, then ask for help or stash those edits before pulling again.

---

## What you can do

1. **Shelf** — every lesson on this device.
2. **Courses** — Semester → Course → Chapter → Lesson.
3. **Open a lesson** — read a page, answer, press **Check**.
4. **Compose** — paste a topic or notes. AI writes a lesson file. Needs a key.
5. **Study coach** — press **Ask coach** on a question, then talk on the right. Needs a key.
6. **Import JSON** — drop in a Roomish file. No AI needed.

To make a lesson **without** putting an API key in Roomish, use any chat you like and paste the result onto the Shelf. Full steps and a copy-paste prompt: **[CONVERT.md](CONVERT.md)**.

Math uses TeX (`$E=mc^2$` or `$$...$$`). Code uses Markdown fences. Notes sit as ordinary reading, not one big grey box.

---

## Optional AI (coach + Compose)

You bring a key from OpenRouter, OpenAI, DeepSeek, xAI, or an OpenAI-compatible host. Paste it under **Keys**. It stays in the local database on this device.

| Provider | Key page |
|---|---|
| OpenRouter | [openrouter.ai/keys](https://openrouter.ai/keys) |
| OpenAI | [platform.openai.com/api-keys](https://platform.openai.com/api-keys) |
| DeepSeek | [platform.deepseek.com/api_keys](https://platform.deepseek.com/api_keys) |
| xAI | [console.x.ai](https://console.x.ai) |

Treat the key like a password.

---

## Privacy

Lessons, answers, course folders, and your API key stay on **this device**. Compose and the coach send the text you typed to the provider you chose. Do not paste secrets into notes you convert.

Clearing this site’s data in the browser wipes the local database.
