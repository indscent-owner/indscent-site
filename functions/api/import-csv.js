// functions/api/import-csv.js
export async function onRequestPost(context) {
  try {
    const body = await context.request.json();
    const { target, rows } = body; // target: 'fragrances' or 'products'

    if (!target || !Array.isArray(rows) || rows.length === 0) {
      return new Response(JSON.stringify({ error: "Invalid payload layout or empty data rows." }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const statements = [];

    if (target === 'fragrances') {
      // 1. Wipe out existing data securely inside a protected sandbox transaction
      statements.push(context.env.DB.prepare(`DELETE FROM fragrances`));
      
      // 2. Batch every item row cleanly into an atomic array
      for (const row of rows) {
        if (!row.name || !row.gender) continue;
        statements.push(
          context.env.DB.prepare(
            `INSERT INTO fragrances (name, gender, active) VALUES (?, ?, ?)`
          ).bind(row.name.trim(), row.gender.trim().toLowerCase(), row.active !== undefined ? row.active : 1)
        );
      }
    } else if (target === 'products') {
      statements.push(context.env.DB.prepare(`DELETE FROM products`));
      
      for (const row of rows) {
        if (!row.name || !row.price) continue;
        statements.push(
          context.env.DB.prepare(
            `INSERT INTO products (name, volume_female, volume_male, price, active) VALUES (?, ?, ?, ?, ?)`
          ).bind(
            row.name.trim(), 
            row.volume_female || '', 
            row.volume_male || '', 
            parseInt(row.price) || 0, 
            row.active !== undefined ? row.active : 1
          )
        );
      }
    } else {
      return new Response(JSON.stringify({ error: "Unsupported target database table." }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Execute everything inside a fast pipeline batch
    await context.env.DB.batch(statements);

    return new Response(JSON.stringify({ success: true, count: statements.length - 1 }), {
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
