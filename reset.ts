import { supabase } from './lib/supabase.ts'; 
supabase.from('system_settings').select('value').eq('key', 'automation').single().then(async ({data}: any) => { 
  if(!data) return;
  const val = data.value as any; 
  delete val.lastMorningClose; 
  delete val.lastEveningClose; 
  await supabase.from('system_settings').update({value: val}).eq('key', 'automation'); 
  console.log('Reset shift close timestamps.'); 
  process.exit(0); 
});
