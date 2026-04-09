const express = require('express');
const router = express.Router();
const User = require('../model/User');
const verifyJWT = require('../middleware/verifyJWT');
const verifyRoles = require('../middleware/verifyRoles');
const ROLES_LIST = require('../config/roles-list');

// Return simple array of usernames (optional)
// Return full user info (except password hash and refreshToken)
router.get('/', async (req, res) => {
    try {
        const users = await User.find().select('-refreshToken -__v').lean();
        // Optionally hide password hash, or show only masked value
        const safeUsers = users.map(u => ({
            ...u,
            password: u.password ? '********' : '', // Mask password hash
        }));
        return res.json(safeUsers);
    } catch (err) {
        return res.status(500).json({ message: err.message });
    }
});

// Check if a username exists (case-insensitive). Query: /users/exists?user=alice
router.get('/exists', async (req, res) => {
    const { user } = req.query;
    if (!user) return res.status(400).json({ message: 'user query required' });
    try {
        const found = await User.findOne({ username: new RegExp(`^${user}$`, 'i') }).lean();
        return res.json({ exists: !!found });
    } catch (err) {
        return res.status(500).json({ message: err.message });
    }
});

// Delete user by _id
router.delete('/:id', async (req, res) => {
    const { id } = req.params;
    if (!id) return res.status(400).json({ message: 'User id required' });
    try {
        const deleted = await User.findByIdAndDelete(id);
        if (!deleted) return res.status(404).json({ message: 'User not found' });
        return res.json({ message: 'User deleted successfully' });
    } catch (err) {
        return res.status(500).json({ message: err.message });
    }
});

// Update a user's role (Admin or Editor)
router.put('/:id/role', verifyJWT, verifyRoles(ROLES_LIST.Admin, ROLES_LIST.Editor), async (req, res) => {
    const { id } = req.params;
    const { role } = req.body;
    if (!id) return res.status(400).json({ message: 'User id required' });
    if (!role) return res.status(400).json({ message: 'role required' });
    // validate role against allowed list including Editor
    if (!['Admin', 'User', 'Editor'].includes(role)) return res.status(400).json({ message: 'Invalid role' });
    try {
        // Build atomic update object depending on new role
        let update = {};
        if (role === 'Admin') {
            // set Admin, unset Editor if previously added
            update = {
                $set: { 'roles.Admin': ROLES_LIST.Admin },
                $unset: { 'roles.Editor': '' }
            };
        } else if (role === 'Editor') {
            // set Editor, unset Admin
            update = {
                $set: { 'roles.Editor': ROLES_LIST.Editor },
                $unset: { 'roles.Admin': '' }
            };
        } else {
            // role === 'User' -> remove both elevated roles
            update = {
                $unset: { 'roles.Admin': '', 'roles.Editor': '' }
            };
        }
        const opts = { new: true, projection: { password: 0, refreshToken: 0, __v: 0 } };
        const updated = await User.findByIdAndUpdate(id, update, opts).lean();
        if (!updated) return res.status(404).json({ message: 'User not found' });
        return res.json({ _id: updated._id, username: updated.username, roles: updated.roles });
    } catch (err) {
        return res.status(500).json({ message: err.message });
    }
});

module.exports = router;
