// backend/config/index.js
require('dotenv').config();

module.exports = {
  env: process.env.NODE_ENV || 'development',
  port: process.env.PORT || 5000,
  baseUrl: process.env.BASE_URL,

  // Base de datos (sólo si necesitas acceso directo; Sequelize usa config/config.js)
  db: {
    name:     process.env.DB_NAME,
    user:     process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    host:     process.env.DB_HOST,
    port:     process.env.DB_PORT,
  },

  getDbConfig: function () {
    return {
      user: this.db.user,
      host: this.db.host,
      database: this.db.name,
      password: this.db.password,
      port: this.db.port,
    };
  },
  // CORS
  corsOrigin: process.env.CORS_ORIGIN,

  // Seguridad / JWT
  jwtSecret: process.env.JWT_SECRET,

  // Telegram
  telegram: {
    botToken:    process.env.TELEGRAM_BOT_TOKEN,
    botUsername: process.env.TELEGRAM_BOT_USERNAME
  },

  // Lógica de juego
  game: {
    healthRegenRate:    parseFloat(process.env.HEALTH_REGEN_RATE),
    magicRegenRate:     parseFloat(process.env.MAGIC_REGEN_RATE),
    baseHealthPerLevel: parseInt(process.env.BASE_HEALTH_PER_LEVEL, 10),
    baseMagicPerLevel:  parseInt(process.env.BASE_MAGIC_PER_LEVEL, 10),
    defenseHealthMult:  parseInt(process.env.DEFENSE_HEALTH_MULT, 10),
    magicStatMult:      parseInt(process.env.MAGIC_STAT_MULT, 10),
    maxBattleTurns:     parseInt(process.env.MAX_BATTLE_TURNS, 10),
  }
};
