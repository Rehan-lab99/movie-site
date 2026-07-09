// ============================================================
//  CONFIGURATION
// ============================================================
const ADMIN_PASSWORD = 'Xy9#mP2$qL4@nR8vW3z';
const SECRET_KEY = 'x7K9mP2qL4nR8vW3zT6yH5jF2aB8cD1e';
const API_URL = '/api';

// ============================================================
//  STATE
// ============================================================
let isAdminUnlocked = false;
let currentCategory = 'all';
let searchQuery = '';
let currentDetailId = null;
let moviesData = [];
let sessionId = localStorage.getItem('viewer_session_id');
if (!sessionId) {
    sessionId = 'user_' + Date.now() + '_' + Math.random().toString(36).substring(2, 8);
    localStorage.setItem('viewer_session_id', sessionId);
}

// ============================================================
//  DOM REFS
// ============================================================
const grid = document.getElementById('movieGrid');
const searchInput = document.getElementById('searchInput');
const searchBtn = document.getElementById('searchBtn');
const catTabs = document.querySelectorAll('.cat-tab');
const adminPanel = document.getElementById('secretAdminPanel');
const closeAdminPanelBtn = document.getElementById('closeAdminPanelBtn');
const resultCount = document.getElementById('resultCount');
const totalCount = document.getElementById('totalCount');

const contentForm = document.getElementById('contentForm');
const editId = document.getElementById('editId');
const titleInput = document.getElementById('title');
const categorySelect = document.getElementById('category');
const qualityInput = document.getElementById('quality');
const yearInput = document.getElementById('year');
const descInput = document.getElementById('description');
const link480 = document.getElementById('link480');
const link720 = document.getElementById('link720');
const link1080 = document.getElementById('link1080');
const posterInput = document.getElementById('posterInput');
const posterPreview = document.getElementById('posterPreview');
const previewImg = document.getElementById('previewImg');
const posterData = document.getElementById('posterData');
const saveBtn = document.getElementById('saveBtn');
const resetBtn = document.getElementById('resetBtn');
const clearAllBtn = document.getElementById('clearAllBtn');

const detailOverlay = document.getElementById('detailOverlay');
const detailTitle = document.getElementById('detailTitle');
const detailQuality = document.getElementById('detailQuality');
const detailYear = document.getElementById('detailYear');
const detailCategory = document.getElementById('detailCategory');
const detailDesc = document.getElementById('detailDesc');
const detailViews = document.getElementById('detailViews');
const detailCommentCount = document.getElementById('detailCommentCount');
const detailCommentCount2 = document.getElementById('detailCommentCount2');
const detailPosterImg = document.getElementById('detailPosterImg');
const detailNoImage = document.getElementById('detailNoImage');
const downloadLinksContainer = document.getElementById('downloadLinksContainer');
const commentList = document.getElementById('commentList');
const commentInput = document.getElementById('commentInput');
const commentName = document.getElementById('commentName');
const commentSubmitBtn = document.getElementById('commentSubmitBtn');
const detailEditBtn = document.getElementById('detailEditBtn');
const detailDeleteBtn = document.getElementById('detailDeleteBtn');
const detailCloseBtn = document.getElementById('detailCloseBtn');
const detailCloseBtn2 = document.getElementById('detailCloseBtn2');

// Admin login
const adminLoginPage = document.getElementById('adminLoginPage');
const adminLoginPassword = document.getElementById('adminLoginPassword');
const adminLoginBtn = document.getElementById('adminLoginBtn');
const adminLoginError = document.getElementById('adminLoginError');
const adminLoginCancel = document.getElementById('adminLoginCancel');

// ============================================================
//  API FUNCTIONS
// ============================================================
async function apiFetch(endpoint, options = {}) {
    try {
        const response = await fetch(API_URL + endpoint, {
            ...options,
            headers: {
                'Content-Type': 'application/json',
                ...(options.headers || {})
            }
        });
        const data = await response.json();
        if (!response.ok) {
            throw new Error(data.error || 'API Error');
        }
        return data;
    } catch (error) {
        console.error('API Error:', error);
        return null;
    }
}

