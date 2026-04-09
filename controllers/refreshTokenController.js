const User = require('../model/User');
const jwt = require('jsonwebtoken');
const ROLES_LIST = require('../config/roles-list');

const handleRefreshToken = async (req, res) => {
    const cookies = req.cookies;
    if (!cookies?.jwt) return res.sendStatus(401);
    const refreshToken = cookies.jwt;

    const foundUser = await User.findOne({ refreshToken }).exec();
    if (!foundUser) return res.sendStatus(403); //Forbidden 
    // evaluate jwt 
    jwt.verify(
        refreshToken,
        process.env.REFRESH_TOKEN_SECRET,
        (err, decoded) => {
            if (err || foundUser.username !== decoded.username) return res.sendStatus(403);
            const roles = Object.values(foundUser.roles);
            const accessToken = jwt.sign(
                {
                    "UserInfo": {
                        "username": decoded.username,
                        "roles": roles
                    }
                },
                process.env.ACCESS_TOKEN_SECRET,
                { expiresIn: '15m' }
            );
            res.json({ roles, accessToken })
        }
    );
}

// Return a minimal status indicating whether the user is an Admin or Editor
const handleRefreshStatus = async (req, res) => {
    const cookies = req.cookies;
    if (!cookies?.jwt) return res.json({ isAdmin: false, isEditor: false, roles: [] });
    const refreshToken = cookies.jwt;

    const foundUser = await User.findOne({ refreshToken }).exec();
    if (!foundUser) return res.json({ isAdmin: false, isEditor: false, roles: [] });

    try {
        jwt.verify(refreshToken, process.env.REFRESH_TOKEN_SECRET, (err, decoded) => {
            if (err || foundUser.username !== decoded.username) return res.json({ isAdmin: false, isEditor: false, roles: [], username: null });
            const roles = Object.values(foundUser.roles);
            const isAdmin = Array.isArray(roles) && roles.includes(ROLES_LIST.Admin);
            const isEditor = Array.isArray(roles) && roles.includes(ROLES_LIST.Editor);
            // include username so front end can track user-specific state
            return res.json({ isAdmin, isEditor, roles, username: decoded.username });
        });
    } catch (err) {
        return res.json({ isAdmin: false, isEditor: false, roles: [] });
    }
}

module.exports = { handleRefreshToken, handleRefreshStatus }