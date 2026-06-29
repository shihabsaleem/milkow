import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const getSupabaseAdmin = () => {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  
  return createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  });
};

export async function POST(request: Request) {
  try {
    const supabaseAdmin = getSupabaseAdmin();
    const authHeader = request.headers.get('Authorization');
    if (!authHeader) {
      return NextResponse.json({ error: 'Unauthorized: Missing token' }, { status: 401 });
    }
    const token = authHeader.replace('Bearer ', '');
    
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized: Invalid token' }, { status: 401 });
    }

    const { data: roleData, error: roleError } = await supabaseAdmin
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .single();

    if (roleError || roleData?.role !== 'superadmin') {
      return NextResponse.json({ error: 'Forbidden: Only superadmins can perform this action' }, { status: 403 });
    }

    const { franchiseId, newPassword } = await request.json();
    if (!franchiseId || !newPassword) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Find the franchise owner user id
    const { data: franchiseRoleData, error: franchiseRoleError } = await supabaseAdmin
      .from('user_roles')
      .select('user_id')
      .eq('franchise_id', franchiseId)
      .eq('role', 'franchise')
      .single();

    if (franchiseRoleError || !franchiseRoleData) {
      return NextResponse.json({ error: 'Franchise owner not found' }, { status: 404 });
    }

    const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(
      franchiseRoleData.user_id,
      { password: newPassword }
    );

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 });
    }

    return NextResponse.json({ success: true }, { status: 200 });

  } catch (error: any) {
    console.error('[API/Franchise/Password] Error:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
