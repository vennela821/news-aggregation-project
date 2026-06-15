const LOCAL_HOSTS = ['127.0.0.1', 'localhost'];
const isLocalStaticPage = LOCAL_HOSTS.includes(window.location.hostname) && !['8081', '10000'].includes(window.location.port);
const API_URL = isLocalStaticPage ? `http://${window.location.hostname}:8081/api` : `${window.location.origin}/api`;
const AUTH_KEYS = ['token', 'name', 'email', 'role'];

const state = {
    token: '',
    user: { name: '', email: '', role: 'READER' },
};

const elements = {};

function qs(selector) {
    return document.querySelector(selector);
}

function qsa(selector) {
    return Array.from(document.querySelectorAll(selector));
}

function pageName() {
    return document.body.dataset.page || 'login';
}

function escapeHtml(value) {
    return String(value ?? '')
        .replaceAll('&', '&amp;')
        .replaceAll('<', '&lt;')
        .replaceAll('>', '&gt;')
        .replaceAll('"', '&quot;')
        .replaceAll("'", '&#039;');
}

function readAuthParams() {
    const search = new URLSearchParams(window.location.search);
    if (search.has('token')) return search;
    const hash = new URLSearchParams(window.location.hash.slice(1));
    return hash.has('token') ? hash : null;
}

function loadStoredAuth() {
    const params = readAuthParams();
    state.token = params?.get('token') || localStorage.getItem('token') || '';
    state.user.name = params?.get('name') || localStorage.getItem('name') || '';
    state.user.email = params?.get('email') || localStorage.getItem('email') || '';
    state.user.role = (params?.get('role') || localStorage.getItem('role') || 'READER').toUpperCase();

    if (params?.has('token')) {
        persistAuth();
        history.replaceState(null, '', window.location.pathname);
    }
}

function persistAuth() {
    if (state.token) localStorage.setItem('token', state.token);
    else localStorage.removeItem('token');

    localStorage.setItem('name', state.user.name || '');
    localStorage.setItem('email', state.user.email || '');
    localStorage.setItem('role', (state.user.role || 'READER').toUpperCase());
}

function clearAuth() {
    AUTH_KEYS.forEach((key) => localStorage.removeItem(key));
    state.token = '';
    state.user = { name: '', email: '', role: 'READER' };
}

function dashboardUrl(data) {
    const params = new URLSearchParams({
        token: data.token || '',
        name: data.name || data.user?.name || state.user.name || '',
        email: data.email || data.user?.email || state.user.email || '',
        role: (data.role || data.user?.role || state.user.role || 'READER').toUpperCase(),
    });
    return `dashboard.html?${params.toString()}`;
}

function saveAuth(data, fallback = {}) {
    state.token = data.token || state.token;
    state.user.name = data.name || data.user?.name || fallback.name || state.user.name;
    state.user.email = data.email || data.user?.email || fallback.email || state.user.email;
    state.user.role = (data.role || data.user?.role || fallback.role || state.user.role || 'READER').toUpperCase();
    persistAuth();
}

function role() {
    return (state.user.role || 'READER').toUpperCase();
}

function isPublisher() {
    return role() === 'STUDENT' || role() === 'ADMIN';
}

function isAdmin() {
    return role() === 'ADMIN';
}

function setText(selector, value) {
    const node = qs(selector);
    if (node) node.textContent = value;
}

function setStatus(node, message, type = 'info') {
    if (!node) return;
    node.textContent = message || '';
    node.dataset.type = type;
}

async function request(path, options = {}) {
    const headers = { ...(options.headers || {}) };
    if (options.body && !headers['Content-Type']) headers['Content-Type'] = 'application/json';
    if (state.token && !path.startsWith('/auth/login') && !path.startsWith('/auth/register')) {
        headers.Authorization = `Bearer ${state.token}`;
    }

    let response;
    try {
        response = await fetch(`${API_URL}${path}`, { ...options, headers });
    } catch (error) {
        throw new Error('Backend server is not reachable on port 8081.');
    }

    const text = await response.text();
    let payload = null;
    if (text) {
        try { payload = JSON.parse(text); }
        catch { payload = text; }
    }

    if (!response.ok) {
        const message = typeof payload === 'object' && payload
            ? payload.message || payload.error
            : payload;
        throw new Error(message || `Request failed (${response.status})`);
    }

    return payload;
}

