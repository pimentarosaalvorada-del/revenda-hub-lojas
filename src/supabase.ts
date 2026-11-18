import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL =
  import.meta.env.VITE_SUPABASE_URL ?? 'https://mgpabziigapxzzqcuvkz.supabase.co';
const SUPABASE_ANON_KEY =
  import.meta.env.VITE_SUPABASE_ANON_KEY ?? 'sb_publishable_uQBgN5VRJhO2L26HukcF2w_sccksQ0B';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
