# 🚀 INTEGRATION COMPLETE

## Tổng quan

Đã hoàn tất tích hợp Backend NestJS với Python AI Service và Crawler Services.

## 🏗️ Kiến trúc

```
Backend (NestJS) ──> RabbitMQ ──> AI Service (Python)
     │                                    │
     │ trigger                            │ save result
     ↓                                    ↓
crawl_ads (new) <──────────────── ads_classified
     │                                    │
     │ DB trigger                         │ DB trigger
     ↓                                    ↓
ad_items (FILTERED) ──────────────> ai_analyses
```

## 📋 Components

### 1. Database Adapter Layer
**File:** `src/database/adapter-layer.sql`
- Tables: `crawl_ads`, `ads_classified`
- Triggers: Auto-sync giữa Backend schema và AI schema
- Run: `npm run db:adapter`

### 2. RabbitMQ Integration
**Files:** `src/queue/queue.module.ts`, `src/queue/queue.service.ts`
- Queue: `ai_classify`
- Fallback: Built-in AI nếu RabbitMQ không configured

### 3. Crawler Orchestrator
**Files:** `src/info-source/crawler-orchestrator.service.ts`
- Cron job: Auto-trigger crawlers (hourly)
- Manual trigger: `POST /crawler/trigger/:scheduleId`

### 4. Webhooks
**File:** `src/webhooks/webhooks.controller.ts`
- Endpoint: `POST /webhooks/crawler-results`
- Parse crawler data → Save to `ad_items`

## 🔧 Setup

### 1. Install dependencies
```bash
pnpm install
```

### 2. Configure .env
```env
RABBITMQ_URL=amqp://admin:admin@localhost:5672
GOOGLE_CRAWLER_URL=http://localhost:8000
FACEBOOK_CRAWLER_URL=http://localhost:8001
BACKEND_PUBLIC_URL=http://localhost:3001
CRAWLER_WEBHOOK_SECRET=your-secret
ENABLE_AUTO_CRAWL=false
```

### 3. Run migration
```bash
npm run db:adapter
```

### 4. Start RabbitMQ (Docker)
```bash
docker run -d --name rabbitmq -p 5672:5672 -p 15672:15672 \
  -e RABBITMQ_DEFAULT_USER=admin -e RABBITMQ_DEFAULT_PASS=admin \
  rabbitmq:3-management
```

### 5. Start Backend
```bash
npm run start:dev
```

## 🧪 Testing

### Database Triggers
```sql
INSERT INTO ad_items (content, status) VALUES ('Test', 'FILTERED');
SELECT * FROM crawl_ads WHERE status = 'new';
SELECT * FROM v_adapter_stats;
```

### RabbitMQ
```bash
curl -X POST http://localhost:3001/ad-items/analyze \
  -H "Authorization: Bearer TOKEN"
```

### Crawler
```bash
curl -X POST http://localhost:3001/crawler/trigger/1 \
  -H "Authorization: Bearer TOKEN"
```

### Webhook
```bash
curl -X POST http://localhost:3001/webhooks/crawler-results \
  -H "x-webhook-secret: your-secret" \
  -H "Content-Type: application/json" \
  -d '{"job_id": 1, "status": "completed", "items": [...]}'
```

## 📊 Monitoring

```sql
-- Database stats
SELECT * FROM v_adapter_stats;
```

RabbitMQ UI: http://localhost:15672 (admin/admin)

## 🎯 Workflow

1. Trigger crawler → Collect data
2. Save to `ad_items` (COLLECTED)
3. QC review → FILTERED
4. Trigger sync → `crawl_ads` (new)
5. Publish to RabbitMQ
6. AI consume → Process → Save `ads_classified`
7. Trigger sync → `ai_analyses` + `ad_items` (AI_ANALYZED)
8. Specialist review

## 📝 New Endpoints

- `POST /crawler/trigger/:scheduleId` - Trigger crawler
- `GET /crawler/jobs` - List crawl jobs
- `POST /webhooks/crawler-results` - Webhook for crawler results
- `POST /ad-items/analyze` - Async AI analysis (via RabbitMQ)

## ✅ Done

- ✅ Database adapter layer with triggers
- ✅ RabbitMQ integration
- ✅ Crawler orchestrator with cron
- ✅ Webhooks for crawler results
- ✅ Updated modules and dependencies
- ✅ Configuration examples
- ✅ Zero changes to AI/Crawler code

Ready to deploy! 🚀
