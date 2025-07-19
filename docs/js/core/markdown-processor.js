// Dedicated markdown processing with frontmatter support
export class MarkdownProcessor {
    constructor() {
        this.marked = null;
    }

    async initialize() {
        if (!this.marked) {
            const { marked } = await import('https://cdn.jsdelivr.net/npm/marked@9.1.6/lib/marked.esm.js');
            this.marked = marked;
            
            // Configure marked for better output
            this.marked.setOptions({
                breaks: false,
                gfm: true,
                headerIds: true,
                mangle: false
            });
        }
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

    async processMarkdown(markdown) {
        await this.initialize();
        
        const { frontmatter, content } = this.parseFrontmatter(markdown);
        const html = this.marked.parse(content);
        
        return { frontmatter, content, html };
    }

    buildPostHeader(frontmatter) {
        if (!frontmatter.title && !frontmatter.description) {
            return '';
        }

        let header = '<header class="post-header">';
        
        if (frontmatter.title) {
            header += `<h1 class="post-title">${frontmatter.title}</h1>`;
        }
        
        if (frontmatter.description) {
            header += `<p class="post-description">${frontmatter.description}</p>`;
        }
        
        header += '</header>';
        return header;
    }
}
