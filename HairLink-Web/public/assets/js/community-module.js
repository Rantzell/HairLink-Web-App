// Community Module - Manages posts, comments, and community interactions

const CommunityModule = {
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
     * Map backend post to frontend expectations
     */
    mapPost(post) {
        return {
            ...post,
            author: post.user?.name || 'Anonymous',
            userType: post.user?.role || 'user',
            avatar: this.generateAvatar(post.user?.name || 'Anonymous'),
            timestamp: post.created_at,
            comments: (post.comments || []).map(comment => ({
                ...comment,
                author: comment.user?.name || 'Anonymous',
                userType: comment.user?.role || 'user',
                avatar: this.generateAvatar(comment.user?.name || 'Anonymous'),
                timestamp: comment.created_at
            }))
        };
    },

    // Get all posts
    async getPosts() {
        const data = await this.apiCall('/internal-api/community/posts');
        return data.map(post => this.mapPost(post));
    },

    // Get single post
    async getPost(postId) {
        const posts = await this.getPosts();
        return posts.find(p => p.id === postId);
    },

    // Create new post
    async createPost(content) {
        const data = await this.apiCall('/internal-api/community/posts', 'POST', { content });
        return this.mapPost(data);
    },

    // Add comment to post
    async addComment(postId, content) {
        const data = await this.apiCall(`/internal-api/community/posts/${postId}/comments`, 'POST', { content });
        return {
            ...data,
            author: data.user?.name || 'Anonymous',
            userType: data.user?.role || 'user',
            avatar: this.generateAvatar(data.user?.name || 'Anonymous'),
            timestamp: data.created_at
        };
    },

    // Like post
    async toggleLike(postId) {
        const data = await this.apiCall(`/internal-api/community/posts/${postId}/like`, 'POST');
        return data;
    },

    // Generate avatar from name
    generateAvatar(name) {
        const parts = name.split(' ');
        if (parts.length >= 2) {
            return parts[0].charAt(0) + parts[1].charAt(0);
        }
        return name.substring(0, 2).toUpperCase();
    },

    // Format timestamp
    formatTime(timestamp) {
        const date = new Date(timestamp);
        const now = new Date();
        const diff = now - date;
        
        const minutes = Math.floor(diff / 60000);
        const hours = Math.floor(diff / 3600000);
        const days = Math.floor(diff / 86400000);
        
        if (minutes < 1) return 'Just now';
        if (minutes < 60) return `${minutes}m ago`;
        if (hours < 24) return `${hours}h ago`;
        if (days < 7) return `${days}d ago`;
        
        return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    }
};

// Expose to window
window.CommunityModule = CommunityModule;
