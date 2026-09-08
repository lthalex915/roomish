# Convert notes or a topic into Roomish JSON

You do **not** need an API key inside Roomish to make a lesson.

Use any chat you already have — ChatGPT, Claude, Gemini, Grok, DeepSeek, a school account, a local model. Paste the prompt below, add your notes or topic, copy the JSON it returns, and drop that JSON onto the **Shelf**. Roomish will play it.

This is the same lesson format Compose uses. The difference is you pick the chat, so you are not limited to one key or one host.

---

## Using guideline

1. Open this file on GitHub, or open `CONVERT.md` in the Roomish folder.
2. Copy **everything** inside the `<prompt>` tag in the box below — including the line that says `NOTES OR TOPIC`.
3. Paste it into a new chat.
4. Replace the text under `NOTES OR TOPIC:` with your material. You can paste:
   - a topic (“photosynthesis for year 8”)
   - lecture notes
   - a worksheet or Q&A list
   - a mix of the above
5. Change `Audience: beginner` if you want `intermediate` or `advanced`.
6. Send. If the reply **stops in the middle**, send: `Continue from the exact next character. Do not repeat. No extra commentary.`
7. Copy the JSON. If the chat wrapped it in ` ```json `, copy only the JSON (from the first `{` to the last `}`).
8. In Roomish, open **Shelf**. Paste into **Or paste JSON** and press **Import paste**. You can also save the text as a `.json` file and use **Choose a file**.
9. Open the lesson. File it under **Courses** if you want.

No key is stored. Roomish only reads the file on this device.

**If import fails.** The JSON must start with `{` and include `"schema_version": "1.0"` and `"service": "Roomish"`. Ask the chat: `Fix this into valid Roomish JSON only` and paste the error or the broken text.

**If the lesson looks thin.** Ask: `Add two more pages and mix in a fill and a matching question. Return the full JSON.`

**Do not** paste passwords, exam keys you must keep secret, or other people’s private notes into a public chat.

---

## Math in notes

Roomish renders math with MathJax. **Do not** wrap formulas in single dollar signs.

| Kind | Write this |
|---|---|
| Inline | `\( \mathbf{0} \)` |
| Display (own line) | `\[ E = mc^2 \]` |
| Money | `$100` (plain text) |

Existing files that still use `$...$` for math are converted on screen. New lessons should use `\(` `\)`.

MathJax is loaded with this config:

```html
<script>
window.MathJax = {
  tex: {
    inlineMath: [['\\(', '\\)']],
    displayMath: [['\\[', '\\]']],
    processEscapes: true
  },
  svg: { fontCache: 'global' }
};
</script>
<script id="MathJax-script" async src="https://cdn.jsdelivr.net/npm/mathjax@3/es5/tex-mml-chtml.js"></script>
```

---

## Ready-to-use prompt

Copy the block below. Paste it as the first message. Put your notes at the bottom.

````
<prompt>
You convert study notes or a topic into one Roomish lesson JSON.

Return ONLY valid JSON. No markdown fences around the whole payload. No commentary before or after.

Hard rules:
- schema_version must be "1.0"
- service must be "Roomish"
- room.id like "room-short-kebab"
- room.title: 3–8 words, max 80 characters
- room.slug: lowercase kebab-case, letters numbers hyphens only
- room.audience: beginner | intermediate | advanced
- room.estimated_minutes: integer 3–90
- 5 to 8 tasks unless the user asked otherwise
- 8 to 14 checks in total unless the user asked otherwise
- Mix question types. Prefer short gradeable answers.
- tasks[].id must be T1, T2, T3, … in order
- checks[].qid must be unique, like T1-Q1
- Each task teaches ONE idea in "teach", then asks
- teach, prompt, hint, explain may use Markdown
- Math: MathJax only. SINGLE DOLLAR SIGN ($ ... $) is STRICTLY PROHIBITED as a math delimiter. Use \\( ... \\) for inline math and \\[ ... \\] for display math. Literal currency such as $100 stays as text. Example: the zero vector \\(\\mathbf{0}\\).
- Code: markdown fences with a language tag inside the JSON strings (escaped newlines)
- Break teach into short paragraphs, lists, or a formula — not one giant paragraph
- If the user already pasted questions, keep their wording and answers
- Any subject is allowed. Do not invent CTF flags or hacking labs
- hint must not give away the canonical answer
- explain: 1–3 sentences after they check

Question types and fields:
- mcq: choices has at least 2 strings like "A) …"; answer is the full matching choice text; also put "A" and the letterless text in accepted
- select_all: choices at least 2; answer is the correct choices joined with ", "
- true_false: choices may be empty; answer is "True" or "False"; accepted includes "T"/"F" as appropriate
- short: one or a few words; accepted lists reasonable spellings
- fill: blanks array with {id, before, after}; answer is the missing token
- matching: pairs_left and pairs_right same length, at least 2; answer is "left => right; left => right"

Always include every field below, using [] or "" when unused.

Shape:
{
  "schema_version": "1.0",
  "service": "Roomish",
  "room": {
    "id": "room-example",
    "title": "Short lesson title",
    "slug": "short-lesson-title",
    "topic": "what this is about",
    "audience": "beginner",
    "estimated_minutes": 15,
    "language": "en",
    "learning_objectives": ["Verb-first objective"],
    "intro": "80–140 words, second person, what they will do.",
    "tags": ["subject"]
  },
  "tasks": [
    {
      "id": "T1",
      "title": "Page title",
      "teach": "Markdown notes for this page only.",
      "checks": [
        {
          "qid": "T1-Q1",
          "type": "mcq",
          "prompt": "The question",
          "stem_note": "",
          "choices": ["A) one", "B) two", "C) three", "D) four"],
          "blanks": [],
          "pairs_left": [],
          "pairs_right": [],
          "answer": "B) two",
          "accepted": ["B", "B) two", "two"],
          "case_sensitive": false,
          "points": 10,
          "hint": "A nudge, not the answer.",
          "explain": "Why B is right."
        }
      ]
    }
  ],
  "recap": {
    "key_terms": ["term: short gloss"],
    "common_mistakes": ["a mix-up to avoid"],
    "next_room_ideas": ["a sensible follow-up"]
  }
}

If your reply is cut off, wait for the user to say continue, then resume at the next character with no repeat.

Audience: beginner

NOTES OR TOPIC:
Paste the topic, lecture notes, or questions here.
</prompt>
````

---

## What Roomish does with the file

The JSON is a lesson, not a live website. Roomish is the player:

- **Shelf** stores the file on this device
- **Open** reads each page, then checks answers locally
- **Courses** files the lesson under Semester → Course → Chapter
- **Study coach** is optional and still needs a key if you want it

You can keep the `.json` file in a class folder, email it, or put it in a shared drive. Anyone with Roomish can import the same file.