async function loadMovies() {
    const data = await apiFetch('/movies');
    if (data) {
        moviesData = data;
        render();
        updateStats();
    }
}

async function saveMovie(formData) {
    try {
        const response = await fetch(API_URL + '/movies', {
            method: 'POST',
            body: formData
        });
        const data = await response.json();
        if (data.success) {
            await loadMovies();
            return true;
        }
        return false;
    } catch (error) {
        console.error('Save error:', error);
        return false;
    }
}

async function deleteMovie(id) {
    const data = await apiFetch('/movies/' + id, { method: 'DELETE' });
    if (data && data.success) {
        await loadMovies();
        return true;
    }
    return false;
}

async function trackView(id) {
    await apiFetch('/movies/' + id + '/view', {
        method: 'POST',
        body: JSON.stringify({ sessionId })
    });
}

async function addComment(id, user, text) {
    const data = await apiFetch('/movies/' + id + '/comment', {
        method: 'POST',
        body: JSON.stringify({ user, text })
    });
    return data && data.success;
}

async function getStats() {
    const data = await apiFetch('/stats');
    return data;
}

// ============================================================
//  UPDATE STATS
// ============================================================
async function updateStats() {
    const stats = await getStats();
    if (stats) {
        document.getElementById('statMovies').textContent = stats.totalMovies;
        document.getElementById('statViews').textContent = stats.totalViews.toLocaleString();
        document.getElementById('statComments').textContent = stats.totalComments;
        document.getElementById('statUsers').textContent = stats.activeUsers;

        if (isAdminUnlocked) {
            document.getElementById('dashMovies').textContent = stats.totalMovies;
            document.getElementById('dashViews').textContent = stats.totalViews.toLocaleString();
            document.getElementById('dashComments').textContent = stats.totalComments;
        }
        totalCount.textContent = stats.totalMovies;
    }
}

