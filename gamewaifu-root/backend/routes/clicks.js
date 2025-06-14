const express = require('express');
const router = express.Router();
const ClickService = require('../services/clickService');
const authMiddleware = require('../middleware/auth');

router.post('/click-sessions', authMiddleware, async (req, res) => {
  try {
    const userId = req.user.userId;
    const { characterId, clickCount } = req.body;
    
    // Validar parámetros
    if (!characterId || clickCount === undefined || clickCount < 1) {
      return res.status(400).json({
        error: 'Se requieren characterId y clickCount válidos',
        code: 'INVALID_PARAMS'
      });
    }
    
    const result = await ClickService.recordClickSession(userId, characterId, clickCount);
    
    res.json({
      success: true,
      newLove: result.newLove,
      loveGain: result.loveGain,
      isResentful: result.isResentful
    });
    
  } catch (error) {
    console.error('Error recording click session:', error);
    const status = error.statusCode || 500;
    res.status(status).json({
      error: error.message || 'Internal server error',
      code: error.code || 'SERVER_ERROR'
    });
  }
});

module.exports = router;
