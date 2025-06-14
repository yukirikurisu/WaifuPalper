const express = require('express');
const router = express.Router();
const { loginWithTelegram } = require('../services/authService');

router.post('/telegram', loginWithTelegram);

module.exports = router;