import { createClient } from '@supabase/supabase-js';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();

  let rawUrl = process.env.SUPABASE_URL || 'uviquxhywthznpnqmnx.supabase.co';
  rawUrl = rawUrl.trim().replace(/\/$/, '');
  if (!rawUrl.startsWith('http://') && !rawUrl.startsWith('https://')) {
    rawUrl = 'https://' + rawUrl;
  }
  const supabaseUrl = rawUrl;

  const supabaseKey = (
    process.env.SUPABASE_SERVICE_ROLE_KEY || 
    process.env.SUPABASE_KEY || 
    process.env.SUPABASE_ANON_KEY || 
    ''
  ).trim();

  if (!supabaseUrl || !supabaseKey) {
    return res.status(500).json({ error: "Supabase Keys missing in Vercel" });
  }

  const supabase = createClient(supabaseUrl, supabaseKey);

  if (req.method === 'GET') {
    try {
      const { data, error } = await supabase.from('settings').select('*');
      if (error) return res.status(500).json({ error: error.message });
      return res.status(200).json(data || []);
    } catch (err) {
      return res.status(500).json({ error: err.message });
    }
  } else {
    return res.status(405).json({ error: "Method Not Allowed" });
  }
}
