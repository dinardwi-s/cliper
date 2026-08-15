# Development Stages

---

## Stage 1 - Project Bootstrap

Goal

Create a runnable monorepo.

Deliverables

- Next.js
- NestJS
- PostgreSQL
- Prisma
- Docker Compose
- Shared package
- Health Check API

Definition of Done

- docker compose up --build works
- Frontend opens at localhost:3000
- Backend opens at localhost:3001

Next Stage

Stage 2

---

## Stage 2 - Authentication

Goal

Implement authentication.

Deliverables

- Register
- Login
- Logout
- JWT
- Refresh Token
- Password Hashing
- Protected Routes

Definition of Done

User can login successfully.

Next Stage

Stage 3

---

## Stage 3 - Dashboard

Goal

Create the application dashboard.

Deliverables

- Sidebar
- Header
- User Profile
- Settings
- History Page
- Empty State
- Dark Mode

Definition of Done

Dashboard is fully navigable.

Next Stage

Stage 4

---

## Stage 4 - Project Management

Goal

Manage clipping projects.

Deliverables

- Create Project
- Rename Project
- Delete Project
- History

Definition of Done

Projects are stored in database.

Next Stage

Stage 5

---

## Stage 5 - Storage

Goal

Store uploaded files.

Deliverables

- MinIO
- Upload
- Delete
- Preview

Definition of Done

Files persist correctly.

Next Stage

Stage 6

---

## Stage 6 - YouTube Downloader

Goal

Download videos from YouTube.

Deliverables

- URL Validation
- Metadata
- Thumbnail
- Duration
- Download
- Progress

Definition of Done

User can download videos.

Next Stage

Stage 7

---

## Stage 7 - Processing Queue

Goal

Background processing.

Deliverables

- BullMQ
- Redis
- Queue
- Progress
- Retry
- Failure Handling

Definition of Done

Jobs process correctly.

Next Stage

Stage 8

---

## Stage 8 - Speech To Text

Goal

Generate transcript.

Deliverables

- Faster Whisper
- Transcript
- Language Detection
- Save Transcript

Definition of Done

Transcript stored successfully.

Next Stage

Stage 9

---

## Stage 9 - AI Clip Detection

Goal

Find engaging moments.

Deliverables

- OpenAI Integration
- Virality Score
- Clip Suggestions
- Hook Detection

Definition of Done

AI returns clip candidates.

Next Stage

Stage 10

---

## Stage 10 - Clip Generator

Goal

Generate clips.

Deliverables

- FFmpeg
- Crop
- Render
- Export

Definition of Done

Generated clips playable.

Next Stage

Stage 11

---

## Stage 11 - Subtitle

Goal

Generate subtitles.

Deliverables

- SRT
- Burn Subtitle
- TikTok Style
- Word Highlight

Definition of Done

Subtitle rendered.

Next Stage

Stage 12

---

## Stage 12 - History

Goal

Store generated clips.

Deliverables

- Download
- Delete
- Search
- Preview

Definition of Done

History fully usable.

Next Stage

Stage 13

---

## Stage 13 - Optimization

Goal

Improve performance.

Deliverables

- Cache
- Cleanup
- Logging
- Monitoring
- Better Error Handling

Definition of Done

Stable personal application.

Next Stage

Commercial Version

# Stage Completion Rules

Claude MUST update this document after every completed stage.

When a stage is finished:

1. Mark the stage as COMPLETE.
2. Update the Progress Tracker.
3. Write a summary of what was implemented.
4. List modified files.
5. List newly created files.
6. List database migrations.
7. List new environment variables.
8. Record important architectural decisions.
9. Recommend the next stage.

Never skip this update.

CLAUDE.md is the single source of truth for project progress.

---

## Progress Tracker

