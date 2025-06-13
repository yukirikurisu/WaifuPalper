const express = require('express');
const router = express.Router();
const { loginWithTelegram } = require('../services/authService');

// Usar router.route para manejar GET y POST
router.route('/telegram')
  .get(loginWithTelegram)
  .post(loginWithTelegram);

module.exports = router;
