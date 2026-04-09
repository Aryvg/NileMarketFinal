const mongoose = require('mongoose');
const Schema = mongoose.Schema;
const { v4: uuidv4 } = require('uuid');

// Subschema for individual products in an order
const productSubSchema = new Schema({
    productId: { type: String, required: true, default: uuidv4 },
    image: String,
    name: String,
    quantity: Number,
    date: Date,
    price: Number,
    total: Number,
    deliveryDate: String
}, { _id: false });

// Subschema for shipping address
const shippingSubSchema = new Schema({
    fullName: String,
    country: String,
    city: String,
    subCity: String,
    houseNo: String,
    phone: String
}, { _id: false });

const orderSchema = new Schema({
    Total: {
        type: Number,
        required: true
    },
    date: {
        type: String,
        required: true
    },
    // deliveryDate removed from root schema; now per product
    orderId: {
        type: String,
        required: true,
        default: uuidv4
    },
    product: {
        type: [productSubSchema],
        default: []
    },
    shippingAddress: {
        type: shippingSubSchema,
        required: true
    },
    createdBy: {
        type: String,
        required: true
    }
}, {
    versionKey: false,
    toJSON: {
        virtuals: true,
        transform(doc, ret) {
            delete ret._id;
            return ret;
        }
    },
    toObject: {
        virtuals: true,
        transform(doc, ret) {
            delete ret._id;
            return ret;
        }
    }
});

orderSchema.index({ createdBy: 1 });
orderSchema.index({ 'product.name': 1 });

module.exports = mongoose.model('Order', orderSchema);