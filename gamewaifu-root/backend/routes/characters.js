// backend/routes/characters.js

const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/auth');
const characterService = require('../services/characterService');
const path = require('path');
const config = require('../config');
const { validateUUID } = require('../utils/validators');

router.get('/active', authMiddleware, async (req, res) => {
  try {
    const activeCharacter = await characterService.getActiveCharacter(req.user.userId);

    if (!activeCharacter) {
      return res.status(404).json({ 
        error: 'No active character found',
        code: 'NO_ACTIVE_CHARACTER',
        solution: 'Assign a character to the user'
      });
    }

    // Manejar imagen faltante o inválida
    let imageUrl = activeCharacter.static_image_url;
    if (!imageUrl || typeof imageUrl !== 'string' || imageUrl.trim() === '') {
      imageUrl = config.PATHS.DEFAULT_CHARACTER_IMAGE;
      console.warn(`Character ${activeCharacter.character_id} has invalid image URL, using default`);
    } else if (!imageUrl.startsWith('http') && !imageUrl.startsWith('/')) {
      // Convertir rutas relativas a absolutas
      imageUrl = path.join(config.PATHS.CHARACTER_IMAGES, imageUrl);
    }

    // Manejar modelo 3D faltante
    let modelUrl = activeCharacter.glb_model_url;
    if (modelUrl && !modelUrl.startsWith('http') && !modelUrl.startsWith('/')) {
      modelUrl = path.join(config.PATHS.CHARACTER_MODELS, modelUrl);
    }

    // Verificar nivel de amor
    let currentLove = parseInt(activeCharacter.current_love);
    if (isNaN(currentLove) || currentLove < 0) {
      console.warn(`Invalid love value for character ${activeCharacter.character_id}, resetting to 0`);
      currentLove = 0;
    }

    // Formatear respuesta para el cliente - AJUSTADO A LA VISTA
    const response = {
      user_character_id: activeCharacter.user_character_id,
      character_id: activeCharacter.character_id,
      name: activeCharacter.character_name,
      description: activeCharacter.character_description,
      image_url: imageUrl,
      model_url: modelUrl,
      level: activeCharacter.level,
      current_love: currentLove,
      max_health: activeCharacter.max_health,
      current_health: activeCharacter.current_health,
      stats: {
        attack: activeCharacter.attack,
        defense: activeCharacter.defense,
        speed: activeCharacter.speed,
        crit_damage: activeCharacter.crit_damage,
        crit_probability: activeCharacter.crit_probability,
        magic: activeCharacter.magic
      },
      magic_stats: {
        max_magic: activeCharacter.max_magic,
        current_magic: activeCharacter.current_magic,
        magic_regen_rate: activeCharacter.magic_regen_rate
      },
      // Metadata para depuración
      metadata: {
        source: 'characters/active',
        timestamp: new Date().toISOString(),
        environment: config.NODE_ENV
      }
    };

    res.json(response);
  } catch (error) {
    console.error('Error fetching active character:', {
      error: error.message,
      userId: req.user.userId,
      stack: error.stack
    });
    
    res.status(500).json({ 
      error: 'Internal server error',
      code: 'SERVER_ERROR',
      details: config.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// Nueva ruta para obtener datos básicos del personaje
router.get('/:characterId', authMiddleware, async (req, res) => {
  try {
    const characterId = req.params.characterId;
    
    // Validar ID
    if (!validateUUID(characterId)) {
      return res.status(400).json({
        error: 'Invalid character ID format',
        code: 'INVALID_ID',
        expected: 'UUIDv4 format'
      });
    }

    const character = await characterService.getCharacterById(characterId);
    
    if (!character) {
      return res.status(404).json({
        error: 'Character not found',
        code: 'CHARACTER_NOT_FOUND',
        characterId: characterId
      });
    }

    // Formatear respuesta básica
    const response = {
      character_id: character.character_id,
      name: character.name,
      image_url: character.static_image_url || config.PATHS.DEFAULT_CHARACTER_IMAGE,
      rarity: character.rarity,
      // Solo en desarrollo incluir más detalles
      ...(config.NODE_ENV === 'development' && {
        glb_model_url: character.glb_model_url,
        created_at: character.created_at
      })
    };

    res.json(response);
  } catch (error) {
    console.error('Error fetching character:', {
      error: error.message,
      characterId: req.params.characterId,
      stack: error.stack
    });
    
    res.status(500).json({
      error: 'Internal server error',
      code: 'SERVER_ERROR',
      details: config.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

module.exports = router;