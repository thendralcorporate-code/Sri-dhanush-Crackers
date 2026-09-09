import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST');

  if (req.method === 'POST') {
    const { action, payload, orderId, newStatus, txnDetails } = req.body;

    if (action === 'saveOrder') {
      const { data: staffList } = await supabase.from('staff').select('username').eq('role', 'TELECALLER');
      const telecallers = staffList?.length ? staffList.map(s => s.username) : ["Priya", "Shantha Lakshmi", "Suganya", "Vimala"];
      const { count } = await supabase.from('orders').select('*', { count: 'exact', head: true });
      const assignedStaff = telecallers[(count || 0) % telecallers.length];

      const isWalkIn = payload.orderType === 'Walk-in Customer';

      const { error } = await supabase.from('orders').insert([{
        id: payload.orderId,
        customer_name: payload.name,
        mobile: payload.mobile,
        address: payload.address,
        district: payload.district,
        order_type: payload.orderType || 'Online Customer',
        allocated_staff: assignedStaff,
        total_amount: payload.total,
        payment_status: isWalkIn ? 'YES' : 'NO',
        order_status: isWalkIn ? 'Delivered' : 'Order Received',
        approval_status: isWalkIn ? 'Approved' : 'Pending Verification',
        payment_mode: isWalkIn ? 'Cash' : 'Pending Mode',
        items: payload.itemsArray
      }]);

      if (error) return res.status(500).json({ status: 'Error', message: error.message });

      for (const item of payload.itemsArray) {
        await supabase.rpc('decrement_stock', { product_id: item.id, qty_to_subtract: item.qty });
      }

      return res.status(200).json({ status: 'Success', orderId: payload.orderId, assignedTo: assignedStaff });
    }

    if (action === 'updateOrderStatus') {
      const { error } = await supabase.from('orders').update({ order_status: newStatus }).eq('id', orderId);
      if (error) return res.status(500).json({ status: 'Error', message: error.message });
      return res.status(200).json({ status: 'Success' });
    }

    if (action === 'approveOrderPayment') {
      const { error } = await supabase.from('orders').update({ payment_status: 'YES', approval_status: 'Approved', txn_details: txnDetails }).eq('id', payload.orderId);
      if (error) return res.status(500).json({ status: 'Error', message: error.message });
      return res.status(200).json({ status: 'Success' });
    }

    if (action === 'reallocateStaff') {
      const { error } = await supabase.from('orders').update({ allocated_staff: payload.newStaff }).eq('id', payload.orderId);
      if (error) return res.status(500).json({ status: 'Error', message: error.message });
      return res.status(200).json({ status: 'Success' });
    }
  }

  if (req.method === 'GET') {
    const { data, error } = await supabase.from('orders').select('*').order('created_at', { ascending: false });
    if (error) return res.status(500).json({ status: 'Error', message: error.message });
    return res.status(200).json({ orders: data });
  }
}
