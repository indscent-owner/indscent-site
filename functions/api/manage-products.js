// functions/api/manage-products.js
export async function onRequestPost(context) {
  try {
    const body = await context.request.json();
    const { action, id, name, volume_female, volume_male, price, active } = body;

    if (action === 'create') {
      if (!name || !price) {
        return new Response(JSON.stringify({ error: "Name and Price fields are mandatory." }), { status: 400 });
      }
      await context.env.DB.prepare(
        `INSERT INTO products (name, volume_female, volume_male, price, active) VALUES (?, ?, ?, ?, ?)`
      ).bind(name.trim(), volume_female || '', volume_male || '', parseInt(price) || 0, active !== undefined ? active : 1).run();
      
      return new Response(JSON.stringify({ success: true, message: "Bundle created successfully!" }), { status: 200 });
    }

    if (action === 'update') {
      if (!id || !name || !price) {
        return new Response(JSON.stringify({ error: "Missing required fields for update routing." }), { status: 400 });
      }
      await context.env.DB.prepare(
        `UPDATE products SET name = ?, volume_female = ?, volume_male = ?, price = ?, active = ? WHERE id = ?`
      ).bind(name.trim(), volume_female || '', volume_male || '', parseInt(price) || 0, active, parseInt(id)).run();

      return new Response(JSON.stringify({ success: true, message: "Bundle updated successfully!" }), { status: 200 });
    }

    return new Response(JSON.stringify({ error: "Invalid action parameter specified." }), { status: 400 });

  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}
