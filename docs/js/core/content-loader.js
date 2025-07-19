// Content loading with caching and error handling
import { perf } from '../utils/performance.js';

class ContentLoader {
    constructor() {
        this.cache = new Map();
        this.loadingPromises = new Map();
    }

    async loadContent(path, useCache = true) {
        const cacheKey = path;
        
        // Return cached content if available
        if (useCache && this.cache.has(cacheKey)) {
            return this.cache.get(cacheKey);
        }

        // Return existing promise if already loading
        if (this.loadingPromises.has(cacheKey)) {
            return this.loadingPromises.get(cacheKey);
        }

        const loadingPromise = this._loadContentInternal(path, cacheKey, useCache);
        this.loadingPromises.set(cacheKey, loadingPromise);
        
        try {
            const result = await loadingPromise;
            this.loadingPromises.delete(cacheKey);
            return result;
        } catch (error) {
            this.loadingPromises.delete(cacheKey);
            throw error;
        }
    }

    async _loadContentInternal(path, cacheKey, useCache) {
        return await perf.measureAsync(`Load content: ${path}`, async () => {
            try {
                const response = await fetch(path);
                
                if (!response.ok) {
                    throw new Error(`Failed to load ${path}: ${response.status} ${response.statusText}`);
                }
                
                const content = await response.text();
                
                if (useCache) {
                    this.cache.set(cacheKey, content);
                }
                
                return content;
            } catch (error) {
                console.error(`Content loading failed for ${path}:`, error);
                throw error;
            }
        });
    }

    clearCache() {
        this.cache.clear();
    }

    getCacheSize() {
        return this.cache.size;
    }
}

export const contentLoader = new ContentLoader();
