const crypto = require('crypto');
const { withDb } = require('../db/connection');
const jwt = require('jsonwebtoken');
const config = require('../config/config');
const { HTTPException } = require('../errors/HTTPException');

function validateTelegramAuth(data) {
    if (!data.id || !data.auth_date) return false;

    const token = config.telegram.botToken;
    const secretKey = crypto.createHash('sha256').update(token).digest();
    const checkArray = [];

    for (const key in data) {
        if (key !== 'hash' && data[key]) {
            checkArray.push(`${key}=${data[key]}`);
        }
    }

    checkArray.sort();
    const dataCheckString = checkArray.join('\n');
    const hmac = crypto.createHmac('sha256', secretKey)
        .update(dataCheckString)
        .digest('hex');

    return crypto.timingSafeEqual(Buffer.from(hmac), Buffer.from(data.hash));
}

async function loginWithTelegram(req, res) {
    try {
        const telegramData = req.body;
        
        if (!telegramData || typeof telegramData !== 'object') {
            throw new HTTPException(400, 'Invalid authentication data');
        }
        
        if (!telegramData.auth_date) {
            throw new HTTPException(400, 'Missing auth_date in request');
        }

        const authDate = parseInt(telegramData.auth_date, 10);
        const now = Math.floor(Date.now() / 1000);
        if ((now - authDate) > 300) {
            throw new HTTPException(401, 'Auth date expired');
        }

        if (!validateTelegramAuth(telegramData)) {
            throw new HTTPException(401, 'Data validation failed');
        }

        await withDb(async (client) => {
            const userQuery = await client.query(
                `SELECT user_id FROM users WHERE telegram_id = $1`,
                [telegramData.id]
            );

            let userId;
            let isNewUser = false;

            if (userQuery.rowCount === 0) {
                const newUser = await client.query(
                    `INSERT INTO users (
                        telegram_id, 
                        username, 
                        first_name, 
                        last_name,
                        last_login
                    ) VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP)
                    RETURNING user_id`,
                    [
                        telegramData.id.toString(),
                        telegramData.username || '',
                        telegramData.first_name || '',
                        telegramData.last_name || null
                    ]
                );

                userId = newUser.rows[0].user_id;
                isNewUser = true;

                await client.query(
                    `INSERT INTO user_settings (user_id) VALUES ($1)`,
                    [userId]
                );

                await client.query(
                    `INSERT INTO user_pass_inventory (user_id, pass_type, quantity)
                     VALUES ($1, 'blue', 1), ($1, 'purple', 0), ($1, 'golden', 0), ($1, 'pity', 0)`,
                    [userId]
                );
            } else {
                userId = userQuery.rows[0].user_id;
                await client.query(
                    `UPDATE users SET last_login = CURRENT_TIMESTAMP WHERE user_id = $1`,
                    [userId]
                );
            }

            const token = jwt.sign(
                { userId, telegramId: telegramData.id },
                config.jwtSecret,
                { expiresIn: '7d' }
            );

            res.json({
                success: true,
                userId,
                isNewUser,
                token
            });
        }, { autocommit: true });

    } catch (error) {
        console.error('Telegram auth error:', error);
        if (error instanceof HTTPException) {
            res.status(error.status).json({ error: error.message });
        } else {
            res.status(500).json({ error: 'Internal server error' });
        }
    }
}

module.exports = {
    loginWithTelegram
};