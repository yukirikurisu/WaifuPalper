const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/auth');
const characterService = require('../services/characterService');

router.get('/active', authMiddleware, async (req, res) => {
  try {
    const activeCharacter = await characterService.getActiveCharacter(req.user.userId);

    if (!activeCharacter) {
      return res.status(404).json({ 
        error: 'No active character found',
        code: 'NO_ACTIVE_CHARACTER'
      });
    }

    // Formatear respuesta para el cliente
    const response = {
      id: activeCharacter.user_character_id,
      character_id: activeCharacter.character_id,
      name: activeCharacter.character_name,
      description: activeCharacter.character_description,
      image_url: activeCharacter.static_image_url,
      model_url: activeCharacter.glb_model_url,
      level: activeCharacter.level,
      love: activeCharacter.current_love,
      stats: {
        health: activeCharacter.current_health,
        max_health: activeCharacter.max_health,
        attack: activeCharacter.attack,
        defense: activeCharacter.defense,
      },
    };

    res.json(response);
  } catch (error) {
    console.error('Error fetching active character:', error);
    res.status(500).json({ 
      error: error.message || 'Internal server error',
      code: 'SERVER_ERROR'
    });
  }
});