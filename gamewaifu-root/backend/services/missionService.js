const db = require('../db/connection');
const { HTTPException } = require('../errors/HTTPException');

exports.getUserMissions = async (userId) => {
  try {
    const result = await db.query(
      `SELECT
         um.user_mission_id,
         m.mission_id,
         m.name,
         m.description,
         m.goal,
         um.progress,
         um.is_completed,
         um.completed_at
       FROM user_missions um
       JOIN missions m ON um.mission_id = m.mission_id
       WHERE um.user_id = $1
       ORDER BY m.daily_order`,
      [userId]
    );
    return result.rows;
  } catch (err) {
    console.error('DB error getUserMissions:', err);
    throw new HTTPException(500, 'No se pudieron cargar las misiones');
  }
};
