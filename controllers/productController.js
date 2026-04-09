const Employee = require('../model/Product');
const fs = require('fs');
const Media = require('../model/Media');

const path = require('path');
const cloudinary = require('../config/cloudinary');

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

const getAllEmployees = async (req, res) => {
    const skip = parseInt(req.query.skip) || 0;
    const limit = parseInt(req.query.limit) || 0;
    // If ?showHidden=1 is passed, include hidden products, else exclude
    const showHidden = req.query.showHidden === '1';
    const query = showHidden ? {} : { hidden: { $ne: true } };
    // Sort by _id descending so newest products come first
    const employees = await Employee.find(query).sort({ _id: -1 }).skip(skip).limit(limit).lean();
    if (!employees || employees.length === 0) return res.status(204).json({ 'message': 'No employees found.' });
    // convert image and video paths to URLS (images from /public, videos via /media/file)
    const mapped = employees.map(e => ({ ...e, image: makeImageUrl(e.image, req), video: makeMediaUrl(e.video, req) }));
    res.json(mapped);
}

const createNewEmployee = async (req, res) => {
    // For multipart/form-data, fields are in req.body, files in req.files
    if (!req?.body?.image || !req?.body?.name || !req?.body?.priceCents) {
        return res.status(400).json({ 'message': 'First and last names are required' });
    }

    try {
        // Parse rating if sent as JSON string
        let rating = undefined;
        // let oneDay=undefined;
        // let threeDay=undefined;
        // let sevenDay=undefined;
        if (req.body.rating) {
            try {
                rating = JSON.parse(req.body.rating);
            } catch (e) {
                rating = req.body.rating;
            }
        }
        //const skills = req.body?.skills ? req.body.skills : undefined;

        // Handle image and video file paths
        let imagePath = req.body.image;
        let videoPath = req.body.video;
        if (req.files && req.files.image && req.files.image[0]) {
            // Save relative path for static serving
            imagePath = 'images/' + req.files.image[0].filename;
        }
        if (req.files && req.files.video && req.files.video[0]) {
            videoPath = 'videos/' + req.files.video[0].filename;
        }

        const result = await Employee.create({
            name: req.body.name,
            priceCents: req.body.priceCents,
            image: imagePath,
            ...(rating && { rating }),
            // ...(skills && { skills }),
            createdBy: req.user // set creator from verifyJWT middleware
        });

        res.status(201).json(result);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server error' });
    }
}

const updateEmployee = async (req, res) => {
    // Accept id from either body or query (for form-data)
    const id = req.body?.id || req.query?.id || req.params?.id;
    if (!id) {
        return res.status(400).json({ 'message': 'ID parameter is required.' });
    }

    const employee = await Employee.findOne({ _id: id }).exec();
    if (!employee) {
        return res.status(204).json({ "message": `No employee matches ID ${id}.` });
    }
    if (req.body?.firstname) employee.firstname = req.body.firstname;
    if (req.body?.lastname) employee.lastname = req.body.lastname;
    if (req.body?.job) employee.job = req.body.job;
    // Allow updating product fields: name and priceCents
    if (req.body?.name) employee.name = req.body.name;
    if (req.body?.priceCents !== undefined) {
        const pc = typeof req.body.priceCents === 'string' ? Number(req.body.priceCents) : req.body.priceCents;
        if (!Number.isNaN(pc)) employee.priceCents = pc;
    }

    // Handle rating (parse if JSON string)
    if (req.body?.rating) {
        let rating = req.body.rating;
        if (typeof rating === 'string') {
            try { rating = JSON.parse(rating); } catch (e) {}
        }
        if (Array.isArray(rating)) {
            employee.rating = rating;
        }
    }

    // if (req.body?.skills) {
    //     const existing = employee.skills && typeof employee.skills.entries === 'function'
    //         ? Object.fromEntries(employee.skills)
    //         : (employee.skills || {});
    //     employee.skills = { ...existing, ...req.body.skills };
    // }

    // Handle image and video file replacement
    if (req.files && req.files.image && req.files.image[0]) {
        // Remove old image file
        if (employee.image && employee.image.startsWith('images/')) {
            const oldImgPath = path.join(__dirname, '../public', employee.image);
            if (fs.existsSync(oldImgPath)) {
                try { fs.unlinkSync(oldImgPath); } catch (e) { /* ignore */ }
            }
        }
        employee.image = 'images/' + req.files.image[0].filename;
    }
    if (req.files && req.files.video && req.files.video[0]) {
        // Remove old video file
        if (employee.video && employee.video.startsWith('videos/')) {
            const oldVidPath = path.join(__dirname, '../videos', path.basename(employee.video));
            if (fs.existsSync(oldVidPath)) {
                try { fs.unlinkSync(oldVidPath); } catch (e) { /* ignore */ }
            }
        }
        employee.video = 'videos/' + req.files.video[0].filename;
    }

    const result = await employee.save();
    res.json(result);
}

