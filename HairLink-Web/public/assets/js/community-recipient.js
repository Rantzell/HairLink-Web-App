// Recipient Community Page Handler

document.addEventListener('DOMContentLoaded', () => {
    // Note: We'll use the server-side Auth data where possible, 
    // but the JS currently expects these variables.
    const currentUserElement = document.getElementById('greeting-title');
    const userName = currentUserElement ? currentUserElement.dataset.name : 'Recipient';
    
    const currentUser = {
        name: userName
    };

    // Render posts feed
    async function renderPosts() {
        const feedContainer = document.getElementById('posts-feed');
        if (!feedContainer) return;

        feedContainer.innerHTML = '<div class="loading-state"><p>Loading community posts...</p></div>';

        try {
            const posts = await CommunityModule.getPosts();
            feedContainer.innerHTML = '';

            if (posts.length === 0) {
                feedContainer.innerHTML = '<div class="empty-state"><p>No posts yet. Be the first to share!</p></div>';
                return;
            }

            posts.forEach(post => {
                const postElement = createPostElement(post, currentUser);
                feedContainer.appendChild(postElement);
            });
        } catch (error) {
            console.error('Error rendering posts:', error);
            feedContainer.innerHTML = '<div class="error-state"><p>Failed to load posts. Please try again later.</p></div>';
        }
    }

    // Create post element
    function createPostElement(post, currentUser) {
        const postDiv = document.createElement('div');
        postDiv.className = 'community-post';
        postDiv.dataset.postId = post.id;

        const userBadge = post.userType === 'donor' 
            ? '<span class="user-badge donor-badge">Donor</span>'
            : '<span class="user-badge recipient-badge">Recipient</span>';

        // Check if current user is the author (simplified check)
        let actionsHTML = '';
        if (post.author === currentUser.name) {
            actionsHTML = `
                <button class="delete-post-btn" data-post-id="${post.id}" disabled title="Deletion via API not yet implemented">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2m3 0v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V6h16z"></path>
                    </svg>
                </button>
            `;
        }

        postDiv.innerHTML = `
            <div class="post-header">
                <div class="post-author">
                    <div class="avatar">${post.avatar}</div>
                    <div class="author-info">
                        <div class="author-name">${post.author}</div>
                        <div class="post-time">${CommunityModule.formatTime(post.timestamp)}</div>
                    </div>
                </div>
                <div class="post-actions">
                    ${userBadge}
                    ${actionsHTML}
                </div>
            </div>

            <div class="post-content">
                ${post.content}
            </div>

            <div class="post-stats">
                <span class="likes-count"><svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path></svg> <span class="count">${post.likes}</span></span>
                <span class="comments-count"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path></svg> ${post.comments.length}</span>
            </div>

            <div class="post-interactions">
                <button class="like-btn ${post.is_liked ? 'active' : ''}" data-post-id="${post.id}">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="${post.is_liked ? 'currentColor' : 'none'}" stroke="currentColor" stroke-width="2">
                        <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path>
                    </svg>
                    ${post.is_liked ? 'Liked' : 'Like'}
                </button>
                <button class="comment-toggle-btn" data-post-id="${post.id}">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
                    </svg>
                    Comment
                </button>
            </div>

            <div class="comments-section" style="display: none;">
                <div class="comments-list"></div>
                <div class="comment-form">
                    <input type="text" class="comment-input" placeholder="Write a comment..." data-post-id="${post.id}">
                    <button class="submit-comment-btn" data-post-id="${post.id}">Post</button>
                </div>
            </div>
        `;

        // Attach event listeners
        attachPostEventListeners(postDiv, post.id, post);

        return postDiv;
    }

    // Attach event listeners to post
    function attachPostEventListeners(postElement, postId, post) {
        // Like button
        postElement.querySelector('.like-btn')?.addEventListener('click', async (e) => {
            e.preventDefault();
            const btn = e.currentTarget;
            try {
                const data = await CommunityModule.toggleLike(postId);
                const likesCount = postElement.querySelector('.likes-count .count');
                if (likesCount) likesCount.textContent = data.likes;
                
                if (data.is_liked) {
                    btn.classList.add('active');
                    btn.innerHTML = `
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" stroke-width="2">
                            <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path>
                        </svg>
                        Liked
                    `;
                } else {
                    btn.classList.remove('active');
                    btn.innerHTML = `
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path>
                        </svg>
                        Like
                    `;
                }
            } catch (error) {
                console.error('Error liking post:', error);
            }
        });

        // Comment toggle
        postElement.querySelector('.comment-toggle-btn')?.addEventListener('click', (e) => {
            e.preventDefault();
            const section = postElement.querySelector('.comments-section');
            const isVisible = section.style.display === 'block';
            section.style.display = isVisible ? 'none' : 'block';
            
            if (!isVisible) {
                renderComments(post.comments, postElement.querySelector('.comments-list'));
                postElement.querySelector('.comment-input')?.focus();
            }
        });

        // Submit comment
        postElement.querySelector('.submit-comment-btn')?.addEventListener('click', async (e) => {
            e.preventDefault();
            const input = postElement.querySelector('.comment-input');
            const content = input.value.trim();
            
            if (content) {
                try {
                    const newComment = await CommunityModule.addComment(postId, content);
                    post.comments.push(newComment);
                    renderComments(post.comments, postElement.querySelector('.comments-list'));
                    input.value = '';
                    
                    const commentCount = postElement.querySelector('.comments-count');
                    if (commentCount) {
                        commentCount.innerHTML = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path></svg> ${post.comments.length}`;
                    }
                } catch (error) {
                    console.error('Error adding comment:', error);
                }
            }
        });
    }

    // Render comments for a post
    function renderComments(comments, container) {
        container.innerHTML = '';

        if (!comments || comments.length === 0) {
            container.innerHTML = '<div class="no-comments"><p>No comments yet.</p></div>';
            return;
        }

        comments.forEach(comment => {
            const commentDiv = document.createElement('div');
            commentDiv.className = 'comment';

            const userBadge = comment.userType === 'donor'
                ? '<span class="comment-badge donor-badge">Donor</span>'
                : '<span class="comment-badge recipient-badge">Recipient</span>';

            commentDiv.innerHTML = `
                <div class="comment-header">
                    <div class="comment-author">
                        <span class="comment-avatar">${comment.avatar}</span>
                        <div>
                            <div class="comment-name">${comment.author}</div>
                            <div class="comment-time">${CommunityModule.formatTime(comment.timestamp)}</div>
                        </div>
                    </div>
                    <div class="comment-menu">
                        ${userBadge}
                    </div>
                </div>
                <div class="comment-content">${comment.content}</div>
            `;

            container.appendChild(commentDiv);
        });
    }

    // Create post form handler
    const postForm = document.getElementById('create-post-form');
    if (postForm) {
        postForm.addEventListener('submit', async (e) => {
            e.preventDefault();

            const textarea = postForm.querySelector('textarea');
            const content = textarea.value.trim();
            const submitBtn = postForm.querySelector('button[type="submit"]');

            if (content) {
                if (submitBtn) submitBtn.disabled = true;
                try {
                    await CommunityModule.createPost(content);
                    textarea.value = '';
                    await renderPosts();
                } catch (error) {
                    console.error('Error creating post:', error);
                    alert('Failed to share post. Please try again.');
                } finally {
                    if (submitBtn) submitBtn.disabled = false;
                }
            }
        });
    }

    // Initial render
    renderPosts();
});
