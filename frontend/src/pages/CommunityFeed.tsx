import React, { useState, useEffect, useRef } from 'react';
import apiClient from '../api/client';
import type { CommunityPost } from '../types';
import { useAuth } from '../contexts/AuthContext';

/* ─── topic helpers ──────────────────────────────────── */
const TOPIC_PREFIX = '[TOPIC:';
const TOPIC_SUFFIX = ']';

/** Encode topic into the stored content string */
function encodeTopicInContent(topic: string, title: string, body: string): string {
  const topicTag = `${TOPIC_PREFIX}${topic}${TOPIC_SUFFIX}`;
  if (title.trim()) {
    return `${topicTag}\n**${title.trim()}**\n\n${body.trim()}`;
  }
  return `${topicTag}\n${body.trim()}`;
}

/** Extract topic, optional title, and body from stored content */
function decodePost(content: string): { topic: string; title: string | null; body: string } {
  let rest = content ?? '';
  let topic = 'all';

  // Extract topic tag
  if (rest.startsWith(TOPIC_PREFIX)) {
    const end = rest.indexOf(TOPIC_SUFFIX);
    if (end !== -1) {
      topic = rest.slice(TOPIC_PREFIX.length, end).toLowerCase();
      rest  = rest.slice(end + TOPIC_SUFFIX.length).trimStart();
    }
  }

  // Extract bold title
  const titleMatch = rest.match(/^\*\*(.+?)\*\*\n\n([\s\S]*)$/);
  if (titleMatch) {
    return { topic, title: titleMatch[1], body: titleMatch[2] };
  }
  return { topic, title: null, body: rest };
}

/** Strip bold/italic markdown markers so raw asterisks never appear */
function stripMarkdown(text: string): string {
  return text
    .replace(/\*\*\*(.+?)\*\*\*/g, '$1')  // bold+italic
    .replace(/\*\*(.+?)\*\*/g, '$1')       // bold
    .replace(/\*(.+?)\*/g, '$1')           // italic
    .replace(/___(.+?)___/g, '$1')
    .replace(/__(.+?)__/g, '$1')
    .replace(/_(.+?)_/g, '$1');
}

/* ─── helpers ─────────────────────────────────────────── */
function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return 'just now';
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  if (d < 7) return `${d}d ago`;
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

const ROLE_COLORS: Record<string, { bg: string; color: string; label: string }> = {
  donor:     { bg: '#eef3ff', color: '#3b66d4', label: 'Donor' },
  recipient: { bg: '#fef2fb', color: '#cf2f84', label: 'Recipient' },
  staff:     { bg: '#f0fdf4', color: '#15803d', label: 'Staff' },
  wigmaker:  { bg: '#fff7ed', color: '#c05621', label: 'Wigmaker' },
  admin:     { bg: '#f5f3ff', color: '#6d28d9', label: 'Admin' },
};

const CATEGORIES = ['Stories', 'Questions', 'Updates'];

/* ─── types ──────────────────────────────────────────── */
type SortMode = 'new' | 'top';
type FilterMode = 'all' | string;

