/**
 * History Service for Plant Identification Results
 * Handles storage, retrieval, and display of identification history
 */
class HistoryService {
    constructor() {
        this.storageKey = 'plantid-history';
        this.maxHistoryItems = 100; // Limit history to prevent storage overflow
    }

    /**
     * Initialize history service
     */
    init() {
        this.setupEventListeners();
        this.displayHistory();
    }

    /**
     * Setup event listeners
     */
    setupEventListeners() {
        const searchInput = document.getElementById('searchHistory');
        const clearHistoryBtn = document.getElementById('clearHistoryBtn');

        if (searchInput) {
            searchInput.addEventListener('input', (e) => {
                const target = e.target;
                if (target && target instanceof HTMLInputElement) {
                    this.filterHistory(target.value);
                }
            });
        }

        if (clearHistoryBtn) {
            clearHistoryBtn.addEventListener('click', () => {
                this.confirmClearHistory();
            });
        }
    }

    /**
     * Save identification result to history
     */
    saveToHistory(result) {
        try {
            const history = this.getHistory();
            
            const historyItem = {
                id: this.generateId(),
                timestamp: new Date().toISOString(),
                plantName: result.data.plantName,
                scientificName: result.data.scientificName,
                family: result.data.family,
                confidence: result.data.confidence,
                description: result.data.description,
                imageData: result.imageData, // Base64 image
                careInstructions: result.data.careInstructions,
                characteristics: result.data.characteristics,
                seasonalCare: result.data.seasonalCare,
                tips: result.data.tips
            };

            // Add to beginning of array
            history.unshift(historyItem);

            // Limit history size
            if (history.length > this.maxHistoryItems) {
                history.splice(this.maxHistoryItems);
            }

            // Save to localStorage
            localStorage.setItem(this.storageKey, JSON.stringify(history));

            // Refresh display
            this.displayHistory();

            return true;
        } catch (error) {
            console.error('Error saving to history:', error);
            return false;
        }
    }

    /**
     * Get history from localStorage
     */
    getHistory() {
        try {
            const stored = localStorage.getItem(this.storageKey);
            return stored ? JSON.parse(stored) : [];
        } catch (error) {
            console.error('Error loading history:', error);
            return [];
        }
    }

    /**
     * Display history items
     */
    displayHistory(items = null) {
        const historyGrid = document.getElementById('historyGrid');
        const emptyHistory = document.getElementById('emptyHistory');

        if (!historyGrid || !emptyHistory) return;

        const history = items || this.getHistory();

        if (history.length === 0) {
            historyGrid.style.display = 'none';
            emptyHistory.style.display = 'block';
            return;
        }

        historyGrid.style.display = 'grid';
        emptyHistory.style.display = 'none';

        // Clear existing items
        historyGrid.innerHTML = '';

        // Create history items
        history.forEach(item => {
            const historyElement = this.createHistoryElement(item);
            historyGrid.appendChild(historyElement);
        });
    }

    /**
     * Create history item element
     */
    createHistoryElement(item) {
        const historyItem = document.createElement('div');
        historyItem.className = 'history-item';
        historyItem.dataset.historyId = item.id;

        const formattedDate = this.formatDate(item.timestamp);
        
        historyItem.innerHTML = `
            <img src="${item.imageData}" alt="${item.plantName}" class="history-image" loading="lazy">
            <div class="history-info">
                <h4>${this.escapeHtml(item.plantName)}</h4>
                <div class="history-scientific">${this.escapeHtml(item.scientificName)}</div>
                <div class="history-date">${formattedDate}</div>
                <span class="history-confidence">Confidence: ${item.confidence}%</span>
                <div class="history-actions">
                    <button class="btn btn-secondary btn-small" onclick="historyService.viewDetails('${item.id}')">
                        View Details
                    </button>
                    <button class="btn btn-secondary btn-small" onclick="historyService.deleteItem('${item.id}')">
                        Delete
                    </button>
                </div>
            </div>
        `;

        // Add click listener for full details
        historyItem.addEventListener('click', (e) => {
            // Don't trigger if clicking on buttons
            const target = e.target;
            if (target && target instanceof HTMLElement && !target.classList.contains('btn')) {
                this.viewDetails(item.id);
            }
        });

        return historyItem;
    }

    /**
     * Filter history based on search term
     */
    filterHistory(searchTerm) {
        const history = this.getHistory();
        
        if (!searchTerm.trim()) {
            this.displayHistory(history);
            return;
        }

        const filtered = history.filter(item => {
            const term = searchTerm.toLowerCase();
            return (
                item.plantName.toLowerCase().includes(term) ||
                item.scientificName.toLowerCase().includes(term) ||
                item.family.toLowerCase().includes(term) ||
                item.description.toLowerCase().includes(term)
            );
        });

        this.displayHistory(filtered);
    }

