require('dotenv').config(); // Load environment variables
const mongoose = require('mongoose');
const fs = require('fs'); // For reading the JSON file

const cardioSchema = new mongoose.Schema({
    id: String,
    youTubeUrl: String,
    thumbnailUrl: String,
    finishTime: Number,
    description: String,
    length: Number,
    isFavorite: Boolean
}, { collection: 'cardio' }); // Specify 'cardio' as the collection name

const Cardio = mongoose.model('Cardio', cardioSchema);

// Function to import data from JSON file to MongoDB
async function importData() {
    try {
        // Connect to MongoDB using the URI in .env
        await mongoose.connect(process.env.MONGODB_URI, { useNewUrlParser: true, useUnifiedTopology: true });
        console.log('Connected to MongoDB');

        // Read the JSON file
        const data = JSON.parse(fs.readFileSync('cardio.json', 'utf8'));

        // Clear existing data if necessary
        await Cardio.deleteMany({});

        // Insert the data into the database
        await Cardio.insertMany(data);
        console.log('Data successfully inserted');

        // Disconnect from the database
        await mongoose.disconnect();
        console.log('Disconnected from MongoDB');
    } catch (error) {
        console.error('Error importing data:', error);
        process.exit(1); // Exit with an error code
    }
}

// Run the import function
importData();
