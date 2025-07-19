// Simplified blog system focused on routing and orchestration
import { BLOG_CONFIG } from './config.js';
import { MarkdownProcessor } from './core/markdown-processor.js';
import { contentLoader } from './core/content-loader.js';
import { componentRegistry } from './core/component-registry.js';
import { perf } from './utils/performance.js';

export class BlogSystem {
    constructor() {
        this.currentPost = null;
        this.markdownProcessor = new MarkdownProcessor();
        this.isInitialized = false;
    }

    async initialize() {
        if (this.isInitialized) return;
        
        await perf.measureAsync('Blog system initialization', async () => {
            await this.markdownProcessor.initialize();
            this.setupRouting();
            await this.loadCurrentPost();
            this.isInitialized = true;
        });
    }

    setupRouting() {
        // Hash-based routing for GitHub Pages compatibility
        window.addEventListener('hashchange', () => this.loadCurrentPost());
        
        // Handle browser back/forward buttons
        window.addEventListener('popstate', () => this.loadCurrentPost());
    }

    async loadCurrentPost() {
        const hash = window.location.hash.slice(1) || BLOG_CONFIG.defaultPost;
        
        // Don't reload if we're already on this post
        if (this.currentPost === hash) return;
        
        try {
            await this.renderPost(hash);
            this.currentPost = hash;
        } catch (error) {
            console.error(`Failed to load post '${hash}':`, error);
            await this.renderErrorPage(hash, error);
        }
    }

    async renderPost(postId) {
        try {
            // Try to load markdown content
            const contentPath = `../content/${postId}.md`;
            const markdown = await contentLoader.loadContent(contentPath);
            const { frontmatter, html } = await this.markdownProcessor.processMarkdown(markdown);
            
            // Update document title
            const title = frontmatter.title || BLOG_CONFIG.posts[postId]?.title || BLOG_CONFIG.title;
            document.title = title;
            
            // Build and render content
            const header = this.markdownProcessor.buildPostHeader(frontmatter);
            const fullContent = header + html;
            document.querySelector('.content').innerHTML = fullContent;
            
            // Initialize interactive components
            await this.initializePostComponents(postId, frontmatter);
            
        } catch (error) {
            // Fall back to hardcoded content if markdown fails
            console.log('Markdown not found, using fallback content');
            await this.renderFallbackContent(postId);
        }
    }

    async initializePostComponents(postId, frontmatter) {
        const postConfig = BLOG_CONFIG.posts[postId];
        if (!postConfig?.component) {
            console.log(`No interactive component configured for post '${postId}'`);
            return;
        }

        try {
            await componentRegistry.initializeComponent(postConfig.component);
        } catch (error) {
            console.error(`Failed to initialize component '${postConfig.component}':`, error);
        }
    }

    async renderFallbackContent(postId) {
        const postConfig = BLOG_CONFIG.posts[postId];
        
        if (postId === 'semantic-search') {
            document.querySelector('.content').innerHTML = `
                <header class="post-header">
                    <h1 class="post-title">Interactive Semantic Search</h1>
                    <p class="post-description">Understanding embeddings through visualization</p>
                </header>
                <section>
                    <p>My attempt to wrap my head around embeddings and semantic search.</p>
                    
                    <div class="search-container">
                        <input
                            type="text"
                            id="search-input"
                            placeholder="Loading model..."
                            aria-label="Semantic search query"
                            disabled
                        />
                        <button id="search-button" disabled>Search</button>
                        <div id="spinner" class="spinner"></div>
                    </div>

                    <div id="query-container"></div>
                    <div id="corpus-container"></div>
                </section>
                
                <section>
                    <p>This demonstration runs entirely client-side, with no server processing.</p>
                    <p>Stay tuned as I add more functionality!</p>
                </section>
            `;
            
            // Initialize the component
            if (postConfig?.component) {
                try {
                    await componentRegistry.initializeComponent(postConfig.component);
                } catch (error) {
                    console.error(`Failed to initialize fallback component:`, error);
                }
            }
        } else {
            await this.renderErrorPage(postId, new Error('Post not found'));
        }
    }

    async renderErrorPage(postId, error) {
        document.querySelector('.content').innerHTML = `
            <section>
                <h1>Page Not Found</h1>
                <p>The requested post "${postId}" was not found.</p>
                <p><strong>Error:</strong> ${error.message}</p>
                <p><a href="#${BLOG_CONFIG.defaultPost}">Return to ${BLOG_CONFIG.posts[BLOG_CONFIG.defaultPost]?.title || 'Home'}</a></p>
            </section>
        `;
    }

    // Cleanup method for when we eventually migrate to Svelte
    cleanup() {
        componentRegistry.cleanupAll();
        contentLoader.clearCache();
    }
}
