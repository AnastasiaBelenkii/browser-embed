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
                // Fallback to current index.html content
                this.renderCurrentContent();
            }
        } catch (error) {
            console.log('Markdown not found, using current content');
            this.renderCurrentContent();
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

    renderCurrentContent() {
        // Keep existing content and functionality
        this.initializeInteractiveComponents('semantic-search');
    }

    initializeInteractiveComponents(postId) {
        // Only initialize components needed for this post
        if (postId === 'semantic-search') {
            // This is where your current search component gets initialized
            this.initializeSemanticSearch();
        }
    }

    async initializeSemanticSearch() {
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
