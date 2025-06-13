require('dotenv').config();           
const express = require('express');
const cors = require('cors');
const cron = require('node-cron');
const { initializePool } = require('./db/connection');
const { sequelize } = require('./models'); // Sequelize instance
const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/user');
const MagicService  = require('./services/magicService');
const HealthService = require('./services/healthService');
const ResentService = require('./services/resentService');
const app = express();
const PORT = process.env.PORT || 5000;
const config = require('./config');

app.use(cors({ origin: config.corsOrigin, methods: ['GET','POST','PUT','DELETE'], allowedHeaders: ['Content-Type','Authorization'] }));

// --- Conexión a DB PostgreSQL (pool) ---
initializePool();

// --- Conexión a DB Sequelize (si usas Sequelize también) ---
sequelize.sync()
  .then(() => console.log('Sequelize: DB conectada'))
  .catch(err => console.error('Sequelize Error:', err));
//
const path = require('path');
app.use(express.static(path.join(__dirname, '..', 'frontend')));

// --- Rutas ---
app.use('/api/auth', authRoutes);
app.use('/api/user', userRoutes);
//
app.get(/^\/(?!api).*/, (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'frontend', 'index.html'));
});

// --- Manejo de errores genérico ---
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Error interno del servidor' });
});

// --- Cron Jobs ---
// Regenerar salud y magia cada 5 minutos
cron.schedule('*/5 * * * *', async () => {
  try {
    await HealthService.regenerateHealthForAll();
    await MagicService.regenerateMagicForAll();
    console.log('[Cron] Regeneración automática completada');
  } catch (error) {
    console.error('[Cron] Error en regeneración automática:', error);
  }
});
// Procesar caracteres resentful cada 5 minutos
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