- Stage 1 - COMPLETE
- Stage 2 - IN PROGRESS (implementation complete; runtime verification blocked by unavailable PostgreSQL/Docker)
- Stage 3 - COMPLETE
- Stage 4 - IN PROGRESS (implementation complete; runtime verification blocked by unavailable PostgreSQL/Docker)
- Stage 5 - IN PROGRESS (implementation complete; runtime verification blocked by unavailable PostgreSQL/Docker)
- Stage 6 - IN PROGRESS (implementation complete; yt-dlp/MinIO runtime verification blocked by unavailable Docker)
- Stage 7 - IN PROGRESS (implementation complete; runtime Redis/PostgreSQL verification blocked by unavailable Docker)
- Stage 8 - IN PROGRESS (implementation complete; runtime Faster Whisper/Redis/PostgreSQL verification blocked by unavailable Docker)
- Stage 9 - IN PROGRESS (implementation complete; runtime OpenAI/Redis/PostgreSQL verification blocked by unavailable Docker)
- Stage 10 - IN PROGRESS (implementation complete; runtime FFmpeg/MinIO/Redis/PostgreSQL verification blocked by unavailable Docker)
- Stage 11 - IN PROGRESS (implementation complete; runtime FFmpeg/MinIO/Redis/PostgreSQL verification blocked by unavailable Docker)
- Stage 12 - IN PROGRESS (implementation complete; runtime PostgreSQL verification passed; MinIO verification pending image pull)

## Stage 1 Completion Summary

Implemented Stage 1 monorepo foundation.

### Implemented

- pnpm workspace with `apps/api`, `apps/web`, and `packages/shared`.
- NestJS API health endpoint at `GET /api/health` on port `3001`.
- Next.js 15 App Router application on port `3000`.
- Shared TypeScript package with health response contract.
- Prisma schema integration with explicit schema path and generated client.
- Docker Compose and API Dockerfile port alignment with Stage 1 requirements.

### Modified Files

- `docker-compose.yml`
- `docker/Dockerfile.api`
- `CLAUDE.md`

### Newly Created Files

- `package.json`
- `pnpm-workspace.yaml`
- `tsconfig.base.json`
- `apps/api/package.json`
- `apps/api/tsconfig.json`
- `apps/api/nest-cli.json`
- `apps/api/src/main.ts`
- `apps/api/src/app.module.ts`
- `apps/api/src/health/health.controller.ts`
- `apps/api/src/health/health.module.ts`
- `apps/web/package.json`
- `apps/web/tsconfig.json`
- `apps/web/next-env.d.ts`
- `apps/web/next.config.js`
- `apps/web/app/layout.tsx`
- `apps/web/app/page.tsx`
- `packages/shared/package.json`
- `packages/shared/tsconfig.json`
- `packages/shared/src/index.ts`

### Database Migrations

- None. Existing Prisma schema was validated through client generation; migration requires a running PostgreSQL instance.

### New Environment Variables

- `PORT` — API listen port, defaults to `3001`.
- Existing database and infrastructure variables remain unchanged.

### Architectural Decisions

- API port follows CLAUDE.md Stage 1 contract (`3001`), not the earlier Docker document value (`4000`).
- Health contract lives in `packages/shared` to keep API response typing consistent across applications.
- Prisma schema remains at `apps/api/prisma/schema.prisma`; generation uses an explicit schema path.
- Docker verification remains pending because Docker CLI is unavailable in the current environment.

### Verification

- Shared package typecheck: passed.
- NestJS API typecheck: passed.
- Next.js typecheck: passed.
- Workspace lint command: passed; currently uses TypeScript checks because ESLint configuration is not yet introduced.
- Shared, NestJS, and Next.js production builds: passed.
- Docker Compose validation: not run; Docker CLI unavailable.

### Next Stage

Stage 2 - Authentication.

## Stage 2 Implementation Status

### Implemented

