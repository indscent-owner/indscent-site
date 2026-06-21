export async function onRequestGet(context) {
  try {
    const url = new URL(context.request.url);
    const device_id = url.searchParams.get('device_id');
    const status = url.searchParams.get('status');
    const admin = url.searchParams.get('admin');
    let result;

    if (admin === 'true' && status === 'archived') {
      result = await context.env.DB.prepare(
        `SELECT * FROM archived_orders ORDER BY id DESC`
      ).all();
    } else if (admin === 'true' && status === 'deleted') {
      result = await context.env.DB.prepare(
        `SELECT * FROM deleted_orders ORDER BY id DESC`
      ).all();
    } else if (admin === 'true' && status === 'consolidated') {
      result = await context.env.DB.prepare(
        `SELECT gender, fragrance_name, product_name, volume,
         SUM(quantity) as quantity, SUM(price*quantity) as total_price,
         GROUP_CONCAT(name || ' ' || surname, ', ') as buyers
         FROM orders WHERE status = 'Inbox'
         GROUP BY gender, fragrance_name, product_name, volume
         ORDER BY fragrance_name ASC`
      ).all();
    } else if (admin === 'true' && status === 'Inbox') {
      result = await context.env.DB.prepare(
        `SELECT * FROM orders WHERE status = 'Inbox' ORDER BY id DESC`
      ).all();
    } else if (device_id) {
      result = await context.env.DB.prepare(
        `SELECT id, device_id, name, surname, contact, email,
         fragrance_name, product_name, volume, price, quantity, gender, order_date, status,
         bundle_id, bundle_name, 0 as delivered
         FROM orders WHERE device_id = ?
         UNION ALL
         SELECT id, device_id, name, surname, contact, email,
         fragrance_name, product_name, volume, price, quantity, gender, order_date, 'Processed' as status,
         '' as bundle_id, '' as bundle_name, delivered
         FROM archived_orders WHERE device_id = ?
         ORDER BY order_date DESC`
      ).bind(device_id, device_id).all();
    } else {
      return new Response(JSON.stringify({ error: 'Missing parameters' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    return new Response(JSON.stringify({ orders: result.results }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}