/**
 * Main Application Controller
 * Coordinates all plant identification functionality
 */
class PlantIdentificationApp {
    constructor() {
        this.currentSection = 'home';
        this.currentImageFile = null;
        this.isIdentifying = false;
        this.plantGuideData = null;
    }

    /**
     * Initialize application
     */
    init() {
        this.setupEventListeners();
        this.setupFileHandling();
        this.setupNavigation();
        this.initializeServices();
        this.loadPlantGuide();
        this.checkAPIConnection();
    }

    /**
     * Setup main event listeners
     */
    setupEventListeners() {
        // File input handler
        const fileInput = document.getElementById('fileInput');
        if (fileInput) {
            fileInput.addEventListener('change', (e) => this.handleFileSelection(e));
        }

        // Analyze button
        const analyzeBtn = document.getElementById('analyzeBtn');
        if (analyzeBtn) {
            analyzeBtn.addEventListener('click', () => this.analyzeCurrentImage());
        }

        // Clear button
        const clearBtn = document.getElementById('clearBtn');
        if (clearBtn) {
            clearBtn.addEventListener('click', () => this.clearCurrentImage());
        }

        // Plant guide category buttons
        document.addEventListener('click', (e) => {
            const target = e.target;
            if (target && target.classList.contains('category-btn')) {
                this.filterPlantGuide(target.dataset.category);
            }
        });
    }

