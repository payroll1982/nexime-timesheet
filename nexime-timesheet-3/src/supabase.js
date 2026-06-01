import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL  = "https://maleyjpfvofpgdeepkfo.supabase.co";
const SUPABASE_KEY  = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1hbGV5anBmdm9mcGdkZWVwa2ZvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODAyODM4NTUsImV4cCI6MjA5NTg1OTg1NX0.BKPoIVebQwhfsPE4ujZ7HLl11BJVWzpTZjBw6JvF7ck";

export const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
