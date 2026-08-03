import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';

export async function GET(
  request: Request,
  props: { params: Promise<{ namespace: string; key: string }> }
) {
  try {
    const params = await props.params;
    const { namespace, key } = params;
    const supabase = await createClient();

    const { data, error } = await supabase
      .from('settings')
      .select('*')
      .eq('namespace', namespace)
      .eq('key', key)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return NextResponse.json({ error: 'Setting not found' }, { status: 404 });
      }
      console.error('Error fetching setting:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const formattedValue = data.value_type === 'json' ? JSON.parse(data.value) : data.value;

    return NextResponse.json({ setting: { ...data, value: formattedValue } });
  } catch (error: any) {
    console.error(`Error in GET ${request.url}:`, error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function PUT(
  request: Request,
  props: { params: Promise<{ namespace: string; key: string }> }
) {
  try {
    const params = await props.params;
    const { namespace, key } = params;
    const supabase = await createClient();
    
    // Check if user is admin
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { value, value_type } = body;

    if (value === undefined) {
      return NextResponse.json({ error: 'Missing value field' }, { status: 400 });
    }

    const stringifiedValue = (value_type === 'json' || typeof value === 'object') ? JSON.stringify(value) : String(value);

    // Update only the value to preserve labels and metadata
    const { data, error } = await supabase
      .from('settings')
      .update({
        value: stringifiedValue,
        updated_by: user.id,
        updated_at: new Date().toISOString(),
      })
      .eq('namespace', namespace)
      .eq('key', key)
      .select()
      .single();

    if (error) {
      console.error('Error updating setting:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ setting: data });
  } catch (error: any) {
    console.error(`Error in PUT ${request.url}:`, error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  props: { params: Promise<{ namespace: string; key: string }> }
) {
  try {
    const params = await props.params;
    const { namespace, key } = params;
    const supabase = await createClient();
    
    // Check if user is admin
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { error } = await supabase
      .from('settings')
      .delete()
      .eq('namespace', namespace)
      .eq('key', key);

    if (error) {
      console.error('Error deleting setting:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error(`Error in DELETE ${request.url}:`, error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
