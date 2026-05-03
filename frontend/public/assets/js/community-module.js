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
            if (body instanceof FormData) {
                options.body = body;
            } else {
                options.headers['Content-Type'] = 'application/json';
                options.body = JSON.stringify(body);
            }
        }

        const response = await fetch(url, options);
        if (!response.ok) {
            let errorMessage = `API Error: ${response.status} ${response.statusText}`;
            try {
                const errorData = await response.json();
                if (errorData.message) errorMessage = errorData.message;
            } catch (e) {}
            throw new Error(errorMessage);
        }

        const contentType = response.headers.get('content-type');
        if (contentType && contentType.includes('application/json')) {
            return await response.json();
        }
        return await response.text();
    },

    /**
     * Map backend post to frontend expectations
     */
    mapPost(post) {
        return {
            ...post,
            author: post.user?.name || 'Anonymous',
            userType: post.user?.role || 'user',
            avatar: post.user?.profile_photo_url ? `<img src="${post.user.profile_photo_url}" alt="Avatar" style="width:100%;height:100%;border-radius:50%;object-fit:cover;">` : this.generateAvatar(post.user?.name || 'Anonymous'),
            image_url: post.full_image_url || null,
            timestamp: post.created_at,
            comments: (Array.isArray(post.comments) ? post.comments : Object.values(post.comments || {})).map(comment => this.mapComment(comment))
        };
    },

    /**
     * Map comment with nested replies
     */
    mapComment(comment) {
        return {
            ...comment,
            author: comment.user?.name || 'Anonymous',
            userType: comment.user?.role || 'user',
            avatar: comment.user?.profile_photo_url ? `<img src="${comment.user.profile_photo_url}" alt="Avatar" style="width:100%;height:100%;border-radius:50%;object-fit:cover;">` : this.generateAvatar(comment.user?.name || 'Anonymous'),
            timestamp: comment.created_at,
            replies: (Array.isArray(comment.replies) ? comment.replies : Object.values(comment.replies || {})).map(reply => ({
                ...reply,
                author: reply.user?.name || 'Anonymous',
                userType: reply.user?.role || 'user',
                avatar: reply.user?.profile_photo_url ? `<img src="${reply.user.profile_photo_url}" alt="Avatar" style="width:100%;height:100%;border-radius:50%;object-fit:cover;">` : this.generateAvatar(reply.user?.name || 'Anonymous'),
                timestamp: reply.created_at
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
    async createPost(formDataOrContent) {
        const data = await this.apiCall('/internal-api/community/posts', 'POST', formDataOrContent);
        return this.mapPost(data);
    },

    // Add comment to post
    async addComment(postId, formDataOrContent) {
        const data = await this.apiCall(`/internal-api/community/posts/${postId}/comments`, 'POST', formDataOrContent);
        return this.mapComment(data);
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
