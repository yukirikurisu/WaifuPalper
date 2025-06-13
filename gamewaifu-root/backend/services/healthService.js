const db = require('../db/connection');
const { HTTPException } = require('../errors/HTTPException');

class HealthService {
    // Calcular salud máxima basada en nivel y defensa
    calculateMaxHealth(level, defense) {
        return 100 + (level * 10) + (defense * 5);
    }

    // Actualizar salud máxima cuando cambian nivel/defensa
    async updateMaxHealth(userCharacterId) {
        return db.runInTransaction(async (client) => {
            const character = await client.query(
                `SELECT level, defense 
                 FROM user_characters 
                 WHERE user_character_id = $1`,
                [userCharacterId]
            );
            
            if (character.rowCount === 0) {
                throw new HTTPException(404, 'Personaje no encontrado');
            }
            
            const maxHealth = this.calculateMaxHealth(
                character.rows[0].level,
                character.rows[0].defense
            );
            
            await client.query(
                `UPDATE user_characters
                 SET max_health = $1,
                     current_health = LEAST(current_health, $1)
                 WHERE user_character_id = $2`,
                [maxHealth, userCharacterId]
            );
            
            return maxHealth;
        });
    }

    // Regeneración natural de salud
    async naturalHealthRegeneration(userCharacterId) {
        return db.runInTransaction(async (client) => {
            const character = await client.query(
                `SELECT current_health, max_health, health_regen_rate, last_rest
                 FROM user_characters 
                 WHERE user_character_id = $1`,
                [userCharacterId]
            );
            
            if (character.rowCount === 0) {
                throw new HTTPException(404, 'Personaje no encontrado');
            }
            
            const { current_health, max_health, health_regen_rate, last_rest } = character.rows[0];
            const now = new Date();
            const lastRestTime = last_rest ? new Date(last_rest) : now;
            
            // Calcular minutos desde el último descanso
            const minutesPassed = Math.floor((now - lastRestTime) / (1000 * 60));
            const healthToRegen = Math.min(
                minutesPassed * health_regen_rate,
                max_health - current_health
            );
            
            if (healthToRegen > 0) {
                await client.query(
                    `UPDATE user_characters
                     SET current_health = current_health + $1,
                         last_rest = NOW()
                     WHERE user_character_id = $2`,
                    [healthToRegen, userCharacterId]
                );
            }
            
            return healthToRegen;
        });
    }

    // Usar consumible de salud
    async useHealthConsumable(userId, userCharacterId, consumableId) {
        return db.runInTransaction(async (client) => {
            // Verificar consumible disponible
            const consumable = await client.query(
                `SELECT c.health_restore, c.cooldown,
                        uc.last_used, uc.quantity
                 FROM user_consumables uc
                 JOIN health_consumables c ON uc.consumable_id = c.consumable_id
                 WHERE uc.user_id = $1
                   AND uc.consumable_id = $2
                   AND uc.quantity > 0`,
                [userId, consumableId]
            );
            
            if (consumable.rowCount === 0) {
                throw new HTTPException(404, 'Consumible no disponible');
            }
            
            const { health_restore, cooldown, last_used, quantity } = consumable.rows[0];
            const now = new Date();
            
            // Verificar cooldown
            if (last_used && (now - new Date(last_used)) < cooldown) {
                throw new HTTPException(400, 'Consumible en cooldown');
            }
            
            // Aplicar efecto al personaje
            await client.query(
                `UPDATE user_characters
                 SET current_health = LEAST(current_health + $1, max_health)
                 WHERE user_character_id = $2`,
                [health_restore, userCharacterId]
            );
            
            // Actualizar inventario
            await client.query(
                `UPDATE user_consumables
                 SET quantity = quantity - 1,
                     last_used = NOW()
                 WHERE user_id = $1 AND consumable_id = $2`,
                [userId, consumableId]
            );
            
            return { healthRestored: health_restore };
        });
    }

    // Recibir daño en batalla
    async takeDamage(userCharacterId, damage) {
        return db.runInTransaction(async (client) => {
            const result = await client.query(
                `UPDATE user_characters
                 SET current_health = GREATEST(current_health - $1, 0)
                 WHERE user_character_id = $2
                 RETURNING current_health`,
                [damage, userCharacterId]
            );
            
            if (result.rowCount === 0) {
                throw new HTTPException(404, 'Personaje no encontrado');
            }
            
            const currentHealth = result.rows[0].current_health;
            
            // Verificar si el personaje fue derrotado
            if (currentHealth <= 0) {
                await this.handleCharacterDefeat(client, userCharacterId);
            }
            
            return currentHealth;
        });
    }

    // Manejar derrota del personaje
    async handleCharacterDefeat(client, userCharacterId) {
        // Reducir amor y posiblemente activar resentimiento
        await client.query(
            `UPDATE user_characters
             SET current_love = GREATEST(current_love - 200, 100),
                 is_resentful = true,
                 resentment_base_level = level,
                 resentment_start = NOW()
             WHERE user_character_id = $1`,
            [userCharacterId]
        );
        
        // Aplicar penalización por derrota
        await client.query(
            `INSERT INTO character_penalties (
                user_character_id,
                penalty_type,
                severity,
                expires_at
             ) VALUES ($1, 'defeat', 'medium', NOW() + INTERVAL '1 hour')`,
            [userCharacterId]
        );
    }
}

module.exports = new HealthService();