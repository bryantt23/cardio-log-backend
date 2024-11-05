const fs = require('fs')
const path = require('path')
const axios = require('axios')
const iso8601Duration = require('iso8601-duration')
const filePath = path.join(__dirname, 'meditations.txt')
const basicCache = {}

const generateRandomId = () => {
    return Math.random().toString(36).substr(2, 9); // Generates a random alphanumeric string
};

// Function to convert ISO 8601 duration into seconds
function convertDurationToSeconds(isoDuration) {
    const parsedDuration = iso8601Duration.parse(isoDuration);

    // Convert to seconds
    const hoursInSeconds = (parsedDuration.hours || 0) * 60 * 60;
    const minutesInSeconds = (parsedDuration.minutes || 0) * 60;
    const seconds = parsedDuration.seconds || 0;

    return hoursInSeconds + minutesInSeconds + seconds;
}

async function getYouTubeInfo(url) {
    const videoId = extractVideoIdFromUrl(url)
    try {
        const youTubeUrl = `https://www.googleapis.com/youtube/v3/videos?id=${videoId}&key=AIzaSyBRrQmXEXUOOYkXW_sa7Gd5dGJJkEbiT_Q&part=snippet,contentDetails`
        if (basicCache[youTubeUrl]) {
            return basicCache[youTubeUrl]
        }
        const response = await axios.get(youTubeUrl)
        if (response.data.items && response.data.items.length > 0) {
            const videoInfo = response.data.items[0]
            const description = videoInfo.snippet.title;
            const isoDuration = videoInfo.contentDetails.duration;
            const length = convertDurationToSeconds(isoDuration)
            basicCache[youTubeUrl] = { description, length }
            return { description, length }
        }
    } catch (error) {
        console.error("Error fetching YouTube info:", error);
        return { description: 'Unknown', length: 'Unknown' }; // Fallback in case of error
    }
}

// Function to extract video ID from a YouTube URL
function extractVideoIdFromUrl(url) {
    const regex = /[?&]v=([^&]+)/;
    const matches = url.match(regex);
    return matches ? matches[1] : null;
}

fs.readFile(filePath, 'utf8', async (error, data) => {
    if (error) {
        console.error('Error reading the file:', error);
    }
    else {
        const lines = data.split(/\r?\n/)
        const res = []

        let finishTime = ''
        for (const line of lines) {
            if (line === '') {
                continue
            }
            if (line.startsWith("On")) {
                const dateString = (line.substring(3).split("Bryant T")[0]).trim().replace(/\u202F/g, ' ');

                // Clean the date string
                const cleanDateString = dateString
                    .replace(" at ", " ")               // Remove "at"
                    .replace(/[^\x00-\x7F]/g, "")      // Remove non-ASCII characters
                    .replace(/(\d+)(AM|PM)/i, "$1 $2"); // Ensure space between time and AM/PM

                const dateTime = new Date(cleanDateString).getTime()
                finishTime = dateTime
            }
            else {
                const isYouTubeUrl = line.includes("youtu")
                let result = { id: generateRandomId() }
                if (isYouTubeUrl) {
                    const youtubeInfo = await getYouTubeInfo(line)
                    result = { ...result, youTubeUrl: line, finishTime, ...youtubeInfo }
                }
                else {
                    const [lengthString, description = 'unknown'] = line.split(", ")
                    const length = Number(lengthString.split(" ")[0]) * 60
                    result = { ...result, length, description, finishTime }
                }
                res.push(result)
            }
        }
        console.log("🚀 ~ fs.readFile ~ res:", JSON.stringify(res, null, 4), Object.keys(res).length, Object.values(res).length)
    }
})
