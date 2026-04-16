// State configuration
let transactions = JSON.parse(localStorage.getItem('transactions')) || [];
let categories = JSON.parse(localStorage.getItem('categories')) || [
    { name: 'Food', color: '#10b981' }, // green
    { name: 'Transport', color: '#3b82f6' }, // blue
    { name: 'Fun', color: '#f59e0b' } // orange
];

let myChart = null;

// DOM Elements
const balanceDisplay = document.getElementById('total-balance');
const transactionForm = document.getElementById('transaction-form');
const itemNameInput = document.getElementById('item-name');
const itemAmountInput = document.getElementById('item-amount');
const categorySelect = document.getElementById('item-category');
const transactionList = document.getElementById('transaction-list');
const emptyListState = document.getElementById('empty-list-state');
const emptyChartState = document.getElementById('empty-chart-state');
const chartCanvas = document.getElementById('category-chart');
const sortSelect = document.getElementById('sort-select');
const themeToggleBtn = document.getElementById('theme-toggle');

// Custom Category Modal Elements
const btnAddCategory = document.getElementById('btn-add-category');
const categoryModal = document.getElementById('category-modal');
const closeModalBtn = document.getElementById('close-modal-btn');
const categoryForm = document.getElementById('category-form');
const newCategoryName = document.getElementById('new-category-name');
const newCategoryColor = document.getElementById('new-category-color');
const colorHexDisplay = document.getElementById('color-hex-display');

// Chart Colors Configuration
const getThemeColors = () => {
    const isDark = document.body.getAttribute('data-theme') === 'dark';
    return {
        text: isDark ? '#f8fafc' : '#1e293b',
        border: isDark ? '#334155' : '#e2e8f0',
        tooltipBg: isDark ? '#1e293b' : '#ffffff',
        tooltipText: isDark ? '#f8fafc' : '#1e293b'
    };
};

/* =====================================
   Initialization
==================================== */
function init() {
    initTheme();
    populateCategoryDropdown();
    renderTransactions(transactions);
    updateTotalBalance();
    updateChart();
    
    // Listeners
    transactionForm.addEventListener('submit', addTransaction);
    sortSelect.addEventListener('change', () => renderTransactions(transactions));
    
    // Modal Listeners
    btnAddCategory.addEventListener('click', () => toggleModal(true));
    closeModalBtn.addEventListener('click', () => toggleModal(false));
    categoryModal.addEventListener('click', (e) => {
        if (e.target === categoryModal) toggleModal(false);
    });
    categoryForm.addEventListener('submit', addCustomCategory);
    
    // Live HEX update
    newCategoryColor.addEventListener('input', (e) => {
        colorHexDisplay.textContent = e.target.value;
    });
    
    // Theme toggle
    themeToggleBtn.addEventListener('click', toggleTheme);
}

/* =====================================
   Transactions Logic
==================================== */
function addTransaction(e) {
    e.preventDefault();

    const name = itemNameInput.value.trim();
    const amountStr = itemAmountInput.value.trim();
    const category = categorySelect.value;
    
    let hasError = false;

    // Validation
    if (!name) {
        showError(itemNameInput);
        hasError = true;
    }
    if (!amountStr || isNaN(amountStr) || parseFloat(amountStr) <= 0) {
        showError(itemAmountInput);
        hasError = true;
    }
    if (!category) {
        showError(categorySelect);
        hasError = true;
    }

    if (hasError) return;

    // Success -> Create Object
    const transaction = {
        id: generateID(),
        name: name,
        amount: parseFloat(amountStr),
        category: category,
        date: new Date().toISOString()
    };

    transactions.push(transaction);
    updateLocalStorage();

    // Reset Form
    itemNameInput.value = '';
    itemAmountInput.value = '';
    categorySelect.value = '';
    
    // Update UI
    renderTransactions(transactions);
    updateTotalBalance();
    updateChart();
}

function removeTransaction(id) {
    transactions = transactions.filter(transaction => transaction.id !== id);
    updateLocalStorage();
    
    renderTransactions(transactions);
    updateTotalBalance();
    updateChart();
}

// Generate unique ID
function generateID() {
    return Math.random().toString(36).substr(2, 9);
}

// Visual error hint
function showError(inputElement) {
    inputElement.classList.add('error-border');
    setTimeout(() => {
        inputElement.classList.remove('error-border');
    }, 400);
}

/* =====================================
   Rendering & Sorting
==================================== */
function renderTransactions(transactionsData) {
    // Determine sort type
    const sortVal = sortSelect.value;
    let sortedList = [...transactionsData];

    sortedList.sort((a, b) => {
        switch(sortVal) {
            case 'date-desc':
                return new Date(b.date) - new Date(a.date);
            case 'date-asc':
                return new Date(a.date) - new Date(b.date);
            case 'amount-desc':
                return b.amount - a.amount;
            case 'amount-asc':
                return a.amount - b.amount;
            case 'category':
                return a.category.localeCompare(b.category);
            default:
                return 0;
        }
    });

    transactionList.innerHTML = '';

    if (sortedList.length === 0) {
        emptyListState.classList.add('active');
        transactionList.style.display = 'none';
        return;
    }

    emptyListState.classList.remove('active');
    transactionList.style.display = 'block';

    sortedList.forEach(transaction => {
        const catConfig = categories.find(c => c.name === transaction.category);
        const color = catConfig ? catConfig.color : '#9ca3af';

        const li = document.createElement('li');
        li.classList.add('transaction-item');
        
        li.innerHTML = `
            <div class="transaction-info">
                <span class="item-name">${transaction.name}</span>
                <span class="category-badge">
                    <span class="category-color-dot" style="background-color: ${color}"></span>
                    ${transaction.category}
                </span>
            </div>
            <div class="transaction-meta">
                <span class="item-amount">$${transaction.amount.toFixed(2)}</span>
                <button class="danger-btn" onclick="removeTransaction('${transaction.id}')">
                    Delete
                </button>
            </div>
        `;
        transactionList.appendChild(li);
    });
}

