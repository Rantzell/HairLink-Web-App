import React, { useState, useEffect } from 'react';
import apiClient from '../api/client';
import type { CommunityPost, CommunityComment } from '../types';
import { useAuth } from '../contexts/AuthContext';

const CommunityFeed: React.FC = () => {
  const { user } = useAuth();
  const [posts, setPosts] = useState<CommunityPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [newPostContent, setNewPostContent] = useState('');
  const [newPostFile, setNewPostFile] = useState<File | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchPosts = async () => {
    try {
      const res = await apiClient.get('/internal-api/community/posts');
      setPosts(res.data);
    } catch (err) {
      console.error('Failed to fetch posts', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPosts();
  }, []);

  const handleCreatePost = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPostContent.trim() && !newPostFile) return;

    setIsSubmitting(true);
    const formData = new FormData();
    formData.append('content', newPostContent);
    if (newPostFile) formData.append('image', newPostFile);

    try {
      await apiClient.post('/internal-api/community/posts', formData);
      setNewPostContent('');
      setNewPostFile(null);
      fetchPosts();
    } catch (err) {
      console.error('Post creation failed', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleLike = async (postId: string) => {
    try {
      const res = await apiClient.post(`/internal-api/community/posts/${postId}/like`);
      setPosts(prev => prev.map(p => p.id === postId ? { ...p, likes: res.data.likes, is_liked: res.data.is_liked } : p));
    } catch (err) {
      console.error('Like failed', err);
    }
  };

  const handleComment = async (postId: string, content: string, parentId: string | null = null) => {
    if (!content.trim()) return;
    try {
      await apiClient.post(`/internal-api/community/posts/${postId}/comments`, { content, parent_id: parentId });
      fetchPosts();
    } catch (err) {
      console.error('Comment failed', err);
    }
  };

  if (loading) return <div className="section-wrap">Loading community feed...</div>;

  return (
    <section className="section-wrap reveal active community-page">
      <div className="section-title-block">
        <h1>Community Circle</h1>
        <p>Share your journey, updates, and encouragement with the HairLink community.</p>
      </div>

      <div className="community-layout">
        {/* Create Post */}
        <article className="create-post-box">
          <div className="post-form-header">
            <h3>Create a Post</h3>
            <p>What's on your mind? Share an update or a word of hope...</p>
          </div>
          <form className="post-form" onSubmit={handleCreatePost}>
            <textarea 
              placeholder="Start typing here..." 
              value={newPostContent}
              onChange={e => setNewPostContent(e.target.value)}
              rows={3}
              className={newPostContent.length > 0 ? 'expanded' : ''}
            ></textarea>
            <div className="post-actions-panel visible">
              <div className="image-upload-wrapper">
                <label className="image-upload-btn">
                  <i className='bx bx-image-add'></i> {newPostFile ? 'Photo Selected' : 'Add Photo'}
                  <input type="file" hidden onChange={e => setNewPostFile(e.target.files?.[0] || null)} />
                </label>
                {newPostFile && <span className="file-name-display">{newPostFile.name}</span>}
              </div>
              <div className="form-actions">
                <button type="submit" className="soft-btn" disabled={isSubmitting || (!newPostContent.trim() && !newPostFile)}>
                  {isSubmitting ? 'Posting...' : 'Share Post'}
                </button>
              </div>
            </div>
          </form>
        </article>

        {/* Posts Feed */}
        <div className="posts-feed">
          {posts.map(post => (
            <PostCard key={post.id} post={post} onLike={() => handleLike(post.id)} onComment={handleComment} />
          ))}
          {posts.length === 0 && <div className="empty-state">Be the first to share something with the community!</div>}
        </div>
      </div>
    </section>
  );
};

const PostCard: React.FC<{ post: CommunityPost; onLike: () => void; onComment: (id: string, c: string) => void }> = ({ post, onLike, onComment }) => {
  const [commentText, setCommentText] = useState('');
  const [showComments, setShowComments] = useState(false);

  return (
    <article className="community-post">
      <div className="post-header">
        <div className="post-author">
          <div className="avatar">
            {post.user?.firstName?.charAt(0) || 'U'}
          </div>
          <div className="author-info">
            <span className="author-name">{post.user?.firstName} {post.user?.lastName}</span>
            <span className="post-time">{new Date(post.createdAt).toLocaleDateString()} · <span className={`user-badge ${post.user?.role === 'donor' ? 'donor-badge' : 'recipient-badge'}`}>{post.user?.role}</span></span>
          </div>
        </div>
      </div>

      <div className="post-content">
        {post.content}
      </div>

      {post.imageUrl && (
        <img src={post.imageUrl} alt="Post" className="post-image" />
      )}

      <div className="post-stats">
        <span className="likes-count"><i className='bx bxs-heart'></i> {post.likes} Likes</span>
        <span className="comments-count"><i className='bx bxs-comment'></i> {post.comments?.length || 0} Comments</span>
      </div>

      <div className="post-interactions">
        <button onClick={onLike} className="like-btn" style={{ color: post.is_liked ? '#cf2f84' : '' }}>
          <i className={`bx ${post.is_liked ? 'bxs-heart' : 'bx-heart'}`}></i> {post.is_liked ? 'Liked' : 'Like'}
        </button>
        <button onClick={() => setShowComments(!showComments)} className="comment-toggle-btn">
          <i className='bx bx-comment'></i> Comment
        </button>
      </div>

      {showComments && (
        <div className="comments-section">
          <div className="comment-form">
            <input 
              type="text" 
              placeholder="Write a comment..." 
              value={commentText}
              onChange={e => setCommentText(e.target.value)}
              className="comment-input"
              onKeyPress={e => e.key === 'Enter' && (onComment(post.id, commentText), setCommentText(''))}
            />
            <button className="submit-comment-btn" onClick={() => { onComment(post.id, commentText); setCommentText(''); }}>Post</button>
          </div>

          <div className="comments-list">
            {post.comments?.map(comment => (
              <div key={comment.id} className="comment">
                <div className="comment-header">
                  <div className="comment-author">
                    <div className="comment-avatar">
                      {comment.user?.firstName?.charAt(0)}
                    </div>
                    <span className="comment-name">{comment.user?.firstName} {comment.user?.lastName}</span>
                  </div>
                  <span className="comment-time">{new Date(comment.createdAt).toLocaleDateString()}</span>
                </div>
                <div className="comment-content">{comment.content}</div>
              </div>
            ))}
            {(!post.comments || post.comments.length === 0) && <div className="no-comments">No comments yet.</div>}
          </div>
        </div>
      )}
    </article>
  );
};

export default CommunityFeed;
