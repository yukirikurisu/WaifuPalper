const db = require('../db/connection');
const { HTTPException } = require('../errors/HTTPException');
const config = require('../config');

class ClickService {
  async recordClickSession(userId, userCharacterId, clickCount) {
    return db.withDb(async (client) => {
      // Validar parámetros
      if (!userCharacterId || !clickCount || clickCount <= 0) {
        throw new HTTPException(400, 'Parámetros inválidos para la sesión de clics');
      }
      
      // Obtener estado del personaje con bloqueo
      const { rows } = await client.query(
        `SELECT 
            current_love, 
            is_resentful,
            is_lost
         FROM user_characters
         WHERE user_character_id = $1 AND user_id = $2
         FOR UPDATE`,
        [userCharacterId, userId]
      );
      
      if (rows.length === 0) {
        throw new HTTPException(404, 'Personaje no encontrado');
      }
      
      const character = rows[0];
      
      // Si el personaje está perdido, no gana amor
      if (character.is_lost) {
        return { 
          loveGain: 0,
          newLove: character.current_love,
          isResentful: character.is_resentful
        };
      }
      
      // Calcular amor ganado (considerando resentimiento)
      const baseLovePerClick = config.game.clicks.lovePerClick;
      const effectiveMultiplier = character.is_resentful ? 0.1 : 1;
      const loveGain = Math.round(clickCount * baseLovePerClick * effectiveMultiplier);
      const newLove = character.current_love + loveGain;
      
      // Actualizar el personaje
      await client.query(
        `UPDATE user_characters
         SET 
            current_love = $1,
            last_used = CURRENT_TIMESTAMP,
            usage_counter = usage_counter + $2
         WHERE user_character_id = $3`,
        [newLove, clickCount, userCharacterId]
      );
      
      // Registrar sesión histórica
      await client.query(
        `INSERT INTO click_sessions (
            user_id, 
            user_character_id, 
            click_count, 
            love_gain,
            is_resentful
         ) VALUES ($1, $2, $3, $4, $5)`,
        [userId, userCharacterId, clickCount, loveGain, character.is_resentful]
      );
      
      return {
        loveGain,
        newLove,
        isResentful: character.is_resentful
      };
    });
  }
}

module.exports = new ClickService();