const express = require('express');
const router = express.Router();
const ResentService = require('../services/resentService');

// Ruta para procesar resentimiento (llamada por el job programado)
router.post('/process', async (req, res) => {
  try {
    const result = await ResentService.processResentfulCharacters();
    res.json({
      success: true,
      lostCount: result.lostCount,
      recoveredCount: result.recoveredCount
    });
  } catch (error) {
    console.error('Error processing resentment:', error);
    res.status(500).json({
      error: error.message || 'Internal server error',
      code: 'SERVER_ERROR'
    });
  }
});

module.exports = router;