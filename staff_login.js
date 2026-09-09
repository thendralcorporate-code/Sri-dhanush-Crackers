import { createClient } from '@supabase/supabase-js';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();

  let supabaseUrl = (process.env.SUPABASE_URL || '').trim().replace(/\/$/, '');
  const supabaseKey = (process.env.SUPABASE_SERVICE_ROLE_KEY || '').trim();

  if (!supabaseUrl || !supabaseKey) {
    return res.status(500).json({ error: "Supabase Keys missing in Vercel" });
  }

  const supabase = createClient(supabaseUrl, supabaseKey);

  const { user, pass } = req.query;

  if (!user || !pass) {
    return res.status(400).json({ success: false, message: "User and Pass required" });
  }

  try {
    // Supabase 'staff' Table-ல் லாகின் விவரங்களைச் சரிபார்த்தல்
    const { data, error } = await supabase
      .from('staff')
      .select('*')
      .eq('username', user.trim())
      .eq('password', pass.trim())
      .single();

    if (error || !data) {
      return res.status(401).json({ success: false, message: "Invalid credentials" });
    }

    return res.status(200).json({
      success: true,
      username: data.username,
      role: data.role || 'STAFF',
      name: data.name || data.username
    });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
}
