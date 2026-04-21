// Hair Care Page Handler

document.addEventListener('DOMContentLoaded', async () => {
    let currentArticleId = null;
    let selectedVideoId = null;

    // ===== ARTICLES SECTION =====

    async function renderArticles() {
        const articlesContainer = document.getElementById('articles-list');
        if (!articlesContainer) return;

        articlesContainer.innerHTML = '<div class="loading-state"><p>Loading articles...</p></div>';

        try {
            const articles = await HairCareModule.getArticles();
            articlesContainer.innerHTML = '';

            if (articles.length === 0) {
                articlesContainer.innerHTML = '<div class="empty-state"><p>No articles available.</p></div>';
                return;
            }

            articles.forEach(article => {
                const articleCard = document.createElement('article');
                articleCard.className = 'article-card';
                articleCard.dataset.articleId = article.id;

                articleCard.innerHTML = `
                    <div class="article-header">
                        <div class="article-meta">
                            <span class="category-badge">${article.category}</span>
                            <span class="read-time">${article.readTime} min read</span>
                        </div>
                    </div>
                    <h3 class="article-title">${article.title}</h3>
                    <p class="article-excerpt">${article.excerpt}</p>
                    <div class="article-footer">
                        <div class="article-info">
                            <span class="author">By ${article.author}</span>
                            <span class="date">${HairCareModule.formatDate(article.date)}</span>
                        </div>
                        <button class="read-more-btn" data-article-id="${article.id}">Read More →</button>
                    </div>
                `;

                articleCard.querySelector('.read-more-btn').addEventListener('click', (e) => {
                    e.preventDefault();
                    showArticleDetail(article.id);
                });

                articlesContainer.appendChild(articleCard);
            });
        } catch (error) {
            console.error('Error rendering articles:', error);
            articlesContainer.innerHTML = '<div class="error-state"><p>Failed to load articles.</p></div>';
        }
    }

    async function showArticleDetail(articleId) {
        try {
            const article = await HairCareModule.getArticle(articleId);
            const modal = document.getElementById('article-modal');
            const modalContent = document.getElementById('article-modal-content');

            if (!article || !modal) return;

            currentArticleId = articleId;

            const contentHTML = `
                <div class="modal-header">
                    <h2>${article.title}</h2>
                    <button class="close-modal-btn" data-modal="article-modal">
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <line x1="18" y1="6" x2="6" y2="18"></line>
                            <line x1="6" y1="6" x2="18" y2="18"></line>
                        </svg>
                    </button>
                </div>
                <div class="modal-body">
                    <div class="article-meta-info">
                        <span class="category-badge">${article.category}</span>
                        <span class="meta-item">By ${article.author}</span>
                        <span class="meta-item">${HairCareModule.formatDate(article.date)}</span>
                        <span class="meta-item">${article.readTime} min read</span>
                    </div>
                    <div class="article-full-content">
                        ${article.content.split('\n\n').map(para => {
                            if (para.startsWith('**') && para.endsWith(':**')) {
                                return `<h4>${para.replace(/\*\*/g, '')}</h4>`;
                            }
                            if (para.startsWith('- ')) {
                                const items = para.split('\n').map(item => `<li>${item.substring(2)}</li>`).join('');
                                return `<ul>${items}</ul>`;
                            }
                            if (para.match(/^\d\./)) {
                                const items = para.split('\n').map(item => `<li>${item.replace(/^\d\.\s/, '')}</li>`).join('');
                                return `<ol>${items}</ol>`;
                            }
                            return `<p>${para}</p>`;
                        }).join('')}
                    </div>
                </div>
            `;

            modalContent.innerHTML = contentHTML;

            // Attach close button listener
            modalContent.querySelector('.close-modal-btn').addEventListener('click', (e) => {
                e.preventDefault();
                modal.style.display = 'none';
            });

            modal.style.display = 'flex';
        } catch (error) {
            console.error('Error showing article:', error);
        }
    }

    // ===== VIDEOS SECTION =====

    async function renderVideos() {
        const videosContainer = document.getElementById('videos-list');
        if (!videosContainer) return;

        videosContainer.innerHTML = '<div class="loading-state"><p>Loading videos...</p></div>';

        try {
            const videos = await HairCareModule.getVideos();
            videosContainer.innerHTML = '';

            if (videos.length === 0) {
                videosContainer.innerHTML = '<div class="empty-state"><p>No videos available.</p></div>';
                return;
            }

            videos.forEach(video => {
                const videoCard = document.createElement('div');
                videoCard.className = 'video-card';
                videoCard.dataset.videoId = video.id;

                const thumbnailUrl = video.source === 'youtube' 
                    ? `https://img.youtube.com/vi/${video.videoId}/mqdefault.jpg`
                    : '🎬';

                videoCard.innerHTML = `
                    <div class="video-thumbnail">
                        ${video.source === 'youtube' ? `<img src="${thumbnailUrl}" alt="${video.title}">` : '<div class="video-icon">🎬</div>'}
                        <div class="play-button">
                            <svg width="48" height="48" viewBox="0 0 24 24" fill="currentColor">
                                <path d="M5 3l14 9-14 9V3z"></path>
                            </svg>
                        </div>
                        <span class="duration">${video.duration || '0:00'}</span>
                    </div>
                    <div class="video-info">
                        <span class="category-badge">${video.category}</span>
                        <h3 class="video-title">${video.title}</h3>
                        <p class="video-description">${video.description}</p>
                        <div class="video-meta">
                            <span class="author">${video.author}</span>
                            <span class="views">${HairCareModule.formatViews(video.views)} views</span>
                            <span class="date">${HairCareModule.formatDate(video.date)}</span>
                        </div>
                    </div>
                `;

                videoCard.addEventListener('click', (e) => {
                    e.preventDefault();
                    showVideoPlayer(video.id);
                });

                videosContainer.appendChild(videoCard);
            });
        } catch (error) {
            console.error('Error rendering videos:', error);
            videosContainer.innerHTML = '<div class="error-state"><p>Failed to load videos.</p></div>';
        }
    }

    async function showVideoPlayer(videoId) {
        try {
            const video = await HairCareModule.getVideo(videoId);
            const modal = document.getElementById('video-modal');
            const videoPlayer = document.getElementById('video-player');

            if (!video || !modal) return;

            selectedVideoId = videoId;
            const embedUrl = HairCareModule.getEmbedUrl(video);

            videoPlayer.innerHTML = `
                <div class="modal-header">
                    <h2>${video.title}</h2>
                    <button class="close-modal-btn" data-modal="video-modal">
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <line x1="18" y1="6" x2="6" y2="18"></line>
                            <line x1="6" y1="6" x2="18" y2="18"></line>
                        </svg>
                    </button>
                </div>
                <div class="video-player-container">
                    <iframe 
                        width="100%" 
                        height="500" 
                        src="${embedUrl}" 
                        frameborder="0" 
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" 
                        allowfullscreen>
                    </iframe>
                </div>
                <div class="video-details">
                    <div class="video-stats">
                        <span class="views">${HairCareModule.formatViews(video.views)} views</span>
                        <span class="separator">•</span>
                        <span class="date">${HairCareModule.formatDate(video.date)}</span>
                    </div>
                    <h3 class="video-title-detail">${video.title}</h3>
                    <p class="video-author">By ${video.author}</p>
                    <div class="video-description-full">
                        ${video.description}
                    </div>
                </div>
            `;

            // Attach close button listener
            videoPlayer.querySelector('.close-modal-btn').addEventListener('click', (e) => {
                e.preventDefault();
                modal.style.display = 'none';
            });

            modal.style.display = 'flex';
        } catch (error) {
            console.error('Error showing video:', error);
        }
    }

    // ===== EVENT LISTENERS =====

    // Close modals on background click
    window.addEventListener('click', (event) => {
        const articleModal = document.getElementById('article-modal');
        const videoModal = document.getElementById('video-modal');

        if (event.target === articleModal) {
            articleModal.style.display = 'none';
        }
        if (event.target === videoModal) {
            videoModal.style.display = 'none';
        }
    });

    // Tab switching
    const tabButtons = document.querySelectorAll('.tab-btn');
    tabButtons.forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.preventDefault();
            const tabName = btn.dataset.tab;

            tabButtons.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');

            const tabs = document.querySelectorAll('.tab-content');
            tabs.forEach(tab => {
                tab.style.display = tab.dataset.tab === tabName ? 'block' : 'none';
            });
        });
    });

    // Filter articles by category
    const categoryFilters = document.querySelectorAll('.filter-btn');
    categoryFilters.forEach(btn => {
        btn.addEventListener('click', async (e) => {
            e.preventDefault();
            const category = btn.dataset.category;

            categoryFilters.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');

            const articlesContainer = document.getElementById('articles-list');
            if (category === 'all') {
                await renderArticles();
            } else {
                try {
                    const articles = await HairCareModule.getArticles();
                    const filtered = articles.filter(a => a.category === category);
                    articlesContainer.innerHTML = '';

                    if (filtered.length === 0) {
                        articlesContainer.innerHTML = '<div class="empty-state"><p>No articles in this category.</p></div>';
                        return;
                    }

                    filtered.forEach(article => {
                        const articleCard = document.createElement('article');
                        articleCard.className = 'article-card';
                        articleCard.dataset.articleId = article.id;

                        articleCard.innerHTML = `
                            <div class="article-header">
                                <div class="article-meta">
                                    <span class="category-badge">${article.category}</span>
                                    <span class="read-time">${article.readTime} min read</span>
                                </div>
                            </div>
                            <h3 class="article-title">${article.title}</h3>
                            <p class="article-excerpt">${article.excerpt}</p>
                            <div class="article-footer">
                                <div class="article-info">
                                    <span class="author">By ${article.author}</span>
                                    <span class="date">${HairCareModule.formatDate(article.date)}</span>
                                </div>
                                <button class="read-more-btn" data-article-id="${article.id}">Read More →</button>
                            </div>
                        `;

                        articleCard.querySelector('.read-more-btn').addEventListener('click', (e) => {
                            e.preventDefault();
                            showArticleDetail(article.id);
                        });

                        articlesContainer.appendChild(articleCard);
                    });
                } catch (error) {
                    console.error('Error filtering articles:', error);
                }
            }
        });
    });

    // Initial render
    await renderArticles();
    await renderVideos();
});
