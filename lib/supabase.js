import { createClient } from '@supabase/supabase-js';
import { SUPABASE_URL, supabaseServiceKey } from './config';

let _sb = null;
export function getSupabase() {
  if (!_sb) _sb = createClient(SUPABASE_URL, supabaseServiceKey());
  return _sb;
}
