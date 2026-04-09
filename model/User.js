const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const userSchema = new Schema({
    username: {
        type: String,
        required: true
    },
    roles: {
        User: {
            type: Number,
            default: 2001 // means everyone will have this as a default
        },
        Editor: Number,
        Admin: Number
    },
    password: {
        type: String,
        required: true
    },
     email: {
        type: String,
        required: true
    },
     age: {
        type: String,
        required: true
    },
     job: {
        type: String,
        required: true
    },
     country: {
        type: String,
        required: true
    },
    refreshToken: String
});

userSchema.index({ username: 1 });
userSchema.index({ refreshToken: 1 });
userSchema.index({ email: 1 });

module.exports = mongoose.model('User', userSchema);