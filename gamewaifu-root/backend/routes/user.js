const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/auth');
const db = require('../db/connection');
const userService = require('../services/userService');
const missionService = require('../services/missionService');
const achievementService = require('../services/achievementService');

router.get('/me', authMiddleware, async (req, res) => {
  const { userId } = req.user;
  try {
    // Datos básicos de usuario
    const userResult = await db.query(
      `SELECT
         u.user_id,
         u.username,
         u.avatar_id    AS avatarId,
         a.avatar_image_url AS avatarUrl,
         u.registration_date
       FROM users u
       LEFT JOIN avatars a ON u.avatar_id = a.avatar_id
       WHERE u.user_id = $1`,
      [userId]
    );
    if (userResult.rows.length === 0) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }
    const user = userResult.rows[0];

    const stats = await userService.getProfileStats(userId);

    res.json({
      ...user,
      charactersCount: stats.characters_count,
      totalLove:      stats.total_love
    });
  } catch (error) {
    console.error('Error al obtener perfil completo:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

router.get('/missions', authMiddleware, async (req, res) => {
  try {
    const missions = await missionService.getUserMissions(req.user.userId);
    res.json(missions);
  } catch (err) {
    console.error('Error al cargar misiones:', err);
    res.status(err.status || 500).json({ error: err.message });
  }
});

router.get('/achievements', authMiddleware, async (req, res) => {
  try {
    const achievements = await achievementService.getUserAchievements(req.user.userId);
    res.json(achievements);
  } catch (err) {
    console.error('Error al cargar logros:', err);
    res.status(err.status || 500).json({ error: err.message });
  }
});

module.exports = router;
