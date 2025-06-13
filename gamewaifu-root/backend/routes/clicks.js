const express = require('express');
const router = express.Router();
const ClickService = require('../services/ClickService');

router.post('/api/click-sessions', async (req, res, next) => {
  try {
    const { userId, characterId, clickCount } = req.body;
    const result = await ClickService.recordClickSession(userId, characterId, clickCount);
    res.status(201).json(result);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
