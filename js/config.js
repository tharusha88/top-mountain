/* Site settings — change media here, not in the HTML.
   heroVideo: set to null to turn the hero video off (the hero photo stays).
   sources are tried top to bottom; the first whose `media` matches the screen is used. */
window.SITE_CONFIG = {
  heroVideo: {
    sources: [
      { src: 'assets/video/hero-720.mp4?v=2', type: 'video/mp4', media: '(max-width: 899px)' }, // phones: 720p, 7 MB
      { src: 'assets/video/hero-1080.mp4?v=1', type: 'video/mp4' }                            // desktop: 1080p, 17 MB
    ],
    poster: 'assets/video/hero-poster.jpg?v=2'
  }
};
