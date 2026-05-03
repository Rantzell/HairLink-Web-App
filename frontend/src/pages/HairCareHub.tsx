import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import apiClient from '../api/client';

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

const HairCareHub: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'articles' | 'videos'>('articles');
  const [articles, setArticles] = useState<Article[]>([]);
  const [videos, setVideos] = useState<Video[]>([]);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [loading, setLoading] = useState(true);
  const [selectedArticle, setSelectedArticle] = useState<Article | null>(null);
  const [selectedVideo, setSelectedVideo] = useState<Video | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const [articlesRes, videosRes] = await Promise.all([
          apiClient.get('/internal-api/haircare/articles'),
          apiClient.get('/internal-api/haircare/videos')
        ]);
        
        if (articlesRes.data && articlesRes.data.length > 0) {
           setArticles(articlesRes.data);
        } else {
           throw new Error("No articles");
        }

        if (videosRes.data && videosRes.data.length > 0) {
           setVideos(videosRes.data);
        } else {
           throw new Error("No videos");
        }
        
      } catch (err) {
        setArticles([
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
        ]);
        setVideos([
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
        ]);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const formatViews = (views: number) => {
    if (views >= 1000000) return (views / 1000000).toFixed(1) + 'M';
    if (views >= 1000) return (views / 1000).toFixed(1) + 'K';
    return views.toString();
  };

  const filteredArticles = selectedCategory === 'all' 
    ? articles 
    : articles.filter(a => a.category === selectedCategory);

  const renderContent = (content: string) => {
    return content.split('\n\n').map((para, i) => {
      // Check for bold headers
      if (para.startsWith('**') && para.endsWith(':**')) {
        return <h4 key={i} style={{ color: '#ad246d', marginTop: '1.8rem', marginBottom: '0.8rem', fontWeight: 800, fontSize: '1.1rem' }}>{para.replace(/\*\*/g, '')}</h4>;
      }
      
      // Check for numbered lists
      if (para.match(/^\d\./)) {
        return <div key={i} style={{ marginBottom: '1.2rem', display: 'flex', gap: '0.8rem' }}>
          <span style={{ fontWeight: 800, color: '#ad246d', minWidth: '20px' }}>{para.split('.')[0]}.</span>
          <p style={{ margin: 0, lineHeight: 1.7 }}>{para.substring(para.indexOf('.') + 1).trim()}</p>
        </div>;
      }

      // Check for bullet points
      if (para.startsWith('- ')) {
        const items = para.split('\n').map((item, j) => (
          <li key={j} style={{ marginBottom: '0.6rem', paddingLeft: '0.5rem' }}>{item.substring(2)}</li>
        ));
        return <ul key={i} style={{ paddingLeft: '1.5rem', marginBottom: '1.5rem', listStyleType: 'circle', color: '#4a3452' }}>{items}</ul>;
      }

      return <p key={i} style={{ marginBottom: '1.2rem', lineHeight: 1.8, color: '#3b2e43' }}>{para}</p>;
    });
  };

  return (
    <section className="section-wrap reveal active" style={{ maxWidth: '1100px', margin: '0 auto', padding: '0 1rem' }}>
      <div className="section-title-block" style={{ marginBottom: '3.5rem' }}>
        <h1 style={{ fontSize: '2.2rem', fontWeight: 800, color: '#3b2e43', marginBottom: '0.6rem' }}>Hair Care Hub</h1>
        <p style={{ fontSize: '1rem', color: '#6b5b6d', maxWidth: '600px', margin: '0 auto' }}>Learn how to maintain, style, and care for your wig with expert guides from our community.</p>
      </div>

      <div className="tabs-navigation" style={{ borderBottom: '2px solid #f2eef2', marginBottom: '3rem', display: 'flex', justifyContent: 'center', gap: '1.5rem' }}>
        <button 
          className={`tab-btn ${activeTab === 'articles' ? 'active' : ''}`}
          onClick={() => setActiveTab('articles')}
          style={{ paddingBottom: '0.8rem', fontSize: '1rem', fontWeight: 700 }}
        >
          <i className='bx bx-news' style={{ marginRight: '0.5rem' }}></i> Articles
        </button>
        <button 
          className={`tab-btn ${activeTab === 'videos' ? 'active' : ''}`}
          onClick={() => setActiveTab('videos')}
          style={{ paddingBottom: '0.8rem', fontSize: '1rem', fontWeight: 700 }}
        >
          <i className='bx bx-video' style={{ marginRight: '0.5rem' }}></i> Video Tutorials
        </button>
      </div>

      {loading ? (
        <div className="loading-state" style={{ textAlign: 'center', padding: '5rem 0' }}>
          <div className="loading-spinner" style={{ width: '40px', height: '40px', borderTopColor: '#ad246d' }}></div>
          <p style={{ marginTop: '1.2rem', color: '#8c7d91', fontWeight: 500 }}>Fetching latest guides...</p>
        </div>
      ) : (
        <>
          {activeTab === 'articles' ? (
            <div className="tab-content active">
              <div className="articles-header" style={{ marginBottom: '2.5rem' }}>
                <div className="category-filters" style={{ justifyContent: 'center', gap: '0.6rem' }}>
                  {['all', 'Care', 'Styling', 'Storage'].map(cat => (
                    <button 
                      key={cat}
                      className={`filter-btn ${selectedCategory === cat ? 'active' : ''}`}
                      onClick={() => setSelectedCategory(cat)}
                      style={{ padding: '0.5rem 1.4rem', fontSize: '0.85rem', fontWeight: 600, borderRadius: '50px' }}
                    >
                      {cat === 'all' ? 'All Guides' : cat}
                    </button>
                  ))}
                </div>
              </div>
              
              <div className="articles-grid" style={{ gap: '1.5rem' }}>
                {filteredArticles.length === 0 ? (
                  <div className="empty-state" style={{ padding: '4rem', borderRadius: '20px' }}>
                    <p>No guides found in this category.</p>
                  </div>
                ) : (
                  filteredArticles.map(article => (
                    <article key={article.id} className="article-card" onClick={() => setSelectedArticle(article)} style={{ borderRadius: '18px', border: '1px solid #f2eef2', padding: '1.5rem', background: '#fff', boxShadow: '0 4px 15px rgba(0,0,0,0.02)' }}>
                      <div className="article-header" style={{ marginBottom: '1rem' }}>
                        <div className="article-meta">
                          <span className="category-badge" style={{ background: '#fdf2f8', color: '#ad246d', fontWeight: 800, fontSize: '0.7rem', padding: '0.3rem 0.8rem', borderRadius: '6px' }}>{article.category}</span>
                          <span className="read-time" style={{ fontSize: '0.8rem', color: '#8c7d91' }}>{article.readTime} min read</span>
                        </div>
                      </div>
                      <h3 className="article-title" style={{ fontSize: '1.2rem', fontWeight: 800, color: '#3b2e43', marginBottom: '0.8rem' }}>{article.title}</h3>
                      <p className="article-excerpt" style={{ fontSize: '0.9rem', color: '#6b5b6d', lineHeight: 1.6 }}>{article.excerpt}</p>
                      <div className="article-footer" style={{ borderTop: '1px solid #fbf9fb', paddingTop: '1rem', marginTop: '1.2rem' }}>
                        <div className="article-info">
                          <span className="author" style={{ fontWeight: 700, color: '#4a3452', fontSize: '0.8rem' }}>By {article.author}</span>
                          <span className="date" style={{ fontSize: '0.75rem', color: '#8c7d91' }}>{formatDate(article.created_at)}</span>
                        </div>
                        <span style={{ color: '#ad246d', fontWeight: 800, fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>Read Guide <i className='bx bx-right-arrow-alt'></i></span>
                      </div>
                    </article>
                  ))
                )}
              </div>
            </div>
          ) : (
            <div className="tab-content active">
              <div className="videos-grid" style={{ gap: '1.5rem' }}>
                {videos.length === 0 ? (
                  <div className="empty-state">
                    <p>No tutorials available yet.</p>
                  </div>
                ) : (
                  videos.map(video => (
                    <div key={video.id} className="video-card" onClick={() => setSelectedVideo(video)} style={{ borderRadius: '18px', border: '1px solid #f2eef2', overflow: 'hidden' }}>
                      <div className="video-thumbnail" style={{ height: '190px' }}>
                        {video.source === 'youtube' ? (
                          <img 
                            src={`https://img.youtube.com/vi/${video.videoId}/mqdefault.jpg`} 
                            alt={video.title} 
                          />
                        ) : (
                          <div className="video-icon">🎬</div>
                        )}
                        <div className="play-button" style={{ width: '52px', height: '52px', background: 'rgba(173, 36, 109, 0.9)' }}>
                          <svg width="36" height="36" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M5 3l14 9-14 9V3z"></path>
                          </svg>
                        </div>
                        <span className="duration" style={{ fontSize: '0.75rem', background: 'rgba(0,0,0,0.8)' }}>{video.duration}</span>
                      </div>
                      <div className="video-info" style={{ padding: '1.2rem' }}>
                        <span className="category-badge" style={{ background: '#fdf2f8', color: '#ad246d', alignSelf: 'flex-start', fontSize: '0.7rem', fontWeight: 800 }}>{video.category}</span>
                        <h3 className="video-title" style={{ fontSize: '1.05rem', marginTop: '0.6rem', fontWeight: 800, color: '#3b2e43' }}>{video.title}</h3>
                        <div className="video-meta" style={{ borderTop: '1px solid #fbf9fb', paddingTop: '0.8rem', marginTop: '1rem' }}>
                          <span className="author" style={{ fontSize: '0.8rem', fontWeight: 600 }}>
                             <i className='bx bxs-user-circle' style={{ marginRight: '0.3rem', color: '#ad246d' }}></i> {video.author}
                          </span>
                          <span className="views" style={{ fontSize: '0.8rem' }}>
                             <i className='bx bx-show' style={{ marginRight: '0.3rem' }}></i> {formatViews(video.views)} views
                          </span>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </>
      )}

      {/* Modern Support Section */}
      <div className="support-shell" style={{ marginTop: '5rem', background: '#fdfafd', border: '1px solid #f2eef2', borderRadius: '24px', padding: '3rem 2rem', textAlign: 'center' }}>
        <div style={{ width: '50px', height: '50px', background: '#fdf2f8', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.5rem', color: '#ad246d' }}>
           <i className='bx bx-help-circle' style={{ fontSize: '1.8rem' }}></i>
        </div>
        <h3 style={{ fontSize: '1.4rem', fontWeight: 800, color: '#3b2e43', marginBottom: '0.8rem' }}>Need More Help?</h3>
        <p style={{ color: '#6b5b6d', fontSize: '0.95rem', maxWidth: '500px', margin: '0 auto 2rem', lineHeight: 1.6 }}>Connect with our community for personalized wig care tips and peer support from others who understand.</p>
        <div style={{ display: 'flex', justifyContent: 'center' }}>
          <Link to="/recipient/community" className="soft-btn" style={{ height: '42px', padding: '0 2rem', fontSize: '0.9rem', borderRadius: '50px', fontWeight: 700, background: 'linear-gradient(135deg, #cf2f84, #a0206a)', boxShadow: '0 4px 15px rgba(207, 47, 132, 0.2)' }}>
             Visit Community Forum
          </Link>
        </div>
      </div>

      {/* Article Modal - Improved Layout */}
      {selectedArticle && (
        <div className="modal" style={{ display: 'flex', background: 'rgba(26, 11, 26, 0.5)', backdropFilter: 'blur(5px)' }} onClick={() => setSelectedArticle(null)}>
          <div className="modal-content" style={{ borderRadius: '24px', maxWidth: '800px', maxHeight: '90vh', overflow: 'hidden', display: 'flex', flexDirection: 'column' }} onClick={e => e.stopPropagation()}>
            <div className="modal-header" style={{ padding: '1.8rem 2.5rem', borderBottom: '1px solid #f5f0f4', background: '#fff', position: 'sticky', top: 0, zIndex: 10 }}>
              <h2 style={{ fontSize: '1.4rem', fontWeight: 900, color: '#3b2e43', paddingRight: '2rem' }}>{selectedArticle.title}</h2>
              <button className="close-modal-btn" onClick={() => setSelectedArticle(null)} style={{ background: '#f5f0f4', borderRadius: '50%', width: '36px', height: '36px', position: 'absolute', right: '1.5rem', top: '1.5rem' }}>
                <i className='bx bx-x' style={{ fontSize: '1.4rem' }}></i>
              </button>
            </div>
            <div className="modal-body" style={{ padding: '0 2.5rem 2.5rem', overflowY: 'auto' }}>
              <div className="article-meta-info" style={{ border: 'none', background: '#fdfafd', padding: '1rem 1.5rem', borderRadius: '14px', margin: '1.5rem 0 2rem', display: 'flex', gap: '1.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
                <span className="category-badge" style={{ background: '#ad246d', color: '#fff', fontSize: '0.7rem', fontWeight: 800, padding: '0.3rem 0.8rem' }}>{selectedArticle.category}</span>
                <span className="meta-item" style={{ fontSize: '0.85rem', color: '#4a3452' }}>
                   <i className='bx bxs-user-circle' style={{ color: '#ad246d', marginRight: '0.3rem' }}></i> <b>{selectedArticle.author}</b>
                </span>
                <span className="meta-item" style={{ fontSize: '0.85rem', color: '#8c7d91' }}>
                   <i className='bx bx-calendar' style={{ marginRight: '0.3rem' }}></i> {formatDate(selectedArticle.created_at)}
                </span>
                <span className="meta-item" style={{ fontSize: '0.85rem', color: '#8c7d91' }}>
                   <i className='bx bx-time-five' style={{ marginRight: '0.3rem' }}></i> {selectedArticle.readTime} min read
                </span>
              </div>
              <div className="article-full-content" style={{ fontSize: '1rem', color: '#3b2e43' }}>
                {renderContent(selectedArticle.content)}
              </div>
              <div style={{ marginTop: '3rem', paddingTop: '1.5rem', borderTop: '1px solid #f2eef2', textAlign: 'center' }}>
                <p style={{ color: '#8c7d91', fontSize: '0.9rem', marginBottom: '1rem' }}>Found this guide helpful?</p>
                <button onClick={() => setSelectedArticle(null)} className="soft-btn" style={{ height: '38px', padding: '0 1.5rem', fontSize: '0.85rem', borderRadius: '50px', background: '#fdf2f8', color: '#ad246d', fontWeight: 700 }}>
                   Close Guide
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Video Modal */}
      {selectedVideo && (
        <div className="modal" style={{ display: 'flex', background: 'rgba(26, 11, 26, 0.7)', backdropFilter: 'blur(8px)' }} onClick={() => setSelectedVideo(null)}>
          <div className="modal-content-large" style={{ borderRadius: '24px', overflow: 'hidden', maxWidth: '1000px', background: '#fff' }} onClick={e => e.stopPropagation()}>
            <div className="video-player-container" style={{ background: '#000', aspectRatio: '16/9' }}>
              <iframe 
                width="100%" 
                height="100%" 
                src={selectedVideo.source === 'youtube' ? `https://www.youtube.com/embed/${selectedVideo.videoId}?autoplay=1` : selectedVideo.videoId} 
                frameBorder="0" 
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" 
                allowFullScreen
              ></iframe>
            </div>
            <div className="video-details" style={{ padding: '2rem' }}>
               <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '1rem' }}>
                  <div>
                    <h3 className="video-title-detail" style={{ fontSize: '1.3rem', fontWeight: 800, color: '#3b2e43' }}>{selectedVideo.title}</h3>
                    <p className="video-author" style={{ color: '#ad246d', fontWeight: 700, fontSize: '0.9rem', marginTop: '0.4rem' }}>{selectedVideo.author}</p>
                  </div>
                  <button className="close-modal-btn" onClick={() => setSelectedVideo(null)} style={{ background: '#f5f0f4', borderRadius: '50%', width: '36px', height: '36px' }}>
                    <i className='bx bx-x' style={{ fontSize: '1.4rem' }}></i>
                  </button>
               </div>
              <div className="video-stats" style={{ marginTop: '0.8rem', fontSize: '0.85rem', color: '#8c7d91', display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                <span>{formatViews(selectedVideo.views)} views</span>
                <span className="separator">•</span>
                <span>{formatDate(selectedVideo.created_at)}</span>
              </div>
              <div className="video-description-full" style={{ borderTop: '1px solid #f2eef2', paddingTop: '1.5rem', marginTop: '1.5rem', fontSize: '0.95rem', color: '#6b5b6d', lineHeight: 1.7 }}>
                {selectedVideo.description}
              </div>
            </div>
          </div>
        </div>
      )}
    </section>
  );
};

export default HairCareHub;
