const express = require('express');
const router = express.Router();
const { loginWithTelegram } = require('../services/authService');

// Ruta para autenticación por Telegram
router.post('/telegram', loginWithTelegram);

module.exports = router;
