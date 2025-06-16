const db = require('../db/connection');
const { HTTPException } = require('../errors/HTTPException');
const config = require('../config');
const { validateUUID } = require('../utils/validators');

class CharacterService {
  async getActiveCharacter(userId) {
    try {
      const result = await db.query(
        `SELECT * 
         FROM active_user_character
         WHERE user_id = $1 
         LIMIT 1`,
        [userId]
      );

      if (result.rows.length === 0) {
        return null;
      }

      return result.rows[0];
    } catch (err) {
      console.error('Database error in getActiveCharacter:', {
        userId,
        error: err.message,
        stack: err.stack
      });
      throw new HTTPException(500, 'Error al obtener el personaje activo');
    }
  }

  async getCharacterById(characterId) {
    try {
      // Validar ID antes de consultar
      if (!validateUUID(characterId)) {
        throw new HTTPException(400, 'ID de personaje inválido');
      }

      const result = await db.query(
        `SELECT * 
         FROM characters 
         WHERE character_id = $1`,
        [characterId]
      );

      if (result.rows.length === 0) {
        return null;
      }

      return result.rows[0];
    } catch (err) {
      console.error('Database error in getCharacterById:', {
        characterId,
        error: err.message,
        stack: err.stack
      });
      throw new HTTPException(500, 'Error al obtener el personaje');
    }
  }

  async assignCharacterFromPass(passId) {
    return db.withDb(async (client) => {
      try {
        // Verificar pase
        const pass = await client.query(
          `SELECT * FROM summoning_passes 
          WHERE pass_id = $1 AND is_redeemed = false
          FOR UPDATE`, // Bloqueo para evitar doble canje
          [passId]
        );
        
        if (pass.rowCount === 0) {
          throw new HTTPException(404, 'Pase no válido o ya canjeado');
        }
        
        // Seleccionar personaje según rareza
        let character;
        const passType = pass.rows[0].pass_type;
        
        if (passType === 'pity') {
          character = await client.query(
            `SELECT * FROM characters 
            WHERE rarity IN ('blue', 'purple', 'golden')
            ORDER BY RANDOM() 
            LIMIT 1`
          );
        } else {
          character = await client.query(
            `SELECT * FROM characters 
            WHERE rarity = $1 
            ORDER BY RANDOM() 
            LIMIT 1`,
            [passType]
          );
        }
        
        if (character.rowCount === 0) {
          throw new HTTPException(404, 'No hay personajes disponibles');
        }
        
        // Determinar estadísticas base
        const baseStats = this.getBaseStats(character.rows[0].rarity);
        
        // Crear personaje para el usuario
        const newCharacter = await client.query(
          `INSERT INTO user_characters (
              user_id, 
              character_id, 
              is_active,
              attack,
              defense,
              speed,
              crit_damage,
              crit_probability,
              magic
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
          RETURNING user_character_id`,
          [
              pass.rows[0].user_id,
              character.rows[0].character_id,
              true,
              baseStats,
              baseStats,
              baseStats,
              baseStats,
              baseStats,
              baseStats
          ]
        );
        
        // Marcar pase como canjeado
        await client.query(
          `UPDATE summoning_passes 
          SET is_redeemed = true, 
              redeemed_at = CURRENT_TIMESTAMP,
              obtained_user_character_id = $1
          WHERE pass_id = $2`,
          [newCharacter.rows[0].user_character_id, passId]
        );
        
        return newCharacter.rows[0];
      } catch (error) {
        console.error('Error in assignCharacterFromPass:', {
          passId,
          error: error.message,
          stack: error.stack
        });
        throw error;
      }
    });
  }
  
  getBaseStats(rarity) {
    return config.CHARACTER.BASE_STATS[rarity] || 1;
  }
  
