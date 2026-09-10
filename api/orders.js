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

  // 1. Delete Order Action (Admin Only)
  if (req.method === 'POST' && req.body && req.body.action === 'delete_order') {
    try {
      const targetId = String(req.body.order_id || '').trim();
      const { data, error } = await supabase.from('orders').delete().eq('id', targetId);
      if (error) return res.status(500).json({ error: error.message });
      return res.status(200).json({ success: true, message: "Order Deleted Successfully!", data });
    } catch(err) {
      return res.status(500).json({ error: err.message });
    }
  }

  // 2. Order Status & LR Copy Update Action
  if (req.method === 'POST' && req.body && req.body.action === 'update_order_status') {
    try {
      const targetId = String(req.body.order_id || '').trim();
      const newStatus = req.body.order_status;
      const lrUrl = req.body.lr_copy_url || null;

      let updatePayload = { order_status: newStatus };
      if (lrUrl !== undefined && lrUrl !== null) updatePayload.lr_copy_url = lrUrl;

      const { data, error } = await supabase.from('orders').update(updatePayload).eq('id', targetId);
      if (error) return res.status(500).json({ error: error.message });
      return res.status(200).json({ success: true, message: "Order Status Updated!", data });
    } catch(err) {
      return res.status(500).json({ error: err.message });
    }
  }

  // 3. Confirm Payment Action
  if (req.method === 'POST' && req.body && req.body.action === 'confirm_payment') {
    try {
      const targetId = String(req.body.order_id || '').trim();
      const payMode = req.body.payment_mode || 'GPay';
      const transRef = req.body.transaction_ref || 'Verified';

      const { data, error } = await supabase
        .from('orders')
        .update({ payment_status: 'YES', approval_status: 'Approved', payment_mode: payMode, transaction_ref: transRef })
        .eq('id', targetId);

      if (error) return res.status(500).json({ error: error.message });
      return res.status(200).json({ success: true, message: "Payment Verified Successfully!", data });
    } catch(err) {
      return res.status(500).json({ error: err.message });
    }
  }

  // 4. Re-assign Staff Action
  if (req.method === 'POST' && req.body && req.body.action === 'reassign_staff') {
    try {
      const targetId = String(req.body.order_id || '').trim();
      const newStaff = req.body.allocated_staff;

      const { data, error } = await supabase.from('orders').update({ allocated_staff: newStaff }).eq('id', targetId);
      if (error) return res.status(500).json({ error: error.message });
      return res.status(200).json({ success: true, data });
    } catch(err) {
      return res.status(500).json({ error: err.message });
    }
  }

  // 5. Save New Order
  if (req.method === 'POST') {
    try {
      const body = req.body;
      const genId = body.order_id || body.orderId || ("SDC-" + Math.floor(10000000 + Math.random() * 90000000));
      const orderType = body.order_type || 'Online Customer';

      let allocatedStaff = null;
      if (orderType === 'Online Customer') {
        const { data: staffList } = await supabase.from('staff').select('username, role');
        const telecallers = (staffList || []).filter(s => s.role && s.role.trim().toUpperCase() === 'TELECALLER');

        if (telecallers.length > 0) {
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
            if (currentIdx !== -1) nextIdx = (currentIdx + 1) % telecallers.length;
          }
          allocatedStaff = telecallers[nextIdx].username;
        }
      }

      const itemsArr = Array.isArray(body.items) ? body.items : JSON.parse(body.items || "[]");

      const dbPayload = {
        id: String(genId),
        customer_name: String(body.customer_name || body.name || 'Customer'),
        mobile: String(body.mobile || '9999999999'),
        address: body.address || 'N/A',
        district: body.district || 'Sivakasi',
        order_type: orderType,
        total_amount: parseFloat(body.total_amount || 0),
        items: itemsArr,
        business_interest: body.business_interest || 'NO',
        allocated_staff: allocatedStaff,
        payment_status: body.payment_status || 'NO',
        approval_status: body.approval_status || 'Pending Verification',
        order_status: body.order_status || 'Booked'
      };

      const { data, error } = await supabase.from('orders').insert([dbPayload]);
      if (error) return res.status(500).json({ error: error.message });

      return res.status(200).json({ success: true, allocated_staff: allocatedStaff, data });
    } catch (err) {
      return res.status(500).json({ error: err.message });
    }
  }

  // 6. GET Orders
  else if (req.method === 'GET') {
    try {
      const { data, error } = await supabase.from('orders').select('*').order('created_at', { ascending: false });
      if (error) return res.status(500).json({ error: error.message });
      return res.status(200).json(data || []);
    } catch (err) {
      return res.status(500).json({ error: err.message });
    }
  } else {
    return res.status(405).json({ error: "Method Not Allowed" });
  }
}
