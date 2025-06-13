const express = require('express');
const router = express.Router();
const { authenticate } = require('./auth');
const gameService = require('../services/gameService');
const characterService = require('../services/characterService');
const marketService = require('../services/marketService');

// Registrar sesión de juego
router.post('/session', authenticate, async (req, res) => {
    try {
        const { characterId, startTime, endTime, score, metrics } = req.body;
        
        if (!characterId || !startTime || !endTime) {
            return res.status(400).json({ error: 'Datos incompletos' });
        }
        
        const result = await gameService.recordGameSession({
            userId: req.user.userId,
            characterId,
            startTime: new Date(startTime),
            endTime: new Date(endTime),
            score,
            metrics
        });
        
        res.json(result);
    } catch (error) {
        console.error('Game session error:', error);
        if (error instanceof HTTPException) {
            res.status(error.status).json({ error: error.message });
        } else {
            res.status(500).json({ error: 'Internal server error' });
        }
    }
});

// Inicio de sesión diario
router.post('/daily-login', authenticate, async (req, res) => {
    try {
        const useMultiplier = req.body.useMultiplier === true;
        const result = await gameService.processDailyLogin(req.user.userId, useMultiplier);
        res.json(result);
    } catch (error) {
        console.error('Daily login error:', error);
        if (error instanceof HTTPException) {
            res.status(error.status).json({ error: error.message });
        } else {
            res.status(500).json({ error: 'Internal server error' });
        }
    }
});

// Subir nivel de personaje
router.post('/characters/:id/level-up', authenticate, async (req, res) => {
    try {
        const result = await characterService.levelUpCharacter(req.params.id);
        res.json(result);
    } catch (error) {
        console.error('Level up error:', error);
        if (error instanceof HTTPException) {
            res.status(error.status).json({ error: error.message });
        } else {
            res.status(500).json({ error: 'Internal server error' });
        }
    }
});

// Asignar puntos de estadística
router.post('/characters/:id/stats', authenticate, async (req, res) => {
    try {
        const stats = req.body;
        const result = await characterService.allocateStatPoints(req.params.id, stats);
        res.json(result);
    } catch (error) {
        console.error('Stats allocation error:', error);
        if (error instanceof HTTPException) {
            res.status(error.status).json({ error: error.message });
        } else {
            res.status(500).json({ error: 'Internal server error' });
        }
    }
});

// Encontrar oponente para batalla
router.get('/battle/opponent/:characterId', authenticate, async (req, res) => {
    try {
        const opponent = await characterService.findBattleOpponent(req.params.characterId);
        res.json(opponent);
    } catch (error) {
        console.error('Battle opponent error:', error);
        if (error instanceof HTTPException) {
            res.status(error.status).json({ error: error.message });
        } else {
            res.status(500).json({ error: 'Internal server error' });
        }
    }
});

// Canjear personaje del mercado negro
router.post('/market/redeem/:marketId', authenticate, async (req, res) => {
    try {
        const character = await marketService.redeemBlackMarketCharacter(
            req.user.userId,
            req.params.marketId
        );
        res.json(character);
    } catch (error) {
        console.error('Market redeem error:', error);
        if (error instanceof HTTPException) {
            res.status(error.status).json({ error: error.message });
        } else {
            res.status(500).json({ error: 'Internal server error' });
        }
    }
});

// Convertir personaje perdido a hate
router.post('/characters/lost/:characterId', authenticate, async (req, res) => {
    try {
        const result = await marketService.exchangeLostCharacter(
            req.user.userId,
            req.params.characterId
        );
        res.json(result);
    } catch (error) {
        console.error('Lost character error:', error);
        if (error instanceof HTTPException) {
            res.status(error.status).json({ error: error.message });
        } else {
            res.status(500).json({ error: 'Internal server error' });
        }
    }
});

module.exports = router;