    /**
     * Setup drag and drop file handling
     */
    setupFileHandling() {
        const uploadArea = document.getElementById('uploadArea');
        if (!uploadArea) return;

        // Prevent default drag behaviors
        ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
            uploadArea.addEventListener(eventName, this.preventDefaults, false);
            document.body.addEventListener(eventName, this.preventDefaults, false);
        });

        // Highlight drop area when item is dragged over it
        ['dragenter', 'dragover'].forEach(eventName => {
            uploadArea.addEventListener(eventName, () => {
                uploadArea.classList.add('drag-over');
            }, false);
        });

        ['dragleave', 'drop'].forEach(eventName => {
            uploadArea.addEventListener(eventName, () => {
                uploadArea.classList.remove('drag-over');
            }, false);
        });

        // Handle dropped files
        uploadArea.addEventListener('drop', (e) => {
            const files = e.dataTransfer ? e.dataTransfer.files : [];
            if (files.length > 0) {
                this.handleFileSelection({ target: { files } });
            }
        }, false);

        // Handle click to upload
        uploadArea.addEventListener('click', () => {
            const fileInput = document.getElementById('fileInput');
            if (fileInput) {
                fileInput.click();
            }
        });
    }

    /**
     * Setup navigation system
     */
    setupNavigation() {
        const navButtons = document.querySelectorAll('.nav-btn');
        
        navButtons.forEach(btn => {
            btn.addEventListener('click', (e) => {
                const target = e.target;
                if (target && target.dataset.section) {
                    this.switchSection(target.dataset.section);
                }
            });
        });

        // Make switchSection globally available
        window.switchSection = (sectionName) => {
            this.switchSection(sectionName);
        };
    }

    /**
     * Initialize services
     */
    initializeServices() {
        // Initialize camera service
        if (window.cameraService) {
            window.cameraService.init();
        }

        // Initialize history service
        if (window.historyService) {
            window.historyService.init();
        }
    }

    /**
     * Switch between app sections
     */
    switchSection(sectionName) {
        // Hide all sections
        const sections = document.querySelectorAll('.section');
        sections.forEach(section => {
            section.classList.remove('active');
        });

        // Show target section
        const targetSection = document.getElementById(sectionName);
        if (targetSection) {
            targetSection.classList.add('active');
            this.currentSection = sectionName;
        }

        // Update navigation buttons
        const navButtons = document.querySelectorAll('.nav-btn');
        navButtons.forEach(btn => {
            btn.classList.remove('active');
            if (btn.dataset.section === sectionName) {
                btn.classList.add('active');
            }
        });

        // Section-specific initialization
        if (sectionName === 'history') {
            if (window.historyService) {
                window.historyService.displayHistory();
            }
        }
    }

    /**
     * Handle file selection (upload or drag-drop)
     */
    handleFileSelection(event) {
        const files = event.target.files;
        if (!files || files.length === 0) return;

        const file = files[0];

        // Validate file type
        if (!this.isValidImageFile(file)) {
            this.showNotification('Please select a valid image file (JPG, PNG, GIF, WebP)', 'error');
            return;
        }

        // Validate file size (max 10MB)
        if (file.size > 10 * 1024 * 1024) {
            this.showNotification('Image file is too large. Please select a file smaller than 10MB.', 'error');
            return;
        }

        // Process the file
        this.processImageFile(file);
    }

    /**
     * Validate image file type
     */
    isValidImageFile(file) {
        const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
        return validTypes.includes(file.type.toLowerCase());
    }

    /**
     * Process selected image file
     */
    processImageFile(file) {
        const previewArea = document.getElementById('previewArea');
        const previewImage = document.getElementById('previewImage');
        const uploadArea = document.getElementById('uploadArea');

        if (previewImage && previewArea) {
            // Create object URL for preview
            const imageUrl = URL.createObjectURL(file);
            previewImage.src = imageUrl;
            
            // Store file reference
            this.currentImageFile = file;
            if (typeof window !== 'undefined') {
                window.currentImageFile = file;
            }

            // Show preview area
            previewArea.style.display = 'block';
            if (uploadArea) {
                uploadArea.style.display = 'none';
            }

            // Scroll to preview
            previewArea.scrollIntoView({ behavior: 'smooth' });

            this.showNotification('Image loaded successfully! Click "Analyze Plant" to identify.', 'success');
        }
    }

    /**
     * Analyze current image
     */
    async analyzeCurrentImage() {
        if (!this.currentImageFile && !window.currentImageFile) {
            this.showNotification('Please select an image first', 'error');
            return;
        }

        if (this.isIdentifying) {
            this.showNotification('Analysis already in progress', 'error');
            return;
        }

        const imageFile = this.currentImageFile || window.currentImageFile;

        // Show loading state
        this.showLoadingState();
        this.isIdentifying = true;

        try {
            // Analyze with AI service
            const result = await window.aiService.identifyPlant(imageFile);

            if (result.success) {
                // Display results
                this.displayResults(result);
                
                // Save to history
                if (window.historyService) {
                    window.historyService.saveToHistory(result);
                }
                
                this.showNotification('Plant identified successfully!', 'success');
            } else {
                // Handle analysis failure
                this.handleAnalysisFailure(result);
            }
        } catch (error) {
            console.error('Analysis error:', error);
            this.showNotification('Failed to analyze plant. Please try again.', 'error');
            this.hideLoadingState();
        }

        this.isIdentifying = false;
    }

    /**
     * Show loading state during analysis
     */
    showLoadingState() {
        const loadingContainer = document.getElementById('loadingContainer');
        const previewArea = document.getElementById('previewArea');
        const resultsArea = document.getElementById('resultsArea');

        if (loadingContainer) {
            loadingContainer.style.display = 'block';
            loadingContainer.scrollIntoView({ behavior: 'smooth' });
        }

        if (previewArea) {
            previewArea.style.display = 'none';
        }

        if (resultsArea) {
            resultsArea.style.display = 'none';
        }
    }

    /**
     * Hide loading state
     */
    hideLoadingState() {
        const loadingContainer = document.getElementById('loadingContainer');
        const previewArea = document.getElementById('previewArea');

        if (loadingContainer) {
            loadingContainer.style.display = 'none';
        }

        if (previewArea) {
            previewArea.style.display = 'block';
        }
    }

    /**
     * Display identification results
     */
    displayResults(result) {
        const resultsArea = document.getElementById('resultsArea');
        const resultsContent = document.getElementById('resultsContent');
        const loadingContainer = document.getElementById('loadingContainer');

        if (!resultsArea || !resultsContent) return;

        // Hide loading state
        if (loadingContainer) {
            loadingContainer.style.display = 'none';
        }

        // Create results HTML
        const resultsHTML = this.createResultsHTML(result);
        resultsContent.innerHTML = resultsHTML;

        // Show results area
        resultsArea.style.display = 'block';
        resultsArea.scrollIntoView({ behavior: 'smooth' });
    }

    /**
     * Create HTML for results display
     */
    createResultsHTML(result) {
        const data = result.data;
        
        return `
            <div class="plant-result">
                <img src="${result.imageData}" alt="${data.plantName}" class="plant-image">
                <div class="plant-info">
                    <h4>${this.escapeHtml(data.plantName)}</h4>
                    <div class="scientific-name">${this.escapeHtml(data.scientificName)}</div>
                    <div class="confidence-score">Confidence: ${data.confidence}%</div>
                    <div class="plant-family"><strong>Family:</strong> ${this.escapeHtml(data.family)}</div>
                    <div class="plant-description">
                        <p>${this.escapeHtml(data.description)}</p>
                    </div>
                </div>
            </div>

            <div class="plant-details">
                <div class="detail-section">
                    <h5>Care Instructions</h5>
                    <div class="care-grid">
                        <div class="care-item">
                            <h6>Light</h6>
                            <p>${this.escapeHtml(data.careInstructions.light)}</p>
                        </div>
                        <div class="care-item">
                            <h6>Water</h6>
                            <p>${this.escapeHtml(data.careInstructions.water)}</p>
                        </div>
                        <div class="care-item">
                            <h6>Soil</h6>
                            <p>${this.escapeHtml(data.careInstructions.soil)}</p>
                        </div>
                        <div class="care-item">
                            <h6>Temperature</h6>
                            <p>${this.escapeHtml(data.careInstructions.temperature)}</p>
                        </div>
                        <div class="care-item">
                            <h6>Humidity</h6>
                            <p>${this.escapeHtml(data.careInstructions.humidity)}</p>
                        </div>
                        <div class="care-item">
                            <h6>Fertilizer</h6>
                            <p>${this.escapeHtml(data.careInstructions.fertilizer)}</p>
                        </div>
                    </div>
                </div>

                <div class="detail-section">
                    <h5>Plant Characteristics</h5>
                    <div class="care-grid">
                        <div class="care-item">
                            <h6>Size</h6>
                            <p>${this.escapeHtml(data.characteristics.size)}</p>
                        </div>
                        <div class="care-item">
                            <h6>Growth Rate</h6>
                            <p>${this.escapeHtml(data.characteristics.growth)}</p>
                        </div>
                        <div class="care-item">
                            <h6>Flowering</h6>
                            <p>${this.escapeHtml(data.characteristics.blooming)}</p>
                        </div>
                        <div class="care-item">
                            <h6>Toxicity</h6>
                            <p>${this.escapeHtml(data.characteristics.toxicity)}</p>
                        </div>
                        <div class="care-item">
                            <h6>Difficulty</h6>
                            <p>${this.escapeHtml(data.characteristics.difficulty)}</p>
                        </div>
                    </div>
                </div>

                ${data.tips && data.tips.length > 0 ? `
                <div class="detail-section">
                    <h5>Care Tips</h5>
                    <ul class="care-tips">
                        ${data.tips.map(tip => `<li>${this.escapeHtml(tip)}</li>`).join('')}
                    </ul>
                </div>
                ` : ''}

                <div class="result-actions">
                    <button class="btn btn-primary" onclick="plantApp.clearCurrentImage()">Identify Another Plant</button>
                    <button class="btn btn-secondary" onclick="plantApp.switchSection('history')">View History</button>
                </div>
            </div>
        `;
    }

    /**
     * Handle analysis failure
     */
    handleAnalysisFailure(result) {
        this.hideLoadingState();

        const errorMessage = result.error || 'Failed to identify plant';
        this.showNotification(errorMessage, 'error');

        // Show fallback information if available
        if (result.fallback) {
            const resultsArea = document.getElementById('resultsArea');
            const resultsContent = document.getElementById('resultsContent');

            if (resultsArea && resultsContent) {
                const fallbackHTML = this.createFallbackHTML(result.fallback);
                resultsContent.innerHTML = fallbackHTML;
                resultsArea.style.display = 'block';
            }
        }
    }

    /**
     * Create HTML for fallback response
     */
    createFallbackHTML(fallbackData) {
        return `
            <div class="analysis-failed">
                <div class="error-icon">⚠️</div>
                <h4>Unable to Identify Plant</h4>
                <p>We couldn't identify this plant with confidence. Here are some general plant care guidelines:</p>
                
                <div class="fallback-care">
                    <h5>General Plant Care</h5>
                    <div class="care-grid">
                        <div class="care-item">
                            <h6>Light</h6>
                            <p>${this.escapeHtml(fallbackData.careInstructions.light)}</p>
                        </div>
                        <div class="care-item">
                            <h6>Water</h6>
                            <p>${this.escapeHtml(fallbackData.careInstructions.water)}</p>
                        </div>
                        <div class="care-item">
                            <h6>Soil</h6>
                            <p>${this.escapeHtml(fallbackData.careInstructions.soil)}</p>
                        </div>
                        <div class="care-item">
                            <h6>Temperature</h6>
                            <p>${this.escapeHtml(fallbackData.careInstructions.temperature)}</p>
                        </div>
                    </div>
                </div>

                <div class="improvement-tips">
                    <h5>For Better Results</h5>
                    <ul>
                        ${fallbackData.tips.map(tip => `<li>${this.escapeHtml(tip)}</li>`).join('')}
                    </ul>
                </div>

                <div class="result-actions">
                    <button class="btn btn-primary" onclick="plantApp.clearCurrentImage()">Try Another Image</button>
                    <button class="btn btn-secondary" onclick="plantApp.switchSection('guide')">Browse Plant Guide</button>
                </div>
            </div>
        `;
    }

    /**
     * Clear current image and reset to upload state
     */
    clearCurrentImage() {
        const previewArea = document.getElementById('previewArea');
        const uploadArea = document.getElementById('uploadArea');
        const resultsArea = document.getElementById('resultsArea');
        const loadingContainer = document.getElementById('loadingContainer');
        const fileInput = document.getElementById('fileInput');

        // Hide all secondary areas
        if (previewArea) previewArea.style.display = 'none';
        if (resultsArea) resultsArea.style.display = 'none';
        if (loadingContainer) loadingContainer.style.display = 'none';

        // Show upload area
        if (uploadArea) {
            uploadArea.style.display = 'block';
            uploadArea.scrollIntoView({ behavior: 'smooth' });
        }

        // Clear file input
        if (fileInput) {
            fileInput.value = '';
        }

        // Clear stored image
        this.currentImageFile = null;
        if (typeof window !== 'undefined') {
            window.currentImageFile = null;
        }

        // Reset identification state
        this.isIdentifying = false;
    }

    /**
     * Load plant guide data
     */
    async loadPlantGuide() {
        // Mock plant guide data (in a real app, this would come from an API)
        this.plantGuideData = [
            {
                name: 'Snake Plant',
                scientificName: 'Sansevieria trifasciata',
                category: 'indoor',
                description: 'Hardy indoor plant perfect for beginners',
                image: 'https://storage.googleapis.com/workspace-0f70711f-8b4e-4d94-86f1-2a93ccde5887/image/bed4a4cd-2afb-4289-8a97-f4ec74eba208.png',
                difficulty: 'Beginner',
                tags: ['low-light', 'low-water', 'air-purifying']
            },
            {
                name: 'Fiddle Leaf Fig',
                scientificName: 'Ficus lyrata',
                category: 'indoor',
                description: 'Popular houseplant with large, glossy leaves',
                image: 'https://storage.googleapis.com/workspace-0f70711f-8b4e-4d94-86f1-2a93ccde5887/image/fba2af05-50d6-4e6a-bedb-fc230ba4ed41.png',
                difficulty: 'Intermediate',
                tags: ['bright-light', 'statement-plant', 'large']
            },
            {
                name: 'Aloe Vera',
                scientificName: 'Aloe barbadensis',
                category: 'succulents',
                description: 'Medicinal succulent with healing properties',
                image: 'https://storage.googleapis.com/workspace-0f70711f-8b4e-4d94-86f1-2a93ccde5887/image/80a9018f-a16c-499c-84da-88e72b4fb392.png',
                difficulty: 'Beginner',
                tags: ['succulent', 'medicinal', 'low-water']
            },
            {
                name: 'Roses',
                scientificName: 'Rosa species',
                category: 'flowering',
                description: 'Classic flowering plants for gardens',
                image: 'https://storage.googleapis.com/workspace-0f70711f-8b4e-4d94-86f1-2a93ccde5887/image/3714c8a8-efb9-46ea-ac9a-02f3a7d2129d.png',
                difficulty: 'Intermediate',
                tags: ['flowering', 'fragrant', 'outdoor']
            },
            {
                name: 'Lavender',
                scientificName: 'Lavandula angustifolia',
                category: 'outdoor',
                description: 'Aromatic herb with purple flowers',
                image: 'https://storage.googleapis.com/workspace-0f70711f-8b4e-4d94-86f1-2a93ccde5887/image/2cf26596-c07d-4722-80b9-071f763c87b8.png',
                difficulty: 'Beginner',
                tags: ['aromatic', 'drought-tolerant', 'flowering']
            },
            {
                name: 'Echeveria',
                scientificName: 'Echeveria elegans',
                category: 'succulents',
                description: 'Rosette-forming succulent with colorful leaves',
                image: 'https://storage.googleapis.com/workspace-0f70711f-8b4e-4d94-86f1-2a93ccde5887/image/4913acd2-3909-44fd-85d3-fd6cf067cd1d.png',
                difficulty: 'Beginner',
                tags: ['succulent', 'colorful', 'compact']
            }
        ];

        this.displayPlantGuide();
    }

    /**
     * Display plant guide
     */
    displayPlantGuide(plants = null) {
        const plantsGrid = document.getElementById('plantsGrid');
        if (!plantsGrid) return;

        const plantsToShow = plants || this.plantGuideData || [];

        plantsGrid.innerHTML = plantsToShow.map(plant => `
            <div class="plant-card" data-category="${plant.category}">
                <img src="${plant.image}" alt="${plant.name}" class="plant-card-image" loading="lazy">
                <div class="plant-card-content">
                    <h4>${this.escapeHtml(plant.name)}</h4>
                    <div class="plant-card-scientific">${this.escapeHtml(plant.scientificName)}</div>
                    <p>${this.escapeHtml(plant.description)}</p>
                    <div class="plant-tags">
                        ${plant.tags.map(tag => `<span class="plant-tag">${tag}</span>`).join('')}
                    </div>
                    <div class="plant-difficulty">Difficulty: ${plant.difficulty}</div>
                </div>
            </div>
        `).join('');
    }

    /**
     * Filter plant guide by category
     */
    filterPlantGuide(category) {
        // Update active category button
        const categoryButtons = document.querySelectorAll('.category-btn');
        categoryButtons.forEach(btn => {
            btn.classList.remove('active');
            if (btn.dataset.category === category) {
                btn.classList.add('active');
            }
        });

        // Filter and display plants
        if (category === 'all') {
            this.displayPlantGuide();
        } else {
            const filtered = (this.plantGuideData || []).filter(plant => plant.category === category);
            this.displayPlantGuide(filtered);
        }
    }

    /**
     * Check API connection status
     */
    async checkAPIConnection() {
        if (window.aiService) {
            try {
                const isConnected = await window.aiService.testConnection();
                if (!isConnected) {
                    console.warn('AI API connection test failed');
                }
            } catch (error) {
                console.error('API connection check failed:', error);
            }
        }
    }

    // Utility methods

    /**
     * Prevent default drag behaviors
     */
    preventDefaults(e) {
        e.preventDefault();
        e.stopPropagation();
    }

    /**
     * Escape HTML to prevent XSS
     */
    escapeHtml(text) {
        if (typeof text !== 'string') return '';
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    /**
     * Show notification message
     */
    showNotification(message, type = 'info') {
        if (window.cameraService) {
            if (type === 'success') {
                window.cameraService.showSuccess(message);
            } else {
                window.cameraService.showError(message);
            }
        } else {
            // Fallback
            console.log(`${type.toUpperCase()}: ${message}`);
        }
    }
}

