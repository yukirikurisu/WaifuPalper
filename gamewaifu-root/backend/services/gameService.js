const db = require('../db/connection');
const { HTTPException } = require('../errors/HTTPException');

class GameService {
    // Registrar sesión de juego
    async recordGameSession(sessionData) {
        return db.runInTransaction(async (client) => {
            // Insertar sesión
            const session = await client.query(
                `INSERT INTO game_sessions (
                    user_id,
                    user_character_id,
                    start_time,
                    end_time,
                    score,
                    performance_metrics
                ) VALUES ($1, $2, $3, $4, $5, $6)
                RETURNING session_id`,
                [
                    sessionData.userId,
                    sessionData.characterId,
                    sessionData.startTime,
                    sessionData.endTime,
                    sessionData.score,
                    sessionData.metrics
                ]
            );
            
            // Obtener personaje
            const character = await client.query(
                `SELECT is_resentful, resentment_base_level, resentment_start
                 FROM user_characters 
                 WHERE user_character_id = $1`,
                [sessionData.characterId]
            );
            
            if (character.rowCount === 0) {
                throw new HTTPException(404, 'Personaje no encontrado');
            }
            
            // Calcular amor ganado con multiplicadores
            let loveGain = sessionData.score;
            let isResentful = false;
            
            if (character.rows[0].is_resentful) {
                // Verificar si ha pasado más de 24 horas
                const resentmentStart = new Date(character.rows[0].resentment_start);
                const now = new Date();
                
                if ((now - resentmentStart) > 24 * 60 * 60 * 1000) {
                    // Verificar si alcanzó los niveles requeridos
                    const currentLevel = await client.query(
                        `SELECT level FROM user_characters 
                         WHERE user_character_id = $1`,
                        [sessionData.characterId]
                    );
                    
                    if (currentLevel.rows[0].level < character.rows[0].resentment_base_level + 5) {
                        // Marcar como perdido
                        await client.query(
                            `UPDATE user_characters 
                             SET is_lost = true 
                             WHERE user_character_id = $1`,
                            [sessionData.characterId]
                        );
                        return { sessionId: session.rows[0].session_id, loveGain: 0, characterLost: true };
                    } else {
                        // Eliminar estado resentful
                        await client.query(
                            `UPDATE user_characters 
                             SET is_resentful = false,
                                 resentment_base_level = NULL,
                                 resentment_start = NULL
                             WHERE user_character_id = $1`,
                            [sessionData.characterId]
                        );
                    }
                } else {
                    // Aplicar penalización
                    loveGain = Math.floor(sessionData.score * 0.1);
                    isResentful = true;
                }
            }
            
            // Actualizar personaje
            await client.query(
                `UPDATE user_characters 
                 SET usage_counter = usage_counter + 1,
                     last_used = $1,
                     current_love = current_love + $2
                 WHERE user_character_id = $3`,
                [sessionData.endTime, loveGain, sessionData.characterId]
            );
            
            return { 
                sessionId: session.rows[0].session_id, 
                loveGain,
                isResentful
            };
        });
    }
    
    // Procesar inicio de sesión diario
    async processDailyLogin(userId, useMultiplier) {
        return db.runInTransaction(async (client) => {
            // Verificar si ya inició sesión hoy
            const today = await client.query(
                `SELECT 1 FROM daily_logins 
                 WHERE user_id = $1 AND login_date = CURRENT_DATE`,
                [userId]
            );
            
            if (today.rowCount > 0) {
                throw new HTTPException(400, 'Ya inició sesión hoy');
            }
            
            // Registrar inicio de sesión
            await client.query(
                `INSERT INTO daily_logins (user_id, login_date)
                 VALUES ($1, CURRENT_DATE)`,
                [userId]
            );
            
            // Calcular racha actual
            const streak = await client.query(
                `WITH logins AS (
                    SELECT login_date,
                           login_date - ROW_NUMBER() OVER (ORDER BY login_date) * INTERVAL '1 day' AS grp
                    FROM daily_logins
                    WHERE user_id = $1
                      AND login_date >= CURRENT_DATE - INTERVAL '30 days'
                )
                SELECT COUNT(*) AS streak
                FROM logins
                GROUP BY grp
                ORDER BY MAX(login_date) DESC
                LIMIT 1`,
                [userId]
            );
            
            const currentStreak = streak.rowCount > 0 ? parseInt(streak.rows[0].streak) : 1;
            
            // Calcular bono base
            let bonus = Math.round(1075.27 * currentStreak);
            let multiplierApplied = false;
            
            // Aplicar multiplicador si está disponible
            if (useMultiplier) {
                const multiplier = await client.query(
                    `SELECT quantity FROM user_multiplier_inventory
                     WHERE user_id = $1 AND multiplier_type = 'daily_login_x2'`,
                    [userId]
                );
                
                if (multiplier.rowCount > 0 && multiplier.rows[0].quantity > 0) {
                    bonus *= 2;
                    multiplierApplied = true;
                    await client.query(
                        `UPDATE user_multiplier_inventory
                         SET quantity = quantity - 1
                         WHERE user_id = $1 AND multiplier_type = 'daily_login_x2'`,
                        [userId]
                    );
                }
            }
            
            // Aplicar bono al personaje activo
            await client.query(
                `UPDATE user_characters uc
                 SET current_love = current_love + $1
                 FROM users u
                 WHERE uc.user_id = u.user_id
                   AND uc.is_active = true
                   AND u.user_id = $2`,
                [bonus, userId]
            );
            
            return { bonus, streak: currentStreak, multiplierApplied };
        });
    }
}

module.exports = new GameService();