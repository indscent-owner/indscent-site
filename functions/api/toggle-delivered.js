export async function onRequestPost(context) {
  try {
    const body = await context.request.json();
    const { order_date, device_id, delivered } = body;

    if (!order_date || !device_id) {
      return new Response(JSON.stringify({ error: 'Missing required fields' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    await context.env.DB.prepare(
      `UPDATE archived_orders SET delivered = ? WHERE order_date = ? AND device_id = ?`
    ).bind(delivered ? 1 : 0, order_date, device_id).run();

    return new Response(JSON.stringify({ success: true }), {
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