function updateTotalBalance() {
    const total = transactions.reduce((acc, curr) => acc + curr.amount, 0);
    balanceDisplay.textContent = `$${total.toFixed(2)}`;
}

/* =====================================
   Categories Logic
==================================== */
function populateCategoryDropdown() {
    const selectedBefore = categorySelect.value;
    
    // Reset options
    categorySelect.innerHTML = '<option value="" disabled selected>Select category</option>';
    
    categories.forEach(cat => {
        const option = document.createElement('option');
        option.value = cat.name;
        option.textContent = cat.name;
        categorySelect.appendChild(option);
    });

    // Re-select if still valid
    if (categories.find(c => c.name === selectedBefore)) {
        categorySelect.value = selectedBefore;
    }
}

function toggleModal(show) {
    if (show) {
        categoryModal.classList.add('active');
        newCategoryName.focus();
    } else {
        categoryModal.classList.remove('active');
        // Reset
        newCategoryName.value = '';
        newCategoryColor.value = '#8b5cf6';
        colorHexDisplay.textContent = '#8b5cf6';
    }
}

function addCustomCategory(e) {
    e.preventDefault();
    
    const name = newCategoryName.value.trim();
    const color = newCategoryColor.value;
    
    if (!name) {
        showError(newCategoryName);
        return;
    }
    
    // Check if exists
    if (categories.some(c => c.name.toLowerCase() === name.toLowerCase())) {
        showError(newCategoryName);
        alert('Category already exists!');
        return;
    }
    
    categories.push({ name, color });
    localStorage.setItem('categories', JSON.stringify(categories));
    
    populateCategoryDropdown();
    
    // Auto-select new
    categorySelect.value = name;
    
    // Update chart to reflect new colors if items exist
    updateChart();
    
    toggleModal(false);
}

/* =====================================
   Chart.js Logic
==================================== */
function updateChart() {
    if (transactions.length === 0) {
        emptyChartState.classList.add('active');
        chartCanvas.style.display = 'none';
        if (myChart) {
            myChart.destroy();
            myChart = null;
        }
        return;
    }

    emptyChartState.classList.remove('active');
    chartCanvas.style.display = 'block';

    // Aggregate data
    const categoryTotals = {};
    transactions.forEach(t => {
        categoryTotals[t.category] = (categoryTotals[t.category] || 0) + t.amount;
    });

    const labels = Object.keys(categoryTotals);
    const data = Object.values(categoryTotals);
    const bgColors = labels.map(label => {
        const cat = categories.find(c => c.name === label);
        return cat ? cat.color : '#9ca3af';
    });

    const themeColors = getThemeColors();

    const config = {
        type: 'doughnut',
        data: {
            labels: labels,
            datasets: [{
                data: data,
                backgroundColor: bgColors,
                borderWidth: 2,
                borderColor: document.body.getAttribute('data-theme') === 'dark' ? '#1e293b' : '#ffffff',
                hoverOffset: 4
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'bottom',
                    labels: {
                        color: themeColors.text,
                        padding: 20,
                        usePointStyle: true,
                        font: {
                            family: "'Inter', sans-serif",
                            size: 12
                        }
                    }
                },
                tooltip: {
                    backgroundColor: themeColors.tooltipBg,
                    titleColor: themeColors.tooltipText,
                    bodyColor: themeColors.tooltipText,
                    bodyFont: {
                        family: "'Inter', sans-serif"
                    },
                    padding: 12,
                    borderColor: themeColors.border,
                    borderWidth: 1,
                    callbacks: {
                        label: function(context) {
                            let label = context.label || '';
                            if (label) {
                                label += ': ';
                            }
                            if (context.parsed !== null) {
                                label += new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(context.parsed);
                            }
                            return label;
                        }
                    }
                }
            },
            cutout: '65%',
            animation: {
                animateScale: true,
                animateRotate: true
            }
        }
    };

    if (myChart) {
        myChart.destroy();
    }
    
    // Must get context fresh (fixes rendering bugs on re-instantiation)
    const ctx = chartCanvas.getContext('2d');
    myChart = new Chart(ctx, config);
}

/* =====================================
   Theme Logic
==================================== */
function initTheme() {
    const savedTheme = localStorage.getItem('theme');
    const prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
    const theme = savedTheme || (prefersDark ? 'dark' : 'light');
    
    document.body.setAttribute('data-theme', theme);
    updateThemeIcon(theme);
}

function toggleTheme() {
    const currentTheme = document.body.getAttribute('data-theme');
    const newTheme = currentTheme === 'light' ? 'dark' : 'light';
    
    document.body.setAttribute('data-theme', newTheme);
    localStorage.setItem('theme', newTheme);
    
    updateThemeIcon(newTheme);
    
    // Redraw chart to update colors based on theme
    if (transactions.length > 0) {
        updateChart();
    }
}

function updateThemeIcon(theme) {
    const icon = themeToggleBtn.querySelector('i');
    if (theme === 'dark') {
        icon.classList.remove('fa-moon');
        icon.classList.add('fa-sun');
    } else {
        icon.classList.remove('fa-sun');
        icon.classList.add('fa-moon');
    }
}

/* =====================================
   Utility
==================================== */
function updateLocalStorage() {
    localStorage.setItem('transactions', JSON.stringify(transactions));
}

// Start app
document.addEventListener('DOMContentLoaded', init);
