# AI YouTube Auto Clipper — Docker Architecture

**Document Version**: 1.0
**Author**: Senior DevOps Architect
**Last Updated**: 2026-07-31

---

## Table of Contents

1. [Service Architecture Overview](#1-service-architecture-overview)
2. [Dockerfiles (7 Images)](#2-dockerfiles-7-images)
3. [Docker Compose Architecture](#3-docker-compose-architecture)
4. [Networking](#4-networking)
5. [Volumes](#5-volumes)
6. [Security](#6-security)
7. [Resource Management](#7-resource-management)
8. [Production Overrides](#8-production-overrides)
9. [Build & Deploy Strategy](#9-build--deploy-strategy)

---

## 1. Service Architecture Overview

### 1.1 Container Map

```
                           ┌───────────────────────┐
                           │    nginx:1.27-alpine   │
                           │    (Reverse Proxy)     │
                           │    Ports: 80, 443      │
                           └───────────┬───────────┘
                                       │
                 ┌─────────────────────┼─────────────────────┐
                 │                     │                     │
                 ▼                     ▼                     │
    ┌────────────────────┐  ┌────────────────────┐          │
    │ web ×2             │  │ api ×2             │          │
    │ Next.js 15         │  │ NestJS             │          │
    │ Port: 3000         │  │ Port: 4000         │          │
    │ Image: Dockerfile. │  │ Image: Dockerfile. │          │
    │        web         │  │        api         │          │
    └────────────────────┘  └─────────┬──────────┘          │
                                      │                      │
              ┌───────────────────────┼───────────────────────┤
              │                       │                       │
              ▼                       ▼                       ▼
    ┌─────────────────┐   ┌─────────────────┐   ┌─────────────────┐
    │ postgres:16     │   │ redis:7-alpine  │   │ minio/minio     │
    │ Port: 5432      │   │ Port: 6379      │   │ Port: 9000      │
    │ Vol: postgres   │   │ Vol: redis      │   │ API + 9001      │
    │      _data      │   │      _data      │   │ Console         │
    └─────────────────┘   └─────────────────┘   └─────────────────┘
                                      │
                                      │ (BullMQ via Redis)
                                      │
         ┌────────────────────────────┼────────────────────────────┐
         │                            │                            │
         ▼                            ▼                            ▼
┌───────────────────┐  ┌───────────────────┐  ┌───────────────────┐
│ worker-download   │  │ worker-transcribe │  │ worker-analyze    │
│ yt-dlp + FFmpeg   │  │ Faster Whisper    │  │ OpenAI GPT-4o     │
│ Dockerfile.       │  │ Dockerfile.       │  │ Dockerfile.       │
│ worker-download   │  │ worker-transcribe │  │ worker-analyze    │
└───────────────────┘  └───────────────────┘  └───────────────────┘

┌───────────────────┐  ┌───────────────────┐
│ worker-clipgen ×4 │  │ worker-cleanup    │
│ FFmpeg rendering  │  │ Scheduled maint.  │
│ Dockerfile.       │  │ Dockerfile.       │
│ worker-clipgen    │  │ worker-cleanup    │
└───────────────────┘  └───────────────────┘
```

### 1.2 Total Container Count

| Environment | Containers | Notes |
|------------|-----------|-------|
| Development | 9 (core) + 5 (workers via `--profile workers`) | MinIO init runs once |
| Production | 13+ (2 web, 2 api, 4 clipgen, rest ×1) | Depends on replica counts |

---

## 2. Dockerfiles (7 Images)

### 2.1 Image Inventory

| Dockerfile | From | Size (est.) | System Deps | Purpose |
|------------|------|------------|-------------|---------|
| `Dockerfile.web` | `node:22-alpine` | ~200MB | None | Next.js production server |
| `Dockerfile.api` | `node:22-alpine` | ~250MB | dumb-init | NestJS HTTP + WebSocket |
| `Dockerfile.worker-download` | `node:22-alpine` | ~350MB | FFmpeg, Python3, yt-dlp | Download queue consumer |
| `Dockerfile.worker-transcribe` | `node:22-alpine` | ~3GB | FFmpeg, Python3, faster-whisper | Transcribe queue consumer |
| `Dockerfile.worker-analyze` | `node:22-alpine` | ~200MB | None (pure Node.js) | Analyze queue consumer |
| `Dockerfile.worker-clipgen` | `node:22-alpine` | ~300MB | FFmpeg | Clip generation consumer |
| `Dockerfile.worker-cleanup` | `node:22-alpine` | ~200MB | None | Scheduled cleanup |

### 2.2 Build Strategy

**Multi-stage builds** on every Dockerfile:
```
Stage 1 (deps): Install all dependencies using pnpm
Stage 2 (builder): Copy deps, generate Prisma client, compile TypeScript
Stage 3 (runner): Copy only production artifacts, strip dev deps
```

**Worker base image** (`Dockerfile.worker-base`): Shared foundation for workers. In production, the base image is built once and cached. Each worker only adds its specific system dependencies (FFmpeg, Python, etc.).

### 2.3 Key Dockerfile Decisions

**Why `node:22-alpine` instead of `node:22-slim`?**
- Alpine is ~5x smaller than slim (50MB vs 250MB base)
- All our system deps (FFmpeg, Python) are well-supported on Alpine via `apk`
- Smaller images = faster CI builds, faster deploys, lower registry costs

**Why `dumb-init` in workers?**
- Prevents zombie process reaping issues
- Handles SIGTERM correctly for graceful shutdown
- Worker processes can drain their current job before exiting

**Why Pre-download Whisper model at build time?**
- Faster Whisper `large-v3` model is ~3GB
- Downloading at runtime adds 2-5 minutes to container startup
- Pre-downloading at build time = instant worker start
- Tradeoff: larger image size (3GB) but faster scaling

---

## 3. Docker Compose Architecture

### 3.1 File Structure

```
docker-compose.yml          # Base: all services, dev config, profiles
docker-compose.prod.yml     # Override: production hardening, replicas, nginx
.env                        # Local dev env vars (committed template)
.env.production             # Production secrets (never committed)
```

### 3.2 Development vs Production

| Aspect | Development | Production |
|--------|------------|------------|
| Source mounting | `apps/api/src:/app/...:ro` | No mounts |
| Workers | `--profile workers` (opt-in) | Always run |
| Ports exposed | All (3000, 4000, 5432, 6379, 9000, 9001) | Only 80/443 via nginx |
| Restart policy | `unless-stopped` | `always` |
| Logging | stdout (default) | json-file with rotation |
| Resource limits | None | CPU + memory limits |
| Replicas | 1 | 2 web, 2 api, 4 clipgen |
| Database | Containerized PostgreSQL | External managed (RDS/Neon) |
| Cache | Containerized Redis | External managed (Upstash/ElastiCache) |
| Storage | Containerized MinIO | External S3-compatible (AWS S3/R2) |

### 3.3 Worker Profiles (Dev Only)

```bash
# Dev: start without workers (use API only for testing)
docker compose up -d

# Dev: start with all workers
docker compose --profile workers up -d

# Dev: start only download worker
docker compose --profile workers up -d worker-download worker-transcribe
```

In production, the `docker-compose.prod.yml` overrides the profiles to `[]` (empty), so all workers always run.

### 3.4 Startup Order

```
1. postgres       (healthcheck: pg_isready)
2. redis          (healthcheck: redis-cli ping)
3. minio          (healthcheck: mc ready local)
4. minio-init     (depends_on: minio healthy, creates buckets, exits 0)
5. api            (depends_on: postgres, redis, minio)
6. web            (depends_on: api)
7. worker-*       (depends_on: postgres, redis, minio)  # start in parallel
8. nginx          (depends_on: web, api)                # production only
```

---

## 4. Networking

### 4.1 Network Topology

```
┌────────────────────────────────────────────────────────────────┐
│                    clip-internal (bridge)                       │
│                    Subnet: 172.28.0.0/16                       │
│                                                                │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐      │
│  │ postgres │  │  redis   │  │  minio   │  │   api    │      │
│  │ .28.0.10 │  │ .28.0.11 │  │ .28.0.12 │  │ .28.0.20 │      │
│  └──────────┘  └──────────┘  └──────────┘  └────┬─────┘      │
│                                                   │             │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐       │             │
│  │   web    │  │worker-dl │  │worker-cg │       │             │
│  │ .28.0.21 │  │ .28.0.30 │  │ .28.0.33 │       │             │
│  └──────────┘  └──────────┘  └──────────┘       │             │
│                                                   │             │
│                         ┌──────────┐              │             │
│                         │  nginx   │◄─────────────┘             │
│                         │ .28.0.2  │                             │
│                         └────┬─────┘                             │
│                              │                                    │
└──────────────────────────────┼────────────────────────────────────┘
                               │ Port mapping: 80, 443
                               ▼
                         ┌──────────┐
                         │ Internet │
                         └──────────┘
```

### 4.2 DNS Resolution

Docker Compose provides automatic DNS resolution. Every service can reach every other service by its **service name** — no IP addresses needed.

| Source | Target | Resolves To |
|--------|--------|------------|
| `api` | `postgres` | PostgreSQL container |
| `api` | `redis` | Redis container |
| `api` | `minio` | MinIO container |
| `worker-*` | `postgres` | PostgreSQL container |
| `worker-*` | `redis` | Redis container |
| `worker-*` | `minio` | MinIO container |
| `web` (SSR) | `api` | NestJS API container |
| `nginx` | `web` | Next.js container |
| `nginx` | `api` | NestJS API container |

### 4.3 Network Isolation

- **Single internal network** (`clip-internal`): All services communicate on this network
- **No external exposure**: Only nginx maps ports to the host. All other services are internal-only in production.
- **Bridge driver**: Default Docker bridge with custom subnet to avoid collisions with other projects
- **ICC enabled**: Inter-container communication allowed (services need to talk to each other)

### 4.4 Why No Separate Backend/Frontend Network?

The architecture uses a monolithic internal network rather than separate `frontend` / `backend` / `data` networks because:

1. **11 containers, not 50**: Network policy overhead isn't justified at this scale
2. **Everything needs PostgreSQL + Redis**: Workers, API, and web (server-side) all connect to data stores
3. **Simpler debugging**: One network = no DNS resolution issues across networks
4. **When to split**: If adding public-facing services (API gateway, WAF), split into `public` / `private` / `data` layers

---

## 5. Volumes

### 5.1 Volume Inventory

| Volume Name | Mount Point | Type | Driver | Purpose |
|------------|------------|------|--------|---------|
| `postgres_data` | `/var/lib/postgresql/data` | Named | local | PostgreSQL data persistence |
| `redis_data` | `/data` | Named | local | Redis AOF/RDB persistence |
| `minio_data` | `/data` | Named | local | Object storage (videos, clips, subtitles) |

### 5.2 Volume Strategy by Environment

**Development:**
- Named volumes for all persistent data (survive `docker compose down`)
- Remove with `docker compose down -v` for clean state
- Source code mounted as bind mounts (`:ro` read-only) for hot reload

**Production:**
- Named volumes with backup labels for automated backup
- External volumes can be used for high-IOPS storage:
  ```yaml
  volumes:
    postgres_data:
      driver: local
      driver_opts:
        type: nfs
        o: addr=192.168.1.100,rw
        device: ":/exports/postgres"
  ```

### 5.3 Volume Lifecycle

```
+-- docker compose up ----+     +-- docker compose down ----+
| Named volume created    |     | Volume NOT deleted        |
| or reused if exists     |     | (without -v flag)         |
+-------------------------+     +---------------------------+

+-- docker compose down -v --+
| Named volume DELETED       |
| (ALL DATA LOST)            |
+----------------------------+
```

### 5.4 Backup Labels

Production volumes carry backup labels for automated backup scripts:

```yaml
volumes:
  postgres_data:
    labels:
      com.clipyai.backup: "true"        # Auto-backup this volume
      com.clipyai.environment: "production"
  redis_data:
    labels:
      com.clipyai.backup: "false"       # Queue state, no backup needed
      com.clipyai.environment: "production"
```

---

## 6. Security

### 6.1 Container Security Hardening

Every custom-built image applies these hardening measures:

| Measure | Implementation | Rationale |
|---------|---------------|-----------|
| **Non-root user** | `USER clipuser` (UID 1001) | Container process runs without root privileges |
| **Read-only source** | Bind mounts with `:ro` flag | Dev source code cannot be modified by container |
| **No shell in prod** | Alpine base, no bash installed | Reduces attack surface |
| **dumb-init** | PID 1 signal forwarding | Clean shutdown, no zombie processes |
| **Health checks** | Every service has HEALTHCHECK | Orchestrator knows container state |
| **No privileged mode** | Not used anywhere | Containers don't need host-level access |

### 6.2 Network Security

| Measure | Implementation |
|---------|---------------|
| **No public ports (prod)** | Only nginx exposes 80/443 to host. All other services are internal-only. |
| **Auth rate limiting** | NGINX `limit_req` on `/api/v1/auth/`: max 5 requests/minute |
| **API rate limiting** | NGINX `limit_req` on `/api/`: max 100 requests/second |
| **Connection limiting** | NGINX `limit_conn`: max 50 concurrent connections per IP |
| **SSL termination** | NGINX handles TLS 1.2/1.3, internal traffic is plain HTTP (trusted network) |
| **Service mesh (future)** | For Kubernetes: mTLS via Istio/Linkerd between services |

### 6.3 Secret Management

```
Secrets NEVER committed to Git.
Secrets NEVER in Dockerfile.
Secrets NEVER in docker-compose files.

+---------------------------+
| Secrets → .env            |  ← committed template only (.env.example)
|          .env.production  |  ← NEVER committed, in .gitignore
|          CI/CD variables  |  ← GitHub Actions secrets
|          Vault/KMS        |  ← Production: HashiCorp Vault or Cloud KMS
+---------------------------+
```

**Secrets handled:**
| Secret | Storage | Accessed By |
|--------|---------|------------|
| `POSTGRES_PASSWORD` | `.env` / CI secrets | api, workers |
| `REDIS_PASSWORD` | `.env` / CI secrets | api, workers |
| `JWT_SECRET` | `.env` / CI secrets | api |
| `JWT_REFRESH_SECRET` | `.env` / CI secrets | api |
| `OPENAI_API_KEY` | `.env` / CI secrets | api, worker-analyze |
| `MINIO_ROOT_PASSWORD` | `.env` / CI secrets | api, minio-init |

### 6.4 Image Scanning (CI Recommended)

```yaml
# GitHub Actions workflow (recommended)
- name: Scan Docker images
  uses: aquasecurity/trivy-action@master
  with:
    image-ref: 'clip-project/api:latest'
    format: 'sarif'
    severity: 'CRITICAL,HIGH'
```

---

## 7. Resource Management

### 7.1 Resource Limits

| Service | CPUs (limit) | Memory (limit) | CPUs (reservation) | Memory (reservation) | Scale |
|---------|------------|---------------|-------------------|---------------------|-------|
| nginx | 0.5 | 256M | — | — | 1 |
| web | 1.0 | 512M | 0.25 | 256M | 2 |
| api | 1.0 | 512M | 0.5 | 256M | 2 |
| worker-download | 2.0 | 2G | — | — | 1 |
| worker-transcribe | 4.0 | 8G | — | — | 1 |
| worker-analyze | 1.0 | 512M | — | — | 1 |
| worker-clipgen | 2.0 | 2G | — | — | 4 |
| worker-cleanup | 0.5 | 256M | — | — | 1 |
| postgres | 2.0 | 4G | — | — | 1 |
| redis | 1.0 | 1G | — | — | 1 |
| minio | 1.0 | 1G | — | — | 1 |
| **Total Minimum (prod)** | **~16 CPUs** | **~21GB** | |

### 7.2 Scaling Strategy

**Scale signals:**
| Signal | Action |
|--------|--------|
| `worker-clipgen` queue depth > 100 | Increase replicas by 2 |
| `worker-clipgen` CPU consistently > 80% | Increase replicas by 2 |
| `api` response time p95 > 500ms | Increase api replicas |
| `api` request rate > 1000/sec | Increase api replicas |
| `worker-transcribe` queue depth > 50 | Add GPU node (not CPU scaling) |

**Horizontal scaling:**
```bash
# Scale clip generation workers (most common bottleneck)
docker compose -f docker-compose.yml -f docker-compose.prod.yml \
  up -d --scale worker-clipgen=8

# Scale API for high traffic
docker compose up -d --scale api=4

# Scale web for high traffic
docker compose up -d --scale web=3
```

---

## 8. Production Overrides

### 8.1 What docker-compose.prod.yml Changes

| Setting | Dev Value | Prod Value |
|---------|-----------|------------|
| `restart` | `unless-stopped` | `always` |
| API replicas | 1 | 2 |
| Web replicas | 1 | 2 |
| Clipgen replicas | 1 | 4 |
| All ports (except nginx) | Exposed to host | Removed |
| Source mounts | Bind mounted `:ro` | Removed |
| Worker profiles | `["workers"]` | `[]` (always run) |
| Resource limits | None | CPU + memory limits |
| Logging | stdout (docker default) | json-file with rotation |
| nginx | Not deployed | Added as reverse proxy |

### 8.2 External vs Containerized Dependencies

In production, the recommendation is to use managed cloud services instead of containerized infrastructure:

```
Development (docker-compose.yml):
  Database → Containerized PostgreSQL
  Cache    → Containerized Redis
  Storage  → Containerized MinIO

Production (recommended):
  Database → Neon / Supabase / AWS RDS
  Cache    → Upstash / AWS ElastiCache
  Storage  → AWS S3 / Cloudflare R2

Production (acceptable for small scale):
  Database → Containerized PostgreSQL (with backup!)
  Cache    → Containerized Redis (with persistence!)
  Storage  → Containerized MinIO (replicated!)
```

---

## 9. Build & Deploy Strategy

### 9.1 Local Development

```bash
# Start infrastructure only
docker compose up -d postgres redis minio

# Run API with hot reload (outside Docker for fast iteration)
cd apps/api && pnpm dev

# Run web with hot reload
cd apps/web && pnpm dev
```

### 9.2 Full Docker Development

```bash
# Build and start everything
docker compose up -d --build

# With workers
docker compose --profile workers up -d --build worker-download worker-clipgen

# View logs
docker compose logs -f api worker-download

# Rebuild a single service
docker compose build --no-cache worker-clipgen
docker compose up -d worker-clipgen
```

### 9.3 Production Deployment

```bash
# 1. Pull latest images (if using registry)
docker compose -f docker-compose.yml -f docker-compose.prod.yml pull

# 2. Run Prisma migrations (important!)
docker compose -f docker-compose.yml -f docker-compose.prod.yml \
  run --rm api pnpm --filter @clip-project/api prisma:migrate:deploy

# 3. Start services
docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d

# 4. Verify
docker compose -f docker-compose.yml -f docker-compose.prod.yml ps
docker compose logs -f --tail=50
```

### 9.4 CI/CD Pipeline (Conceptual)

```yaml
# .github/workflows/deploy.yml (conceptual)
name: Deploy
on:
  push:
    branches: [main]

jobs:
  build-and-push:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Set up Docker Buildx
        uses: docker/setup-buildx-action@v3
      - name: Build all images
        run: |
          docker build -f docker/Dockerfile.api -t ghcr.io/clipyai/api:${{ github.sha }} .
          docker build -f docker/Dockerfile.web -t ghcr.io/clipyai/web:${{ github.sha }} .
          # ... (all 7 images)
      - name: Push to registry
        run: |
          docker push ghcr.io/clipyai/api:${{ github.sha }}
          # ...
      - name: Deploy
        uses: appleboy/ssh-action@v1
        with:
          host: ${{ secrets.SSH_HOST }}
          username: deploy
          key: ${{ secrets.SSH_KEY }}
          script: |
            cd /opt/clip-project
            docker compose -f docker-compose.yml -f docker-compose.prod.yml pull
            docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d
```

---

## Document Control

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | 2026-07-31 | Senior DevOps Architect | Initial design — 7 Dockerfiles, 2 compose files, nginx config |
