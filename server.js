const express = require('express');
const cors = require('cors');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));
app.use(express.static('public'));
app.use('/uploads', express.static('uploads'));

// Database setup
const DATA_DIR = path.join(__dirname, 'data');
const UPLOAD_DIR = path.join(__dirname, 'uploads');
const MOVIES_FILE = path.join(DATA_DIR, 'movies.json');

if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR);
if (!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR);

if (!fs.existsSync(MOVIES_FILE)) {
    const sampleMovies = [{
        id: '1',
        title: 'Alpha',
        category: 'bollywood',
        quality: '1080p, Hindi',
        year: '2026',
        description: 'Alpha (2026) is a female-led action thriller and part of the Yash Raj Films Spy Universe. The story follows Sita (Alia Bhatt), a highly trained assassin raised in isolation, who discovers the dark truth about her past.',
        poster: '',
        views: 0,
        links: {
            '480p': 'https://example.com/alpha-480p',
            '720p': 'https://example.com/alpha-720p',
            '1080p': 'https://example.com/alpha-1080p'
        },
        comments: [],
        viewedSessions: []
    }];
    fs.writeFileSync(MOVIES_FILE, JSON.stringify(sampleMovies, null, 2));
}

// File upload config
const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, UPLOAD_DIR),
    filename: (req, file, cb) => {
        const ext = path.extname(file.originalname);
        cb(null, uuidv4() + ext);
    }
});

const upload = multer({
    storage: storage,
    limits: { fileSize: 5 * 1024 * 1024 },
    fileFilter: (req, file, cb) => {
        const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
        if (allowedTypes.includes(file.mimetype)) {
            cb(null, true);
        } else {
            cb(new Error('Only images are allowed'));
        }
    }
});

// ============================================================
//  API ENDPOINTS
// ============================================================

// Get all movies
app.get('/api/movies', (req, res) => {
    try {
        const movies = JSON.parse(fs.readFileSync(MOVIES_FILE));
        res.json(movies);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch movies' });
    }
});

// Get single movie
app.get('/api/movies/:id', (req, res) => {
    try {
        const movies = JSON.parse(fs.readFileSync(MOVIES_FILE));
        const movie = movies.find(m => m.id === req.params.id);
        if (!movie) return res.status(404).json({ error: 'Movie not found' });
        res.json(movie);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch movie' });
    }
});

// Add/Update movie
app.post('/api/movies', upload.single('poster'), (req, res) => {
    try {
        const movies = JSON.parse(fs.readFileSync(MOVIES_FILE));
        const { id, title, category, quality, year, description, links, posterData } = req.body;

        let parsedLinks = links;
        if (typeof links === 'string') {
            try { parsedLinks = JSON.parse(links); } catch { parsedLinks = { '480p': '', '720p': '', '1080p': '' }; }
        }

        const movieData = {
            title: title,
            category: category,
            quality: quality || '',
            year: year || '',
            description: description || '',
            links: parsedLinks || { '480p': '', '720p': '', '1080p': '' },
            views: 0,
            comments: [],
            viewedSessions: []
        };

        if (req.file) {
            movieData.poster = '/uploads/' + req.file.filename;
        } else if (posterData && posterData.startsWith('data:image')) {
            movieData.poster = posterData;
        } else if (posterData) {
            movieData.poster = posterData;
        } else {
            movieData.poster = '';
        }

        if (id && id !== '') {
            const index = movies.findIndex(m => m.id === id);
            if (index !== -1) {
                movieData.views = movies[index].views || 0;
                movieData.comments = movies[index].comments || [];
                movieData.viewedSessions = movies[index].viewedSessions || [];
                if (!req.file && !posterData) {
                    movieData.poster = movies[index].poster;
                }
                movieData.id = id;
                movies[index] = movieData;
            } else {
                return res.status(404).json({ error: 'Movie not found' });
            }
        } else {
            movieData.id = uuidv4();
            movies.push(movieData);
        }

        fs.writeFileSync(MOVIES_FILE, JSON.stringify(movies, null, 2));
        res.json({ success: true, movie: movieData });
    } catch (error) {
        console.error('Error saving movie:', error);
        res.status(500).json({ error: 'Failed to save movie' });
    }
});

// Delete movie
app.delete('/api/movies/:id', (req, res) => {
    try {
        const movies = JSON.parse(fs.readFileSync(MOVIES_FILE));
        const filtered = movies.filter(m => m.id !== req.params.id);
        if (filtered.length === movies.length) {
            return res.status(404).json({ error: 'Movie not found' });
        }
        fs.writeFileSync(MOVIES_FILE, JSON.stringify(filtered, null, 2));
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: 'Failed to delete movie' });
    }
});

// Track view
app.post('/api/movies/:id/view', (req, res) => {
    try {
        const movies = JSON.parse(fs.readFileSync(MOVIES_FILE));
        const movie = movies.find(m => m.id === req.params.id);
        if (!movie) return res.status(404).json({ error: 'Movie not found' });

        const { sessionId } = req.body;
        if (!movie.viewedSessions) movie.viewedSessions = [];

        if (!movie.viewedSessions.includes(sessionId)) {
            movie.viewedSessions.push(sessionId);
            movie.views = (movie.views || 0) + 1;
            fs.writeFileSync(MOVIES_FILE, JSON.stringify(movies, null, 2));
        }

        res.json({ success: true, views: movie.views });
    } catch (error) {
        res.status(500).json({ error: 'Failed to track view' });
    }
});

// Add comment
app.post('/api/movies/:id/comment', (req, res) => {
    try {
        const movies = JSON.parse(fs.readFileSync(MOVIES_FILE));
        const movie = movies.find(m => m.id === req.params.id);
        if (!movie) return res.status(404).json({ error: 'Movie not found' });

        const { user, text } = req.body;
        if (!text || text.trim() === '') {
            return res.status(400).json({ error: 'Comment cannot be empty' });
        }

        if (!movie.comments) movie.comments = [];
        movie.comments.push({
            user: user || 'User',
            text: text.trim(),
            time: Date.now()
        });

        fs.writeFileSync(MOVIES_FILE, JSON.stringify(movies, null, 2));
        res.json({ success: true, comments: movie.comments });
    } catch (error) {
        res.status(500).json({ error: 'Failed to add comment' });
    }
});

// Get stats
app.get('/api/stats', (req, res) => {
    try {
        const movies = JSON.parse(fs.readFileSync(MOVIES_FILE));
        let totalViews = 0;
        let totalComments = 0;
        const sessions = new Set();

        movies.forEach(m => {
            totalViews += (m.views || 0);
            totalComments += (m.comments || []).length;
            if (m.viewedSessions) {
                m.viewedSessions.forEach(s => sessions.add(s));
            }
        });

        res.json({
            totalMovies: movies.length,
            totalViews: totalViews,
            totalComments: totalComments,
            activeUsers: sessions.size
        });
    } catch (error) {
        res.status(500).json({ error: 'Failed to get stats' });
    }
});

// Serve frontend
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
    console.log(`🎬 FilmyHub Server running on port ${PORT}`);
});
