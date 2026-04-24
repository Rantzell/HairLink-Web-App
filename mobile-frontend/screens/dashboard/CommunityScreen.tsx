import React, { useState, useEffect, useCallback } from 'react';
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
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { s, vs, ms } from '../../lib/scaling';
import api from '../../lib/api';
import Animated, { FadeInDown, FadeOut } from 'react-native-reanimated';
import * as ImagePicker from 'expo-image-picker';

interface CommunityScreenProps {
  onBack: () => void;
}

const ScaleButton = Animated.createAnimatedComponent(TouchableOpacity);

export default function CommunityScreen({ onBack }: CommunityScreenProps) {
  const insets = useSafeAreaInsets();
  const [posts, setPosts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Post Creation State
  const [newPostContent, setNewPostContent] = useState('');
  const [newPostImage, setNewPostImage] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Comment State
  const [activePost, setActivePost] = useState<any>(null);
  const [commentContent, setCommentContent] = useState('');
  const [postingComment, setPostingComment] = useState(false);

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
      Alert.alert('Error', 'Could not load community feed.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [activePost]);

  useEffect(() => {
    fetchPosts();
  }, [fetchPosts]);

  const handleRefresh = () => {
    setRefreshing(true);
    fetchPosts();
  };

  const pickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission Denied', 'Sorry, we need camera roll permissions to make this work!');
      return;
    }

    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      quality: 0.8,
    });

    if (!result.canceled) {
      setNewPostImage(result.assets[0].uri);
    }
  };

  const handleCreatePost = async () => {
    if (!newPostContent.trim() && !newPostImage) {
      Alert.alert('Empty Post', 'Please write something or attach an image to share.');
      return;
    }

    setSubmitting(true);
    try {
      const formData = new FormData();
      formData.append('content', newPostContent.trim());

      if (newPostImage) {
        const fileExt = newPostImage.split('.').pop()?.toLowerCase();
        const fileName = `post-image-${Date.now()}.${fileExt}`;
        formData.append('image', {
          uri: Platform.OS === 'android' ? newPostImage : newPostImage.replace('file://', ''),
          name: fileName,
          type: `image/${fileExt === 'jpg' ? 'jpeg' : fileExt}`,
        } as any);
      }

      const response = await api.post('/community/posts', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      setNewPostContent('');
      setNewPostImage(null);
      setPosts([response.data, ...posts]);
    } catch (error) {
      console.error('Error creating post:', error);
      Alert.alert('Error', 'Failed to publish post.');
    } finally {
      setSubmitting(false);
    }
  };

  const handlePostComment = async () => {
    if (!commentContent.trim() || !activePost) return;

    setPostingComment(true);
    try {
      const response = await api.post(`/community/posts/${activePost.id}/comments`, {
        content: commentContent.trim()
      });

      setCommentContent('');
      const updatedPost = { 
        ...activePost, 
        comments: [...(activePost.comments || []), response.data] 
      };
      setActivePost(updatedPost);
      setPosts(current => current.map(p => p.id === activePost.id ? updatedPost : p));
    } catch (error) {
      console.error('Error posting comment:', error);
      Alert.alert('Error', 'Failed to post comment.');
    } finally {
      setPostingComment(false);
    }
  };

  const handleToggleLike = async (postId: string) => {
    setPosts(currentPosts => 
      currentPosts.map(post => {
        if (post.id === postId) {
          const isLiked = !post.is_liked;
          const likesCount = isLiked ? post.likes + 1 : Math.max(0, post.likes - 1);
          return { ...post, is_liked: isLiked, likes: likesCount };
        }
        return post;
      })
    );

    try {
      const response = await api.post(`/community/posts/${postId}/like`);
      setPosts(currentPosts => 
        currentPosts.map(post => {
          if (post.id === postId) {
            return { ...post, is_liked: response.data.is_liked, likes: response.data.likes };
          }
          return post;
        })
      );
    } catch (error) {
      console.error('Error toggling like:', error);
      fetchPosts(); 
    }
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    
    const mins = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);
    
    if (mins < 1) return 'Just now';
    if (mins < 60) return `${mins}m ago`;
    if (hours < 24) return `${hours}h ago`;
    if (days < 7) return `${days}d ago`;
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  const renderPost = ({ item, index }: { item: any, index: number }) => {
    const authorName = item.user?.first_name 
      ? `${item.user.first_name} ${item.user.last_name || ''}`.trim() 
      : 'Anonymous';
      
    const avatarUrl = item.user?.profile_photo_url;
    const role = item.user?.role || 'user';
    
    // Generate initials fallback
    const initials = authorName.substring(0, 2).toUpperCase();

    return (
      <Animated.View 
        entering={FadeInDown.delay(index * 50).springify().damping(12)} 
        style={styles.postCard}
      >
        {/* Post Header */}
        <View style={styles.postHeader}>
          {avatarUrl ? (
            <Image source={{ uri: avatarUrl }} style={styles.avatarImage} />
          ) : (
            <View style={styles.avatarFallback}>
              <Text style={styles.avatarInitials}>{initials}</Text>
            </View>
          )}
          
          <View style={styles.authorInfo}>
            <Text style={styles.authorName}>{authorName}</Text>
            <Text style={styles.postTime}>{formatTime(item.created_at)}</Text>
          </View>
          
          <View style={[styles.roleBadge, role.toLowerCase() === 'donor' ? styles.roleBadgeDonor : styles.roleBadgeRecipient]}>
            <Text style={[styles.roleBadgeText, role.toLowerCase() === 'donor' ? styles.roleBadgeTextDonor : styles.roleBadgeTextRecipient]}>
              {role.toUpperCase()}
            </Text>
          </View>
        </View>

        {/* Post Content */}
        <Text style={styles.postContent}>{item.content}</Text>
        
        {/* Post Image */}
        {item.full_image_url && (
          <Image source={{ uri: item.full_image_url }} style={styles.postImage} resizeMode="cover" />
        )}

        {/* Post Stats */}
        <View style={styles.postStats}>
          <Text style={styles.statsText}>{item.likes} Likes • {item.comments?.length || 0} Comments</Text>
        </View>

        {/* Post Actions */}
        <View style={styles.postActions}>
          <TouchableOpacity 
            style={styles.actionBtn} 
            activeOpacity={0.7}
            onPress={() => handleToggleLike(item.id)}
          >
            <Ionicons name={item.is_liked ? "heart" : "heart-outline"} size={ms(20)} color={item.is_liked ? "#FF1493" : "#6b5b6d"} />
            <Text style={[styles.actionBtnText, item.is_liked && { color: '#FF1493' }]}>Like</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.actionBtn} 
            activeOpacity={0.7}
            onPress={() => setActivePost(item)}
          >
            <Ionicons name="chatbubble-outline" size={ms(18)} color="#6b5b6d" />
            <Text style={styles.actionBtnText}>Comment</Text>
          </TouchableOpacity>
        </View>
      </Animated.View>
    );
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={onBack} style={styles.backBtn} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
          <Ionicons name="chevron-back" size={28} color="#1a1a1a" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Community</Text>
        <View style={{ width: 28 }} />
      </View>

      <KeyboardAvoidingView 
        style={{ flex: 1 }} 
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <FlatList
          data={posts}
          keyExtractor={(item) => item.id}
          renderItem={renderPost}
          contentContainerStyle={[
            styles.feedContent,
            { paddingBottom: Math.max(vs(40), insets.bottom + vs(20)) }
          ]}
          showsVerticalScrollIndicator={false}
          refreshing={refreshing}
          onRefresh={handleRefresh}
          ListEmptyComponent={
            !loading ? (
              <View style={styles.emptyState}>
                <Ionicons name="people" size={ms(48)} color="#ead7e8" />
                <Text style={styles.emptyStateText}>No posts yet. Be the first to share!</Text>
              </View>
            ) : (
              <ActivityIndicator size="large" color="#FF1493" style={{ marginTop: vs(40) }} />
            )
          }
          ListHeaderComponent={
            <View style={styles.createPostContainer}>
              <Text style={styles.createPostTitle}>Share Your Story</Text>
              <View style={styles.createPostInputWrapper}>
                <TextInput
                  style={styles.createPostInput}
                  placeholder="What's on your mind?"
                  placeholderTextColor="#9b8a9e"
                  multiline
                  value={newPostContent}
                  onChangeText={setNewPostContent}
                  maxLength={500}
                />
              </View>
              
              {newPostImage && (
                <View style={styles.previewImageContainer}>
                  <Image source={{ uri: newPostImage }} style={styles.previewImage} />
                  <TouchableOpacity 
                    style={styles.removeImageBtn}
                    onPress={() => setNewPostImage(null)}
                  >
                    <Ionicons name="close" size={16} color="#fff" />
                  </TouchableOpacity>
                </View>
              )}

              <View style={styles.createPostActions}>
                <TouchableOpacity style={styles.attachBtn} onPress={pickImage}>
                  <Ionicons name="camera" size={ms(22)} color="#FF1493" />
                  <Text style={styles.attachBtnText}>Add Photo</Text>
                </TouchableOpacity>
                
                <TouchableOpacity 
                  style={[
                    styles.postBtn, 
                    (!newPostContent.trim() && !newPostImage) || submitting ? styles.postBtnDisabled : null
                  ]} 
                  onPress={handleCreatePost}
                  disabled={(!newPostContent.trim() && !newPostImage) || submitting}
                >
                  {submitting ? (
                    <ActivityIndicator size="small" color="#fff" />
                  ) : (
                    <Text style={styles.postBtnText}>Post</Text>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          }
        />
      </KeyboardAvoidingView>

      {/* ── Comment Modal ────────────────────────────── */}
      <Modal
        visible={!!activePost}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setActivePost(null)}
      >
        <View style={styles.modalOverlay}>
          <KeyboardAvoidingView 
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            style={styles.modalContent}
          >
            {/* Modal Header */}
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Comments</Text>
              <TouchableOpacity onPress={() => setActivePost(null)} style={styles.closeBtn}>
                <Ionicons name="close" size={24} color="#1a1a1a" />
              </TouchableOpacity>
            </View>

            {/* Comments List */}
            <FlatList
              data={activePost?.comments || []}
              keyExtractor={(item) => item.id}
              contentContainerStyle={styles.commentsList}
              renderItem={({ item }) => {
                const cAuthor = item.user?.first_name 
                  ? `${item.user.first_name} ${item.user.last_name || ''}`.trim() 
                  : 'Anonymous';
                const cAvatar = item.user?.profile_photo_url;
                const cRole = item.user?.role || 'user';
                const cInitials = cAuthor.substring(0, 2).toUpperCase();

                return (
                  <View style={styles.commentItem}>
                    {cAvatar ? (
                      <Image source={{ uri: cAvatar }} style={styles.commentAvatar} />
                    ) : (
                      <View style={[styles.commentAvatar, styles.avatarFallback, { width: ms(32), height: ms(32) }]}>
                        <Text style={[styles.avatarInitials, { fontSize: ms(11) }]}>{cInitials}</Text>
                      </View>
                    )}
                    <View style={styles.commentBubble}>
                      <View style={styles.commentHeader}>
                        <Text style={styles.commentAuthor}>{cAuthor}</Text>
                        <View style={[styles.roleBadge, cRole.toLowerCase() === 'donor' ? styles.roleBadgeDonor : styles.roleBadgeRecipient, { paddingVertical: 2, scale: 0.8 }]}>
                           <Text style={[styles.roleBadgeText, cRole.toLowerCase() === 'donor' ? styles.roleBadgeTextDonor : styles.roleBadgeTextRecipient]}>
                            {cRole.toUpperCase()}
                          </Text>
                        </View>
                        <Text style={styles.commentTime}>{formatTime(item.created_at)}</Text>
                      </View>
                      <Text style={styles.commentText}>{item.content}</Text>
                    </View>
                  </View>
                );
              }}
              ListEmptyComponent={
                <View style={styles.emptyComments}>
                  <Text style={styles.emptyCommentsText}>No comments yet. Be the first to reply!</Text>
                </View>
              }
            />

            {/* Comment Input */}
            <View style={[styles.commentInputRow, { paddingBottom: insets.bottom + ms(10) }]}>
              <TextInput
                style={styles.commentInput}
                placeholder="Write a comment..."
                placeholderTextColor="#9b8a9e"
                value={commentContent}
                onChangeText={setCommentContent}
                multiline
              />
              <TouchableOpacity 
                style={[styles.sendBtn, !commentContent.trim() && { opacity: 0.5 }]}
                onPress={handlePostComment}
                disabled={!commentContent.trim() || postingComment}
              >
                {postingComment ? (
                  <ActivityIndicator size="small" color="#FF1493" />
                ) : (
                  <Ionicons name="send" size={20} color="#FF1493" />
                )}
              </TouchableOpacity>
            </View>
          </KeyboardAvoidingView>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8F0F5' },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: ms(24),
    borderTopRightRadius: ms(24),
    height: '80%',
    paddingBottom: Platform.OS === 'android' ? vs(10) : 0,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: ms(20),
    borderBottomWidth: 1,
    borderBottomColor: '#F8F0F5',
  },
  modalTitle: {
    fontSize: ms(18),
    fontWeight: '800',
    color: '#1a1a1a',
  },
  closeBtn: {
    padding: ms(4),
  },
  commentsList: {
    padding: ms(20),
  },
  commentItem: {
    flexDirection: 'row',
    marginBottom: vs(16),
  },
  commentAvatar: {
    width: ms(32),
    height: ms(32),
    borderRadius: ms(16),
    marginRight: ms(12),
  },
  commentBubble: {
    flex: 1,
    backgroundColor: '#F8F0F5',
    borderRadius: ms(16),
    padding: ms(12),
  },
  commentHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: vs(4),
  },
  commentAuthor: {
    fontSize: ms(13),
    fontWeight: '800',
    color: '#3b2e43',
    marginRight: ms(6),
  },
  commentTime: {
    fontSize: ms(10),
    color: '#9b8a9e',
    marginLeft: 'auto',
  },
  commentText: {
    fontSize: ms(13),
    color: '#3b2e43',
    lineHeight: vs(18),
  },
  emptyComments: {
    alignItems: 'center',
    paddingVertical: vs(40),
  },
  emptyCommentsText: {
    color: '#9b8a9e',
    fontSize: ms(14),
  },
  commentInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: ms(20),
    paddingTop: vs(10),
    borderTopWidth: 1,
    borderTopColor: '#F8F0F5',
  },
  commentInput: {
    flex: 1,
    backgroundColor: '#F8F0F5',
    borderRadius: ms(20),
    paddingHorizontal: ms(16),
    paddingVertical: vs(8),
    fontSize: ms(14),
    color: '#3b2e43',
    maxHeight: vs(80),
  },
  sendBtn: {
    marginLeft: ms(12),
    padding: ms(8),
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: ms(16),
    paddingBottom: vs(12),
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.05)',
    backgroundColor: '#F8F0F5',
    zIndex: 10,
  },
  backBtn: { padding: ms(4) },
  headerTitle: { fontSize: ms(18), fontWeight: '800', color: '#1a1a1a' },
  
  feedContent: {
    padding: ms(14),
    paddingBottom: vs(40),
  },
  
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: vs(60),
  },
  emptyStateText: {
    marginTop: vs(16),
    fontSize: ms(14),
    color: '#9b8a9e',
    fontWeight: '500',
  },

  createPostContainer: {
    backgroundColor: '#fff',
    borderRadius: ms(16),
    padding: ms(16),
    marginBottom: vs(16),
    shadowColor: '#FF1493',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
    elevation: 3,
  },
  createPostTitle: {
    fontSize: ms(14),
    fontWeight: '800',
    color: '#3b2e43',
    marginBottom: vs(10),
  },
  createPostInputWrapper: {
    backgroundColor: '#F8F0F5',
    borderRadius: ms(12),
    paddingHorizontal: ms(12),
    paddingVertical: vs(10),
    minHeight: vs(80),
    marginBottom: vs(12),
  },
  createPostInput: {
    fontSize: ms(14),
    color: '#3b2e43',
    minHeight: vs(60),
    textAlignVertical: 'top',
  },
  previewImageContainer: {
    position: 'relative',
    marginBottom: vs(12),
    borderRadius: ms(12),
    overflow: 'hidden',
  },
  previewImage: {
    width: '100%',
    height: vs(200),
    borderRadius: ms(12),
  },
  removeImageBtn: {
    position: 'absolute',
    top: ms(8),
    right: ms(8),
    backgroundColor: 'rgba(0,0,0,0.6)',
    width: ms(24),
    height: ms(24),
    borderRadius: ms(12),
    alignItems: 'center',
    justifyContent: 'center',
  },
  createPostActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  attachBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF0F8',
    paddingHorizontal: ms(12),
    paddingVertical: vs(8),
    borderRadius: ms(20),
  },
  attachBtnText: {
    marginLeft: ms(6),
    color: '#FF1493',
    fontWeight: '700',
    fontSize: ms(13),
  },
  postBtn: {
    backgroundColor: '#FF66B2',
    paddingHorizontal: ms(24),
    paddingVertical: vs(10),
    borderRadius: ms(20),
    minWidth: ms(80),
    alignItems: 'center',
  },
  postBtnDisabled: {
    backgroundColor: '#ead7e8',
  },
  postBtnText: {
    color: '#fff',
    fontWeight: '800',
    fontSize: ms(14),
  },

  postCard: {
    backgroundColor: '#fff',
    borderRadius: ms(16),
    padding: ms(16),
    marginBottom: vs(14),
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
  postHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: vs(12),
  },
  avatarImage: {
    width: ms(40),
    height: ms(40),
    borderRadius: ms(20),
    backgroundColor: '#f0f0f0',
  },
  avatarFallback: {
    width: ms(40),
    height: ms(40),
    borderRadius: ms(20),
    backgroundColor: '#cf2f84',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarInitials: {
    color: '#fff',
    fontWeight: '800',
    fontSize: ms(14),
  },
  authorInfo: {
    flex: 1,
    marginLeft: ms(10),
  },
  authorName: {
    fontSize: ms(14),
    fontWeight: '800',
    color: '#3b2e43',
  },
  postTime: {
    fontSize: ms(11),
    color: '#9b8a9e',
    marginTop: vs(2),
  },
  roleBadge: {
    paddingHorizontal: ms(8),
    paddingVertical: vs(4),
    borderRadius: ms(12),
  },
  roleBadgeDonor: { backgroundColor: '#e8f2ff' },
  roleBadgeRecipient: { backgroundColor: '#ffe8f2' },
  roleBadgeText: { fontSize: ms(10), fontWeight: '800' },
  roleBadgeTextDonor: { color: '#0066cc' },
  roleBadgeTextRecipient: { color: '#cf2f84' },
  
  postContent: {
    fontSize: ms(14),
    color: '#3b2e43',
    lineHeight: vs(20),
    marginBottom: vs(12),
  },
  postImage: {
    width: '100%',
    height: vs(250),
    borderRadius: ms(12),
    marginBottom: vs(12),
    backgroundColor: '#F8F0F5',
  },
  postStats: {
    borderBottomWidth: 1,
    borderBottomColor: '#F8F0F5',
    paddingBottom: vs(10),
    marginBottom: vs(10),
  },
  statsText: {
    fontSize: ms(12),
    color: '#9b8a9e',
  },
  postActions: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: vs(6),
    paddingHorizontal: ms(20),
  },
  actionBtnText: {
    marginLeft: ms(6),
    fontSize: ms(13),
    fontWeight: '600',
    color: '#6b5b6d',
  },
});
