require('dotenv').config();
const express= require('express');
const app= express();
const fs= require('fs');
const fsPromises= require('fs').promises;
const path= require('path');
const cors= require('cors');
const PORT= process.env.PORT || 3500;
const {logger}= require('./middleware/logEvents');
const errorHandler=require('./middleware/errorHandler');
const verifyJWT= require('./middleware/verifyJWT');
const cookieParser= require('cookie-parser');
const corsOptions=require('./config/corsOptions');
const credentials=require('./middleware/credentials');
const mongoose= require('mongoose');
const compression = require('compression');
const connectDB= require('./config/dbConn');
connectDB();


app.use(express.static(path.join(__dirname, '/public')));

app.use(compression());

app.use(logger);
app.use(credentials); // credentials must be used before CORS
app.use(cors(corsOptions));
app.use(express.json());
app.use(cookieParser());

app.use('/subdir', require('./routes/subdir'));
app.use('/', require('./routes/root'));
//app.use(express.json());
//app.use(cookieParser());
app.use('/register', require('./routes/register'));
app.use('/auth', require('./routes/auth'));
app.use('/refresh', require('./routes/refresh'));
app.use('/logout', require('./routes/logout'));
// public user helpers (username availability)
app.use('/users', require('./routes/users'));
// public media route (serve images/videos from DB or disk)
app.use('/media', require('./routes/media'));
app.use(verifyJWT);
app.use('/products', require('./routes/api/products'));
app.use('/cart', require('./routes/api/cart'));
app.use('/orders', require('./routes/api/orders'));
//app.use(logger);

//const allowedOrigns=['https://www.google.com', 'http://127.0.0.1:5500', 'https://nilemarket-igqk.onrender.com'];
/*const corsOptions={
    origin:(origin, callback)=>{
        if (!origin || allowedOrigns.indexOf(origin)!==-1){
            callback(null, true);
        }else{
            callback(new Error('Not allowed by CORS'));
        }
    },
    optionsSuccessStatus:200
}*/
//app.use(credentials);//credentials must be used above cors
//app.use(cors(corsOptions));
app.use((req, res)=>{
    res.status(404);
    if (req.accepts('html')){
        res.sendFile(path.join(__dirname, 'views', '404.html'));
    }else if (req.accepts('json')){
        res.json({error: '404 Not Found'})
    }else{
        res.type('text').send('404 not found');
    }
})
app.use(errorHandler)
mongoose.connection.once('open', ()=>{
    console.log('Connected to MongoDB');
    app.listen(PORT, ()=>console.log(`Server is running on ${PORT}`));
});

