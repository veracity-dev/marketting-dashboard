# Google Analytics Dev Overview

A concise reference for the GA4 → Supabase data pipeline that powers the marketing dashboard.

---

## 1. System Overview

The pipeline is driven by an **n8n workflow** (`n8n-workflow-ga4.json`). An external caller (e.g. the Next.js dashboard or a cron job) triggers it via a **POST webhook**. n8n fans out five parallel GA4 Data API requests, transforms each response, and upserts the results into five **Supabase/PostgreSQL** tables. An optional callback URL is notified on completion.

```
Caller ──POST──▶ n8n Webhook ──▶ (5× parallel) GA4 API ──▶ Transform ──▶ Supabase
                                                                              │
                                                               Callback ◀────┘
```

---

## 2. n8n Workflow Architecture

### 2.1 High-level flow

```mermaid
flowchart LR
    A([Caller / Cron]) -->|POST /ga-analytics\nstart_date · end_date\ncallback_url?| W[Webhook\n202 Accepted]

    W --> O[GA4 Overview]
    W --> E[GA4 Ecommerce]
    W --> T[GA4 Traffic Sources]
    W --> P[GA4 Top Pages]
    W --> G[GA4 Device Geo]

    O --> TO[Transform Overview]
    E --> TE[Transform Ecommerce]
    T --> TT[Transform Traffic]
    P --> TP[Transform Pages]
    G --> TG[Transform Device Geo]

    TO --> PO[PG Overview]
    TE --> PE[PG Ecommerce]
    TT --> PT[PG Traffic]
    TP --> PP[PG Pages]
    TG --> PG2[PG Device Geo]

    PO & PE & PT & PP & PG2 --> M[Merge Results]
    M --> C{Check Callback}
    C -->|callback_url present| N[Notify Complete\nHTTP POST]
    C -->|no callback| END([End])
```

### 2.2 Node responsibilities

| Stage | Nodes | What happens |
|---|---|---|
| **Trigger** | `Webhook` | Receives `{ start_date, end_date, callback_url? }`, immediately returns `202 Accepted` |
| **Fetch** | `GA4 Overview/Ecommerce/Traffic Sources/Top Pages/Device Geo` | Parallel GA4 Data API calls (OAuth2), custom date range, `returnAll: true` |
| **Transform** | `Transform *` (5× Code nodes) | Normalise field names, convert GA4 `YYYYMMDD` date strings to `YYYY-MM-DD`, cast types, attach `property_id` + `collected_at` |
| **Write** | `PG *` (5× Postgres nodes) | Parameterised `INSERT … ON CONFLICT … DO UPDATE` (upsert), batched independently per row |
| **Merge** | `Merge Results` | Append all five streams back into one |
| **Notify** | `Check Callback` + `Notify Complete` | If `callback_url` was in the original body, POST `{ status, refreshed_at, message }` |

---

## 3. Database Schema

### 3.1 Entity-relationship diagram

```mermaid
erDiagram
    GA_DAILY_OVERVIEW {
        bigserial id PK
        text      property_id
        date      report_date
        integer   sessions
        integer   total_users
        integer   new_users
        integer   screen_page_views
        numeric   bounce_rate
        numeric   avg_session_duration
        numeric   engagement_rate
        integer   engaged_sessions
        timestamptz collected_at
    }

    GA_ECOMMERCE {
        bigserial id PK
        text      property_id
        date      report_date
        numeric   total_revenue
        integer   transactions
        numeric   avg_purchase_revenue
        numeric   session_conversion_rate
        numeric   purchase_to_view_rate
        timestamptz collected_at
    }

    GA_TRAFFIC_SOURCES {
        bigserial id PK
        text      property_id
        date      report_date
        text      channel_group
        text      source_medium
        integer   sessions
        numeric   bounce_rate
        numeric   engagement_rate
        timestamptz collected_at
    }

    GA_TOP_PAGES {
        bigserial id PK
        text      property_id
        date      report_date
        text      page_path
        text      page_title
        integer   screen_page_views
        numeric   avg_session_duration
        numeric   bounce_rate
        numeric   engagement_rate
        timestamptz collected_at
    }

    GA_DEVICE_GEO {
        bigserial id PK
        text      property_id
        date      report_date
        text      device_category
        text      country
        integer   sessions
        integer   total_users
        timestamptz collected_at
    }

    GA_DAILY_OVERVIEW  }o--|| PROPERTY : "property_id"
    GA_ECOMMERCE       }o--|| PROPERTY : "property_id"
    GA_TRAFFIC_SOURCES }o--|| PROPERTY : "property_id"
    GA_TOP_PAGES       }o--|| PROPERTY : "property_id"
    GA_DEVICE_GEO      }o--|| PROPERTY : "property_id"
```

