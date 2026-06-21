export async function onRequestPost(context) {
  try {
    const body = await context.request.json();
    const { action, bundle_id, bundle_name, price, active, items } = body;

    if (action === 'create') {
      if (!bundle_id || !bundle_name || !price || !items || !items.length) {
        return new Response(JSON.stringify({ error: 'Missing required fields.' }), {
          status: 400, headers: { 'Content-Type': 'application/json' }
        });
      }

      // Check bundle_id not already in use
      const existing = await context.env.DB.prepare(
        `SELECT bundle_id FROM bundles WHERE bundle_id = ?`
      ).bind(bundle_id).first();

      if (existing) {
        return new Response(JSON.stringify({ error: 'Bundle ID already in use.' }), {
          status: 400, headers: { 'Content-Type': 'application/json' }
        });
      }

      await context.env.DB.prepare(
        `INSERT INTO bundles (bundle_id, bundle_name, price, active) VALUES (?, ?, ?, 1)`
      ).bind(bundle_id, bundle_name, parseInt(price)).run();

      let sortOrder = 1;
      for (const item of items) {
        await context.env.DB.prepare(
          `INSERT INTO bundle_items (bundle_id, product_type, sort_order) VALUES (?, ?, ?)`
        ).bind(bundle_id, item.product_type, sortOrder++).run();
      }

      return new Response(JSON.stringify({ success: true, message: 'Bundle created successfully!' }), {
        status: 200, headers: { 'Content-Type': 'application/json' }
      });
    }

    if (action === 'update') {
      if (!bundle_id || !bundle_name || !price) {
        return new Response(JSON.stringify({ error: 'Missing required fields.' }), {
          status: 400, headers: { 'Content-Type': 'application/json' }
        });
      }

      await context.env.DB.prepare(
        `UPDATE bundles SET bundle_name = ?, price = ? WHERE bundle_id = ?`
      ).bind(bundle_name, parseInt(price), bundle_id).run();

      return new Response(JSON.stringify({ success: true, message: 'Bundle updated successfully!' }), {
        status: 200, headers: { 'Content-Type': 'application/json' }
      });
    }

    if (action === 'toggle') {
      if (!bundle_id || active === undefined) {
        return new Response(JSON.stringify({ error: 'Missing required fields.' }), {
          status: 400, headers: { 'Content-Type': 'application/json' }
        });
      }

      await context.env.DB.prepare(
        `UPDATE bundles SET active = ? WHERE bundle_id = ?`
      ).bind(active ? 1 : 0, bundle_id).run();

      return new Response(JSON.stringify({ success: true }), {
        status: 200, headers: { 'Content-Type': 'application/json' }
      });
    }

    return new Response(JSON.stringify({ error: 'Invalid action.' }), {
      status: 400, headers: { 'Content-Type': 'application/json' }
    });

  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500, headers: { 'Content-Type': 'application/json' }
    });
  }
}