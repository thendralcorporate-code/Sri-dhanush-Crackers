import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://uviquxhywthznpnqmnx.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InV2aXF1eGh5eXd0aHpucG5xbW54Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4ODk1MjU0MCwiZXhwIjoyMTA0NTI4NTQwfQ.-8lymr2NrPGjk5qEZ6QBkUMJrsUWHUDY52lZyzif358';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();

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
