const express = require('express');
const router = express.Router();
const refreshTokenController = require('../controllers/refreshTokenController');

// Return new access token + roles (existing behavior)
router.get('/', refreshTokenController.handleRefreshToken)

// Return simple admin status based on refresh cookie
router.get('/status', refreshTokenController.handleRefreshStatus)

module.exports = router;
