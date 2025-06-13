const express = require('express');
const router = express.Router();
const userController = require('../services/userService');
const authMiddleware = require('../middleware/authMiddleware');

// Actualizar avatar del usuario
router.put('/avatar', authMiddleware.authenticate, userService.updateAvatar);

module.exports = router;


