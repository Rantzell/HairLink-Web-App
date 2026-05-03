// Hair Care Module - Manages articles, videos, and resources

const HairCareModule = {
    /**
     * Helper to get CSRF token
     */
    getCsrfToken() {
        return document.querySelector('meta[name="csrf-token"]')?.getAttribute('content');
    },

    /**
     * Generic API call wrapper
     */
    async apiCall(url, method = 'GET', body = null) {
        const options = {
            method,
            headers: {
                'Accept': 'application/json',
                'X-CSRF-TOKEN': this.getCsrfToken()
            }
        };

        if (body) {
            options.headers['Content-Type'] = 'application/json';
            options.body = JSON.stringify(body);
        }

        const response = await fetch(url, options);
        if (!response.ok) {
            throw new Error(`API Error: ${response.status} ${response.statusText}`);
        }
        return await response.json();
    },

    /**
     * Map backend article to frontend expectations
     */
    mapArticle(article) {
        return {
            ...article,
            date: article.created_at,
            readTime: article.read_time
        };
    },

    // Get all articles
    async getArticles() {
        const data = await this.apiCall('/internal-api/haircare/articles');
        return data.map(article => this.mapArticle(article));
    },

    // Get single article
    async getArticle(articleId) {
        const data = await this.apiCall(`/internal-api/haircare/articles/${articleId}`);
        return this.mapArticle(data);
    },

    // Get all videos
    async getVideos() {
        const data = await this.apiCall('/internal-api/haircare/videos');
        return data.map(video => ({
            ...video,
            date: video.created_at,
            videoId: video.video_id
        }));
    },

    // Get single video
    async getVideo(videoId) {
        const videos = await this.getVideos();
        return videos.find(v => v.id == videoId || v.videoId == videoId);
    },

    // Get video embed URL
    getEmbedUrl(video) {
        if (video.source === 'youtube') {
            return `https://www.youtube.com/embed/${video.videoId}`;
        } else if (video.source === 'vimeo') {
            return `https://player.vimeo.com/video/${video.videoId}`;
        } else if (video.source === 'custom') {
            return video.videoId;
        }
        return '';
    },

    // Format date
    formatDate(timestamp) {
        if (!timestamp) return '';
        const date = new Date(timestamp);
        return date.toLocaleDateString('en-US', { 
            year: 'numeric', 
            month: 'short', 
            day: 'numeric' 
        });
    },

    // Format view count
    formatViews(views) {
        if (views >= 1000000) return (views / 1000000).toFixed(1) + 'M';
        if (views >= 1000) return (views / 1000).toFixed(1) + 'K';
        return views.toString();
    }
};

// Expose to window
window.HairCareModule = HairCareModule;
