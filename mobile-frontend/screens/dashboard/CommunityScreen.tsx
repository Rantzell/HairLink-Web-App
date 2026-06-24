import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TextInput,
  TouchableOpacity,
  Image,
  KeyboardAvoidingView,
  Platform,
  Alert,
  ActivityIndicator,
  Modal,
  ScrollView,
  Pressable,
  Animated as RNAnimated,
  Easing,
} from 'react-native';
import { Ionicons, Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { s, vs, ms } from '../../lib/scaling';
import api from '../../lib/api';
import { supabase } from '../../lib/supabase';
import Animated, { FadeInDown } from 'react-native-reanimated';
import * as ImagePicker from 'expo-image-picker';
import { CustomAlert } from '../../components/GlobalAlert';

/**
 * Mobile Community feed — visual + behavioural parity with the web
 * `frontend/src/pages/CommunityFeed.tsx`:
 *   - "Hairlink community" hero with a + Create Post CTA
 *   - Filter pills (All · Stories · Questions · Updates) and sort pills
 *     (New · Top)
 *   - Post cards show a coloured category tag + bold title + body + image
 *   - Create-post modal with category dropdown, title, body, photo picker
 *
 * Topic / title is stored inside the `content` string using the same
 * `[TOPIC:Stories]\n**Title**\n\nBody` convention the web uses, so posts
 * created from either platform render identically on both.
 */

interface CommunityScreenProps {
  onBack: () => void;
  /** When set (e.g. from a notification tap), opens that post's detail modal on mount. */
  openPostId?: string | null;
}

const TOPIC_PREFIX = '[TOPIC:';
const TOPIC_SUFFIX = ']';
const CATEGORIES = ['Stories', 'Questions', 'Updates'] as const;
type Category = (typeof CATEGORIES)[number];

function encodeTopicInContent(topic: string, title: string, body: string): string {
  const topicTag = `${TOPIC_PREFIX}${topic}${TOPIC_SUFFIX}`;
  if (title.trim()) return `${topicTag}\n**${title.trim()}**\n\n${body.trim()}`;
  return `${topicTag}\n${body.trim()}`;
}

function decodePost(content: string): { topic: string; title: string | null; body: string } {
  let rest = content ?? '';
  let topic = 'all';
  if (rest.startsWith(TOPIC_PREFIX)) {
    const end = rest.indexOf(TOPIC_SUFFIX);
    if (end !== -1) {
      topic = rest.slice(TOPIC_PREFIX.length, end).toLowerCase();
      rest = rest.slice(end + TOPIC_SUFFIX.length).trimStart();
    }
  }
  const titleMatch = rest.match(/^\*\*(.+?)\*\*\n\n([\s\S]*)$/);
  if (titleMatch) return { topic, title: titleMatch[1], body: titleMatch[2] };
  return { topic, title: null, body: rest };
}

function stripMarkdown(text: string): string {
  return text
    .replace(/\*\*\*(.+?)\*\*\*/g, '$1')
    .replace(/\*\*(.+?)\*\*/g, '$1')
    .replace(/\*(.+?)\*/g, '$1')
    .replace(/___(.+?)___/g, '$1')
    .replace(/__(.+?)__/g, '$1')
    .replace(/_(.+?)_/g, '$1');
}

/**
 * Render text with **bold** / __bold__ segments actually shown in bold, instead
 * of stripping the markers. Other inline markdown is flattened via stripMarkdown.
 */
function renderRichText(text: string, boldColor = '#1C1917') {
  const parts = (text ?? '').split(/(\*\*[^*]+\*\*|__[^_]+__)/g);
  return parts.map((part, i) => {
    const m = part.match(/^(?:\*\*([^*]+)\*\*|__([^_]+)__)$/);
    if (m) {
      return (
        <Text key={i} style={{ fontWeight: '800', color: boldColor }}>
          {m[1] ?? m[2]}
        </Text>
      );
    }
    return <Text key={i}>{stripMarkdown(part)}</Text>;
  });
}

// Same role palette as the web
const ROLE_COLORS: Record<string, { bg: string; color: string; label: string }> = {
  donor:     { bg: '#EEF3FF', color: '#3B66D4', label: 'Donor' },
  recipient: { bg: '#FEF2FB', color: '#CF2F84', label: 'Recipient' },
  staff:     { bg: '#F0FDF4', color: '#15803D', label: 'Staff' },
  wigmaker:  { bg: '#FFF7ED', color: '#C05621', label: 'Wigmaker' },
  admin:     { bg: '#F5F3FF', color: '#6D28D9', label: 'Admin' },
};

const TOPIC_COLORS: Record<string, { bg: string; fg: string }> = {
  stories:   { bg: '#FFF0F8', fg: '#D63B8A' },
  questions: { bg: '#EFF6FF', fg: '#1D4ED8' },
  updates:   { bg: '#ECFDF5', fg: '#047857' },
};

const getAvatarUrl = (photoUrl: string | null | undefined): string | null => {
  if (!photoUrl) return null;
  if (photoUrl.startsWith('http')) return photoUrl;
  const { data } = supabase.storage.from('hairlink').getPublicUrl(`profile-photos/${photoUrl}`);
  return data.publicUrl;
};

function timeAgo(iso: string | undefined | null) {
  if (!iso) return 'just now';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return 'just now';
  const diff = Date.now() - d.getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return 'just now';
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const dys = Math.floor(h / 24);
  if (dys < 7) return `${dys}d ago`;
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

export default function CommunityScreen({ onBack, openPostId }: CommunityScreenProps) {
  const insets = useSafeAreaInsets();
  const [posts, setPosts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Filter / sort state — same model as the web
  const [filter, setFilter] = useState<'all' | string>('all');
  const [sort, setSort] = useState<'new' | 'top'>('new');

  // Create-post modal state
  const [modalOpen, setModalOpen] = useState(false);
  const [newCategory, setNewCategory] = useState<Category>('Stories');
  const [catOpen, setCatOpen] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newContent, setNewContent] = useState('');
  const [newImage, setNewImage] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Image lightbox — full-screen preview when the user taps a post photo
  const [zoomImageUri, setZoomImageUri] = useState<string | null>(null);

  // Comment modal state (kept from previous design — already wired to API)
  const [activePost, setActivePost] = useState<any>(null);
  const [commentContent, setCommentContent] = useState('');
  const [postingComment, setPostingComment] = useState(false);
  const [replyingToComment, setReplyingToComment] = useState<any>(null);

  // Edit-post state — when set, the composer modal runs in "edit" mode.
  const [editingPostId, setEditingPostId] = useState<string | null>(null);
  const [editingExistingImage, setEditingExistingImage] = useState<string | null>(null);

  // Current signed-in user id — used to show edit/delete only on own posts.
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setCurrentUserId(data.user?.id ?? null));
  }, []);

  const fetchPosts = useCallback(async () => {
    try {
      const response = await api.get('/community/posts');
      setPosts(response.data);
      if (activePost) {
        const updated = response.data.find((p: any) => p.id === activePost.id);
        if (updated) setActivePost(updated);
      }
    } catch (error) {
      console.error('Error fetching posts:', error);
      CustomAlert.alert('Error', 'Could not load community feed.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [activePost]);

  useEffect(() => { fetchPosts(); }, [fetchPosts]);

  // Deep-link from a notification → auto-open the targeted post ONCE per id.
  // Without the consumed-ref guard, every posts refetch (polling, like, comment)
  // would re-open the modal even after the user closed it.
  const consumedPostIdRef = useRef<string | null>(null);
  useEffect(() => {
    if (!openPostId || posts.length === 0) return;
    if (consumedPostIdRef.current === String(openPostId)) return;
    const target = posts.find((p: any) => String(p.id) === String(openPostId));
    if (target) {
      setActivePost(target);
      consumedPostIdRef.current = String(openPostId);
    }
  }, [openPostId, posts]);

  const handleRefresh = () => {
    setRefreshing(true);
    fetchPosts();
  };

  const pickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      CustomAlert.alert('Permission needed', 'We need access to your photos to attach one.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      quality: 0.85,
    });
    if (!result.canceled) setNewImage(result.assets[0].uri);
  };

  const resetComposer = () => {
    setNewTitle('');
    setNewContent('');
    setNewImage(null);
    setNewCategory('Stories');
    setCatOpen(false);
    setEditingPostId(null);
    setEditingExistingImage(null);
  };

  // Open the composer pre-filled to edit an existing post.
  const openEditModal = (post: any) => {
    const { topic, title, body } = decodePost(post.content ?? '');
    const cat = (CATEGORIES.find((c) => c.toLowerCase() === topic) || 'Stories') as Category;
    setNewCategory(cat);
    setNewTitle(title || '');
    setNewContent(body || '');
    setNewImage(null);
    setEditingExistingImage(post.imageUrl || post.full_image_url || null);
    setEditingPostId(post.id);
    setCatOpen(false);
    setModalOpen(true);
  };

  const handleDeletePost = (post: any) => {
    CustomAlert.alert('Delete Post', 'Are you sure you want to delete this post? This cannot be undone.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await api.delete(`/community/posts/${post.id}`);
            setPosts((curr) => curr.filter((p) => p.id !== post.id));
            if (activePost?.id === post.id) setActivePost(null);
          } catch (e) {
            CustomAlert.alert('Error', 'Failed to delete post.');
          }
        },
      },
    ]);
  };

  const handleDeleteComment = (comment: any) => {
    CustomAlert.alert('Delete Comment', 'Remove this comment? This cannot be undone.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await api.delete(`/community/comments/${comment.id}`);
            setPosts((curr) =>
              curr.map((p) =>
                p.id === activePost?.id
                  ? { ...p, comments: (p.comments || []).filter((c: any) => c.id !== comment.id) }
                  : p,
              ),
            );
            setActivePost((curr: any) =>
              curr ? { ...curr, comments: (curr.comments || []).filter((c: any) => c.id !== comment.id) } : curr,
            );
          } catch (e) {
            CustomAlert.alert('Error', 'Failed to delete comment.');
          }
        },
      },
    ]);
  };

  // Tapping the ⋯ on your own post.
  const openPostMenu = (post: any) => {
    CustomAlert.alert('Post options', undefined, [
      { text: 'Edit', onPress: () => openEditModal(post) },
      { text: 'Delete', style: 'destructive', onPress: () => handleDeletePost(post) },
      { text: 'Cancel', style: 'cancel' },
    ]);
  };

  const handlePublish = async () => {
    // Photo is now optional — backend (community.routes.ts) only requires
    // `content`. Only block when the body itself is empty.
    if (!newContent.trim()) {
      CustomAlert.alert('Body required', 'Write a short body before publishing.');
      return;
    }

    setSubmitting(true);
    try {
      const formData = new FormData();
      const fullContent = encodeTopicInContent(newCategory, newTitle, newContent);
      formData.append('content', fullContent);

      // Attach the image only if the user picked a NEW one. On edit, leaving
      // it empty keeps the existing image on the backend.
      if (newImage) {
        const fileExt = newImage.split('.').pop()?.toLowerCase();
        const fileName = `post-image-${Date.now()}.${fileExt}`;
        formData.append('image', {
          uri: Platform.OS === 'android' ? newImage : newImage.replace('file://', ''),
          name: fileName,
          type: `image/${fileExt === 'jpg' ? 'jpeg' : fileExt}`,
        } as any);
      }

      if (editingPostId) {
        const response = await api.patch(`/community/posts/${editingPostId}`, formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
        setPosts((curr) => curr.map((p) => (p.id === editingPostId ? response.data : p)));
      } else {
        const response = await api.post('/community/posts', formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
        setPosts([response.data, ...posts]);
      }
      resetComposer();
      setModalOpen(false);
    } catch (error) {
      console.error('Error saving post:', error);
      CustomAlert.alert('Error', editingPostId ? 'Failed to update post.' : 'Failed to publish post.');
    } finally {
      setSubmitting(false);
    }
  };

  const handlePostComment = async () => {
    if (!commentContent.trim() || !activePost) return;
    setPostingComment(true);
    try {
      const response = await api.post(`/community/posts/${activePost.id}/comments`, {
        content: commentContent.trim(),
        parent_id: replyingToComment ? replyingToComment.id : null,
      });
      setCommentContent('');
      let updatedComments = [...(activePost.comments || [])];
      if (replyingToComment) {
        updatedComments = updatedComments.map((c) =>
          c.id === replyingToComment.id ? { ...c, replies: [...(c.replies || []), response.data] } : c
        );
      } else {
        updatedComments = [...updatedComments, response.data];
      }
      const updatedPost = { ...activePost, comments: updatedComments };
      setActivePost(updatedPost);
      setPosts((current) => current.map((p) => (p.id === activePost.id ? updatedPost : p)));
      setReplyingToComment(null);
    } catch (error) {
      console.error('Error posting comment:', error);
      CustomAlert.alert('Error', 'Failed to post comment.');
    } finally {
      setPostingComment(false);
    }
  };

  const handleToggleLike = async (postId: string) => {
    setPosts((current) =>
      current.map((post) => {
        if (post.id !== postId) return post;
        const isLiked = !post.is_liked;
        return { ...post, is_liked: isLiked, likes: isLiked ? post.likes + 1 : Math.max(0, post.likes - 1) };
      })
    );
    try {
      const response = await api.post(`/community/posts/${postId}/like`);
      setPosts((current) =>
        current.map((p) => (p.id === postId ? { ...p, is_liked: response.data.is_liked, likes: response.data.likes } : p))
      );
    } catch {
      fetchPosts();
    }
  };

  const filteredPosts = posts
    .filter((p) => {
      if (filter === 'all') return true;
      const { topic } = decodePost(p.content ?? '');
      return topic === filter.toLowerCase();
    })
    .sort((a, b) =>
      sort === 'top'
        ? (b.likes || 0) - (a.likes || 0)
        : new Date(b.createdAt || b.created_at || 0).getTime()
          - new Date(a.createdAt || a.created_at || 0).getTime()
    );

  const renderPost = ({ item, index }: { item: any; index: number }) => {
    const u = item.user || {};
    const first = u.firstName || u.first_name || '';
    const last = u.lastName || u.last_name || '';
    const fallbackName = u.name || (u.email ? u.email.split('@')[0] : '');
    const authorName = `${first} ${last}`.trim() || fallbackName || 'Member';

    const avatarUrl = getAvatarUrl(u.profile_photo_url || u.profilePhotoUrl);
    const role = (u.role || 'user').toLowerCase();
    const roleStyle = ROLE_COLORS[role] || ROLE_COLORS.donor;

    const initials = authorName.substring(0, 2).toUpperCase();
    const postedAt = item.createdAt || item.created_at;
    const imageUrl = item.imageUrl || item.full_image_url;

    const { topic, title, body } = decodePost(item.content ?? '');
    const topicLabel = topic.charAt(0).toUpperCase() + topic.slice(1);
    const topicStyle = TOPIC_COLORS[topic] || { bg: '#F5F5F0', fg: '#78716C' };

    const commentCount = (item.comments || []).reduce(
      (acc: number, c: any) => acc + 1 + (c.replies?.length || 0),
      0
    );

    return (
      <Animated.View
        entering={FadeInDown.delay(index * 40).springify().damping(14)}
        style={styles.postCard}
      >
        {/* Header */}
        <View style={styles.postHeader}>
          {avatarUrl ? (
            <Image source={{ uri: avatarUrl }} style={styles.avatar} />
          ) : (
            <View style={[styles.avatar, styles.avatarFallback]}>
              <Text style={styles.avatarInitials}>{initials}</Text>
            </View>
          )}
          <View style={styles.authorBlock}>
            <Text style={styles.authorName} numberOfLines={1}>{authorName}</Text>
            <View style={styles.metaRow}>
              <View style={[styles.roleBadge, { backgroundColor: roleStyle.bg }]}>
                <Text style={[styles.roleBadgeText, { color: roleStyle.color }]}>{roleStyle.label}</Text>
              </View>
              <Text style={styles.dotSep}>·</Text>
              <Text style={styles.timeAgo}>{timeAgo(postedAt)}</Text>
            </View>
          </View>

          <View style={[styles.topicChip, { backgroundColor: topicStyle.bg }]}>
            <Text style={[styles.topicChipText, { color: topicStyle.fg }]}>{topicLabel}</Text>
          </View>

          {/* Owner-only edit/delete menu */}
          {currentUserId && String(u.id) === String(currentUserId) && (
            <TouchableOpacity
              style={styles.postMenuBtn}
              onPress={() => openPostMenu(item)}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Ionicons name="ellipsis-horizontal" size={ms(18)} color="#78716C" />
            </TouchableOpacity>
          )}
        </View>

        {/* Title + body */}
        {title && <Text style={styles.postTitle}>{stripMarkdown(title)}</Text>}
        {body ? <Text style={styles.postBody}>{renderRichText(body)}</Text> : null}

        {/* Image */}
        {imageUrl && (
          <TouchableOpacity activeOpacity={0.9} onPress={() => setZoomImageUri(imageUrl)}>
            <Image source={{ uri: imageUrl }} style={styles.postImage} resizeMode="cover" />
          </TouchableOpacity>
        )}

        {/* Footer counts + actions */}
        <View style={styles.postCounts}>
          <Text style={styles.countsText}>
            {item.likes || 0} {item.likes === 1 ? 'like' : 'likes'}
            {' · '}
            {commentCount} {commentCount === 1 ? 'comment' : 'comments'}
          </Text>
        </View>
        <View style={styles.postActions}>
          <TouchableOpacity
            style={styles.actionBtn}
            activeOpacity={0.7}
            onPress={() => handleToggleLike(item.id)}
          >
            <Ionicons
              name={item.is_liked ? 'heart' : 'heart-outline'}
              size={ms(19)}
              color={item.is_liked ? '#D63B8A' : '#78716C'}
            />
            <Text style={[styles.actionText, item.is_liked && { color: '#D63B8A' }]}>Like</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionBtn}
            activeOpacity={0.7}
            onPress={() => setActivePost(item)}
          >
            <Ionicons name="chatbubble-outline" size={ms(17)} color="#78716C" />
            <Text style={styles.actionText}>Comment</Text>
          </TouchableOpacity>
        </View>
      </Animated.View>
    );
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {}
      <View style={styles.topBar}>
        <TouchableOpacity onPress={onBack} style={styles.backBtn} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
          <Ionicons name="chevron-back" size={ms(24)} color="#1C1917" />
        </TouchableOpacity>
        <Text style={styles.topBarTitle}>Community</Text>
        <View style={{ width: ms(40) }} />
      </View>

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <FlatList
          data={filteredPosts}
          keyExtractor={(item) => item.id}
          renderItem={renderPost}
          contentContainerStyle={[
            styles.feedContent,
            { paddingBottom: Math.max(vs(40), insets.bottom + vs(20)) },
          ]}
          showsVerticalScrollIndicator={false}
          refreshing={refreshing}
          onRefresh={handleRefresh}
          ListEmptyComponent={
            !loading ? (
              <View style={styles.emptyState}>
                <View style={styles.emptyIconBubble}>
                  <Ionicons name="chatbubbles-outline" size={ms(32)} color="#D63B8A" />
                </View>
                <Text style={styles.emptyText}>
                  Be the first to share something with the community!
                </Text>
                <TouchableOpacity style={styles.emptyCta} onPress={() => setModalOpen(true)}>
                  <Text style={styles.emptyCtaText}>+ Create Post</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <ActivityIndicator size="large" color="#D63B8A" style={{ marginTop: vs(40) }} />
            )
          }
          ListHeaderComponent={
            <View>
              {}
              <View style={styles.hero}>
                <Text style={styles.heroTitle}>Hairlink community</Text>
                <Text style={styles.heroSub}>
                  Share your journey, celebrate others, ask questions, and find support from
                  people who truly understand.
                </Text>
                <TouchableOpacity style={styles.heroCta} onPress={() => setModalOpen(true)} activeOpacity={0.85}>
                  <Feather name="plus" size={ms(16)} color="#fff" />
                  <Text style={styles.heroCtaText}>Create Post</Text>
                </TouchableOpacity>
              </View>

              {}
              <View style={styles.toolbar}>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.pillScroll}>
                  {(['all', ...CATEGORIES] as const).map((f) => {
                    const active = filter.toLowerCase() === f.toLowerCase();
                    return (
                      <TouchableOpacity
                        key={f}
                        style={[styles.pill, active && styles.pillActive]}
                        onPress={() => setFilter(f === 'all' ? 'all' : f)}
                        activeOpacity={0.8}
                      >
                        <Text style={[styles.pillText, active && styles.pillTextActive]}>
                          {f === 'all' ? 'All' : f}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>

                <View style={styles.sortGroup}>
                  {(['new', 'top'] as const).map((s) => {
                    const active = sort === s;
                    return (
                      <TouchableOpacity
                        key={s}
                        style={[styles.sortPill, active && styles.sortPillActive]}
                        onPress={() => setSort(s)}
                      >
                        <Text style={[styles.sortPillText, active && styles.sortPillTextActive]}>
                          {s.charAt(0).toUpperCase() + s.slice(1)}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>
            </View>
          }
        />
      </KeyboardAvoidingView>

      {}
      <Modal visible={modalOpen} animationType="slide" transparent onRequestClose={() => { setModalOpen(false); resetComposer(); }}>
        <View style={styles.modalOverlay}>
          <KeyboardAvoidingView style={styles.modalSheet} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{editingPostId ? 'Edit Post' : 'Create a Post'}</Text>
              <TouchableOpacity onPress={() => { setModalOpen(false); resetComposer(); }} style={styles.modalClose}>
                <Ionicons name="close" size={ms(22)} color="#1C1917" />
              </TouchableOpacity>
            </View>

            <ScrollView
              style={{ flex: 1 }}
              contentContainerStyle={{ padding: ms(20), paddingBottom: vs(20) + insets.bottom }}
              keyboardShouldPersistTaps="handled"
            >
              {/* Category dropdown */}
              <Pressable
                style={styles.dropdown}
                onPress={() => setCatOpen((v) => !v)}
              >
                <Text style={styles.dropdownText}>{newCategory}</Text>
                <Feather name={catOpen ? 'chevron-up' : 'chevron-down'} size={ms(16)} color="#78716C" />
              </Pressable>
              {catOpen && (
                <View style={styles.dropdownList}>
                  {CATEGORIES.map((c) => {
                    const selected = c === newCategory;
                    return (
                      <TouchableOpacity
                        key={c}
                        style={[styles.dropdownItem, selected && { backgroundColor: '#FFF0F8' }]}
                        onPress={() => { setNewCategory(c); setCatOpen(false); }}
                      >
                        <Text style={[styles.dropdownItemText, selected && { color: '#D63B8A', fontWeight: '800' }]}>
                          {c}
                        </Text>
                        {selected && <Feather name="check" size={ms(15)} color="#D63B8A" />}
                      </TouchableOpacity>
                    );
                  })}
                </View>
              )}

              {/* Title */}
              <TextInput
                style={styles.titleInput}
                placeholder="Post title…"
                placeholderTextColor="#A8A29E"
                value={newTitle}
                onChangeText={setNewTitle}
                maxLength={120}
              />

              {/* Body */}
              <TextInput
                style={styles.bodyInput}
                placeholder="Share your thoughts with this community..."
                placeholderTextColor="#A8A29E"
                value={newContent}
                onChangeText={setNewContent}
                multiline
                maxLength={1500}
              />

              {/* Image preview — newly picked image, or the existing one when editing */}
              {(newImage || editingExistingImage) && (
                <View style={styles.previewBox}>
                  <Image source={{ uri: (newImage || editingExistingImage) as string }} style={styles.previewImage} />
                  {newImage && (
                    <TouchableOpacity style={styles.removeImageBtn} onPress={() => setNewImage(null)}>
                      <Ionicons name="close" size={ms(15)} color="#fff" />
                    </TouchableOpacity>
                  )}
                </View>
              )}

              {/* Footer actions */}
              <View style={styles.modalFooter}>
                <TouchableOpacity style={styles.addPhotoBtn} onPress={pickImage} activeOpacity={0.85}>
                  <Feather name="image" size={ms(15)} color="#D63B8A" />
                  <Text style={styles.addPhotoBtnText}>
                    {newImage || editingExistingImage ? 'Change Photo' : 'Add Photo'}
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.publishBtn,
                    (submitting || !newContent.trim()) && styles.publishBtnDisabled,
                  ]}
                  onPress={handlePublish}
                  disabled={submitting || !newContent.trim()}
                  activeOpacity={0.85}
                >
                  {submitting ? (
                    <ActivityIndicator size="small" color="#fff" />
                  ) : (
                    <>
                      <Feather name={editingPostId ? 'check' : 'send'} size={ms(14)} color="#fff" />
                      <Text style={styles.publishBtnText}>{editingPostId ? 'Save Changes' : 'Publish'}</Text>
                    </>
                  )}
                </TouchableOpacity>
              </View>
            </ScrollView>
          </KeyboardAvoidingView>
        </View>
      </Modal>

      {}
      <Modal visible={!!activePost} animationType="slide" transparent onRequestClose={() => setActivePost(null)}>
        <View style={styles.commentsOverlay}>
          <KeyboardAvoidingView style={styles.commentsSheet} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Comments</Text>
              <TouchableOpacity onPress={() => setActivePost(null)} style={styles.modalClose}>
                <Ionicons name="close" size={ms(22)} color="#1C1917" />
              </TouchableOpacity>
            </View>

            <FlatList
              data={activePost?.comments || []}
              keyExtractor={(item) => item.id}
              contentContainerStyle={{ padding: ms(18) }}
              renderItem={({ item }) => {
                const cu = item.user || {};
                const cAuthor =
                  `${cu.firstName || cu.first_name || ''} ${cu.lastName || cu.last_name || ''}`.trim() ||
                  cu.name ||
                  'Member';
                const cAvatar = getAvatarUrl(cu.profile_photo_url || cu.profilePhotoUrl);
                const cInitials = cAuthor.substring(0, 2).toUpperCase();
                const cRole = (cu.role || 'user').toLowerCase();
                const cRoleStyle = ROLE_COLORS[cRole] || ROLE_COLORS.donor;

                return (
                  <View style={{ marginBottom: vs(14) }}>
                    <View style={styles.commentRow}>
                      {cAvatar ? (
                        <Image source={{ uri: cAvatar }} style={styles.commentAvatar} />
                      ) : (
                        <View style={[styles.commentAvatar, styles.avatarFallback]}>
                          <Text style={[styles.avatarInitials, { fontSize: ms(11) }]}>{cInitials}</Text>
                        </View>
                      )}
                      <View style={styles.commentBubble}>
                        <View style={styles.commentHeader}>
                          <Text style={styles.commentAuthor}>{cAuthor}</Text>
                          <View style={[styles.roleBadge, { backgroundColor: cRoleStyle.bg, paddingVertical: 2 }]}>
                            <Text style={[styles.roleBadgeText, { color: cRoleStyle.color, fontSize: ms(8) }]}>
                              {cRoleStyle.label}
                            </Text>
                          </View>
                          <Text style={[styles.timeAgo, { marginLeft: 'auto' }]}>
                            {timeAgo(item.createdAt || item.created_at)}
                          </Text>
                        </View>
                        <Text style={styles.commentText}>{item.content}</Text>
                      </View>
                    </View>
                    <View style={{ flexDirection: 'row', marginLeft: ms(44), marginTop: vs(4), alignItems: 'center', gap: ms(14) }}>
                      <TouchableOpacity onPress={() => setReplyingToComment(item)}>
                        <Text style={styles.replyLink}>Reply</Text>
                      </TouchableOpacity>
                      {currentUserId && String(cu.id) === String(currentUserId) && (
                        <TouchableOpacity onPress={() => handleDeleteComment(item)}>
                          <Text style={[styles.replyLink, { color: '#C0392B' }]}>Delete</Text>
                        </TouchableOpacity>
                      )}
                    </View>
                  </View>
                );
              }}
              ListEmptyComponent={
                <View style={{ alignItems: 'center', paddingVertical: vs(40) }}>
                  <Text style={{ color: '#A8A29E', fontSize: ms(14) }}>No comments yet — be the first.</Text>
                </View>
              }
            />

            {replyingToComment && (
              <View style={styles.replyBanner}>
                <Text style={styles.replyBannerText} numberOfLines={1}>
                  Replying to @
                  {(((replyingToComment.user?.firstName || replyingToComment.user?.first_name || '') +
                    ' ' +
                    (replyingToComment.user?.lastName || replyingToComment.user?.last_name || '')).trim()) ||
                    replyingToComment.user?.name ||
                    'Member'}
                </Text>
                <TouchableOpacity onPress={() => setReplyingToComment(null)}>
                  <Ionicons name="close-circle" size={ms(18)} color="#D63B8A" />
                </TouchableOpacity>
              </View>
            )}

            <View style={[styles.commentInputRow, { paddingBottom: insets.bottom + vs(8) }]}>
              <TextInput
                style={styles.commentInput}
                placeholder="Write a comment…"
                placeholderTextColor="#A8A29E"
                value={commentContent}
                onChangeText={setCommentContent}
                multiline
              />
              <TouchableOpacity
                style={[styles.sendBtn, !commentContent.trim() && { opacity: 0.45 }]}
                onPress={handlePostComment}
                disabled={!commentContent.trim() || postingComment}
              >
                {postingComment ? (
                  <ActivityIndicator size="small" color="#D63B8A" />
                ) : (
                  <Ionicons name="send" size={ms(18)} color="#D63B8A" />
                )}
              </TouchableOpacity>
            </View>
          </KeyboardAvoidingView>
        </View>
      </Modal>

      {}
      <Modal
        visible={!!zoomImageUri}
        transparent
        animationType="fade"
        statusBarTranslucent
        onRequestClose={() => setZoomImageUri(null)}
      >
        <Pressable style={styles.lightboxBackdrop} onPress={() => setZoomImageUri(null)}>
          {zoomImageUri && (
            <Image source={{ uri: zoomImageUri }} style={styles.lightboxImage} resizeMode="contain" />
          )}
          <TouchableOpacity style={styles.lightboxClose} onPress={() => setZoomImageUri(null)} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
            <Ionicons name="close" size={ms(22)} color="#fff" />
          </TouchableOpacity>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FAFAF9' },

  // Top bar
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: ms(12),
    paddingBottom: vs(10),
    backgroundColor: '#FAFAF9',
    borderBottomWidth: 1,
    borderBottomColor: '#F0EDE9',
  },
  backBtn: { width: ms(40), height: ms(40), alignItems: 'center', justifyContent: 'center' },
  topBarTitle: { fontSize: ms(16), fontWeight: '800', color: '#1C1917', letterSpacing: -0.2 },

  feedContent: { paddingBottom: vs(40) },

  hero: {
    paddingHorizontal: ms(20),
    paddingTop: vs(22),
    paddingBottom: vs(18),
  },
  heroTitle: {
    fontSize: ms(24),
    fontWeight: '800',
    color: '#1C1917',
    letterSpacing: -0.5,
    marginBottom: vs(6),
  },
  heroSub: {
    fontSize: ms(13),
    color: '#78716C',
    lineHeight: vs(19),
    fontWeight: '500',
    marginBottom: vs(14),
  },
  heroCta: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: ms(7),
    backgroundColor: '#D63B8A',
    paddingHorizontal: ms(16),
    paddingVertical: vs(10),
    borderRadius: 999,
    shadowColor: '#D63B8A',
    shadowOpacity: 0.28,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
  },
  heroCtaText: { color: '#fff', fontWeight: '800', fontSize: ms(13), letterSpacing: 0.2 },

  toolbar: {
    paddingTop: vs(2),
    paddingBottom: vs(10),
    backgroundColor: '#FAFAF9',
    borderBottomWidth: 1,
    borderBottomColor: '#F0EDE9',
    marginBottom: vs(12),
  },
  pillScroll: {
    paddingHorizontal: ms(16),
    paddingVertical: vs(6),
    gap: ms(6),
  },
  pill: {
    paddingHorizontal: ms(14),
    paddingVertical: vs(7),
    borderRadius: 999,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#EEEDE8',
  },
  pillActive: {
    backgroundColor: '#D63B8A',
    borderColor: '#D63B8A',
  },
  pillText: {
    fontSize: ms(12),
    fontWeight: '700',
    color: '#78716C',
  },
  pillTextActive: { color: '#fff' },
  sortGroup: {
    flexDirection: 'row',
    paddingHorizontal: ms(16),
    paddingTop: vs(6),
    gap: ms(6),
  },
  sortPill: {
    paddingHorizontal: ms(12),
    paddingVertical: vs(6),
    borderRadius: 999,
    backgroundColor: '#FFF0F8',
  },
  sortPillActive: { backgroundColor: '#D63B8A' },
  sortPillText: {
    fontSize: ms(11),
    fontWeight: '700',
    color: '#D63B8A',
    letterSpacing: 0.3,
  },
  sortPillTextActive: { color: '#fff' },

  emptyState: {
    alignItems: 'center',
    paddingVertical: vs(60),
    paddingHorizontal: ms(40),
  },
  emptyIconBubble: {
    width: ms(64),
    height: ms(64),
    borderRadius: ms(20),
    backgroundColor: '#FFF0F8',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: vs(14),
  },
  emptyText: {
    fontSize: ms(14),
    color: '#78716C',
    textAlign: 'center',
    marginBottom: vs(16),
    lineHeight: vs(20),
  },
  emptyCta: {
    backgroundColor: '#D63B8A',
    paddingHorizontal: ms(18),
    paddingVertical: vs(10),
    borderRadius: 999,
  },
  emptyCtaText: { color: '#fff', fontWeight: '800', fontSize: ms(13) },

  postCard: {
    backgroundColor: '#fff',
    borderRadius: ms(18),
    paddingHorizontal: ms(16),
    paddingTop: vs(14),
    paddingBottom: vs(8),
    marginHorizontal: ms(14),
    marginBottom: vs(12),
    borderWidth: 1,
    borderColor: '#F0EDE9',
    shadowColor: '#1C1917',
    shadowOpacity: 0.04,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
  postHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: vs(10),
  },
  avatar: {
    width: ms(36),
    height: ms(36),
    borderRadius: ms(18),
    backgroundColor: '#F0F0F0',
  },
  avatarFallback: {
    backgroundColor: '#D63B8A',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarInitials: { color: '#fff', fontWeight: '800', fontSize: ms(13) },
  authorBlock: { flex: 1, marginLeft: ms(10) },
  authorName: { fontSize: ms(13.5), fontWeight: '800', color: '#1C1917', letterSpacing: -0.2 },
  metaRow: { flexDirection: 'row', alignItems: 'center', marginTop: vs(2), gap: ms(4) },
  roleBadge: {
    paddingHorizontal: ms(7),
    paddingVertical: vs(2),
    borderRadius: 999,
  },
  roleBadgeText: {
    fontSize: ms(9),
    fontWeight: '800',
    letterSpacing: 0.4,
    textTransform: 'uppercase',
  },
  dotSep: { color: '#A8A29E', fontSize: ms(11) },
  timeAgo: { fontSize: ms(11), color: '#A8A29E', fontWeight: '500' },
  topicChip: {
    paddingHorizontal: ms(8),
    paddingVertical: vs(3),
    borderRadius: 999,
  },
  postMenuBtn: {
    marginLeft: ms(6),
    width: ms(28),
    height: ms(28),
    alignItems: 'center',
    justifyContent: 'center',
  },
  topicChipText: {
    fontSize: ms(10),
    fontWeight: '800',
    letterSpacing: 0.4,
    textTransform: 'uppercase',
  },
  postTitle: {
    fontSize: ms(15.5),
    fontWeight: '800',
    color: '#1C1917',
    letterSpacing: -0.3,
    marginBottom: vs(6),
  },
  postBody: {
    fontSize: ms(13.5),
    color: '#44403C',
    lineHeight: vs(20),
    marginBottom: vs(12),
    fontWeight: '500',
  },
  postImage: {
    width: '100%',
    height: vs(220),
    borderRadius: ms(12),
    marginBottom: vs(10),
    backgroundColor: '#F5F5F0',
  },
  postCounts: {
    paddingBottom: vs(8),
    borderBottomWidth: 1,
    borderBottomColor: '#F4F1ED',
    marginBottom: vs(4),
  },
  countsText: { fontSize: ms(11.5), color: '#78716C', fontWeight: '600' },
  postActions: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: ms(6),
    paddingVertical: vs(8),
    paddingHorizontal: ms(20),
  },
  actionText: { fontSize: ms(12.5), fontWeight: '700', color: '#78716C' },

  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(28,25,23,0.55)',
    justifyContent: 'flex-end',
  },
  modalSheet: {
    backgroundColor: '#fff',
    borderTopLeftRadius: ms(22),
    borderTopRightRadius: ms(22),
    height: '90%',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: ms(18),
    paddingTop: vs(14),
    paddingBottom: vs(12),
    borderBottomWidth: 1,
    borderBottomColor: '#F0EDE9',
  },
  modalTitle: { fontSize: ms(16), fontWeight: '800', color: '#1C1917', letterSpacing: -0.2 },
  modalClose: { padding: ms(2) },

  dropdown: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: ms(14),
    paddingVertical: vs(12),
    borderRadius: ms(10),
    borderWidth: 1,
    borderColor: '#EEEDE8',
    backgroundColor: '#FAFAF9',
    marginBottom: vs(10),
  },
  dropdownText: { fontSize: ms(14), fontWeight: '700', color: '#1C1917' },
  dropdownList: {
    backgroundColor: '#fff',
    borderRadius: ms(10),
    borderWidth: 1,
    borderColor: '#EEEDE8',
    overflow: 'hidden',
    marginBottom: vs(10),
  },
  dropdownItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: ms(14),
    paddingVertical: vs(11),
  },
  dropdownItemText: { fontSize: ms(14), color: '#1C1917', fontWeight: '600' },

  titleInput: {
    paddingHorizontal: ms(14),
    paddingVertical: vs(12),
    borderRadius: ms(10),
    borderWidth: 1,
    borderColor: '#EEEDE8',
    backgroundColor: '#FAFAF9',
    fontSize: ms(15),
    color: '#1C1917',
    fontWeight: '700',
    marginBottom: vs(10),
  },
  bodyInput: {
    paddingHorizontal: ms(14),
    paddingTop: vs(12),
    paddingBottom: vs(12),
    borderRadius: ms(10),
    borderWidth: 1,
    borderColor: '#EEEDE8',
    backgroundColor: '#FAFAF9',
    fontSize: ms(14),
    color: '#1C1917',
    minHeight: vs(120),
    textAlignVertical: 'top',
    marginBottom: vs(10),
  },
  previewBox: {
    position: 'relative',
    marginBottom: vs(12),
    borderRadius: ms(12),
    overflow: 'hidden',
  },
  previewImage: {
    width: '100%',
    height: vs(200),
  },
  removeImageBtn: {
    position: 'absolute',
    top: ms(8),
    right: ms(8),
    width: ms(26),
    height: ms(26),
    borderRadius: ms(13),
    backgroundColor: 'rgba(0,0,0,0.6)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: vs(6),
  },
  addPhotoBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: ms(7),
    paddingHorizontal: ms(14),
    paddingVertical: vs(10),
    borderRadius: 999,
    backgroundColor: '#FFF0F8',
    borderWidth: 1,
    borderColor: '#FFD9EC',
  },
  addPhotoBtnText: { color: '#D63B8A', fontWeight: '800', fontSize: ms(13) },
  publishBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: ms(7),
    paddingHorizontal: ms(18),
    paddingVertical: vs(11),
    borderRadius: 999,
    backgroundColor: '#D63B8A',
    shadowColor: '#D63B8A',
    shadowOpacity: 0.28,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
  },
  publishBtnDisabled: { backgroundColor: '#E8C9DC', shadowOpacity: 0, elevation: 0 },
  publishBtnText: { color: '#fff', fontWeight: '800', fontSize: ms(13) },

  commentsOverlay: {
    flex: 1,
    backgroundColor: 'rgba(28,25,23,0.55)',
    justifyContent: 'flex-end',
  },
  commentsSheet: {
    backgroundColor: '#fff',
    borderTopLeftRadius: ms(22),
    borderTopRightRadius: ms(22),
    height: '85%',
  },
  commentRow: { flexDirection: 'row' },
  commentAvatar: { width: ms(32), height: ms(32), borderRadius: ms(16), marginRight: ms(10) },
  commentBubble: {
    flex: 1,
    backgroundColor: '#FAFAF9',
    borderRadius: ms(14),
    paddingHorizontal: ms(12),
    paddingVertical: vs(10),
  },
  commentHeader: { flexDirection: 'row', alignItems: 'center', gap: ms(6), marginBottom: vs(4) },
  commentAuthor: { fontSize: ms(12.5), fontWeight: '800', color: '#1C1917' },
  commentText: { fontSize: ms(13), color: '#44403C', lineHeight: vs(18) },
  replyLink: { fontSize: ms(11.5), fontWeight: '800', color: '#D63B8A' },
  replyBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFF0F8',
    paddingHorizontal: ms(18),
    paddingVertical: vs(8),
    borderTopWidth: 1,
    borderTopColor: '#FFD9EC',
  },
  replyBannerText: { fontSize: ms(12), color: '#D63B8A', fontWeight: '700', flex: 1 },
  commentInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: ms(16),
    paddingTop: vs(10),
    borderTopWidth: 1,
    borderTopColor: '#F0EDE9',
  },
  commentInput: {
    flex: 1,
    backgroundColor: '#FAFAF9',
    borderRadius: 999,
    paddingHorizontal: ms(16),
    paddingVertical: vs(9),
    fontSize: ms(13.5),
    color: '#1C1917',
    maxHeight: vs(90),
    borderWidth: 1,
    borderColor: '#EEEDE8',
  },
  sendBtn: { marginLeft: ms(10), padding: ms(8) },

  // Image lightbox
  lightboxBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.94)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  lightboxImage: { width: '100%', height: '100%' },
  lightboxClose: {
    position: 'absolute',
    top: ms(48),
    right: ms(16),
    width: ms(40),
    height: ms(40),
    borderRadius: ms(20),
    backgroundColor: 'rgba(255,255,255,0.16)',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
