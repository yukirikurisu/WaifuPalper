const db = require('../db/connection');

exports.updateAvatar = async (req, res) => {
  try {
    const { avatar } = req.body;       // avatar es el UUID
    const userId = req.user.userId;

    await db.query(
      'UPDATE users SET avatar_id = $1 WHERE user_id = $2',
      [avatar, userId]
    );

    res.json({ success: true });
  } catch (error) {
    console.error('Error updating avatar:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};
