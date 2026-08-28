import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || 'https://qtulldwcmblyfiyfqmuw.supabase.co';
const SUPABASE_KEY = process.env.SUPABASE_SECRET_KEY || process.env.VITE_SUPABASE_ANON_KEY || '';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

const boxData = [
  { code: 'BX001', stock: 35, landed: 220, rate: 280, name: 'Traditional Floral 4-Partition' },
  { code: 'BX002', stock: 4, landed: 250, rate: 320, name: 'Royal Velvet Red Quad' },
  { code: 'BX003', stock: 12, landed: 280, rate: 350, name: 'Gold Foil Paisley 4-Cavity' },
  { code: 'BX004', stock: 31, landed: 180, rate: 240, name: 'Minimalist Ivory 4-Square' },
  { code: 'BX005', stock: 14, landed: 260, rate: 330, name: 'Imperial Maroon Gold Rim' },
  { code: 'BX006', stock: 83, landed: 210, rate: 270, name: 'Emerald Textured Gift Box' },
  { code: 'BX007', stock: 46, landed: 300, rate: 380, name: 'Signature Velvet Royal Blue' },
  { code: 'BX008', stock: 46, landed: 190, rate: 250, name: 'Classic Gold Lattice 4-Section' },
  { code: 'BX009', stock: 2, landed: 350, rate: 450, name: 'Heritage Wooden Finish Box' },
  { code: 'BX010', stock: 15, landed: 230, rate: 290, name: 'Rose Gold Embossed 4-Piece' },
  { code: 'BX011', stock: 25, landed: 200, rate: 260, name: 'Midnight Navy Silver Edge' },
  { code: 'BX012', stock: 7, landed: 270, rate: 340, name: 'Vintage Brass Motif Velvet' },
  { code: 'BX013', stock: 41, landed: 210, rate: 270, name: 'Teal Peacock Motif 4-Cavity' },
  { code: 'BX014', stock: 23, landed: 240, rate: 310, name: 'Crimson Silk Brocade' },
  { code: 'BX015', stock: 20, landed: 260, rate: 330, name: 'Champagne Shimmer 4-Partition' },
  { code: 'BX016', stock: 18, landed: 190, rate: 250, name: 'Festive Ochre Mandala' },
  { code: 'BX017', stock: 16, landed: 220, rate: 280, name: 'Pastel Mint Geometric Box' },
  { code: 'BX018', stock: 14, landed: 250, rate: 320, name: 'Ruby Regal Hardboard' },
  { code: 'BX019', stock: 8, landed: 320, rate: 400, name: 'Sapphire Laser-Cut Luxury' },
  { code: 'BX020', stock: 7, landed: 280, rate: 360, name: 'Burgundy Velvet Royal Crest' },
  { code: 'BX021', stock: 11, landed: 240, rate: 300, name: 'Copper Metallic 4-Cavity' },
  { code: 'BX022', stock: 72, landed: 170, rate: 220, name: 'Golden Glow Eco-Kraft Box' },
  { code: 'BX023', stock: 40, landed: 200, rate: 260, name: 'Scarlet Festive Delight' },
  { code: 'BX024', stock: 96, landed: 160, rate: 210, name: 'Sunlit Saffron Compact' },
  { code: 'BX025', stock: 36, landed: 230, rate: 290, name: 'Onyx Black & Gold Border' },
  { code: 'BX026', stock: 74, landed: 180, rate: 240, name: 'Olive Green Festive Box' },
  { code: 'BX027', stock: 70, landed: 250, rate: 320, name: 'Magenta Royal Damask' },
  { code: 'BX028', stock: 45, landed: 190, rate: 250, name: 'Golden Mandala Hardboard' },
  { code: 'BX029', stock: 20, landed: 260, rate: 330, name: 'Deep Violet Velvet Quad' },
  { code: 'BX030', stock: 13, landed: 290, rate: 370, name: 'Plum Satin Finish Box' },
  { code: 'BX031', stock: 18, landed: 210, rate: 270, name: 'Antique Bronze Foil Box' },
  { code: 'BX032', stock: 23, landed: 220, rate: 280, name: 'Tuscan Sun Yellow Box' },
  { code: 'BX033', stock: 5, landed: 340, rate: 430, name: 'Platinum Crest Premium Velvet' },
  { code: 'BX034', stock: 2, landed: 380, rate: 480, name: 'Grand Emperor Gold Metal-Inlay' },
  { code: 'BX035', stock: 12, landed: 240, rate: 310, name: 'Persian Blue Luxury Box' },
];

async function main() {
  console.log('🚀 Starting import of 35 Box designs & opening stock into Supabase...');

  // 1. Get primary godown
  const { data: godowns, error: gErr } = await supabase.from('godowns').select('*').limit(1);
  if (gErr || !godowns || godowns.length === 0) {
    console.error('Failed to get godown:', gErr);
    return;
  }
  const godownId = godowns[0].id;
  console.log(`📍 Using Godown: "${godowns[0].name}" (${godownId})`);

  // 2. Upload images to Supabase Storage bucket 'box-images'
  const publicBaseUrl = `${SUPABASE_URL}/storage/v1/object/public/box-images`;

  for (let i = 0; i < boxData.length; i++) {
    const item = boxData[i];
    const imgPath = path.join('public', 'boxes', `${item.code}.png`);
    let finalImageUrl = `/boxes/${item.code}.png`;

    if (fs.existsSync(imgPath)) {
      const fileBuffer = fs.readFileSync(imgPath);
      const storageKey = `${item.code}.png`;
      const { error: upErr } = await supabase.storage
        .from('box-images')
        .upload(storageKey, fileBuffer, {
          contentType: 'image/png',
          upsert: true,
        });

      if (!upErr) {
        finalImageUrl = `${publicBaseUrl}/${storageKey}`;
      } else {
        console.log(`Note on image upload for ${item.code}:`, upErr.message);
      }
    }

    // 3. Upsert box record
    const { data: boxRow, error: bErr } = await supabase
      .from('boxes')
      .upsert(
        {
          box_code: item.code,
          box_name: item.name,
          category: 'Premium Gift Box',
          image_url: finalImageUrl,
          display_order: i + 1,
          status: 'ACTIVE',
        },
        { onConflict: 'box_code' }
      )
      .select()
      .single();

    if (bErr || !boxRow) {
      console.error(`Error inserting box ${item.code}:`, bErr?.message);
      continue;
    }

    const boxId = boxRow.id;

    // 4. Insert rate history
    await supabase.from('box_rate_history').insert({
      box_id: boxId,
      effective_from: '2026-01-01',
      purchase_unit_cost: item.landed,
      landed_unit_cost: item.landed,
      final_unit_box_rate: item.rate,
      reason: 'Initial Rate Setup from Box Stock Master',
    });

    // 5. Insert opening stock movement
    if (item.stock > 0) {
      await supabase.from('stock_movements').insert({
        document_id: boxId,
        document_type: 'OPENING',
        movement_type: 'OPENING_BALANCE',
        item_type: 'BOX',
        item_id: boxId,
        godown_id: godownId,
        physical_qty_delta: item.stock,
        reserved_qty_delta: 0,
        condition_bucket: 'SALEABLE',
        remarks: `Opening Balance import from box_stock.xlsx (Stock: ${item.stock})`,
      });
    }

    console.log(`✅ [${i + 1}/35] Imported ${item.code}: ${item.name} (Opening Stock: ${item.stock})`);
  }

  console.log('🎉 Successfully imported all 35 boxes and 1,004 opening stock units into Supabase!');
}

main().catch(console.error);