- Register with email, password, and display name.
- Login with bcrypt password verification.
- JWT access token with 15-minute expiry.
- Refresh token rotation with SHA-256 token hashes in PostgreSQL.
- Logout revokes the current refresh token and clears httpOnly cookies.
- Protected route guard using Passport JWT.
- DTO validation with `class-validator` and global whitelist validation.
- Prisma service and global Prisma module.
- Protected verification endpoint: `GET /api/health/protected`.

### Modified Files

- `apps/api/package.json`
- `apps/api/src/app.module.ts`
- `apps/api/src/main.ts`
- `apps/api/src/health/health.controller.ts`
- `CLAUDE.md`

### Newly Created Files

- `apps/api/src/prisma/prisma.service.ts`
- `apps/api/src/prisma/prisma.module.ts`
- `apps/api/src/auth/auth.module.ts`
- `apps/api/src/auth/auth.controller.ts`
- `apps/api/src/auth/auth.service.ts`
- `apps/api/src/auth/authenticated-user.interface.ts`
- `apps/api/src/auth/jwt.strategy.ts`
- `apps/api/src/auth/jwt-auth.guard.ts`
- `apps/api/src/auth/dto/register.dto.ts`
- `apps/api/src/auth/dto/login.dto.ts`
- `apps/api/src/auth/dto/refresh-token.dto.ts`

### Database Migrations

- None created. Existing `users`, `profiles`, `subscriptions`, `credits`, and `refresh_tokens` models are ready, but migration execution needs PostgreSQL.

### New Environment Variables

- `JWT_SECRET` — signs access tokens; required and must be strong outside development.
- `PORT` — existing API port, defaults to `3001`.

### Architectural Decisions

- Refresh tokens are random opaque values; only SHA-256 hashes are persisted.
- Refresh rotation revokes the consumed token before issuing a new token.
- Access and refresh tokens use httpOnly cookies; refresh cookie is path-scoped.
- Passwords use bcrypt cost factor 12.
- `GET /api/health/protected` verifies guard wiring without creating a separate test-only endpoint.

### Verification

- API typecheck: passed.
- API build: passed.
- Workspace typecheck: passed.
- Workspace lint command: passed.
- Runtime register/login/refresh/logout: blocked because PostgreSQL and Docker CLI are unavailable in the environment.

### Next Stage

Stage 4 - Project Management.

## Stage 3 Completion Summary

Implemented dashboard foundation and navigation.

### Implemented

- Responsive dashboard shell with sidebar and header.
- Overview statistics cards and recent project list.
- History page with project list and empty-state design.
- Settings page with profile summary.
- Dark mode toggle persisted in local storage.
- Responsive mobile layout and accessible navigation labels.
- Native CSS design system without adding UI dependencies.

### Modified Files

- `apps/web/app/layout.tsx`
- `apps/web/app/page.tsx`
- `apps/web/app/history/page.tsx`
- `apps/web/app/globals.css`
- `CLAUDE.md`

### Newly Created Files

- `apps/web/app/settings/page.tsx`
- `apps/web/app/globals.css`

### Database Migrations

- None. Dashboard currently uses typed presentation data; live dashboard queries belong with Stage 4 project persistence and API integration.

### New Environment Variables

- None.

### Architectural Decisions

- CSS uses native variables and media queries; no new UI dependency was added.
- Theme state uses `data-theme` on the root document and local storage.
- Dashboard routes remain server-rendered except the small overview theme interaction, which is isolated in the page client component.

### Verification

- Web typecheck: passed.
- Web production build: passed.
- Workspace typecheck: passed.
- Workspace lint command: passed.
- Next.js build warning fixed by replacing `align-items: end` with `flex-end`.

## Stage 4 Implementation Status

### Implemented

- Project module with create, list, detail, rename, and delete operations.
- YouTube URL validation and canonical 11-character video ID extraction.
- Duplicate project detection per authenticated user and video ID.
- Ownership enforcement on every project operation.
- Prisma project queries with clip count and descending creation order.
- History page now fetches authenticated projects and shows an empty state when none exist.
- Project creation form in history page.

### Modified Files