function cacheElements() {
    Object.assign(elements, {
        name: qs('#name'),
        email: qs('#email'),
        password: qs('#password'),
        authStatus: qs('#authStatus'),
        registerBtn: qs('#registerBtn'),
        loginBtn: qs('#loginBtn'),
        logoutBtn: qs('#logoutBtn'),
        welcomeText: qs('#welcomeText'),
        roleSummary: qs('#roleSummary'),
        profileName: qs('#profileName'),
        profileEmail: qs('#profileEmail'),
        profileRole: qs('#profileRole'),
        search: qs('#search'),
        category: qs('#category'),
        refreshBtn: qs('#refreshBtn'),
        articles: qs('#articles'),
        articleEditor: qs('#articleEditor'),
        readerNotice: qs('#readerNotice'),
        articleTitle: qs('#articleTitle'),
        articleCategory: qs('#articleCategory'),
        articleSource: qs('#articleSource'),
        articleImage: qs('#articleImage'),
        articleContent: qs('#articleContent'),
        addArticleBtn: qs('#addArticleBtn'),
        articleStatus: qs('#articleStatus'),
        myArticles: qs('#myArticles'),
        adminStats: qs('#adminStats'),
        usersTable: qs('#usersTable'),
        adminStatus: qs('#adminStatus'),
        pendingArticles: qs('#pendingArticles'),
        pendingStatus: qs('#pendingStatus'),
        refreshUsersBtn: qs('#refreshUsersBtn'),
        refreshPendingBtn: qs('#refreshPendingBtn'),
    });
}

async function register() {
    const name = elements.name.value.trim();
    const email = elements.email.value.trim();
    const password = elements.password.value;

    if (!name || !email || !password) {
        setStatus(elements.authStatus, 'Name, email, and password are required.', 'error');
        return;
    }

    try {
        setStatus(elements.authStatus, 'Creating account...', 'info');

        const data = await request('/auth/register', {
            method: 'POST',
            body: JSON.stringify({ name, email, password }),
        });

        saveAuth(data, { name, email, role: 'READER' });

        Swal.fire({
            icon: 'success',
            title: 'Account Created Successfully',
            text: 'Welcome to News Aggregator!',
            timer: 1500,
            showConfirmButton: false
        });

        setTimeout(() => {
            window.location.href = dashboardUrl(data);
        }, 1500);

    } catch (error) {
        setStatus(elements.authStatus, error.message, 'error');
    }
}
async function login() {
    const email = elements.email.value.trim();
    const password = elements.password.value;

    if (!email || !password) {
        setStatus(elements.authStatus, 'Email and password are required.', 'error');
        return;
    }

    try {
        setStatus(elements.authStatus, 'Signing in...', 'info');

        const data = await request('/auth/login', {
            method: 'POST',
            body: JSON.stringify({ email, password }),
        });

        saveAuth(data, { email });

        Swal.fire({
            icon: 'success',
            title: 'Login Successful',
            text: 'Welcome back!',
            timer: 1500,
            showConfirmButton: false
        });

        setTimeout(() => {
            window.location.href = dashboardUrl(data);
        }, 1500);

    } catch (error) {
        setStatus(elements.authStatus, error.message, 'error');
    }
}

function logout() {
    clearAuth();
    window.location.href = 'index.html';
}

async function refreshProfile({ silent = false } = {}) {
    if (!state.token) return;
    try {
        const profile = await request('/auth/me');
        if (profile) {
            saveAuth({ ...profile, token: state.token });
        }
    } catch (error) {
        if (!silent) throw error;
    }
}

function applyShell() {
    setText('#welcomeText', `Welcome, ${state.user.name || 'Reader'} (${role()})`);
    setText('#roleSummary', role());
    setText('#profileName', state.user.name || '-');
    setText('#profileEmail', state.user.email || '-');
    setText('#profileRole', role());

    qsa('.admin-link').forEach((link) => link.classList.toggle('hidden', !isAdmin()));
    if (elements.articleEditor) elements.articleEditor.classList.toggle('hidden', !isPublisher());
    if (elements.readerNotice) elements.readerNotice.classList.toggle('hidden', isPublisher());
}

function articleImage(article) {
    return article.imageUrl || 'https://images.unsplash.com/photo-1504711434969-e33886168f5c?auto=format&fit=crop&w=1200&q=80';
}

