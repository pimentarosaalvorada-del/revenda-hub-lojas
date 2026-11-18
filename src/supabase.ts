import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://mgpabziigapxzzqcuvkz.supabase.co';
const supabaseAnonKey = 'sb_publishable_uQBgN5VRJhO2L26HukcF2w_sccksQ0B';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
