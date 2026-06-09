
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://uttphyptfqrcqqrrbngw.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InV0dHBoeXB0ZnFyY3FxcnJibmd3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODA1MjcxMzMsImV4cCI6MjA5NjEwMzEzM30.DO_kb_AiUmSsQJExBktzWcgpHT2UzCNi-sBgmNj81UE';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

