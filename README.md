This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.

## Synthetic Memory Pipeline (Temp MCP Replacement)

Set these env vars to enable Supabase-backed memory retrieval:

```bash
USE_SUPABASE_MEMORY=true
NEXT_PUBLIC_SUPABASE_URL=...
SUPABASE_SERVICE_ROLE_KEY=...
```

Use `MEMORY_PROVIDER` to switch memory engines:

```bash
# default
MEMORY_PROVIDER=supabase

# use Mem0 for memory ingest/search
MEMORY_PROVIDER=mem0
MEM0_API_KEY=...
# optional overrides:
MEM0_BASE_URL=https://api.mem0.ai
MEM0_AUTH_SCHEME=Token
MEM0_ADD_PATH=/v2/memories/
MEM0_SEARCH_PATH=/v2/memories/search/
MEM0_FILTER_FIELD=user_id
```

When `MEMORY_PROVIDER=mem0`, synthetic ingest will sync generated resources to Mem0 and chat retrieval will query Mem0 first. Supabase document/chunk/memory projections are still written for UI compatibility.

### Generate and ingest synthetic data

```bash
curl -X POST http://localhost:3000/api/ingest/synthetic \
  -H "Content-Type: application/json" \
  -d '{
    "cloneId": "YOUR_CLONE_UUID",
    "seed": "treehacks-demo",
    "volume": "medium",
    "sources": ["slack", "notion", "github"]
  }'
```

### Dry run validation only

```bash
curl -X POST http://localhost:3000/api/ingest/synthetic \
  -H "Content-Type: application/json" \
  -d '{
    "cloneId": "YOUR_CLONE_UUID",
    "dryRun": true,
    "sources": ["slack", "notion", "github"]
  }'
```

### Run smoke test flow (ingest + verify stats + retrieval coverage)

```bash
curl -X POST http://localhost:3000/api/ingest/synthetic/smoke \
  -H "Content-Type: application/json" \
  -d '{
    "cloneId": "YOUR_CLONE_UUID",
    "seed": "smoke-seed",
    "volume": "small"
  }'
```

### Trigger memory compaction

```bash
curl -X POST http://localhost:3000/api/memory/compact \
  -H "Content-Type: application/json" \
  -d '{
    "cloneId": "YOUR_CLONE_UUID",
    "mode": "both"
  }'
```
