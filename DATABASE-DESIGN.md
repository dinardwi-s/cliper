# AI YouTube Auto Clipper — Database Design Document

**Document Version**: 1.0
**Status**: Draft
**Author**: Senior Database Architect
**Last Updated**: 2026-07-31

---

## Table of Contents

1. [Design Principles](#1-design-principles)
2. [Entity Relationship Diagram](#2-entity-relationship-diagram)
3. [Table Definitions](#3-table-definitions)
4. [Relationship Summary](#4-relationship-summary)
5. [Index Strategy](#5-index-strategy)
6. [Scalability Considerations](#6-scalability-considerations)

---

## 1. Design Principles

### Core Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| **Primary Key Type** | UUID v4 via `gen_random_uuid()` | Prevents enumeration attacks when exposed in API URLs. Safe for horizontal scaling and sharding. |
| **Timestamp Type** | `TIMESTAMPTZ` | Always stores UTC with timezone awareness. Avoids DST and timezone conversion bugs. |
| **Status Fields** | `VARCHAR` with `CHECK CONSTRAINT` | More flexible than PostgreSQL ENUM. No ALTER TYPE needed to add statuses. Indexed efficiently. |
| **Soft Deletes** | Not used (hard deletes only) | Simpler than soft-delete complexity. Data backed up before deletion. |
| **JSONB Usage** | Metadata columns only | Only for truly schema-flexible data (AI analysis results, YouTube metadata). Core fields are normalized. |
| **Auth vs Profile Separation** | Two tables: `users` + `profiles` | Clean architecture: auth credentials in one table, display data in another. No profile join needed for auth queries. |

### Naming Conventions

- Table names: `snake_case`, plural (`users`, `projects`)
- Column names: `snake_case` (`display_name`, `youtube_video_id`)
- Primary keys: `id` on every table
- Foreign keys: `{referenced_table}_id` (`user_id`, `project_id`)
- Indexes: `idx_{table}_{column(s)}` (`idx_projects_user_id_status`)
- Unique constraints: `uq_{table}_{column(s)}` (`uq_users_email`)

---

## 2. Entity Relationship Diagram

```
+---------------+       +------------------+       +------------------+
|    users      |       |    profiles      |       |  refresh_tokens  |
+---------------+       +------------------+       +------------------+
| id (PK)       |<--+   | id (PK)          |       | id (PK)          |
| email (UQ)    |   |   | user_id (FK,UQ)  |-------+ user_id (FK)    |
| password_hash |   +---| display_name     |       | token_hash (UQ)  |
| is_active     |       | avatar_key       |       | device_info      |
| is_admin      |       | timezone         |       | ip_address       |
| email_verif.. |       | created_at       |       | expires_at       |
| created_at    |       | updated_at       |       | revoked_at       |
| updated_at    |       +------------------+       | created_at       |
+---------------+                                   +------------------+
        |
        | 1:N
        |
+---------------+       +------------------+       +------------------+
| subscriptions |       |     credits      |       | credit_transact..|
+---------------+       +------------------+       +------------------+
| id (PK)       |       | id (PK)          |       | id (PK)          |
| user_id(FK,UQ)|       | user_id (FK,UQ)  |       | user_id (FK)    |
| plan          |       | balance          |       | type            |
| status        |       | rollover_credit  |       | amount           |
| starts_at     |       | rollover_expi..  |       | description     |
| ends_at       |       | created_at       |       | metadata (JSONB)|
| canceled_at   |       | updated_at       |       | created_at      |
| created_at    |       +------------------+       +------------------+
| updated_at    |
+---------------+
        |
        | 1:N
        |
        v
+---------------+
|   projects    |
+---------------+
| id (PK)       |
| user_id (FK)  |---------------------------------------------+
| youtube_url   |                                              |
| youtube_vid.. |---+                                          |
| title         |   |                                          |
| duration_sec..|   |                                          |
| thumbnail_url |   | 1:1 (same video_id)                     |
| status        |   | (deduplication check)                   |
| error_message |   |                                          |
| error_code    |   |                                          |
| credits_cons..|   |                                          |
| metadata (JB) |   |                                          |
| started_at    |   |                                          |
| completed_at  |   |                                          |
| created_at    |   |                                          |
| updated_at    |   |                                          |
+---------------+   |                                          |
        |           |                                          |
        | 1:N       |                                          |
        |           |                                          |
        v           v                                          |
+-------------------+       +------------------+               |
| transcript_segments      |       clips      |               |
+-------------------+       +------------------+               |
| id (PK)           |       | id (PK)          |               |
| project_id (FK)   |       | project_id (FK)  |               |
| segment_index     |       | user_id (FK)     |               |
| text              |       | title            |               |
| start_time        |       | start_time       |               |
| end_time          |       | end_time         |               |
| confidence        |       | duration_seconds |               |
| speaker           |       | engagement_score |               |
| created_at        |       | transcript_snip..|               |
+-------------------+       | ai_rationale     |               |
                            | video_key        |               |
                            | subtitle_key     |               |
                            | thumbnail_key    |               |
                            | status           |               |
                            | error_message    |               |
                            | retry_count      |               |
                            | max_retries      |               |
                            | created_at       |               |
                            | updated_at       |               |
                            +------------------+               |
                                    |                          |
                                    | 1:N                       |
                                    v                          |
                            +------------------+               |
                            |   job_records    |               |
                            +------------------+               |
                            | id (PK)          |               |
                            | bullmq_job_id    |               |
                            | queue_name       |               |
                            | job_name         |               |
                            | project_id (FK)  |--< (NULLABLE)--+
                            | clip_id (FK)     |--<
                            | status           |
                            | attempts         |
                            | max_attempts     |
                            | error_message    |
                            | result (JSONB)   |
                            | started_at       |
                            | completed_at     |
                            | created_at       |
                            +------------------+

+------------------+
|   usage_logs    |
+------------------+
| id (PK)          |
| user_id (FK)     |
| project_id (FK)  |--< (NULLABLE)
| action           |
| credits_used     |
| metadata (JSONB) |
| created_at       |
+------------------+
```

### Relationship Cardinalities Summary

```
users 1:1 profiles          (via users.id = profiles.user_id)
users 1:1 subscriptions     (via users.id = subscriptions.user_id)
users 1:1 credits           (via users.id = credits.user_id)
users 1:N refresh_tokens    (via users.id = refresh_tokens.user_id)
users 1:N projects          (via users.id = projects.user_id)
users 1:N usage_logs        (via users.id = usage_logs.user_id)
users 1:N credit_transact.  (via users.id = credit_transactions.user_id)
users 1:N clips             (via users.id = clips.user_id)

projects 1:N transcript_seg. (via projects.id = transcript_segments.project_id)
projects 1:N clips          (via projects.id = clips.project_id)
projects 1:N usage_logs     (via projects.id = usage_logs.project_id, nullable)
projects 1:N job_records    (via projects.id = job_records.project_id, nullable)

clips 1:N job_records       (via clips.id = job_records.clip_id, nullable)
```

---

## 3. Table Definitions

### 3.1 users

Authentication and authorization data. Separated from profiles for clean architecture.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | `UUID` | `PK DEFAULT gen_random_uuid()` | Primary key |
| `email` | `VARCHAR(320)` | `UNIQUE NOT NULL` | User email (RFC 5321 max length) |
| `password_hash` | `VARCHAR(255)` | `NOT NULL` | bcrypt hash with cost factor 12 |
| `is_active` | `BOOLEAN` | `NOT NULL DEFAULT true` | Soft-disable account |
| `is_admin` | `BOOLEAN` | `NOT NULL DEFAULT false` | Admin role flag |
| `email_verified_at` | `TIMESTAMPTZ` | | NULL until email is verified |
| `created_at` | `TIMESTAMPTZ` | `NOT NULL DEFAULT NOW()` | Account creation timestamp |
| `updated_at` | `TIMESTAMPTZ` | `NOT NULL DEFAULT NOW()` | Last update timestamp |

### 3.2 profiles

User-facing profile data. One-to-one with users.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | `UUID` | `PK DEFAULT gen_random_uuid()` | Primary key |
| `user_id` | `UUID` | `UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE` | FK to users |
| `display_name` | `VARCHAR(100)` | `NOT NULL` | Public display name |
| `avatar_key` | `VARCHAR(255)` | | S3/MinIO object key for avatar |
| `timezone` | `VARCHAR(50)` | `NOT NULL DEFAULT 'UTC'` | IANA timezone name |
| `created_at` | `TIMESTAMPTZ` | `NOT NULL DEFAULT NOW()` | Creation timestamp |
| `updated_at` | `TIMESTAMPTZ` | `NOT NULL DEFAULT NOW()` | Last update timestamp |

### 3.3 refresh_tokens

JWT refresh token storage with rotation support.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | `UUID` | `PK DEFAULT gen_random_uuid()` | Primary key |
| `user_id` | `UUID` | `NOT NULL REFERENCES users(id) ON DELETE CASCADE` | FK to users |
| `token_hash` | `VARCHAR(255)` | `UNIQUE NOT NULL` | SHA-256 hash of refresh token |
| `device_info` | `VARCHAR(500)` | | User agent string |
| `ip_address` | `INET` | | Client IP address |
| `expires_at` | `TIMESTAMPTZ` | `NOT NULL` | Token expiry (default 7 days) |
| `revoked_at` | `TIMESTAMPTZ` | | Set when token is revoked |
| `created_at` | `TIMESTAMPTZ` | `NOT NULL DEFAULT NOW()` | Creation timestamp |

### 3.4 subscriptions

User subscription plan tracking. One active subscription per user.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | `UUID` | `PK DEFAULT gen_random_uuid()` | Primary key |
| `user_id` | `UUID` | `UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE` | FK to users |
| `plan` | `VARCHAR(20)` | `NOT NULL CHECK (plan IN ('free', 'starter', 'pro', 'enterprise'))` | Plan tier |
| `status` | `VARCHAR(20)` | `NOT NULL CHECK (status IN ('active', 'past_due', 'canceled', 'expired'))` | Subscription state |
| `starts_at` | `TIMESTAMPTZ` | `NOT NULL` | Subscription start date |
| `ends_at` | `TIMESTAMPTZ` | | NULL for lifetime free or active recurring |
| `canceled_at` | `TIMESTAMPTZ` | | When user canceled (if status=canceled) |
| `created_at` | `TIMESTAMPTZ` | `NOT NULL DEFAULT NOW()` | Creation timestamp |
| `updated_at` | `TIMESTAMPTZ` | `NOT NULL DEFAULT NOW()` | Last update timestamp |

### 3.5 credits

User credit wallet. Single row per user.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | `UUID` | `PK DEFAULT gen_random_uuid()` | Primary key |
| `user_id` | `UUID` | `UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE` | FK to users |
| `balance` | `INTEGER` | `NOT NULL DEFAULT 0 CHECK (balance >= 0)` | Current credit balance |
| `rollover_credit` | `INTEGER` | `NOT NULL DEFAULT 0` | Credits rolled over from previous month |
| `rollover_expires_at` | `TIMESTAMPTZ` | | When rollover credits expire |
| `created_at` | `TIMESTAMPTZ` | `NOT NULL DEFAULT NOW()` | Creation timestamp |
| `updated_at` | `TIMESTAMPTZ` | `NOT NULL DEFAULT NOW()` | Last update timestamp |

### 3.6 credit_transactions

Full audit ledger of all credit changes. Immutable after creation.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | `UUID` | `PK DEFAULT gen_random_uuid()` | Primary key |
| `user_id` | `UUID` | `NOT NULL REFERENCES users(id) ON DELETE CASCADE` | FK to users |
| `type` | `VARCHAR(20)` | `NOT NULL CHECK (type IN ('subscription', 'top_up', 'admin_grant', 'consumption', 'refund', 'rollover'))` | Transaction type |
| `amount` | `INTEGER` | `NOT NULL` | Positive = credit added, negative = deducted |
| `description` | `VARCHAR(500)` | | Human-readable description |
| `metadata` | `JSONB` | | Flexible additional data (project_id, plan, etc.) |
| `created_at` | `TIMESTAMPTZ` | `NOT NULL DEFAULT NOW()` | Transaction timestamp (immutable) |

### 3.7 projects

Core entity representing one YouTube URL processing request.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | `UUID` | `PK DEFAULT gen_random_uuid()` | Primary key |
| `user_id` | `UUID` | `NOT NULL REFERENCES users(id) ON DELETE CASCADE` | FK to users |
| `youtube_url` | `VARCHAR(2048)` | `NOT NULL` | Original YouTube URL |
| `youtube_video_id` | `VARCHAR(20)` | `NOT NULL` | Extracted YouTube video ID (e.g., "dQw4w9WgXcQ") |
| `title` | `VARCHAR(500)` | | Video title from YouTube metadata |
| `duration_seconds` | `INTEGER` | | Video duration in seconds |
| `thumbnail_url` | `VARCHAR(2048)` | | Original YouTube thumbnail URL |
| `status` | `VARCHAR(30)` | `NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'downloading', 'downloaded', 'transcribing', 'transcribed', 'analyzing', 'analyzed', 'generating_clips', 'completed', 'failed', 'cancelled'))` | Processing pipeline status |
| `error_message` | `TEXT` | | Human-readable error description |
| `error_code` | `VARCHAR(50)` | | Machine-readable error code |
| `credits_consumed` | `INTEGER` | `NOT NULL DEFAULT 0` | Credits deducted for this project |
| `metadata` | `JSONB` | | Flexible: raw YouTube metadata, AI analysis summary, etc. |
| `started_at` | `TIMESTAMPTZ` | | When processing actually began |
| `completed_at` | `TIMESTAMPTZ` | | When processing finished (success or fail) |
| `created_at` | `TIMESTAMPTZ` | `NOT NULL DEFAULT NOW()` | Creation timestamp |
| `updated_at` | `TIMESTAMPTZ` | `NOT NULL DEFAULT NOW()` | Last update timestamp |

### 3.8 transcript_segments

Speech-to-text result segments. One project has many segments.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | `UUID` | `PK DEFAULT gen_random_uuid()` | Primary key |
| `project_id` | `UUID` | `NOT NULL REFERENCES projects(id) ON DELETE CASCADE` | FK to projects |
| `segment_index` | `INTEGER` | `NOT NULL` | Sequential index within the transcript |
| `text` | `TEXT` | `NOT NULL` | Transcribed text segment |
| `start_time` | `DOUBLE PRECISION` | `NOT NULL` | Start time in seconds (e.g., 12.45) |
| `end_time` | `DOUBLE PRECISION` | `NOT NULL` | End time in seconds |
| `confidence` | `DOUBLE PRECISION` | | Whisper confidence score (0.0 to 1.0) |
| `speaker` | `VARCHAR(100)` | | Optional speaker label (future: diarization) |
| `created_at` | `TIMESTAMPTZ` | `NOT NULL DEFAULT NOW()` | Creation timestamp |

### 3.9 clips

Generated clip output. One project has many clips.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | `UUID` | `PK DEFAULT gen_random_uuid()` | Primary key |
| `project_id` | `UUID` | `NOT NULL REFERENCES projects(id) ON DELETE CASCADE` | FK to projects |
| `user_id` | `UUID` | `NOT NULL REFERENCES users(id) ON DELETE CASCADE` | FK to users (denormalized for query convenience) |
| `title` | `VARCHAR(500)` | `NOT NULL` | AI-generated clip title |
| `start_time` | `DOUBLE PRECISION` | `NOT NULL` | Clip start time in source video (seconds) |
| `end_time` | `DOUBLE PRECISION` | `NOT NULL` | Clip end time in source video (seconds) |
| `duration_seconds` | `DOUBLE PRECISION` | `NOT NULL` | Clip duration (end_time - start_time) |
| `engagement_score` | `INTEGER` | `CHECK (engagement_score BETWEEN 1 AND 100)` | AI-assigned engagement score |
| `transcript_snippet` | `TEXT` | | Combined transcript text for this clip segment |
| `ai_rationale` | `TEXT` | | Why the AI chose this moment (from GPT-4o) |
| `video_key` | `VARCHAR(255)` | | S3/MinIO object key for rendered MP4 |
| `subtitle_key` | `VARCHAR(255)` | | S3/MinIO object key for SRT/VTT subtitle file |
| `thumbnail_key` | `VARCHAR(255)` | | S3/MinIO object key for thumbnail image |
| `status` | `VARCHAR(30)` | `NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'queued', 'generating', 'completed', 'failed'))` | Clip generation status |
| `error_message` | `TEXT` | | Error description if status=failed |
| `retry_count` | `INTEGER` | `NOT NULL DEFAULT 0` | Number of generation retries |
| `max_retries` | `INTEGER` | `NOT NULL DEFAULT 3` | Max retries before marking as failed |
| `created_at` | `TIMESTAMPTZ` | `NOT NULL DEFAULT NOW()` | Creation timestamp |
| `updated_at` | `TIMESTAMPTZ` | `NOT NULL DEFAULT NOW()` | Last update timestamp |

### 3.10 usage_logs

Immutable audit trail for every user action.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | `UUID` | `PK DEFAULT gen_random_uuid()` | Primary key |
| `user_id` | `UUID` | `NOT NULL REFERENCES users(id) ON DELETE CASCADE` | FK to users |
| `project_id` | `UUID` | `REFERENCES projects(id) ON DELETE SET NULL` | FK to projects (nullable: nullable for non-project actions) |
| `action` | `VARCHAR(50)` | `NOT NULL` | Action type (e.g., project_created, clip_downloaded) |
| `credits_used` | `INTEGER` | `NOT NULL DEFAULT 0` | Credits consumed by this action |
| `metadata` | `JSONB` | | Flexible additional data |
| `created_at` | `TIMESTAMPTZ` | `NOT NULL DEFAULT NOW()` | Event timestamp (immutable) |

### 3.11 job_records

Tracks async BullMQ job execution for observability and recovery.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | `UUID` | `PK DEFAULT gen_random_uuid()` | Primary key |
| `bullmq_job_id` | `VARCHAR(100)` | `NOT NULL` | BullMQ job ID |
| `queue_name` | `VARCHAR(50)` | `NOT NULL` | Queue name (download, transcribe, analyze, clipgen) |
| `job_name` | `VARCHAR(100)` | `NOT NULL` | Job handler name |
| `project_id` | `UUID` | `REFERENCES projects(id) ON DELETE SET NULL` | FK to projects (nullable) |
| `clip_id` | `UUID` | `REFERENCES clips(id) ON DELETE SET NULL` | FK to clips (nullable) |
| `status` | `VARCHAR(30)` | `NOT NULL DEFAULT 'queued' CHECK (status IN ('queued', 'active', 'completed', 'failed', 'delayed'))` | Job status |
| `attempts` | `INTEGER` | `NOT NULL DEFAULT 0` | Number of execution attempts |
| `max_attempts` | `INTEGER` | `NOT NULL DEFAULT 3` | Max attempts before dead letter |
| `error_message` | `TEXT` | | Error message if failed |
| `result` | `JSONB` | | Job result data |
| `started_at` | `TIMESTAMPTZ` | | When job execution began |
| `completed_at` | `TIMESTAMPTZ` | | When job completed |
| `created_at` | `TIMESTAMPTZ` | `NOT NULL DEFAULT NOW()` | Creation timestamp |

---

## 4. Relationship Summary

### Foreign Key Actions

| Relationship | On Delete | On Update | Rationale |
|---|---|---|---|
| `profiles.user_id -> users.id` | CASCADE | CASCADE | Profile has no meaning without user |
| `refresh_tokens.user_id -> users.id` | CASCADE | CASCADE | Orphan tokens are security risk |
| `subscriptions.user_id -> users.id` | CASCADE | CASCADE | Subscription meaningless without user |
| `credits.user_id -> users.id` | CASCADE | CASCADE | Credits wallet doesn't exist independently |
| `credit_transactions.user_id -> users.id` | CASCADE | CASCADE | Preserve full user lifecycle |
| `projects.user_id -> users.id` | CASCADE | CASCADE | Projects are user-owned data |
| `transcript_segments.project_id -> projects.id` | CASCADE | CASCADE | Segments don't exist outside project |
| `clips.project_id -> projects.id` | CASCADE | CASCADE | Clips don't exist outside project |
| `clips.user_id -> users.id` | CASCADE | CASCADE | Denormalized FK, clean up on user delete |
| `usage_logs.user_id -> users.id` | CASCADE | CASCADE | Logs meaningless without user |
| `usage_logs.project_id -> projects.id` | SET NULL | NO ACTION | Logs remain for reference even if project deleted |
| `job_records.project_id -> projects.id` | SET NULL | NO ACTION | Jobs may outlive project |
| `job_records.clip_id -> clips.id` | SET NULL | NO ACTION | Jobs may outlive clip |


---

## 5. Index Strategy

### 5.1 Index Inventory

**CRITICAL NOTE**: PostgreSQL does NOT automatically create indexes on Foreign Key columns. Every FK must be explicitly indexed unless covered by a composite index.

#### users

| Index Name | Column(s) | Type | Purpose |
|---|---|---|---|
| `users_pkey` | `id` | UNIQUE (PK) | Primary key |
| `uq_users_email` | `email` | UNIQUE | Unique email enforcement + login lookup |

#### profiles

| Index Name | Column(s) | Type | Purpose |
|---|---|---|---|
| `profiles_pkey` | `id` | UNIQUE (PK) | Primary key |
| `uq_profiles_user_id` | `user_id` | UNIQUE | FK uniqueness (1:1) |
*Covered by UNIQUE constraint, no separate FK index needed.*

#### refresh_tokens

| Index Name | Column(s) | Type | Purpose |
|---|---|---|---|
| `refresh_tokens_pkey` | `id` | UNIQUE (PK) | Primary key |
| `uq_refresh_tokens_token_hash` | `token_hash` | UNIQUE | Token lookup during refresh |
| `idx_refresh_tokens_user_id` | `user_id` | BTREE | FK: find all tokens for a user |
| `idx_refresh_tokens_expires_at` | `expires_at` | BTREE | Scheduled cleanup of expired tokens |

#### subscriptions

| Index Name | Column(s) | Type | Purpose |
|---|---|---|---|
| `subscriptions_pkey` | `id` | UNIQUE (PK) | Primary key |
| `uq_subscriptions_user_id` | `user_id` | UNIQUE | One active sub per user |
| `idx_subscriptions_plan` | `plan` | BTREE | Admin: count users per plan |
*Covered by UNIQUE constraint.*

#### credits

| Index Name | Column(s) | Type | Purpose |
|---|---|---|---|
| `credits_pkey` | `id` | UNIQUE (PK) | Primary key |
| `uq_credits_user_id` | `user_id` | UNIQUE | One wallet per user |
*Covered by UNIQUE constraint.*

#### credit_transactions (HIGH WRITE VOLUME)

| Index Name | Column(s) | Type | Purpose |
|---|---|---|---|
| `credit_transactions_pkey` | `id` | UNIQUE (PK) | Primary key |
| `idx_ct_user_id_created_at` | `user_id, created_at DESC` | BTREE | **Critical**: user transaction history pagination |
*Composite index covers FK + most common query in one index.*

#### projects (HIGH READ + HIGH WRITE)

| Index Name | Column(s) | Type | Purpose |
|---|---|---|---|
| `projects_pkey` | `id` | UNIQUE (PK) | Primary key |
| `idx_projects_user_id_status` | `user_id, status` | BTREE | **Critical**: "show my projects filtered by status" |
| `idx_projects_user_id_created_at` | `user_id, created_at DESC` | BTREE | **Critical**: user project list pagination |
| `idx_projects_youtube_video_id` | `youtube_video_id` | BTREE | Deduplication check per user |
| `idx_projects_status` | `status` | BTREE | Admin: monitor processing pipeline |
| `idx_projects_created_at` | `created_at DESC` | BTREE | Admin: recent activity |

#### transcript_segments (HIGHEST WRITE VOLUME)

| Index Name | Column(s) | Type | Purpose |
|---|---|---|---|
| `transcript_segments_pkey` | `id` | UNIQUE (PK) | Primary key |
| `uq_ts_project_id_segment_idx` | `project_id, segment_index` | UNIQUE | **Critical**: prevent duplicate segments + ordered retrieval |
*UNIQUE composite index covers both FK and the most critical query: fetching all segments for a project in order.*

#### clips

| Index Name | Column(s) | Type | Purpose |
|---|---|---|---|
| `clips_pkey` | `id` | UNIQUE (PK) | Primary key |
| `idx_clips_project_id_score` | `project_id, engagement_score DESC` | BTREE | **Critical**: "get all clips for a project sorted by quality" |
| `idx_clips_user_id_created_at` | `user_id, created_at DESC` | BTREE | User clip gallery paginated |
| `idx_clips_status` | `status` | BTREE | Monitor clip generation queue |

#### usage_logs (HIGH WRITE)

| Index Name | Column(s) | Type | Purpose |
|---|---|---|---|
| `usage_logs_pkey` | `id` | UNIQUE (PK) | Primary key |
| `idx_ul_user_id_created_at` | `user_id, created_at DESC` | BTREE | **Critical**: user audit trail paginated |
| `idx_ul_project_id` | `project_id` | BTREE | FK: find logs for a project |

#### job_records

| Index Name | Column(s) | Type | Purpose |
|---|---|---|---|
| `job_records_pkey` | `id` | UNIQUE (PK) | Primary key |
| `idx_jr_bullmq_job_id` | `bullmq_job_id` | BTREE | Lookup by BullMQ ID |
| `idx_jr_queue_name_status` | `queue_name, status` | BTREE | Queue monitoring dashboard |
| `idx_jr_project_id` | `project_id` | BTREE | FK: find jobs for a project |
| `idx_jr_clip_id` | `clip_id` | BTREE | FK: find jobs for a clip |

### 5.2 Index Statistics

| Category | Count |
|---|---|
| Total Indexes | 29 |
| Primary Key Indexes | 11 |
| Unique Constraint Indexes | 6 |
| Composite (multi-column) Indexes | 8 |
| Single-column BTREE Indexes | 4 |

### 5.3 Performance Rationale for Key Indexes

**`idx_projects_user_id_status` — most critical index in the application**

```sql
-- This query runs on EVERY dashboard load:
SELECT * FROM projects
WHERE user_id = $1 AND status IN ('completed', 'failed', 'cancelled')
ORDER BY created_at DESC
LIMIT 20;

-- Without this index: sequential scan across all projects
-- With this index: index-only scan, O(log n)
```

**`uq_ts_project_id_segment_idx` — ensures data integrity + query performance**

```sql
-- Fetch transcript in order (every time clip is being generated):
SELECT * FROM transcript_segments
WHERE project_id = $1
ORDER BY segment_index ASC;

-- UNIQUE prevents duplicate segments from retry bugs
-- Composite index: project_id is leading edge, segment_index is ordered
```

**`idx_clips_project_id_score` — critical for user experience**

```sql
-- Get top clips for a project (most common clip view):
SELECT * FROM clips
WHERE project_id = $1
ORDER BY engagement_score DESC;

-- The DESC on score means PG can read the index backwards
-- User sees best clips first without sorting
```

### 5.4 Indexes NOT Created (and why)

| Proposed Index | Rejected Because | Alternative |
|---|---|---|
| `projects(youtube_url)` | URL can be 2048 chars, too large for BTREE. Query by video_id instead. | `idx_projects_youtube_video_id` |
| `transcript_segments(start_time)` | Range queries on DO columns not common in this app. Search by project_id. | Segment index ordered by `segment_index` |
| Full-text search on `clips.title` | No user-visible full-text search in MVP. | Add in V2 if needed |
| `clips(engagement_score)` alone | Always queried with project_id. | Covered by `idx_clips_project_id_score` |
| `credit_transactions(created_at)` alone | Always queried with user_id. | Covered by `idx_ct_user_id_created_at` |

---

## 6. Scalability Considerations

### 6.1 Table Growth Projections

Estimates assume 100,000 active users processing an average of 3 videos/month.

| Table | Rows/User/Month | Monthly Growth | Year 1 Total | Growth Class |
|-------|----------------|---------------|-------------|-------------|
| `users` | N/A (one-time) | ~8,000 new | 100,000 | Low |
| `profiles` | N/A (one-time) | ~8,000 new | 100,000 | Low |
| `refresh_tokens` | ~3 | ~300,000 | ~3,600,000 | Medium |
| `subscriptions` | N/A (one-time) | ~8,000 new | 100,000 | Low |
| `credits` | N/A (one-time) | ~8,000 new | 100,000 | Low |
| `projects` | ~3 | ~300,000 | ~3,600,000 | Medium |
| `transcript_segments` | ~300 | ~30,000,000 | ~360,000,000 | **High** |
| `clips` | ~15 | ~1,500,000 | ~18,000,000 | Medium-High |
| `credit_transactions` | ~6 | ~600,000 | ~7,200,000 | Medium |
| `usage_logs` | ~10 | ~1,000,000 | ~12,000,000 | Medium |
| `job_records` | ~20 | ~2,000,000 | ~24,000,000 | Medium-High |

### 6.2 Partitioning Strategy

**Tables requiring partitioning (by Year 1):**

```
transcript_segments   -> Partition by RANGE (created_at) MONTHLY
                        360M rows/year, this is the fastest-growing table.
                        Each partition ~30M rows.
                        Monthly retention: keep 12 months of partitions.
                        Older partitions: archive to cold storage.

usage_logs            -> Partition by RANGE (created_at) MONTHLY
                        12M rows/year. Moderate growth but heavy append.
                        Monthly partitions simplify retention (drop old months).

credit_transactions   -> Partition by RANGE (created_at) MONTHLY
                        7.2M rows/year. Similar to usage_logs.
                        Required for compliance/audit retention.
```

```sql
-- Example: transcript_segments partitioning
CREATE TABLE transcript_segments (
    id UUID DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL,
    segment_index INTEGER NOT NULL,
    text TEXT NOT NULL,
    start_time DOUBLE PRECISION NOT NULL,
    end_time DOUBLE PRECISION NOT NULL,
    confidence DOUBLE PRECISION,
    speaker VARCHAR(100),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
) PARTITION BY RANGE (created_at);

-- Monthly partitions
CREATE TABLE transcript_segments_2026_01
    PARTITION OF transcript_segments
    FOR VALUES FROM ('2026-01-01') TO ('2026-02-01');

CREATE TABLE transcript_segments_2026_02
    PARTITION OF transcript_segments
    FOR VALUES FROM ('2026-02-01') TO ('2026-03-01');
-- ... and so on
```

**Tables NOT partitioned (and why):**
- `users`, `profiles`, `subscriptions`, `credits`: < 1M rows, partition overhead not worth it
- `projects`, `clips`: 3-18M rows/year, manageable with proper indexes
- `refresh_tokens`, `job_records`: Can be cleaned periodically (no long-term retention needed)

### 6.3 Connection Pooling

```
App Tier                         Database Tier
                                +-------------+
+-------------+                 | PgBouncer   |
| NestJS API  |----+            | (pool: 25   |
| (instances) |    |            |  per pod)   |
+-------------+    |   +------->+-------------+
                   |   |                    |
+-------------+    |   |   +----------------+-----------+
| Worker DL   |----+   |   |                            |
+-------------+        |   |   +-------------+          |
                   +---+---+--->+ PostgreSQL  |          |
+-------------+        |       |   Primary    |          |
| Worker TR   |--------+       |   (r/w)      |          |
+-------------+                +-------------+          |
                                                         |
+-------------+                +-------------+          |
| Worker CG   |---(read)------>+ PostgreSQL  |          |
| (multiple)  |                |   Read       |----------+
+-------------+                |   Replica    |
                               +-------------+
```

**PgBouncer configuration:**

| Setting | Value | Rationale |
|---------|-------|-----------|
| `pool_mode` | `transaction` | Safest for Prisma/framework connections |
| `default_pool_size` | `25` | Per backend pod |
| `max_client_conn` | `500` | Total across all pools |
| `reserve_pool_size` | `5` | Emergency reserve |
| `reserve_pool_timeout` | `3` | Fail fast if overloaded |

**Prisma connection limits:**
- API server: `connection_limit=10` per instance
- Workers: `connection_limit=5` per worker (they hold connections longer)
- Total across 5 API + 8 workers: ~90 connections max, well within PgBouncer limits

### 6.4 Read Replica Strategy

```
Primary (Writes)                    Replica (Reads)
+-------------------+               +-------------------+
| Projects CRUD     |               | Dashboard stats   |
| Credits deduction |               | Project listing   |
| Status updates    |               | Clip gallery      |
| Transcript insert |               | Usage history     |
| Clip results      |               | Admin reports     |
| Usage logging     |               | Search queries    |
+-------------------+               +-------------------+
```

**Replica routing in Prisma:**
```typescript
// prisma.service.ts - simplified
const datasources = {
  primary: process.env.DATABASE_URL,
  replica: process.env.DATABASE_URL_REPLICA,
};

// Write operations -> primary
// Read operations -> replica (with eventual consistency acceptable)
```

### 6.5 Data Retention & Archival

| Table | Retention | Action | Trigger |
|-------|-----------|--------|---------|
| `transcript_segments` | 12 months | Drop old partitions | Monthly cron |
| `usage_logs` | 24 months (compliance) | Archive to S3, then drop | Quarterly |
| `credit_transactions` | 7 years (tax compliance) | Archive to S3, keep in DB | Yearly |
| `refresh_tokens` | 30 days | DELETE expired | Daily cron |
| `job_records` | 90 days | DELETE completed | Daily cron |
| `raw-videos` (MinIO) | 72 hours | DELETE | MinIO lifecycle policy |

### 6.6 Maintenance Strategy

| Task | Schedule | Command |
|------|----------|---------|
| **VACUUM ANALYZE** | Daily (low-traffic hours) | `VACUUM ANALYZE` on high-churn tables |
| **REINDEX** | Weekly (for partitioned tables) | `REINDEX TABLE CONCURRENTLY` |
| **Statistics update** | After large inserts | `ANALYZE transcript_segments` after full video transcript |
| **Dead tuple check** | Weekly monitoring | `SELECT n_dead_tup FROM pg_stat_user_tables WHERE n_dead_tup > 10000` |

### 6.7 Backup Strategy

```
Frequency    Type            Retention    Storage
----------   ----            ---------    -------
Daily        Full + WAL      7 days       MinIO (same cluster, separate bucket)
Weekly       Full            4 weeks      MinIO + S3 Glacier
Monthly      Full            12 months    S3 Glacier Deep Archive
```

**pg_dump vs pg_basebackup:**
- `pg_basebackup` for full cluster backups (point-in-time recovery)
- `pg_dump` for individual database exports (schema only or specific tables)
- WAL archiving enabled for PITR up to the second

### 6.8 Future Sharding (Post-Year-2)

When single PostgreSQL instance reaches ~1TB or >500M rows in hot tables:

```
Shard Key: user_id (consistent hashing)

Shard 0              Shard 1              Shard 2              Shard 3
(users A-F)          (users G-M)          (users N-T)          (users U-Z)
+-----------+        +-----------+        +-----------+        +-----------+
| users     |        | users     |        | users     |        | users     |
| profiles  |        | profiles  |        | profiles  |        | profiles  |
| projects  |        | projects  |        | projects  |        | projects  |
| clips     |        | clips     |        | clips     |        | clips     |
| ...       |        | ...       |        | ...       |        | ...       |
+-----------+        +-----------+        +-----------+        +-----------+
```

**Sharding approach:** Application-level routing via Prisma multi-datasource. A lookup service maps `user_id -> shard_number`. All queries include `user_id` as the first filter predicate.

**Why user_id as shard key:**
- Every query in this application includes user_id (multi-tenant architecture)
- All related entities (projects, clips, segments) share the same user_id context
- No cross-shard joins needed for user-facing queries
- Admin queries (cross-shard) can be handled by a separate reporting database

---

## Document Control

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | 2026-07-31 | Senior DB Architect | Initial design - 11 tables, 29 indexes |
