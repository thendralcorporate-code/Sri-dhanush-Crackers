export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();

  const supabaseUrl = process.env.SUPABASE_URL || '';
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

  if (!supabaseUrl || !supabaseKey) {
    return res.status(500).json({ 
      error: "Vercel Environment Variables Missing!",
      urlPresent: !!supabaseUrl,
      keyPresent: !!supabaseKey 
    });
  }

  try {
    const cleanUrl = supabaseUrl.trim().replace(/\/$/, '');
    const cleanKey = supabaseKey.trim();

    const response = await fetch(`${cleanUrl}/rest/v1/products?select=*&order=id.asc`, {
      headers: {
        'apikey': cleanKey,
        'Authorization': `Bearer ${cleanKey}`
      }
    });

    const responseText = await response.text();

    if (!response.ok) {
      return res.status(500).json({ 
        error: "Supabase Fetch Failed", 
        status: response.status, 
        details: responseText 
      });
    }

    const data = JSON.parse(responseText);
    return res.status(200).json(data);
  } catch (err) {
    return res.status(500).json({ error: "Server Catch Error", message: err.message });
  }
}
