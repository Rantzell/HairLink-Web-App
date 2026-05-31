import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  Linking,
  Modal,
  Dimensions,
  Platform,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { s, vs, ms } from '../../lib/scaling';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { FadeInDown, FadeInUp, FadeIn } from 'react-native-reanimated';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface Article {
  id: number;
  title: string;
  excerpt: string;
  content: string;
  category: string;
  author: string;
  readTime: number;
  created_at: string;
}

interface Video {
  id: number;
  title: string;
  description: string;
  videoId: string;
  source: 'youtube' | 'vimeo' | 'custom';
  category: string;
  author: string;
  views: number;
  duration: string;
  created_at: string;
}

const ARTICLES: Article[] = [
  {
    id: 1,
    title: 'Complete Guide: Washing Your Synthetic Wig',
    excerpt: 'Keep your wig fresh and vibrant with our step-by-step cleaning process designed for synthetic fibers.',
    content: 'Synthetic wigs require specific care to maintain their style and longevity. Unlike human hair, synthetic fibers don\'t absorb oils, but they can collect dust and environmental pollutants.\n\n**The Washing Process:**\n\n1. **Detangle:** Before washing, gently comb out any tangles using a wide-tooth comb or your fingers. Always start from the ends and work your way up to the roots.\n\n2. **Cool Water Soak:** Fill a sink or basin with cool water. Never use hot water as it can damage the synthetic fibers. Add a small amount of synthetic wig shampoo.\n\n3. **Swish, Don\'t Scrub:** Submerge the wig and gently swish it in the water for a few minutes. Do not rub or scrub the fibers.\n\n4. **Rinse:** Rinse the wig thoroughly in cool, clean water until all soap is removed.\n\n5. **Conditioning:** Apply a synthetic wig conditioner to the ends (avoiding the roots/cap) and rinse again if the product requires it.\n\n6. **Drying:** Pat the wig dry with a soft towel. Do not wring or squeeze. Place it on a wig stand to air dry completely. Never brush a wet wig.',
    category: 'Care',
    author: 'Venus Alinsod',
    readTime: 6,
    created_at: new Date().toISOString()
  },
  {
    id: 2,
    title: '5 Secrets to Natural-Looking Wig Styling',
    excerpt: 'Learn the professional techniques to make your wig look like your natural hair every single time.',
    content: 'The key to a great wig is making it look like it\'s growing from your scalp. Here are our top styling secrets:\n\n1. **Pluck the Parting:** Most wigs come with a dense hairline. Gently plucking a few hairs from the part can create a more natural, realistic appearance.\n\n2. **Use Concealer:** Apply a small amount of skin-toned concealer or foundation to the lace or part line to mimic the color of your scalp.\n\n3. **Tame the Shine:** New synthetic wigs often have an unnatural shine. A light dusting of dry shampoo or translucent powder can give it a more natural matte finish.\n\n4. **Frame Your Face:** Don\'t be afraid to have a professional stylist trim the wig to better suit your face shape. Adding layers or bangs can make a huge difference.\n\n5. **Proper Placement:** Ensure the wig sits correctly on your natural hairline. Use a wig grip or velvet band to prevent it from sliding back during the day.',
    category: 'Styling',
    author: 'Style Expert',
    readTime: 4,
    created_at: new Date().toISOString()
  },
  {
    id: 3,
    title: 'Seasonal Storage: Protecting Your Investment',
    excerpt: 'How to properly store your wigs during off-seasons to prevent tangling and shape loss.',
    content: 'Proper storage is just as important as proper washing. If you leave your wig sitting out, it can collect dust and lose its shape.\n\n- **Daily Storage:** Use a collapsible wig stand for wigs you wear frequently. This allows for air circulation.\n\n- **Long-term Storage:** For wigs you won\'t wear for a while, store them in their original box or a clean silk/satin bag.\n\n- **Keep it Cool:** Always store wigs in a cool, dry place away from direct sunlight, which can fade the color and weaken the fibers.\n\n- **Hairnets:** Use the hairnet that came with the wig to keep the fibers in place and prevent tangling during storage.',
    category: 'Storage',
    author: 'Maintenance Pro',
    readTime: 3,
    created_at: new Date().toISOString()
  }
];

