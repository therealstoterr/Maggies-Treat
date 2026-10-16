/*
  Maggie's Treat website configuration.
  Add your Supabase Project URL, anon/publishable key, and admin email below.
  The public anon key is meant for browser use; database Row Level Security protects private orders.
  NEVER paste a Supabase service_role/secret key into this file.
*/
const SUPABASE_URL = 'https://texzgslhswsyooixscmz.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_aVVNNntwsS4oqDdQNzIlEw_gEsUTf6O';

const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
