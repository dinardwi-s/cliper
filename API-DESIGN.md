# AI YouTube Auto Clipper — REST API Design

**Document Version**: 1.0
**Author**: Senior API Architect
**Last Updated**: 2026-07-31

---

## Table of Contents

1. [API Conventions](#1-api-conventions)
2. [Authentication](#2-authentication)
3. [Users & Profile](#3-users--profile)
4. [Projects](#4-projects)
5. [Clips](#5-clips)
6. [Transcript](#6-transcript)
7. [Dashboard & History](#7-dashboard--history)
8. [Subscription & Billing](#8-subscription--billing)
9. [Credits](#9-credits)
10. [Admin](#10-admin)
11. [WebSocket Events](#11-websocket-events)
12. [Error Codes Reference](#12-error-codes-reference)


## 1. API Conventions

### Base URL
```
Development:  http://localhost:4000/v1
Production:   https://api.clipyai.com/v1
```

### Authentication
All endpoints except register/login require:
```
Cookie: access_token=<jwt>
```
Or for programmatic access (future):
```
Authorization: Bearer <jwt>
```

### Response Envelope
```json
// SUCCESS
{
  "data": { ... },
  "meta": {
    "page": 1,
    "limit": 20,
    "total": 57,
    "totalPages": 3
  },
  "timestamp": "2026-07-31T10:30:00.000Z"
}

// ERROR
{
  "statusCode": 400,
  "error": "Bad Request",
  "code": "VALIDATION_ERROR",
  "message": "YouTube URL format is invalid",
  "details": [
    {
      "field": "youtubeUrl",
      "message": "Must be a valid YouTube URL (youtube.com or youtu.be)"
    }
  ],
  "timestamp": "2026-07-31T10:30:00.000Z",
  "path": "/v1/projects"
}

// ERROR (simple)
{
  "statusCode": 404,
  "error": "Not Found",
  "code": "RESOURCE_NOT_FOUND",
  "message": "Project with id 'xxx' not found",
  "timestamp": "2026-07-31T10:30:00.000Z",
  "path": "/v1/projects/xxx"
}
```

### HTTP Status Codes Used
| Code | Meaning |
|------|---------|
| 200 | OK — Request succeeded |
| 201 | Created — Resource created successfully |
| 204 | No Content — Success with no response body (logout, delete) |
| 302 | Found — Redirect to download URL |
| 400 | Bad Request — Invalid input, validation failure |
| 401 | Unauthorized — Missing or expired JWT |
| 403 | Forbidden — Insufficient permissions or credit |
| 404 | Not Found — Resource does not exist |
| 409 | Conflict — Duplicate resource, state conflict |
| 422 | Unprocessable — Business rule violation |
| 429 | Too Many Requests — Rate limit exceeded |
| 500 | Internal Server Error — Unexpected server error |

### Pagination
All list endpoints accept:
```
?page=1&limit=20&sort=createdAt&order=desc
```
Response includes `meta` object with pagination info.

---

## 2. Authentication

### POST /v1/auth/register

Register a new user account.

**Method**: `POST`
**Route**: `/v1/auth/register`
**Auth**: Public
**Permission**: None

**Request Body**:
```json
{
  "email": "alex@example.com",
  "password": "SecureP@ss1",
  "displayName": "Alex Creator"
}
```

**Validation**:
| Field | Rules |
|-------|-------|
| `email` | Required, valid email format, max 320 chars, unique |
| `password` | Required, min 8 chars, must include uppercase + lowercase + number |
| `displayName` | Required, min 2 chars, max 100 chars, alphanumeric + spaces |

**Response** `201 Created`:
```json
{
  "data": {
    "user": {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "email": "alex@example.com",
      "isActive": true,
      "createdAt": "2026-07-31T10:30:00.000Z"
    },
    "profile": {
      "displayName": "Alex Creator",
      "timezone": "UTC"
    },
    "tokens": {
      "accessToken": "eyJhbGciOi...",
      "refreshToken": "dGhpcyBpcyBh...",
      "expiresIn": 900
    }
  },
  "timestamp": "2026-07-31T10:30:00.000Z"
}
```

**Errors**:
| Code | Message |
|------|---------|
| 400 | `VALIDATION_ERROR` | Invalid email format, password too weak, etc. |
| 409 | `EMAIL_EXISTS` | An account with this email already exists |
| 429 | `RATE_LIMITED` | Too many registration attempts |

---

### POST /v1/auth/login

Authenticate user and return JWT tokens.

**Method**: `POST`
**Route**: `/v1/auth/login`
**Auth**: Public
**Permission**: None

**Request Body**:
```json
{
  "email": "alex@example.com",
  "password": "SecureP@ss1"
}
```

**Validation**:
| Field | Rules |
|-------|-------|
| `email` | Required, valid email format |
| `password` | Required, non-empty |

**Response** `200 OK`:
```json
{
  "data": {
    "user": {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "email": "alex@example.com",
      "isActive": true
    },
    "profile": {
      "displayName": "Alex Creator",
      "avatarKey": "avatars/550e8400-profile.jpg",
      "timezone": "Asia/Jakarta"
    },
    "tokens": {
      "accessToken": "eyJhbGciOi...",
      "refreshToken": "dGhpcyBpcyBh...",
      "expiresIn": 900
    }
  },
  "timestamp": "2026-07-31T10:30:00.000Z"
}
```

**Response Headers**:
```
Set-Cookie: access_token=<jwt>; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=900
Set-Cookie: refresh_token=<jwt>; HttpOnly; Secure; SameSite=Strict; Path=/v1/auth/refresh; Max-Age=604800
```

**Errors**:
| Code | Message |
|------|---------|
| 401 | `INVALID_CREDENTIALS` | Email or password is incorrect |
| 403 | `ACCOUNT_DISABLED` | Account has been deactivated |
| 403 | `EMAIL_NOT_VERIFIED` | Email verification required before login |
| 429 | `RATE_LIMITED` | Too many login attempts |

---

### POST /v1/auth/refresh

Refresh an expired access token using refresh token rotation.

**Method**: `POST`
**Route**: `/v1/auth/refresh`
**Auth**: Refresh token (from cookie)
**Permission**: None

**Request**: No body required. Refresh token read from httpOnly cookie.

**Response** `200 OK`:
```json
{
  "data": {
    "accessToken": "eyJhbGciOi...",
    "refreshToken": "new-refresh-token...",
    "expiresIn": 900
  },
  "timestamp": "2026-07-31T10:45:00.000Z"
}
```

**Response Headers**: New Set-Cookie headers for access_token and refresh_token.

**Errors**:
| Code | Message |
|------|---------|
| 401 | `INVALID_REFRESH_TOKEN` | Token is expired, revoked, or not found |
| 401 | `TOKEN_REUSE_DETECTED` | This refresh token was already used (rotation breach) |

**Notes**:
- Refresh token rotation: old token is revoked, new token issued on every refresh
- If a revoked token is reused, ALL user's refresh tokens are revoked (security measure against token theft)

---

### POST /v1/auth/logout

Invalidate current refresh token (logout).

**Method**: `POST`
**Route**: `/v1/auth/logout`
**Auth**: Bearer JWT (access token)
**Permission**: `authenticated`

**Response** `204 No Content`

**Response Headers**: Clear-Site-Data or expired cookie headers (clears access_token + refresh_token cookies).

**Errors**:
| Code | Message |
|------|---------|
| 401 | `UNAUTHORIZED` | Missing or invalid access token |

---

### POST /v1/auth/forgot-password

Send password reset email.

**Method**: `POST`
**Route**: `/v1/auth/forgot-password`
**Auth**: Public
**Permission**: None

**Request Body**:
```json
{
  "email": "alex@example.com"
}
```

**Response** `200 OK`:
```json
{
  "data": {
    "message": "If an account with this email exists, a password reset link has been sent."
  },
  "timestamp": "2026-07-31T10:30:00.000Z"
}
```

**Notes**:
- Always returns 200 regardless of whether the email exists (prevents email enumeration)
- Reset token expires in 1 hour
- Rate limited: max 3 requests per hour per IP

---

### POST /v1/auth/reset-password

Reset password using token from email.

**Method**: `POST`
**Route**: `/v1/auth/reset-password`
**Auth**: Public
**Permission**: None

**Request Body**:
```json
{
  "token": "reset-token-from-email",
  "password": "NewSecureP@ss2"
}
```

**Response** `200 OK`:
```json
{
  "data": {
    "message": "Password has been reset successfully."
  },
  "timestamp": "2026-07-31T10:30:00.000Z"
}
```

**Errors**:
| Code | Message |
|------|---------|
| 400 | `INVALID_TOKEN` | Token is expired, invalid, or already used |
| 422 | `SAME_PASSWORD` | New password must be different from current |

---

### POST /v1/auth/verify-email

Verify email address using token sent after registration.

**Method**: `POST`
**Route**: `/v1/auth/verify-email`
**Auth**: Public
**Permission**: None

**Request Body**:
```json
{
  "token": "verification-token"
}
```

**Response** `200 OK`:
```json
{
  "data": {
    "message": "Email verified successfully."
  },
  "timestamp": "2026-07-31T10:30:00.000Z"
}
```

**Errors**:
| Code | Message |
|------|---------|
| 400 | `INVALID_TOKEN` | Token is expired or invalid |

---

## 3. Users & Profile


### GET /v1/users/me

Get current user's profile.

**Method**: `GET`
**Route**: `/v1/users/me`
**Auth**: Bearer JWT
**Permission**: `authenticated`

**Response** `200 OK`:
```json
{
  "data": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "email": "alex@example.com",
    "profile": {
      "displayName": "Alex Creator",
      "avatarKey": "avatars/550e8400-profile.jpg",
      "timezone": "Asia/Jakarta"
    },
    "subscription": {
      "plan": "starter",
      "status": "active",
      "startsAt": "2026-07-01T00:00:00.000Z"
    },
    "credits": {
      "balance": 18,
      "rolloverCredit": 0
    },
    "stats": {
      "totalProjects": 12,
      "totalClips": 57
    },
    "createdAt": "2026-06-15T08:30:00.000Z"
  },
  "timestamp": "2026-07-31T10:30:00.000Z"
}
```

### PATCH /v1/users/me

Update profile.

**Method**: `PATCH`
**Route**: `/v1/users/me`
**Auth**: Bearer JWT
**Permission**: `authenticated`

**Request Body** (all optional):
```json
{
  "displayName": "Alex Creator v2",
  "timezone": "Asia/Jakarta"
}
```

**Validation**: Same as register for each field individually.

**Response** `200 OK`: Updated user profile.

### DELETE /v1/users/me

Delete own account (permanently).

**Method**: `DELETE`
**Route**: `/v1/users/me`
**Auth**: Bearer JWT
**Permission**: `authenticated`

**Request Body**:
```json
{
  "password": "SecureP@ss1",
  "confirmPhrase": "DELETE MY ACCOUNT"
}
```

**Response** `204 No Content`

**Errors**:
| Code | Message |
|------|---------|
| 401 | `INVALID_PASSWORD` | Password confirmation failed |
| 422 | `INVALID_CONFIRMATION` | Confirmation phrase must be exact |

**Notes**:
- Cascade deletes: all projects, clips, transcripts, usage logs
- Files in MinIO also deleted
- Credit transactions preserved for audit (anonymized)

---

## 4. Projects


### GET /v1/projects

List user's projects (paginated).

**Method**: `GET`
**Route**: `/v1/projects`
**Auth**: Bearer JWT
**Permission**: `authenticated`

**Query Parameters**:
| Param | Type | Default | Description |
|-------|------|---------|-------------|
| `page` | number | 1 | Page number |
| `limit` | number | 20 | Items per page (max 50) |
| `status` | ProjectStatus | — | Filter by status |
| `sort` | string | createdAt | Sort field (createdAt, updatedAt, title) |
| `order` | string | desc | Sort order (asc, desc) |
| `search` | string | — | Search by title |

**Response** `200 OK`:
```json
{
  "data": [
    {
      "id": "660e8400-e29b-41d4-a716-446655440001",
      "youtubeUrl": "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
      "youtubeVideoId": "dQw4w9WgXcQ",
      "title": "React 19 Deep Dive",
      "durationSeconds": 1845,
      "thumbnailUrl": "https://i.ytimg.com/vi/dQw4w9WgXcQ/default.jpg",
      "status": "completed",
      "creditsConsumed": 2,
      "clipCount": 5,
      "createdAt": "2026-07-30T14:00:00.000Z",
      "completedAt": "2026-07-30T14:23:00.000Z"
    },
    {
      "id": "770e8400-e29b-41d4-a716-446655440002",
      "youtubeUrl": "https://youtu.be/abc123",
      "youtubeVideoId": "abc123",
      "title": "Docker Crash Course",
      "durationSeconds": null,
      "thumbnailUrl": null,
      "status": "transcribing",
      "creditsConsumed": 2,
      "clipCount": 0,
      "createdAt": "2026-07-31T09:00:00.000Z",
      "completedAt": null
    }
  ],
  "meta": {
    "page": 1,
    "limit": 20,
    "total": 12,
    "totalPages": 1
  },
  "timestamp": "2026-07-31T10:30:00.000Z"
}
```

---

### POST /v1/projects

Create a new project (submit YouTube URL for processing).

**Method**: `POST`
**Route**: `/v1/projects`
**Auth**: Bearer JWT
**Permission**: `authenticated`

**Request Body**:
```json
{
  "youtubeUrl": "https://www.youtube.com/watch?v=dQw4w9WgXcQ"
}
```

**Validation**:
| Field | Rules |
|-------|-------|
| `youtubeUrl` | Required, valid YouTube URL (youtube.com/watch, youtu.be, youtube.com/shorts) |

**Response** `201 Created`:
```json
{
  "data": {
    "id": "880e8400-e29b-41d4-a716-446655440003",
    "youtubeUrl": "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
    "youtubeVideoId": "dQw4w9WgXcQ",
    "title": "React 19 Deep Dive",
    "durationSeconds": 1845,
    "thumbnailUrl": "https://i.ytimg.com/vi/dQw4w9WgXcQ/hqdefault.jpg",
    "status": "pending",
    "creditsConsumed": 2,
    "estimatedProcessingTime": 480,
    "createdAt": "2026-07-31T10:30:00.000Z"
  },
  "timestamp": "2026-07-31T10:30:00.000Z"
}
```

**Errors**:
| Code | Message |
|------|---------|
| 400 | `INVALID_YOUTUBE_URL` | URL is not a valid YouTube video URL |
| 422 | `VIDEO_TOO_LONG` | Video exceeds plan duration limit |
| 422 | `VIDEO_NOT_FOUND` | YouTube video does not exist or is private |
| 403 | `INSUFFICIENT_CREDITS` | Not enough credits to process this video |
| 409 | `PROJECT_ALREADY_EXISTS` | User already has a project for this video URL |

**Notes**:
- System calculates credit cost based on video duration BEFORE deducting
- If credits insufficient, returns 403 with `{ required: 2, available: 1 }`
- Processing starts asynchronously via BullMQ queue
- Connect to WebSocket for real-time progress updates

---

### POST /v1/projects/calculate-credits

Preview credit cost before creating a project.

**Method**: `POST`
**Route**: `/v1/projects/calculate-credits`
**Auth**: Bearer JWT
**Permission**: `authenticated`

**Request Body**: Same as POST /projects

**Response** `200 OK`:
```json
{
  "data": {
    "youtubeVideoId": "dQw4w9WgXcQ",
    "durationSeconds": 1845,
    "creditsRequired": 2,
    "currentBalance": 18,
    "balanceAfterOperation": 16,
    "planMaxDuration": 7200,
    "withinLimits": true
  },
  "timestamp": "2026-07-31T10:30:00.000Z"
}
```

---

### GET /v1/projects/:id

Get detailed project info with processing timeline.

**Method**: `GET`
**Route**: `/v1/projects/:id`
**Auth**: Bearer JWT
**Permission**: `project:owner`

**Response** `200 OK`:
```json
{
  "data": {
    "id": "880e8400-e29b-41d4-a716-446655440003",
    "youtubeUrl": "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
    "youtubeVideoId": "dQw4w9WgXcQ",
    "title": "React 19 Deep Dive",
    "durationSeconds": 1845,
    "thumbnailUrl": "https://i.ytimg.com/vi/dQw4w9WgXcQ/hqdefault.jpg",
    "status": "completed",
    "creditsConsumed": 2,
    "clipCount": 5,
    "timeline": [
      { "stage": "created", "timestamp": "2026-07-30T14:00:00.000Z" },
      { "stage": "downloading", "timestamp": "2026-07-30T14:00:05.000Z" },
      { "stage": "transcribing", "timestamp": "2026-07-30T14:05:30.000Z" },
      { "stage": "analyzing", "timestamp": "2026-07-30T14:12:00.000Z" },
      { "stage": "generating_clips", "timestamp": "2026-07-30T14:14:00.000Z" },
      { "stage": "completed", "timestamp": "2026-07-30T14:23:00.000Z" }
    ],
    "clips": [
      {
        "id": "990e8400-e29b-41d4-a716-446655440010",
        "title": "The Hook That Changed Everything",
        "startTime": 45.2,
        "endTime": 90.7,
        "durationSeconds": 45.5,
        "engagementScore": 92,
        "status": "completed",
        "thumbnailKey": "thumbnails/990e8400.jpg"
      }
    ],
    "createdAt": "2026-07-30T14:00:00.000Z",
    "completedAt": "2026-07-30T14:23:00.000Z"
  },
  "timestamp": "2026-07-31T10:30:00.000Z"
}
```

**Errors**:
| Code | Message |
|------|---------|
| 404 | `PROJECT_NOT_FOUND` | Project does not exist or doesn't belong to user |

---

### DELETE /v1/projects/:id

Delete project and all associated data.

**Method**: `DELETE`
**Route**: `/v1/projects/:id`
**Auth**: Bearer JWT
**Permission**: `project:owner`

**Response** `200 OK`:
```json
{
  "data": {
    "id": "880e8400-e29b-41d4-a716-446655440003",
    "deleted": true,
    "deletedClips": 5,
    "deletedSegments": 312
  },
  "timestamp": "2026-07-31T10:30:00.000Z"
}
```

**Notes**:
- Cascade deletes: all clips, transcript segments, job records
- MinIO files also deleted (raw video, clips, subtitles, thumbnails)
- Credits NOT refunded for completed projects
- Usage logs persist (project_id set to null)

---

### POST /v1/projects/:id/cancel

Cancel an in-progress project.

**Method**: `POST`
**Route**: `/v1/projects/:id/cancel`
**Auth**: Bearer JWT
**Permission**: `project:owner`

**Response** `200 OK`:
```json
{
  "data": {
    "id": "880e8400-e29b-41d4-a716-446655440003",
    "status": "cancelled",
    "creditsRefunded": 2,
    "message": "Project cancelled. 2 credits refunded."
  },
  "timestamp": "2026-07-31T10:30:00.000Z"
}
```

**Errors**:
| Code | Message |
|------|---------|
| 409 | `CANNOT_CANCEL` | Project is already in terminal state (completed/failed/cancelled) |
| 409 | `CANNOT_CANCEL` | Project is in generating_clips (too late to cancel) |

**Notes**:
- Only cancellable in pending, downloading, transcribing, analyzing states
- Cancelling removes the job from the BullMQ queue
- Credits fully refunded if cancelled before clip generation

---

### POST /v1/projects/:id/retry

Retry a failed project from the failed stage.

**Method**: `POST`
**Route**: `/v1/projects/:id/retry`
**Auth**: Bearer JWT
**Permission**: `project:owner`

**Response** `200 OK`:
```json
{
  "data": {
    "id": "880e8400-e29b-41d4-a716-446655440003",
    "status": "downloading",
    "retryingFrom": "download",
    "attempts": 1,
    "maxAttempts": 3
  },
  "timestamp": "2026-07-31T10:30:00.000Z"
}
```

**Errors**:
| Code | Message |
|------|---------|
| 409 | `CANNOT_RETRY` | Project is not in failed state |
| 422 | `MAX_RETRIES_EXCEEDED` | 3 retry attempts already used |

---

## 5. Clips


### GET /v1/projects/:id/clips

List clips for a project (sorted by engagement score).

**Method**: `GET`
**Route**: `/v1/projects/:id/clips`
**Auth**: Bearer JWT
**Permission**: `project:owner`

**Query Parameters**:
| Param | Type | Default | Description |
|-------|------|---------|-------------|
| `page` | number | 1 | Page number |
| `limit` | number | 20 | Items per page |
| `status` | ClipStatus | — | Filter by status |

**Response** `200 OK`:
```json
{
  "data": [
    {
      "id": "990e8400-e29b-41d4-a716-446655440010",
      "title": "The Hook That Changed Everything",
      "startTime": 45.2,
      "endTime": 90.7,
      "durationSeconds": 45.5,
      "engagementScore": 92,
      "thumbnailUrl": "https://minio.clipyai.com/thumbnails/990e8400.jpg?sign=...",
      "status": "completed",
      "createdAt": "2026-07-30T14:20:00.000Z"
    },
    {
      "id": "990e8400-e29b-41d4-a716-446655440011",
      "title": "Unexpected Plot Twist",
      "startTime": 240.0,
      "endTime": 275.5,
      "durationSeconds": 35.5,
      "engagementScore": 87,
      "thumbnailUrl": null,
      "status": "generating",
      "createdAt": "2026-07-30T14:21:00.000Z"
    }
  ],
  "meta": { "page": 1, "limit": 20, "total": 5, "totalPages": 1 },
  "timestamp": "2026-07-31T10:30:00.000Z"
}
```

---

### GET /v1/clips/:id

Get detailed clip info.

**Method**: `GET`
**Route**: `/v1/clips/:id`
**Auth**: Bearer JWT
**Permission**: `clip:owner`

**Response** `200 OK`:
```json
{
  "data": {
    "id": "990e8400-e29b-41d4-a716-446655440010",
    "projectId": "880e8400-e29b-41d4-a716-446655440003",
    "projectTitle": "React 19 Deep Dive",
    "title": "The Hook That Changed Everything",
    "startTime": 45.2,
    "endTime": 90.7,
    "durationSeconds": 45.5,
    "engagementScore": 92,
    "transcriptSnippet": "And this is where React 19 completely changes the game. The new compiler...",
    "aiRationale": "Strong opener with high emotional engagement. The speaker raises their voice and makes a bold claim, which hooks viewers immediately.",
    "videoUrl": "https://minio.clipyai.com/clips/990e8400.mp4?sign=...",
    "subtitleUrl": "https://minio.clipyai.com/subtitles/990e8400.srt?sign=...",
    "thumbnailUrl": "https://minio.clipyai.com/thumbnails/990e8400.jpg?sign=...",
    "status": "completed",
    "createdAt": "2026-07-30T14:20:00.000Z"
  },
  "timestamp": "2026-07-31T10:30:00.000Z"
}
```

---

### GET /v1/clips/:id/download

Get pre-signed download URL for MP4 file.

**Method**: `GET`
**Route**: `/v1/clips/:id/download`
**Auth**: Bearer JWT
**Permission**: `clip:owner`

**Response** `302 Found`:
Redirects to MinIO pre-signed URL (valid for 1 hour).

**Response Headers**:
```
Location: https://minio.clipyai.com/clips/990e8400.mp4?X-Amz-Algorithm=...
Content-Disposition: attachment; filename="the-hook-that-changed-everything.mp4"
```

**Errors**:
| Code | Message |
|------|---------|
| 404 | `CLIP_NOT_FOUND` | Clip does not exist |
| 422 | `CLIP_NOT_READY` | Clip is still being generated or failed |
| 410 | `CLIP_EXPIRED` | Clip file has been deleted (retention expired) |

---

### PATCH /v1/clips/:id

Update clip metadata (title, boundaries).

**Method**: `PATCH`
**Route**: `/v1/clips/:id`
**Auth**: Bearer JWT
**Permission**: `clip:owner`

**Request Body** (all optional):
```json
{
  "title": "Best React 19 Hook Explanation",
  "startTime": 43.0,
  "endTime": 92.0
}
```

**Validation**:
| Field | Rules |
|-------|-------|
| `title` | Min 3 chars, max 500 chars |
| `startTime` | Must be >= 0 and < endTime and within project duration |
| `endTime` | Must be > startTime and within project duration, max 90s clip |

**Response** `200 OK`: Updated clip object.

**Notes**:
- If startTime/endTime changed, clip is re-generated (new clipgen job queued)
- Old video file is replaced

---

### DELETE /v1/clips/:id

Delete a clip permanently.

**Method**: `DELETE`
**Route**: `/v1/clips/:id`
**Auth**: Bearer JWT
**Permission**: `clip:owner`

**Response** `200 OK`:
```json
{
  "data": {
    "id": "990e8400-e29b-41d4-a716-446655440010",
    "deleted": true
  },
  "timestamp": "2026-07-31T10:30:00.000Z"
}
```

**Notes**:
- Video, subtitle, and thumbnail files deleted from MinIO
- Job records associated with this clip remain (for audit)

---

### POST /v1/projects/:id/clips/create

Manually create a clip from transcript boundaries.

**Method**: `POST`
**Route**: `/v1/projects/:id/clips/create`
**Auth**: Bearer JWT
**Permission**: `project:owner`

**Request Body**:
```json
{
  "title": "Custom Highlight",
  "startTime": 120.0,
  "endTime": 165.0
}
```

**Validation**: Same as PATCH /clips/:id.
**Response** `201 Created`: Clip object with status "queued".
**Notes**: Adds a clipgen job to the queue. Credits NOT consumed (manual clips are free).

---

### POST /v1/clips/:id/regenerate

Re-process a clip (re-cut + re-burn subtitles).

**Method**: `POST`
**Route**: `/v1/clips/:id/regenerate`
**Auth**: Bearer JWT
**Permission**: `clip:owner`

**Response** `200 OK`:
```json
{
  "data": {
    "id": "990e8400-e29b-41d4-a716-446655440010",
    "status": "queued",
    "message": "Clip regeneration queued"
  },
  "timestamp": "2026-07-31T10:30:00.000Z"
}
```

---

## 6. Transcript


### GET /v1/projects/:id/transcript

Get full transcript for a project.

**Method**: `GET`
**Route**: `/v1/projects/:id/transcript`
**Auth**: Bearer JWT
**Permission**: `project:owner`

**Query Parameters**:
| Param | Type | Default | Description |
|-------|------|---------|-------------|
| `page` | number | 1 | Page number (segments per page) |
| `limit` | number | 200 | Items per page |
| `search` | string | — | Search within transcript text |

**Response** `200 OK`:
```json
{
  "data": {
    "projectId": "880e8400-e29b-41d4-a716-446655440003",
    "segments": [
      {
        "id": "aa0e8400-e29b-41d4-a716-446655440100",
        "segmentIndex": 0,
        "text": "Welcome back to another video.",
        "startTime": 0.0,
        "endTime": 2.5,
        "confidence": 0.98
      },
      {
        "id": "aa0e8400-e29b-41d4-a716-446655440101",
        "segmentIndex": 1,
        "text": "Today we're diving into React 19.",
        "startTime": 2.5,
        "endTime": 5.1,
        "confidence": 0.95
      }
    ],
    "totalSegments": 312
  },
  "meta": { "page": 1, "limit": 200, "total": 312, "totalPages": 2 },
  "timestamp": "2026-07-31T10:30:00.000Z"
}
```

**Errors**:
| Code | Message |
|------|---------|
| 422 | `TRANSCRIPT_NOT_READY` | Project hasn't reached transcribing stage yet |
| 422 | `TRANSCRIPT_FAILED` | Transcription failed |

---

### GET /v1/projects/:id/transcript/search

Search transcript segments.

**Method**: `GET`
**Route**: `/v1/projects/:id/transcript/search?q=hooks`
**Auth**: Bearer JWT
**Permission**: `project:owner`

**Query Parameters**:
| Param | Type | Default | Description |
|-------|------|---------|-------------|
| `q` | string | required | Search query (case-insensitive) |

**Response** `200 OK`:
```json
{
  "data": [
    {
      "id": "aa0e8400-e29b-41d4-a716-446655440150",
      "segmentIndex": 48,
      "text": "React hooks are the most important concept in React 19.",
      "startTime": 240.0,
      "endTime": 244.5,
      "confidence": 0.97
    }
  ],
  "meta": { "query": "hooks", "matchCount": 12 },
  "timestamp": "2026-07-31T10:30:00.000Z"
}
```

---

## 7. Dashboard & History


### GET /v1/dashboard/stats

Get user statistics for the dashboard.

**Method**: `GET`
**Route**: `/v1/dashboard/stats`
**Auth**: Bearer JWT
**Permission**: `authenticated`

**Response** `200 OK`:
```json
{
  "data": {
    "projects": {
      "total": 45,
      "thisMonth": 3,
      "completed": 40,
      "failed": 2,
      "processing": 3
    },
    "clips": {
      "total": 198,
      "thisMonth": 15,
      "downloadedCount": 142
    },
    "credits": {
      "balance": 18,
      "usedThisMonth": 12,
      "totalThisMonth": 30,
      "daysUntilReset": 15
    },
    "plan": {
      "tier": "starter",
      "status": "active"
    },
    "recentActivity": [
      {
        "projectId": "880e8400-...",
        "title": "React 19 Deep Dive",
        "action": "completed",
        "timestamp": "2026-07-30T14:23:00.000Z"
      }
    ]
  },
  "timestamp": "2026-07-31T10:30:00.000Z"
}
```

---

### GET /v1/dashboard/credits

Get detailed credit summary.

**Method**: `GET`
**Route**: `/v1/dashboard/credits`
**Auth**: Bearer JWT
**Permission**: `authenticated`

**Response** `200 OK`:
```json
{
  "data": {
    "balance": 18,
    "rolloverCredit": 10,
    "rolloverExpiresAt": "2026-08-31T00:00:00.000Z",
    "monthlyAllocation": 30,
    "usedThisMonth": 12,
    "remainingThisMonth": 18,
    "refundedThisMonth": 2,
    "nextResetAt": "2026-08-01T00:00:00.000Z",
    "breakdown": {
      "thisMonth": { "consumed": 12, "refunded": 2, "net": 10 },
      "lastMonth": { "consumed": 18, "refunded": 0, "net": 18 },
      "twoMonthsAgo": { "consumed": 25, "refunded": 0, "net": 25 }
    }
  },
  "timestamp": "2026-07-31T10:30:00.000Z"
}
```

---

### GET /v1/dashboard/usage

Get usage history (paginated).

**Method**: `GET`
**Route**: `/v1/dashboard/usage`
**Auth**: Bearer JWT
**Permission**: `authenticated`

**Query Parameters**:
| Param | Type | Default | Description |
|-------|------|---------|-------------|
| `page` | number | 1 | Page number |
| `limit` | number | 20 | Items per page |
| `action` | string | — | Filter by action type |

**Response** `200 OK`:
```json
{
  "data": [
    {
      "id": "bb0e8400-...-log001",
      "action": "project_created",
      "description": "Created project 'React 19 Deep Dive'",
      "creditsUsed": 2,
      "projectId": "880e8400-...",
      "createdAt": "2026-07-30T14:00:00.000Z"
    },
    {
      "id": "bb0e8400-...-log002",
      "action": "clip_downloaded",
      "description": "Downloaded clip 'The Hook That Changed Everything'",
      "creditsUsed": 0,
      "projectId": "880e8400-...",
      "clipId": "990e8400-...",
      "createdAt": "2026-07-30T14:25:00.000Z"
    }
  ],
  "meta": { "page": 1, "limit": 20, "total": 256, "totalPages": 13 },
  "timestamp": "2026-07-31T10:30:00.000Z"
}
```

---

## 8. Subscription & Billing


### GET /v1/subscription

Get current subscription details.

**Method**: `GET`
**Route**: `/v1/subscription`
**Auth**: Bearer JWT
**Permission**: `authenticated`

**Response** `200 OK`:
```json
{
  "data": {
    "plan": "starter",
    "status": "active",
    "features": {
      "creditsPerMonth": 30,
      "maxVideoDuration": 7200,
      "maxClipsPerVideo": 10,
      "clipResolution": "1080p",
      "byokAllowed": false,
      "subtitleCustomization": "basic",
      "priorityProcessing": false,
      "batchDownload": true,
      "teamAccounts": false,
      "apiAccess": false
    },
    "billing": {
      "price": 19,
      "currency": "USD",
      "interval": "month",
      "nextBillingDate": "2026-08-01T00:00:00.000Z"
    },
    "startsAt": "2026-07-01T00:00:00.000Z"
  },
  "timestamp": "2026-07-31T10:30:00.000Z"
}
```

---

### POST /v1/subscription/upgrade

Upgrade to a paid plan.

**Method**: `POST`
**Route**: `/v1/subscription/upgrade`
**Auth**: Bearer JWT
**Permission**: `authenticated`

**Request Body**:
```json
{
  "plan": "pro"
}
```

**Validation**:
| Field | Rules |
|-------|-------|
| `plan` | Required, must be one of: starter, pro, enterprise |

**Response** `200 OK`:
```json
{
  "data": {
    "plan": "pro",
    "status": "active",
    "previousPlan": "free",
    "proratedCharge": 0,
    "creditsAdded": 100,
    "newBalance": 100,
    "startsAt": "2026-07-31T10:30:00.000Z",
    "nextBillingDate": "2026-08-31T00:00:00.000Z"
  },
  "timestamp": "2026-07-31T10:30:00.000Z"
}
```

**Errors**:
| Code | Message |
|------|---------|
| 422 | `ALREADY_ON_PLAN` | User is already on this plan |
| 422 | `DOWNGRADE_NOT_ALLOWED` | Use cancel + resubscribe to downgrade |
| 402 | `PAYMENT_REQUIRED` | Payment processing failed |
| 400 | `INVALID_PLAN` | Plan does not exist |

**Notes**:
- Prorated billing: charge difference for remaining days
- Credits added immediately on upgrade
- MVP: simulated payment. V1: Stripe integration

---

### POST /v1/subscription/cancel

Cancel paid subscription (downgrade to free at period end).

**Method**: `POST`
**Route**: `/v1/subscription/cancel`
**Auth**: Bearer JWT
**Permission**: `authenticated`

**Request Body**:
```json
{
  "reason": "Too expensive",
  "confirm": true
}
```

**Response** `200 OK`:
```json
{
  "data": {
    "plan": "starter",
    "status": "canceled",
    "activeUntil": "2026-08-01T00:00:00.000Z",
    "message": "Subscription will end on 2026-08-01. You will be downgraded to Free plan."
  },
  "timestamp": "2026-07-31T10:30:00.000Z"
}
```

**Errors**:
| Code | Message |
|------|---------|
| 422 | `ALREADY_CANCELED` | Subscription is already canceled |
| 422 | `FREE_PLAN` | Cannot cancel a free plan |

**Notes**:
- User keeps premium features until the end of the billing period
- Credits remain until month reset
- After period end: auto-downgrade to free tier

---

### POST /v1/subscription/byok

Register a "Bring Your Own Key" OpenAI API key.

**Method**: `POST`
**Route**: `/v1/subscription/byok`
**Auth**: Bearer JWT
**Permission**: `authenticated` + plan must allow BYOK (Pro, Enterprise)

**Request Body**:
```json
{
  "openaiApiKey": "sk-..."
}
```

**Validation**:
| Field | Rules |
|-------|-------|
| `openaiApiKey` | Required, must start with 'sk-', min 20 chars |

**Response** `200 OK`:
```json
{
  "data": {
    "byokEnabled": true,
    "keyValidated": true,
    "message": "OpenAI API key validated and encrypted. AI analysis will use your key.",
    "creditDiscount": 0.5
  },
  "timestamp": "2026-07-31T10:30:00.000Z"
}
```

**Errors**:
| Code | Message |
|------|---------|
| 403 | `BYOK_NOT_ALLOWED` | Plan does not support BYOK |
| 422 | `INVALID_API_KEY` | OpenAI rejected the API key |

**Notes**:
- Key is encrypted at rest using AES-256-GCM
- Key is validated against OpenAI API before saving
- Credit cost reduced by 50% when BYOK is active

---

### DELETE /v1/subscription/byok

Remove BYOK key.

**Method**: `DELETE`
**Route**: `/v1/subscription/byok`
**Auth**: Bearer JWT
**Permission**: `authenticated`

**Response** `200 OK`:
```json
{
  "data": {
    "byokEnabled": false,
    "message": "OpenAI API key removed. Credits return to normal rate."
  },
  "timestamp": "2026-07-31T10:30:00.000Z"
}
```

---

## 9. Credits


### GET /v1/credits/balance

Get current credit balance.

**Method**: `GET`
**Route**: `/v1/credits/balance`
**Auth**: Bearer JWT
**Permission**: `authenticated`

**Response** `200 OK`:
```json
{
  "data": {
    "balance": 18,
    "rolloverCredit": 10,
    "rolloverExpiresAt": "2026-08-31T00:00:00.000Z",
    "monthlyUsed": 12,
    "monthlyAllocation": 30
  },
  "timestamp": "2026-07-31T10:30:00.000Z"
}
```

---

### GET /v1/credits/history

Get credit transaction history (paginated).

**Method**: `GET`
**Route**: `/v1/credits/history`
**Auth**: Bearer JWT
**Permission**: `authenticated`

**Query Parameters**:
| Param | Type | Default | Description |
|-------|------|---------|-------------|
| `page` | number | 1 | Page number |
| `limit` | number | 20 | Items per page |
| `type` | CreditTransactionType | — | Filter by type (subscription, consumption, refund, rollover, top_up, admin_grant) |
| `startDate` | date | — | Filter from date (ISO 8601) |
| `endDate` | date | — | Filter to date (ISO 8601) |

**Response** `200 OK`:
```json
{
  "data": [
    {
      "id": "cc0e8400-e29b-41d4-a716-446655441000",
      "type": "consumption",
      "amount": -2,
      "description": "Processed 'React 19 Deep Dive'",
      "metadata": {
        "projectId": "880e8400-...",
        "videoDuration": 1845,
        "byokMode": false
      },
      "balanceBefore": 20,
      "balanceAfter": 18,
      "createdAt": "2026-07-30T14:00:00.000Z"
    },
    {
      "id": "cc0e8400-e29b-41d4-a716-446655441001",
      "type": "subscription",
      "amount": 30,
      "description": "Monthly credit allocation — Starter plan",
      "balanceBefore": 0,
      "balanceAfter": 30,
      "createdAt": "2026-07-01T00:00:00.000Z"
    }
  ],
  "meta": { "page": 1, "limit": 20, "total": 48, "totalPages": 3 },
  "timestamp": "2026-07-31T10:30:00.000Z"
}
```

---

## 10. Admin


## 11. WebSocket Events

### Connection

```
URL:       wss://api.clipyai.com/ws
Protocol:  Socket.IO v4
Auth:      Token in handshake query: ?token=<jwt>
           OR via cookie (if same origin)

Namespaces: / — default namespace
Rooms:      project:{projectId} — per-project isolation
```

### Server -> Client Events

| Event | Payload | Description |
|-------|---------|-------------|
| `connected` | `{ userId, message }` | Connection established |
| `progress.update` | `{ projectId, stage, percent, message, timestamp }` | Pipeline progress |
| `clip.completed` | `{ projectId, clipId, title, thumbnailUrl, engagementScore }` | Single clip done |
| `project.completed` | `{ projectId, clipCount, duration }` | All clips generated |
| `project.failed` | `{ projectId, stage, error, retryable }` | Stage failure |
| `error` | `{ code, message }` | Protocol-level error |

### Client -> Server Events

| Event | Payload | Description |
|-------|---------|-------------|
| `subscribe` | `{ projectId }` | Join project room for updates |
| `unsubscribe` | `{ projectId }` | Leave project room |

### Progress Stages

```
downloading  ->  0-20%
transcribing ->  20-45%
analyzing    ->  45-55%
generating_clips -> 55-95%
completed    ->  100%
```

### Example Progress Event

```json
{
  "event": "progress.update",
  "data": {
    "projectId": "880e8400-e29b-41d4-a716-446655440003",
    "stage": "transcribing",
    "percent": 35,
    "message": "Transcribing audio... 6 minutes of 18 minutes processed",
    "timestamp": "2026-07-31T10:35:00.000Z"
  }
}
```

---

## 12. Error Codes Reference

### General Errors
| Code | HTTP | Meaning |
|------|------|---------|
| `VALIDATION_ERROR` | 400 | Request body/query/param failed validation |
| `UNAUTHORIZED` | 401 | Missing or invalid JWT |
| `FORBIDDEN` | 403 | Valid JWT but insufficient permissions |
| `RESOURCE_NOT_FOUND` | 404 | Requested resource does not exist |
| `RATE_LIMITED` | 429 | Request rate exceeded |

### Auth Errors
| Code | HTTP | Meaning |
|------|------|---------|
| `EMAIL_EXISTS` | 409 | Email already registered |
| `INVALID_CREDENTIALS` | 401 | Wrong email or password |
| `ACCOUNT_DISABLED` | 403 | User account deactivated |
| `EMAIL_NOT_VERIFIED` | 403 | Email verification required |
| `INVALID_REFRESH_TOKEN` | 401 | Refresh token expired/revoked |
| `TOKEN_REUSE_DETECTED` | 401 | Rotation breach - all tokens revoked |

### Project Errors
| Code | HTTP | Meaning |
|------|------|---------|
| `INVALID_YOUTUBE_URL` | 400 | Not a valid YouTube URL |
| `VIDEO_TOO_LONG` | 422 | Exceeds plan duration limit |
| `VIDEO_NOT_FOUND` | 422 | YouTube video inaccessible |
| `PROJECT_NOT_FOUND` | 404 | Project doesn't exist |
| `PROJECT_ALREADY_EXISTS` | 409 | Duplicate video for user |
| `CANNOT_CANCEL` | 409 | Project in non-cancellable state |
| `CANNOT_RETRY` | 409 | Project not in failed state |
| `MAX_RETRIES_EXCEEDED` | 422 | 3 retry attempts used up |

### Credit Errors
| Code | HTTP | Meaning |
|------|------|---------|
| `INSUFFICIENT_CREDITS` | 403 | Not enough credits for operation |

### Clip Errors
| Code | HTTP | Meaning |
|------|------|---------|
| `CLIP_NOT_FOUND` | 404 | Clip doesn't exist |
| `CLIP_NOT_READY` | 422 | Still generating or failed |
| `CLIP_EXPIRED` | 410 | File retention expired |

### Subscription Errors
| Code | HTTP | Meaning |
|------|------|---------|
| `ALREADY_ON_PLAN` | 422 | Already subscribed to this tier |
| `BYOK_NOT_ALLOWED` | 403 | Plan doesn't support BYOK |
| `INVALID_API_KEY` | 422 | OpenAI rejected the key |
| `PAYMENT_REQUIRED` | 402 | Payment processing failed |

---

## Document Control

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | 2026-07-31 | Senior API Architect | 40 endpoints, 4 WebSocket events, error codes |
