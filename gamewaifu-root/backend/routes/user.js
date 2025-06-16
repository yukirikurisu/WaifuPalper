// backend/routes/user.js
const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/auth');
const db = require('../db/connection');

router.get('/me', authMiddleware, async (req, res) => {
  const { userId } = req.user;

  try {
    const result = await db.query(
      `SELECT
         u.user_id,
         u.username,
         u.avatar_id           AS avatarId,
         a.avatar_image_url    AS avatarUrl,
         u.registration_date
       FROM users u
       LEFT JOIN avatars a
         ON u.avatar_id = a.avatar_id
       WHERE u.user_id = $1`,
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
