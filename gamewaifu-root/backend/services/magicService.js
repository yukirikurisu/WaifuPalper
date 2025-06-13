const db = require('../db/connection');
const { HTTPException } = require('../errors/HTTPException');

class MagicService {
    // Regeneración de magia
    async regenerateMagicForAll() {
        await db.query(
            `UPDATE user_characters
             SET current_magic = LEAST(
                 max_magic, 
                 current_magic + GREATEST(FLOOR(max_magic * 0.05), 1)
             )
             WHERE current_magic < max_magic`
        );
        return { message: 'Magia regenerada para todos los personajes' };
    }

    // Regeneración natural para un personaje
    async naturalRegeneration(userCharacterId) {
        const result = await db.query(
            `UPDATE user_characters
             SET current_magic = LEAST(
                 max_magic, 
                 current_magic + magic_regen_rate
             ),
             last_magic_regen = NOW()
             WHERE user_character_id = $1
             RETURNING current_magic`,
            [userCharacterId]
        );
        
        if (result.rowCount === 0) {
            throw new HTTPException(404, 'Personaje no encontrado');
        }
        
        return result.rows[0];
    }

    // Usar magia en habilidad
    async consumeMagic(userCharacterId, amount) {
        return db.runInTransaction(async (client) => {
            const result = await client.query(
                `UPDATE user_characters
                 SET current_magic = GREATEST(current_magic - $1, 0)
                 WHERE user_character_id = $2
                 RETURNING current_magic`,
                [amount, userCharacterId]
            );
            
            if (result.rowCount === 0) {
                throw new HTTPException(404, 'Personaje no encontrado');
            }
            
            return result.rows[0];
        });
    }

    // Restaurar magia con consumible
    async restoreMagic(userCharacterId, amount) {
        return db.runInTransaction(async (client) => {
            const result = await client.query(
                `UPDATE user_characters
                 SET current_magic = LEAST(current_magic + $1, max_magic)
                 WHERE user_character_id = $2
                 RETURNING current_magic`,
                [amount, userCharacterId]
            );
            
            if (result.rowCount === 0) {
                throw new HTTPException(404, 'Personaje no encontrado');
            }
            
            return result.rows[0];
        });
    }
}

module.exports = new MagicService();