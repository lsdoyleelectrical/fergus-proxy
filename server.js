const express = require('express');
const cors = require('cors');
const fetch = require('node-fetch');

const app = express();
const PORT = process.env.PORT || 3000;

// Allow requests from the Doyle CRM only
app.use(cors({
  origin: ['https://lsdoyleelectrical.github.io', 'http://localhost'],
  methods: ['GET', 'POST', 'PUT'],
  allowedHeaders: ['Content-Type', 'Authorization', 'x-fergus-key']
}));

app.use(express.json());

const FERGUS_BASE = 'https://api.fergus.com/api/v1';

// Health check
app.get('/', function(req, res) {
  res.json({ status: 'Doyle Electrical Fergus Proxy — running' });
});

// Proxy all Fergus API requests
app.all('/fergus/*', async function(req, res) {
  var packKey = req.headers['x-fergus-key'];
  if (!packKey) {
    return res.status(401).json({ error: 'No pack key provided' });
  }

  // Build the Fergus URL from the path after /fergus/
  var fergusPath = req.path.replace('/fergus/', '/');
  var queryString = Object.keys(req.query).length
    ? '?' + new URLSearchParams(req.query).toString()
    : '';
  var fergusUrl = FERGUS_BASE + fergusPath + queryString;

  try {
    var response = await fetch(fergusUrl, {
      method: req.method,
      headers: {
        'Authorization': 'Bearer ' + packKey,
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: req.method !== 'GET' ? JSON.stringify(req.body) : undefined
    });

    var data = await response.json();
    res.status(response.status).json(data);
  } catch (err) {
    console.error('Fergus proxy error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

app.listen(PORT, function() {
  console.log('Fergus proxy running on port ' + PORT);
});
