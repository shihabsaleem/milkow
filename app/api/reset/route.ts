import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function GET() {
  try {
    const { data } = await supabase.from('system_settings').select('value').eq('key', 'automation').single();
    if (!data) return NextResponse.json({ success: false, message: 'No settings found' });
    
    const val = data.value as any;
    delete val.lastMorningClose;
    delete val.lastEveningClose;
    
    await supabase.from('system_settings').update({ value: val }).eq('key', 'automation');
    
    return NextResponse.json({ success: true, message: 'Shift states reset successfully. You can now test deliveries.' });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message });
  }
}