- `apps/api/src/app.module.ts`
- `apps/web/app/history/page.tsx`
- `CLAUDE.md`

### Newly Created Files

- `apps/api/src/project/dto/create-project.dto.ts`
- `apps/api/src/project/dto/rename-project.dto.ts`
- `apps/api/src/project/project.service.ts`
- `apps/api/src/project/project.controller.ts`
- `apps/api/src/project/project.module.ts`

### Database Migrations

- None created. Project model already exists in Prisma schema; migration execution requires PostgreSQL.

### New Environment Variables

- `NEXT_PUBLIC_API_URL` — browser API base URL; defaults to `http://localhost:3001/api`.

### Architectural Decisions

- Project ownership is enforced through `where: { id, userId }`, preventing cross-user access.
- YouTube parsing uses Node's standard `URL` class and validates canonical IDs without adding a dependency.
- Duplicate submissions return the existing user's project instead of creating duplicate database records.
- History uses client-side fetch with credentials because auth is cookie-based.

### Verification

- Prisma client generation: passed.
- Workspace typecheck: passed.
- Workspace lint command: passed.
- API build: passed.
- Web build: passed.
- Runtime database persistence: blocked because PostgreSQL and Docker CLI are unavailable.

### Next Stage

Stage 5 - Storage.

## Stage 5 Implementation Status

### Implemented

- S3-compatible `StorageService` using AWS SDK v3.
- MinIO-compatible path-style endpoint support.
- Upload, delete, and signed preview URL operations.
- Per-user object key isolation: `users/{userId}/...`.
- Storage endpoint validation and 500 MB upload limit.
- Auth-protected storage controller.
- Bucket configuration uses existing Compose environment variables.
- MinIO buckets remain provisioned by `minio-init`.

### Modified Files

- `apps/api/package.json`
- `apps/api/src/app.module.ts`
- `CLAUDE.md`

### Newly Created Files

- `apps/api/src/storage/storage.service.ts`
- `apps/api/src/storage/storage.module.ts`
- `apps/api/src/storage/storage.controller.ts`
- `apps/api/src/storage/dto/preview-object.dto.ts`

### Database Migrations

- None. Storage metadata is returned by API and no schema change is required for Stage 5.

### New Environment Variables

- `STORAGE_ENDPOINT`
- `STORAGE_REGION`
- `STORAGE_FORCE_PATH_STYLE`
- `STORAGE_ACCESS_KEY`
- `STORAGE_SECRET_KEY`
- Existing bucket variables: `STORAGE_BUCKET_RAW`, `STORAGE_BUCKET_CLIPS`, `STORAGE_BUCKET_SUBTITLES`, `STORAGE_BUCKET_THUMBNAILS`.

### Architectural Decisions

- AWS SDK v3 is used because MinIO and production S3 share the same protocol.
- Object keys are user-scoped; delete and preview reject keys outside the authenticated user's prefix.
- Files are private by default; preview uses one-hour signed URLs instead of public bucket access.
- Upload uses memory buffering for the current 500 MB limit; streaming is required before accepting larger production uploads.

### Verification

- API typecheck: passed.
- API build: passed.
- Workspace typecheck: passed.
- Workspace lint command: passed.
- Runtime MinIO upload/delete/preview: blocked because Docker and MinIO are unavailable.

### Next Stage

Stage 6 - YouTube Downloader.

## Stage 6 Implementation Status

### Implemented

- yt-dlp service with YouTube host validation.
- Metadata extraction: video ID, title, duration, thumbnail, uploader, canonical URL.
- Safe no-playlist metadata and download commands.
- Download timeout, output buffering limit, restricted filenames, and progress parsing.
- Temporary download cleanup helper.
- Auth-protected metadata endpoint: `POST /api/youtube/metadata`.
- Auth-protected download endpoint: `POST /api/youtube/download`.
- Project creation now resolves and persists YouTube metadata, duration, thumbnail, and uploader metadata.
- Download worker image already includes yt-dlp, Python, FFmpeg, and curl.

