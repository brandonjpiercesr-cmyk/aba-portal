import { createClient } from '@supabase/supabase-js';
import { SUPABASE_URL, SUPABASE_SERVICE } from './config';

let _sb = null;
export function getSupabase() {
  if (!_sb) _sb = createClient(SUPABASE_URL, SUPABASE_SERVICE);
  return _sb;
}
