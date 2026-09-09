import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST');

  if (req.method === 'GET') {
    const { data, error } = await supabase.from('products').select('*').order('id', { ascending: true });
    if (error) return res.status(500).json({ status: 'Error', message: error.message });
    return res.status(200).json(data);
  }

  if (req.method === 'POST') {
    const { action, productsArray, productId, newRate, newStock, isOutOfStock, productObj } = req.body;

    if (action === 'bulkAddProducts') {
      const formatted = productsArray.map(p => ({
        category: p.category,
        eng_name: p.eng,
        tam_name: p.tam || p.eng,
        per_unit: p.per || '1 Pkt',
        rate: p.rate,
        stock_qty: p.stock || 100,
        status: 'In Stock'
      }));

      const { error } = await supabase.from('products').insert(formatted);
      if (error) return res.status(500).json({ status: 'Error', message: error.message });
      return res.status(200).json({ status: 'Success' });
    }

    if (action === 'addProduct') {
      const { error } = await supabase.from('products').insert([{
        category: productObj.category,
        eng_name: productObj.eng,
        tam_name: productObj.tam || productObj.eng,
        per_unit: productObj.per || '1 Pkt',
        rate: productObj.rate,
        stock_qty: productObj.stock || 100,
        status: 'In Stock'
      }]);
      if (error) return res.status(500).json({ status: 'Error', message: error.message });
      return res.status(200).json({ status: 'Success' });
    }

    if (action === 'updateProduct') {
      const updates = {};
      if (newRate !== undefined && newRate !== "") updates.rate = parseFloat(newRate);
      if (newStock !== undefined && newStock !== "") updates.stock_qty = parseInt(newStock);
      if (isOutOfStock !== undefined) updates.status = isOutOfStock ? 'Out of Stock' : 'In Stock';

      const { error } = await supabase.from('products').update(updates).eq('id', productId);
      if (error) return res.status(500).json({ status: 'Error', message: error.message });
      return res.status(200).json({ status: 'Success' });
    }
  }
}