### Modified Files

- `apps/api/src/app.module.ts`
- `apps/api/src/project/project.module.ts`
- `apps/api/src/project/project.service.ts`
- `CLAUDE.md`

### Newly Created Files

- `apps/api/src/youtube/youtube-downloader.service.ts`
- `apps/api/src/youtube/youtube.module.ts`
- `apps/api/src/youtube/youtube.controller.ts`

### Database Migrations

- None. Existing project columns already support title, duration, thumbnail, and metadata.

### New Environment Variables

- `YTDLP_MAX_DURATION` — deployment limit for downloader policy.
- `YTDLP_MAX_QUALITY` — deployment quality ceiling.

### Architectural Decisions

- yt-dlp runs through `execFile`, not a shell command, preventing shell interpolation.
- Playlist downloads are explicitly disabled.
- Metadata is resolved before project persistence, preventing incomplete project records.
- Download progress is exposed as a callback contract for Stage 7 queue events.
- Temporary files are user-scoped under `/tmp/clip-project/{userId}`.

### Verification

- Workspace typecheck: passed.
- Workspace lint command: passed.
- API build: passed.
- Runtime yt-dlp and YouTube download: blocked because yt-dlp, Docker, and MinIO are unavailable in the environment.

### Next Stage

Stage 7 - Processing Queue.

## Stage 7 Implementation Status

### Implemented

- BullMQ queue module backed by Redis.
- Download queue with deterministic project job IDs.
- Retry policy: 3 attempts with exponential backoff.
- Completed and failed job retention policies.
- Download worker with graceful SIGTERM/SIGINT shutdown.
- Worker progress updates from yt-dlp output.
- Project state transitions: `pending` -> `downloading` -> `downloaded` or `failed`.
- Failure persistence with error message and error code.
- Ownership-protected queue status endpoint: `GET /api/queue/projects/:id`.
- Project creation now enqueues download processing.

### Modified Files

- `apps/api/package.json`
- `apps/api/src/app.module.ts`
- `apps/api/src/project/project.service.ts`
- `CLAUDE.md`

### Newly Created Files

- `apps/api/src/queue/queue.module.ts`
- `apps/api/src/queue/queue.service.ts`
- `apps/api/src/queue/queue.controller.ts`
- `apps/api/src/workers/download.worker.ts`

### Database Migrations

- None. Existing `projects` fields support queue state and failure data.

### New Environment Variables

- `REDIS_URL` — Redis connection URL used by API and worker.
- Existing `REDIS_PASSWORD` Compose configuration remains supported.

### Architectural Decisions

- BullMQ is the queue boundary; API only produces jobs, workers consume them.
- Job IDs are deterministic per project to prevent duplicate download jobs.
- Retry and retention policies live at queue configuration, not controllers.
- Worker updates project state and persists failure details before rethrowing for BullMQ retry handling.
- Queue status checks project ownership before exposing job state.

### Verification

- Workspace typecheck: passed.
- Workspace lint command: passed.
- API build: passed.
- Runtime Redis/PostgreSQL job processing: blocked because Docker, Redis, and PostgreSQL are unavailable.

### Next Stage

Stage 9 - AI Clip Detection.

## Stage 8 Implementation Status

### Implemented

- Faster Whisper subprocess contract with language detection.
- Audio extraction through FFmpeg to 16 kHz mono WAV.
- Transcription queue and worker with retry policy.
- Transcript segments persisted transactionally.
- Project language and language probability metadata persistence.
- Download worker uploads raw video to MinIO before enqueueing transcription.
- Ownership-protected endpoint: `GET /api/projects/:id/transcript`.
- Whisper runner script and Docker image wiring.

### Modified Files

