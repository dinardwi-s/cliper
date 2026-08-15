# AI YouTube Auto Clipper — NestJS Backend Architecture

**Document Version**: 1.0
**Author**: Senior NestJS Architect
**Last Updated**: 2026-07-31

---

## Table of Contents

1. [Architecture Principles](#1-architecture-principles)
2. [Complete Folder Structure](#2-complete-folder-structure)
3. [Domain Modules (Business Logic)](#3-domain-modules-business-logic)
4. [Infrastructure Services (Technical)](#4-infrastructure-services-technical)
5. [Common Layer (Cross-Cutting)](#5-common-layer-cross-cutting)
6. [Configuration](#6-configuration)
7. [Workers (Standalone Processes)](#7-workers-standalone-processes)
8. [WebSocket Gateway](#8-websocket-gateway)
9. [Module Dependency Graph](#9-module-dependency-graph)
10. [Folder Rationale Summary](#10-folder-rationale-summary)


## 1. Architecture Principles

### Clean Architecture Layers

```
┌──────────────────────────────────────────────┐
│                  DOMAINS                      │
│  Business rules. Know NOTHING about           │
│  Prisma, FFmpeg, MinIO, HTTP, WebSocket.     │
│  Pure TypeScript. Testable without infra.    │
├──────────────────────────────────────────────┤
│              INFRASTRUCTURE                   │
│  Technical implementations.                   │
│  Know about Prisma, FFmpeg, MinIO, S3.       │
│  Implement interfaces defined by domains.    │
├──────────────────────────────────────────────┤
│                  COMMON                       │
│  Cross-cutting: guards, pipes, decorators,   │
│  filters, interceptors.                      │
│  Framework-level utilities used everywhere.  │
└──────────────────────────────────────────────┘
```

### Module Design Rules

1. **Domain modules never import infrastructure modules directly** — they depend on interfaces/tokens
2. **Infrastructure modules implement domain contracts** — via `@Inject()` tokens
3. **No circular dependencies** — enforced by ESLint import rules
4. **Each domain is independently testable** — mock infrastructure, test pure logic
5. **Workers share domain services with API** — zero code duplication

---

## 2. Complete Folder Structure

```
apps/api/src/
│
├── main.ts                              # NestJS HTTP entrypoint (bootstrap)
├── app.module.ts                        # Root module — imports all domain + infra modules
│
├── common/                              # Cross-cutting shared infrastructure
│   ├── decorators/
│   │   ├── current-user.decorator.ts    # @CurrentUser() — extracts user from JWT
│   │   ├── public.decorator.ts          # @Public() — marks route as no-auth
│   │   └── roles.decorator.ts           # @Roles('admin') — role-based access
│   │
│   ├── filters/
│   │   └── global-exception.filter.ts   # Catches all exceptions, formats to standard JSON
│   │
│   ├── guards/
│   │   ├── jwt-auth.guard.ts            # Validates JWT access token from cookie
│   │   └── roles.guard.ts              # Checks user.isAdmin or custom roles
│   │
│   ├── interceptors/
│   │   ├── transform.interceptor.ts     # Wraps all responses in { data, meta, timestamp }
│   │   └── logging.interceptor.ts       # Logs request duration, path, status
│   │
│   ├── pipes/
│   │   ├── validation.pipe.ts           # Global Zod validation pipe
│   │   └── parse-youtube-url.pipe.ts    # Validates + extracts YouTube video ID
│   │
│   ├── interfaces/
│   │   ├── pagination.interface.ts      # { page, limit, total, data } generic type
│   │   └── api-response.interface.ts    # Standardized { data, error } response shape
│   │
│   └── dto/
│       ├── pagination.dto.ts            # Reusable query params: ?page=1&limit=20
│       └── id-param.dto.ts             # Reusable :id param validation (UUID)
│
├── config/                              # Environment configuration
│   ├── app.config.ts                    # PORT, NODE_ENV, CORS_ORIGIN
│   ├── auth.config.ts                   # JWT_SECRET, JWT_EXPIRATION, REFRESH_EXPIRATION
│   ├── database.config.ts               # DATABASE_URL
│   ├── redis.config.ts                  # REDIS_URL, REDIS_PASSWORD
│   ├── storage.config.ts                # MinIO/S3 endpoint, keys, bucket names
│   ├── openai.config.ts                 # OPENAI_API_KEY, MODEL, MAX_TOKENS
│   └── whisper.config.ts                # WHISPER_MODEL, DEVICE, COMPUTE_TYPE
│
├── domains/                             # DDD Bounded Contexts (business logic)
│   │
│   ├── auth/                            # Authentication domain
│   │   ├── auth.module.ts
│   │   ├── auth.controller.ts           # POST /auth/register, /login, /refresh, /logout
│   │   ├── auth.service.ts              # Register, validateCredentials, generateTokens
│   │   ├── auth.service.spec.ts
│   │   ├── token.service.ts             # JWT sign, verify, refresh rotation
│   │   ├── jwt.strategy.ts              # Passport JWT strategy (reads cookie)
│   │   └── dto/
│   │       ├── register.dto.ts
│   │       ├── login.dto.ts
│   │       ├── refresh.dto.ts
│   │       ├── forgot-password.dto.ts
│   │       └── reset-password.dto.ts
│   │
│   ├── user/                            # User profile domain
│   │   ├── user.module.ts
│   │   ├── user.controller.ts           # GET/PATCH/DELETE /users/me
│   │   ├── user.service.ts              # getProfile, updateProfile, deleteAccount
│   │   ├── user.service.spec.ts
│   │   └── dto/
│   │       └── update-profile.dto.ts
│   │
│   ├── subscription/                    # Subscription domain
│   │   ├── subscription.module.ts
│   │   ├── subscription.controller.ts   # GET/POST /subscription
│   │   ├── subscription.service.ts      # getCurrent, upgrade, cancel, setByok
│   │   ├── subscription.service.spec.ts
│   │   ├── plan.service.ts              # getPlanFeatures, getPlanCredits, validatePlan
│   │   └── dto/
│   │       ├── upgrade.dto.ts
│   │       └── byok.dto.ts
│   │
│   ├── credit/                          # Credit wallet domain
│   │   ├── credit.module.ts
│   │   ├── credit.controller.ts         # GET /credits/balance, /credits/history
│   │   ├── credit.service.ts            # getBalance, deduct, refund, grant, getHistory
│   │   ├── credit.service.spec.ts
│   │   └── dto/
│   │       └── transaction-history.dto.ts
│   │
│   ├── project/                         # Project CRUD domain
│   │   ├── project.module.ts
│   │   ├── project.controller.ts        # CRUD /projects, POST /projects/:id/cancel
│   │   ├── project.service.ts           # create, findAll, findOne, delete, cancel, retry
│   │   ├── project.service.spec.ts
│   │   └── dto/
│   │       ├── create-project.dto.ts
│   │       ├── update-project.dto.ts
│   │       └── project-query.dto.ts
│   │
│   ├── processing/                      # Processing orchestrator domain
│   │   ├── processing.module.ts
│   │   ├── processing.service.ts        # Orchestrates 5-stage pipeline
│   │   ├── processing.service.spec.ts
│   │   └── pipeline.ts                  # Pipeline stage definitions + flow chart
│   │
│   ├── clip/                            # Clip output domain
│   │   ├── clip.module.ts
│   │   ├── clip.controller.ts           # CRUD /clips, GET /clips/:id/download
│   │   ├── clip.service.ts              # findAll, findOne, update, delete, getDownloadUrl
│   │   ├── clip.service.spec.ts
│   │   └── dto/
│   │       ├── create-manual-clip.dto.ts
│   │       └── update-clip.dto.ts
│   │
│   ├── transcript/                      # Transcript read domain
│   │   ├── transcript.module.ts
│   │   ├── transcript.controller.ts     # GET /projects/:id/transcript
│   │   ├── transcript.service.ts        # getSegments, getFullText, searchSegments
│   │   └── transcript.service.spec.ts
│   │
│   ├── dashboard/                       # Dashboard domain
│   │   ├── dashboard.module.ts
│   │   ├── dashboard.controller.ts      # GET /dashboard/stats, /credits, /usage
│   │   ├── dashboard.service.ts         # getUserStats, getCreditSummary, getUsageHistory
│   │   └── dashboard.service.spec.ts
│   │
│   └── admin/                           # Admin domain
│       ├── admin.module.ts
│       ├── admin.controller.ts          # GET /admin/users, /admin/stats
│       ├── admin.service.ts             # listUsers, getPlatformMetrics, grantCredits
│       └── admin.service.spec.ts
│
├── infrastructure/                      # Technical service implementations
│   │
│   ├── database/
│   │   ├── database.module.ts           # Global module — exports PrismaService
│   │   └── prisma.service.ts            # PrismaClient onModuleInit, enableShutdownHooks
│   │
│   ├── queue/
│   │   ├── queue.module.ts              # Dynamic module — registers BullMQ queues
│   │   ├── queue.service.ts             # addToDownloadQueue, addToTranscribeQueue, etc.
│   │   └── jobs/
│   │       ├── download.job.ts          # DownloadVideoJob — yt-dlp download + upload
│   │       ├── transcribe.job.ts        # TranscribeAudioJob — Whisper STT
│   │       ├── analyze.job.ts           # AnalyzeTranscriptJob — GPT-4o analysis
│   │       ├── clip-generation.job.ts   # GenerateClipJob — FFmpeg render
│   │       └── cleanup.job.ts           # CleanupJob — delete expired files
│   │
│   ├── storage/
│   │   ├── storage.module.ts
│   │   ├── storage.service.ts           # upload, download, getSignedUrl, delete, copy
│   │   └── storage.service.spec.ts
│   │
│   ├── media/                           # FFmpeg + Subtitle generation (Python-free)
│   │   ├── media.module.ts
│   │   ├── ffmpeg.service.ts            # cutClip, burnSubtitles, extractAudio, captureThumbnail
│   │   ├── ffmpeg.service.spec.ts
│   │   ├── subtitle.service.ts          # generateAss, generateSrt, parseTranscriptToSubtitle
│   │   └── subtitle.service.spec.ts
│   │
│   ├── ai/                              # AI service clients
│   │   ├── ai.module.ts
│   │   ├── openai.service.ts            # analyzeTranscript — calls GPT-4o with structured prompts
│   │   ├── openai.service.spec.ts
│   │   ├── whisper.service.ts           # transcribe — Python subprocess to Faster Whisper
│   │   └── whisper.service.spec.ts
│   │
│   ├── downloader/
│   │   ├── downloader.module.ts
│   │   ├── yt-dlp.service.ts            # downloadVideo, getMetadata — yt-dlp wrapper
│   │   └── yt-dlp.service.spec.ts
│   │
│   └── crypto/
│       ├── crypto.module.ts
│       ├── encryption.service.ts        # encryptApiKey, decryptApiKey (AES-256-GCM)
│       └── encryption.service.spec.ts
│
├── websocket/
│   ├── ws.module.ts                     # Gateway module + WebSocket adapter
│   ├── ws.gateway.ts                    # handleConnection, handleMessage, emit events
│   └── ws.gateway.spec.ts
│
└── workers/                             # Standalone NestJS applications
    ├── download.worker.ts              # Bootstrap download queue consumer
    ├── transcribe.worker.ts            # Bootstrap transcribe queue consumer
    ├── analyze.worker.ts               # Bootstrap analyze queue consumer
    ├── clip-gen.worker.ts              # Bootstrap clip generation queue consumer
    └── cleanup.worker.ts               # Bootstrap cleanup queue consumer (cron-based)

## 3. Domain Modules (Business Logic)

### 3.1 auth/
**What**: Authentication and authorization domain.
**Why exists**: Centralized identity management. No other module handles user credentials.
**Dependencies**: infrastructure/database (PrismaService), infrastructure/crypto (encryption for API keys)
**Exports**: AuthService, TokenService, JwtStrategy, JwtAuthGuard

### 3.2 user/
**What**: User profile management.
**Why exists**: Separated from auth for Clean Architecture. Auth = credentials. User = profile.
**Dependencies**: infrastructure/database (PrismaService), infrastructure/storage (for avatar)
**Exports**: UserService

### 3.3 subscription/
**What**: Plan management, billing status, feature gates.
**Why exists**: Subscription logic is complex (plan comparison, feature validation, upgrade/downgrade). A dedicated module prevents polluting user or credit domains.
**Dependencies**: infrastructure/database (PrismaService), domains/credit (credits reset on plan change)
**Exports**: SubscriptionService, PlanService

### 3.4 credit/
**What**: Credit wallet — balance, transactions, deduction, refund.
**Why exists**: Credits are the monetization engine. Must be reliable (balance >= 0 enforced), auditable (immutable transaction log), and reusable across project creation and BYOK mode.
**Dependencies**: infrastructure/database (PrismaService)
**Exports**: CreditService

### 3.5 project/
**What**: YouTube URL → Project lifecycle.
**Why exists**: Core user-facing entity. Handles CRUD, status tracking, error surfacing.
**Dependencies**: infrastructure/database (PrismaService), domains/credit (deduct on create, refund on fail), domains/processing (start pipeline on create), domains/clip (delete cascaded clips)
**Exports**: ProjectService

### 3.6 processing/
**What**: Orchestrator that coordinates the 5-stage pipeline via BullMQ queues.
**Why exists**: This is the most complex business logic — chaining 5 async workers with error handling, retry, and rollback. Extracting it prevents project.module.ts from becoming a 2000-line god class.
**Dependencies**: infrastructure/queue (enqueue jobs), infrastructure/database (update status), domains/credit (refund on failure)
**Pipeline flow**:
```
start(projectId)
  → queue.add('download', { projectId })
    → worker-download completes
      → queue.add('transcribe', { projectId })
        → worker-transcribe completes
          → queue.add('analyze', { projectId })
            → worker-analyze completes
              → queue.add('clipgen', { clipId }) × N (parallel)
                → all clips done → project.status = completed
```
**Exports**: ProcessingService

### 3.7 clip/
**What**: Clip CRUD, download URL generation, manual clip creation.
**Why exists**: Clips are the deliverable — user interacts with them the most. Needs dedicated module for download (pre-signed URL), manual boundary adjustment, and regeneration.
**Dependencies**: infrastructure/database (PrismaService), infrastructure/storage (pre-signed URL)
**Exports**: ClipService

### 3.8 transcript/
**What**: Read access to speech-to-text results.
**Why exists**: Transcript is generated by infrastructure (Whisper), but querying and searching it is domain logic. Users need to search segments, view full text, use it for manual clip creation.
**Dependencies**: infrastructure/database (PrismaService)
**Exports**: TranscriptService

### 3.9 dashboard/
**What**: Aggregated user statistics.
**Why exists**: Dashboard queries span multiple tables (projects, clips, credits, usage). A dedicated module prevents polluting individual domain services with aggregation logic.
**Dependencies**: infrastructure/database (PrismaService)
**Exports**: DashboardService

### 3.10 admin/
**What**: Platform-level administration.
**Why exists**: Admin operations (user management, platform metrics, manual credit grants) are a separate bounded context from regular user operations. Protected by role-based guard.
**Dependencies**: infrastructure/database (PrismaService), domains/credit (manual credit grants)
**Exports**: AdminService

---

## 4. Infrastructure Services (Technical)

### 4.1 database/
**What**: PrismaClient lifecycle management.
**Why exists**: Single PrismaClient instance shared across all modules. Prevents connection leaks. Handles connection retry, graceful shutdown, and (future) read replica routing.
**Key implementation**: `PrismaService extends PrismaClient implements OnModuleInit { onModuleInit() { this.$connect() } }`

### 4.2 queue/
**What**: BullMQ queue registry + job producers.
**Why exists**: Centralized queue management. Every worker connects to queues defined here. Queue names, job types, and default options are standardized.
**Queues registered**:
- `download` → DownloadVideoJob (yt-dlp)
- `transcribe` → TranscribeAudioJob (Faster Whisper)
- `analyze` → AnalyzeTranscriptJob (GPT-4o)
- `clipgen` → GenerateClipJob (FFmpeg)
- `cleanup` → CleanupJob (scheduled)

### 4.3 storage/
**What**: MinIO/S3 abstraction layer.
**Why exists**: Portable storage abstraction. Swap MinIO for AWS S3/Cloudflare R2 by changing env vars only. No code changes.
**Operations**: upload(buffer, bucket, key), download(bucket, key), getSignedUrl(bucket, key, expiresIn), delete(bucket, key)

### 4.4 media/
**What**: FFmpeg and subtitle generation services.
**Why exists**: FFmpeg operations are complex (20+ CLI flag combinations per operation) and error-prone. Wrapping them in a service provides:
- Type-safe API instead of string CLI construction
- Temp file management (create in /tmp, clean up after)
- Error handling (stderr parsing, retry on transient failures)
**Operations**: cutClip, burnSubtitles, extractAudio, captureThumbnail, generateWaveform
**Subtitle formats**: ASS (burnt into video), SRT (downloadable separate file)

### 4.5 ai/
**What**: OpenAI and Faster Whisper clients.
**Why exists**: AI calls need prompt engineering, structured output parsing, token management, and retry logic. This is too complex to inline in domain services.
**OpenaiService**: Takes transcript segments → constructs well-engineered prompt → parses structured GPT-4o JSON response → returns ClipSuggestion[]
**WhisperService**: Takes audio path → runs Faster Whisper Python subprocess → parses word-level timestamps → returns TranscriptSegment[]

### 4.6 downloader/
**What**: yt-dlp integration.
**Why exists**: yt-dlp has complex CLI, format selection logic, and metadata extraction. Wrapping it prevents scattered child_process.exec() calls.
**Operations**: getMetadata(url) → VideoMetadata, downloadVideo(url, outputDir) → filePath, validateUrl(url) → boolean

### 4.7 crypto/
**What**: Encryption/decryption for sensitive data (BYOK API keys).
**Why exists**: User-provided OpenAI API keys must be encrypted at rest (AES-256-GCM). This is a cross-cutting security concern that no domain module should implement directly.
**Operations**: encryptApiKey(plaintext) → ciphertext, decryptApiKey(ciphertext) → plaintext

---

## 5. Common Layer (Cross-Cutting)

### 5.1 decorators/
Reusable parameter decorators that reduce boilerplate in controllers.
- `@CurrentUser()`: Extracts `request.user` (populated by JwtAuthGuard) → `UserPayload`
- `@Public()`: Marks a route as public (bypasses JwtAuthGuard)
- `@Roles('admin')`: Restricts route to specific roles

### 5.2 filters/
- `GlobalExceptionFilter`: Catches ALL exceptions → formats to standard `{ statusCode, error, code, message, details?, timestamp, path }` JSON response

### 5.3 guards/
- `JwtAuthGuard`: Validates JWT from httpOnly cookie. Attaches user payload to `request.user`.
- `RolesGuard`: Checks `request.user.isAdmin` for admin-only routes.

### 5.4 interceptors/
- `TransformInterceptor`: Wraps successful responses in `{ data: T, meta?: PaginationMeta, timestamp: string }`
- `LoggingInterceptor`: Logs `${method} ${path} → ${statusCode} (${duration}ms)` for every request

### 5.5 pipes/
- `ValidationPipe`: Global Zod input validation. Validates all `@Body()`, `@Query()`, `@Param()`
- `ParseYouTubeUrlPipe`: Extracts YouTube video ID from URL formats (youtube.com/watch?v=, youtu.be/, youtube.com/shorts/)

---

## 6. Configuration

All configuration is centralized in `config/` using NestJS `@nestjs/config` with Zod validation:

```typescript
// config/app.config.ts (conceptual)
import { registerAs } from '@nestjs/config';
import { z } from 'zod';

const appSchema = z.object({
  PORT: z.coerce.number().default(4000),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  CORS_ORIGIN: z.string().url().default('http://localhost:3000'),
});

export const appConfig = registerAs('app', () => appSchema.parse(process.env));
```

Each config file validates on startup → app crashes fast with a clear error if a required env var is missing. No silent failures at runtime.

---

## 7. Workers (Standalone Processes)

### 7.1 Worker Architecture

Each worker is a standalone NestJS application (not an HTTP server). It:
1. Imports `AppModule` (gets all domain + infra services)
2. Creates a NestJS application context (`NestFactory.createApplicationContext`)
3. Gets the `QueueService` from the DI container
4. Registers a queue processor via `queue.process('name', handler)`
5. Listens for jobs

```
// workers/download.worker.ts (conceptual)
import { NestFactory } from '@nestjs/core';
import { AppModule } from '../app.module';
import { QueueService } from '../infrastructure/queue/queue.service';

async function bootstrap() {
  const app = await NestFactory.createApplicationContext(AppModule);
  const queueService = app.get(QueueService);
  const prismaService = app.get(PrismaService);

  const queue = queueService.getQueue('download');
  queue.process('download-video', async (job) => {
    const { projectId, youtubeUrl } = job.data;
    // Use YtDlpService, StorageService, PrismaService
    // Update project status
    // Emit WebSocket progress
  });
}

bootstrap();
```

### 7.2 Worker List

| Worker File | Queue | Resources | Scale Strategy |
|------------|-------|-----------|----------------|
| `download.worker.ts` | download | 1 CPU, 1GB RAM | 1 instance (yt-dlp is I/O bound) |
| `transcribe.worker.ts` | transcribe | 4 CPU, 8GB RAM | 1-2 instances (Whisper is CPU+RAM heavy) |
| `analyze.worker.ts` | analyze | 1 CPU, 512MB RAM | 1-2 instances (API rate limited) |
| `clip-gen.worker.ts` | clipgen | 2 CPU, 2GB RAM | 4+ instances (FFmpeg is CPU bound, most scalable) |
| `cleanup.worker.ts` | cleanup | 0.5 CPU, 256MB RAM | 1 instance (cron, lightweight) |

---

## 8. WebSocket Gateway

### 8.1 Architecture

```
Client (Next.js)                  Server (NestJS)
        │                              │
        │── ws://api:4000/ws ────────▶│ WsGateway
        │   ?token=jwt                 │ handleConnection()
        │                              │   - Validates JWT token
        │                              │   - Gets projectId from handshake query
        │                              │   - Joins Socket.IO room: project:{projectId}
        │                              │
        │◀─ progress.update ────────── │ Emitted by worker jobs via QueueService
        │   {stage, percent, message}  │   to the project's room
        │                              │
        │◀─ clip.completed ────────── │ When clip generation finishes
        │   {clipId, title}            │
        │                              │
        │◀─ project.completed ────────│ When all clips are done
        │   {projectId}                │
```

### 8.2 Events

**Server → Client:**
| Event | Payload | Trigger |
|-------|---------|---------|
| `progress.update` | `{ stage: string, percent: number, message: string }` | Worker progress report |
| `clip.completed` | `{ clipId: string, title: string, thumbnailUrl: string }` | Clip generation done |
| `project.completed` | `{ projectId: string }` | All clips generated |
| `job.failed` | `{ stage: string, error: string }` | Any stage fails |

**Client → Server:**
| Event | Payload | Purpose |
|-------|---------|---------|
| `subscribe` | `{ projectId: string }` | Join project room |
| `unsubscribe` | `{ projectId: string }` | Leave project room |

---

## 9. Module Dependency Graph

```
app.module.ts
├── ConfigModule.forRoot()           (global)
├── CommonModule                     (global: guards, pipes, filters)
├── DatabaseModule                   (global: PrismaService)
│
├── InfrastructureLayer              (imported by domains, not vice versa)
│   ├── QueueModule                  (exports: QueueService)
│   ├── StorageModule                (exports: StorageService)
│   ├── MediaModule                  (exports: FfmpegService, SubtitleService)
│   ├── AiModule                     (exports: OpenaiService, WhisperService)
│   ├── DownloaderModule             (exports: YtDlpService)
│   └── CryptoModule                 (exports: EncryptionService)
│
├── DomainLayer
│   ├── AuthModule                   (depends on: Database, Crypto)
│   ├── UserModule                   (depends on: Database, Storage)
│   ├── SubscriptionModule           (depends on: Database, Credit)
│   ├── CreditModule                 (depends on: Database)
│   ├── ProjectModule               (depends on: Database, Credit, Processing)
│   ├── ProcessingModule             (depends on: Queue, Database, Credit)
│   ├── ClipModule                   (depends on: Database, Storage)
│   ├── TranscriptModule             (depends on: Database)
│   ├── DashboardModule              (depends on: Database)
│   └── AdminModule                  (depends on: Database, Credit)
│
├── WebSocketModule                  (depends on: Auth for JWT validation)
└── Workers                          (standalone, import AppModule)
```

**Dependency rule checkpoint:**
- Domain modules → Infrastructure modules? Allowed (via DI tokens)
- Infrastructure modules → Domain modules? **Forbidden**
- Domain modules → Other domain modules? Allowed with caution (Processing depends on Credit)
- Circular dependencies? **Forbidden** (ESLint `import/no-cycle`)

---

## 10. Folder Rationale Summary

| Folder | Rationale |
|--------|-----------|
| `common/` | Prevents duplication of guards, pipes, filters, interceptors, and decorators across modules. Cross-cutting concerns live here. |
| `config/` | Centralized env validation prevents scattered `process.env.X || 'default'` bugs. All configs validated at app startup via Zod. |
| `domains/` | Business logic. Each domain is a DDD bounded context with its own controller, service, DTOs, and tests. Independent testability. |
| `domains/processing/` | Orchestrator pattern — coordinates 5 async workers. Extracted from project module to prevent god-class anti-pattern. |
| `domains/clip/` | Separate from project because clips have their own lifecycle (manual creation, regeneration, download). Clips survive project deletion when downloaded. |
| `domains/transcript/` | Read-only domain for transcript queries. Could be part of project, but extracting it keeps project.service.ts focused on lifecycle, not data retrieval. |
| `domains/dashboard/` | Aggregation queries cross multiple domains. Extracting prevents any single domain from importing all others. |
| `domains/admin/` | Different permission model (role-based) and different use cases from regular user operations. |
| `infrastructure/database/` | Single PrismaClient instance prevents connection leaks. Global module ensures every domain can inject it. |
| `infrastructure/queue/` | Dynamic NestJS module that registers 5 BullMQ queues as injectable providers. Job definitions separated for testability. |
| `infrastructure/storage/` | Abstraction over S3 API. Swap MinIO for AWS S3 by changing env vars. No code changes. |
| `infrastructure/media/` | FFmpeg operations are error-prone CLI constructions. Wrapping them provides type-safe API, temp file cleanup, and error parsing. |
| `infrastructure/ai/` | AI calls need prompt engineering + structured output parsing. Too complex to inline in domain services. |
| `infrastructure/downloader/` | yt-dlp CLI wrapper. Centralizes format selection, metadata extraction, error handling. |
| `infrastructure/crypto/` | AES-256-GCM encryption for user API keys. Security concern extracted from any domain module. |
| `websocket/` | Socket.IO gateway. Separate from any domain because multiple domains emit events through it. |
| `workers/` | Standalone NestJS apps. Each one imports AppModule (gets all services) but only registers one queue processor. Shared codebase, independent deployment. |

---

## Document Control

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | 2026-07-31 | Senior NestJS Architect | Initial design — 10 domains, 7 infra services, 5 workers |
