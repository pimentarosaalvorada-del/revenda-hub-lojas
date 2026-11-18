import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://oagkvryvjrmjkyquedbb.supabase.co';
const supabaseKey = 'sb_publishable_uQgBN5VRJh02L26HukcF2w_sccks_OmsrU31c';

export const supabase = createClient(supabaseUrl, supabaseKey);
