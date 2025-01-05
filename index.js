require('dotenv').config()
const express = require('express')
const mongoose = require('mongoose')
const cors = require('cors')
const app = express()
const port = process.env.PORT || 3000
const { DateTime } = require('luxon')

const DEFAULT_TIME_ZONE = 'Asia/Manila' // Change this to 'America/Los_Angeles' for US

app.use(cors())
app.use(express.json())

mongoose
    .connect(process.env.MONGODB_URI, { serverSelectionTimeoutMS: 30000 })
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

        const now = DateTime.now().setZone(DEFAULT_TIME_ZONE);

        // Start of the current week (Sunday 12:00 AM UTC)
        const startOfWeek = now.startOf('week')
            .plus({ week: now.weekdayShort === 'Sun' ? 1 : 0 })
            .minus({ days: 1 })

        // Start of the current month (1st of the month 12:00 AM UTC)
        const startOfMonth = now.startOf('month')

        // Debugging logs
        console.log('Now (UTC):', now.toISO());
        console.log('Start of Week (UTC):', startOfWeek.toISO(), startOfWeek.toMillis());
        console.log('Start of Month (UTC):', startOfMonth.toISO());

        const cardio = await Cardio.find({}).sort({ [sortField]: sortOrder });

        // Calculate minutes done this week
        const filteredThisWeek = cardio.filter(session => session.finishTime >= startOfWeek.toMillis());
        const totalSecondsThisWeek = filteredThisWeek.reduce((total, session) => total + session.length, 0);
        const minutesDoneThisWeek = Math.floor(totalSecondsThisWeek / 60);

        console.log('Filtered Sessions This Week:', filteredThisWeek);
        console.log('Total Seconds This Week:', totalSecondsThisWeek);
        console.log('Minutes Done This Week:', minutesDoneThisWeek);

        // Calculate minutes done this month
        const filteredThisMonth = cardio.filter(session => session.finishTime >= startOfMonth.toMillis());
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
