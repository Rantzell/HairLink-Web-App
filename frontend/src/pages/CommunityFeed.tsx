import toast from 'react-hot-toast';
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { useSearchParams } from 'react-router-dom';
import apiClient from '../api/client';
import type { CommunityPost } from '../types';
import { useAuth } from '../contexts/AuthContext';

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

  // Extract bold title. Use [\s\S]* to catch newlines, and match \r or \n robustly.
  const titleMatch = rest.match(/^\*\*(.+?)\*\*(?:[\r\n]+([\s\S]*))?$/);
  if (titleMatch) {
    return { topic, title: titleMatch[1], body: titleMatch[2] || '' };
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

type SortMode = 'new' | 'top';
type FilterMode = 'all' | string;

const CommunityFeed: React.FC = () => {
  const { user } = useAuth();
  const [searchParams] = useSearchParams();
  const targetPostId = searchParams.get('postId');

  const [posts, setPosts]           = useState<CommunityPost[]>([]);
  const [loading, setLoading]       = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [filter, setFilter]         = useState<FilterMode>('all');
  const [sort, setSort]             = useState<SortMode>('new');
  const [highlightedPostId, setHighlightedPostId] = useState<string | null>(null);

  // Ref map: postId → DOM element, so we can scroll to it
  const postRefs = useRef<Record<string, HTMLElement | null>>({});
  const createPostRef = useRef<HTMLDivElement>(null);

  /* create-post form */
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newContent, setNewContent] = useState('');
  const [newTitle,   setNewTitle]   = useState('');
  const [newCategory, setNewCategory] = useState('Stories');
  const [newFile,    setNewFile]    = useState<File | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  /* category dropdown inside modal */
  const [catOpen, setCatOpen] = useState(false);

  const fetchPosts = useCallback(async () => {
    setFetchError(null);
    try {
      const res = await apiClient.get('/internal-api/community/posts');
      setPosts(res.data);
    } catch (err: any) {
      console.error('Failed to fetch posts', err);
      const msg = err?.response?.data?.message || err?.response?.data?.error || err?.message || 'Could not load posts.';
      setFetchError(msg);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchPosts(); }, [fetchPosts]);

  // Scroll to and highlight the target post once posts have loaded
  useEffect(() => {
    if (!targetPostId || loading) return;
    const el = postRefs.current[targetPostId];
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      setHighlightedPostId(targetPostId);
      // Remove highlight after 3 seconds
      const t = setTimeout(() => setHighlightedPostId(null), 3000);
      return () => clearTimeout(t);
    }
  }, [targetPostId, loading, posts]);

  const handleCreatePost = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newContent.trim())  { toast.success('Please write something before publishing.'); return; }

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
      setShowCreateForm(false);
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
      await apiClient.post(`/internal-api/community/posts/${postId}/comments`, { content });
      fetchPosts();
    } catch (err) {
      console.error('Comment failed', err);
      toast.error('Could not post comment');
    }
  };

  const handleEditPost = async (postId: string, newContent: string) => {
    try {
      const res = await apiClient.put(`/internal-api/community/posts/${postId}`, { content: newContent });
      toast.success('Post updated');
      setPosts(prev => prev.map(p => p.id === postId ? res.data : p));
    } catch (err) {
      console.error('Update failed', err);
      toast.error('Could not update post');
    }
  };

  const handleDeletePost = async (postId: string) => {
    try {
      await apiClient.delete(`/internal-api/community/posts/${postId}`);
      toast.success('Post deleted successfully');
      setPosts(prev => prev.filter(p => p.id !== postId));
    } catch (err) {
      console.error('Delete failed', err);
      toast.error('Could not delete post');
    }
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

      {}
      <header className="cf-hero">
        <div className="cf-hero-inner">
          <div>
            <h1 className="cf-hero-title">Hairlink community</h1>
            <p className="cf-hero-sub">
              Share your journey, celebrate others, ask questions, and find support from people<br className="cf-hero-br" /> who truly understand.
            </p>
          </div>
          <button className="cf-create-btn" onClick={() => setShowCreateForm(v => !v)}>
            <span className="cf-create-plus">+</span> {showCreateForm ? 'Cancel' : 'Create Post'}
          </button>
        </div>
      </header>

      {}
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

      {}
      <div className="cf-feed-wrap">
        {}
        {showCreateForm && (
          <div className="cf-card cf-create-post-card" ref={createPostRef} style={{ marginBottom: '2rem', display: 'flex', flexDirection: 'column' }}>
          <div className="cf-modal-head">
            <span className="cf-modal-title">Create a Post</span>
          </div>

          <div className="cf-modal-body" style={{ overflow: 'visible' }}>
            {/* Author row at top — shows who is posting before they begin */}
            {user && (
              <div className="cf-modal-user-row" style={{ borderTop: 'none', borderBottom: '1px solid #ead7e8', paddingBottom: '0.85rem', marginBottom: '1rem' }}>
                <div className="cf-avatar" style={{ width: 36, height: 36, fontSize: '0.78rem' }}>{initials}</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                  <span className="cf-modal-user-name">{user.firstName} {user.lastName?.[0]}.</span>
                  <span className="cf-role-badge" style={{ background: roleInfo.bg, color: roleInfo.color, alignSelf: 'flex-start' }}>
                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
                    {roleInfo.label}
                  </span>
                </div>
              </div>
            )}

            <form onSubmit={handleCreatePost}>
              {/* Category dropdown */}
              <div className="cf-modal-field">
                <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.6px', color: '#8c7895', marginBottom: '6px' }}>Category</label>
                <div className="cf-custom-select" onClick={() => setCatOpen(v => !v)} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem' }}>
                    <i className='bx bx-purchase-tag-alt' style={{ color: '#ad246d' }}></i>
                    {newCategory}
                  </span>
                  <i className={`bx ${catOpen ? 'bx-chevron-up' : 'bx-chevron-down'} cf-select-arrow`} style={{ color: '#8c7895' }}></i>
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
                <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.6px', color: '#8c7895', marginBottom: '6px' }}>Title <span style={{ color: '#ad246d' }}>*</span></label>
                <input
                  className="cf-modal-input"
                  placeholder="Give your post a clear title..."
                  value={newTitle}
                  onChange={e => setNewTitle(e.target.value)}
                  maxLength={120}
                  required
                />
                <span style={{ fontSize: '0.7rem', color: '#a99cae', display: 'block', textAlign: 'right', marginTop: '4px' }}>{newTitle.length}/120</span>
              </div>

              {/* Content */}
              <div className="cf-modal-field">
                <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.6px', color: '#8c7895', marginBottom: '6px' }}>Your story <span style={{ color: '#ad246d' }}>*</span></label>
                <textarea
                  className="cf-modal-textarea"
                  placeholder="Share your thoughts, journey, or message with this community..."
                  rows={6}
                  value={newContent}
                  onChange={e => setNewContent(e.target.value)}
                  maxLength={2000}
                  required
                />
                <span style={{ fontSize: '0.7rem', color: '#a99cae', display: 'block', textAlign: 'right', marginTop: '4px' }}>{newContent.length}/2000</span>
              </div>

              {/* Image preview */}
              {newFile && (
                <div className="cf-modal-preview">
                  <img src={URL.createObjectURL(newFile)} alt="preview" />
                  <button type="button" className="cf-modal-remove-img" onClick={() => setNewFile(null)} aria-label="Remove image">✕</button>
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
                  {newFile ? 'Change Photo' : 'Add Photo'}
                </button>
                <input
                  ref={fileRef}
                  type="file"
                  hidden
                  accept="image
const PostCard: React.FC<{
  post: CommunityPost;
  currentUser: any;
  onLike: () => void;
  onComment: (id: string, content: string) => void;
  onEdit: (id: string, content: string) => void;
  onDelete: () => void;
  highlighted?: boolean;
  postRef?: (el: HTMLElement | null) => void;
}> = ({ post, currentUser, onLike, onComment, onEdit, onDelete, highlighted = false, postRef }) => {
  const [commentText, setCommentText] = useState('');
  const [showComments, setShowComments] = useState(false);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showOptions, setShowOptions] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editContentText, setEditContentText] = useState('');
  const commentInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!showOptions) return;
    const onClick = () => setShowOptions(false);
    window.addEventListener('click', onClick);
    return () => window.removeEventListener('click', onClick);
  }, [showOptions]);

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

  const startEditing = () => {
    setIsEditing(true);
    setEditContentText(rawBody || '');
    setShowOptions(false);
  };

  const cancelEditing = () => {
    setIsEditing(false);
  };

  const saveEdit = () => {
    if (!editContentText.trim()) return;
    // We must re-encode it with the original topic and title!
    const fullContent = encodeTopicInContent(
      postTopic !== 'all' ? postTopic : 'Stories', 
      rawTitle || '', 
      editContentText
    );
    onEdit(post.id, fullContent);
    setIsEditing(false);
  };

  return (
    <article
      className={`cf-card${highlighted ? ' cf-card-highlighted' : ''}`}
      ref={postRef as React.RefCallback<HTMLElement>}
    >
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
        <div className="cf-author-row" style={{ position: 'relative' }}>
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

          {/* Options Button / Inline Confirmation */}
          {currentUser && (currentUser.id === post.userId || currentUser.role === 'admin') && (
            <div style={{ position: 'absolute', right: 0, top: 0 }} onClick={e => e.stopPropagation()}>
              {showDeleteConfirm ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', background: '#fff', padding: '4px 8px', borderRadius: '6px', boxShadow: '0 2px 10px rgba(0,0,0,0.08)', border: '1px solid #f0eaf4' }}>
                  <span style={{ fontSize: '0.75rem', color: '#cf2f84', fontWeight: 700 }}>Delete?</span>
                  <button 
                    onClick={() => { setShowDeleteConfirm(false); onDelete(); }}
                    style={{ fontSize: '0.7rem', padding: '4px 10px', background: '#cf2f84', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 600 }}
                  >
                    Yes
                  </button>
                  <button 
                    onClick={() => setShowDeleteConfirm(false)}
                    style={{ fontSize: '0.7rem', padding: '4px 10px', background: '#f5f0f7', color: '#685973', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 600 }}
                  >
                    No
                  </button>
                </div>
              ) : (
                <div style={{ position: 'relative' }}>
                  <button 
                    onClick={(e) => { e.stopPropagation(); setShowOptions(!showOptions); }}
                    title="Options"
                    style={{ background: 'none', border: 'none', color: '#a99cae', cursor: 'pointer', padding: '4px' }}
                  >
                    <i className='bx bx-dots-horizontal-rounded' style={{ fontSize: '1.4rem' }}></i>
                  </button>
                  {showOptions && (
                    <div style={{ position: 'absolute', right: 0, top: '100%', background: '#fff', border: '1px solid #ead7e8', borderRadius: '8px', boxShadow: '0 4px 12px rgba(0,0,0,0.05)', zIndex: 10, overflow: 'hidden', minWidth: '120px' }}>
                      <button onClick={(e) => { e.stopPropagation(); startEditing(); }} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', width: '100%', padding: '0.6rem 1rem', border: 'none', background: 'none', cursor: 'pointer', fontSize: '0.8rem', color: '#685973', textAlign: 'left' }}>
                        <i className='bx bx-edit-alt'></i> Edit
                      </button>
                      <button onClick={(e) => { e.stopPropagation(); setShowOptions(false); setShowDeleteConfirm(true); }} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', width: '100%', padding: '0.6rem 1rem', border: 'none', borderTop: '1px solid #ead7e8', background: 'none', cursor: 'pointer', fontSize: '0.8rem', color: '#cf2f84', textAlign: 'left' }}>
                        <i className='bx bx-trash'></i> Delete
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Content */}
        {displayTitle && <h3 className="cf-post-title" style={{ fontWeight: 'bold' }}>{displayTitle}</h3>}
        {isEditing ? (
          <div style={{ marginTop: '0.5rem', marginBottom: '1rem' }}>
            <textarea 
              className="cf-modal-textarea" 
              value={editContentText} 
              onChange={e => setEditContentText(e.target.value)} 
              rows={4}
            />
            <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem', justifyContent: 'flex-end' }}>
              <button onClick={cancelEditing} style={{ padding: '0.4rem 0.8rem', fontSize: '0.8rem', borderRadius: '6px', border: '1px solid #ead7e8', background: '#fff', cursor: 'pointer' }}>Cancel</button>
              <button onClick={saveEdit} style={{ padding: '0.4rem 0.8rem', fontSize: '0.8rem', borderRadius: '6px', border: 'none', background: '#ad246d', color: '#fff', cursor: 'pointer' }}>Save</button>
            </div>
          </div>
        ) : (
          <p className="cf-post-content">{displayContent}</p>
        )}

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
        {lightboxOpen && post.imageUrl && createPortal(
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
          </div>,
          document.body
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
          <span className="cf-timestamp" style={{ marginLeft: 'auto', fontSize: '0.85rem', color: '#a99cae' }}>
            {timeAgo(post.createdAt)}
          </span>
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
