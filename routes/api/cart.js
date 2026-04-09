const express= require('express');
const router= express.Router();
const cartController= require('../../controllers/cartController');
const multer = require('multer');
const path = require('path');

// Set up multer storage for images and videos
const storage = multer.diskStorage({
     destination: function (req, file, cb) {
          if (file.fieldname === 'image') {
               cb(null, path.join(__dirname, '../../public/images'));
          } else if (file.fieldname === 'video') {
               cb(null, path.join(__dirname, '../../videos'));
          } else {
               cb(null, path.join(__dirname, '../../public'));
          }
     },
     filename: function (req, file, cb) {
          cb(null, Date.now() + '-' + file.originalname);
     }
});

const upload = multer({ storage: storage });
const ROLES_LIST= require('../../config/roles-list');
const verifyRoles= require('../../middleware/verifyRoles');
//const verifyJWT= require('../../middleware/verifyJWT');
router.route('/')
     .get(cartController.getAllEmployees)
     .post(upload.fields([{ name: 'image', maxCount: 1 }, { name: 'video', maxCount: 1 }]), cartController.createNewEmployee)
     .put(upload.fields([{ name: 'image', maxCount: 1 }, { name: 'video', maxCount: 1 }]), cartController.updateEmployee)
     .delete(cartController.deleteEmployee);
router.route('/:id')
     .get(cartController.getEmployee)
     .put(upload.fields([{ name: 'image', maxCount: 1 }, { name: 'video', maxCount: 1 }]), cartController.updateEmployee)
module.exports=router;