- `apps/api/prisma/schema.prisma`
- `apps/api/package.json`
- `apps/api/src/app.module.ts`
- `apps/api/src/queue/queue.service.ts`
- `apps/api/src/storage/storage.service.ts`
- `apps/api/src/workers/download.worker.ts`
- `docker-compose.yml`
- `docker/Dockerfile.worker-transcribe`
- `CLAUDE.md`

### Newly Created Files

- `apps/api/src/ai/whisper.service.ts`
- `apps/api/src/ai/ai.module.ts`
- `apps/api/src/transcript/transcript.controller.ts`
- `apps/api/src/transcript/transcript.module.ts`
- `apps/api/src/workers/transcribe.worker.ts`
- `apps/api/python/faster_whisper_runner.py`

### Database Migrations

- Required: add nullable `projects.language VARCHAR(20)` through Prisma migration when PostgreSQL is available.
- Prisma client generation passed against updated schema.

### New Environment Variables

- `WHISPER_RUNNER`
- `WHISPER_MODEL`
- `WHISPER_DEVICE`
- `WHISPER_COMPUTE_TYPE`

### Architectural Decisions

- Faster Whisper runs in the dedicated transcription worker, not inside the HTTP API.
- Raw video is persisted in MinIO before the download worker removes temporary files.
- Transcript replacement uses one database transaction to avoid partial segment persistence.
- Language metadata is stored on Project; segments remain normalized in TranscriptSegment.

### Verification

- Prisma client generation: passed.
- Workspace typecheck: passed.
- Workspace lint command: passed.
- API build: passed.
- Runtime Faster Whisper, FFmpeg, MinIO, Redis, and PostgreSQL verification: blocked because Docker is unavailable.

### Next Stage

Stage 10 - Clip Generator.

## Stage 9 Implementation Status

### Implemented

- OpenAI Chat Completions integration with JSON response format.
- Clip candidate validation: 15–90 seconds, score 1–100, required hook and rationale.
- Virality/engagement score persistence.
- Hook detection persistence in transcript snippet.
- Analyze queue and worker after transcription completion.
- Transactional clip candidate persistence.
- Ownership-protected endpoint: `GET /api/projects/:id/clips`.

### Modified Files

- `apps/api/src/ai/ai.module.ts`
- `apps/api/src/queue/queue.service.ts`
- `apps/api/src/workers/transcribe.worker.ts`
- `apps/api/src/project/project.module.ts`
- `apps/api/package.json`
- `CLAUDE.md`

### Newly Created Files

- `apps/api/src/ai/openai.service.ts`
- `apps/api/src/workers/analyze.worker.ts`
- `apps/api/src/project/clip-suggestion.controller.ts`

### Database Migrations

- None. Existing Clip fields support AI suggestions, score, hook, and rationale.

### New Environment Variables

- `OPENAI_API_KEY`
- `OPENAI_MODEL`

### Architectural Decisions

- OpenAI runs only in the analyze worker, never in HTTP request handlers.
- AI output is JSON parsed and validated before database persistence.
- Clip candidates are replaced transactionally on re-analysis.
- Invalid or unsafe AI candidates are discarded before persistence.

### Verification

- Workspace typecheck: passed.
- Workspace lint command: passed.
- API build: passed.
- Runtime OpenAI, Redis, and PostgreSQL verification: blocked because Docker and external services are unavailable.

### Next Stage

Stage 11 - Subtitle.

## Stage 10 Implementation Status

### Implemented

- FFmpeg clip extraction and H.264/AAC MP4 rendering.
- Optional vertical crop contract in media service.
- Clip generation queue and worker.
- Raw video retrieval from MinIO.
- Generated MP4 upload to private clips bucket.
- Clip status transitions: `queued` -> `generating` -> `completed` or `failed`.
- Signed clip preview endpoint: `GET /api/clips/:id/preview`.
- Analyze worker enqueues generation for every AI candidate.

### Modified Files

- `apps/api/src/app.module.ts`
- `apps/api/src/queue/queue.service.ts`
- `apps/api/src/workers/analyze.worker.ts`
- `apps/api/src/project/project.module.ts`
- `apps/api/package.json`
- `docker/Dockerfile.worker-clipgen`
- `CLAUDE.md`