    /**
     * View detailed information for a history item
     */
    viewDetails(itemId) {
        const history = this.getHistory();
        const item = history.find(h => h.id === itemId);

        if (!item) {
            this.showNotification('History item not found', 'error');
            return;
        }

        // Create detailed view modal
        const modal = this.createDetailModal(item);
        document.body.appendChild(modal);

        // Focus trap and close handlers
        this.setupModalHandlers(modal);
    }

    /**
     * Create detailed view modal
     */
    createDetailModal(item) {
        const modal = document.createElement('div');
        modal.className = 'history-modal-overlay';
        modal.innerHTML = `
            <div class="history-modal">
                <div class="history-modal-header">
                    <h2>${this.escapeHtml(item.plantName)}</h2>
                    <button class="modal-close" aria-label="Close">&times;</button>
                </div>
                <div class="history-modal-content">
                    <div class="history-modal-image">
                        <img src="${item.imageData}" alt="${item.plantName}" loading="lazy">
                    </div>
                    <div class="history-modal-info">
                        <div class="plant-details-section">
                            <h3>Plant Information</h3>
                            <div class="detail-item">
                                <strong>Scientific Name:</strong> <em>${this.escapeHtml(item.scientificName)}</em>
                            </div>
                            <div class="detail-item">
                                <strong>Family:</strong> ${this.escapeHtml(item.family)}
                            </div>
                            <div class="detail-item">
                                <strong>Confidence:</strong> 
                                <span class="confidence-badge">${item.confidence}%</span>
                            </div>
                            <div class="detail-item">
                                <strong>Date:</strong> ${this.formatDate(item.timestamp)}
                            </div>
                            <div class="detail-item">
                                <strong>Description:</strong> ${this.escapeHtml(item.description)}
                            </div>
                        </div>

                        <div class="plant-details-section">
                            <h3>Care Instructions</h3>
                            ${this.renderCareInstructions(item.careInstructions)}
                        </div>

                        <div class="plant-details-section">
                            <h3>Plant Characteristics</h3>
                            ${this.renderCharacteristics(item.characteristics)}
                        </div>

                        <div class="plant-details-section">
                            <h3>Seasonal Care</h3>
                            ${this.renderSeasonalCare(item.seasonalCare)}
                        </div>

                        ${item.tips && item.tips.length > 0 ? `
                        <div class="plant-details-section">
                            <h3>Care Tips</h3>
                            <ul class="care-tips-list">
                                ${item.tips.map(tip => `<li>${this.escapeHtml(tip)}</li>`).join('')}
                            </ul>
                        </div>
                        ` : ''}
                    </div>
                </div>
            </div>
        `;

        return modal;
    }