// Initialize application when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.plantApp = new PlantIdentificationApp();
    window.plantApp.init();
});

// Add additional CSS for results styling
const additionalStyles = `
    <style>
        .care-tips {
            list-style: none;
            padding: 0;
        }

        .care-tips li {
            background: var(--tertiary-black);
            margin-bottom: var(--spacing-xs);
            padding: var(--spacing-sm);
            border-radius: 6px;
            border-left: 3px solid var(--primary-green);
        }

        .result-actions {
            margin-top: var(--spacing-lg);
            text-align: center;
            display: flex;
            gap: var(--spacing-md);
            justify-content: center;
        }

        .analysis-failed {
            text-align: center;
            padding: var(--spacing-lg);
        }

        .error-icon {
            font-size: var(--font-size-4xl);
            margin-bottom: var(--spacing-md);
        }

        .fallback-care h5 {
            color: var(--primary-green);
            margin: var(--spacing-lg) 0 var(--spacing-md) 0;
        }

        .improvement-tips h5 {
            color: var(--secondary-green);
            margin: var(--spacing-lg) 0 var(--spacing-md) 0;
        }

        .improvement-tips ul {
            text-align: left;
            max-width: 500px;
            margin: 0 auto;
            background: var(--tertiary-black);
            padding: var(--spacing-md);
            border-radius: 8px;
        }

        .improvement-tips li {
            margin-bottom: var(--spacing-xs);
            color: var(--text-gray);
        }

        .plant-difficulty {
            margin-top: var(--spacing-sm);
            font-size: var(--font-size-sm);
            color: var(--secondary-green);
            font-weight: 500;
        }

        @media (max-width: 768px) {
            .result-actions {
                flex-direction: column;
                align-items: center;
            }
        }
    </style>
`;

// Inject additional styles
document.head.insertAdjacentHTML('beforeend', additionalStyles);