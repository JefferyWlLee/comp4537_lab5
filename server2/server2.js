const http = require('http');
const mysql = require('mysql');
const url = require('url');
require('dotenv').config();

// creator connection for table creation
const creatorDb = mysql.createConnection({
  host: process.env.DB_HOST,
  user: process.env.DB_CREATOR_USER,
  password: process.env.DB_CREATOR_PASSWORD,
  database: process.env.DB_NAME
});

// Regular user connection for insert and select operations
const db = mysql.createConnection({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME
});

// Connect both databases
creatorDb.connect((err) => {
  if (err) throw err;
  console.log('Connected to MySQL as creator');
});

db.connect((err) => {
  if (err) throw err;
  console.log('Connected to MySQL as regular user');
});

// Function to check and create the patient table if it doesn't exist
const ensurePatientTable = (callback) => {
    const createTableQuery = `
      CREATE TABLE IF NOT EXISTS patient (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(100),
        age INT,
        date DATE
      ) ENGINE=InnoDB;
    `;

  creatorDb.query(createTableQuery, (err) => {
    if (err) throw err;
    console.log('Checked for patient table, created if not exists');
    callback();
  });
};

http.createServer((req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  // Handle preflight requests (OPTIONS method)
  if (req.method === 'OPTIONS') {
    res.writeHead(204); // No Content
    res.end();
    return;
  }

  if (req.method === 'POST' && url.parse(req.url).pathname === '/lab5/api/v1/sql') {
    // Ensure the patient table exists before processing the POST request
    ensurePatientTable(() => {
      let body = '';

      req.on('data', chunk => {
        body += chunk;
      });

      req.on('end', () => {
        const { query } = JSON.parse(body);

        // Handle only INSERT queries
        if (/^INSERT/i.test(query)) {
          db.query(query, (err, result) => {
            if (err) {
              res.writeHead(400, { 'Content-Type': 'application/json' });
              res.end(JSON.stringify({ error: err.message }));
            } else {
              res.writeHead(200, { 'Content-Type': 'application/json' });
              res.end(JSON.stringify({ success: true, result }));
            }
          });
        } else {
          res.writeHead(403, { 'Content-Type': 'text/plain' });
          res.end('Forbidden: Only INSERT queries allowed with POST');
        }
      });
    });
  } else if (req.method === 'GET' && url.parse(req.url).pathname === '/lab5/api/v1/sql') {
    // Ensure the patient table exists before processing the GET request
    ensurePatientTable(() => {
      const query = url.parse(req.url, true).query.query;

      // Handle only SELECT queries
      if (/^SELECT/i.test(query)) {
        db.query(query, (err, result) => {
          if (err) {
            res.writeHead(400, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: err.message }));
          } else {
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify(result));
          }
        });
      } else {
        res.writeHead(403, { 'Content-Type': 'text/plain' });
        res.end('Forbidden: Only SELECT queries allowed with GET');
      }
    });
  } else {
    res.writeHead(404, { 'Content-Type': 'text/html' });
    res.end('<h1>404 Not Found</h1>');
  }
}).listen(3000, () => console.log('Server running on port 3000'));