const VIDEOS: Video[] = [
  {
    id: 1,
    title: 'Beginner\'s Guide to Wearing a Wig',
    description: 'Everything you need to know about putting on your first wig, from cap selection to secure fitting.',
    videoId: 'm0P_qVf06Yk',
    source: 'youtube',
    category: 'Care',
    author: 'HairLink Tutorials',
    views: 45200,
    duration: '12:15',
    created_at: new Date().toISOString()
  },
  {
    id: 2,
    title: 'Styling Synthetic Curls Without Heat',
    description: 'Safe methods to refresh the curls on your synthetic wig using rollers and steam.',
    videoId: 'O9hO2hR7b6s',
    source: 'youtube',
    category: 'Styling',
    author: 'Curls & Care',
    views: 12800,
    duration: '7:30',
    created_at: new Date().toISOString()
  },
  {
    id: 3,
    title: 'Wig 101: Human Hair vs Synthetic',
    description: 'Understanding the differences, pros, and cons of different wig types to choose the best one for you.',
    videoId: 'dQw4w9WgXcQ',
    source: 'youtube',
    category: 'Storage',
    author: 'EduHair',
    views: 98500,
    duration: '15:20',
    created_at: new Date().toISOString()
  }
];

interface HairCareScreenProps {
  role?: 'Donor' | 'Recipient';
  onBack: () => void;
}