  async levelUpCharacter(userCharacterId) {
    return db.withDb(async (client) => {
      try {
        // Validar ID
        if (!validateUUID(userCharacterId)) {
          throw new HTTPException(400, 'ID de personaje de usuario inválido');
        }

        // Obtener datos del personaje con bloqueo
        const character = await client.query(
          `SELECT uc.level, uc.defense, uc.magic, uc.current_love, 
                  uc.max_health, uc.max_magic, lr.love_to_next_level
          FROM user_characters uc
          JOIN level_requirements lr ON uc.level = lr.level
          WHERE uc.user_character_id = $1
          FOR UPDATE`, // Bloqueo para evitar condiciones de carrera
          [userCharacterId]
        );
        
        if (character.rowCount === 0) {
          throw new HTTPException(404, 'Personaje no encontrado');
        }
        
        const charData = character.rows[0];
        
        // Verificar si se alcanzó el nivel máximo
        const maxLevel = config.CHARACTER.MAX_LEVEL;
        if (charData.level >= maxLevel) {
          throw new HTTPException(400, 'Nivel máximo alcanzado');
        }
        
        // Verificar amor suficiente
        if (charData.current_love < charData.love_to_next_level) {
          throw new HTTPException(400, 'Amor insuficiente para subir de nivel');
        }
        
        // Calcular nuevas estadísticas
        const newLevel = charData.level + 1;
        const newMaxHealth = this.calculateMaxHealth(newLevel, charData.defense);
        const newMaxMagic = this.calculateMaxMagic(newLevel, charData.magic);
        
        // Actualizar el personaje
        await client.query(
          `UPDATE user_characters
          SET level = $1,
              unspent_stat_points = unspent_stat_points + $2,
              current_love = current_love - $3,
              max_health = $4,
              current_health = $4,
              max_magic = $5,
              current_magic = $5
          WHERE user_character_id = $6`,
          [
              newLevel,
              config.CHARACTER.STAT_POINTS_PER_LEVEL,
              charData.love_to_next_level,
              newMaxHealth,
              newMaxMagic,
              userCharacterId
          ]
        );
        
        return { 
            newLevel,
            newMaxHealth,
            newMaxMagic
        };
      } catch (error) {
        console.error('Error in levelUpCharacter:', {
          userCharacterId,
          error: error.message,
          stack: error.stack
        });
        throw error;
      }
    });
  }

  calculateMaxHealth(level, defense) {
    return config.CHARACTER.BASE_HEALTH + 
           (level * config.CHARACTER.HEALTH_PER_LEVEL) + 
           (defense * config.CHARACTER.HEALTH_PER_DEFENSE);
  }

  calculateMaxMagic(level, magicStat) {
    return config.CHARACTER.BASE_MAGIC + 
           (level * config.CHARACTER.MAGIC_PER_LEVEL) + 
           (magicStat * config.CHARACTER.MAGIC_PER_STAT);
  }

  async allocateStatPoints(userCharacterId, stats) {
    return db.withDb(async (client) => {
      try {
        // Validar ID
        if (!validateUUID(userCharacterId)) {
          throw new HTTPException(400, 'ID de personaje de usuario inválido');
        }

        // Validar objeto de stats
        if (!stats || typeof stats !== 'object') {
          throw new HTTPException(400, 'Datos de estadísticas inválidos');
        }

        // Obtener datos actuales con bloqueo
        const character = await client.query(
          `SELECT unspent_stat_points, level, defense, magic
          FROM user_characters 
          WHERE user_character_id = $1
          FOR UPDATE`, // Bloqueo para evitar condiciones de carrera
          [userCharacterId]
        );
        
        if (character.rowCount === 0) {
          throw new HTTPException(404, 'Personaje no encontrado');
        }
        
        const charData = character.rows[0];
        const validStats = ['attack', 'defense', 'speed', 'crit_damage', 'crit_probability', 'magic'];
        let totalPoints = 0;
        
        // Validar y sumar puntos
        for (const [stat, points] of Object.entries(stats)) {
          if (!validStats.includes(stat)) {
            throw new HTTPException(400, `Estadística inválida: ${stat}`);
          }
          
          if (!Number.isInteger(points) || points < 0) {
            throw new HTTPException(400, `Valor inválido para ${stat}`);
          }
          
          totalPoints += points;
        }
        
        if (totalPoints > charData.unspent_stat_points) {
          throw new HTTPException(400, 'Puntos insuficientes');
        }
        
        if (totalPoints === 0) {
          throw new HTTPException(400, 'No se especificaron puntos para asignar');
        }
        
        // Preparar actualización
        const updates = [];
        const values = [userCharacterId];
        let paramIndex = 2;
        
        for (const [stat, points] of Object.entries(stats)) {
          if (points > 0) {
            updates.push(`${stat} = ${stat} + $${paramIndex}`);
            values.push(points);
            paramIndex++;
          }
        }
        
        const query = `
            UPDATE user_characters 
            SET ${updates.join(', ')}, 
                unspent_stat_points = unspent_stat_points - $${paramIndex}
            WHERE user_character_id = $1
            RETURNING *
        `;
        values.push(totalPoints);
        
        const result = await client.query(query, values);
        const updatedChar = result.rows[0];
        
        // Recalcular y actualizar salud/magia si es necesario
        const healthUpdate = [];
        const magicUpdate = [];
        const updateValues = [userCharacterId];
        let updateIndex = 2;
        
        if (stats.defense) {
          const newHealth = this.calculateMaxHealth(updatedChar.level, updatedChar.defense);
          healthUpdate.push(
            `max_health = $${updateIndex}`,
            `current_health = LEAST(current_health, $${updateIndex})`
          );
          updateValues.push(newHealth);
          updateIndex++;
        }
        
        if (stats.magic) {
          const newMagic = this.calculateMaxMagic(updatedChar.level, updatedChar.magic);
          magicUpdate.push(
            `max_magic = $${updateIndex}`,
            `current_magic = LEAST(current_magic, $${updateIndex})`
          );
          updateValues.push(newMagic);
          updateIndex++;
        }
        
        const allUpdates = [...healthUpdate, ...magicUpdate];
        if (allUpdates.length > 0) {
          await client.query(
            `UPDATE user_characters
            SET ${allUpdates.join(', ')}
            WHERE user_character_id = $1`,
            updateValues
          );
        }
        
        return {
          user_character_id: updatedChar.user_character_id,
          unspent_stat_points: updatedChar.unspent_stat_points - totalPoints,
          stats: {
            attack: updatedChar.attack,
            defense: updatedChar.defense,
            speed: updatedChar.speed,
            crit_damage: updatedChar.crit_damage,
            crit_probability: updatedChar.crit_probability,
            magic: updatedChar.magic
          }
        };
      } catch (error) {
        console.error('Error in allocateStatPoints:', {
          userCharacterId,
          stats,
          error: error.message,
          stack: error.stack
        });
        throw error;
      }
    });
  }
  
