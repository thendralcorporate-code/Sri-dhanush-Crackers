import { createClient } from '@supabase/supabase-js';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();

  let supabaseUrl = (process.env.SUPABASE_URL || '').trim().replace(/\/$/, '');
  const supabaseKey = (process.env.SUPABASE_SERVICE_ROLE_KEY || '').trim();

  if (!supabaseUrl || !supabaseKey) {
    return res.status(500).json({ error: "Supabase Environment Variables Missing in Vercel" });
  }

  const supabase = createClient(supabaseUrl, supabaseKey);

  // 1. GET SHOP SETTINGS
  if (req.method === 'GET') {
    try {
      const { data, error } = await supabase
        .from('settings')
        .select('*')
        .eq('id', 1);

      if (error) {
        return res.status(500).json({ error: error.message });
      }

      if (data && data.length > 0) {
        return res.status(200).json(data[0]);
      } else {
        return res.status(200).json({});
      }
    } catch (err) {
      return res.status(500).json({ error: err.message });
    }
  }

  // 2. SAVE / UPDATE SHOP SETTINGS
  if (req.method === 'POST') {
    try {
      const body = req.body || {};
      const payload = {
        id: 1,
        shop_name: body.shop_name || 'SRI DHANUSH CRACKERS',
        address: body.address || '',
        contacts: body.contacts || '',
        whatsapp: body.whatsapp || '',
        logo_url: body.logo_url || ''
      };

      const { data, error } = await supabase
        .from('settings')
        .upsert([payload]);

      if (error) {
        return res.status(500).json({ error: error.message });
      }

      return res.status(200).json({ success: true, data });
    } catch (err) {
      return res.status(500).json({ error: err.message });
    }
  }

  return res.status(405).json({ error: "Method Not Allowed" });
}
