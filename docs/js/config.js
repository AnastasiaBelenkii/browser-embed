// Centralized configuration for the blog
export const BLOG_CONFIG = {
    title: 'Interactive ML Blog',
    description: 'Interactive ML blog with client-side demonstrations',
    defaultPost: 'semantic-search',
    
    // Post metadata will eventually come from a posts index
    posts: {
        'semantic-search': {
            title: 'Interactive Semantic Search',
            description: 'Understanding embeddings through visualization',
            component: 'search-component'
        }
    },
    
    // Performance tracking
    performance: {
        enableTracking: true,
        trackComponentLoad: true
    }
};
