const express = require('express');
const cors = require('cors');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');

const app = express();
const PORT = 3000;

// ============================================================
//  MIDDLEWARE
// ============================================================
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));
app.use(express.static('public'));
app.use('/uploads', express.static('uploads'));

// ============================================================
//  DATABASE SETUP
// ============================================================
const DATA_DIR = path.join(__dirname, 'data');
const UPLOAD_DIR = path.join(__dirname, 'uploads');
const MOVIES_FILE = path.join(DATA_DIR, 'movies.json');

// Create directories if they don't exist
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR);
if (!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR);

// Initialize movies file
if (!fs.existsSync(MOVIES_FILE)) {
    const sampleMovies = [{
        id: '1',
        title: 'Pushpa 2 - The Rule',
        category: 'south',
        quality: '720p, Hindi Dubbed',
        year: '2026',
        description: 'Pushpa Raj is back with a vengeance! The highly anticipated sequel to the blockbuster Pushpa: The Rise.',
        poster: '',
        views: 2847,
        links: {
            '480p': 'https://example.com/pushpa2-480p',
            '720p': 'https://example.com/pushpa2-720p',
            '1080p': 'https://example.com/pushpa2-1080p'
        },
        comments: [
            { user: 'Rahul', text: 'Can\'t wait to watch this! 🔥', time: Date.now() },
            { user: 'Priya', text: 'Allu Arjun is the best! 💥', time: Date.now() }
        ],
        viewedSessions: []
    }, {
        id: '2',
        title: 'Pathaan 2',
        category: 'bollywood',
        quality: '1080p, Hindi',
        year: '2026',
        description: 'The king of Bollywood is back! Shah Rukh Khan returns as the ultimate spy in this high-octane action thriller.',
        poster: '',
        views: 1953,
        links: {
            '480p': 'https://example.com/pathaan2-480p',
            '720p': 'https://example.com/pathaan2-720p',
            '1080p': 'https://example.com/pathaan2-1080p'
        },
        comments: [
            { user: 'Amit', text: 'SRK is the King! 👑', time: Date.now() }
        ],
        viewedSessions: []
    }, {
        id: '3',
        title: 'Avatar 3',
        category: 'hollywood',
        quality: '4K, Hindi Dubbed',
        year: '2026',
        description: 'James Cameron returns to the world of Pandora with Avatar 3. Experience the breathtaking visuals.',
        poster: '',
        views: 1421,
        links: {
            '480p': 'https://example.com/avatar3-480p',
            '720p': 'https://example.com/avatar3-720p',
            '1080p': 'https://example.com/avatar3-1080p'
        },
        comments: [
            { user: 'Vikram', text: 'Visuals are going to be insane! 🌊', time: Date.now() }
        ],
        viewedSessions: []
    }, {
        id: '4',
        title: 'The Last of Us - Season 2',
        category: 'web',
        quality: 'WEB-DL, 1080p',
        year: '2026',
        description: 'The critically acclaimed series returns! Joel and Ellie continue their journey through a post-apocalyptic world.',
        poster: '',
        views: 876,
        links: {
            '480p': 'https://example.com/lastofus-s2-480p',
            '720p': 'https://example.com/lastofus-s2-720p',
            '1080p': 'https://example.com/lastofus-s2-1080p'
        },
        comments: [
            { user: 'Neha', text: 'Finally! Been waiting for this! 🧟', time: Date.now() }
        ],
        viewedSessions: []
    }];
    fs.writeFileSync(MOVIES_FILE, JSON.stringify(sampleMovies, null, 2));
}

// ============================================================
//  FILE UPLOAD CONFIGURATION
// ============================================================
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, UPLOAD_DIR);
    },
    filename: (req, file, cb) => {
        const ext = path.extname(file.originalname);
        const name = uuidv4() + ext;
        cb(null, name);
    }
});

const upload = multer({
    storage: storage,
    limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
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
        if (!movie) {
            return res.status(404).json({ error: 'Movie not found' });
        }
        res.json(movie);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch movie' });
    }
});

// Add/Update movie with poster upload
app.post('/api/movies', upload.single('poster'), (req, res) => {
    try {
        const movies = JSON.parse(fs.readFileSync(MOVIES_FILE));
        const { id, title, category, quality, year, description, links, posterData } = req.body;

        // Parse links if string
        let parsedLinks = links;
        if (typeof links === 'string') {
            try {
                parsedLinks = JSON.parse(links);
            } catch {
                parsedLinks = { '480p': '', '720p': '', '1080p': '' };
            }
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

        // Handle poster upload
        if (req.file) {
            movieData.poster = '/uploads/' + req.file.filename;
        } else if (posterData && posterData.startsWith('data:image')) {
            // If base64 image is sent (for no file upload)
            movieData.poster = posterData;
        } else if (posterData) {
            movieData.poster = posterData;
        } else {
            movieData.poster = '';
        }

        if (id && id !== '') {
            // UPDATE - preserve views and comments
            const index = movies.findIndex(m => m.id === id);
            if (index !== -1) {
                movieData.views = movies[index].views || 0;
                movieData.comments = movies[index].comments || [];
                movieData.viewedSessions = movies[index].viewedSessions || [];
                // Preserve poster if no new one uploaded
                if (!req.file && !posterData) {
                    movieData.poster = movies[index].poster;
                }
                movieData.id = id;
                movies[index] = movieData;
            } else {
                return res.status(404).json({ error: 'Movie not found' });
            }
        } else {
            // ADD NEW
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
        if (!movie) {
            return res.status(404).json({ error: 'Movie not found' });
        }

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
        if (!movie) {
            return res.status(404).json({ error: 'Movie not found' });
        }

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

// ============================================================
//  SERVE FRONTEND
// ============================================================
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// ============================================================
//  START SERVER
// ============================================================
app.listen(PORT, () => {
    console.log(`
    ╔══════════════════════════════════════════════════════════╗
    ║                                                          ║
    ║   🎬 FilmyHub Server Started!                           ║
    ║                                                          ║
    ║   🌐 http://localhost:${PORT}                             ║
    ║                                                          ║
    ║   🔑 Admin Access: http://localhost:${PORT}#x7K9mP2qL4nR8 ║
    ║                                                          ║
    ║   📊 API Endpoints:                                     ║
    ║   GET  /api/movies      - All movies                   ║
    ║   GET  /api/movies/:id  - Single movie                 ║
    ║   POST /api/movies      - Add/Update movie             ║
    ║   DELETE /api/movies/:id - Delete movie                ║
    ║   POST /api/movies/:id/view - Track view              ║
    ║   POST /api/movies/:id/comment - Add comment          ║
    ║   GET  /api/stats       - Get stats                   ║
    ║                                                          ║
    ╚══════════════════════════════════════════════════════════╝
    `);
});