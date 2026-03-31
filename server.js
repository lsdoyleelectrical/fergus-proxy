const express = require('express');
const cors = require('cors');
const fetch = require('node-fetch');

const app = express();
const PORT = process.env.PORT || 3000;

// Allow ALL origins — needed for GitHub Pages to call this proxy
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'x-fergus-key']
}));

// Handle preflight OPTIONS requests
app.options('*', cors());

app.use(express.json());

const FERGUS_BASE = 'https://api.fergus.com/api/v1';

// Health check
app.get('/', function(req, res) {
  res.json({ status: 'Doyle Electrical Fergus Proxy — running', version: '2.0' });
});

// Proxy all Fergus API requests
app.all('/fergus/*', async function(req, res) {
  var packKey = req.headers['x-fergus-key'] || req.headers['authorization'];
  if (!packKey) {
    return res.status(401).json({ error: 'No pack key — send x-fergus-key header' });
  }
  // Strip "Bearer " prefix if present
  packKey = packKey.replace('Bearer ', '');

  var fergusPath = req.path.replace('/fergus', '');
  var queryString = Object.keys(req.query).length
    ? '?' + new URLSearchParams(req.query).toString()
    : '';
  var fergusUrl = FERGUS_BASE + fergusPath + queryString;

  console.log('Proxying:', req.method, fergusUrl);

  try {
    var response = await fetch(fergusUrl, {
      method: req.method,
      headers: {
        'Authorization': 'Bearer ' + packKey,
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: req.method !== 'GET' && req.method !== 'HEAD'
        ? JSON.stringify(req.body)
        : undefined
    });

    var text = await response.text();
    var data;
    try { data = JSON.parse(text); } catch(e) { data = { raw: text }; }

    res.status(response.status).json(data);
  } catch (err) {
    console.error('Proxy error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

app.listen(PORT, function() {
  console.log('Fergus proxy v2.0 running on port ' + PORT);
});
