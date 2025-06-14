const db = require('../db/connection');
const { HTTPException } = require('../errors/HTTPException');

exports.getActiveCharacter = async (userId) => {
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

    const character = result.rows[0];
    return character;
  } catch (err) {
    throw new HTTPException(500, 'Error al obtener el personaje activo');
  }
};

class CharacterService {
    // Asignar personaje mediante pase
    async assignCharacterFromPass(passId) {
        return db.runInTransaction(async (client) => {
            // Verificar pase
            const pass = await client.query(
                `SELECT * FROM summoning_passes 
                 WHERE pass_id = $1 AND is_redeemed = false`,
                [passId]
            );
            
            if (pass.rowCount === 0) {
                throw new HTTPException(404, 'Pase no válido o ya canjeado');
            }
            
            // Seleccionar personaje según rareza
            let character;
            if (pass.rows[0].pass_type === 'pity') {
                character = await client.query(
                    `SELECT * FROM characters 
                     ORDER BY RANDOM() 
                     LIMIT 1`
                );
            } else {
                character = await client.query(
                    `SELECT * FROM characters 
                     WHERE rarity = $1 
                     ORDER BY RANDOM() 
                     LIMIT 1`,
                    [pass.rows[0].pass_type]
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
        });
    }
    
    // Obtener estadísticas base por rareza
    getBaseStats(rarity) {
        switch(rarity) {
            case 'blue': return 1;
            case 'purple': return 3;
            case 'golden': return 5;
            default: return 1;
        }
    }
    
    // Subir nivel de personaje
    async levelUpCharacter(userCharacterId) {
        return db.runInTransaction(async (client) => {
            // Obtener todos los datos necesarios
            const character = await client.query(
                `SELECT uc.level, uc.defense, uc.magic, uc.current_love, 
                        uc.max_health, uc.max_magic, lr.love_to_next_level
                 FROM user_characters uc
                 JOIN level_requirements lr ON uc.level = lr.level
                 WHERE uc.user_character_id = $1`,
                [userCharacterId]
            );
            
            if (character.rowCount === 0) {
                throw new HTTPException(404, 'Personaje no encontrado');
            }
            
            const charData = character.rows[0];
            
            // Verificar si se alcanzó el nivel máximo
            const nextLevelReq = await client.query(
                `SELECT 1 FROM level_requirements WHERE level = $1`,
                [charData.level + 1]
            );
            
            if (nextLevelReq.rowCount === 0) {
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
                     unspent_stat_points = unspent_stat_points + 10,
                     current_love = current_love - $2,
                     max_health = $3,
                     current_health = $3,  -- restaurar salud completa
                     max_magic = $4,
                     current_magic = $4    -- restaurar magia completa
                 WHERE user_character_id = $5`,
                [
                    newLevel,
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
        });
    }

    // Cálculo de salud máxima
    calculateMaxHealth(level, defense) {
        return 100 + (level * 10) + (defense * 5);
    }

    // Cálculo de magia máxima
    calculateMaxMagic(level, magicStat) {
        return 50 + (level * 5) + (magicStat * 10);
    }

    // Asignar puntos de estadística
    async allocateStatPoints(userCharacterId, stats) {
        return db.runInTransaction(async (client) => {
            // Obtener datos actuales
            const character = await client.query(
                `SELECT unspent_stat_points, level, defense, magic
                 FROM user_characters 
                 WHERE user_character_id = $1`,
                [userCharacterId]
            );
            
            if (character.rowCount === 0) {
                throw new HTTPException(404, 'Personaje no encontrado');
            }
            
            const charData = character.rows[0];
            const totalPoints = Object.values(stats).reduce((sum, val) => sum + val, 0);
            
            if (totalPoints > charData.unspent_stat_points) {
                throw new HTTPException(400, 'Puntos insuficientes');
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
            
            if (updates.length === 0) {
                throw new HTTPException(400, 'No se especificaron puntos para asignar');
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
            if (stats.defense || stats.magic) {
                let healthUpdate = '';
                let magicUpdate = '';
                const updateValues = [userCharacterId];
                let updateIndex = 2;
                
                if (stats.defense) {
                    const newHealth = this.calculateMaxHealth(updatedChar.level, updatedChar.defense);
                    healthUpdate = `max_health = $${updateIndex}, current_health = LEAST(current_health, $${updateIndex})`;
                    updateValues.push(newHealth);
                    updateIndex++;
                }
                
                if (stats.magic) {
                    const newMagic = this.calculateMaxMagic(updatedChar.level, updatedChar.magic);
                    magicUpdate = `max_magic = $${updateIndex}, current_magic = LEAST(current_magic, $${updateIndex})`;
                    updateValues.push(newMagic);
                    updateIndex++;
                }
                
                const separator = (healthUpdate && magicUpdate) ? ', ' : '';
                await client.query(
                    `UPDATE user_characters
                     SET ${healthUpdate}${separator}${magicUpdate}
                     WHERE user_character_id = $1`,
                    updateValues
                );
            }
            
            return updatedChar;
        });
    }
    // Encontrar oponente para batalla
    async findBattleOpponent(userCharacterId) {
        const character = await db.query(
            `SELECT user_id, level 
             FROM user_characters 
             WHERE user_character_id = $1`,
            [userCharacterId]
        );
        
        if (character.rowCount === 0) {
            throw new HTTPException(404, 'Personaje no encontrado');
        }
        
        const opponent = await db.query(
            `SELECT uc.user_character_id, c.name, c.static_image_url,
                    uc.level, uc.attack, uc.defense, uc.speed, 
                    uc.crit_damage, uc.crit_probability, uc.magic
             FROM user_characters uc
             JOIN characters c ON uc.character_id = c.character_id
             WHERE uc.user_id != $1
               AND uc.level BETWEEN $2 - 5 AND $2 + 5
               AND uc.is_lost = false
             ORDER BY RANDOM()
             LIMIT 1`,
            [character.rows[0].user_id, character.rows[0].level]
        );
        
        if (opponent.rowCount === 0) {
            throw new HTTPException(404, 'No se encontraron oponentes');
        }
        
        return opponent.rows[0];
    }
}

module.exports = new CharacterService();