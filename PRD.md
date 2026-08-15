# AI YouTube Auto Clipper — Product Requirements Document

**Document Version**: 1.0
**Status**: Draft
**Author**: Senior Product Manager
**Last Updated**: 2026-07-31

---

## Table of Contents

1. [Vision](#1-vision)
2. [Goals](#2-goals)
3. [Target Users](#3-target-users)
4. [User Personas](#4-user-personas)
5. [User Stories](#5-user-stories)
6. [Functional Requirements](#6-functional-requirements)
7. [Non-Functional Requirements](#7-non-functional-requirements)
8. [Technical Constraints](#8-technical-constraints)
9. [MVP Scope](#9-mvp-scope)
10. [Future Features](#10-future-features)
11. [Database Overview](#11-database-overview)
12. [API Overview](#12-api-overview)
13. [Dashboard Overview](#13-dashboard-overview)
14. [Subscription Plan](#14-subscription-plan)
15. [Credits System](#15-credits-system)

---

## 1. Vision

**"One click from YouTube URL to viral-ready clips."**

AI YouTube Auto Clipper is a SaaS platform that eliminates the manual labor of video editing for content repurposing. A user pastes a YouTube URL, and the platform automatically:

- Downloads the video
- Transcribes the audio with word-level timestamps
- Analyzes the content using AI to identify the most engaging moments
- Generates short clips (15-90 seconds) with burned-in subtitles
- Makes those clips downloadable or ready for publishing

The vision is to reduce 4+ hours of manual clip generation to under 10 minutes, democratizing short-form content creation.

---

## 2. Goals

### Primary Goals (MVP)

| # | Goal | Success Metric |
|---|------|---------------|
| G1 | Reduce manual clip creation time by 90% | Average user saves 3.5+ hours per video |
| G2 | AI accurately identifies engaging moments | >80% of auto-generated clips rated "good" by users |
| G3 | Subtitle accuracy meets production quality | Word Error Rate (WER) < 5% on English content |
| G4 | Scalable processing pipeline | 100+ concurrent videos processed without degradation |
| G5 | Revenue-generating from day one | Freemium model with clear upgrade triggers |

### Business Goals

| # | Goal | Target |
|---|------|--------|
| G6 | User acquisition | 10,000 registered users in first 6 months |
| G7 | Conversion rate | 8% free-to-paid conversion |
| G8 | Revenue | $10K MRR by month 12 |
| G9 | Retention | >70% monthly retention for paid users |

---

## 3. Target Users

### Primary Segments

| Segment | Description | Estimated Market Size |
|---------|-------------|----------------------|
| **Content Creators (Individual)** | YouTubers, TikTokers, Instagrammers repurposing long-form content into shorts | Very Large (millions) |
| **Digital Agencies** | Social media agencies managing multiple client accounts | Large (hundreds of thousands) |
| **Social Media Managers** | In-house marketing professionals handling brand social channels | Large (hundreds of thousands) |
| **YouTube Educators** | Course creators, tutorial makers, educational YouTube channels | Medium |
| **Podcasters** | Podcasters turning video podcast episodes into highlight clips | Medium |

### Who This Is NOT For
- Professional video editors who need frame-level control (use Premiere/Final Cut)
- Live stream clip generation (different latency requirements)
- Short-form-only creators who don't have long-form source content

---

## 4. User Personas

### Persona 1: Alex — The Solo Content Creator

```
Age:          26
Occupation:   Full-time YouTuber (tech reviews, 50K subscribers)
Income:       $3,000 - $5,000/month from AdSense + sponsors
Pain Points:  Spends 6+ hours/week manually finding clips.
              Tried hiring editors, quality was inconsistent.
              Needs to post daily shorts to feed the algorithm.
Goals:        Turn 1 long video into 5-10 shorts automatically.
              Maintain consistent visual quality.
              Save time to focus on content creation.
Tech Level:   Medium. Comfortable with tools, not with code.
Quote:        "I need my long videos to work harder for me."
```

### Persona 2: Maya — The Agency Owner

```
Age:          34
Occupation:   Founder of a 5-person social media agency
Income:       $15,000/month agency revenue
Pain Points:  Managing 12 client accounts, each needing clips.
              Edits cost $50-100/video, margins are thin.
              Turnaround time is 3-5 days per video.
Goals:        Scale output without scaling headcount.
              Consistent branding across clients.
              Reduce per-clip cost to under $5.
Tech Level:   High. Manages her own tech stack.
Quote:        "My bottleneck is editing. Solve that and I double revenue."
```

### Persona 3: Jordan — The Social Media Manager

```
Age:          29
Occupation:   Social Media Manager at a SaaS startup
Income:       $75,000/year salary
Pain Points:  One-person social team, juggling 4 platforms.
              Events/webinars produce 2-hour recordings, no time to clip.
              Boss wants "viral clips" but gives no budget for editors.
Goals:        Clip company webinars into social posts.
              Maintain brand voice across clips.
              Prove ROI of social media efforts.
Tech Level:   Medium-Low. Knows Buffer/Hootsuite, not editing tools.
Quote:        "I need something that works without me learning Premiere."
```

### Persona 4: Rizky — The Course Creator

```
Age:          38
Occupation:   Online course creator (business & marketing)
Income:       $8,000 - $12,000/month from course sales
Pain Points:  2-hour course modules don't work as social content.
              Needs clips to promote courses without giving everything away.
              Current editor doesn't understand "hook moments."
Goals:        Generate 20+ promo clips per course module.
              Drive traffic from social to course landing pages.
              Build personal brand authority with consistent posting.
Tech Level:   Low. Prefers simple interfaces, avoids technical tools.
Quote:        "I pay $500 for editing that should be automated by now."


---

## 5. User Stories

### Authentication (AUTH)

| ID | As a... | I want to... | So that... | Priority |
|----|---------|-------------|------------|----------|
| AUTH-01 | Visitor | Register with email and password | I can create an account | P0 |
| AUTH-02 | Registered user | Log in with my credentials | I can access my dashboard | P0 |
| AUTH-03 | Logged-in user | Have my session persisted securely | I don't have to log in every time | P0 |
| AUTH-04 | User | Reset my password via email | I can recover access if I forget | P1 |
| AUTH-05 | User | View and edit my profile | My information stays up to date | P2 |

### Project Management (PROJ)

| ID | As a... | I want to... | So that... | Priority |
|----|---------|-------------|------------|----------|
| PROJ-01 | User | Paste a YouTube URL and create a project | Processing can begin | P0 |
| PROJ-02 | User | See the status of my project in real time | I know when my clips are ready | P0 |
| PROJ-03 | User | View a list of all my projects | I can manage multiple videos | P0 |
| PROJ-04 | User | Delete a project and all associated clips | I can clean up old content | P1 |
| PROJ-05 | User | Re-process a project | I can get better results with updated AI | P1 |
| PROJ-06 | User | See how many credits a project will consume | I can manage my budget | P0 |

### AI Processing (PROC)

| ID | As a... | I want to... | So that... | Priority |
|----|---------|-------------|------------|----------|
| PROC-01 | User | The system to download YouTube video automatically | I don't need external tools | P0 |
| PROC-02 | User | The system to transcribe the video accurately | AI can analyze the content | P0 |
| PROC-03 | User | AI to identify the most engaging moments | I get the best possible clips | P0 |
| PROC-04 | User | AI to suggest optimal clip duration (15-60s) | Clips fit platform requirements | P0 |
| PROC-05 | User | Each clip to have burned-in subtitles | Viewers can watch without sound | P0 |
| PROC-06 | User | See why AI chose each clip (rationale) | I understand and trust the AI | P1 |

### Clip Management (CLIP)

| ID | As a... | I want to... | So that... | Priority |
|----|---------|-------------|------------|----------|
| CLIP-01 | User | Preview generated clips before downloading | I can decide which ones to keep | P0 |
| CLIP-02 | User | Download individual clips as MP4 | I can post them to social media | P0 |
| CLIP-03 | User | Download all clips from a project at once | I save time with batch operations | P1 |
| CLIP-04 | User | Adjust clip start/end times manually | I can fine-tune AI-generated boundaries | P1 |
| CLIP-05 | User | Delete unwanted clips | I only keep what I'll use | P1 |
| CLIP-06 | User | View engagement score for each clip | I can prioritize the best ones | P0 |

### Dashboard & Analytics (DASH)

| ID | As a... | I want to... | So that... | Priority |
|----|---------|-------------|------------|----------|
| DASH-01 | User | See my credit balance and usage history | I know when to upgrade | P0 |
| DASH-02 | User | See statistics (projects processed, clips generated) | I track my ROI | P1 |
| DASH-03 | Admin | View platform-wide metrics | I can monitor system health | P2 |

### Subscription & Credits (SUB)

| ID | As a... | I want to... | So that... | Priority |
|----|---------|-------------|------------|----------|
| SUB-01 | Free user | Clearly understand my credit limit | I know when I'll hit the paywall | P0 |
| SUB-02 | User | Upgrade to a paid plan | I can process more videos | P1 |
| SUB-03 | User | Bring my own OpenAI API key | I can use my own AI credits | P1 |
| SUB-04 | Paid user | Cancel my subscription anytime | I'm not locked in | P2 |

---

## 6. Functional Requirements

### 6.1 Authentication & Authorization

| # | Requirement | Details |
|---|-------------|---------|
| FR-AUTH-01 | Email/password registration | Email validation, password min 8 characters, bcrypt hashing |
| FR-AUTH-02 | Email/password login | Return JWT in httpOnly cookie |
| FR-AUTH-03 | JWT + Refresh Token | Access token 15 min, refresh token 7 days, rotation on use |
| FR-AUTH-04 | Rate limiting on auth endpoints | Max 5 login attempts per IP per 15 minutes |
| FR-AUTH-05 | Email verification | Required before first project creation |
| FR-AUTH-06 | Password reset flow | Token-based, expires in 1 hour, sent via email |

### 6.2 Project Management

| # | Requirement | Details |
|---|-------------|---------|
| FR-PROJ-01 | YouTube URL validation | Validate format, check video exists, check duration < 6 hours |
| FR-PROJ-02 | Duplicate detection | Same user + same video ID = re-use project or warn |
| FR-PROJ-03 | Project status tracking | 11 statuses: pending -> downloading -> downloaded -> transcribing -> transcribed -> analyzing -> analyzed -> generating_clips -> completed / failed / cancelled |
| FR-PROJ-04 | Error handling | Per-stage error messages with actionable guidance |
| FR-PROJ-05 | Credit check | Verify balance BEFORE creating project |
| FR-PROJ-06 | Title auto-detection | Fetch video title from YouTube metadata |
| FR-PROJ-07 | Manual project cancellation | User can cancel processing at any stage |

### 6.3 Processing Pipeline

| # | Requirement | Details |
|---|-------------|---------|
| FR-PROC-01 | Video download via yt-dlp | Best quality up to 1080p, store in MinIO raw-videos bucket |
| FR-PROC-02 | Audio extraction | FFmpeg: extract AAC/Opus -> 16kHz mono WAV for Whisper |
| FR-PROC-03 | Speech-to-text | Faster Whisper (large-v3 model), word-level timestamps |
| FR-PROC-04 | AI engagement analysis | GPT-4o with structured output: clip suggestions with start/end times, scores, titles |
| FR-PROC-05 | Clip generation | FFmpeg: cut video + burn subtitles (ASS format, customizable style) |
| FR-PROC-06 | Thumbnail generation | Capture frame at midpoint of each clip |
| FR-PROC-07 | Auto-retry on failure | Max 3 retries per stage with exponential backoff |
| FR-PROC-08 | Parallel clip generation | All clips for a project processed concurrently |

### 6.4 Clip Output

| # | Requirement | Details |
|---|-------------|---------|
| FR-CLIP-01 | MP4 H.264 output | Compatible with all social platforms |
| FR-CLIP-02 | Burned-in subtitles | White text with black outline, centered, 2 lines max |
| FR-CLIP-03 | Default aspect ratio | 16:9 (horizontal) for MVP, 9:16 crop option planned |
| FR-CLIP-04 | Clip duration range | 15-90 seconds, AI-optimized per moment |
| FR-CLIP-05 | Download via pre-signed URL | MinIO 1-hour expiry URL |
| FR-CLIP-06 | Batch download | Zip all clips in a project |

### 6.5 Dashboard

| # | Requirement | Details |
|---|-------------|---------|
| FR-DASH-01 | Project list | Paginated, sortable by date/status, search by title |
| FR-DASH-02 | Project detail view | Status timeline, clip grid with thumbnails |
| FR-DASH-03 | Real-time progress | WebSocket: stage, percentage, message |
| FR-DASH-04 | Credit display | Current balance, monthly usage, plan limit |

### 6.6 Subscription & Credits

| # | Requirement | Details |
|---|-------------|---------|
| FR-SUB-01 | Plan tiers | Free, Starter ($19/mo), Pro ($49/mo), Enterprise ($199/mo) |
| FR-SUB-02 | Credit allocation | Monthly credits per tier (see Section 14) |
| FR-SUB-03 | Credit rollover | Unused credits roll over, max 2x monthly allocation |
| FR-SUB-04 | BYOK mode | User provides own OpenAI key, skips credit consumption for AI |
| FR-SUB-05 | Credit deduction | 1 credit per video <10min, scaling up by video length |
| FR-SUB-06 | Usage history | Complete transaction log with timestamps |

### 6.7 Admin

| # | Requirement | Details |
|---|-------------|---------|
| FR-ADM-01 | User management | List users, view projects, ban/unban |
| FR-ADM-02 | Platform metrics | Total users, active projects, clips generated, API costs |
| FR-ADM-03 | Manual credit adjustment | Grant/revoke credits to specific users |

---

## 7. Non-Functional Requirements

### 7.1 Performance

| # | Requirement | Target |
|---|-------------|--------|
| NFR-PERF-01 | API response time (p95) | < 200ms for CRUD endpoints |
| NFR-PERF-02 | Page load time (FCP) | < 1.5s |
| NFR-PERF-03 | Time to interactive (TTI) | < 3s |
| NFR-PERF-04 | Video download start | < 30 seconds from project creation |
| NFR-PERF-05 | Full pipeline (10-min video) | < 8 minutes end-to-end |
| NFR-PERF-06 | Concurrent projects | 500+ processing simultaneously |

### 7.2 Security

| # | Requirement | Details |
|---|-------------|---------|
| NFR-SEC-01 | Authentication | JWT in httpOnly, Secure, SameSite=Strict cookies |
| NFR-SEC-02 | Password storage | bcrypt with cost factor 12 |
| NFR-SEC-03 | API rate limiting | Per-user and per-IP limits on all endpoints |
| NFR-SEC-04 | CORS | Strict origin whitelist |
| NFR-SEC-05 | File access | Pre-signed URLs only, no direct S3/MinIO access |
| NFR-SEC-06 | Input validation | All user inputs validated (Zod schemas) |
| NFR-SEC-07 | SQL injection prevention | Prisma parameterized queries |
| NFR-SEC-08 | CSRF protection | SameSite cookies + CSRF token header |
| NFR-SEC-09 | API key encryption | User-provided OpenAI keys encrypted at rest (AES-256-GCM) |

### 7.3 Reliability

| # | Requirement | Target |
|---|-------------|--------|
| NFR-REL-01 | Uptime | 99.5% (allows 3.65 hours downtime/month) |
| NFR-REL-02 | Data durability | 99.99999999% (PostgreSQL + MinIO replication) |
| NFR-REL-03 | Job recovery | Failed jobs retry automatically, no data loss |
| NFR-REL-04 | Graceful degradation | Dashboard works even if processing is degraded |

### 7.4 Scalability

| # | Requirement | Target |
|---|-------------|--------|
| NFR-SCL-01 | User capacity (Year 1) | 100,000 registered users |
| NFR-SCL-02 | Horizontal scaling | All services stateless or state-in-Redis/PostgreSQL |
| NFR-SCL-03 | Storage capacity | 10TB initial, expandable |
| NFR-SCL-04 | Auto-scaling ready | Workers scale by queue depth |

### 7.5 Compliance & Legal

| # | Requirement | Details |
|---|-------------|---------|
| NFR-LEG-01 | YouTube ToS compliance | Respect robots.txt, no circumvention of access controls |
| NFR-LEG-02 | GDPR readiness | Data export, account deletion, consent management |
| NFR-LEG-03 | Copyright | Clear ToS: user responsible for content rights, not platform |

---

## 8. Technical Constraints

| # | Constraint | Rationale |
|---|-----------|-----------|
| TC-01 | Next.js 15 (App Router) | Pre-defined tech stack, best SSR/SSG story |
| TC-02 | NestJS (TypeScript) | Pre-defined backend framework, DDD-friendly |
| TC-03 | PostgreSQL via Prisma | Reliable relational DB, type-safe ORM |
| TC-04 | BullMQ + Redis | Battle-tested job queue for Node.js |
| TC-05 | S3-compatible (MinIO/dev, S3/prod) | Portable, no vendor lock-in |
| TC-06 | FFmpeg binary | Must be bundled in worker Docker images |
| TC-07 | yt-dlp binary | Must be bundled in download worker image |
| TC-08 | Faster Whisper (Python) | Requires Python runtime in transcription worker |
| TC-09 | OpenAI API (GPT-4o) | Primary AI engine for clip analysis |
| TC-10 | Docker for all services | Consistent dev/prod environment |
| TC-11 | Monorepo structure | apps/ + packages/ layout |

---

## 9. MVP Scope

### In MVP

| Feature | Status |
|---------|--------|
| Email/password registration + login | Yes |
| JWT httpOnly authentication | Yes |
| Paste YouTube URL -> create project | Yes |
| Automated download -> transcribe -> analyze -> generate clips | Yes |
| AI-selected highlight clips (3-10 per video) | Yes |
| Burned-in subtitles (white on black outline) | Yes |
| MP4 clip download (individual) | Yes |
| Preview clips in browser | Yes |
| Project status tracking (real-time via WebSocket) | Yes |
| Credit system (consumption per video) | Yes |
| Basic dashboard (project list + clip grid) | Yes |
| Free tier (5 credits/month) | Yes |
| Admin panel (user management) | Yes |

### OUT of MVP

| Feature | Target Version |
|---------|---------------|
| 9:16 vertical crop | V2 |
| Custom subtitle styling | V2 |
| Batch download (zip all clips) | V2 |
| Direct social media publishing | V3 |
| Multiple AI personas/styles | V2 |
| Team/workspace accounts | V4 |
| API for developers | V4 |
| Mobile app | V5 |
| Payment integration (Stripe) | V1 (hard-coded during MVP dev, integrated before public launch) |

---

## 10. Future Features

### V2 — "Creator Pro" (Month 3-4)
- 9:16 vertical crop with face tracking
- Custom subtitle styles (fonts, colors, animations)
- Batch download as ZIP
- AI persona selection (humorous, professional, dramatic)
- Multi-language support (10+ languages for transcription and subtitles)
- YouTube API integration (paste channel URL, process all videos)

### V3 — "Social Studio" (Month 5-7)
- Direct publishing to TikTok, Instagram Reels, YouTube Shorts
- Scheduled publishing
- Auto-hashtag and caption generation
- Platform-specific aspect ratios (1:1, 4:5, 9:16)
- Performance analytics of published clips
- A/B testing of clip variations

### V4 — "Agency Hub" (Month 8-10)
- Team accounts with role-based access (Admin, Editor, Viewer)
- Client workspaces
- Brand kit (logos, colors, fonts applied automatically)
- White-label exports
- API for programmatic access (REST + Webhooks)
- SSO (Google, GitHub, SAML)

### V5 — "Enterprise AI" (Month 11-14)
- Dedicated infrastructure
- Custom AI model fine-tuning
- SLA guarantees (99.9% uptime)
- SOC 2 compliance
- Usage-based billing with custom contracts
- AI Agent: auto-monitor YouTube channels and auto-clip new uploads
- Live stream clipping (near-real-time)
- API marketplace (3rd party integrations)

---

## 11. Database Overview

### Core Entities

```
users ---- projects ---- clips
  |           |           |
profiles   transcript   job_records
  |           |
subscript.  usage_log
  |
credits
  |
credit_transactions
```

### Key Tables (11 total)

| Table | Purpose | Key Fields |
|-------|---------|------------|
| `users` | Authentication | id, email, password_hash, is_active |
| `profiles` | User profile | id, user_id, display_name, avatar_key |
| `refresh_tokens` | JWT refresh storage | id, user_id, token_hash, expires_at |
| `subscriptions` | Plan management | id, user_id, plan, status |
| `credits` | Credit wallet | id, user_id, balance, rollover_credit |
| `credit_transactions` | Transaction ledger | id, user_id, type, amount |
| `projects` | YouTube URL processing | id, user_id, youtube_video_id, status |
| `transcript_segments` | Speech-to-text result | id, project_id, segment_index, text, start_time, end_time |
| `clips` | Generated clip outputs | id, project_id, user_id, engagement_score, video_key |
| `usage_logs` | Activity audit trail | id, user_id, project_id, action, credits_used |
| `job_records` | Async job tracking | id, bullmq_job_id, queue_name, status |

Full schema, indexes, and scalability design is in DATABASE-DESIGN.md.

---

## 12. API Overview

### REST API Structure

```
Base URL: https://api.clipyai.com/v1

Auth:
  POST   /auth/register              Register new user
  POST   /auth/login                 Login, returns JWT
  POST   /auth/refresh               Refresh access token
  POST   /auth/logout                Invalidate refresh token
  POST   /auth/forgot-password       Request password reset
  POST   /auth/reset-password        Reset password with token
  POST   /auth/verify-email          Verify email address

User:
  GET    /users/me                   Get current user profile
  PATCH  /users/me                   Update profile
  DELETE /users/me                   Delete account

Projects:
  GET    /projects                   List user's projects (paginated)
  POST   /projects                   Create project (submit YouTube URL)
  GET    /projects/:id               Get project details + status
  DELETE /projects/:id               Delete project and all clips
  POST   /projects/:id/cancel        Cancel processing
  POST   /projects/:id/retry         Retry failed project
  GET    /projects/:id/transcript    Get full transcript

Clips:
  GET    /projects/:id/clips         List clips for a project
  GET    /clips/:id                  Get clip details
  GET    /clips/:id/download         Redirect to pre-signed MP4 URL
  PATCH  /clips/:id                  Update clip (start/end time, title)
  DELETE /clips/:id                  Delete clip
  POST   /projects/:id/clips/create  Manually create a clip from transcript

Dashboard:
  GET    /dashboard/stats            User statistics
  GET    /dashboard/credits          Credit balance + history
  GET    /dashboard/usage            Usage history by month

Subscription:
  GET    /subscription               Current subscription
  POST   /subscription/upgrade       Upgrade to paid plan
  POST   /subscription/cancel        Cancel subscription
  POST   /subscription/byok          Register BYOK API key

Admin:
  GET    /admin/users                List all users
  GET    /admin/stats                Platform metrics
  POST   /admin/users/:id/credits    Adjust user credits
  POST   /admin/users/:id/ban        Ban/unban user
  GET    /admin/jobs                 Queue health + stats
```

### WebSocket

```
Endpoint: wss://api.clipyai.com/ws/projects/:id
Auth:     token query parameter

Server -> Client events:
  progress.update    { stage, percent, message }
  job.completed      { clipId, title }
  project.completed  { projectId }
  job.failed         { stage, error }
```

---

## 13. Dashboard Overview

### Main Dashboard (/dashboard)

```
+---------------------------------------------+
|  Welcome back, Alex!                        |
|                                             |
|  +----------+ +----------+ +----------+    |
|  | Projects | | Clips    | | Credits  |    |
|  |   12     | |   57     | |  18/30   |    |
|  | this mo  | | total    | |remaining |    |
|  +----------+ +----------+ +----------+    |
|                                             |
|  [████ Paste YouTube URL ████] [Go]        |
|                                             |
|  Recent Projects                            |
|  +---------------------------------------+  |
|  | "React 19 Deep Dive"  | Completed    |  |
|  | "Docker Crash Course" | Processing   |  |
|  | "TypeScript Tips #12" | Completed    |  |
|  +---------------------------------------+  |
+---------------------------------------------+
```

---

## 14. Subscription Plan

### Plan Tiers

| Feature | Free | Starter | Pro | Enterprise |
|---------|------|---------|-----|------------|
| **Price/month** | $0 | $19 | $49 | $199 |
| **Credits/month** | 5 | 30 | 100 | 500 |
| **Max video duration** | 30 min | 2 hours | 4 hours | 6 hours |
| **Clips per video** | Up to 5 | Up to 10 | Up to 15 | Up to 20 |
| **Clip resolution** | 720p | 1080p | 1080p | 4K |
| **BYOK mode** | No | No | Yes | Yes |
| **Subtitle customization** | No | Basic | Advanced | Full |
| **Priority processing** | No | No | Yes | Yes |
| **Batch download** | No | Yes | Yes | Yes |
| **Team accounts** | No | No | No | Yes |
| **API access** | No | No | No | Yes |
| **Dedicated support** | Community | Email | Priority Email | Slack + Phone |
| **SLA** | None | None | 99.5% | 99.9% |

### Upgrade Triggers

1. **Credit exhaustion**: "You've used 5/5 credits this month. Upgrade to Starter for 30 credits."
2. **Video too long**: "This video is 45 minutes. Free tier supports up to 30 minutes. Upgrade to process longer content."
3. **Feature wall**: "Want more than 5 clips? Upgrade to Pro for 15 clips per video."

---

## 15. Credits System

### Credit Model

**1 credit = processing 1 YouTube URL (regardless of clip count)**

### Credit Consumption Table

| Video Duration | Credits Consumed | Internal Cost (est.) |
|---------------|-----------------|---------------------|
| < 10 minutes | 1 credit | $0.15 |
| 10-30 minutes | 2 credits | $0.35 |
| 30-60 minutes | 4 credits | $0.80 |
| 1-2 hours | 6 credits | $1.50 |
| 2-4 hours | 10 credits | $2.80 |
| 4-6 hours | 15 credits | $4.50 |

### Credit Flow

```
User creates project
        |
        v
System checks credits.balance
        |
        v
If balance < required:  ->  Error + offer upgrade
        | (balance OK)
        v
System deducts credits
        |
        v
System creates credit_transaction (type: consumption, amount: -N)
        |
        v
Project begins processing
        |
        v
If project succeeds:  Done
If project fails:     Refund credits (type: refund, amount: +N)
```

### Monthly Rollover

- Unused credits roll over to next month
- Max rollover: 2x monthly allocation
- Example: Starter (30 credits/mo), max 60 credits total after rollover
- Rollover credits expire after 90 days if unused

### BYOK (Bring Your Own Key)

- User provides their own OpenAI API key
- When BYOK is active, AI analysis stage uses their key
- Download + transcribe + clip generation still consume credits (at 50% rate)
- Rationale: Compute costs for FFmpeg + Whisper are still our infrastructure

### Credit Top-Up

- Pro and Enterprise users can purchase credit packs
- $10 = 10 credits (never expires)
- Available in dashboard under Billing -> Top Up

---

## Document Control

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | 2026-07-31 | Senior PM | Initial draft |
