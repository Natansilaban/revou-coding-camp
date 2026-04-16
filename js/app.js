// Expense & Budget Visualizer Application

console.log('Expense & Budget Visualizer loaded');

// ============================================================================
// Data Models
// ============================================================================

/**
 * Category class represents a spending category
 * Requirements: 11.1, 11.2, 11.3
 */
class Category {
    /**
     * Creates a new Category instance
     * @param {string} name - Category name
     * @param {string} color - Hex color code for visualization
     * @param {boolean} isDefault - Whether this is a default category
     */
    constructor(name, color, isDefault = false) {
        this.name = name.trim();
        this.color = color;
        this.isDefault = isDefault;
    }

    /**
     * Converts category to JSON-serializable object
     * @returns {object} Plain object representation
     */
    toJSON() {
        return {
            name: this.name,
            color: this.color,
            isDefault: this.isDefault
        };
    }

    /**
     * Creates a Category instance from a JSON object
     * @param {object} json - Plain object with category data
     * @returns {Category} New Category instance
     */
    static fromJSON(json) {
        return new Category(json.name, json.color, json.isDefault);
    }
}

/**
 * Default categories
 */
const DEFAULT_CATEGORIES = [
    new Category('Food', '#FF6384', true),
    new Category('Transport', '#36A2EB', true),
    new Category('Fun', '#FFCE56', true)
];

/**
 * Transaction class represents a single expense transaction
 * Requirements: 6.1, 6.2, 6.3
 */
class Transaction {
    /**
     * Creates a new Transaction instance
     * @param {string} itemName - Name of the expense item (1-100 characters)
     * @param {number} amount - Expense amount (positive number, up to 2 decimals)
     * @param {string} category - Category name (Food, Transport, Fun, or custom)
     * @param {string} [id] - Optional UUID (generated if not provided)
     * @param {number} [timestamp] - Optional timestamp (generated if not provided)
     */
    constructor(itemName, amount, category, id = null, timestamp = null) {
        this.id = id || this.generateId();
        this.itemName = itemName.trim();
        this.amount = parseFloat(amount);
        this.category = category;
        this.timestamp = timestamp || Date.now();
    }

