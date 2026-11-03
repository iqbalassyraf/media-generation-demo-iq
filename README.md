# Brand Studio — media generation demo

A small brand-aware studio for generating images and short videos. A **Brand kit** (name, colors, fonts, tone, words to use or avoid, product notes, logo) is injected into every prompt. **Workflows** are preset recipes that turn a brief into one or more outputs. The **Studio** runs them, and the **Gallery** keeps the history.

Built with Next.js (App Router), TypeScript, Tailwind, SQLite (`node:sqlite`), and the Google GenAI SDK (Gemini for images, Veo for video).

## Run it

Requires Node 22.13+ (for the built-in `node:sqlite`).

```bash
npm install
cp .env.example .env.local   # fill in credentials, or leave empty for mock mode
npm run dev                  # http://localhost:3000
```

With no credentials set, the app runs in **mock mode**: outputs are branded SVG placeholders that show the brand colors and the prompt sent. Every flow works offline, which is useful for demos without quota.

## Connecting Gemini

Pick one:

- **Gemini Developer API:** set `GEMINI_API_KEY`.
- **Vertex AI with Application Default Credentials:** set `GOOGLE_GENAI_USE_VERTEXAI=true`, `GOOGLE_CLOUD_PROJECT`, and `GOOGLE_CLOUD_LOCATION`, then run `gcloud auth application-default login`.

Force a provider with `MEDIA_PROVIDER=gemini` or `MEDIA_PROVIDER=mock`. Model IDs come from `IMAGE_MODEL` and `VIDEO_MODEL`. Check the defaults in `.env.example` against models your account has access to.

## Workflows

Defined in `src/lib/workflows.ts` as data: ordered steps, each with a prompt template and aspect ratio.

| Workflow | Inputs | Steps |
|---|---|---|
| Product hero image | subject, mood, optional product photo | 1 image, 16:9 |
| Social post set | core message, call-to-action theme | 1:1 feed, 9:16 story, 16:9 landscape |
| Short product video | shot description, optional starting frame | 1 video, 16:9, 6 s |

Placeholders: `{{brand}}` expands to the brand block; `{{input_key}}` to an input value. To add a workflow, add an entry to the array.

## How it fits together

```
UI (Studio / Brand kit / Gallery)
  → /api/brands, /api/workflows, /api/jobs, /api/files
    → engine.ts: renders prompts from brand + workflow + inputs, runs steps in order
      → MediaProvider interface
          ├─ GeminiProvider  (generateContent for images, Veo for video, polled)
          └─ MockProvider    (branded SVG placeholders)
      → SQLite (brands, jobs) + data/outputs (files)
```

- Each job stores a **snapshot of the brand** used, so results stay traceable after brand edits.
- Jobs run in-process and the client polls for progress. Jobs in flight when the server restarts are marked failed.
- Video generation is asynchronous: the runner polls the operation every `VIDEO_POLL_MS` (default 10 s) for up to `VIDEO_TIMEOUT_MS` (default 15 min).

## Limits (by design, for a demo)

- No authentication. Single user, single machine.
- Reference images are capped at 8 MB; logos at 1 MB.
- Runs are not queued across processes. Concurrency is whatever the Node process allows.
- No brand-compliance checking. The brand block steers the model; it does not verify output.

## Scripts

- `npm run dev`: development server
- `npm run build` / `npm start`: production build and server
- `npm run typecheck`: TypeScript check

Generated data lives in `./data` (or `DATA_DIR`) and is git-ignored.
