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

## Deploy to Cloud Run

The app ships as a Docker image (`Dockerfile`). Cloud Run builds it straight from source. These steps assume you use Vertex AI (ADC) on Cloud Run, so no API key is stored anywhere.

```bash
export PROJECT_ID=your-project-id
export REGION=us-central1
export APP_PASSWORD='choose-a-shared-password'

gcloud config set project $PROJECT_ID
gcloud services enable run.googleapis.com cloudbuild.googleapis.com artifactregistry.googleapis.com aiplatform.googleapis.com

# Service account the app runs as, allowed to call Vertex AI
gcloud iam service-accounts create brand-studio
gcloud projects add-iam-policy-binding $PROJECT_ID \
  --member="serviceAccount:brand-studio@$PROJECT_ID.iam.gserviceaccount.com" \
  --role="roles/aiplatform.user"

# Deploy from this folder
gcloud run deploy brand-studio --source . --region $REGION \
  --service-account brand-studio@$PROJECT_ID.iam.gserviceaccount.com \
  --allow-unauthenticated \
  --no-cpu-throttling --max-instances 1 --min-instances 1 \
  --memory 1Gi --timeout 900 \
  --set-env-vars "APP_PASSWORD=$APP_PASSWORD,GOOGLE_GENAI_USE_VERTEXAI=true,GOOGLE_CLOUD_PROJECT=$PROJECT_ID,GOOGLE_CLOUD_LOCATION=$REGION"
```

Open the printed URL. The browser asks for the password (any username).

Why these flags:

- `--no-cpu-throttling`: jobs keep running after the HTTP response returns. Without this, Cloud Run pauses the CPU between requests and video polling stalls.
- `--max-instances 1`: jobs and their progress live in SQLite on one instance. A second instance would not see them.
- `--min-instances 1`: scaling to zero would kill a video job in progress. This costs a small always-on fee.
- `--allow-unauthenticated` with `APP_PASSWORD`: the app's own password is the only gate. For stricter access, drop the flag and give people the `roles/run.invoker` role instead.

Limits on Cloud Run:

- Data lives in `/tmp` and is lost when the instance is replaced or redeployed. Gallery history and brands do not persist.
- Veo access and region availability depend on your project. Check the Vertex AI console for your project's access to the video model.
- Run `gcloud run services logs read brand-studio --region $REGION` to see errors.

To avoid storing the password as a plain env var, put it in Secret Manager and use `--set-secrets APP_PASSWORD=brand-studio-password:latest` instead.

## Using a Gemini API key instead

If you do not want Vertex AI, set `GEMINI_API_KEY` (preferably via `--set-secrets`) and leave `GOOGLE_GENAI_USE_VERTEXAI` unset.

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
- `npm test`: unit and end-to-end tests (prompt rendering, validation, job runner in mock mode, deletion). Uses a temporary data directory and needs no credentials.

Gallery runs can be deleted, which removes their output and reference files. Brand deletion does not affect past runs, which keep their own brand snapshot.

Generated data lives in `./data` (or `DATA_DIR`) and is git-ignored.
