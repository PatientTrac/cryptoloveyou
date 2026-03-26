# Content Types & JSON Schemas

This project generates **new pages only** using **structured JSON**, rendered into static HTML via Handlebars templates.

## Supported `content_type` values

- `seo_article`: educational/long-tail article that links into the funnel
- `review_page`: conversion-focused review of a single platform/tool
- `money_page`: comparison-first “best X” page with table + recommendation

All content types share a common envelope and then add type-specific fields.

## Common envelope (all types)

```json
{
  "content_type": "seo_article | review_page | money_page",
  "slug": "string (kebab-case, unique)",
  "title": "string",
  "summary": "string (optional)",
  "meta_title": "string (optional)",
  "meta_description": "string (optional)",
  "tags": ["string"] ,
  "internal_links": ["/some-path", "/another-path"],
  "ctas": [
    {
      "type": "primary | secondary",
      "platform": "binance | coinbase | ledger | ...",
      "text": "string",
      "placement": "hero | table | section | footer"
    }
  ],
  "sections": {}
}
```

Rules:
- `slug` and `title` are required.
- `internal_links` must be **site-relative paths** (begin with `/`).
- CTA buttons should use tracked links: `/aff/:platform?article={{slug}}`.
- Numeric claims (APY, fees, TVL) must be curated or omitted. Do not invent numbers.

## `seo_article` schema (required)

```json
{
  "content_type": "seo_article",
  "slug": "string",
  "title": "string",
  "sections": {
    "intro": "string",
    "body": "string",
    "conclusion": "string"
  },
  "internal_links": ["/reviews/some-platform", "/best/some-money-page"]
}
```

Required:
- `sections.intro`
- At least **1** internal link to a review/money page (enforced as “>= 1 link” in validation).

## `review_page` schema (required)

```json
{
  "content_type": "review_page",
  "slug": "string",
  "title": "string",
  "platform": {
    "key": "registry_platform_key",
    "name": "string"
  },
  "sections": {
    "what_it_is": "string",
    "key_features": ["string"],
    "how_to": ["string"],
    "risks": ["string"],
    "trust_factors": ["string"],
    "alternatives": [
      { "name": "string", "href": "/reviews/other" }
    ],
    "conclusion": "string"
  },
  "ctas": [
    { "type": "primary", "platform": "binance", "text": "Get started", "placement": "hero" }
  ]
}
```

Required:
- `platform.key`
- `sections.what_it_is`
- `sections.key_features` (>= 3 items)
- `sections.risks` (>= 2 items)
- `sections.conclusion`

## `money_page` schema (required)

```json
{
  "content_type": "money_page",
  "slug": "string",
  "title": "string",
  "sections": {
    "intro": "string",
    "safety_checklist": ["string"],
    "risk_analysis": "string",
    "final_recommendation": "string"
  },
  "comparison_table": {
    "columns": ["Platform", "Best_for", "Notes"],
    "rows": [
      {
        "platform": "binance",
        "cells": {
          "Platform": "Binance",
          "Best_for": "Beginners",
          "Notes": "Varies by region"
        },
        "cta": { "platform": "binance", "text": "Open Binance", "placement": "table" }
      }
    ]
  },
  "faqs": [
    { "q": "string", "a": "string" }
  ],
  "ctas": [
    { "type": "primary", "platform": "binance", "text": "Compare platforms", "placement": "hero" }
  ]
}
```

Required:
- `sections.intro`
- `comparison_table.rows` (>= 3)
- `sections.risk_analysis`
- `faqs` (>= 3)
- `sections.final_recommendation`

