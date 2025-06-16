const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/auth');
const avatarService = require('../services/avatarService');

router.get('/', authMiddleware, async (req, res) => {
  try {
    const avatars = await avatarService.getAllAvatars();
    res.json(avatars);
  } catch (err) {
    console.error('Error en GET /api/avatars:', err);
    const status = err.statusCode || 500;
    const message = err.message || 'Error interno obteniendo avatares';
    res.status(status).json({ error: message });
  }
});

module.exports = router;
