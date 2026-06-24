import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

// Initialize a Supabase client with the Service Role Key for admin capabilities
const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

export async function POST(request: Request) {
  try {
    // 1. Authenticate the request
    const authHeader = request.headers.get('Authorization');
    if (!authHeader) {
      return NextResponse.json({ error: 'Unauthorized: Missing token' }, { status: 401 });
    }
    const token = authHeader.replace('Bearer ', '');
    
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized: Invalid token' }, { status: 401 });
    }

    // 2. Verify Superadmin role
    const { data: roleData, error: roleError } = await supabaseAdmin
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .single();

    if (roleError || roleData?.role !== 'superadmin') {
      return NextResponse.json({ error: 'Forbidden: Only superadmins can perform this action' }, { status: 403 });
    }

    // 3. Parse Request Body
    const { owner_email, owner_password, franchise_name } = await request.json();
    if (!owner_email || !owner_password || !franchise_name) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // 4. Create Franchise and Auth User concurrently
    const [franchiseResult, authResult] = await Promise.all([
      supabaseAdmin.from('franchises').insert({ name: franchise_name }).select('id').single(),
      supabaseAdmin.auth.admin.createUser({
        email: owner_email,
        password: owner_password,
        email_confirm: true,
        user_metadata: {}
      })
    ]);

    if (franchiseResult.error || authResult.error) {
      // Rollback whichever one succeeded if the other failed
      if (!franchiseResult.error && franchiseResult.data) {
        await supabaseAdmin.from('franchises').delete().eq('id', franchiseResult.data.id);
      }
      if (!authResult.error && authResult.data?.user) {
        await supabaseAdmin.auth.admin.deleteUser(authResult.data.user.id);
      }

      return NextResponse.json({ 
        error: franchiseResult.error?.message || authResult.error?.message || 'Failed to create resources' 
      }, { status: 500 });
    }

    const franchiseId = franchiseResult.data.id;
    const newUserId = authResult.data.user.id;

    // 6. Assign Role and Franchise ID in user_roles
    const { error: assignRoleError } = await supabaseAdmin
      .from('user_roles')
      .insert({
        user_id: newUserId,
        role: 'franchise',
        franchise_id: franchiseId
      });

    if (assignRoleError) {
      return NextResponse.json({ error: `Failed to assign role: ${assignRoleError.message}` }, { status: 500 });
    }

    return NextResponse.json({ success: true, franchiseId, userId: newUserId }, { status: 201 });

  } catch (error: any) {
    console.error('[API/Franchise] Error:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
