require('dotenv').config()
const express = require('express')
const mongoose = require('mongoose')
const cors = require('cors')
const app = express()
const port = process.env.PORT || 3000

app.use(cors())
app.use(express.json())

mongoose.connect(process.env.MONGODB_URI, { useNewUrlParser: true, useUnifiedTopology: true })
    .then(() => console.log('MongoDB connected'))
    .catch(err => console.log('MongoDB connection error:', err));

const cardioSchema = new mongoose.Schema({
    id: String,
    youTubeUrl: String,
    thumbnailUrl: String,
    finishTime: Number,
    description: String,
    length: Number,
    isFavorite: Boolean
}, { collection: 'cardio' })

const Cardio = mongoose.model('Cardio', cardioSchema)

app.get('/cardio', async (req, res) => {
    try {
        let sortField = req.query.sortField || 'finishTime';
        let sortOrder = req.query.sortOrder === 'asc' ? 1 : -1;

        // Calculate the start of the current week (Sunday 12:00 AM UTC) and month (UTC)
        const now = new Date();
        const dayOfWeek = now.getUTCDay(); // Sunday is day 0
        const startOfWeek = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() - dayOfWeek));
        const startOfMonth = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));

        // Debugging logs
        console.log('Now (UTC):', now.toISOString());
        console.log('Start of Week (UTC):', startOfWeek.toISOString());
        console.log('Start of Month (UTC):', startOfMonth.toISOString());

        const cardio = await Cardio.find({}).sort({ [sortField]: sortOrder });

        console.log('All Sessions:', cardio);

        // Calculate minutes done this week
        const filteredThisWeek = cardio.filter(session => session.finishTime >= startOfWeek.getTime());
        const totalSecondsThisWeek = filteredThisWeek.reduce((total, session) => total + session.length, 0);
        const minutesDoneThisWeek = Math.floor(totalSecondsThisWeek / 60);

        console.log('Filtered Sessions This Week:', filteredThisWeek);
        console.log('Total Seconds This Week:', totalSecondsThisWeek);
        console.log('Minutes Done This Week:', minutesDoneThisWeek);

        // Calculate minutes done this month
        const filteredThisMonth = cardio.filter(session => session.finishTime >= startOfMonth.getTime());
        const totalSecondsThisMonth = filteredThisMonth.reduce((total, session) => total + session.length, 0);
        const minutesDoneThisMonth = Math.floor(totalSecondsThisMonth / 60);

        console.log('Filtered Sessions This Month:', filteredThisMonth);
        console.log('Total Seconds This Month:', totalSecondsThisMonth);
        console.log('Minutes Done This Month:', minutesDoneThisMonth);

        const typesOfCardio = Array.from(new Set(cardio.filter(c => c.youTubeUrl === undefined).map(c => c.description)));

        res.json({
            sessions: cardio,
            minutesDoneThisMonth,
            minutesDoneThisWeek,
            typesOfCardio
        });
    } catch (error) {
        console.error('Error retrieving cardio:', error);
        res.status(500).send('Error retrieving cardio');
    }
});

app.post('/cardio', async (req, res) => {
    try {
        const newSession = new Cardio(req.body)
        await newSession.save()
        res.status(201).send(newSession)
    } catch (error) {
        console.error('Error adding session:', error);
        res.status(500).send('Error adding session')
    }
})

app.put('/cardio/:id/toggleFavorite', async (req, res) => {
    try {
        const session = await Cardio.findById(req.params.id)
        if (!session) {
            return res.status(404).send('Session not found')
        }
        session.isFavorite = !session.isFavorite
        await session.save()
        res.send(session)
    } catch (error) {
        console.error('Error toggling favorite status:', error);
        res.status(500).send('Error toggling favorite status')
    }
})

app.listen(port, () => {
    console.log(`Server running on port ${port}`);
})
