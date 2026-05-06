import os
from crewai import Agent, LLM
from crewai_tools import NL2SQLTool
from dotenv import load_dotenv

load_dotenv()

nl2sql_tool = NL2SQLTool(db_uri=os.environ["DATABASE_URL"])

llm = LLM(
    model=os.environ.get("OPENAI_MODEL_NAME", "gpt-4o-mini"),
    api_key=os.environ["OPENAI_API_KEY"],
)

SCHEMA_CONTEXT = """
You are a marketing data analyst. The PostgreSQL database contains marketing analytics data from three platforms.

## GA4 (Google Analytics 4)
- **ga_properties** (property_id PK, display_name, last_synced)
- **ga_daily_overview** (property_id, report_date, sessions, total_users, new_users, screen_page_views, bounce_rate [0-1], avg_session_duration [seconds], engagement_rate [0-1], engaged_sessions)
- **ga_ecommerce** (property_id, report_date, total_revenue, transactions, avg_purchase_revenue, session_conversion_rate [0-1], purchase_to_view_rate [0-1])
- **ga_traffic_sources** (property_id, report_date, channel_group, source_medium, sessions, bounce_rate [0-1], engagement_rate [0-1])
- **ga_top_pages** (property_id, report_date, page_path, page_title, screen_page_views, avg_session_duration, bounce_rate [0-1], engagement_rate [0-1])
- **ga_device_geo** (property_id, report_date, device_category, country, sessions, total_users)

## GSC (Google Search Console)
- **gsc_sites** (site_url PK, permission_level, last_synced)
- **gsc_daily_overview** (site_url, report_date, clicks, impressions, ctr [0-1], position [avg SERP position])
- **gsc_queries** (site_url, report_date, query, clicks, impressions, ctr [0-1], position)
- **gsc_pages** (site_url, report_date, page, clicks, impressions, ctr [0-1], position)
- **gsc_countries** (site_url, report_date, country, clicks, impressions, ctr, position)
- **gsc_devices** (site_url, report_date, device, clicks, impressions, ctr, position)

## Semrush
- **semrush_domain_overview** (domain, database [region e.g. 'us'], semrush_rank, organic_keywords, organic_traffic, organic_cost, paid_keywords, paid_traffic, paid_cost)
- **semrush_keywords** (domain, database, keyword, position, previous_position, volume, cpc, url, traffic_pct)
- **semrush_competitors** (domain, database, competitor_domain, relevance, common_keywords, organic_keywords, organic_traffic, organic_cost, paid_keywords)
- **semrush_backlinks_overview** (domain, authority_score, total, domains_num, urls_num, ips_num, follows_num, nofollows_num, texts_num, images_num)
- **semrush_ref_domains** (domain, ref_domain, authority_score, backlinks_num, follows_num, nofollows_num, country, first_seen, last_seen)
- **semrush_anchors** (domain, anchor, domains_num, backlinks_num, follows_num, nofollows_num)
- **semrush_tld** (domain, zone, domains_num, backlinks_num)
- **semrush_geo** (domain, country_name, domains_num, backlinks_num)
- **semrush_linking_pages** (domain, source_url, source_title, page_ascore, backlinks_num)

## Important notes
- bounce_rate, engagement_rate, ctr, session_conversion_rate are stored as decimals 0-1, NOT percentages. Multiply by 100 when displaying.
- report_date is DATE type. Use date ranges like: report_date BETWEEN '2024-01-01' AND '2024-01-31'
- All tables have collected_at (TIMESTAMPTZ) — when data was fetched.
- GA4 tables use property_id as the key. GSC tables use site_url. Semrush tables use domain.

## Response formatting rules
- For tabular results, format as a markdown table.
- For time-series or categorical data that suits visualization, also include a ```chart-data code fence with a JSON array. Example:
  ```chart-data
  {"type": "line", "xKey": "report_date", "yKeys": ["sessions", "total_users"], "data": [...]}
  ```
  Supported chart types: "line", "bar", "pie"
- Always include the actual numbers — never just a chart without the data.
- Be concise but complete.
"""

marketing_agent = Agent(
    role="Marketing Data Analyst",
    goal="Answer marketing analytics questions by querying the PostgreSQL database. Always provide clear, data-driven answers.",
    backstory=SCHEMA_CONTEXT,
    tools=[nl2sql_tool],
    llm=llm,
    verbose=False,
    respect_context_window=True,
    max_iter=50,
)
