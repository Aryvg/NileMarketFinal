const Order = require('../model/Order');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');

const path = require('path');

const makeImageUrl = (imgPath, req) => {
    if (!imgPath) return '';
    if (typeof imgPath !== 'string') return '';
    const trimmed = imgPath.trim();
    if (!trimmed) return '';
    if (/^https?:\/\//i.test(trimmed) || /^\/\//.test()) return trimmed;
    // ensure no leading slash duplication
    const clean = trimmed.replace(/^\/+/, '');
    return `${req.protocol}://${req.get('host')}/${clean}`;
}

const makeMediaUrl = (mediaPath, req) => {
    if (!mediaPath) return '';
    if (typeof mediaPath !== 'string') return '';
    const trimmed = mediaPath.trim();
    if (!trimmed) return '';
    if (/^https?:\/\//i.test(trimmed) || /^\/\//.test(trimmed)) return trimmed;
    // if path contains directories, use basename and route through media controller
    const base = path.basename(trimmed);
    return `${req.protocol}://${req.get('host')}/media/file/${encodeURIComponent(base)}`;
}

const getAllOrders = async (req, res) => {
    // Construct mongo query filter step-by-step so we can insert
    // optional parameters (search term, admin view) later.
    const filter = {};

    // if ?all=1 is present, return all orders (admin dashboard)
    // Otherwise, return only orders for the logged-in user
    if (req.query.all === '1') {
        // no additional restriction
    } else {
        const username = req.user;
        filter.createdBy = username;
    }

    // support backend search: ?productName=<term>
    if (req.query.productName && typeof req.query.productName === 'string') {
        // look for orders where at least one item has a matching name
        filter['product.name'] = { $regex: req.query.productName, $options: 'i' };
    }

    let orders = await Order.find(filter);
    if (!orders || orders.length === 0) return res.status(204).json({ message: 'No orders found.' });

    // if the client requested a productName search term we already
    // filtered orders via mongoose but the product arrays still contain
    // every item in the order. keep only the matching items so the UI
    // displays exactly what the user typed.
    if (req.query.productName && typeof req.query.productName === 'string') {
        const term = req.query.productName.trim().toLowerCase();
        orders = orders.map(order => {
            if (Array.isArray(order.product)) {
                order.product = order.product.filter(item => {
                    const name = (item.name || '').toString().toLowerCase();
                    return name.includes(term);
                });
            }
            return order;
        }).filter(order => Array.isArray(order.product) && order.product.length > 0);
    }

    res.json(orders);
}

const createOrder = async (req, res) => {
    // Fields come in as JSON; multer is no longer used so we just look in req.body.
    if (!req?.body?.product || !req?.body?.shippingAddress) {
        return res.status(400).json({ message: 'product and shippingAddress are required' });
    }

    try {
        let product = undefined;
        let shippingAddress = undefined;

        if (req.body.product) {
            if (typeof req.body.product === 'string') {
                try {
                    product = JSON.parse(req.body.product);
                } catch (e) {
                    product = req.body.product;
                }
            } else {
                product = req.body.product;
            }
        }
        if (req.body.shippingAddress) {
            if (typeof req.body.shippingAddress === 'string') {
                try {
                    shippingAddress = JSON.parse(req.body.shippingAddress);
                } catch (e) {
                    shippingAddress = req.body.shippingAddress;
                }
            } else {
                shippingAddress = req.body.shippingAddress;
            }
        }

        // Validate types
        if (!Array.isArray(product)) {
            return res.status(400).json({ message: 'product must be an array' });
        }
        if (!shippingAddress || typeof shippingAddress !== 'object' || Array.isArray(shippingAddress)) {
            return res.status(400).json({ message: 'shippingAddress must be an object' });
        }
        //const skills = req.body?.skills ? req.body.skills : undefined;


        // assign uuids where needed
        const orderId = uuidv4();
        product = product.map(p => ({
            productId: p.productId || uuidv4(),
            ...p
        }));

        const result = await Order.create({
            orderId,
            Total: req.body.Total,
            date: req.body.date,
            deliveryDate: req.body.deliveryDate,
            product,
            shippingAddress,
            createdBy: req.user // set creator from verifyJWT middleware
        });

        res.status(201).json(result);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server error' });
    }
}

const updateOrder = async (req, res) => {
    const id = req.body?.id || req.query?.id || req.params?.id;
    if (!id) {
        return res.status(400).json({ message: 'ID parameter is required.' });
    }

    const order = await Order.findOne({ _id: id }).exec();
    if (!order) {
        return res.status(204).json({ message: `No order matches ID ${id}.` });
    }


    if (req.body?.product) {
        let prod = req.body.product;
        if (typeof prod === 'string') {
            try { prod = JSON.parse(prod); } catch (e) { }
        }
        if (Array.isArray(prod)) {
            // ensure every item has a productId
            prod = prod.map(p => ({ productId: p.productId || uuidv4(), ...p }));
            order.product = prod;
        }
    }
    if (req.body?.shippingAddress) {
        let addr = req.body.shippingAddress;
        if (typeof addr === 'string') {
            try { addr = JSON.parse(addr); } catch (e) { }
        }
        if (addr && typeof addr === 'object' && !Array.isArray(addr)) {
            order.shippingAddress = addr;
        }
    }

    const result = await order.save();
    res.json(result);
}

const deleteOrder = async (req, res) => {
    if (!req?.body?.id) return res.status(400).json({ message: 'Order ID required.' });

    const order = await Order.findOne({ _id: req.body.id }).exec();
    if (!order) {
        return res.status(204).json({ message: `No order matches ID ${req.body.id}.` });
    }

    const result = await order.deleteOne(); //{ _id: req.body.id }
    res.json(result);
}

const getOrder = async (req, res) => {
    if (!req?.params?.id) return res.status(400).json({ message: 'Order ID required.' });

    const order = await Order.findOne({ _id: req.params.id });
    if (!order) {
        return res.status(204).json({ message: `No order matches ID ${req.params.id}.` });
    }
    res.json(order);
}

module.exports = {
    getAllOrders,
    createOrder,
    updateOrder,
    deleteOrder,
    getOrder
}