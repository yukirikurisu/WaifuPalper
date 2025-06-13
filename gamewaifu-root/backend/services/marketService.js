const db = require('../db/connection');
const { HTTPException } = require('../errors/HTTPException');

class MarketService {
    // Canjear personaje del mercado negro
    async redeemBlackMarketCharacter(userId, marketId) {
        return db.runInTransaction(async (client) => {
            // Verificar disponibilidad
            const character = await client.query(
                `SELECT bmc.character_id, c.rarity
                 FROM black_market_characters bmc
                 JOIN characters c ON bmc.character_id = c.character_id
                 WHERE bmc.market_id = $1 AND bmc.redeemed = false`,
                [marketId]
            );
            
            if (character.rowCount === 0) {
                throw new HTTPException(404, 'Personaje no disponible');
            }
            
            // Crear personaje para el usuario
            const baseStats = this.getBaseStats(character.rows[0].rarity);
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
                ) VALUES ($1, $2, true, $3, $3, $3, $3, $3, $3)
                RETURNING user_character_id`,
                [userId, character.rows[0].character_id, baseStats]
            );
            
            // Marcar como canjeado
            await client.query(
                `UPDATE black_market_characters 
                 SET redeemed = true, redeemed_by = $1 
                 WHERE market_id = $2`,
                [userId, marketId]
            );
            
            return newCharacter.rows[0];
        });
    }
    
    // Convertir personaje perdido a hate (mercado negro)
    async exchangeLostCharacter(userId, userCharacterId) {
        return db.runInTransaction(async (client) => {
            // Verificar personaje perdido
            const character = await client.query(
                `SELECT character_id 
                 FROM user_characters 
                 WHERE user_character_id = $1 
                   AND user_id = $2 
                   AND is_lost = true`,
                [userCharacterId, userId]
            );
            
            if (character.rowCount === 0) {
                throw new HTTPException(404, 'Personaje no encontrado o no perdido');
            }
            
            // Mover al mercado negro
            await client.query(
                `INSERT INTO black_market_characters 
                 (original_user_id, character_id) 
                 VALUES ($1, $2)`,
                [userId, character.rows[0].character_id]
            );
            
            // Eliminar del inventario
            await client.query(
                `DELETE FROM user_characters 
                 WHERE user_character_id = $1`,
                [userCharacterId]
            );
            
            // Lógica de lotería (25% de probabilidad de pase pity)
            if (Math.random() < 0.25) {
                await client.query(
                    `UPDATE user_pass_inventory 
                     SET quantity = quantity + 1 
                     WHERE user_id = $1 AND pass_type = 'pity'`,
                    [userId]
                );
                return { reward: 'pity_pass' };
            }
            
            // Verificar si el usuario se queda sin personajes
            const remaining = await client.query(
                `SELECT COUNT(*) 
                 FROM user_characters 
                 WHERE user_id = $1`,
                [userId]
            );
            
            if (parseInt(remaining.rows[0].count) === 0) {
                await client.query(
                    `UPDATE users 
                     SET is_blocked = true, blocked_at = NOW() 
                     WHERE user_id = $1`,
                    [userId]
                );
                return { blocked: true };
            }
            
            return { reward: 'none' };
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
}

module.exports = new MarketService();