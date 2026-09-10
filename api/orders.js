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

  // 1. Confirm Payment Action
  if (req.method === 'POST' && req.body && req.body.action === 'confirm_payment') {
    const { order_id } = req.body;
    const { data, error } = await supabase
      .from('orders')
      .update({ payment_status: 'YES', approval_status: 'Payment Approved' })
      .eq('id', order_id);

    if (error) return res.status(500).json({ error: error.message });
    return res.status(200).json({ success: true, data });
  }

  // 2. Save Order with Auto-Allocation Logic
  if (req.method === 'POST') {
    try {
      const body = req.body;
      const genId = body.order_id || body.orderId || ("SDC-" + Math.floor(10000000 + Math.random() * 90000000));
      const orderType = body.order_type || 'Online Customer';

      let allocatedStaff = null;

      // Online Customer Order -> Round Robin Auto-Allocation for Telecallers
      if (orderType === 'Online Customer') {
        // Fetch all Telecallers
        const { data: staffList } = await supabase
          .from('staff')
          .select('username, role');

        const telecallers = (staffList || []).filter(
          s => s.role && s.role.trim().toUpperCase() === 'TELECALLER'
        );

        if (telecallers.length > 0) {
          // Get last allocated telecaller
          const { data: lastOrder } = await supabase
            .from('orders')
            .select('allocated_staff')
            .eq('order_type', 'Online Customer')
            .not('allocated_staff', 'is', null)
            .order('created_at', { ascending: false })
            .limit(1);

          let nextIdx = 0;
          if (lastOrder && lastOrder.length > 0 && lastOrder[0].allocated_staff) {
            const lastStaff = lastOrder[0].allocated_staff;
            const currentIdx = telecallers.findIndex(s => s.username === lastStaff);
            if (currentIdx !== -1) {
              nextIdx = (currentIdx + 1) % telecallers.length;
            }
          }
          allocatedStaff = telecallers[nextIdx].username;
        }
      }

      const dbPayload = {
        id: String(genId),
        customer_name: String(body.customer_name || body.name || 'Customer'),
        mobile: String(body.mobile || '9999999999'),
        address: body.address || 'N/A',
        district: body.district || 'Sivakasi',
        order_type: orderType,
        total_amount: parseFloat(body.total_amount || 0),
        items: Array.isArray(body.items) ? body.items : JSON.parse(body.items || "[]"),
        business_interest: body.business_interest || 'NO',
        allocated_staff: allocatedStaff,
        payment_status: body.payment_status || 'NO',
        approval_status: body.approval_status || 'Pending Verification',
        order_status: 'Order Received'
      };

      const { data, error } = await supabase.from('orders').insert([dbPayload]);
      if (error) return res.status(500).json({ error: error.message });

      return res.status(200).json({ success: true, allocated_staff: allocatedStaff, data });
    } catch (err) {
      return res.status(500).json({ error: err.message });
    }
  }

  // 3. Get All Orders
  else if (req.method === 'GET') {
    try {
      const { data, error } = await supabase.from('orders').select('*').order('created_at', { ascending: false });
      if (error) return res.status(500).json({ error: error.message });
      return res.status(200).json(data || []);
    } catch (err) {
      return res.status(500).json({ error: error.message });
    }
  } else {
    return res.status(405).json({ error: "Method Not Allowed" });
  }
}
