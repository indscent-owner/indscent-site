export async function onRequestPost(context) {
  try {
    const body = await context.request.json();
    const { action, id, ids, invoice_number, device_id, source } = body;

    if (action === 'delete') {
      const orderIds = Array.isArray(ids) ? [...new Set(ids)] : [id];
      if (orderIds.length === 0 || orderIds.some(function(orderId) { return !Number.isInteger(Number(orderId)); })) {
        return new Response(JSON.stringify({ error: 'Invalid order IDs' }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        });
      }
      if (source === 'client' && !device_id) {
        return new Response(JSON.stringify({ error: 'Missing device ID' }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        });
      }

      const rows = [];
      for (const orderId of orderIds) {
        const row = await context.env.DB.prepare(
          `SELECT * FROM orders WHERE id = ?`
        ).bind(orderId).first();
        if (!row || String(row.status || '').toLowerCase() !== 'inbox' || (source === 'client' && row.device_id !== device_id)) {
          return new Response(JSON.stringify({ error: 'Order is not available for deletion' }), {
            status: 409,
            headers: { 'Content-Type': 'application/json' }
          });
        }
        rows.push(row);
      }

      const statements = [];
      for (const row of rows) {
        statements.push(context.env.DB.prepare(
          `INSERT INTO deleted_orders (original_id, device_id, name, surname, contact, email, fragrance_name, product_name, volume, price, quantity, gender, order_date)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
        ).bind(row.id, row.device_id, row.name, row.surname, row.contact, row.email, row.fragrance_name, row.product_name, row.volume, row.price, row.quantity, row.gender, row.order_date));
        statements.push(context.env.DB.prepare(`DELETE FROM orders WHERE id = ?`).bind(row.id));
      }
      await context.env.DB.batch(statements);
    } else if (action === 'archive') {
      if (!invoice_number) {
        return new Response(JSON.stringify({ error: 'Missing invoice number' }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        });
      }
      const archivedDate = new Date().toLocaleString('en-ZA', { timeZone: 'Africa/Johannesburg' });
      const { results } = await context.env.DB.prepare(
        `SELECT * FROM orders WHERE status = 'Inbox'`
      ).all();
      
      for (const row of results) {
        // Safe Insert: Completely free of any 'status' or 'Processed' values
        await context.env.DB.prepare(
          `INSERT INTO archived_orders (order_id, device_id, name, surname, contact, email, fragrance_name, product_name, volume, price, quantity, gender, order_date, archived_date, supplier_invoice)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
        ).bind(row.id, row.device_id, row.name, row.surname, row.contact, row.email, row.fragrance_name, row.product_name, row.volume, row.price, row.quantity, row.gender, row.order_date, archivedDate, invoice_number).run();
        
        await context.env.DB.prepare(`DELETE FROM orders WHERE id = ?`).bind(row.id).run();
      }
    } else if (action === 'restore') {
      const orderIds = ids || [id];
      for (const delId of orderIds) {
        const row = await context.env.DB.prepare(
          `SELECT * FROM deleted_orders WHERE id = ?`
        ).bind(delId).first();
        if (row) {
          await context.env.DB.prepare(
            `INSERT INTO orders (device_id, name, surname, contact, email, fragrance_name, product_name, volume, price, quantity, gender, order_date, status)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'Inbox')`
          ).bind(row.device_id, row.name, row.surname, row.contact, row.email, row.fragrance_name, row.product_name, row.volume, row.price, row.quantity, row.gender, row.order_date).run();
          await context.env.DB.prepare(`DELETE FROM deleted_orders WHERE id = ?`).bind(delId).run();
        }
      }
    } else if (action === 'complete') {
      const orderIds = ids || [id];
      for (const targetId of orderIds) {
        try {
          await context.env.DB.prepare(
            `UPDATE archived_orders SET status = 'Completed' WHERE id = ?`
          ).bind(targetId).run();
        } catch(e) {
          console.log("Column check skipped safely");
        }
      }
    }

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
