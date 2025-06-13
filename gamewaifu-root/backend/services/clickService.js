const db = require('../db/connection');
const { HTTPException } = require('../errors/HTTPException');

class ClickService {
   * @param {UUID} userId
   * @param {UUID} characterId
   * @param {number} clickCount
   * @returns {Promise<{ clickSessionId: UUID, loveGain: number }>}
   */
  async recordClickSession(userId, characterId, clickCount) {
    return db.runInTransaction(async (client) => {
      const { rows: sessRows } = await client.query(
        `INSERT INTO click_sessions (user_id, user_character_id, click_count)
         VALUES ($1, $2, $3)
         RETURNING click_session_id, occurred_at`,
        [userId, characterId, clickCount]
      );
      const { click_session_id: clickSessionId, occurred_at: occurredAt } = sessRows[0];

      const { rows: chRows } = await client.query(
        `SELECT current_love, level, is_resentful, is_lost
         FROM user_characters
         WHERE user_character_id = $1
         FOR UPDATE`,
        [characterId]
      );
      if (chRows.length === 0) {
        throw new HTTPException(404, 'Personaje no encontrado');
      }
      const ch = chRows[0];

      if (ch.is_lost) {
        return { clickSessionId, loveGain: 0 };
      }

      const effectiveMultiplier = ch.is_resentful ? 0.1 : 1;

      const loveGain = Math.round(clickCount * effectiveMultiplier);

      await client.query(
        `UPDATE user_characters
            SET usage_counter = usage_counter + 1,
                last_used     = $1,
                current_love  = current_love + $2
          WHERE user_character_id = $3`,
        [occurredAt, loveGain, characterId]
      );

      return { clickSessionId, loveGain };
    });
  }
}

module.exports = new ClickService();
