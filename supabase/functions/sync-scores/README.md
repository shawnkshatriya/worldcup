# sync-scores Edge Function

Server-side cached proxy for football-data.org. All 250 users share one cached
API fetch (refreshed every 60 seconds), so you never hit rate limits.

## Deploy

supabase functions deploy sync-scores

## Required Secrets (set in Supabase Dashboard -> Edge Functions -> Secrets)

FOOTBALL_DATA_API_KEY = your key from football-data.org/client/register (free)

The World Cup is included in the free tier. 10 req/min on the free plan
is fine because this function caches for 60 seconds server-side.
