const db = require('../db/connection');
const { HTTPException } = require('../errors/HTTPException');

class ResentService {
  async processResentfulCharacters() {
    return db.runInTransaction(async (client) => {
      await client.query(`
        UPDATE user_characters
           SET
             is_lost = CASE
               WHEN NOW() - resentment_start >= INTERVAL '24 hours'
                    AND level < (resentment_base_level + 5)
                 THEN TRUE
               ELSE is_lost
             END,
             is_resentful = CASE
               WHEN level >= (resentment_base_level + 5)
                 THEN FALSE
               ELSE is_resentful
             END,
             resentment_base_level = CASE
               WHEN level >= (resentment_base_level + 5)
                 THEN NULL
               ELSE resentment_base_level
             END,
             resentment_start = CASE
               WHEN level >= (resentment_base_level + 5)
                 THEN NULL
               ELSE resentment_start
             END
         WHERE is_resentful
           AND (
             NOW() - resentment_start >= INTERVAL '24 hours'
             OR level >= (resentment_base_level + 5)
           );
      `);
    });
  }
}

module.exports = new ResentService();
