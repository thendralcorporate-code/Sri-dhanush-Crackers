import { createClient } from '@supabase/supabase-js';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  let supabaseUrl = (process.env.SUPABASE_URL || '').trim().replace(/\/$/, '');
  const supabaseKey = (process.env.SUPABASE_SERVICE_ROLE_KEY || '').trim();

  if (!supabaseUrl || !supabaseKey) {
    return res.status(500).json({ error: "Supabase Keys missing in Vercel" });
  }

  const supabase = createClient(supabaseUrl, supabaseKey);

  if (req.method === 'POST') {
    try {
      const body = req.body;
      const genId = body.order_id || body.orderId || ("SDC-" + Math.floor(10000000 + Math.random() * 90000000));
      
      // Flexible Mapping for all possible column names in Supabase
      const dbPayload = {
        id: genId,
        order_id: genId,
        customer_name: body.customer_name || body.name || 'Customer',
        mobile: body.mobile || '9999999999',
        address: body.address || 'N/A',
        district: body.district || 'Sivakasi',
        total_amount: parseFloat(body.total_amount || body.total || 0),
        order_type: body.order_type || body.orderType || 'Online Customer',
        items: typeof body.items === 'string' ? body.items : JSON.stringify(body.items || []),
        business_interest: body.business_interest || 'NO',
        approval_status: body.approval_status || 'Pending'
      };

      const { data, error } = await supabase
        .from('orders')
        .insert([dbPayload]);

      if (error) {
        console.error("Supabase Insert Error:", error);
        return res.status(500).json({ error: error.message, details: error });
      }

      return res.status(200).json({ success: true, data });
    } catch (err) {
      return res.status(500).json({ error: err.message });
    }
  } else if (req.method === 'GET') {
    try {
      const { data, error } = await supabase
        .from('orders')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        // created_at இல்லை என்றால் id வைத்து வரிசைப்படுத்த
        const fallback = await supabase.from('orders').select('*');
        return res.status(200).json(fallback.data || []);
      }

      return res.status(200).json(data || []);
    } catch (err) {
      return res.status(500).json({ error: err.message });
    }
  } else {
    return res.status(405).json({ error: "Method Not Allowed" });
  }
}
