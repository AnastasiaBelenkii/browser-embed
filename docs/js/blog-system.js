// Simple client-side blog system that doesn't interfere with performance
export class BlogSystem {
    constructor() {
        this.currentPost = null;
        this.markdownProcessor = null;
    }

    async initialize() {
        // Lazy load markdown processor only when needed
        if (!this.markdownProcessor) {
            const { marked } = await import('https://cdn.jsdelivr.net/npm/marked@9.1.6/lib/marked.esm.js');
            this.markdownProcessor = marked;
        }
        
        this.setupRouting();
        this.loadCurrentPost();
    }

    setupRouting() {
        // Hash-based routing for GitHub Pages compatibility
        window.addEventListener('hashchange', () => this.loadCurrentPost());
    }

    async loadCurrentPost() {
        const hash = window.location.hash.slice(1) || 'semantic-search';
        
        try {
            const response = await fetch(`content/${hash}.md`);
            if (response.ok) {
                const markdown = await response.text();
                this.renderPost(markdown, hash);
            } else {
                // Fallback to default content if markdown file not found
                this.renderFallbackContent(hash);
            }
        } catch (error) {
            console.log('Markdown not found, using fallback content');
            this.renderFallbackContent(hash);
        }
    }

    renderPost(markdown, postId) {
        const { frontmatter, content } = this.parseFrontmatter(markdown);
        const html = this.markdownProcessor.parse(content);
        
        document.title = frontmatter.title || 'Interactive ML Blog';
        document.querySelector('.content').innerHTML = html;
        
        // Initialize any interactive components mentioned in the post
        this.initializeInteractiveComponents(postId);
    }

    renderFallbackContent(postId) {
        // Fallback content for when markdown files aren't found
        if (postId === 'semantic-search') {
            document.querySelector('.content').innerHTML = `
                <section>
                    <h1>Interactive Semantic Search</h1>
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
        } else {
            document.querySelector('.content').innerHTML = `
                <section>
                    <h1>Page Not Found</h1>
                    <p>The requested post "${postId}" was not found.</p>
                    <p><a href="#semantic-search">Return to Semantic Search Demo</a></p>
                </section>
            `;
        }
        
        // Initialize components for the fallback content
        this.initializeInteractiveComponents(postId);
    }

    initializeInteractiveComponents(postId) {
        // Only initialize components needed for this post
        if (postId === 'semantic-search') {
            // This is where your current search component gets initialized
            this.initializeSemanticSearch();
        }
    }

    async initializeSemanticSearch() {
        // Small delay to ensure DOM is ready
        await new Promise(resolve => setTimeout(resolve, 100));
        
        // Dynamically import and initialize only when needed
        const { initializeSearchComponent } = await import('./search-component.js');
        initializeSearchComponent();
    }

    parseFrontmatter(markdown) {
        const frontmatterRegex = /^---\s*\n([\s\S]*?)\n---\s*\n([\s\S]*)$/;
        const match = markdown.match(frontmatterRegex);
        
        if (match) {
            const frontmatterText = match[1];
            const content = match[2];
            const frontmatter = {};
            
            frontmatterText.split('\n').forEach(line => {
                const colonIndex = line.indexOf(':');
                if (colonIndex > -1) {
                    const key = line.slice(0, colonIndex).trim();
                    const value = line.slice(colonIndex + 1).trim().replace(/['"]/g, '');
                    frontmatter[key] = value;
                }
            });
            
            return { frontmatter, content };
        }
        
        return { frontmatter: {}, content: markdown };
    }
}
