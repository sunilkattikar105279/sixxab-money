# SIXXAB Money — release 1

A transparent money-leadership platform: a Finviz-style portal plus a team of agents that explain markets, the economy and world events, and coach each member through the six SIXXAB money stages from age 11. Release 1 serves consumers and families in the US and India.

Blueprint: [SIXXAB Money Agent Platform — Blueprint v1](https://claude.ai/artifact/EuneEaY8eu1wtK8kkGt6MC) · Design: [Portal prototype](https://claude.ai/artifact/11UG6FVzJnrJYZ6pNnySZL)

## What's in release 1

| Area | Where | What it does |
| --- | --- | --- |
| Portal | `src/app` | Home (US / India / Global), Economy, World & Policy, My Money, Learn, Levels, Ask |
| Orchestrator | `src/lib/agents/orchestrator.ts` | Calm check → route (Haiku) → answer with tools (Sonnet) → guardrail |
| Domain agents | `src/lib/agents/domains.ts` | Markets, Economy, World & Policy, Money Coach, Tutor |
| Calm agent (money emotions) | `src/lib/emotion.ts` | Reads panic, FOMO, shame, anxiety, distress; adapts tone; 24-hour cooling-off before irreversible moves; distress goes to human support with no market content |
| Guardrail | `src/lib/agents/guardrail.ts` | Blocks buy/sell calls (SEC/SEBI), partisan statements, trading topics for minors; adds the disclaimer; SEBI 30-day price-lag rule for India education |
| Handshake protocol | `src/lib/agents/handshake.ts` | Versioned envelope + call matrix: which agent may ask which, for what. Every exchange logged |
| Governed self-learning | `src/lib/learning/gates.ts`, `/api/learning`, `/admin/learning` | Feedback → proposal → eval gate → shadow → canary → human approval (two for minors, advice, politics, emotion) → live → one-step rollback |
| Transparency ledger | `src/lib/ledger.ts` | Every answer stored with question, sources, model, confidence, emotion tone, handshakes |
| Database gates | `supabase/migrations/0001_init.sql` | Age 11+, parent consent for under-18s, 6S stage promotion only after 3 consecutive months of both gates, learning-gate order, editor review for policy briefs, row-level security (mood is private even from parents) |
| Daily job | `n8n/daily-brief.json` | Weekdays 7:30 AM CST: store the market snapshot, write the agent brief |

## Run it

```bash
npm install
cp .env.example .env.local   # fill in the keys
npm run dev                   # http://localhost:3000
npm test                      # 6S gates, guardrail, emotions, handshake, learning gates
```

Without Supabase or Claude keys the portal still runs in demo mode: US cards show the Nov 13, 2026 close as a labelled sample, India and Global show "awaiting feed", My Money shows a sample member, and the agent box says it isn't configured.

## Set up the services

1. **Supabase:** create a project, run `supabase/migrations/0001_init.sql` in the SQL editor, enable email and phone sign-in, copy the URL, anon key and service-role key into `.env.local`.
2. **Claude API:** add `ANTHROPIC_API_KEY`. Models default to `claude-haiku-5-5` (routing) and `claude-sonnet-5-5` (answers).
3. **FRED:** free key at fred.stlouisfed.org for the US economy tiles.
4. **Vercel:** import this repo, add the same env vars, deploy.
5. **n8n:** import `n8n/daily-brief.json`, set `SIXXAB_BASE_URL`, `SIXXAB_CRON_SECRET` and your licensed market-data vendor URL.

## Before public launch

- Securities-law review in the US and India; release 1 stays education-only (no personalised buy/sell).
- Licensed market-data feeds for US and NSE/BSE (live or 15-minute delayed).
- Nifty levels and personalised plans wait for SEBI research-analyst / US adviser registration.
- Parent-consent flow and privacy notice reviewed for COPPA (US) and the DPDP Act (India).

## Screener, scoring and market data (added Nov 13, 2026)

| Market | Free provider | Keys |
| --- | --- | --- |
| US prices, 1m to daily | Alpaca market data (IEX feed) | `ALPACA_KEY_ID`, `ALPACA_SECRET_KEY` |
| India prices, 1m to daily | Upstox API (needs an Upstox account) | `UPSTOX_ACCESS_TOKEN` |
| Global prices | Twelve Data (800 credits/day) | `TWELVEDATA_API_KEY` |
| US company results | SEC EDGAR company facts (no key; SEC asks for a contact string) | `SEC_USER_AGENT` |
| US company news | Finnhub | `FINNHUB_API_KEY` |
| Economy | FRED | `FRED_API_KEY` |

- **Engine** (`src/lib/ta`): trend on yearly/monthly/weekly/daily/4H/1H/15m; break levels on monthly/weekly/daily; supply/demand zones on daily/4H/1H; money flow, A/D line, OBV, relative volume, VWAP; Wyckoff cycle read; Elliott wave check against the three hard rules.
- **Score** (`src/lib/score.ts`): 1–10 per factor (trend, momentum, accumulation, business results, news, industry) and a weighted composite; missing data is left out, never guessed.
- **Screener** (`/screener`): Investment & swing, Day trades, Quick trades. Setups use 1:2 reward:risk with the higher-timeframe trend, 1:1 against it.
- **Nightly job**: `.github/workflows/ingest.yml` runs `npx tsx scripts/ingest.ts US|IN|GLOBAL` after each close and fills the home map, analysis and setups. Add the keys above as GitHub repository secrets, plus `NEXT_PUBLIC_SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY`.
- **Compliance**: India entry/stop/target levels stay hidden until `SIXXAB_SEBI_RA=true` (SEBI research-analyst registration). `SIXXAB_PERSONAL_MODE=true` shows them on a private, single-user install. Free data tiers are mostly for personal or development use; a public launch needs paid data licences.
- Run `supabase/migrations/0002_stock_quotes.sql` and `0003_analysis.sql` in Supabase.

## Portal features mapped from the prototype (Nov 14, 2026)
- Home: agent brief, index cards, breadth bars (advancing/declining, 52-week highs/lows, above 50/200-day), industry map, daily-brief reels, stocks table, top movers, world & policy cards, SIXXAB journey with stage illustrations.
- Economy: US / India / Global switch (FRED series incl. USD/INR, Brent, dollar index), calendar (`econ_events`), "what it means for your money", economy reels.
- World & Policy: topic filters, featured brief (facts, both views, money), Nvidia story reel, tracker, country lens.
- My Money: stage gates, tickable 90-day plan (saved), budget split, stage videos, mood check-in, coach, family, linked accounts.
- `/status` checks every connection; `/login` and `/onboarding` create the member profile.
- Run `supabase/migrations/0004_videos.sql` and `0005_econ_events.sql`.


## Founding-member launch (B2C)

- Run `supabase/migrations/0006_rate_limits.sql` and `0007_founding_members.sql` in the Supabase SQL Editor.
- The first 100 members get a founding number (free for good), a referral link and a starter 90-day plan from their goal.
- Agent limits: visitors 5 questions/day, members 40/day, plus a site-wide daily cap (`SIXXAB_AGENT_DAILY_CAP`, default 2000).
- Growth dashboard for admins: `/admin/growth`. Funnel events go to Vercel Web Analytics (enable it in the Vercel project).
- Legal pages: `/legal/disclosures`, `/legal/privacy`, `/legal/terms`. Operator, contact email and jurisdiction come from `NEXT_PUBLIC_OPERATOR`, `NEXT_PUBLIC_CONTACT_EMAIL`, `NEXT_PUBLIC_JURISDICTION` (see `src/lib/site.ts`). Have a lawyer review them.
- Set up custom SMTP in Supabase (Authentication → Emails) before inviting people: the built-in sender only sends a few emails per hour.
