const Employee = require('../model/Cart');
const dayjs = require('dayjs');
const fs = require('fs');
const path = require('path');

const makeImageUrl = (imgPath, req) => {
    if (!imgPath) return '';
    if (typeof imgPath !== 'string') return '';
    const trimmed = imgPath.trim();
    if (!trimmed) return '';
    if (/^https?:\/\//i.test(trimmed) || /^\/\//.test(trimmed)) return trimmed;
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
    // Only return cart items for the logged-in user
    const userId = req.user;
    if (!userId) return res.status(401).json({ message: 'Unauthorized' });
    const employees = await Employee.find({ createdBy: userId }).lean();
    if (!employees || employees.length === 0) return res.status(204).json({ 'message': 'No employees found.' });
    // convert image and video paths to URLS (images from /public, videos via /media/file)
    const mapped = employees.map(e => ({ ...e, image: makeImageUrl(e.image, req), video: makeMediaUrl(e.video, req) }));
    res.json(mapped);
}

const createNewEmployee = async (req, res) => {
    // For multipart/form-data, fields are in req.body, files in req.files
    // require name, priceCents and quantity; image is optional (server can
    // assign default or leave blank). Accept zero price by checking == null.
    const { name, priceCents, quantity } = req.body;
    if (!name || priceCents == null || quantity == null) {
        return res.status(400).json({ message: 'name, priceCents and quantity are required' });
    }

    try {
        // Set delivery dates automatically (one/three/seven days out)
        const oneDay = {
            date: dayjs().add(1, 'day').format('MMMM D, YYYY'),
            priceCents: req.body.oneDay && typeof req.body.oneDay === 'string' ? (JSON.parse(req.body.oneDay).priceCents || 0) : (req.body.oneDay?.priceCents || 0)
        };
        const threeDay = {
            date: dayjs().add(3, 'day').format('MMMM D, YYYY'),
            priceCents: req.body.threeDay && typeof req.body.threeDay === 'string' ? (JSON.parse(req.body.threeDay).priceCents || 0) : (req.body.threeDay?.priceCents || 0)
        };
        const sevenDay = {
            date: dayjs().add(7, 'day').format('MMMM D, YYYY'),
            priceCents: req.body.sevenDay && typeof req.body.sevenDay === 'string' ? (JSON.parse(req.body.sevenDay).priceCents || 0) : (req.body.sevenDay?.priceCents || 0)
        };

        // Use the seven-day delivery date as the default 'date' field so front-end
        // can display the expected arrival without needing special logic.
        const defaultDate = sevenDay.date;

        let imagePath = req.body.image;
        let videoPath = req.body.video;
        if (req.files && req.files.image && req.files.image[0]) {
            // Save relative path for static serving
            imagePath = 'images/' + req.files.image[0].filename;
        }
        if (req.files && req.files.video && req.files.video[0]) {
            videoPath = 'videos/' + req.files.video[0].filename;
        }

        // Use an atomic upsert to avoid creating duplicate documents if the
        // same request is processed more than once (race/duplicate POSTs).
        // Match by product name and the creator id (may be null for guest).
        const query = { name: req.body.name, createdBy: req.user || null };
        const update = {
            $set: {
                date: defaultDate,
                priceCents: req.body.priceCents,
                image: imagePath,
                oneDay,
                threeDay,
                sevenDay,
                createdBy: req.user || null
            },
            $inc: {
                quantity: parseInt(req.body.quantity, 10)
            }
        };

        // findOneAndUpdate with upsert will create the document if it doesn't exist,
        // or atomically increment quantity if it does — preventing duplicates.
        const result = await Employee.findOneAndUpdate(query, update, {
            new: true,
            upsert: true,
            setDefaultsOnInsert: true
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
    // if (req.body?.firstname) employee.firstname = req.body.firstname;
    // if (req.body?.lastname) employee.lastname = req.body.lastname;
    // if (req.body?.job) employee.job = req.body.job;

    // Update date if provided
    if (req.body?.date) {
        employee.date = req.body.date;
    }
    // Update quantity if provided
    if (req.body?.quantity !== undefined) {
        employee.quantity = req.body.quantity;
    }
    // Handle rating (parse if JSON string)
    if (req.body?.oneDay) {
        let oneDay = req.body.oneDay;
        if (typeof oneDay === 'string') {
            try { oneDay = JSON.parse(oneDay); } catch (e) {}
        }
        if (Array.isArray(oneDay)) {
            employee.oneDay = oneDay;
        }
    }
    if (req.body?.threeDay) {
        let threeDay = req.body.threeDay;
        if (typeof threeDay === 'string') {
            try { threeDay = JSON.parse(threeDay); } catch (e) {}
        }
        if (Array.isArray(threeDay)) {
            employee.threeDay = threeDay;
        }
    }
    if (req.body?.sevenDay) {
        let sevenDay = req.body.sevenDay;
        if (typeof sevenDay === 'string') {
            try { sevenDay = JSON.parse(sevenDay); } catch (e) {}
        }
        if (Array.isArray(sevenDay)) {
            employee.sevenDay = sevenDay;
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

    // Do not delete image or video files when deleting cart entry

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

module.exports = {
    getAllEmployees,
    createNewEmployee,
    updateEmployee,
    deleteEmployee,
    getEmployee
}
