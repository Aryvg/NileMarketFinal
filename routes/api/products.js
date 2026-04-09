const express= require('express');
const router= express.Router();
const productsController= require('../../controllers/productController');
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
     .get(productsController.getAllEmployees)
     .post(upload.fields([{ name: 'image', maxCount: 1 }, { name: 'video', maxCount: 1 }]), productsController.createNewEmployee)
     .put(upload.fields([{ name: 'image', maxCount: 1 }, { name: 'video', maxCount: 1 }]), productsController.updateEmployee)
     .delete(productsController.deleteEmployee);

// Toggle product hidden status
router.patch('/toggle-hidden/:id', verifyRoles(ROLES_LIST.Admin, ROLES_LIST.Editor), productsController.toggleProductHidden);

/**
 const express= require('express');
const router= express.Router();
const employeesController= require('../../controllers/employeesController');
const ROLES_LIST= require('../../config/roles-list');
const verifyRoles= require('../../middleware/verifyRoles');
//const verifyJWT= require('../../middleware/verifyJWT');
router.route('/')
     .get(employeesController.getAllEmployees)
     .post(verifyRoles(ROLES_LIST.Admin, ROLES_LIST.Editor),employeesController.createNewEmployee)
     .put(verifyRoles(ROLES_LIST.Admin, ROLES_LIST.Editor),employeesController.updateEmployee)
     .delete(verifyRoles(ROLES_LIST.Admin, ROLES_LIST.Editor),employeesController.deleteEmployee)
router.route('/:id')
     .get(employeesController.getEmployee)
module.exports=router;
 */
router.get('/search', productsController.searchProductsByName);
router.route('/:id')
     .get(productsController.getEmployee)
     .put(upload.fields([{ name: 'image', maxCount: 1 }, { name: 'video', maxCount: 1 }]), productsController.updateEmployee)
module.exports=router;