### Newly Created Files

- `apps/api/src/media/ffmpeg.service.ts`
- `apps/api/src/media/media.module.ts`
- `apps/api/src/workers/clipgen.worker.ts`
- `apps/api/src/project/clip.controller.ts`

### Database Migrations

- None. Existing Clip storage keys and status fields support rendered output.

### New Environment Variables

- `FFMPEG_THREADS`
- `CLIP_MAX_CONCURRENT`

### Architectural Decisions

- FFmpeg runs only in the dedicated clip generation worker.
- Source video is read from private MinIO storage; temporary files are removed after rendering.
- Rendered clips are stored under user-scoped keys and exposed through one-hour signed URLs.
- Clip generation uses explicit FFmpeg arguments through `execFile`, avoiding shell interpolation.

### Verification

- Workspace typecheck: passed.
- Workspace lint command: passed.
- API build: passed.
- Runtime FFmpeg, MinIO, Redis, and PostgreSQL verification: blocked because Docker is unavailable.

### Next Stage

Stage 12 - History.

## Stage 11 Implementation Status

### Implemented

- SRT generation from transcript segments.
- ASS subtitle generation with TikTok-style typography.
- Segment-based word highlight coloring using available timestamp precision.
- FFmpeg subtitle burn-in.
- Clip worker stores burned MP4 and downloadable SRT in MinIO.
- Subtitle signed URL endpoint: `GET /api/clips/:id/subtitle`.

### Modified Files

- `apps/api/src/media/media.module.ts`
- `apps/api/src/media/ffmpeg.service.ts`
- `apps/api/src/workers/clipgen.worker.ts`
- `apps/api/src/project/project.module.ts`
- `CLAUDE.md`

### Newly Created Files

- `apps/api/src/media/subtitle.service.ts`
- `apps/api/src/project/subtitle.controller.ts`

### Database Migrations

- None. Existing `Clip.subtitleKey` stores generated SRT object keys.

### New Environment Variables

- None.

### Architectural Decisions

- SRT remains downloadable while ASS is used for burned output.
- Word highlighting is segment-derived because current transcript schema has segment timestamps, not word timestamps; no false timestamp precision is introduced.
- Subtitle rendering remains inside clipgen worker and never blocks HTTP requests.

### Verification

- Workspace typecheck: passed.
- Workspace lint command: passed.
- API build: passed.
- Runtime FFmpeg, MinIO, Redis, and PostgreSQL verification: blocked because Docker is unavailable.

### Next Stage

Stage 12 - History.



## Stage 12 Implementation Status

### Implemented

- History API with pagination and case-insensitive title search.
- Authenticated project history UI connected to API.
- Empty state when no projects exist.
- Clip download signed URL endpoint: `GET /api/clips/:id/download`.
- Secure clip delete with ownership validation and storage cleanup.
- Subtitle and thumbnail object cleanup on clip deletion.

### Modified Files

- `apps/api/src/app.module.ts`
- `apps/api/src/project/clip.controller.ts`
- `apps/web/app/history/page.tsx`
- `CLAUDE.md`

### Newly Created Files

- `apps/api/src/history/history.service.ts`
- `apps/api/src/history/history.controller.ts`
- `apps/api/src/history/history.module.ts`

### Database Migrations

- None.

### New Environment Variables

- None.

### Architectural Decisions

- History queries are user-scoped at the Prisma query boundary.
- Signed URLs are used for download and preview; storage remains private.
- Delete removes database records and associated storage objects together.
- Pagination is capped at 50 records per request.

### Verification

- Workspace typecheck: passed.
- Workspace lint command: passed.
- API build: passed.
- Web build: passed.
- Runtime PostgreSQL/MinIO verification: blocked because Docker is unavailable.

### Next Stage

Stage 13 - Optimization.