  async findBattleOpponent(userCharacterId) {
    try {
      // Validar ID
      if (!validateUUID(userCharacterId)) {
        throw new HTTPException(400, 'ID de personaje de usuario inválido');
      }

      const character = await db.query(
        `SELECT user_id, level 
        FROM user_characters 
        WHERE user_character_id = $1`,
        [userCharacterId]
      );
      
      if (character.rowCount === 0) {
        throw new HTTPException(404, 'Personaje no encontrado');
      }
      
      const userId = character.rows[0].user_id;
      const level = character.rows[0].level;
      const levelRange = config.BATTLE.LEVEL_RANGE;
      
      const opponent = await db.query(
        `SELECT uc.user_character_id, 
                c.name AS character_name,
                c.static_image_url,
                uc.level,
                uc.attack,
                uc.defense,
                uc.speed,
                uc.crit_damage,
                uc.crit_probability,
                uc.magic
        FROM user_characters uc
        JOIN characters c ON uc.character_id = c.character_id
        WHERE uc.user_id != $1
          AND uc.level BETWEEN $2 - $3 AND $2 + $3
          AND uc.is_lost = false
        ORDER BY RANDOM()
        LIMIT 1`,
        [userId, level, levelRange]
      );
      
      if (opponent.rowCount === 0) {
        throw new HTTPException(404, 'No se encontraron oponentes');
      }
      
      return opponent.rows[0];
    } catch (error) {
      console.error('Error in findBattleOpponent:', {
        userCharacterId,
        error: error.message,
        stack: error.stack
      });
      throw error;
    }
  }

  // Nueva función para registrar sesiones de clic
  async registerClickSession(sessionData) {
    try {
      // Validar datos de sesión
      if (!validateUUID(sessionData.userId) || 
          !validateUUID(sessionData.characterId)) {
        throw new HTTPException(400, 'IDs inválidos en sesión de clic');
      }
      
      if (!Number.isInteger(sessionData.clickCount) || 
          sessionData.clickCount <= 0 || 
          sessionData.clickCount > config.CLICKS.MAX_PER_SESSION) {
        throw new HTTPException(400, 'Conteo de clics inválido');
      }
      
      // Calcular amor ganado
      const lovePerClick = config.CLICKS.LOVE_PER_CLICK;
      const loveGain = sessionData.clickCount * lovePerClick;
      
      // Registrar en la base de datos
      const result = await db.query(
        `UPDATE user_characters
        SET current_love = current_love + $1,
            usage_counter = usage_counter + $2,
            last_used = CURRENT_TIMESTAMP
        WHERE user_id = $3
          AND character_id = $4
        RETURNING current_love`,
        [loveGain, sessionData.clickCount, sessionData.userId, sessionData.characterId]
      );
      
      if (result.rowCount === 0) {
        throw new HTTPException(404, 'Personaje de usuario no encontrado');
      }
      
      return {
        success: true,
        newLove: result.rows[0].current_love,
        loveGain
      };
    } catch (error) {
      console.error('Error in registerClickSession:', {
        sessionData,
        error: error.message,
        stack: error.stack
      });
      throw error;
    }
  }
}

module.exports = new CharacterService();