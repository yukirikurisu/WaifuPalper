const db = require('../db/connection');
const { HTTPException } = require('../errors/HTTPException');

exports.getUserAchievements = async (userId) => {
  try {
    const result = await db.query(
      `SELECT
         ua.user_achievement_id,
         a.achievement_id,
         a.name,
         a.description,
         a.icon_url,
         a.points,
         ua.unlocked_at
       FROM user_achievements ua
       JOIN achievements a ON ua.achievement_id = a.achievement_id
       WHERE ua.user_id = $1
       ORDER BY ua.unlocked_at DESC`,
      [userId]
    );
    return result.rows;
  } catch (err) {
    console.error('DB error getUserAchievements:', err);
    throw new HTTPException(500, 'No se pudieron cargar los logros');
  }
};
