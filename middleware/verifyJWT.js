const jwt = require('jsonwebtoken');

const verifyJWT = async (req, res, next) => {
    const authHeader = req.headers.authorization || req.headers.Authorization;
    if (!authHeader) return res.sendStatus(401);

    // Accept either "Bearer <token>" or a bare token pasted into the Authorization header
    let token = null;
    if (typeof authHeader === 'string') {
        const parts = authHeader.split(' ');
        token = parts.length === 2 && parts[0].toLowerCase() === 'bearer' ? parts[1] : authHeader;
    }

    if (!token) return res.sendStatus(401);

    jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, decoded) => {
        if (err) return res.sendStatus(403);

        // Support both payload shapes: { UserInfo: {...} } and { userInfo: {...} }
        const info = decoded.UserInfo || decoded.userInfo || null;
        if (!info) return res.sendStatus(401);

        req.user = info.username;
        req.roles = info.roles;
        next();
    });
};

module.exports = verifyJWT;