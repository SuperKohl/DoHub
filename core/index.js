const express = require('express');
const app = express();
const port = 3000;

// JSON parsing
app.use(express.json());

// Test Route
app.get('/', (req, res) => {
    res.send('DoHub Core API running 🚀');
});

// Scan Route placeholder
const scanRouter = require('./routes/scan');
app.use('/scan', scanRouter);

app.listen(port, () => console.log(`DoHub Core API listening on port ${port}`));
