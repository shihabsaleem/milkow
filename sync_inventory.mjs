import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || '';
const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  console.log('Fetching products and inventory...');
  
  const { data: products, error: pErr } = await supabase.from('products').select('*');
  const { data: inventory, error: iErr } = await supabase.from('inventory').select('*').not('product_id', 'is', null);

  console.log('UI Query Error:', iErr);
  
  if (pErr || iErr) {
    console.error('Error fetching data:', pErr, iErr);
    return;
  }
  
  console.log('Inventory count:', inventory.length);
  if (inventory.length > 0) {
    console.log('First inventory item:', inventory[0]);
  }

  const existingProductIds = new Set(inventory.map(i => i.product_id));
  const missingProducts = products.filter(p => !existingProductIds.has(p.id));

  if (missingProducts.length === 0) {
    console.log('No missing inventory records found.');
    return;
  }

  console.log(`Found ${missingProducts.length} missing inventory records. Inserting...`);

  const inserts = missingProducts.map(p => ({
    product_id: p.id,
    name: p.name,
    vol: p.size,
    count: p.stock,
    loaded: p.stock,
    unit: p.unit || 'Bottles'
  }));

  const { error: insertErr } = await supabase.from('inventory').insert(inserts);
  if (insertErr) {
    console.error('Error inserting inventory:', insertErr);
  } else {
    console.log('Successfully restored missing inventory records!');
  }
}

run().catch(console.error);