const deleteEmployee = async (req, res) => {
    if (!req?.body?.id) return res.status(400).json({ 'message': 'Employee ID required.' });

    const employee = await Employee.findOne({ _id: req.body.id }).exec();
    if (!employee) {
        return res.status(204).json({ "message": `No employee matches ID ${req.body.id}.` });
    }

    // Delete image from Cloudinary if it is a Cloudinary URL
    if (employee.image && employee.image.includes('cloudinary.com')) {
        try {
            // Extract public_id from the image URL
            const urlParts = employee.image.split('/');
            const versionIndex = urlParts.findIndex(part => part.startsWith('v') && !isNaN(part.substring(1)));
            let publicId = null;
            if (versionIndex !== -1 && urlParts.length > versionIndex + 1) {
                publicId = urlParts.slice(versionIndex + 1).join('/').replace(/\.[a-zA-Z0-9]+$/, '');
            }
            if (publicId) {
                await cloudinary.uploader.destroy(publicId);
            }
        } catch (err) {
            console.error('Cloudinary image deletion error:', err);
        }
    }

    // Remove from Media collection if exists
    if (employee.image) {
        try {
            await Media.deleteOne({ url: employee.image });
        } catch (err) {
            console.error('Media DB deletion error:', err);
        }
    }

    const result = await employee.deleteOne(); //{ _id: req.body.id }
    res.json(result);
}

const getEmployee = async (req, res) => {
    if (!req?.params?.id) return res.status(400).json({ 'message': 'Employee ID required.' });

    const employee = await Employee.findOne({ _id: req.params.id }).lean();
    if (!employee) {
        return res.status(204).json({ "message": `No employee matches ID ${req.params.id}.` });
    }
    employee.image = makeImageUrl(employee.image, req);
    employee.video = makeMediaUrl(employee.video, req);
    res.json(employee);
}

// Search products by name (case-insensitive, partial match)
const searchProductsByName = async (req, res) => {
    const name = req.query.name;
    if (!name) return res.status(400).json({ message: 'Product name required.' });
    const products = await Employee.find({ name: { $regex: name, $options: 'i' } }).lean();
    if (!products || products.length === 0) return res.status(204).json({ message: 'No products found.' });
    const mapped = products.map(e => ({ ...e, image: makeImageUrl(e.image, req), video: makeMediaUrl(e.video, req) }));
    res.json(mapped);
};

// Toggle hidden status
const toggleProductHidden = async (req, res) => {
    const id = req.body?.id || req.params?.id;
    if (!id) return res.status(400).json({ message: 'Product ID required.' });
    const employee = await Employee.findById(id);
    if (!employee) return res.status(404).json({ message: 'Product not found.' });
    employee.hidden = !employee.hidden;
    await employee.save();
    res.json({ hidden: employee.hidden });
};

module.exports = {
    getAllEmployees,
    createNewEmployee,
    updateEmployee,
    deleteEmployee,
    getEmployee,
    searchProductsByName,
    toggleProductHidden
}