function normalizeArticle(article) {
    return {
        id: article.id,
        title: article.title || 'Untitled story',
        content: article.content || article.description || 'No summary available.',
        category: article.category || 'General',
        source: article.source || 'Student News Desk',
        imageUrl: articleImage(article),
        author: article.createdByName || article.authorName || 'News Desk',
        createdAt: article.createdAt ? new Date(article.createdAt).toLocaleDateString() : 'Recent',
        status: (article.status || 'APPROVED').toUpperCase(),
    };
}

async function loadArticles() {
    if (!elements.articles) return;
    const params = new URLSearchParams();
    const selectedCategory = elements.category?.value || 'all';
    const query = elements.search?.value.trim() || '';
    if (selectedCategory !== 'all') params.set('category', selectedCategory);
    if (query) params.set('query', query);

    elements.articles.innerHTML = '<p class="empty-state">Loading articles...</p>';
    try {
        const articles = await request(`/articles${params.toString() ? `?${params}` : ''}`);
        renderArticles(Array.isArray(articles) ? articles : []);
    } catch (error) {
        elements.articles.innerHTML = `<p class="empty-state error-text">${escapeHtml(error.message)}</p>`;
    }
}

function renderArticles(articles) {
    if (!articles.length) {
        elements.articles.innerHTML =
            '<p class="empty-state">No articles found. Try another category or search.</p>';
        return;
    }

    elements.articles.innerHTML = articles.map((raw) => {
        const article = normalizeArticle(raw);

        return `
            <article class="article">
                <img
                    src="${escapeHtml(article.imageUrl)}"
                    alt="${escapeHtml(article.title)}"
                    onerror="this.src='https://images.unsplash.com/photo-1504711434969-e33886168f5c?auto=format&fit=crop&w=1200&q=80'">

                <div class="article-content">
                    <div class="meta">
                        <span class="tag">${escapeHtml(article.category)}</span>
                        <span>${escapeHtml(article.source)}</span>
                    </div>

                    <h3>${escapeHtml(article.title)}</h3>

                    <p>
                        ${escapeHtml(article.content)}
                    </p>

                    <div class="article-footer">
                        <span>By ${escapeHtml(article.author)}</span>
                        <span>${escapeHtml(article.createdAt)}</span>
                    </div>
                </div>
            </article>`;
    }).join('');
}

async function addArticle() {
    if (!isPublisher()) {
        setStatus(elements.articleStatus, 'Only students and admins can publish articles.', 'error');
        return;
    }

    const payload = {
        title: elements.articleTitle.value.trim(),
        category: elements.articleCategory.value.trim() || 'General',
        source: elements.articleSource.value.trim() || 'Student Desk',
        imageUrl: elements.articleImage.value.trim(),
        content: elements.articleContent.value.trim(),
    };

    if (!payload.title || !payload.content) {
        setStatus(elements.articleStatus, 'Title and content are required.', 'error');
        return;
    }

    try {
        setStatus(elements.articleStatus, 'Sending article for admin review...', 'info');
        await request('/articles', { method: 'POST', body: JSON.stringify(payload) });
        ['articleTitle', 'articleCategory', 'articleSource', 'articleImage', 'articleContent'].forEach((key) => {
            if (elements[key]) elements[key].value = '';
        });
        setStatus(elements.articleStatus, 'Article submitted. It will publish after admin approval.', 'success');
        await loadArticles();
    } catch (error) {
        setStatus(elements.articleStatus, error.message, 'error');
    }
}

async function loadMyArticles() {
    if (!elements.myArticles) return;
    if (!isPublisher()) {
        elements.myArticles.innerHTML = '<p class="empty-state">Reader accounts can browse and search news. Ask an admin to upgrade you to Student to publish stories.</p>';
        return;
    }

    elements.myArticles.innerHTML = '<p class="empty-state">Loading your articles...</p>';
    try {
        const articles = await request('/articles/my-articles');
        if (!Array.isArray(articles) || !articles.length) {
            elements.myArticles.innerHTML = '<p class="empty-state">You have not published any articles yet.</p>';
            return;
        }
        elements.myArticles.innerHTML = articles.map((raw) => {
            const article = normalizeArticle(raw);
            return `<div class="compact-item">
                <div class="compact-heading">
                    <strong>${escapeHtml(article.title)}</strong>
                    <span class="status-pill ${statusClass(article.status)}">${escapeHtml(article.status)}</span>
                </div>
                <span>${escapeHtml(article.category)} - ${escapeHtml(article.source)} - ${escapeHtml(article.createdAt)}</span>
            </div>`;
        }).join('');
    } catch (error) {
        elements.myArticles.innerHTML = `<p class="empty-state error-text">${escapeHtml(error.message)}</p>`;
    }
}

