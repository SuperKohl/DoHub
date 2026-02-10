const express = require('express');
const router = express.Router();

router.get('/', (req, res) => {
    res.json({ message: 'Scan endpoint placeholder' });
});

module.exports = router;