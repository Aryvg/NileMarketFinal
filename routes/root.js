const express= require('express');
const router= express.Router();
const path= require('path');
router.get('/', (req, res)=>{
    res.sendFile(path.join(__dirname, '..', 'views', 'index.html'));
});
router.get('/index', (req, res)=>{
    res.sendFile(path.join(__dirname, '..',  'views', 'index.html'));
});
router.get('/index', (req, res)=>{
    res.sendFile(path.join(__dirname, '..',  'views', 'index.html'));
});
router.get('/new-page.html', (req, res)=>{
    res.sendFile(path.join(__dirname,'..',  'views', 'new-page.html'));
});
router.get('/new-page', (req, res)=>{
    res.sendFile(path.join(__dirname, '..',  'views', 'new-page.html'));
});
router.get('/old-page.html', (req, res)=>[
   router.redirect(301, '/new-page.html')
]);
router.get('/old-page', (req, res)=>[
   router.redirect(301, '/new-page.html')
]);
module.exports= router;