> All five tables share the same **logical key**: `(property_id, report_date)` — extended with additional dimension columns where needed. Upserts are safe to re-run for any date range.

### 3.2 Unique constraints & indexes

| Table | Unique key | Extra indexes |
|---|---|---|
| `ga_daily_overview` | `(property_id, report_date)` | `(property_id, report_date DESC)` |
| `ga_ecommerce` | `(property_id, report_date)` | `(property_id, report_date DESC)` |
| `ga_traffic_sources` | `(property_id, report_date, channel_group, source_medium)` | `(property_id, report_date DESC)` |
| `ga_top_pages` | `(property_id, report_date, page_path)` | `(property_id, report_date DESC)`, `(property_id, screen_page_views DESC)` |
| `ga_device_geo` | `(property_id, report_date, device_category, country)` | `(property_id, report_date DESC)` |

---

## 4. Security Model

```mermaid
flowchart TD
    subgraph Supabase RLS
        direction TB
        T1[ga_daily_overview]
        T2[ga_ecommerce]
        T3[ga_traffic_sources]
        T4[ga_top_pages]
        T5[ga_device_geo]
    end

    N8N[n8n\nservice_role] -->|ALL — read + write| T1 & T2 & T3 & T4 & T5
    DASH[Next.js Dashboard\nanon / authenticated] -->|SELECT only| T1 & T2 & T3 & T4 & T5
    DASH2[Unauthenticated visitor] -->|blocked by RLS| T1
```

| Role | Grant | RLS Policy |
|---|---|---|
| `service_role` (n8n) | `ALL` on all tables + sequences | `Allow service role write` — full read/write |
| `authenticated` (dashboard user) | `SELECT` on all tables | `Allow read for authenticated` — read-only |
| `anon` | `SELECT` on all tables (schema-level) | No policy → blocked by RLS |

---

## 5. Data Flow — End to End

```mermaid
sequenceDiagram
    participant Caller
    participant n8n
    participant GA4 as Google Analytics 4 API
    participant DB as Supabase (PostgreSQL)

    Caller->>n8n: POST /webhook/ga-analytics\n{ start_date, end_date, callback_url? }
    n8n-->>Caller: 202 Accepted

    par 5 parallel requests
        n8n->>GA4: Overview report
        n8n->>GA4: Ecommerce report
        n8n->>GA4: Traffic Sources report
        n8n->>GA4: Top Pages report
        n8n->>GA4: Device & Geo report
    end

    GA4-->>n8n: Raw rows (all pages)

    Note over n8n: Transform nodes normalise\ndates, field names, types

    par 5 parallel upserts
        n8n->>DB: INSERT … ON CONFLICT DO UPDATE → ga_daily_overview
        n8n->>DB: INSERT … ON CONFLICT DO UPDATE → ga_ecommerce
        n8n->>DB: INSERT … ON CONFLICT DO UPDATE → ga_traffic_sources
        n8n->>DB: INSERT … ON CONFLICT DO UPDATE → ga_top_pages
        n8n->>DB: INSERT … ON CONFLICT DO UPDATE → ga_device_geo
    end

    opt callback_url provided
        n8n->>Caller: POST callback_url\n{ status: "success", refreshed_at, message }
    end
```

---

## 6. GA4 Property

| Field | Value |
|---|---|
| Property ID | `523852603` |
| Property name | Veracity AI |
| Credential | `Google Analytics account 2` (OAuth2) |

---

## 7. How to Trigger a Refresh

```http
POST https://<n8n-host>/webhook/ga-analytics
Content-Type: application/json

{
  "start_date": "2024-01-01",
  "end_date":   "2024-01-31",
  "callback_url": "https://your-app.com/api/ga4-refresh-done"
}
```

- `start_date` / `end_date` — ISO-8601 dates; forwarded verbatim to the GA4 Data API.
- `callback_url` — optional; if present, n8n will POST a completion signal once all five upserts finish.
- The webhook returns **202** immediately; processing is async.
