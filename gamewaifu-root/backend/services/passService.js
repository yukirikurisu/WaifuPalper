const db = require('../db/connection');
const { HTTPException } = require('../errors/HTTPException');

class PassService {
    // Comprar pase con amor
    async purchasePassWithLove(userId, passType) {
        return db.runInTransaction(async (client) => {
            // Costos de pases
            const costs = {
                'blue': 1000,
                'purple': 5000,
                'golden': 10000
            };
            
            if (!costs[passType]) {
                throw new HTTPException(400, 'Tipo de pase inválido');
            }
            
            const cost = costs[passType];
            
            // Obtener personaje activo
            const character = await client.query(
                `SELECT user_character_id, current_love, level
                 FROM user_characters
                 WHERE user_id = $1 AND is_active = true`,
                [userId]
            );
            
            if (character.rowCount === 0) {
                throw new HTTPException(404, 'No se encontró personaje activo');
            }
            
            // Verificar amor suficiente
            if (character.rows[0].current_love < cost) {
                throw new HTTPException(400, 'Amor insuficiente');
            }
            
            // Calcular nuevo amor (no menos de 100)
            const newLove = Math.max(character.rows[0].current_love - cost, 100);
            
            // Actualizar personaje
            await client.query(
                `UPDATE user_characters
                 SET current_love = $1,
                     is_resentful = true,
                     resentment_base_level = $2,
                     resentment_start = NOW()
                 WHERE user_character_id = $3`,
                [newLove, character.rows[0].level, character.rows[0].user_character_id]
            );
            
            // Crear pase
            const newPass = await client.query(
                `INSERT INTO summoning_passes (
                    user_id,
                    pass_type,
                    cost
                ) VALUES ($1, $2, $3)
                RETURNING pass_id`,
                [userId, passType, cost]
            );
            
            // Registrar transacción
            await client.query(
                `INSERT INTO transactions (
                    user_id,
                    pass_id,
                    amount,
                    transaction_type
                ) VALUES ($1, $2, $3, 'purchase')`,
                [userId, newPass.rows[0].pass_id, cost]
            );
            
            return newPass.rows[0];
        });
    }
    
    // Canjear pase por personaje
    async redeemPassForCharacter(userId, passId) {
        return db.runInTransaction(async (client) => {
            // Verificar propiedad del pase
            const pass = await client.query(
                `SELECT pass_id FROM summoning_passes
                 WHERE pass_id = $1 AND user_id = $2 AND is_redeemed = false`,
                [passId, userId]
            );
            
            if (pass.rowCount === 0) {
                throw new HTTPException(404, 'Pase no válido');
            }
            
            // Canjear por personaje
            const characterService = require('./characterService');
            const character = await characterService.assignCharacterFromPass(passId);
            
            return character;
        });
    }
}

module.exports = new PassService();