/* ═══════════════════════════════════════════════════════
   MAIN PAGE
═══════════════════════════════════════════════════════ */
const CommunityFeed: React.FC = () => {
  const { user } = useAuth();
  const [posts, setPosts]           = useState<CommunityPost[]>([]);
  const [loading, setLoading]       = useState(true);
  const [filter, setFilter]         = useState<FilterMode>('all');
  const [sort, setSort]             = useState<SortMode>('new');

  /* create-post modal */
  const [modalOpen, setModalOpen]   = useState(false);
  const [newContent, setNewContent] = useState('');
  const [newTitle,   setNewTitle]   = useState('');
  const [newCategory, setNewCategory] = useState('Stories');
  const [newFile,    setNewFile]    = useState<File | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  /* category dropdown inside modal */
  const [catOpen, setCatOpen] = useState(false);

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

  useEffect(() => { fetchPosts(); }, []);

  /* close modal on Escape */
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setModalOpen(false); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const handleCreatePost = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newContent.trim())  { alert('Please write something before publishing.'); return; }

    setIsSubmitting(true);
    const formData = new FormData();
    // Embed topic tag + optional title so filtering and display work reliably
    const fullContent = encodeTopicInContent(newCategory, newTitle, newContent);
    formData.append('content', fullContent);
    if (newFile) formData.append('image', newFile);

    try {
      await apiClient.post('/internal-api/community/posts', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      setNewContent(''); setNewTitle(''); setNewFile(null); setNewCategory('Stories');
      setModalOpen(false);
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
      setPosts(prev => prev.map(p =>
        p.id === postId ? { ...p, likes: res.data.likes, is_liked: res.data.is_liked } : p
      ));
    } catch (err) { console.error('Like failed', err); }
  };

  const handleComment = async (postId: string, content: string) => {
    if (!content.trim()) return;
    try {
      await apiClient.post(`/internal-api/community/posts/${postId}/comments`, { content, parent_id: null });
      fetchPosts();
    } catch (err) { console.error('Comment failed', err); }
  };

  /* Filter + sort — topic is decoded from stored content prefix */
  const filteredPosts = posts
    .filter(p => {
      if (filter === 'all') return true;
      const { topic } = decodePost(p.content ?? '');
      return topic === filter.toLowerCase();
    })
    .sort((a, b) =>
      sort === 'top'
        ? (b.likes || 0) - (a.likes || 0)
        : new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );

  const roleInfo = user ? (ROLE_COLORS[user.role] ?? ROLE_COLORS.donor) : ROLE_COLORS.donor;
  const initials = user
    ? `${user.firstName?.[0] ?? ''}${user.lastName?.[0] ?? ''}`.toUpperCase() || 'U'
    : 'U';

  return (
    <div className="cf-root">

      {/* ── HERO ── */}
      <header className="cf-hero">
        <div className="cf-hero-inner">
          <div>
            <h1 className="cf-hero-title">Hairlink community</h1>
            <p className="cf-hero-sub">
              Share your journey, celebrate others, ask questions, and find support from people<br className="cf-hero-br" /> who truly understand.
            </p>
          </div>
          <button className="cf-create-btn" onClick={() => setModalOpen(true)}>
            <span className="cf-create-plus">+</span> Create Post
          </button>
        </div>
      </header>

      {/* ── FILTER / SORT BAR ── */}
      <div className="cf-toolbar">
        <div className="cf-toolbar-inner">
          <div className="cf-filter-pills">
            {(['all', ...CATEGORIES] as const).map(f => (
              <button
                key={f}
                className={`cf-pill${filter === f ? ' active' : ''}`}
                onClick={() => setFilter(f as FilterMode)}
              >
                {f === 'all' ? 'All' : f}
              </button>
            ))}
          </div>
          <div className="cf-sort-pills">
            {(['new', 'top'] as const).map(s => (
              <button
                key={s}
                className={`cf-pill${sort === s ? ' active' : ''}`}
                onClick={() => setSort(s)}
              >
                {s.charAt(0).toUpperCase() + s.slice(1)}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ── FEED ── */}
      <div className="cf-feed-wrap">
        {loading ? (
          <div className="cf-loading">
            <div className="cf-spinner" /><span>Loading community feed…</span>
          </div>
        ) : filteredPosts.length === 0 ? (
          <div className="cf-empty">
            <div className="cf-empty-icon">💬</div>
            <p>Be the first to share something with the community!</p>
            <button className="cf-create-btn" style={{ marginTop: '1rem' }} onClick={() => setModalOpen(true)}>
              + Create Post
            </button>
          </div>
        ) : (
          filteredPosts.map(post => (
            <PostCard
              key={post.id}
              post={post}
              onLike={() => handleLike(post.id)}
              onComment={handleComment}
            />
          ))
        )}
      </div>

      {/* ── CREATE POST MODAL ── */}
      {modalOpen && (
        <div className="cf-modal-overlay" onClick={e => { if (e.target === e.currentTarget) setModalOpen(false); }}>
          <div className="cf-modal">
            {/* Modal header */}
            <div className="cf-modal-head">
              <span className="cf-modal-title">Create a Post</span>
              <button className="cf-modal-close" onClick={() => setModalOpen(false)}>✕</button>
            </div>

            <form onSubmit={handleCreatePost}>
              {/* Category dropdown */}
              <div className="cf-modal-field">
                <div className="cf-custom-select" onClick={() => setCatOpen(v => !v)}>
                  <span>{newCategory}</span>
                  <span className="cf-select-arrow">{catOpen ? '⌃' : '⌄'}</span>
                </div>
                {catOpen && (
                  <div className="cf-select-dropdown">
                    {CATEGORIES.map(c => (
                      <div
                        key={c}
                        className={`cf-select-option${newCategory === c ? ' selected' : ''}`}
                        onClick={() => { setNewCategory(c); setCatOpen(false); }}
                      >
                        {c}
                        {newCategory === c && <span className="cf-select-check">✓</span>}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Title */}
              <div className="cf-modal-field">
                <input
                  className="cf-modal-input"
                  placeholder="Post Title.."
                  value={newTitle}
                  onChange={e => setNewTitle(e.target.value)}
                />
              </div>

              {/* Content */}
              <div className="cf-modal-field">
                <textarea
                  className="cf-modal-textarea"
                  placeholder="Share your thoughts with this community..."
                  rows={5}
                  value={newContent}
                  onChange={e => setNewContent(e.target.value)}
                />
              </div>

              {/* Image preview */}
              {newFile && (
                <div className="cf-modal-preview">
                  <img src={URL.createObjectURL(newFile)} alt="preview" />
                  <button type="button" className="cf-modal-remove-img" onClick={() => setNewFile(null)}>✕</button>
                  <span className="cf-modal-img-name">{newFile.name}</span>
                </div>
              )}

              {/* Footer actions */}
              <div className="cf-modal-footer">
                <button
                  type="button"
                  className="cf-add-photo-btn"
                  onClick={() => fileRef.current?.click()}
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                    <rect x="3" y="3" width="18" height="18" rx="3"/>
                    <circle cx="8.5" cy="8.5" r="1.5"/>
                    <polyline points="21 15 16 10 5 21"/>
                  </svg>
                  Add Photo
                </button>
                <input
                  ref={fileRef}
                  type="file"
                  hidden
                  accept="image/*"
                  onChange={e => { setNewFile(e.target.files?.[0] || null); if (fileRef.current) fileRef.current.value = ''; }}
                />

                <button
                  type="submit"
                  className="cf-publish-btn"
                  disabled={isSubmitting || !newContent.trim()}
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/>
                  </svg>
                  {isSubmitting ? 'Publishing…' : 'Publish'}
                </button>
              </div>
            </form>

            {/* User row at bottom */}
            {user && (
              <div className="cf-modal-user-row">
                <div className="cf-avatar" style={{ width: 30, height: 30, fontSize: '0.72rem' }}>{initials}</div>
                <div>
                  <span className="cf-modal-user-name">{user.firstName} {user.lastName?.[0]}.</span>
                  <span className="cf-role-badge" style={{ background: roleInfo.bg, color: roleInfo.color }}>
                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
                    {roleInfo.label}
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

/* ═══════════════════════════════════════════════════════
   POST CARD
═══════════════════════════════════════════════════════ */
const PostCard: React.FC<{
  post: CommunityPost;
  onLike: () => void;
  onComment: (id: string, content: string) => void;
}> = ({ post, onLike, onComment }) => {
  const [commentText, setCommentText] = useState('');
  const [showComments, setShowComments] = useState(false);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const commentInputRef = useRef<HTMLInputElement>(null);

  /* Close lightbox on Escape */
  useEffect(() => {
    if (!lightboxOpen) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setLightboxOpen(false); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [lightboxOpen]);

  const roleInfo = post.user?.role
    ? (ROLE_COLORS[post.user.role] ?? ROLE_COLORS.donor)
    : ROLE_COLORS.donor;

  const initials = post.user
    ? `${post.user.firstName?.[0] ?? ''}${post.user.lastName?.[0] ?? ''}`.toUpperCase() || 'U'
    : 'U';

  /* Decode topic, title and body — strip any residual markdown markers */
  const { topic: postTopic, title: rawTitle, body: rawBody } = decodePost(post.content ?? '');
  const displayTitle   = rawTitle   ? stripMarkdown(rawTitle)   : null;
  const displayContent = rawBody    ? stripMarkdown(rawBody)    : '';
  const topicLabel = postTopic !== 'all' ? postTopic.charAt(0).toUpperCase() + postTopic.slice(1) : null;

  const submitComment = () => {
    if (!commentText.trim()) return;
    onComment(post.id, commentText);
    setCommentText('');
  };

  return (
    <article className="cf-card">
      {/* Vote strip (left gutter) */}
      <div className="cf-vote-strip">
        <button
          className={`cf-vote-btn up${post.is_liked ? ' voted' : ''}`}
          onClick={onLike}
          title={post.is_liked ? 'Unlike' : 'Like'}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill={post.is_liked ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2">
            <polyline points="18 15 12 9 6 15"/>
          </svg>
        </button>
        <span className="cf-vote-count" style={{ color: post.is_liked ? '#cf2f84' : undefined }}>
          {post.likes || 0}
        </span>
        <button className="cf-vote-btn down" title="Downvote">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polyline points="6 9 12 15 18 9"/>
          </svg>
        </button>
      </div>

      {/* Main content */}
      <div className="cf-card-body">
        {/* Author row */}
        <div className="cf-author-row">
          <div className="cf-avatar">{initials}</div>
          <span className="cf-author-name">
            {post.user?.firstName} {post.user?.lastName?.[0]}.
          </span>
          <span className="cf-role-badge" style={{ background: roleInfo.bg, color: roleInfo.color }}>
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
            {roleInfo.label}
          </span>
          {topicLabel && (
            <span className="cf-topic-badge">{topicLabel}</span>
          )}
          <span className="cf-timestamp">{timeAgo(post.createdAt)}</span>
        </div>

        {/* Content */}
        {displayTitle && <h3 className="cf-post-title">{displayTitle}</h3>}
        <p className="cf-post-content">{displayContent}</p>

        {/* Image — click to open lightbox */}
        {post.imageUrl && (
          <div className="cf-post-img-wrap" onClick={() => setLightboxOpen(true)} title="Click to enlarge">
            <img src={post.imageUrl} alt="post" className="cf-post-img" />
            <div className="cf-img-expand-hint">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polyline points="15 3 21 3 21 9"/><polyline points="9 21 3 21 3 15"/>
                <line x1="21" y1="3" x2="14" y2="10"/><line x1="3" y1="21" x2="10" y2="14"/>
              </svg>
            </div>
          </div>
        )}

        {/* Lightbox */}
        {lightboxOpen && post.imageUrl && (
          <div
            className="cf-lightbox-overlay"
            onClick={() => setLightboxOpen(false)}
          >
            <button className="cf-lightbox-close" onClick={() => setLightboxOpen(false)} aria-label="Close">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
              </svg>
            </button>
            <div className="cf-lightbox-content" onClick={e => e.stopPropagation()}>
              <img src={post.imageUrl} alt="Full size" className="cf-lightbox-img" />
            </div>
          </div>
        )}

        {/* Action bar */}
        <div className="cf-action-bar">
          <button
            className={`cf-action-btn like${post.is_liked ? ' active' : ''}`}
            onClick={onLike}
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill={post.is_liked ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2">
              <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
            </svg>
            {post.is_liked ? 'Liked' : 'Like'} · {post.likes || 0}
          </button>

          <button
            className="cf-action-btn comment"
            onClick={() => {
              setShowComments(v => !v);
              setTimeout(() => commentInputRef.current?.focus(), 120);
            }}
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
            </svg>
            {post.comments?.length || 0} comments
          </button>
        </div>

        {/* Comments panel */}
        {showComments && (
          <div className="cf-comments-panel">
            {/* Comment input */}
            <div className="cf-comment-input-row">
              <input
                ref={commentInputRef}
                className="cf-comment-input"
                placeholder="Write a comment…"
                value={commentText}
                onChange={e => setCommentText(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && submitComment()}
              />
              <button
                className="cf-comment-submit"
                onClick={submitComment}
                disabled={!commentText.trim()}
              >
                Post
              </button>
            </div>

            {/* Comments list */}
            <div className="cf-comments-list">
              {(!post.comments || post.comments.length === 0) ? (
                <p className="cf-no-comments">No comments yet — be the first!</p>
              ) : (
                post.comments.map(c => {
                  const cInit = `${c.user?.firstName?.[0] ?? ''}${c.user?.lastName?.[0] ?? ''}`.toUpperCase() || 'U';
                  return (
                    <div key={c.id} className="cf-comment">
                      <div className="cf-comment-avatar">{cInit}</div>
                      <div className="cf-comment-bubble">
                        <span className="cf-comment-author">{c.user?.firstName} {c.user?.lastName?.[0]}.</span>
                        <span className="cf-comment-time">{timeAgo(c.createdAt)}</span>
                        <p className="cf-comment-text">{c.content}</p>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        )}
      </div>
    </article>
  );
};

export default CommunityFeed;