async function loadAdminUsers() {
    if (!elements.usersTable) return;
    setStatus(elements.adminStatus, 'Loading users...', 'info');
    elements.usersTable.innerHTML = '<tr><td colspan="5">Loading users...</td></tr>';

    try {
        const users = await request('/admin/users');
        renderAdminStats(Array.isArray(users) ? users : []);
        renderUsers(Array.isArray(users) ? users : []);
        setStatus(elements.adminStatus, 'User details updated.', 'success');
    } catch (error) {
        elements.usersTable.innerHTML = `<tr><td colspan="5">${escapeHtml(error.message)}</td></tr>`;
        setStatus(elements.adminStatus, error.message, 'error');
    }
}

function renderAdminStats(users) {
    if (!elements.adminStats) return;

    const counts = {
        total: users.length,
        admins: users.filter(user => user.role === 'ADMIN').length,
        students: users.filter(user => user.role === 'STUDENT').length,
        blocked: users.filter(user => user.blocked).length
    };

    elements.adminStats.innerHTML = `
        <article class="stat-card">
            <span>Total Users</span>
            <strong>${counts.total}</strong>
        </article>

        <article class="stat-card">
            <span>Admins</span>
            <strong>${counts.admins}</strong>
        </article>

        <article class="stat-card">
            <span>Students</span>
            <strong>${counts.students}</strong>
        </article>

        <article class="stat-card">
            <span>Blocked</span>
            <strong>${counts.blocked}</strong>
        </article>
    `;

    const canvas = document.getElementById("adminChart");

    if (!canvas) return;

    const oldChart = Chart.getChart(canvas);

    if (oldChart) {
        oldChart.destroy();
    }

    new Chart(canvas, {
        type: "doughnut",
        data: {
            labels: ["Admins", "Students", "Readers", "Blocked"],
            datasets: [{
                data: [
                    counts.admins,
                    counts.students,
                    counts.total - counts.admins - counts.students,
                    counts.blocked
                ]
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: "bottom"
                }
            }
        }
    });
}

function renderUsers(users) {
    if (!users.length) {
        elements.usersTable.innerHTML = '<tr><td colspan="5">No users found.</td></tr>';
        return;
    }

    elements.usersTable.innerHTML = users.map((user) => `
        <tr>
            <td>${escapeHtml(user.name)}</td>
            <td>${escapeHtml(user.email)}</td>
            <td>
                <select class="role-select" data-user-id="${escapeHtml(user.id)}">
                    <option value="READER" ${user.role === 'READER' ? 'selected' : ''}>Reader</option>
                    <option value="STUDENT" ${user.role === 'STUDENT' ? 'selected' : ''}>Student</option>
                    <option value="ADMIN" ${user.role === 'ADMIN' ? 'selected' : ''}>Admin</option>
                </select>
            </td>
            <td><span class="status-pill ${user.blocked ? 'blocked' : 'active'}">${user.blocked ? 'Blocked' : 'Active'}</span></td>
            <td><button class="secondary small-btn block-btn" data-user-id="${escapeHtml(user.id)}" data-blocked="${user.blocked}">${user.blocked ? 'Unblock' : 'Block'}</button></td>
        </tr>`).join('');

    qsa('.role-select').forEach((select) => select.addEventListener('change', () => updateUserRole(select.dataset.userId, select.value)));
    qsa('.block-btn').forEach((button) => button.addEventListener('click', () => updateUserBlock(button.dataset.userId, button.dataset.blocked !== 'true')));
}

async function loadPendingArticles() {
    if (!elements.pendingArticles) return;
    setStatus(elements.pendingStatus, 'Loading pending articles...', 'info');
    elements.pendingArticles.innerHTML = '<p class="empty-state">Loading pending articles...</p>';

    try {
        const articles = await request('/articles/admin/pending');
        renderPendingArticles(Array.isArray(articles) ? articles : []);
        setStatus(elements.pendingStatus, 'Pending queue updated.', 'success');
    } catch (error) {
        elements.pendingArticles.innerHTML = `<p class="empty-state error-text">${escapeHtml(error.message)}</p>`;
        setStatus(elements.pendingStatus, error.message, 'error');
    }
}

function statusClass(status) {
    const value = String(status || '').toUpperCase();
    if (value === 'APPROVED') return 'active';
    if (value === 'REJECTED') return 'blocked';
    return 'pending';
}

