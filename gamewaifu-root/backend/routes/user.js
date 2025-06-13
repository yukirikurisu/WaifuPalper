const db = require('../db/connection');
const express = require('express');
const router = express.Router();
const userService = require('../services/userService');
const authMiddleware = require('../middleware/auth');

// Obtener datos del usuario autenticado
router.get('/me', authMiddleware, async (req, res) => { ... });
  const { userId } = req.user;

  try {
    const result = await db.query(
      'SELECT user_id, username, avatar_stock, registration_date FROM users WHERE user_id = $1',
      [userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error al obtener datos del usuario:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

module.exports = router;

// Actualizar avatar del usuario
router.put('/avatar', authMiddleware, userService.updateAvatar);

module.exports = router;


