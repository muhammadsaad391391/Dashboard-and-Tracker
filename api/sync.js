const { Client } = require('pg');

module.exports = async (req, res) => {
  // CORS Headers
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,POST,PUT,DELETE');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
  );

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  const { DATABASE_URL } = process.env;
  if (!DATABASE_URL) {
    return res.status(500).json({
      error: "Database Connection String Missing",
      details: "Please add the DATABASE_URL environment variable in your Vercel Project Settings."
    });
  }

  const syncCode = req.query.code;
  if (!syncCode) {
    return res.status(400).json({ error: "Missing 'code' query parameter." });
  }

  const client = new Client({
    connectionString: DATABASE_URL,
    ssl: {
      rejectUnauthorized: false
    }
  });

  try {
    await client.connect();

    // Ensure the sync table exists
    await client.query(`
      CREATE TABLE IF NOT EXISTS sync_data (
        sync_code VARCHAR(64) PRIMARY KEY,
        payload JSONB NOT NULL,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `);

    if (req.method === 'GET') {
      const result = await client.query('SELECT payload FROM sync_data WHERE sync_code = $1', [syncCode]);
      if (result.rows.length === 0) {
        return res.status(404).json({ error: "Sync code not found." });
      }
      return res.status(200).json(result.rows[0].payload);
    } 
    
    if (req.method === 'POST' || req.method === 'PUT') {
      const payload = req.body;
      if (!payload || typeof payload !== 'object') {
        return res.status(400).json({ error: "Invalid JSON body payload." });
      }

      await client.query(`
        INSERT INTO sync_data (sync_code, payload, updated_at)
        VALUES ($1, $2, CURRENT_TIMESTAMP)
        ON CONFLICT (sync_code)
        DO UPDATE SET payload = EXCLUDED.payload, updated_at = CURRENT_TIMESTAMP;
      `, [syncCode, payload]);

      return res.status(200).json({ success: true, message: "Cloud backup saved successfully." });
    }

    return res.status(405).json({ error: `Method ${req.method} not allowed.` });

  } catch (err) {
    console.error("Database sync error:", err);
    return res.status(500).json({ error: "Database Sync Error", details: err.message });
  } finally {
    await client.end().catch(() => {});
  }
};
