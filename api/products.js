import { createClient } from '@supabase/supabase-js';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();

  let supabaseUrl = (process.env.SUPABASE_URL || '').trim().replace(/\/$/, '');
  const supabaseKey = (process.env.SUPABASE_SERVICE_ROLE_KEY || '').trim();

  if (!supabaseUrl || !supabaseKey) {
    return res.status(500).json({ error: "Supabase Keys missing in Vercel" });
  }

  const supabase = createClient(supabaseUrl, supabaseKey);

  // 1. GET ALL PRODUCTS
  if (req.method === 'GET') {
    try {
      const { data, error } = await supabase.from('products').select('*').order('id', { ascending: true });
      if (error) return res.status(500).json({ error: error.message });
      return res.status(200).json(data || []);
    } catch (err) {
      return res.status(500).json({ error: err.message });
    }
  }

  // 2. SAVE / UPDATE / BULK CSV UPSERT
  if (req.method === 'POST') {
    try {
      const body = req.body || {};

      // Action A: Single Product Quick Edit / Toggle Status / Add New
      if (body.action === 'save_single') {
        const item = body.product;
        const payload = {
          category: item.category || 'General',
          eng_name: item.eng_name || item.eng || 'New Product',
          tam_name: item.tam_name || item.tam || '',
          per_unit: item.per_unit || item.per || 'pkt',
          rate: parseFloat(item.rate) || 0,
          stock_qty: parseInt(item.stock_qty) || 0,
          youtube_url: item.youtube_url ? String(item.youtube_url).trim() : '',
          status: item.status || (parseInt(item.stock_qty) > 0 ? 'In Stock' : 'Out of Stock')
        };

        if (item.id) payload.id = item.id; // Existing ID update

        const { data, error } = await supabase.from('products').upsert([payload]);
        if (error) return res.status(500).json({ error: error.message });
        return res.status(200).json({ success: true, data });
      }

      // Action B: Bulk CSV Sync (Accumulate Stock: Old Stock + New Stock)
      if (body.action === 'bulk_csv_upload' && Array.isArray(body.products)) {
        // Fetch existing products first to calculate Old Stock + New Stock
        const { data: existingProducts } = await supabase.from('products').select('*');
        const existingMap = new Map();
        (existingProducts || []).forEach(p => existingMap.set(p.eng_name.trim().toLowerCase(), p));

        const upsertPayloads = [];

        for (let row of body.products) {
          const engKey = (row.eng_name || row.eng || '').trim().toLowerCase();
          const existing = existingMap.get(engKey);

          let finalStock = parseInt(row.stock_qty || row.stock) || 0;
          let finalRate = parseFloat(row.rate) || 0;
          let finalYoutube = row.youtube_url || row.youtube || '';

          if (existing) {
            // Old Stock + New Stock Rule
            finalStock = (parseInt(existing.stock_qty) || 0) + finalStock;
            if (!row.rate || parseFloat(row.rate) <= 0) {
              finalRate = parseFloat(existing.rate) || 0;
            }
            if (!finalYoutube) {
              finalYoutube = existing.youtube_url || '';
            }
          }

          upsertPayloads.push({
            id: existing ? existing.id : undefined,
            category: row.category || (existing ? existing.category : 'General'),
            eng_name: row.eng_name || row.eng,
            tam_name: row.tam_name || row.tam || (existing ? existing.tam_name : ''),
            per_unit: row.per_unit || row.per || (existing ? existing.per_unit : 'pkt'),
            rate: finalRate,
            stock_qty: finalStock,
            youtube_url: String(finalYoutube).trim(),
            status: finalStock > 0 ? 'In Stock' : 'Out of Stock'
          });
        }

        const { data, error } = await supabase.from('products').upsert(upsertPayloads);
        if (error) return res.status(500).json({ error: error.message });
        return res.status(200).json({ success: true, count: upsertPayloads.length, data });
      }

      return res.status(400).json({ error: "Invalid Action" });
    } catch (err) {
      return res.status(500).json({ error: err.message });
    }
  }

  return res.status(405).json({ error: "Method Not Allowed" });
}
