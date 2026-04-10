# delete-player Edge Function

Deploys to Supabase and handles full player deletion (players table + auth.users).

## Deploy

Install Supabase CLI if you haven't:
  npm install -g supabase

Login:
  supabase login

Link your project (get your project ref from Supabase dashboard URL):
  supabase link --project-ref your-project-ref

Set the ADMIN_SECRET environment variable in Supabase:
  Go to Supabase Dashboard -> Edge Functions -> delete-player -> Secrets
  Add: ADMIN_SECRET = (same value as your VITE_ADMIN_SECRET in Vercel)

Deploy the function:
  supabase functions deploy delete-player

That's it. The Admin panel Remove button will now fully delete players.
