import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://oagkvryvjrmjkyquedbb.supabase.co';
const supabaseKey = 'sb_publishable_uQBgN5VRJhO2L26HukcF2w_sccksQ0B';

export const supabase = createClient(supabaseUrl, supabaseKey);
