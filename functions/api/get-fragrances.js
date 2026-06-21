export async function onRequestGet(context) {
  try {
    const result = await context.env.DB.prepare(
      `SELECT name, gender FROM fragrances WHERE active = 1 ORDER BY name ASC`
    ).all();

    const female = result.results.filter(f => f.gender === 'female').map(f => f.name);
    const male = result.results.filter(f => f.gender === 'male').map(f => f.name);

    return new Response(JSON.stringify({ female, male }), {
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