function renderPendingArticles(articles) {
    if (!elements.pendingArticles) return;
    if (!articles.length) {
        elements.pendingArticles.innerHTML = '<p class="empty-state">No pending articles right now.</p>';
        return;
    }

    elements.pendingArticles.innerHTML = articles.map((raw) => {
        const article = normalizeArticle(raw);
        return `
            <article class="review-card">
                <img src="${escapeHtml(article.imageUrl)}" alt="${escapeHtml(article.title)}">
                <div class="review-content">
                    <div class="meta">
                        <span class="tag">${escapeHtml(article.category)}</span>
                        <span>${escapeHtml(article.source)}</span>
                        <span>By ${escapeHtml(article.author)}</span>
                    </div>
                    <h3>${escapeHtml(article.title)}</h3>
                    <p>${escapeHtml(article.content)}</p>
                    <div class="review-actions">
                        <button class="approve-btn" type="button" data-article-id="${escapeHtml(article.id)}">Approve</button>
                        <button class="secondary reject-btn" type="button" data-article-id="${escapeHtml(article.id)}">Reject</button>
                    </div>
                </div>
            </article>`;
    }).join('');

    qsa('.approve-btn').forEach((button) => {
        button.addEventListener('click', () => reviewArticle(button.dataset.articleId, 'approve'));
    });
    qsa('.reject-btn').forEach((button) => {
        button.addEventListener('click', () => reviewArticle(button.dataset.articleId, 'reject'));
    });
}

async function reviewArticle(articleId, action) {
    try {
        setStatus(elements.pendingStatus, action === 'approve' ? 'Approving article...' : 'Rejecting article...', 'info');
        await request(`/articles/${articleId}/${action}`, { method: 'PUT' });
        setStatus(elements.pendingStatus, action === 'approve' ? 'Article approved and published.' : 'Article rejected.', 'success');
        await loadPendingArticles();
        await loadArticles();
    } catch (error) {
        setStatus(elements.pendingStatus, error.message, 'error');
    }
}

async function updateUserRole(userId, nextRole) {
    try {
        await request(`/admin/users/${userId}/role`, { method: 'PATCH', body: JSON.stringify({ role: nextRole }) });
        await loadAdminUsers();
    } catch (error) {
        setStatus(elements.adminStatus, error.message, 'error');
    }
}

async function updateUserBlock(userId, blocked) {
    try {
        await request(`/admin/users/${userId}/block`, { method: 'PATCH', body: JSON.stringify({ blocked }) });
        await loadAdminUsers();
    } catch (error) {
        setStatus(elements.adminStatus, error.message, 'error');
    }
}

function attachEvents() {
    elements.registerBtn?.addEventListener('click', register);
    elements.loginBtn?.addEventListener('click', login);
    elements.logoutBtn?.addEventListener('click', logout);
    elements.refreshBtn?.addEventListener('click', loadArticles);
    elements.category?.addEventListener('change', loadArticles);
    elements.search?.addEventListener('input', () => {
        clearTimeout(window.searchTimer);
        window.searchTimer = setTimeout(loadArticles, 250);
    });
    elements.addArticleBtn?.addEventListener('click', addArticle);
    elements.refreshUsersBtn?.addEventListener('click', loadAdminUsers);
    elements.refreshPendingBtn?.addEventListener('click', loadPendingArticles);
}

async function init() {
    cacheElements();
    attachEvents();

    const page = pageName();
    if (page === 'login') {
        // Force a clean sign-in every time the login page is opened.
        // Any previously cached token/user info is cleared so the user
        // must authenticate before accessing the dashboard.
        clearAuth();
        return;
    }

    loadStoredAuth();

    if (!state.token) {
        window.location.href = 'index.html';
        return;
    }

    await refreshProfile({ silent: true });
    applyShell();

    if (page === 'dashboard') await loadArticles();
    if (page === 'profile') await loadMyArticles();
    if (page === 'admin') {
        if (!isAdmin()) {
            window.location.href = 'dashboard.html';
            return;
        }
        await Promise.all([loadAdminUsers(), loadPendingArticles()]);
    }
}

document.addEventListener('DOMContentLoaded', init);

const themeBtn = document.getElementById("themeBtn");

if(localStorage.getItem("theme") === "dark"){
    document.body.classList.add("dark");
}

themeBtn?.addEventListener("click", () => {
    document.body.classList.toggle("dark");

    if(document.body.classList.contains("dark")){
        localStorage.setItem("theme","dark");
    }else{
        localStorage.setItem("theme","light");
    }
});
