const express = require('express');
const router = express.Router();
const authenticate = require('../middleware/auth');
const db = require('../db/connection');

// Obtener datos del usuario autenticado
router.get('/me', authenticate, async (req, res) => {
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
router.put('/avatar', authenticate, async (req, res) => {
  const { userId } = req.user;
  const { avatar } = req.body;

  if (!avatar) {
    return res.status(400).json({ error: 'Avatar no especificado' });
  }

  try {
    await db.query(
      'UPDATE users SET avatar_stock = $1 WHERE user_id = $2',
      [avatar, userId]
    );
    
    res.json({ success: true });
  } catch (error) {
    console.error('Error actualizando avatar:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

module.exports = router;


