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

const meditationSchema = new mongoose.Schema({
    id: String,
    youTubeUrl: String,
    thumbnailUrl: String,
    finishTime: Number,
    description: String,
    length: Number,
    isFavorite: Boolean
})

const Meditation = mongoose.model('Meditation', meditationSchema)

app.get('/meditations', async (req, res) => {
    try {
        let sortField = req.query.sortField || 'finishTime'
        let sortOrder = req.query.sortOrder === 'asc' ? 1 : -1

        const meditations = await Meditation.find({}).sort({ [sortField]: sortOrder })
        res.json(meditations)
    } catch (error) {
        console.error('Error retrieving meditations:', error);
        res.status(500).send('Error retrieving meditations');
    }
})

app.post('/meditations', async (req, res) => {
    try {
        const newSession = new Meditation(req.body)
        await newSession.save()
        res.status(201).send(newSession)
    } catch (error) {
        console.error('Error adding session:', error);
        res.status(500).send('Error adding session')
    }
})

app.put('/meditations/:id/toggleFavorite', async (req, res) => {
    try {
        const session = await Meditation.findById(req.params.id)
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