export default function HairCareScreen({ role = 'Donor', onBack }: HairCareScreenProps) {
  const isRecipient = role === 'Recipient';
  const themeColor = isRecipient ? '#9B59B6' : '#FF1493';
  const themeMedium = isRecipient ? '#8E44AD' : '#FF66B2';
  const themeLight = isRecipient ? '#E8DAEF' : '#FFB3D9';
  const themeBg = isRecipient ? '#F9F4FC' : '#F8F0F5';
  const themePale = isRecipient ? '#F5EEF8' : '#FFF0F5';

  const [activeTab, setActiveTab] = useState<'articles' | 'videos'>('articles');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedArticle, setSelectedArticle] = useState<Article | null>(null);
  const [selectedVideo, setSelectedVideo] = useState<Video | null>(null);

  const insets = useSafeAreaInsets();

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const formatViews = (views: number) => {
    if (views >= 1000000) return (views / 1000000).toFixed(1) + 'M';
    if (views >= 1000) return (views / 1000).toFixed(1) + 'K';
    return views.toString();
  };

  const filteredArticles = selectedCategory === 'all'
    ? ARTICLES
    : ARTICLES.filter(a => a.category === selectedCategory);

  const renderArticleContent = (content: string) => {
    return content.split('\n\n').map((para, i) => {
      // Bold headers
      if (para.startsWith('**') && para.endsWith(':**')) {
        return (
          <Text key={i} style={[styles.articleHeader, { color: themeMedium }]}>
            {para.replace(/\*\*/g, '')}
          </Text>
        );
      }

      // Numbered lists
      if (para.match(/^\d\./)) {
        const dotIndex = para.indexOf('.');
        const num = para.substring(0, dotIndex + 1);
        const text = para.substring(dotIndex + 1).trim();
        
        const matchBold = text.match(/^\*\*(.*?)\*\*(.*)/s);
        if (matchBold) {
          return (
            <View key={i} style={styles.listItemRow}>
              <Text style={[styles.listNumber, { color: themeMedium }]}>{num}</Text>
              <Text style={styles.listItemText}>
                <Text style={{ fontWeight: '800', color: themeColor }}>{matchBold[1]} </Text>
                {matchBold[2]}
              </Text>
            </View>
          );
        }

        return (
          <View key={i} style={styles.listItemRow}>
            <Text style={[styles.listNumber, { color: themeMedium }]}>{num}</Text>
            <Text style={styles.listItemText}>{text}</Text>
          </View>
        );
      }

      // Bullet points
      if (para.startsWith('- ')) {
        const items = para.split('\n').map((item, j) => {
          const cleanItem = item.substring(2).trim();
          const matchBold = cleanItem.match(/^\*\*(.*?)\*\*(.*)/s);
          if (matchBold) {
            return (
              <View key={j} style={styles.bulletItemRow}>
                <Text style={[styles.bulletDot, { color: themeMedium }]}>•</Text>
                <Text style={styles.bulletItemText}>
                  <Text style={{ fontWeight: '800', color: themeColor }}>{matchBold[1]} </Text>
                  {matchBold[2]}
                </Text>
              </View>
            );
          }
          return (
            <View key={j} style={styles.bulletItemRow}>
              <Text style={[styles.bulletDot, { color: themeMedium }]}>•</Text>
              <Text style={styles.bulletItemText}>{cleanItem}</Text>
            </View>
          );
        });
        return <View key={i} style={{ marginBottom: vs(12) }}>{items}</View>;
      }

      return (
        <Text key={i} style={styles.paragraph}>
          {para}
        </Text>
      );
    });
  };

  const handlePlayVideo = (videoId: string) => {
    const url = `https://www.youtube.com/watch?v=${videoId}`;
    Linking.openURL(url).catch(() => {
      alert('Could not open video link');
    });
  };

  return (
    <View style={[styles.container, { backgroundColor: themeBg }]}>
      <StatusBar style="light" />

      {/* ── Premium Gradient Header ────────────────── */}
      <LinearGradient
        colors={isRecipient ? [themeColor, themeMedium] : ['#FF66B2', '#FF1493']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={[styles.header, { shadowColor: isRecipient ? themeMedium : '#FF1493', paddingTop: insets.top }]}
      >
        <View style={styles.headerContent}>
          <TouchableOpacity onPress={onBack} style={styles.backBtn}>
            <Ionicons name="chevron-back" size={ms(28)} color="#fff" />
          </TouchableOpacity>
          <View style={styles.headerTitleContainer}>
            <Text style={styles.headerTitle}>Hair Care Hub</Text>
            <Text style={styles.headerSubtitle}>Wig Maintenance & Styling Guides</Text>
          </View>
          <View style={{ width: ms(44) }} />
        </View>
      </LinearGradient>

      {/* ── Tab Switcher ────────────────────────────── */}
      <View style={styles.tabContainer}>
        <View style={styles.tabsWrapper}>
          <TouchableOpacity
            style={[styles.tabButton, activeTab === 'articles' && [styles.activeTabButton, { borderBottomColor: themeColor }]]}
            onPress={() => setActiveTab('articles')}
          >
            <Ionicons name="newspaper-outline" size={ms(18)} color={activeTab === 'articles' ? themeColor : '#666'} />
            <Text style={[styles.tabButtonText, activeTab === 'articles' && { color: themeColor, fontWeight: '800' }]}>
              Articles
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.tabButton, activeTab === 'videos' && [styles.activeTabButton, { borderBottomColor: themeColor }]]}
            onPress={() => setActiveTab('videos')}
          >
            <Ionicons name="videocam-outline" size={ms(18)} color={activeTab === 'videos' ? themeColor : '#666'} />
            <Text style={[styles.tabButtonText, activeTab === 'videos' && { color: themeColor, fontWeight: '800' }]}>
              Videos
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {activeTab === 'articles' ? (
          <View>
            {/* Category Filters */}
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.filtersContainer}
            >
              {['all', 'Care', 'Styling', 'Storage'].map(cat => {
                const isSelected = selectedCategory === cat;
                return (
                  <TouchableOpacity
                    key={cat}
                    style={[
                      styles.filterPill,
                      isSelected ? { backgroundColor: themeColor } : { backgroundColor: '#fff', borderColor: themeLight, borderWidth: 1 }
                    ]}
                    onPress={() => setSelectedCategory(cat)}
                  >
                    <Text style={[styles.filterText, isSelected ? { color: '#fff' } : { color: themeMedium }]}>
                      {cat === 'all' ? 'All Guides' : cat}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>

            {/* Articles List */}
            {filteredArticles.length === 0 ? (
              <View style={styles.emptyContainer}>
                <Ionicons name="document-text-outline" size={48} color={themeLight} />
                <Text style={styles.emptyText}>No guides found in this category.</Text>
              </View>
            ) : (
              filteredArticles.map((article, index) => (
                <Animated.View
                  key={article.id}
                  entering={FadeInDown.delay(100 + index * 50)}
                >
                  <TouchableOpacity
                    style={styles.articleCard}
                    activeOpacity={0.9}
                    onPress={() => setSelectedArticle(article)}
                  >
                    <View style={styles.articleMeta}>
                      <View style={[styles.categoryBadge, { backgroundColor: themePale }]}>
                        <Text style={[styles.categoryBadgeText, { color: themeColor }]}>
                          {article.category.toUpperCase()}
                        </Text>
                      </View>
                      <Text style={styles.readTime}>{article.readTime} min read</Text>
                    </View>

                    <Text style={styles.articleCardTitle}>{article.title}</Text>
                    <Text style={styles.articleExcerpt} numberOfLines={2}>{article.excerpt}</Text>

                    <View style={styles.articleCardFooter}>
                      <Text style={styles.articleAuthor}>By {article.author}</Text>
                      <View style={styles.readGuideBtn}>
                        <Text style={[styles.readGuideText, { color: themeColor }]}>Read Guide</Text>
                        <Ionicons name="arrow-forward" size={14} color={themeColor} style={{ marginLeft: 2 }} />
                      </View>
                    </View>
                  </TouchableOpacity>
                </Animated.View>
              ))
            )}
          </View>
        ) : (
          <View style={styles.videosListContainer}>
            {VIDEOS.map((video, index) => (
              <Animated.View
                key={video.id}
                entering={FadeInDown.delay(100 + index * 50)}
              >
                <TouchableOpacity
                  style={styles.videoCard}
                  activeOpacity={0.9}
                  onPress={() => setSelectedVideo(video)}
                >
                  <View style={styles.videoThumbnailContainer}>
                    <Image
                      source={{ uri: `https://img.youtube.com/vi/${video.videoId}/mqdefault.jpg` }}
                      style={styles.videoThumbnail}
                    />
                    <View style={styles.videoPlayOverlay}>
                      <View style={styles.videoPlayBtn}>
                        <Ionicons name="play" size={24} color="#fff" style={{ marginLeft: 3 }} />
                      </View>
                    </View>
                    <View style={styles.videoDurationBadge}>
                      <Text style={styles.videoDurationText}>{video.duration}</Text>
                    </View>
                  </View>

                  <View style={styles.videoCardDetails}>
                    <View style={[styles.categoryBadge, { backgroundColor: themePale, alignSelf: 'flex-start' }]}>
                      <Text style={[styles.categoryBadgeText, { color: themeColor }]}>
                        {video.category.toUpperCase()}
                      </Text>
                    </View>
                    <Text style={styles.videoCardTitle}>{video.title}</Text>
                    
                    <View style={styles.videoCardFooter}>
                      <View style={styles.videoMetaItem}>
                        <Ionicons name="person-circle-outline" size={16} color={themeColor} />
                        <Text style={styles.videoMetaText}>{video.author}</Text>
                      </View>
                      <View style={styles.videoMetaItem}>
                        <Ionicons name="eye-outline" size={16} color="#888" />
                        <Text style={styles.videoMetaText}>{formatViews(video.views)} views</Text>
                      </View>
                    </View>
                  </View>
                </TouchableOpacity>
              </Animated.View>
            ))}
          </View>
        )}

        {/* ── Community Support Section ───────────────── */}
        <Animated.View entering={FadeInDown.delay(300)} style={styles.supportShell}>
          <View style={[styles.supportIconBg, { backgroundColor: themePale }]}>
            <Ionicons name="help-circle-outline" size={ms(28)} color={themeColor} />
          </View>
          <Text style={styles.supportTitle}>Need More Help?</Text>
          <Text style={styles.supportDesc}>
            Connect with our community for personalized wig care tips and peer support from others who understand.
          </Text>
        </Animated.View>
      </ScrollView>

      {/* ── Article Modal ───────────────────────────── */}
      {selectedArticle && (
        <Modal
          visible={true}
          animationType="slide"
          transparent={false}
          onRequestClose={() => setSelectedArticle(null)}
        >
          <View style={[styles.modalContainer, { backgroundColor: '#fff', paddingTop: insets.top }]}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalHeaderTitle} numberOfLines={1}>
                {selectedArticle.title}
              </Text>
              <TouchableOpacity
                onPress={() => setSelectedArticle(null)}
                style={styles.modalCloseBtn}
              >
                <Ionicons name="close" size={24} color="#333" />
              </TouchableOpacity>
            </View>

            <ScrollView contentContainerStyle={styles.modalScrollContent} showsVerticalScrollIndicator={false}>
              <View style={[styles.modalMetaBox, { backgroundColor: themePale }]}>
                <View style={[styles.categoryBadge, { backgroundColor: themeColor }]}>
                  <Text style={[styles.categoryBadgeText, { color: '#fff' }]}>
                    {selectedArticle.category.toUpperCase()}
                  </Text>
                </View>
                <View style={styles.modalMetaItem}>
                  <Ionicons name="person-outline" size={14} color={themeColor} />
                  <Text style={styles.modalMetaText}>By {selectedArticle.author}</Text>
                </View>
                <View style={styles.modalMetaItem}>
                  <Ionicons name="calendar-outline" size={14} color="#888" />
                  <Text style={styles.modalMetaText}>{formatDate(selectedArticle.created_at)}</Text>
                </View>
                <View style={styles.modalMetaItem}>
                  <Ionicons name="time-outline" size={14} color="#888" />
                  <Text style={styles.modalMetaText}>{selectedArticle.readTime} min read</Text>
                </View>
              </View>

              <View style={styles.articleBody}>
                {renderArticleContent(selectedArticle.content)}
              </View>

              <TouchableOpacity
                style={[styles.closeGuideBtn, { backgroundColor: themeColor }]}
                onPress={() => setSelectedArticle(null)}
              >
                <Text style={styles.closeGuideBtnText}>Close Guide</Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </Modal>
      )}

      {/* ── Video Modal ─────────────────────────────── */}
      {selectedVideo && (
        <Modal
          visible={true}
          animationType="fade"
          transparent={true}
          onRequestClose={() => setSelectedVideo(null)}
        >
          <TouchableOpacity
            style={styles.modalOverlay}
            activeOpacity={1}
            onPress={() => setSelectedVideo(null)}
          >
            <TouchableOpacity
              style={styles.videoModalContent}
              activeOpacity={1}
              onPress={e => e.stopPropagation()}
            >
              <View style={styles.videoPlayerPlaceholder}>
                <Image
                  source={{ uri: `https://img.youtube.com/vi/${selectedVideo.videoId}/mqdefault.jpg` }}
                  style={styles.videoPlayerImage}
                />
                <TouchableOpacity
                  style={styles.videoModalPlayOverlayBtn}
                  onPress={() => handlePlayVideo(selectedVideo.videoId)}
                >
                  <View style={[styles.videoModalPlayBtn, { backgroundColor: themeColor }]}>
                    <Ionicons name="play" size={32} color="#fff" style={{ marginLeft: 4 }} />
                  </View>
                </TouchableOpacity>
              </View>

              <View style={styles.videoModalDetails}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <View style={{ flex: 1, paddingRight: ms(8) }}>
                    <Text style={styles.videoModalTitle}>{selectedVideo.title}</Text>
                    <Text style={[styles.videoModalAuthor, { color: themeColor }]}>By {selectedVideo.author}</Text>
                  </View>
                  <TouchableOpacity
                    onPress={() => setSelectedVideo(null)}
                    style={styles.videoModalCloseX}
                  >
                    <Ionicons name="close" size={20} color="#333" />
                  </TouchableOpacity>
                </View>

                <View style={styles.videoModalStats}>
                  <Text style={styles.videoModalStatText}>{formatViews(selectedVideo.views)} views</Text>
                  <Text style={styles.videoModalStatSeparator}>•</Text>
                  <Text style={styles.videoModalStatText}>{formatDate(selectedVideo.created_at)}</Text>
                  <Text style={styles.videoModalStatSeparator}>•</Text>
                  <Text style={styles.videoModalStatText}>{selectedVideo.duration}</Text>
                </View>

                <Text style={styles.videoModalDescription}>
                  {selectedVideo.description}
                </Text>

                <TouchableOpacity
                  style={[styles.watchYouTubeBtn, { backgroundColor: themeColor }]}
                  onPress={() => handlePlayVideo(selectedVideo.videoId)}
                >
                  <Ionicons name="logo-youtube" size={18} color="#fff" style={{ marginRight: 8 }} />
                  <Text style={styles.watchYouTubeBtnText}>Watch on YouTube</Text>
                </TouchableOpacity>
              </View>
            </TouchableOpacity>
          </TouchableOpacity>
        </Modal>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    borderBottomLeftRadius: ms(24),
    borderBottomRightRadius: ms(24),
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2, shadowRadius: 8, elevation: 6,
    zIndex: 10,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: ms(10),
    paddingVertical: vs(15),
  },
  headerTitleContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
  },
  headerTitle: { fontSize: ms(20), fontWeight: '900', color: '#fff', letterSpacing: 0.5 },
  headerSubtitle: { fontSize: ms(11), color: 'rgba(255, 255, 255, 0.85)', fontWeight: '600', marginTop: vs(2) },
  backBtn: { width: ms(44), height: ms(44), alignItems: 'center', justifyContent: 'center' },

  tabContainer: {
    backgroundColor: '#fff',
    borderBottomWidth: 1.5,
    borderBottomColor: '#f0f0f0',
    paddingHorizontal: ms(16),
  },
  tabsWrapper: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: ms(24),
  },
  tabButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: vs(14),
    borderBottomWidth: 3,
    borderBottomColor: 'transparent',
    gap: ms(6),
    paddingHorizontal: ms(8),
  },
  activeTabButton: {
    borderBottomWidth: 3,
  },
  tabButtonText: {
    fontSize: ms(14),
    fontWeight: '700',
    color: '#666',
  },

  scrollContent: {
    paddingBottom: vs(40),
  },

  filtersContainer: {
    paddingHorizontal: ms(16),
    paddingVertical: vs(14),
    gap: ms(8),
  },
  filterPill: {
    paddingHorizontal: ms(16),
    paddingVertical: vs(8),
    borderRadius: ms(20),
    justifyContent: 'center',
    alignItems: 'center',
  },
  filterText: {
    fontSize: ms(13),
    fontWeight: '700',
  },

  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: vs(60),
  },
  emptyText: {
    fontSize: ms(14),
    color: '#888',
    fontWeight: '600',
    marginTop: vs(10),
  },

  articleCard: {
    backgroundColor: '#fff',
    marginHorizontal: ms(16),
    marginBottom: vs(16),
    borderRadius: ms(18),
    padding: ms(16),
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 3,
    borderWidth: 1,
    borderColor: '#f2eef2',
  },
  articleMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: vs(10),
  },
  categoryBadge: {
    paddingHorizontal: ms(8),
    paddingVertical: vs(4),
    borderRadius: ms(6),
  },
  categoryBadgeText: {
    fontSize: ms(10),
    fontWeight: '900',
  },
  readTime: {
    fontSize: ms(12),
    color: '#8c7d91',
    fontWeight: '600',
  },
  articleCardTitle: {
    fontSize: ms(16),
    fontWeight: '800',
    color: '#1a1a1a',
    marginBottom: vs(6),
  },
  articleExcerpt: {
    fontSize: ms(13),
    color: '#555',
    lineHeight: vs(18),
    marginBottom: vs(14),
  },
  articleCardFooter: {
    borderTopWidth: 1,
    borderTopColor: '#fbf9fb',
    paddingTop: vs(10),
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  articleAuthor: {
    fontSize: ms(12),
    color: '#4a3452',
    fontWeight: '700',
  },
  readGuideBtn: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  readGuideText: {
    fontSize: ms(13),
    fontWeight: '800',
  },

  videosListContainer: {
    paddingTop: vs(12),
  },
  videoCard: {
    backgroundColor: '#fff',
    marginHorizontal: ms(16),
    marginBottom: vs(20),
    borderRadius: ms(20),
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 3,
    borderWidth: 1,
    borderColor: '#f2eef2',
  },
  videoThumbnailContainer: {
    height: vs(180),
    width: '100%',
    position: 'relative',
    backgroundColor: '#000',
  },
  videoThumbnail: {
    width: '100%',
    height: '100%',
    opacity: 0.85,
  },
  videoPlayOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
  },
  videoPlayBtn: {
    width: ms(52),
    height: ms(52),
    borderRadius: ms(26),
    backgroundColor: 'rgba(173, 36, 109, 0.9)',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 5,
  },
  videoDurationBadge: {
    position: 'absolute',
    bottom: vs(8),
    right: ms(8),
    backgroundColor: 'rgba(0, 0, 0, 0.85)',
    paddingHorizontal: ms(6),
    paddingVertical: vs(3),
    borderRadius: ms(4),
  },
  videoDurationText: {
    color: '#fff',
    fontSize: ms(11),
    fontWeight: '700',
  },
  videoCardDetails: {
    padding: ms(14),
  },
  videoCardTitle: {
    fontSize: ms(15),
    fontWeight: '800',
    color: '#1a1a1a',
    marginTop: vs(6),
    marginBottom: vs(10),
  },
  videoCardFooter: {
    borderTopWidth: 1,
    borderTopColor: '#fbf9fb',
    paddingTop: vs(10),
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  videoMetaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: ms(4),
  },
  videoMetaText: {
    fontSize: ms(12),
    color: '#666',
    fontWeight: '700',
  },

  supportShell: {
    backgroundColor: '#fff',
    marginHorizontal: ms(16),
    marginTop: vs(20),
    borderRadius: ms(22),
    padding: ms(20),
    alignItems: 'center',
    textAlign: 'center',
    borderWidth: 1.5,
    borderColor: '#f2eef2',
  },
  supportIconBg: {
    width: ms(52),
    height: ms(52),
    borderRadius: ms(26),
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: vs(12),
  },
  supportTitle: {
    fontSize: ms(16),
    fontWeight: '900',
    color: '#1a1a1a',
    marginBottom: vs(6),
  },
  supportDesc: {
    fontSize: ms(13),
    color: '#666',
    textAlign: 'center',
    lineHeight: vs(18),
  },

  modalContainer: {
    flex: 1,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: ms(16),
    paddingVertical: vs(14),
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  modalHeaderTitle: {
    fontSize: ms(16),
    fontWeight: '900',
    color: '#1a1a1a',
    flex: 1,
    paddingRight: ms(12),
  },
  modalCloseBtn: {
    width: ms(36),
    height: ms(36),
    borderRadius: ms(18),
    backgroundColor: '#f5f0f4',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalScrollContent: {
    paddingBottom: vs(40),
  },
  modalMetaBox: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    marginHorizontal: ms(16),
    marginVertical: vs(16),
    padding: ms(12),
    borderRadius: ms(12),
    gap: ms(12),
  },
  modalMetaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: ms(4),
  },
  modalMetaText: {
    fontSize: ms(12),
    color: '#444',
    fontWeight: '700',
  },
  articleBody: {
    paddingHorizontal: ms(20),
    marginBottom: vs(24),
  },
  articleHeader: {
    fontSize: ms(16),
    fontWeight: '800',
    marginTop: vs(16),
    marginBottom: vs(8),
  },
  listItemRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: vs(8),
    paddingLeft: ms(4),
  },
  listNumber: {
    fontSize: ms(14),
    fontWeight: '800',
    marginRight: ms(6),
    minWidth: ms(16),
  },
  listItemText: {
    flex: 1,
    fontSize: ms(14),
    color: '#333',
    lineHeight: vs(20),
  },
  bulletItemRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: vs(6),
    paddingLeft: ms(12),
  },
  bulletDot: {
    fontSize: ms(14),
    fontWeight: '800',
    marginRight: ms(6),
  },
  bulletItemText: {
    flex: 1,
    fontSize: ms(14),
    color: '#333',
    lineHeight: vs(20),
  },
  paragraph: {
    fontSize: ms(14),
    color: '#333',
    lineHeight: vs(22),
    marginBottom: vs(12),
  },
  closeGuideBtn: {
    marginHorizontal: ms(20),
    marginTop: vs(10),
    paddingVertical: vs(12),
    borderRadius: ms(25),
    justifyContent: 'center',
    alignItems: 'center',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 3,
  },
  closeGuideBtnText: {
    color: '#fff',
    fontSize: ms(14),
    fontWeight: '800',
  },

  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  videoModalContent: {
    width: SCREEN_WIDTH * 0.9,
    backgroundColor: '#fff',
    borderRadius: ms(24),
    overflow: 'hidden',
  },
  videoPlayerPlaceholder: {
    height: vs(200),
    backgroundColor: '#000',
    position: 'relative',
  },
  videoPlayerImage: {
    width: '100%',
    height: '100%',
    opacity: 0.75,
  },
  videoModalPlayOverlayBtn: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
  },
  videoModalPlayBtn: {
    width: ms(64),
    height: ms(64),
    borderRadius: ms(32),
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
    elevation: 6,
  },
  videoModalDetails: {
    padding: ms(20),
  },
  videoModalTitle: {
    fontSize: ms(18),
    fontWeight: '800',
    color: '#1a1a1a',
  },
  videoModalAuthor: {
    fontSize: ms(13),
    fontWeight: '700',
    marginTop: vs(2),
  },
  videoModalCloseX: {
    width: ms(30),
    height: ms(30),
    borderRadius: ms(15),
    backgroundColor: '#f5f0f4',
    justifyContent: 'center',
    alignItems: 'center',
  },
  videoModalStats: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: vs(8),
    marginBottom: vs(12),
  },
  videoModalStatText: {
    fontSize: ms(12),
    color: '#888',
    fontWeight: '600',
  },
  videoModalStatSeparator: {
    fontSize: ms(12),
    color: '#888',
    marginHorizontal: ms(6),
  },
  videoModalDescription: {
    fontSize: ms(14),
    color: '#555',
    lineHeight: vs(20),
    marginBottom: vs(20),
  },
  watchYouTubeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: vs(12),
    borderRadius: ms(25),
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 3,
  },
  watchYouTubeBtnText: {
    color: '#fff',
    fontSize: ms(14),
    fontWeight: '800',
  },
});
