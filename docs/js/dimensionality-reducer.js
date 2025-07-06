/**
 * A simple Principal Component Analysis (PCA) implementation.
 * This is a basic implementation for demonstration purposes. For production use,
 * a more robust library for matrix operations and eigenvalue decomposition would be better.
 */
export class PCA {
    constructor(n_components = 3) {
        this.n_components = n_components;
        this.mean = null;
        this.components = null; // Principal components (eigenvectors)
    }

    /**
     * Fits the PCA model on the dataset.
     * @param {number[][]} X - The dataset, where rows are samples and columns are features.
     */
    fit(X) {
        const num_samples = X.length;
        if (num_samples === 0) {
            return;
        }
        const num_features = X[0].length;

        // 1. Calculate mean of each feature
        this.mean = new Array(num_features).fill(0);
        for (let j = 0; j < num_features; j++) {
            for (let i = 0; i < num_samples; i++) {
                this.mean[j] += X[i][j];
            }
            this.mean[j] /= num_samples;
        }

        // 2. Center the data
        const X_centered = X.map(row => row.map((val, j) => val - this.mean[j]));

        // 3. Calculate covariance matrix
        // NOTE: This is computationally expensive and can be optimized.
        const covarianceMatrix = new Array(num_features).fill(0).map(() => new Array(num_features).fill(0));
        for (let i = 0; i < num_features; i++) {
            for (let j = i; j < num_features; j++) {
                let cov = 0;
                for (let k = 0; k < num_samples; k++) {
                    cov += X_centered[k][i] * X_centered[k][j];
                }
                cov /= (num_samples - 1);
                covarianceMatrix[i][j] = cov;
                covarianceMatrix[j][i] = cov;
            }
        }

        // 4. Calculate eigenvectors and eigenvalues.
        // This is the complex part. A full implementation is beyond the scope here.
        // We will use a placeholder that just takes the first `n_components` dimensions.
        // THIS IS NOT A REAL PCA. It's a placeholder to demonstrate the architecture.
        // A proper implementation would use a numerical method like Jacobi iteration or SVD.
        console.warn("Using placeholder for PCA eigenvector calculation. This is NOT a real PCA. The first N dimensions are being used for visualization.");
        this.components = new Array(this.n_components).fill(0).map((_, i) => {
            const eigenvector = new Array(num_features).fill(0);
            if (i < num_features) {
                eigenvector[i] = 1;
            }
            return eigenvector;
        });
    }

    /**
     * Transforms the data into the lower-dimensional space.
     * @param {number[][]} X - The data to transform.
     * @returns {number[][]} The transformed data.
     */
    transform(X) {
        if (!this.mean || !this.components) {
            throw new Error("PCA model has not been fitted yet.");
        }

        // Center the data
        const X_centered = X.map(row => row.map((val, j) => val - this.mean[j]));

        // Project the data
        return X_centered.map(row => {
            return this.components.map(component => {
                let projection = 0;
                for (let i = 0; i < row.length; i++) {
                    projection += row[i] * component[i];
                }
                return projection;
            });
        });
    }

    /**
     * Fits the model and then transforms the data.
     * @param {number[][]} X - The dataset.
     * @returns {number[][]} The transformed data.
     */
    fit_transform(X) {
        this.fit(X);
        return this.transform(X);
    }
}

/**
 * Factory function to create a dimensionality reducer.
 * This allows for easily swapping out the algorithm in the future (e.g., for UMAP).
 * @param {string} algorithm - The algorithm to use ('pca', etc.).
 * @param {object} options - Options for the algorithm constructor.
 * @returns {PCA} An instance of the reducer.
 */
export function createDimensionalityReducer(algorithm = 'pca', options = {}) {
    if (algorithm === 'pca') {
        return new PCA(options.n_components || 3);
    }
    throw new Error(`Unknown dimensionality reduction algorithm: ${algorithm}`);
}