    /**
     * Generates a unique ID for the transaction
     * Uses crypto.randomUUID() if available, falls back to timestamp-based ID
     * @returns {string} Unique identifier
     */
    generateId() {
        if (typeof crypto !== 'undefined' && crypto.randomUUID) {
            return crypto.randomUUID();
        }
        // Fallback: timestamp + random number
        return `${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;
    }

    /**
     * Converts transaction to JSON-serializable object
     * @returns {object} Plain object representation
     */
    toJSON() {
        return {
            id: this.id,
            itemName: this.itemName,
            amount: this.amount,
            category: this.category,
            timestamp: this.timestamp
        };
    }

    /**
     * Creates a Transaction instance from a JSON object
     * @param {object} json - Plain object with transaction data
     * @returns {Transaction} New Transaction instance
     */
    static fromJSON(json) {
        return new Transaction(
            json.itemName,
            json.amount,
            json.category,
            json.id,
            json.timestamp
        );
    }
}

// ============================================================================
// Storage Layer
// ============================================================================

/**
 * Custom error for storage quota exceeded
 */
class StorageQuotaError extends Error {
    constructor(message) {
        super(message);
        this.name = 'StorageQuotaError';
    }
}

/**
 * Custom error for general storage failures
 */
class StorageError extends Error {
    constructor(message) {
        super(message);
        this.name = 'StorageError';
    }
}

/**
 * StorageManager class provides abstraction over Local Storage
 * Requirements: 6.1, 6.2, 6.3, 6.4
 */
class StorageManager {
    /**
     * Creates a new StorageManager instance
     * @param {string} storageKey - Key to use for Local Storage
     */
    constructor(storageKey = 'expense-tracker-data') {
        this.storageKey = storageKey;
        this.checkStorageAvailability();
    }

    /**
     * Checks if Local Storage is available
     * @throws {StorageError} If Local Storage is unavailable
     */
    checkStorageAvailability() {
        if (typeof Storage === 'undefined') {
            throw new StorageError('Local Storage is not available in this browser');
        }
    }

    /**
     * Saves data to Local Storage
     * @param {any} data - Data to save (will be JSON serialized)
     * @throws {StorageQuotaError} If storage quota is exceeded
     * @throws {StorageError} If save operation fails
     */
    save(data) {
        try {
            const json = JSON.stringify(data);
            localStorage.setItem(this.storageKey, json);
        } catch (error) {
            if (error.name === 'QuotaExceededError') {
                throw new StorageQuotaError('Storage limit exceeded. Please delete some transactions.');
            } else {
                throw new StorageError(`Failed to save data: ${error.message}`);
            }
        }
    }

    /**
     * Loads data from Local Storage
     * @returns {any|null} Parsed data or null if not found or corrupted
     */
    load() {
        try {
            const json = localStorage.getItem(this.storageKey);
            if (!json) {
                return null;
            }
            return JSON.parse(json);
        } catch (error) {
            console.error('Failed to load data from Local Storage:', error);
            console.warn('Corrupted data detected. Clearing storage.');
            // Clear corrupted data
            this.clear();
            return null;
        }
    }

    /**
     * Clears all data from Local Storage
     */
    clear() {
        try {
            localStorage.removeItem(this.storageKey);
        } catch (error) {
            console.error('Failed to clear Local Storage:', error);
        }
    }

    /**
     * Saves an array of transactions to Local Storage
     * @param {Transaction[]} transactions - Array of Transaction instances
     * @param {Category[]} [customCategories=[]] - Array of custom Category instances
     * @throws {StorageQuotaError} If storage quota is exceeded
     * @throws {StorageError} If save operation fails
     */
    saveTransactions(transactions, customCategories = []) {
        const data = {
            version: '1.0',
            transactions: transactions.map(t => t.toJSON()),
            categories: customCategories.map(c => c.toJSON()),
            settings: {}    // Placeholder for future settings
        };
        this.save(data);
    }

    /**
     * Loads transactions from Local Storage
     * @returns {Transaction[]} Array of Transaction instances (empty if none found)
     */
    loadTransactions() {
        const data = this.load();
        if (!data || !data.transactions) {
            return [];
        }
        
        try {
            return data.transactions.map(json => Transaction.fromJSON(json));
        } catch (error) {
            console.error('Failed to parse transactions:', error);
            console.warn('Corrupted transaction data. Returning empty array.');
            return [];
        }
    }

    /**
     * Loads custom categories from Local Storage
     * @returns {Category[]} Array of Category instances (empty if none found)
     */
    loadCategories() {
        const data = this.load();
        if (!data || !data.categories) {
            return [];
        }
        
        try {
            return data.categories.map(json => Category.fromJSON(json));
        } catch (error) {
            console.error('Failed to parse categories:', error);
            console.warn('Corrupted category data. Returning empty array.');
            return [];
        }
    }
}

// ============================================================================
// Business Logic Layer
// ============================================================================

/**
 * ValidationResult represents the result of a validation operation
 */
class ValidationResult {
    /**
     * Creates a new ValidationResult instance
     * @param {boolean} isValid - Whether the validation passed
     * @param {string} message - Validation message (error message if invalid)
     */
    constructor(isValid, message = '') {
        this.isValid = isValid;
        this.message = message;
    }
}

/**
 * ValidationModule provides input validation for transactions
 * Requirements: 1.4
 */
class ValidationModule {
    /**
     * Default allowed categories
     */
    static DEFAULT_CATEGORIES = ['Food', 'Transport', 'Fun'];

    /**
     * Maximum length for item names
     */
    static MAX_ITEM_NAME_LENGTH = 100;

    /**
     * Maximum length for category names
     */
    static MAX_CATEGORY_NAME_LENGTH = 50;

    /**
     * Validates a complete transaction
     * @param {string} itemName - Name of the expense item
     * @param {number|string} amount - Expense amount
     * @param {string} category - Category name
     * @param {string[]} [customCategories=[]] - Optional array of custom category names
     * @returns {ValidationResult} Validation result with isValid and message
     */
    static validateTransaction(itemName, amount, category, customCategories = []) {
        // Validate item name
        if (!this.validateItemName(itemName)) {
            if (!itemName || itemName.trim() === '') {
                return new ValidationResult(false, 'Item name cannot be empty');
            }
            if (itemName.length > this.MAX_ITEM_NAME_LENGTH) {
                return new ValidationResult(false, `Item name must be less than ${this.MAX_ITEM_NAME_LENGTH} characters`);
            }
        }

        // Validate amount
        if (!this.validateAmount(amount)) {
            const numAmount = parseFloat(amount);
            if (isNaN(numAmount)) {
                return new ValidationResult(false, 'Please enter a valid number for amount');
            }
            if (numAmount <= 0) {
                return new ValidationResult(false, 'Amount must be greater than 0');
            }
            // Check decimal places
            const amountStr = amount.toString();
            const decimalIndex = amountStr.indexOf('.');
            if (decimalIndex !== -1 && amountStr.length - decimalIndex - 1 > 2) {
                return new ValidationResult(false, 'Amount can have at most 2 decimal places');
            }
        }

        // Validate category
        if (!this.validateCategory(category, customCategories)) {
            return new ValidationResult(false, 'Please select a valid category');
        }

        return new ValidationResult(true, 'Validation successful');
    }

    /**
     * Validates a category name for custom categories
     * @param {string} categoryName - Category name to validate
     * @param {string[]} existingCategories - Array of existing category names
     * @returns {ValidationResult} Validation result with isValid and message
     */
    static validateCategoryName(categoryName, existingCategories = []) {
        // Check if it's a string
        if (typeof categoryName !== 'string') {
            return new ValidationResult(false, 'Category name must be text');
        }

        // Check if non-empty after trimming
        const trimmed = categoryName.trim();
        if (trimmed === '') {
            return new ValidationResult(false, 'Category name cannot be empty');
        }

        // Check max length
        if (categoryName.length > this.MAX_CATEGORY_NAME_LENGTH) {
            return new ValidationResult(false, `Category name must be less than ${this.MAX_CATEGORY_NAME_LENGTH} characters`);
        }

        // Check if category already exists (case-insensitive)
        const allCategories = [...this.DEFAULT_CATEGORIES, ...existingCategories];
        const lowerCaseName = trimmed.toLowerCase();
        const exists = allCategories.some(cat => cat.toLowerCase() === lowerCaseName);
        
        if (exists) {
            return new ValidationResult(false, 'Category already exists');
        }

        return new ValidationResult(true, 'Category name is valid');
    }

    /**
     * Validates a color hex code
     * @param {string} color - Hex color code to validate
     * @returns {boolean} True if valid, false otherwise
     */
    static validateColor(color) {
        // Check if it's a string
        if (typeof color !== 'string') {
            return false;
        }

        // Check if it matches hex color format (#RRGGBB or #RGB)
        const hexColorRegex = /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/;
        return hexColorRegex.test(color);
    }

    /**
     * Validates an amount value
     * Requirements: 1.4
     * @param {number|string} amount - Amount to validate
     * @returns {boolean} True if valid, false otherwise
     */
    static validateAmount(amount) {
        // Convert to number if string
        const numAmount = typeof amount === 'string' ? parseFloat(amount) : amount;

        // Check if it's a valid number
        if (isNaN(numAmount) || !isFinite(numAmount)) {
            return false;
        }

        // Check if positive
        if (numAmount <= 0) {
            return false;
        }

        // Check decimal places (max 2)
        const amountStr = amount.toString();
        const decimalIndex = amountStr.indexOf('.');
        if (decimalIndex !== -1) {
            const decimalPlaces = amountStr.length - decimalIndex - 1;
            if (decimalPlaces > 2) {
                return false;
            }
        }

        return true;
    }

    /**
     * Validates an item name
     * Requirements: 1.4
     * @param {string} itemName - Item name to validate
     * @returns {boolean} True if valid, false otherwise
     */
    static validateItemName(itemName) {
        // Check if it's a string
        if (typeof itemName !== 'string') {
            return false;
        }

        // Check if non-empty after trimming
        const trimmed = itemName.trim();
        if (trimmed === '') {
            return false;
        }

        // Check max length
        if (itemName.length > this.MAX_ITEM_NAME_LENGTH) {
            return false;
        }

        return true;
    }

    /**
     * Validates a category
     * Requirements: 1.4
     * @param {string} category - Category to validate
     * @param {string[]} [customCategories=[]] - Optional array of custom categories
     * @returns {boolean} True if valid, false otherwise
     */
    static validateCategory(category, customCategories = []) {
        // Check if it's a string
        if (typeof category !== 'string') {
            return false;
        }

        // Check if category is in default categories or custom categories
        const allCategories = [...this.DEFAULT_CATEGORIES, ...customCategories];
        return allCategories.includes(category);
    }
}

/**
 * TransactionManager class manages all transaction-related operations
 * Requirements: 1.3, 3.2, 4.1, 4.2, 4.3, 5.1, 6.1, 6.2, 11.2, 11.3
 */
class TransactionManager {
    /**
     * Creates a new TransactionManager instance
     * @param {StorageManager} storageManager - Storage manager instance for persistence
     */
    constructor(storageManager) {
        this.storageManager = storageManager;
        this.transactions = [];
        this.customCategories = [];
        this.loadTransactions();
        this.loadCategories();
    }

    /**
     * Loads transactions from storage
     * @private
     */
    loadTransactions() {
        this.transactions = this.storageManager.loadTransactions();
    }

    /**
     * Loads custom categories from storage
     * @private
     */
    loadCategories() {
        this.customCategories = this.storageManager.loadCategories();
    }

    /**
     * Saves current transactions and categories to storage
     * @private
     * @throws {StorageQuotaError} If storage quota is exceeded
     * @throws {StorageError} If save operation fails
     */
    saveTransactions() {
        this.storageManager.saveTransactions(this.transactions, this.customCategories);
    }

    /**
     * Adds a new custom category
     * Requirements: 11.1, 11.2
     * @param {string} name - Category name
     * @param {string} color - Hex color code
     * @returns {Category} The created category
     * @throws {StorageQuotaError} If storage quota is exceeded
     * @throws {StorageError} If save operation fails
     */
    addCustomCategory(name, color) {
        const category = new Category(name, color, false);
        this.customCategories.push(category);
        this.saveTransactions();
        return category;
    }

    /**
     * Deletes a custom category by name
     * Requirements: 11.2
     * @param {string} categoryName - Name of the category to delete
     * @returns {boolean} True if category was deleted, false if not found
     * @throws {StorageQuotaError} If storage quota is exceeded
     * @throws {StorageError} If save operation fails
     */
    deleteCustomCategory(categoryName) {
        const initialLength = this.customCategories.length;
        this.customCategories = this.customCategories.filter(c => c.name !== categoryName);
        
        if (this.customCategories.length < initialLength) {
            this.saveTransactions();
            return true;
        }
        
        return false;
    }

    /**
     * Gets all categories (default + custom)
     * Requirements: 11.3
     * @returns {Category[]} Array of all categories
     */
    getAllCategories() {
        return [...DEFAULT_CATEGORIES, ...this.customCategories];
    }

    /**
     * Gets all custom categories
     * Requirements: 11.2
     * @returns {Category[]} Array of custom categories
     */
    getCustomCategories() {
        return [...this.customCategories];
    }

    /**
     * Gets category names for validation
     * @returns {string[]} Array of all category names
     */
    getCategoryNames() {
        return this.getAllCategories().map(c => c.name);
    }

    /**
     * Gets custom category names for validation
     * @returns {string[]} Array of custom category names
     */
    getCustomCategoryNames() {
        return this.customCategories.map(c => c.name);
    }

    /**
     * Gets a category by name
     * @param {string} name - Category name
     * @returns {Category|null} Category instance or null if not found
     */
    getCategoryByName(name) {
        const allCategories = this.getAllCategories();
        return allCategories.find(c => c.name === name) || null;
    }

    /**
     * Adds a new transaction
     * Requirements: 1.3, 6.1
     * @param {string} itemName - Name of the expense item
     * @param {number} amount - Expense amount
     * @param {string} category - Category name
     * @returns {Transaction} The created transaction
     * @throws {StorageQuotaError} If storage quota is exceeded
     * @throws {StorageError} If save operation fails
     */
    addTransaction(itemName, amount, category) {
        const transaction = new Transaction(itemName, amount, category);
        this.transactions.push(transaction);
        this.saveTransactions();
        return transaction;
    }

    /**
     * Deletes a transaction by ID
     * Requirements: 3.2, 6.2
     * @param {string} transactionId - ID of the transaction to delete
     * @returns {boolean} True if transaction was deleted, false if not found
     * @throws {StorageQuotaError} If storage quota is exceeded
     * @throws {StorageError} If save operation fails
     */
    deleteTransaction(transactionId) {
        const initialLength = this.transactions.length;
        this.transactions = this.transactions.filter(t => t.id !== transactionId);
        
        if (this.transactions.length < initialLength) {
            this.saveTransactions();
            return true;
        }
        
        return false;
    }

    /**
     * Gets all transactions
     * Requirements: 6.1, 6.2
     * @returns {Transaction[]} Array of all transactions
     */
    getAllTransactions() {
        return [...this.transactions]; // Return a copy to prevent external modification
    }

    /**
     * Calculates the total balance (sum of all transaction amounts)
     * Requirements: 4.1, 4.2, 4.3
     * @returns {number} Total balance
     */
    calculateTotalBalance() {
        return this.transactions.reduce((total, transaction) => {
            return total + transaction.amount;
        }, 0);
    }

    /**
     * Gets spending totals aggregated by category
     * Requirements: 5.1
     * @returns {Map<string, number>} Map of category names to total amounts
     */
    getCategoryTotals() {
        const categoryTotals = new Map();
        
        this.transactions.forEach(transaction => {
            const currentTotal = categoryTotals.get(transaction.category) || 0;
            categoryTotals.set(transaction.category, currentTotal + transaction.amount);
        });
        
        return categoryTotals;
    }
}

// ============================================================================
// UI Layer
// ============================================================================

/**
 * ChartManager class manages Chart.js integration and data visualization
 * Requirements: 5.4, 5.5
 */
class ChartManager {
    /**
     * Creates a new ChartManager instance
     * @param {HTMLCanvasElement} canvasElement - Canvas element for rendering the chart
     * @param {TransactionManager} [transactionManager=null] - Optional transaction manager for category color lookup
     */
    constructor(canvasElement, transactionManager = null) {
        this.canvasElement = canvasElement;
        this.chart = null;
        this.emptyStateElement = document.getElementById('chart-empty-state');
        this.transactionManager = transactionManager;
    }

    /**
     * Initializes the Chart.js pie chart instance with default configuration
     * Requirements: 5.4
     */
    initialize() {
        // Check if Chart.js is available
        if (typeof Chart === 'undefined') {
            console.error('Chart.js library is not loaded');
            this.showEmptyState();
            return;
        }

        // Default categories and colors
        const defaultCategories = ['Food', 'Transport', 'Fun'];
        const defaultColors = ['#FF6384', '#36A2EB', '#FFCE56'];

        // Create Chart.js pie chart instance
        try {
            this.chart = new Chart(this.canvasElement, {
                type: 'pie',
                data: {
                    labels: defaultCategories,
                    datasets: [{
                        data: [0, 0, 0],
                        backgroundColor: defaultColors,
                        borderWidth: 2,
                        borderColor: '#ffffff'
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: true,
                    plugins: {
                        legend: {
                            position: 'bottom',
                            labels: {
                                padding: 15,
                                font: {
                                    size: 12
                                }
                            }
                        },
                        tooltip: {
                            callbacks: {
                                label: function(context) {
                                    const label = context.label || '';
                                    const value = context.parsed || 0;
                                    return `${label}: $${value.toFixed(2)}`;
                                }
                            }
                        }
                    }
                }
            });

            // Show empty state initially since no data exists
            this.showEmptyState();
        } catch (error) {
            console.error('Failed to initialize chart:', error);
            this.showEmptyState();
        }
    }

    /**
     * Displays the empty state when no transaction data exists
     * Requirements: 5.5
     */
    showEmptyState() {
        if (this.emptyStateElement) {
            this.emptyStateElement.classList.remove('hidden');
        }
        if (this.canvasElement) {
            this.canvasElement.style.display = 'none';
        }
    }

    /**
     * Hides the empty state and shows the chart canvas
     * @private
     */
    hideEmptyState() {
        if (this.emptyStateElement) {
            this.emptyStateElement.classList.add('hidden');
        }
        if (this.canvasElement) {
            this.canvasElement.style.display = 'block';
        }
    }

    /**
     * Updates the chart with new category data
     * Requirements: 5.1, 5.2, 5.3
     * @param {Map<string, number>} categoryData - Map of category names to total amounts
     */
    updateChart(categoryData) {
        // Check if Chart.js is available
        if (typeof Chart === 'undefined') {
            console.error('Chart.js library is not loaded');
            this.showEmptyState();
            return;
        }

        // Check if categoryData is empty
        if (!categoryData || categoryData.size === 0) {
            this.showEmptyState();
            return;
        }

        // Transform category totals into chart data format
        const labels = [];
        const dataValues = [];
        const backgroundColors = [];
        
        categoryData.forEach((amount, categoryName) => {
            labels.push(categoryName);
            dataValues.push(amount);
            
            // Get the category color from TransactionManager if available
            if (this.transactionManager) {
                const category = this.transactionManager.getCategoryByName(categoryName);
                if (category) {
                    backgroundColors.push(category.color);
                } else {
                    // Fallback: generate a color for unknown categories
                    backgroundColors.push(this.generateColorForCategory(categoryName));
                }
            } else {
                // Fallback: try to match default categories or generate color
                const defaultCategory = DEFAULT_CATEGORIES.find(cat => cat.name === categoryName);
                if (defaultCategory) {
                    backgroundColors.push(defaultCategory.color);
                } else {
                    backgroundColors.push(this.generateColorForCategory(categoryName));
                }
            }
        });

        // Hide empty state and show chart
        this.hideEmptyState();

        try {
            // Update existing chart if it exists
            if (this.chart) {
                this.chart.data.labels = labels;
                this.chart.data.datasets[0].data = dataValues;
                this.chart.data.datasets[0].backgroundColor = backgroundColors;
                this.chart.update();
            } else {
                // Create new chart if it doesn't exist
                this.chart = new Chart(this.canvasElement, {
                    type: 'pie',
                    data: {
                        labels: labels,
                        datasets: [{
                            data: dataValues,
                            backgroundColor: backgroundColors,
                            borderWidth: 2,
                            borderColor: '#ffffff'
                        }]
                    },
                    options: {
                        responsive: true,
                        maintainAspectRatio: true,
                        plugins: {
                            legend: {
                                position: 'bottom',
                                labels: {
                                    padding: 15,
                                    font: {
                                        size: 12
                                    }
                                }
                            },
                            tooltip: {
                                callbacks: {
                                    label: function(context) {
                                        const label = context.label || '';
                                        const value = context.parsed || 0;
                                        return `${label}: $${value.toFixed(2)}`;
                                    }
                                }
                            }
                        }
                    }
                });
            }
        } catch (error) {
            console.error('Failed to update chart:', error);
            // Attempt recovery by destroying and recreating
            try {
                this.destroy();
                this.initialize();
                // Retry update with the same data
                this.updateChart(categoryData);
            } catch (recoveryError) {
                console.error('Failed to recover chart:', recoveryError);
                this.showEmptyState();
            }
        }
    }

    /**
     * Generates a consistent color for a category name using a simple hash
     * @private
     * @param {string} categoryName - Category name
     * @returns {string} Hex color code
     */
    generateColorForCategory(categoryName) {
        // Simple hash function to generate consistent colors
        let hash = 0;
        for (let i = 0; i < categoryName.length; i++) {
            hash = categoryName.charCodeAt(i) + ((hash << 5) - hash);
        }
        
        // Convert hash to RGB color
        const hue = Math.abs(hash % 360);
        const saturation = 65 + (Math.abs(hash) % 20); // 65-85%
        const lightness = 55 + (Math.abs(hash >> 8) % 15); // 55-70%
        
        return this.hslToHex(hue, saturation, lightness);
    }

    /**
     * Converts HSL color to hex format
     * @private
     * @param {number} h - Hue (0-360)
     * @param {number} s - Saturation (0-100)
     * @param {number} l - Lightness (0-100)
     * @returns {string} Hex color code
     */
    hslToHex(h, s, l) {
        s /= 100;
        l /= 100;
        
        const c = (1 - Math.abs(2 * l - 1)) * s;
        const x = c * (1 - Math.abs((h / 60) % 2 - 1));
        const m = l - c / 2;
        
        let r = 0, g = 0, b = 0;
        
        if (h >= 0 && h < 60) {
            r = c; g = x; b = 0;
        } else if (h >= 60 && h < 120) {
            r = x; g = c; b = 0;
        } else if (h >= 120 && h < 180) {
            r = 0; g = c; b = x;
        } else if (h >= 180 && h < 240) {
            r = 0; g = x; b = c;
        } else if (h >= 240 && h < 300) {
            r = x; g = 0; b = c;
        } else if (h >= 300 && h < 360) {
            r = c; g = 0; b = x;
        }
        
        const toHex = (val) => {
            const hex = Math.round((val + m) * 255).toString(16);
            return hex.length === 1 ? '0' + hex : hex;
        };
        
        return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
    }

    /**
     * Destroys the chart instance
     */
    destroy() {
        if (this.chart) {
            this.chart.destroy();
            this.chart = null;
        }
    }
}

/**
 * UIController class coordinates between UI events and business logic
 * Requirements: 6.4, 8.3, 11.1, 11.3
 */
class UIController {
    /**
     * Creates a new UIController instance
     * @param {TransactionManager} transactionManager - Transaction manager instance
     * @param {ChartManager} chartManager - Chart manager instance (can be null if not yet implemented)
     */
    constructor(transactionManager, chartManager = null) {
        this.transactionManager = transactionManager;
        this.chartManager = chartManager;
        
        // Cache DOM elements
        this.form = document.getElementById('transaction-form');
        this.itemNameInput = document.getElementById('item-name');
        this.amountInput = document.getElementById('amount');
        this.categorySelect = document.getElementById('category');
        this.errorMessageDiv = document.getElementById('error-message');
        this.balanceDisplay = document.getElementById('balance-display');
        this.transactionList = document.getElementById('transaction-list');
        this.listEmptyState = document.getElementById('list-empty-state');
        
        // Custom category elements
        this.addCategoryBtn = document.getElementById('add-category-btn');
        this.customCategoryForm = document.getElementById('custom-category-form');
        this.customCategoryNameInput = document.getElementById('custom-category-name');
        this.customCategoryColorInput = document.getElementById('custom-category-color');
        this.saveCategoryBtn = document.getElementById('save-category-btn');
        this.cancelCategoryBtn = document.getElementById('cancel-category-btn');
        this.categoryErrorMessageDiv = document.getElementById('category-error-message');
        this.customCategoryList = document.getElementById('custom-category-list');
    }

    /**
     * Initializes the UI controller by setting up event listeners
     * Requirements: 6.4, 8.3, 11.1
     */
    initialize() {
        // Set up form submission event listener
        if (this.form) {
            this.form.addEventListener('submit', (event) => {
                this.handleFormSubmit(event);
            });
        }

        // Set up event delegation for delete buttons
        if (this.transactionList) {
            this.transactionList.addEventListener('click', (event) => {
                // Check if the clicked element is a delete button
                const deleteButton = event.target.closest('.delete-btn');
                if (deleteButton) {
                    const transactionId = deleteButton.dataset.transactionId;
                    if (transactionId) {
                        this.handleDeleteTransaction(transactionId);
                    }
                }
            });
        }

        // Set up custom category event listeners
        if (this.addCategoryBtn) {
            this.addCategoryBtn.addEventListener('click', () => {
                this.showCustomCategoryForm();
            });
        }

        if (this.saveCategoryBtn) {
            this.saveCategoryBtn.addEventListener('click', () => {
                this.handleSaveCustomCategory();
            });
        }

        if (this.cancelCategoryBtn) {
            this.cancelCategoryBtn.addEventListener('click', () => {
                this.hideCustomCategoryForm();
            });
        }

        // Set up event delegation for delete category buttons
        if (this.customCategoryList) {
            this.customCategoryList.addEventListener('click', (event) => {
                const deleteButton = event.target.closest('.btn-delete-category');
                if (deleteButton) {
                    const categoryName = deleteButton.dataset.categoryName;
                    if (categoryName) {
                        this.handleDeleteCustomCategory(categoryName);
                    }
                }
            });
        }

        // Load initial data from storage
        this.loadInitialData();
    }

    /**
     * Loads initial data from storage and populates the UI
     * Requirements: 6.4, 11.3
     */
    loadInitialData() {
        // Populate category dropdown with all categories
        this.populateCategoryDropdown();
        
        // Render custom category list
        this.renderCustomCategoryList();
        
        // Render the transaction list
        this.renderTransactionList();
        
        // Update the balance display
        this.updateBalanceDisplay();
        
        // Update the chart if chart manager is available
        if (this.chartManager) {
            const categoryTotals = this.transactionManager.getCategoryTotals();
            this.chartManager.updateChart(categoryTotals);
        }
    }

    /**
     * Populates the category dropdown with default and custom categories
     * Requirements: 11.3
     */
    populateCategoryDropdown() {
        if (!this.categorySelect) return;

        const allCategories = this.transactionManager.getAllCategories();
        
        // Clear existing options except the first placeholder
        while (this.categorySelect.options.length > 1) {
            this.categorySelect.remove(1);
        }

        // Add all categories
        allCategories.forEach(category => {
            const option = document.createElement('option');
            option.value = category.name;
            option.textContent = category.name;
            this.categorySelect.appendChild(option);
        });
    }

    /**
     * Shows the custom category form
     * Requirements: 11.1
     */
    showCustomCategoryForm() {
        if (this.customCategoryForm) {
            this.customCategoryForm.classList.remove('hidden');
            this.clearCategoryError();
            // Focus on the name input
            if (this.customCategoryNameInput) {
                this.customCategoryNameInput.focus();
            }
        }
    }

    /**
     * Hides the custom category form
     */
    hideCustomCategoryForm() {
        if (this.customCategoryForm) {
            this.customCategoryForm.classList.add('hidden');
            this.clearCustomCategoryForm();
            this.clearCategoryError();
        }
    }

    /**
     * Handles saving a new custom category
     * Requirements: 11.1, 11.2
     */
    handleSaveCustomCategory() {
        const name = this.customCategoryNameInput.value;
        const color = this.customCategoryColorInput.value;

        // Validate category name
        const existingNames = this.transactionManager.getCustomCategoryNames();
        const validation = ValidationModule.validateCategoryName(name, existingNames);

        if (!validation.isValid) {
            this.showCategoryError(validation.message);
            return;
        }

        // Validate color
        if (!ValidationModule.validateColor(color)) {
            this.showCategoryError('Please select a valid color');
            return;
        }

        try {
            // Add custom category
            this.transactionManager.addCustomCategory(name, color);

            // Update UI
            this.populateCategoryDropdown();
            this.renderCustomCategoryList();

            // Hide form and clear inputs
            this.hideCustomCategoryForm();

            // Update chart if available (to include new category color)
            if (this.chartManager) {
                const categoryTotals = this.transactionManager.getCategoryTotals();
                this.chartManager.updateChart(categoryTotals);
            }
        } catch (error) {
            if (error instanceof StorageQuotaError) {
                this.showCategoryError(error.message);
            } else if (error instanceof StorageError) {
                this.showCategoryError('Failed to save category. Please try again.');
            } else {
                this.showCategoryError('An unexpected error occurred. Please try again.');
                console.error('Error adding custom category:', error);
            }
        }
    }

    /**
     * Handles deleting a custom category
     * Requirements: 11.2
     */
    handleDeleteCustomCategory(categoryName) {
        // Check if any transactions use this category
        const transactions = this.transactionManager.getAllTransactions();
        const hasTransactions = transactions.some(t => t.category === categoryName);

        if (hasTransactions) {
            const confirmDelete = confirm(
                `Some transactions use the "${categoryName}" category. ` +
                `Deleting this category will not delete the transactions, but the category will no longer be available. ` +
                `Continue?`
            );
            if (!confirmDelete) {
                return;
            }
        }

        try {
            const deleted = this.transactionManager.deleteCustomCategory(categoryName);

            if (deleted) {
                // Update UI
                this.populateCategoryDropdown();
                this.renderCustomCategoryList();

                // Update chart if available
                if (this.chartManager) {
                    const categoryTotals = this.transactionManager.getCategoryTotals();
                    this.chartManager.updateChart(categoryTotals);
                }
            }
        } catch (error) {
            console.error('Error deleting custom category:', error);
            alert('Failed to delete category. Please try again.');
        }
    }

    /**
     * Renders the custom category list
     * Requirements: 11.2
     */
    renderCustomCategoryList() {
        if (!this.customCategoryList) return;

        const customCategories = this.transactionManager.getCustomCategories();

        // Clear the list
        this.customCategoryList.innerHTML = '';

        if (customCategories.length === 0) {
            return;
        }

        // Create document fragment for efficient DOM manipulation
        const fragment = document.createDocumentFragment();

        // Render each custom category
        customCategories.forEach(category => {
            const categoryElement = this.createCustomCategoryElement(category);
            fragment.appendChild(categoryElement);
        });

        this.customCategoryList.appendChild(fragment);
    }

    /**
     * Creates a DOM element for a custom category
     * @param {Category} category - Category to render
     * @returns {HTMLElement} Category element
     */
    createCustomCategoryElement(category) {
        const div = document.createElement('div');
        div.className = 'custom-category-item';
        div.style.setProperty('--category-color', category.color);

        // Create category info section
        const infoDiv = document.createElement('div');
        infoDiv.className = 'custom-category-info';

        const colorBox = document.createElement('div');
        colorBox.className = 'custom-category-color-box';
        colorBox.style.backgroundColor = category.color;

        const nameSpan = document.createElement('span');
        nameSpan.className = 'custom-category-name';
        nameSpan.textContent = category.name;

        infoDiv.appendChild(colorBox);
        infoDiv.appendChild(nameSpan);

        // Create delete button
        const deleteButton = document.createElement('button');
        deleteButton.className = 'btn-delete-category';
        deleteButton.dataset.categoryName = category.name;
        deleteButton.textContent = 'Delete';
        deleteButton.setAttribute('aria-label', `Delete ${category.name} category`);

        // Assemble the category element
        div.appendChild(infoDiv);
        div.appendChild(deleteButton);

        return div;
    }

    /**
     * Clears the custom category form inputs
     */
    clearCustomCategoryForm() {
        if (this.customCategoryNameInput) {
            this.customCategoryNameInput.value = '';
        }
        if (this.customCategoryColorInput) {
            this.customCategoryColorInput.value = '#9966FF';
        }
    }

    /**
     * Displays a category validation error message
     * @param {string} message - Error message to display
     */
    showCategoryError(message) {
        if (this.categoryErrorMessageDiv) {
            this.categoryErrorMessageDiv.textContent = message;
            this.categoryErrorMessageDiv.style.display = 'block';
        }
    }

    /**
     * Clears the category validation error message
     */
    clearCategoryError() {
        if (this.categoryErrorMessageDiv) {
            this.categoryErrorMessageDiv.textContent = '';
            this.categoryErrorMessageDiv.style.display = 'none';
        }
    }

    /**
     * Handles form submission for adding new transactions
     * @param {Event} event - Form submit event
     */
    handleFormSubmit(event) {
        event.preventDefault();
        
        // Get form values
        const itemName = this.itemNameInput.value;
        const amount = this.amountInput.value;
        const category = this.categorySelect.value;
        
        // Get custom category names for validation
        const customCategoryNames = this.transactionManager.getCustomCategoryNames();
        
        // Validate input
        const validation = ValidationModule.validateTransaction(itemName, amount, category, customCategoryNames);
        
        if (!validation.isValid) {
            this.showValidationError(validation.message);
            return;
        }
        
        // Clear any previous error messages
        this.clearValidationError();
        
        try {
            // Add transaction
            this.transactionManager.addTransaction(itemName, parseFloat(amount), category);
            
            // Update UI
            this.renderTransactionList();
            this.updateBalanceDisplay();
            
            // Update chart if available
            if (this.chartManager) {
                const categoryTotals = this.transactionManager.getCategoryTotals();
                this.chartManager.updateChart(categoryTotals);
            }
            
            // Clear form
            this.clearForm();
        } catch (error) {
            if (error instanceof StorageQuotaError) {
                this.showValidationError(error.message);
            } else if (error instanceof StorageError) {
                this.showValidationError('Failed to save transaction. Please try again.');
            } else {
                this.showValidationError('An unexpected error occurred. Please try again.');
                console.error('Error adding transaction:', error);
            }
        }
    }

    /**
     * Handles deletion of a transaction
     * @param {string} transactionId - ID of the transaction to delete
     */
    handleDeleteTransaction(transactionId) {
        try {
            const deleted = this.transactionManager.deleteTransaction(transactionId);
            
            if (deleted) {
                // Update UI
                this.renderTransactionList();
                this.updateBalanceDisplay();
                
                // Update chart if available
                if (this.chartManager) {
                    const categoryTotals = this.transactionManager.getCategoryTotals();
                    this.chartManager.updateChart(categoryTotals);
                }
            }
        } catch (error) {
            console.error('Error deleting transaction:', error);
            this.showValidationError('Failed to delete transaction. Please try again.');
        }
    }

    /**
     * Renders the transaction list in the UI
     */
    renderTransactionList() {
        const transactions = this.transactionManager.getAllTransactions();
        
        // Show/hide empty state
        if (transactions.length === 0) {
            if (this.listEmptyState) {
                this.listEmptyState.classList.remove('hidden');
            }
            // Clear the transaction list
            this.transactionList.innerHTML = '';
            if (this.listEmptyState) {
                this.transactionList.appendChild(this.listEmptyState);
            }
            return;
        }
        
        // Hide empty state
        if (this.listEmptyState) {
            this.listEmptyState.classList.add('hidden');
        }
        
        // Create document fragment for efficient DOM manipulation
        const fragment = document.createDocumentFragment();
        
        // Render each transaction
        transactions.forEach(transaction => {
            const transactionElement = this.createTransactionElement(transaction);
            fragment.appendChild(transactionElement);
        });
        
        // Clear and update the transaction list
        this.transactionList.innerHTML = '';
        this.transactionList.appendChild(fragment);
    }

    /**
     * Creates a DOM element for a transaction
     * @param {Transaction} transaction - Transaction to render
     * @returns {HTMLElement} Transaction element
     */
    createTransactionElement(transaction) {
        const div = document.createElement('div');
        div.className = 'transaction-item';
        div.dataset.transactionId = transaction.id;
        
        // Get category color
        const category = this.transactionManager.getCategoryByName(transaction.category);
        const categoryColor = category ? category.color : '#4CAF50';
        div.style.borderLeftColor = categoryColor;
        
        // Create transaction info section
        const infoDiv = document.createElement('div');
        infoDiv.className = 'transaction-info';
        
        const nameSpan = document.createElement('span');
        nameSpan.className = 'transaction-name';
        nameSpan.textContent = transaction.itemName;
        
        const categorySpan = document.createElement('span');
        categorySpan.className = 'transaction-category';
        categorySpan.textContent = transaction.category;
        categorySpan.style.backgroundColor = `${categoryColor}1A`; // 10% opacity
        categorySpan.style.color = categoryColor;
        
        infoDiv.appendChild(nameSpan);
        infoDiv.appendChild(categorySpan);
        
        // Create transaction amount and delete section
        const actionsDiv = document.createElement('div');
        actionsDiv.className = 'transaction-actions';
        
        const amountSpan = document.createElement('span');
        amountSpan.className = 'transaction-amount';
        amountSpan.textContent = `$${transaction.amount.toFixed(2)}`;
        
        const deleteButton = document.createElement('button');
        deleteButton.className = 'delete-btn';
        deleteButton.dataset.transactionId = transaction.id;
        deleteButton.textContent = 'Delete';
        deleteButton.setAttribute('aria-label', `Delete ${transaction.itemName} transaction`);
        
        actionsDiv.appendChild(amountSpan);
        actionsDiv.appendChild(deleteButton);
        
        // Assemble the transaction element
        div.appendChild(infoDiv);
        div.appendChild(actionsDiv);
        
        return div;
    }

    /**
     * Updates the balance display with the current total
     */
    updateBalanceDisplay() {
        const balance = this.transactionManager.calculateTotalBalance();
        if (this.balanceDisplay) {
            this.balanceDisplay.textContent = `$${balance.toFixed(2)}`;
        }
    }

    /**
     * Displays a validation error message
     * @param {string} message - Error message to display
     */
    showValidationError(message) {
        if (this.errorMessageDiv) {
            this.errorMessageDiv.textContent = message;
            this.errorMessageDiv.style.display = 'block';
        }
    }

    /**
     * Clears the validation error message
     */
    clearValidationError() {
        if (this.errorMessageDiv) {
            this.errorMessageDiv.textContent = '';
            this.errorMessageDiv.style.display = 'none';
        }
    }

    /**
     * Clears the form fields after successful submission
     */
    clearForm() {
        if (this.form) {
            this.form.reset();
        }
        // Clear any error messages
        this.clearValidationError();
    }
}

// ============================================================================
// Application Initialization
// ============================================================================

// Application will be initialized here
document.addEventListener('DOMContentLoaded', () => {
    console.log('DOM loaded - initializing application');
    
    try {
        // Initialize storage manager
        const storageManager = new StorageManager();
        
        // Initialize transaction manager
        const transactionManager = new TransactionManager(storageManager);
        
        // Initialize chart manager with transaction manager reference
        const canvasElement = document.getElementById('spending-chart');
        const chartManager = canvasElement ? new ChartManager(canvasElement, transactionManager) : null;
        
        if (chartManager) {
            chartManager.initialize();
        }
        
        // Initialize UI controller
        const uiController = new UIController(transactionManager, chartManager);
        uiController.initialize();
        
        console.log('Application initialized successfully');
    } catch (error) {
        console.error('Failed to initialize application:', error);
        
        // Display error message to user
        const errorDiv = document.createElement('div');
        errorDiv.style.cssText = 'position: fixed; top: 20px; left: 50%; transform: translateX(-50%); background: #f44336; color: white; padding: 15px 20px; border-radius: 4px; z-index: 1000;';
        errorDiv.textContent = 'Failed to initialize application. Please refresh the page.';
        document.body.appendChild(errorDiv);
    }
});
