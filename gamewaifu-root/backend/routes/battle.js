const express = require('express');
const router = express.Router();
const battleService = require('../services/battleService');
const { authenticate } = require('./auth');

router.post('/start', authenticate, async (req, res) => {
  try {
    const { attackerId, defenderId } = req.body;
    const result = await battleService.executeBattle(attackerId, defenderId);
    res.json(result);
  } catch (error) {
    console.error('Battle error:', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;