import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    
    // We expect the client to send the full cart state to sync
    const body = await request.json();
    const { items, sessionId, currency, couponCode, giftWrap, giftMessage, notes } = body;

    // Determine customer_id
    const customerId = user?.id || null;
    
    // Check if a cart already exists for this user or session
    let cartId = null;
    let query = supabase.from('carts').select('id, expires_at').eq('status', 'active');
    
    if (customerId) {
      query = query.eq('customer_id', customerId);
    } else if (sessionId) {
      query = query.eq('session_id', sessionId);
    } else {
      return NextResponse.json({ error: 'Missing user or session ID' }, { status: 400 });
    }

    const { data: existingCart } = await query.single();
    
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 30); // 30 days from now

    if (existingCart) {
      // Update existing cart
      cartId = existingCart.id;
      await supabase.from('carts').update({
        currency: currency || 'CAD',
        coupon_code: couponCode || null,
        gift_wrap: giftWrap || false,
        gift_message: giftMessage || null,
        notes: notes || null,
        updated_at: new Date().toISOString(),
        expires_at: expiresAt.toISOString(),
      }).eq('id', cartId);
    } else {
      // Create new cart
      const { data: newCart, error: createError } = await supabase.from('carts').insert({
        customer_id: customerId,
        session_id: sessionId,
        currency: currency || 'CAD',
        coupon_code: couponCode || null,
        gift_wrap: giftWrap || false,
        gift_message: giftMessage || null,
        notes: notes || null,
        expires_at: expiresAt.toISOString(),
      }).select().single();
      
      if (createError) throw createError;
      cartId = newCart.id;
    }

    // Upsert items (this is a simple replace-all for the sync)
    // First delete all existing items for this cart
    await supabase.from('cart_items').delete().eq('cart_id', cartId);
    
    if (items && items.length > 0) {
      const cartItemsToInsert = items.map((item: any) => ({
        cart_id: cartId,
        product_id: item.productId,
        variant_id: item.variantId || null,
        quantity: item.quantity,
        unit_price: item.price,
        product_snapshot: {
          nameEn: item.nameEn,
          nameFa: item.nameFa,
          image: item.image,
          selectedAttributes: item.selectedAttributes || null,
          color: item.variantColor,
          size: item.variantSize
        }
      }));
      
      await supabase.from('cart_items').insert(cartItemsToInsert);
    }

    return NextResponse.json({ success: true, cartId });
  } catch (error: any) {
    console.error('Cart sync error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function GET(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    const { searchParams } = new URL(request.url);
    const sessionId = searchParams.get('sessionId');

    const customerId = user?.id || null;
    
    let query = supabase.from('carts').select(`
      *,
      cart_items (*)
    `).eq('status', 'active');

    if (customerId) {
      query = query.eq('customer_id', customerId);
    } else if (sessionId) {
      query = query.eq('session_id', sessionId);
    } else {
      return NextResponse.json({ error: 'Missing user or session ID' }, { status: 400 });
    }

    const { data: cart } = await query.single();
    
    if (!cart) {
      return NextResponse.json({ cart: null });
    }

    return NextResponse.json({ cart });
  } catch (error: any) {
    console.error('Cart fetch error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
