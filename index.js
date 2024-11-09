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
        let sortField = req.query.sortField || 'finishTime'
        let sortOrder = req.query.sortOrder === 'asc' ? 1 : -1

        // Get the current date and calculate the start of the current week (Sunday 12:00 AM)
        const now = new Date()
        const dayOfWeek = now.getDay(); // Sunday is day 0
        const startOfWeek = new Date(now.setDate(now.getDate() - dayOfWeek))
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
        startOfWeek.setHours(0, 0, 0, 0) // Set time to 12:00 AM

        const cardio = await Cardio.find({}).sort({ [sortField]: sortOrder })

        // Calculate minutes done this week
        const minutesDoneThisWeek = Math.floor(cardio
            .filter(session => session.finishTime >= startOfWeek.getTime())
            .reduce((total, session) => total + session.length, 0) / 60
        )

        // Calculate minutes done this month
        const minutesDoneThisMonth = Math.floor(cardio
            .filter(session => session.finishTime >= startOfMonth.getTime())
            .reduce((total, session) => total + session.length, 0) / 60
        )

        const typesOfCardio = Array.from(new Set(cardio.filter(c => c.youTubeUrl === undefined).map(c => c.description)))

        res.json({
            sessions: cardio,
            minutesDoneThisMonth,
            minutesDoneThisWeek,
            typesOfCardio
        })
    } catch (error) {
        console.error('Error retrieving cardio:', error);
        res.status(500).send('Error retrieving cardio');
    }
})

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
