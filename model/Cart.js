const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const employeeSchema = new Schema({
    name: {
        type: String,
        required: true
    },
    date: {
        type: String,
        required: true
    },
    priceCents: {
        type: Number,
        required: true
    },
    quantity: {
        type: Number,
        required: true
    },
    image: {
        type: String,
        required: true
    },
    oneDay: {
        type: new Schema({
            date: { type: String, required: true },
            priceCents: { type: Number, required: true }
        }, { _id: false }),
        required: false
    },
    threeDay: {
        type: new Schema({
            date: { type: String, required: true },
            priceCents: { type: Number, required: true }
        }, { _id: false }),
        required: false
    },
    sevenDay: {
        type: new Schema({
            date: { type: String, required: true },
            priceCents: { type: Number, required: true }
        }, { _id: false }),
        required: false
    },
    createdBy: {
        type: String,
        required: false
    }
});

employeeSchema.index({ createdBy: 1 });
employeeSchema.index({ name: 1, createdBy: 1 });

module.exports = mongoose.model('Cart', employeeSchema);