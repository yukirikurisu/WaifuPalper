const db = require('../db/connection');
const { HTTPException } = require('../errors/HTTPException');

class AvatarService {
  async getAllAvatars() {
    try {
      const result = await db.query(
        `SELECT avatar_id AS id, name, avatar_image_url AS url
         FROM avatars
         ORDER BY created_at`,
        []
      );
      return result.rows;
    } catch (err) {
      console.error('Database error in getAllAvatars:', {
        error: err.message,
        stack: err.stack
      });
      throw new HTTPException(500, 'Error al obtener avatares');
    }
  }
}

module.exports = new AvatarService();
