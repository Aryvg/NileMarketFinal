const express = require('express');
const router = express.Router();
const mediaController = require('../controllers/mediaController');
const multer = require('multer');
const upload = multer({ dest: 'uploads/' });

router.get('/', mediaController.listMedia);
router.get('/file/:name', mediaController.getFile);
router.post('/upload', upload.single('file'), mediaController.uploadToCloudinary);

module.exports = router;
