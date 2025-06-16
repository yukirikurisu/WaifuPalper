const db = require('../db/connection');
const { HTTPException } = require('../errors/HTTPException');
exports.updateAvatar = async (req, res) => {
  try {
    const { avatar } = req.body;       
    const userId = req.user.userId;

    await db.query(
      'UPDATE users SET avatar_id = $1 WHERE user_id = $2',
      [avatar, userId]
    );

    res.json({ success: true });
  } catch (error) {
    console.error('Error updating avatar:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

exports.getProfileStats = async (userId) => {
  try {
    const result = await db.query(
      `SELECT
         COUNT(*)::int        AS characters_count,
         COALESCE(SUM(current_love),0)::int AS total_love
       FROM user_characters
       WHERE user_id = $1`,
      [userId]
    );
    return result.rows[0];
  } catch (err) {
    console.error('DB error in getProfileStats:', err);
    throw new HTTPException(500, 'Error al calcular estadísticas de perfil');
  }
};
