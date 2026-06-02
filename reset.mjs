import { createClient } from '@supabase/supabase-js'; 
import * as dotenv from 'dotenv'; 
dotenv.config({ path: '.env.local' }); 
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
if (!supabaseUrl || !supabaseKey) throw new Error('Missing Supabase keys');
const supabase = createClient(supabaseUrl, supabaseKey); 
supabase.from('system_settings').select('value').eq('key', 'automation').single().then(async ({data}) => { 
  if(!data) return;
  const val = data.value; 
  delete val.lastMorningClose; 
  delete val.lastEveningClose; 
  await supabase.from('system_settings').update({value: val}).eq('key', 'automation'); 
  console.log('Reset successful'); 
});