// ============================================================
//  RENDER
// ============================================================
function render() {
    let filtered = moviesData;

    if (currentCategory !== 'all') {
        filtered = filtered.filter(m => m.category === currentCategory);
    }

    const q = searchQuery.trim().toLowerCase();
    if (q) {
        filtered = filtered.filter(m =>
            m.title.toLowerCase().includes(q) ||
            (m.description && m.description.toLowerCase().includes(q)) ||
            (m.quality && m.quality.toLowerCase().includes(q))
        );
    }

    resultCount.textContent = `Showing ${filtered.length} results`;

    if (filtered.length === 0) {
        grid.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-film"></i>
                <h3>No movies found</h3>
                <p>${isAdminUnlocked ? 'Add your first movie using the Admin panel.' : 'Check back later for new content!'}</p>
            </div>
        `;
        return;
    }

    filtered.sort((a, b) => (b.views || 0) - (a.views || 0));

    grid.innerHTML = filtered.map(movie => `
        <div class="movie-card" data-id="${movie.id}">
            <div class="movie-poster">
                ${movie.poster ? `<img src="${movie.poster}" alt="${movie.title}" loading="lazy" />` : `<span class="no-image"><i class="fas fa-film"></i></span>`}
                <span class="badge">${movie.category || 'general'}</span>
                ${movie.quality ? `<span class="quality-badge"><i class="fas fa-hdd"></i> ${movie.quality.split(',')[0]}</span>` : ''}
                <span class="views-badge"><i class="fas fa-eye"></i> ${(movie.views || 0).toLocaleString()}</span>
            </div>
            <div class="movie-body">
                <h3>${escapeHtml(movie.title)}</h3>
                <div class="meta">
                    <span><i class="far fa-calendar-alt"></i> ${escapeHtml(movie.year || 'N/A')}</span>
                    <span><i class="fas fa-comment"></i> ${(movie.comments || []).length}</span>
                </div>
            </div>
        </div>
    `).join('');

    document.querySelectorAll('.movie-card').forEach(card => {
        card.addEventListener('click', () => {
            const id = card.dataset.id;
            openDetail(id);
        });
    });
}

function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// ============================================================
//  DETAIL OVERLAY
// ============================================================
async function openDetail(id) {
    const movie = moviesData.find(m => m.id === id);
    if (!movie) return;

    currentDetailId = id;

    // Track view
    await trackView(id);

    // Reload to get updated view count
    await loadMovies();
    const updatedMovie = moviesData.find(m => m.id === id);
    if (!updatedMovie) return;

    detailTitle.textContent = updatedMovie.title;
    detailCategory.textContent = updatedMovie.category || 'general';
    detailYear.textContent = updatedMovie.year || 'N/A';
    detailQuality.textContent = updatedMovie.quality || 'N/A';
    detailDesc.textContent = updatedMovie.description || 'No description available.';
    detailViews.textContent = (updatedMovie.views || 0).toLocaleString();

    if (updatedMovie.poster) {
        detailPosterImg.src = updatedMovie.poster;
        detailPosterImg.style.display = 'block';
        detailNoImage.style.display = 'none';
    } else {
        detailPosterImg.style.display = 'none';
        detailNoImage.style.display = 'flex';
    }

    // Download links
    const links = updatedMovie.links || {};
    const qualities = [
        { key: '480p', label: '480p', size: 'SD' },
        { key: '720p', label: '720p', size: 'HD' },
        { key: '1080p', label: '1080p', size: 'Full HD' }
    ];
    downloadLinksContainer.innerHTML = qualities.map(q => {
        const url = links[q.key] || '';
        const hasLink = url && url.trim() !== '';
        return `
            <a href="${hasLink ? url : '#'}" 
               target="${hasLink ? '_blank' : ''}"
               class="download-btn ${hasLink ? 'active' : 'disabled'}"
               ${hasLink ? '' : 'onclick="return false;"'}>
                <i class="fas fa-download"></i> ${q.label}
                <span class="size-tag">${q.size}</span>
            </a>
        `;
    }).join('');

    // Comments
    const comments = updatedMovie.comments || [];
    detailCommentCount.textContent = comments.length;
    detailCommentCount2.textContent = comments.length;

    if (comments.length === 0) {
        commentList.innerHTML = `
            <div style="text-align:center;padding:16px;color:var(--text-muted);font-size:0.85rem;">
                <i class="fas fa-comment" style="opacity:0.3;"></i> No comments yet. Be the first!
            </div>
        `;
    } else {
        commentList.innerHTML = comments.map(c => `
            <div class="comment-item">
                <div class="comment-user">
                    <i class="fas fa-user-circle"></i> ${escapeHtml(c.user || 'Anonymous')}
                    <span class="time"><i class="far fa-clock"></i> ${formatTime(c.time)}</span>
                </div>
                <div class="comment-text">${escapeHtml(c.text)}</div>
            </div>
        `).join('');
    }

    detailOverlay.classList.add('visible');
    document.body.style.overflow = 'hidden';
}

function closeDetail() {
    detailOverlay.classList.remove('visible');
    document.body.style.overflow = '';
    currentDetailId = null;
}

function formatTime(time) {
    if (!time) return 'Just now';
    const date = new Date(time);
    const now = Date.now();
    const diff = Math.floor((now - date.getTime()) / 1000);
    if (diff < 60) return 'Just now';
    if (diff < 3600) return Math.floor(diff / 60) + 'm ago';
    if (diff < 86400) return Math.floor(diff / 3600) + 'h ago';
    return date.toLocaleDateString();
}

detailCloseBtn.addEventListener('click', closeDetail);
detailCloseBtn2.addEventListener('click', closeDetail);
detailOverlay.addEventListener('click', (e) => {
    if (e.target === detailOverlay) closeDetail();
});

// ============================================================
//  COMMENTS - REAL TIME
// ============================================================
commentSubmitBtn.addEventListener('click', async () => {
    const text = commentInput.value.trim();
    const name = commentName.value.trim() || 'User';
    if (!text || !currentDetailId) return;

    const success = await addComment(currentDetailId, name, text);
    if (success) {
        commentInput.value = '';
        await loadMovies();
        await openDetail(currentDetailId);
    }
});

commentInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') commentSubmitBtn.click();
});

// ============================================================
//  ADMIN LOGIN
// ============================================================
function checkSecretURL() {
    const hash = window.location.hash.replace('#', '');
    if (hash === SECRET_KEY) {
        adminLoginPage.classList.add('visible');
        adminLoginPassword.focus();
        history.pushState('', document.title, window.location.pathname + window.location.search);
        return true;
    }
    return false;
}

checkSecretURL();
window.addEventListener('hashchange', checkSecretURL);

let loginAttempts = 0;
const MAX_ATTEMPTS = 5;

function doAdminLogin() {
    if (loginAttempts >= MAX_ATTEMPTS) {
        alert('⚠️ Too many failed attempts. Please refresh the page.');
        return;
    }

    if (adminLoginPassword.value === ADMIN_PASSWORD) {
        isAdminUnlocked = true;
        sessionStorage.setItem('adminUnlocked', 'true');
        adminLoginPage.classList.remove('visible');
        adminPanel.classList.add('visible');
        document.querySelectorAll('.admin-only').forEach(el => {
            el.classList.add('visible');
        });
        resetForm();
        adminPanel.scrollIntoView({ behavior: 'smooth', block: 'start' });
        loginAttempts = 0;
    } else {
        loginAttempts++;
        adminLoginError.style.display = 'block';
        adminLoginError.textContent = `❌ Incorrect password. Attempts remaining: ${MAX_ATTEMPTS - loginAttempts}`;
        adminLoginPassword.value = '';
        adminLoginPassword.focus();
    }
}

adminLoginBtn.addEventListener('click', doAdminLogin);
adminLoginPassword.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') doAdminLogin();
});
adminLoginCancel.addEventListener('click', () => {
    adminLoginPage.classList.remove('visible');
    history.pushState('', document.title, window.location.pathname + window.location.search);
});

if (sessionStorage.getItem('adminUnlocked') === 'true') {
    isAdminUnlocked = true;
    adminPanel.classList.add('visible');
    document.querySelectorAll('.admin-only').forEach(el => {
        el.classList.add('visible');
    });
}

// ============================================================
//  CRUD - ADMIN ONLY
// ============================================================
function openEditForm(id) {
    const movie = moviesData.find(m => m.id === id);
    if (!movie) return;

    editId.value = movie.id;
    titleInput.value = movie.title;
    categorySelect.value = movie.category;
    qualityInput.value = movie.quality || '';
    yearInput.value = movie.year || '';
    descInput.value = movie.description || '';

    const links = movie.links || {};
    link480.value = links['480p'] || '';
    link720.value = links['720p'] || '';
    link1080.value = links['1080p'] || '';

    if (movie.poster && !movie.poster.startsWith('/uploads/')) {
        posterData.value = movie.poster;
        previewImg.src = movie.poster;
        posterPreview.classList.add('visible');
    } else if (movie.poster) {
        posterData.value = '';
        previewImg.src = movie.poster;
        posterPreview.classList.add('visible');
    } else {
        posterData.value = '';
        posterPreview.classList.remove('visible');
    }

    saveBtn.innerHTML = '<i class="fas fa-edit"></i> Update';
    if (!adminPanel.classList.contains('visible')) {
        adminPanel.classList.add('visible');
    }
    adminPanel.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function resetForm() {
    editId.value = '';
    titleInput.value = '';
    categorySelect.value = 'bollywood';
    qualityInput.value = '';
    yearInput.value = '';
    descInput.value = '';
    link480.value = '';
    link720.value = '';
    link1080.value = '';
    posterData.value = '';
    posterPreview.classList.remove('visible');
    posterInput.value = '';
    saveBtn.innerHTML = '<i class="fas fa-save"></i> Add / Update';
}

posterInput.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
        const dataUrl = ev.target.result;
        posterData.value = dataUrl;
        previewImg.src = dataUrl;
        posterPreview.classList.add('visible');
    };
    reader.readAsDataURL(file);
});

contentForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    const title = titleInput.value.trim();
    if (!title) {
        alert('Title is required.');
        return;
    }

    const formData = new FormData();
    formData.append('id', editId.value);
    formData.append('title', title);
    formData.append('category', categorySelect.value);
    formData.append('quality', qualityInput.value.trim());
    formData.append('year', yearInput.value.trim());
    formData.append('description', descInput.value.trim());
    formData.append('links', JSON.stringify({
        '480p': link480.value.trim(),
        '720p': link720.value.trim(),
        '1080p': link1080.value.trim()
    }));

    // Check if file is selected
    if (posterInput.files && posterInput.files[0]) {
        formData.append('poster', posterInput.files[0]);
    } else if (posterData.value && posterData.value.startsWith('data:image')) {
        formData.append('posterData', posterData.value);
    } else {
        formData.append('posterData', '');
    }

    const success = await saveMovie(formData);
    if (success) {
        resetForm();
        // Close admin panel after add
        // adminPanel.classList.remove('visible');
    } else {
        alert('Failed to save movie. Please try again.');
    }
});

resetBtn.addEventListener('click', (e) => {
    e.preventDefault();
    resetForm();
});

clearAllBtn.addEventListener('click', async () => {
    if (confirm('⚠️ Delete ALL content? This cannot be undone.')) {
        // Delete all movies one by one
        for (const movie of moviesData) {
            await deleteMovie(movie.id);
        }
        await loadMovies();
        resetForm();
    }
});

closeAdminPanelBtn.addEventListener('click', () => {
    adminPanel.classList.remove('visible');
});

// ============================================================
//  DETAIL EDIT/DELETE - ADMIN ONLY
// ============================================================
detailEditBtn.addEventListener('click', () => {
    if (currentDetailId) {
        if (!isAdminUnlocked) {
            alert('⚠️ Admin access required.');
            return;
        }
        closeDetail();
        openEditForm(currentDetailId);
    }
});

detailDeleteBtn.addEventListener('click', async () => {
    if (currentDetailId && confirm('Delete this movie?')) {
        if (!isAdminUnlocked) {
            alert('⚠️ Admin access required.');
            return;
        }
        await deleteMovie(currentDetailId);
        closeDetail();
    }
});

// ============================================================
//  SEARCH & CATEGORY
// ============================================================
searchBtn.addEventListener('click', () => {
    searchQuery = searchInput.value;
    render();
});

searchInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
        searchQuery = searchInput.value;
        render();
    }
});

catTabs.forEach(tab => {
    tab.addEventListener('click', () => {
        catTabs.forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
        currentCategory = tab.dataset.cat;
        render();
    });
});

// ============================================================
//  AUTO-SYNC - REAL TIME
// ============================================================
let lastSync = 0;

async function syncData() {
    const now = Date.now();
    if (now - lastSync > 3000) {
        await loadMovies();
        lastSync = now;
    }
}

setInterval(syncData, 3000);

// ============================================================
//  KEYBOARD SHORTCUTS
// ============================================================
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
        if (detailOverlay.classList.contains('visible')) closeDetail();
        if (adminLoginPage.classList.contains('visible')) {
            adminLoginPage.classList.remove('visible');
        }
    }
});

// ============================================================
//  AUTO-LOGOUT
// ============================================================
let inactivityTimer;

function resetInactivityTimer() {
    clearTimeout(inactivityTimer);
    inactivityTimer = setTimeout(() => {
        if (isAdminUnlocked) {
            sessionStorage.removeItem('adminUnlocked');
            isAdminUnlocked = false;
            adminPanel.classList.remove('visible');
            document.querySelectorAll('.admin-only').forEach(el => {
                el.classList.remove('visible');
            });
            alert('⏰ Auto-logged out due to inactivity.');
            location.reload();
        }
    }, 30 * 60 * 1000);
}

['click', 'mousemove', 'keydown', 'scroll', 'touchstart'].forEach(event => {
    document.addEventListener(event, resetInactivityTimer);
});

// ============================================================
//  INIT
// ============================================================
loadMovies();

console.log('🎬 FilmyHub - Real Time Version Loaded');
console.log('🔑 Admin Password: ' + ADMIN_PASSWORD);
console.log('🔐 Secret URL: Add #' + SECRET_KEY + ' to the URL');
console.log('📌 Example: ' + window.location.href.split('#')[0] + '#' + SECRET_KEY);
console.log('🔄 Auto-sync every 3 seconds for REAL-TIME updates');