    /**
     * Setup modal event handlers
     */
    setupModalHandlers(modal) {
        const closeBtn = modal.querySelector('.modal-close');
        
        // Close on button click
        if (closeBtn) {
            closeBtn.addEventListener('click', () => {
                modal.remove();
            });
        }

        // Close on overlay click
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                modal.remove();
            }
        });

        // Close on escape key
        const escapeHandler = (e) => {
            if (e.key === 'Escape') {
                modal.remove();
                document.removeEventListener('keydown', escapeHandler);
            }
        };
        document.addEventListener('keydown', escapeHandler);
    }

    /**
     * Delete history item
     */
    deleteItem(itemId) {
        if (!confirm('Are you sure you want to delete this plant identification?')) {
            return;
        }

        try {
            const history = this.getHistory();
            const filtered = history.filter(item => item.id !== itemId);
            
            localStorage.setItem(this.storageKey, JSON.stringify(filtered));
            this.displayHistory();
            this.showNotification('Plant identification deleted', 'success');
        } catch (error) {
            console.error('Error deleting history item:', error);
            this.showNotification('Failed to delete item', 'error');
        }
    }

    /**
     * Confirm and clear all history
     */
    confirmClearHistory() {
        if (!confirm('Are you sure you want to clear all plant identification history? This cannot be undone.')) {
            return;
        }

        try {
            localStorage.removeItem(this.storageKey);
            this.displayHistory();
            this.showNotification('History cleared successfully', 'success');
            
            // Clear search input
            const searchInput = document.getElementById('searchHistory');
            if (searchInput && searchInput instanceof HTMLInputElement) {
                searchInput.value = '';
            }
        } catch (error) {
            console.error('Error clearing history:', error);
            this.showNotification('Failed to clear history', 'error');
        }
    }

    /**
     * Export history as JSON
     */
    exportHistory() {
        const history = this.getHistory();
        
        if (history.length === 0) {
            this.showNotification('No history to export', 'error');
            return;
        }

        try {
            const dataStr = JSON.stringify(history, null, 2);
            const dataBlob = new Blob([dataStr], { type: 'application/json' });
            
            const link = document.createElement('a');
            link.href = URL.createObjectURL(dataBlob);
            link.download = `plant-identification-history-${new Date().toISOString().split('T')[0]}.json`;
            
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            
            URL.revokeObjectURL(link.href);
            this.showNotification('History exported successfully', 'success');
        } catch (error) {
            console.error('Export error:', error);
            this.showNotification('Failed to export history', 'error');
        }
    }

    /**
     * Get history statistics
     */
    getHistoryStats() {
        const history = this.getHistory();
        
        if (history.length === 0) {
            return {
                totalIdentifications: 0,
                uniquePlants: 0,
                averageConfidence: 0,
                mostCommonFamily: 'None',
                dateRange: 'None'
            };
        }

        const uniquePlants = history.reduce((acc, item) => {
            if (!acc.includes(item.scientificName)) {
                acc.push(item.scientificName);
            }
            return acc;
        }, []).length;
        const averageConfidence = Math.round(
            history.reduce((sum, item) => sum + item.confidence, 0) / history.length
        );

        // Find most common family
        const familyCounts = {};
        history.forEach(item => {
            familyCounts[item.family] = (familyCounts[item.family] || 0) + 1;
        });
        
        const mostCommonFamily = Object.keys(familyCounts).reduce((a, b) => 
            familyCounts[a] > familyCounts[b] ? a : b
        );

        // Date range
        const dates = history.map(item => new Date(item.timestamp));
        const oldestDate = new Date(Math.min(...dates));
        const newestDate = new Date(Math.max(...dates));
        const dateRange = `${this.formatDate(oldestDate.toISOString())} - ${this.formatDate(newestDate.toISOString())}`;

        return {
            totalIdentifications: history.length,
            uniquePlants,
            averageConfidence,
            mostCommonFamily,
            dateRange
        };
    }

    // Utility methods

    /**
     * Generate unique ID
     */
    generateId() {
        return Date.now().toString(36) + Math.random().toString(36).substr(2);
    }

    /**
     * Format date for display
     */
    formatDate(isoString) {
        const date = new Date(isoString);
        return date.toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    }

    /**
     * Escape HTML to prevent XSS
     */
    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    /**
     * Render care instructions
     */
    renderCareInstructions(care) {
        return `
            <div class="care-grid">
                <div class="care-item">
                    <strong>Light:</strong> ${this.escapeHtml(care.light)}
                </div>
                <div class="care-item">
                    <strong>Water:</strong> ${this.escapeHtml(care.water)}
                </div>
                <div class="care-item">
                    <strong>Soil:</strong> ${this.escapeHtml(care.soil)}
                </div>
                <div class="care-item">
                    <strong>Temperature:</strong> ${this.escapeHtml(care.temperature)}
                </div>
                <div class="care-item">
                    <strong>Humidity:</strong> ${this.escapeHtml(care.humidity)}
                </div>
                <div class="care-item">
                    <strong>Fertilizer:</strong> ${this.escapeHtml(care.fertilizer)}
                </div>
            </div>
        `;
    }

    /**
     * Render characteristics
     */
    renderCharacteristics(chars) {
        return `
            <div class="characteristics-grid">
                <div class="characteristic-item">
                    <strong>Size:</strong> ${this.escapeHtml(chars.size)}
                </div>
                <div class="characteristic-item">
                    <strong>Growth:</strong> ${this.escapeHtml(chars.growth)}
                </div>
                <div class="characteristic-item">
                    <strong>Blooming:</strong> ${this.escapeHtml(chars.blooming)}
                </div>
                <div class="characteristic-item">
                    <strong>Toxicity:</strong> ${this.escapeHtml(chars.toxicity)}
                </div>
                <div class="characteristic-item">
                    <strong>Difficulty:</strong> ${this.escapeHtml(chars.difficulty)}
                </div>
            </div>
        `;
    }

    /**
     * Render seasonal care
     */
    renderSeasonalCare(seasonal) {
        return `
            <div class="seasonal-care-grid">
                <div class="season-item">
                    <h4>Spring</h4>
                    <p>${this.escapeHtml(seasonal.spring)}</p>
                </div>
                <div class="season-item">
                    <h4>Summer</h4>
                    <p>${this.escapeHtml(seasonal.summer)}</p>
                </div>
                <div class="season-item">
                    <h4>Fall</h4>
                    <p>${this.escapeHtml(seasonal.fall)}</p>
                </div>
                <div class="season-item">
                    <h4>Winter</h4>
                    <p>${this.escapeHtml(seasonal.winter)}</p>
                </div>
            </div>
        `;
    }

    /**
     * Show notification
     */
    showNotification(message, type = 'info') {
        // Reuse camera service notification system
        if (typeof window !== 'undefined' && window.cameraService) {
            if (type === 'success') {
                window.cameraService.showSuccess(message);
            } else {
                window.cameraService.showError(message);
            }
        } else {
            // Fallback alert
            alert(message);
        }
    }
}

