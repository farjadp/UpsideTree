import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { requireAdmin } from '@/lib/admin-auth';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const namespace = searchParams.get('namespace');
    const isPublic = searchParams.get('is_public');

    const supabase = await createClient();

    // The storefront reads public branding through here; everything else
    // (including secret settings) is admin-only.
    const guard = isPublic === 'true' ? null : await requireAdmin();
    if (guard && !guard.ok) {
      return NextResponse.json({ error: guard.error }, { status: guard.status });
    }

    let query = supabase.from('settings').select('*');

    if (namespace) {
      query = query.eq('namespace', namespace);
    }
    
    if (isPublic === 'true') {
      query = query.eq('is_public', true);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching settings:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Format the response as a key-value pair based on namespace
    const formattedData = data.reduce((acc: any, setting: any) => {
      if (!acc[setting.namespace]) {
        acc[setting.namespace] = {};
      }
      acc[setting.namespace][setting.key] = setting.value_type === 'json' ? JSON.parse(setting.value) : setting.value;
      return acc;
    }, {});

    return NextResponse.json({ settings: formattedData, raw: data });
  } catch (error: any) {
    console.error('Error in GET /api/admin/settings:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const guard = await requireAdmin();
    if (!guard.ok) {
      return NextResponse.json({ error: guard.error }, { status: guard.status });
    }
    const supabase = await createClient();
    
    const body = await request.json();
    const { namespace, key, value, value_type, label_en, label_fa, description, is_secret, is_public } = body;

    if (!namespace || !key || value === undefined || !value_type || !label_en) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const stringifiedValue = value_type === 'json' ? JSON.stringify(value) : String(value);

    const { data, error } = await supabase
      .from('settings')
      .upsert({
        namespace,
        key,
        value: stringifiedValue,
        value_type,
        label_en,
        label_fa,
        description,
        is_secret: is_secret || false,
        is_public: is_public || false,
        updated_by: guard.userId,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'namespace,key' })
      .select()
      .single();

    if (error) {
      console.error('Error saving setting:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Log to admin_audit_logs could go here

    return NextResponse.json({ setting: data });
  } catch (error: any) {
    console.error('Error in POST /api/admin/settings:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
