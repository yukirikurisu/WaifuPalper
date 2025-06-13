const express = require('express');
const router = express.Router();
const { authenticate } = require('./auth');
const healthService = require('../services/healthService');

// Regenerar salud naturalmente
router.post('/regenerate/:characterId', authenticate, async (req, res) => {
    try {
        const regenerated = await healthService.naturalHealthRegeneration(req.params.characterId);
        res.json({ 
            regenerated,
            message: `Salud regenerada: +${regenerated} HP`
        });
    } catch (error) {
        console.error('Health regeneration error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Usar consumible de salud
router.post('/use-consumable', authenticate, async (req, res) => {
    try {
        const { characterId, consumableId } = req.body;
        const result = await healthService.useHealthConsumable(
            req.user.userId,
            characterId,
            consumableId
        );
        res.json(result);
    } catch (error) {
        console.error('Use consumable error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Obtener consumibles disponibles
router.get('/consumables', authenticate, async (req, res) => {
    try {
        const consumables = await db.query(
            `SELECT c.*, uc.quantity, uc.last_used
             FROM user_consumables uc
             JOIN health_consumables c ON uc.consumable_id = c.consumable_id
             WHERE uc.user_id = $1`,
            [req.user.userId]
        );
        res.json(consumables.rows);
    } catch (error) {
        console.error('Get consumables error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

module.exports = router;