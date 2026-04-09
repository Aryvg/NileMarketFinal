const mongoose = require('mongoose');
require('dotenv').config();

const connectDB = async () => {
    try {
        await mongoose.connect(process.env.DATABASE_URI);
        console.log('Connected to MongoDB');
    } catch (err) {
        console.error('Error connecting to MongoDB:', err);
        process.exit(1);
    }
};

const ensureIndexes = async () => {
    try {
        // Import models to ensure indexes are created
        require('./model/User');
        require('./model/Product');
        require('./model/Order');
        require('./model/Cart');
        require('./model/Media');

        console.log('Indexes ensured');
    } catch (err) {
        console.error('Error ensuring indexes:', err);
    } finally {
        await mongoose.connection.close();
        console.log('Connection closed');
    }
};

connectDB().then(ensureIndexes);