// Add modal styles
const modalStyles = `
    <style>
        .history-modal-overlay {
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: rgba(0, 0, 0, 0.8);
            z-index: 10000;
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 20px;
            backdrop-filter: blur(5px);
        }

        .history-modal {
            background: var(--secondary-black);
            border: 2px solid var(--primary-green);
            border-radius: 12px;
            max-width: 90vw;
            max-height: 90vh;
            overflow: hidden;
            box-shadow: 0 20px 40px rgba(0, 255, 65, 0.3);
        }

        .history-modal-header {
            background: linear-gradient(135deg, var(--primary-green), var(--secondary-green));
            color: var(--primary-black);
            padding: 20px;
            display: flex;
            justify-content: space-between;
            align-items: center;
        }

        .history-modal-header h2 {
            margin: 0;
            font-size: 1.5rem;
            font-weight: 600;
        }

        .modal-close {
            background: none;
            border: none;
            color: var(--primary-black);
            font-size: 24px;
            font-weight: bold;
            cursor: pointer;
            padding: 5px;
            border-radius: 4px;
            transition: var(--transition-fast);
        }

        .modal-close:hover {
            background: rgba(0, 0, 0, 0.1);
        }

        .history-modal-content {
            display: grid;
            grid-template-columns: 300px 1fr;
            gap: 20px;
            padding: 20px;
            max-height: 70vh;
            overflow-y: auto;
        }

        .history-modal-image img {
            width: 100%;
            height: 200px;
            object-fit: cover;
            border-radius: 8px;
            border: 2px solid var(--primary-green);
        }

        .plant-details-section {
            margin-bottom: 30px;
        }

        .plant-details-section h3 {
            color: var(--primary-green);
            margin-bottom: 15px;
            font-size: 1.2rem;
        }

        .detail-item {
            margin-bottom: 10px;
            line-height: 1.6;
        }

        .detail-item strong {
            color: var(--secondary-green);
        }

        .confidence-badge {
            background: rgba(0, 255, 65, 0.2);
            color: var(--primary-green);
            padding: 2px 8px;
            border-radius: 12px;
            font-size: 0.9rem;
            font-weight: 600;
        }

        .care-grid, .characteristics-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 15px;
        }

        .care-item, .characteristic-item {
            background: var(--tertiary-black);
            padding: 15px;
            border-radius: 8px;
            border: 1px solid var(--border-gray);
        }

        .seasonal-care-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 15px;
        }

        .season-item {
            background: var(--tertiary-black);
            padding: 15px;
            border-radius: 8px;
            border: 1px solid var(--border-gray);
        }

        .season-item h4 {
            color: var(--secondary-green);
            margin: 0 0 10px 0;
        }

        .care-tips-list {
            list-style: none;
            padding: 0;
        }

        .care-tips-list li {
            background: var(--tertiary-black);
            margin-bottom: 10px;
            padding: 12px;
            border-radius: 6px;
            border-left: 3px solid var(--primary-green);
        }

        .history-actions {
            margin-top: 10px;
            display: flex;
            gap: 10px;
        }

        .btn-small {
            padding: 5px 10px;
            font-size: 0.8rem;
        }

        @media (max-width: 768px) {
            .history-modal-content {
                grid-template-columns: 1fr;
            }
            
            .care-grid, .characteristics-grid, .seasonal-care-grid {
                grid-template-columns: 1fr;
            }
            
            .history-modal {
                max-width: 95vw;
                max-height: 95vh;
            }
        }
    </style>
`;

// Inject modal styles
document.head.insertAdjacentHTML('beforeend', modalStyles);

// Create global instance
if (typeof window !== 'undefined') {
    window.historyService = new HistoryService();
}