const express = require('express');
const router = express.Router();
const userController = require('../services/userService');
const authMiddleware = require('../middleware/auth');

// Actualizar avatar del usuario
router.put('/avatar', auth.authenticate, userService.updateAvatar);

module.exports = router;


