require('dotenv').config();           
const express = require('express');
const cors = require('cors');
const cron = require('node-cron');
const { initializePool } = require('./db/connection');
const { sequelize } = require('./models');
const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/user');
const clickRoutes = require('./routes/clicks');
const resentmentRoutes = require('./routes/resentment');
const MagicService  = require('./services/magicService');
const HealthService = require('./services/healthService');
const ResentService = require('./services/resentService');
const characterRoutes = require('./routes/characters');
const app = express();
const PORT = process.env.PORT || 5000;
const config = require('./config/config');

// Middleware
app.use(cors({ 
  origin: config.corsOrigin, 
  methods: ['GET','POST','PUT','DELETE'], 
  allowedHeaders: ['Content-Type','Authorization'] 
}));

// Add body parsing middleware here ▼
app.use(express.json()); // Parse JSON bodies
app.use(express.urlencoded({ extended: true })); // Parse URL-encoded bodies

// --- Conexión a DB PostgreSQL (pool) ---
initializePool();

// --- Conexión a DB Sequelize ---
sequelize.sync()
  .then(() => console.log('Sequelize: DB conectada'))
  .catch(err => console.error('Sequelize Error:', err));

const path = require('path');
app.use(express.static(path.join(__dirname, '..', 'frontend')));

// --- Rutas ---
app.use('/api/auth', authRoutes);
app.use('/api/user', userRoutes);
app.use('/api/characters', characterRoutes)
app.use('/api/clicks', clickRoutes);
app.use('/api/resentment', resentmentRoutes);

app.get(/^\/(?!api).*/, (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'frontend', 'index.html'));
});

// --- Manejo de errores ---
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Error interno del servidor' });
});

// --- Cron Jobs ---
cron.schedule('*/5 * * * *', async () => {
  try {
    await HealthService.regenerateHealthForAll();
    await MagicService.regenerateMagicForAll();
    console.log('[Cron] Regeneración automática completada');
  } catch (error) {
    console.error('[Cron] Error en regeneración automática:', error);
  }
});

cron.schedule('*/5 * * * *', async () => {
  try {
    await ResentService.processResentfulCharacters();
    console.log(`[Cron] Resentful check completed at ${new Date().toISOString()}`);
  } catch (error) {
    console.error('[Cron] Error processing resentful characters:', error);
  }
});

// --- Arrancar servidor ---
app.listen(PORT, () => {
  console.log(`Servidor corriendo en http://localhost:${PORT}`);
});