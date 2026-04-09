const express= require('express');
//console.log('orders.js loaded, express version', express && express.version);
const router= express.Router();
//console.log('router created in orders.js', router);
const ordersController= require('../../controllers/ordersController');
const ROLES_LIST= require('../../config/roles-list');
const verifyRoles= require('../../middleware/verifyRoles');
const verifyJWT= require('../../middleware/verifyJWT');
router.route('/')
     .get(verifyJWT, ordersController.getAllOrders)
     .post(verifyJWT, ordersController.createOrder)
     .put(verifyJWT, ordersController.updateOrder)
     .delete(verifyJWT, ordersController.deleteOrder);
router.route('/:id')
     .get(ordersController.getOrder)
     .put(ordersController.updateOrder);

// nothing logged here; the router object can be verbose
module.exports = router;