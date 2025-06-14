// backend/config/index.js
require('dotenv').config();

module.exports = {
  // Configuración general
  env: process.env.NODE_ENV || 'development',
  port: process.env.PORT || 5000,
  baseUrl: process.env.BASE_URL,
  corsOrigin: process.env.CORS_ORIGIN,

  // Configuración de base de datos para Sequelize
  sequelizeConfig: {
    development: {
      username: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME,
      host: process.env.DB_HOST,
      port: process.env.DB_PORT || 5432,
      dialect: 'postgres',
      logging: false,
      pool: {
        max: 10,
        min: 0,
        acquire: 30000,
        idle: 10000
      }
    },
    production: {
      use_env_variable: 'DATABASE_URL',
      dialect: 'postgres',
      dialectOptions: {
        ssl: {
          require: true,
          rejectUnauthorized: false
        }
      },
      logging: false,
      pool: {
        max: 10,
        min: 0,
        acquire: 30000,
        idle: 10000
      }
    }
  },

  // Configuración de base de datos para pg (consultas directas)
  db: {
    user: process.env.DB_USER,
    host: process.env.DB_HOST,
    database: process.env.DB_NAME,
    password: process.env.DB_PASSWORD,
    port: process.env.DB_PORT || 5432,
    ...(process.env.NODE_ENV === 'production' ? {
      ssl: {
        require: true,
        rejectUnauthorized: false
      }
    } : {})
  },

  // Seguridad y autenticación
  jwtSecret: process.env.JWT_SECRET,
  
  // Telegram
  telegram: {
    botToken: process.env.TELEGRAM_BOT_TOKEN,
    botUsername: process.env.TELEGRAM_BOT_USERNAME
  },

  // Rutas de archivos
  paths: {
    characterImages: '/character-images',
    characterModels: '/character-models',
    defaultCharacterImage: '/images/default-character.png',
    avatars: '/avatars'
  },

  // Configuración de juego
  game: {
    healthRegenRate: parseFloat(process.env.HEALTH_REGEN_RATE) || 1,
    magicRegenRate: parseFloat(process.env.MAGIC_REGEN_RATE) || 0.05,
    baseHealthPerLevel: parseInt(process.env.BASE_HEALTH_PER_LEVEL, 10) || 10,
    baseMagicPerLevel: parseInt(process.env.BASE_MAGIC_PER_LEVEL, 10) || 5,
    defenseHealthMult: parseInt(process.env.DEFENSE_HEALTH_MULT, 10) || 5,
    magicStatMult: parseInt(process.env.MAGIC_STAT_MULT, 10) || 10,
    maxBattleTurns: parseInt(process.env.MAX_BATTLE_TURNS, 10) || 10,
    
    // Configuración de personajes
    character: {
      maxLevel: 100,
      baseHealth: 100,
      baseMagic: 50,
      healthPerLevel: 10,
      magicPerLevel: 5,
      healthPerDefense: 5,
      magicPerStat: 10,
      statPointsPerLevel: 10,
      baseStats: {
        blue: 1,
        purple: 3,
        golden: 5
      }
    },
    
    // Configuración de batallas
    battle: {
      levelRange: 5,
      baseReward: 50
    },
    
    // Configuración de clics
    clicks: {
      lovePerClick: 1,
      maxPerSession: 10000,
      sessionTimeout: 5000
    }
  },

  // Función para obtener configuración de Sequelize según entorno
  getSequelizeConfig() {
    return this.sequelizeConfig[this.env] || this.sequelizeConfig.development;
  }
};