import pkg from 'pg';
import dotenv from 'dotenv';
const { Pool } = pkg;

// Load environment variables
dotenv.config();

const NEON_CONNECTION_STRING = process.env.NEON_DATABASE_URL;

if (!NEON_CONNECTION_STRING) {
  console.error('❌ Missing NEON_DATABASE_URL environment variable');
  process.exit(1);
}

// Create connection pool
const pool = new Pool({
  connectionString: NEON_CONNECTION_STRING,
  max: 20, // Maximum number of clients in the pool
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

// Test the connection
pool.on('connect', (client) => {
  console.log('✅ New client connected to Neon');
});

pool.on('error', (err, client) => {
  console.error('❌ Unexpected error on idle client', err);
});

// Export the pool for use in other modules
export { pool };

// Helper function to execute queries
export async function query(text, params) {
  const start = Date.now();
  try {
    const res = await pool.query(text, params);
    const duration = Date.now() - start;
    console.log('Executed query', { text, duration, rows: res.rowCount });
    return res;
  } catch (err) {
    console.error('Query error:', err);
    throw err;
  }
}

// Helper function to get a client from the pool
export async function getClient() {
  const client = await pool.connect();
  const query = client.query;
  const release = client.release;

  // Set a timeout of 5 seconds, after which we will log this client's last query
  const timeout = setTimeout(() => {
    console.error('A client has been checked out for more than 5 seconds!');
    console.error(`The last executed query on this client was: ${client.lastQuery}`);
  }, 5000);

  // Monkey patch the query method to keep track of the last query executed
  client.query = (...args) => {
    client.lastQuery = args;
    return query.apply(client, args);
  };

  client.release = () => {
    clearTimeout(timeout);
    // Set the methods back to their old un-monkey-patched version
    client.query = query;
    client.release = release;
    return release.apply(client);
  };

  return client;
}