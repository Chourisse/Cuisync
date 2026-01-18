/**
 * Cuisync - Order Management App
 * Local-first with Supabase hooks
 */

class CuisyncApp {
    constructor() {
        this.pads = [];
        this.menu = { categories: [] };
        this.tables = []; // Gestion des tables avec statut
        this.reservations = []; // Gestion des réservations
        this.history = []; // Historique des commandes servies
        this.events = []; // Événements spéciaux
        this.clientPreferences = []; // Préférences des clients récurrents
        this.servers = []; // Liste des serveurs
        this.notifications = []; // Notifications système
        this.soundEnabled = true; // Son activé/désactivé
        this.inventory = []; // Gestion des stocks
        this.shifts = []; // Gestion des équipes/shifts
        this.discounts = []; // Remises et promotions
        this.currentUser = null; // Utilisateur actuel
        this.userRole = 'server'; // Rôle: server, kitchen, manager, admin
        this.offlineQueue = []; // Queue pour synchronisation différée
        this.isOnline = navigator.onLine;
        this.restaurantSettings = {
            name: '',
            phone: '',
            email: '',
            address: '',
            openingHours: {
                monday: { open: '12:00', close: '14:00', evening: { open: '19:00', close: '22:00' } },
                tuesday: { open: '12:00', close: '14:00', evening: { open: '19:00', close: '22:00' } },
                wednesday: { open: '12:00', close: '14:00', evening: { open: '19:00', close: '22:00' } },
                thursday: { open: '12:00', close: '14:00', evening: { open: '19:00', close: '22:00' } },
                friday: { open: '12:00', close: '14:00', evening: { open: '19:00', close: '22:00' } },
                saturday: { open: '12:00', close: '14:00', evening: { open: '19:00', close: '22:00' } },
                sunday: { open: '12:00', close: '14:00', evening: { open: '19:00', close: '22:00' } }
            }
        };
        this.currentView = 'server';
        this.currentReservationDate = new Date();
        this.undoStack = [];
        this.isFloorPlanView = false;
        this.debounceTimer = null;
        this.maxTables = 20; // Nombre maximum de tables par défaut
        
        // Synchronisation multi-appareils
        this.broadcastChannel = null;
        this.deviceId = this.getDeviceId();
        this.isFullscreen = false;
        this.modifiers = ['sans gluten', 'végétarien', 'végétalien', 'sans lactose', 'épicé', 'sans alcool'];
        
        // DOM elements cache
        this.dom = {};
        this.cacheDOMElements();
        
        this.init();
    }
    
    getDeviceId() {
        let deviceId = localStorage.getItem('cuisync-device-id');
        if (!deviceId) {
            deviceId = 'device-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9);
            localStorage.setItem('cuisync-device-id', deviceId);
        }
        return deviceId;
    }
    
    cacheDOMElements() {
        this.dom = {
            // Views
            serverView: document.getElementById('server-view'),
            kitchenView: document.getElementById('kitchen-view'),
            hostView: document.getElementById('host-view'),
            serverViewBtn: document.getElementById('server-view-btn'),
            kitchenViewBtn: document.getElementById('kitchen-view-btn'),
            hostViewBtn: document.getElementById('host-view-btn'),
            
            // Form
            orderForm: document.getElementById('order-form'),
            tableInput: document.getElementById('table-input'),
            coversInput: document.getElementById('covers-input'),
            clientNameInput: document.getElementById('client-name-input'),
            tableNotesInput: document.getElementById('table-notes-input'),
            dishInput: document.getElementById('dish-input'),
            categorySelect: document.getElementById('category-select'),
            dishSelect: document.getElementById('dish-select'),
            qtyInput: document.getElementById('qty-input'),
            courseInput: document.getElementById('course-input'),
            noteInput: document.getElementById('note-input'),
            itemAllergenCheck: document.getElementById('item-allergen-check'),
            priceInput: document.getElementById('price-input'),
            totalInput: document.getElementById('total-input'),
            
            // Menu management
            categoryForm: document.getElementById('category-form'),
            categoryNameInput: document.getElementById('category-name-input'),
            dishForm: document.getElementById('dish-form'),
            dishCategorySelect: document.getElementById('dish-category-select'),
            dishNameInput: document.getElementById('dish-name-input'),
            dishPriceInput: document.getElementById('dish-price-input'),
            dishAvailabilitySelect: document.getElementById('dish-availability-select'),
            dishAllergensInput: document.getElementById('dish-allergens-input'),
            dishDescriptionInput: document.getElementById('dish-description-input'),
            menuList: document.getElementById('menu-list'),
            
            // Tables & Reservations
            tablesGrid: document.getElementById('tables-grid'),
            addTableBtn: document.getElementById('add-table-btn'),
            maxTablesInput: document.getElementById('max-tables-input'),
            saveTablesConfigBtn: document.getElementById('save-tables-config-btn'),
            tablesViewBtn: document.getElementById('tables-view-btn'),
            reservationsViewBtn: document.getElementById('reservations-view-btn'),
            statsViewBtn: document.getElementById('stats-view-btn'),
            menuViewBtn: document.getElementById('menu-view-btn'),
            clientsViewBtn: document.getElementById('clients-view-btn'),
            historyViewBtn: document.getElementById('history-view-btn'),
            settingsViewBtn: document.getElementById('settings-view-btn'),
            mapViewBtn: document.getElementById('map-view-btn'),
            mapView: document.getElementById('map-management'),
            restaurantMap: document.getElementById('restaurant-map'),
            reservationForm: document.getElementById('reservation-form'),
            reservationNameInput: document.getElementById('reservation-name-input'),
            reservationCoversInput: document.getElementById('reservation-covers-input'),
            reservationDateInput: document.getElementById('reservation-date-input'),
            reservationTableSelect: document.getElementById('reservation-table-select'),
            reservationPhoneInput: document.getElementById('reservation-phone-input'),
            reservationNotesInput: document.getElementById('reservation-notes-input'),
            reservationsList: document.getElementById('reservations-list'),
            
            // Statistics
            statisticsView: document.getElementById('statistics-view'),
            statsPeriodSelect: document.getElementById('stats-period-select'),
            statRevenue: document.getElementById('stat-revenue'),
            statOrders: document.getElementById('stat-orders'),
            statTables: document.getElementById('stat-tables'),
            statAverage: document.getElementById('stat-average'),
            topDishesList: document.getElementById('top-dishes-list'),
            
            // History
            historySection: document.getElementById('history-section'),
            historyFilterSelect: document.getElementById('history-filter-select'),
            historySearchInput: document.getElementById('history-search-input'),
            historyList: document.getElementById('history-list'),
            
            // Payment split
            splitPaymentRow: document.getElementById('split-payment-row'),
            splitAmount: document.getElementById('split-amount'),
            paymentTotalDue: document.getElementById('payment-total-due'),
            paymentPaid: document.getElementById('payment-paid'),
            paymentRemaining: document.getElementById('payment-remaining'),
            paymentExistingPayments: document.getElementById('payment-existing-payments'),
            paymentSplitAmount: document.getElementById('payment-split-amount'),
            paymentSplitPeople: document.getElementById('payment-split-people'),
            splitByPersonBtn: document.getElementById('split-by-person-btn'),
            splitByCoversBtn: document.getElementById('split-by-covers-btn'),
            splitCustomBtn: document.getElementById('split-custom-btn'),
            
            // Reservations calendar
            reservationCalendar: document.getElementById('reservation-calendar'),
            currentDateDisplay: document.getElementById('current-date-display'),
            prevDayBtn: document.getElementById('prev-day-btn'),
            nextDayBtn: document.getElementById('next-day-btn'),
            todayBtn: document.getElementById('today-btn'),
            reservationTimeInput: document.getElementById('reservation-time-input'),
            reservationEmailInput: document.getElementById('reservation-email-input'),
            reservationOccasionSelect: document.getElementById('reservation-occasion-select'),
            
            // Tables view
            gridViewBtn: document.getElementById('grid-view-btn'),
            floorPlanViewBtn: document.getElementById('floor-plan-view-btn'),
            tablesGridView: document.getElementById('tables-grid-view'),
            tablesFloorPlanView: document.getElementById('tables-floor-plan-view'),
            floorPlan: document.getElementById('floor-plan'),
            
            // Restaurant settings
            restaurantSettingsForm: document.getElementById('restaurant-settings-form'),
            restaurantNameInput: document.getElementById('restaurant-name-input'),
            restaurantPhoneInput: document.getElementById('restaurant-phone-input'),
            restaurantEmailInput: document.getElementById('restaurant-email-input'),
            restaurantAddressInput: document.getElementById('restaurant-address-input'),
            openingHoursContainer: document.getElementById('opening-hours-container'),
            
            // Events
            eventForm: document.getElementById('event-form'),
            eventNameInput: document.getElementById('event-name-input'),
            eventDateInput: document.getElementById('event-date-input'),
            eventTimeInput: document.getElementById('event-time-input'),
            eventDescriptionInput: document.getElementById('event-description-input'),
            eventCapacityInput: document.getElementById('event-capacity-input'),
            eventsList: document.getElementById('events-list'),
            
            // Client preferences
            clientSearchInput: document.getElementById('client-search-input'),
            clientPreferencesList: document.getElementById('client-preferences-list'),
            
            // Server view search
            serverSearchInput: document.getElementById('server-search-input'),
            serverStatusFilter: document.getElementById('server-status-filter'),
            
            // Menu search
            menuSearchInput: document.getElementById('menu-search-input'),
            importMenuBtn: document.getElementById('import-menu-btn'),
            exportMenuBtn: document.getElementById('export-menu-btn'),
            
            // Payment panel
            paymentCloseBtn: document.getElementById('payment-close-btn'),
            paymentPadSummary: document.getElementById('payment-pad-summary'),
            
            // History
            clearHistoryBtn: document.getElementById('clear-history-btn'),
            
            // Backup
            backupAllBtn: document.getElementById('backup-all-btn'),
            restoreBtn: document.getElementById('restore-btn'),
            restoreFileInput: document.getElementById('restore-file-input'),
            
            // Kitchen
            kitchenFilterSelect: document.getElementById('kitchen-filter-select'),
            soundToggleBtn: document.getElementById('sound-toggle-btn'),
            fullscreenBtn: document.getElementById('fullscreen-btn'),
            printAllKitchenBtn: document.getElementById('print-all-kitchen-btn'),
            kitchenPendingCount: document.getElementById('kitchen-pending-count'),
            modifiersContainer: document.getElementById('modifiers-container'),
            kitchenReadyCount: document.getElementById('kitchen-ready-count'),
            kitchenAvgTime: document.getElementById('kitchen-avg-time'),
            
            // New sections
            inventoryViewBtn: document.getElementById('inventory-view-btn'),
            shiftsViewBtn: document.getElementById('shifts-view-btn'),
            discountsViewBtn: document.getElementById('discounts-view-btn'),
            reportsViewBtn: document.getElementById('reports-view-btn'),
            inventoryManagement: document.getElementById('inventory-management'),
            shiftsManagement: document.getElementById('shifts-management'),
            discountsManagement: document.getElementById('discounts-management'),
            reportsManagement: document.getElementById('reports-management'),
            inventoryList: document.getElementById('inventory-list'),
            shiftsList: document.getElementById('shifts-list'),
            currentShiftInfo: document.getElementById('current-shift-info'),
            discountsList: document.getElementById('discounts-list'),
            reportsContent: document.getElementById('reports-content'),
            addShiftBtn: document.getElementById('add-shift-btn'),
            addDiscountBtn: document.getElementById('add-discount-btn'),
            generateReportBtn: document.getElementById('generate-report-btn'),
            exportPdfBtn: document.getElementById('export-pdf-btn'),
            reportTypeSelect: document.getElementById('report-type-select'),
            
            // Servers
            menuManagement: document.getElementById('menu-management'),
            clientsManagement: document.getElementById('clients-management'),
            settingsManagement: document.getElementById('settings-management'),
            serverForm: document.getElementById('server-form'),
            serverNameInput: document.getElementById('server-name-input'),
            serversList: document.getElementById('servers-list'),
            
            // Notifications
            notificationsPanel: document.getElementById('notifications-panel'),
            notificationsList: document.getElementById('notifications-list'),
            
            // Statistics
            exportReportBtn: document.getElementById('export-report-btn'),
            statRevenueChange: document.getElementById('stat-revenue-change'),
            statOrdersChange: document.getElementById('stat-orders-change'),
            statTablesChange: document.getElementById('stat-tables-change'),
            statAverageChange: document.getElementById('stat-average-change'),
            statPeakHour: document.getElementById('stat-peak-hour'),
            statPaymentMethods: document.getElementById('stat-payment-methods'),
            revenueChart: document.getElementById('revenue-chart'),
            
            // Actions
            sendAllBtn: document.getElementById('send-all-btn'),
            exportBtn: document.getElementById('export-csv-btn'),
            exportSalesBtn: document.getElementById('export-sales-btn'),
            // Payment panel
            paymentPanel: document.getElementById('payment-panel'),
            paymentTotal: document.getElementById('payment-total'),
            paymentSubtotal: document.getElementById('payment-subtotal'),
            paymentTax: document.getElementById('payment-tax'),
            paymentDiscount: document.getElementById('payment-discount'),
            paymentTip: document.getElementById('payment-tip'),
            paymentMethod: document.getElementById('payment-method'),
            paymentReceivedRow: document.getElementById('payment-received-row'),
            paymentReceived: document.getElementById('payment-received'),
            paymentChange: document.getElementById('payment-change'),
            paymentCancel: document.getElementById('payment-cancel'),
            paymentConfirm: document.getElementById('payment-confirm'),
            
            // Containers
            serverPadsContainer: document.getElementById('server-pads-container'),
            kitchenPadsContainer: document.getElementById('kitchen-pads-container'),
            toastContainer: document.getElementById('toast-container'),
            undoNotification: document.getElementById('undo-notification'),
            undoBtn: document.getElementById('undo-btn'),
            undoMessage: document.getElementById('undo-message')
        };
    }
    
    init() {
        this.loadFromStorage();
        this.loadMenuFromStorage();
        this.loadTablesFromStorage();
        this.loadReservationsFromStorage();
        this.loadHistoryFromStorage();
        this.loadEventsFromStorage();
        this.loadClientPreferencesFromStorage();
        this.loadServersFromStorage();
        this.loadInventoryFromStorage();
        this.loadShiftsFromStorage();
        this.loadDiscountsFromStorage();
        this.loadOfflineQueueFromStorage();
        this.loadRestaurantSettingsFromStorage();
        this.setupEventListeners();
        this.setupNotifications();
        this.refreshCategoryOptions();
        this.refreshDishOptions();
        this.refreshReservationTableSelect();
        this.renderMenuList();
        this.renderTablesGrid();
        this.renderReservations();
        this.renderReservationCalendar();
        this.renderHistory();
        this.renderEvents();
        this.renderOpeningHours();
        this.renderClientPreferences();
        this.renderServers();
        this.renderNotifications();
        this.renderViews();
        this.updateSendAllButton();
        this.updateStatistics();
        
        // Update sound button
        if (this.dom.soundToggleBtn) {
            this.dom.soundToggleBtn.textContent = this.soundEnabled ? '🔊 Son activé' : '🔇 Son désactivé';
        }
        
        // Focus first input
        if (this.dom.tableInput) this.dom.tableInput.focus();

        // Register service worker for PWA (non-blocking)
        if ('serviceWorker' in navigator) {
            navigator.serviceWorker.register('sw.js').catch(() => {});
        }
        
        // Setup multi-device synchronization
        this.setupBroadcastChannel();
        
        // Setup keyboard shortcuts
        this.setupKeyboardShortcuts();
        
        // Setup fullscreen mode
        this.setupFullscreenMode();
    }
    
    setupBroadcastChannel() {
        if (typeof BroadcastChannel !== 'undefined') {
            this.broadcastChannel = new BroadcastChannel('cuisync-sync');
            
            this.broadcastChannel.onmessage = (event) => {
                const { type, data, deviceId } = event.data;
                
                // Ignore messages from this device
                if (deviceId === this.deviceId) return;
                
                switch (type) {
                    case 'pad-updated':
                        this.handleRemotePadUpdate(data);
                        break;
                    case 'pad-sent':
                        this.handleRemotePadSent(data);
                        break;
                    case 'pad-ready':
                        this.handleRemotePadReady(data);
                        break;
                    case 'menu-updated':
                        this.handleRemoteMenuUpdate(data);
                        break;
                    case 'table-updated':
                        this.handleRemoteTableUpdate(data);
                        break;
                    case 'inventory-updated':
                        this.handleRemoteInventoryUpdate(data);
                        break;
                }
            };
        }
    }
    
    broadcastMessage(type, data) {
        if (this.broadcastChannel && this.isOnline) {
            try {
                this.broadcastChannel.postMessage({
                    type,
                    data,
                    deviceId: this.deviceId,
                    timestamp: Date.now()
                });
            } catch (error) {
                console.error('Broadcast error:', error);
                // Queue for later sync
                this.offlineQueue.push({ type, data });
            }
        } else {
            // Queue for later sync when online
            this.offlineQueue.push({ type, data });
            this.saveToStorage();
        }
    }
    
    handleRemotePadUpdate(pad) {
        const existingPad = this.pads.find(p => p.id === pad.id);
        if (existingPad) {
            Object.assign(existingPad, pad);
        } else {
            this.pads.push(pad);
        }
        this.renderViews();
    }
    
    handleRemotePadSent(padId) {
        const pad = this.pads.find(p => p.id === padId);
        if (pad && pad.status === 'open') {
            pad.status = 'sent';
            pad.sentAt = new Date().toISOString();
            this.renderViews();
            if (this.currentView === 'kitchen') {
                this.playNotificationSound();
                this.showKitchenAlert(`Nouvelle commande - Table ${pad.table}`);
            }
        }
    }
    
    handleRemotePadReady(padId) {
        const pad = this.pads.find(p => p.id === padId);
        if (pad && pad.status === 'sent') {
            pad.status = 'ready';
            pad.readyAt = new Date().toISOString();
            this.renderViews();
        }
    }
    
    handleRemoteMenuUpdate(menu) {
        this.menu = menu;
        this.renderMenu();
        this.populateDishSelects();
    }
    
    handleRemoteTableUpdate(table) {
        const existingTable = this.tables.find(t => t.number === table.number);
        if (existingTable) {
            Object.assign(existingTable, table);
        } else {
            this.tables.push(table);
        }
        this.renderTables();
    }
    
    handleRemoteInventoryUpdate(inv) {
        const existing = this.inventory.find(i => i.id === inv.id);
        if (existing) {
            Object.assign(existing, inv);
        } else {
            this.inventory.push(inv);
        }
        if (this.currentView === 'host' && this.dom.inventoryManagement && !this.dom.inventoryManagement.classList.contains('hidden')) {
            this.renderInventory();
        }
    }
    
    setupKeyboardShortcuts() {
        document.addEventListener('keydown', (e) => {
            // Ignore shortcuts when typing in inputs
            if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.tagName === 'SELECT') {
                // Allow Ctrl/Cmd shortcuts
                if (!e.ctrlKey && !e.metaKey) return;
            }
            
            // Ctrl/Cmd + S: Save/Send all
            if ((e.ctrlKey || e.metaKey) && e.key === 's') {
                e.preventDefault();
                if (this.currentView === 'server') {
                    const sendAllBtn = document.getElementById('send-all-btn');
                    if (sendAllBtn && !sendAllBtn.disabled) {
                        sendAllBtn.click();
                    }
                }
            }
            
            // Ctrl/Cmd + P: Print kitchen ticket
            if ((e.ctrlKey || e.metaKey) && e.key === 'p' && this.currentView === 'kitchen') {
                e.preventDefault();
                const firstSentPad = this.pads.find(p => p.status === 'sent');
                if (firstSentPad) {
                    this.printKitchenTicket(firstSentPad.id);
                }
            }
            
            // F11: Toggle fullscreen
            if (e.key === 'F11') {
                e.preventDefault();
                this.toggleFullscreen();
            }
            
            // Escape: Exit fullscreen
            if (e.key === 'Escape' && this.isFullscreen) {
                this.exitFullscreen();
            }
            
            // Number keys 1-3: Switch views
            if (!e.ctrlKey && !e.metaKey && e.key >= '1' && e.key <= '3') {
                const views = ['server', 'kitchen', 'host'];
                const viewIndex = parseInt(e.key) - 1;
                if (views[viewIndex]) {
                    this.switchView(views[viewIndex]);
                }
            }
        });
    }
    
    setupFullscreenMode() {
        // Check if we're in kitchen view and should auto-enter fullscreen
        const urlParams = new URLSearchParams(window.location.search);
        if (urlParams.get('fullscreen') === 'kitchen') {
            this.switchView('kitchen');
            setTimeout(() => this.enterFullscreen(), 500);
        }
    }
    
    toggleFullscreen() {
        if (!this.isFullscreen) {
            this.enterFullscreen();
        } else {
            this.exitFullscreen();
        }
    }
    
    enterFullscreen() {
        if (document.documentElement.requestFullscreen) {
            document.documentElement.requestFullscreen();
        } else if (document.documentElement.webkitRequestFullscreen) {
            document.documentElement.webkitRequestFullscreen();
        } else if (document.documentElement.msRequestFullscreen) {
            document.documentElement.msRequestFullscreen();
        }
        this.isFullscreen = true;
        document.body.classList.add('fullscreen-mode');
    }
    
    exitFullscreen() {
        if (document.exitFullscreen) {
            document.exitFullscreen();
        } else if (document.webkitExitFullscreen) {
            document.webkitExitFullscreen();
        } else if (document.msExitFullscreen) {
            document.msExitFullscreen();
        }
        this.isFullscreen = false;
        document.body.classList.remove('fullscreen-mode');
    }
    
    showKitchenAlert(message) {
        // Create a prominent alert for kitchen
        const alert = document.createElement('div');
        alert.className = 'kitchen-alert';
        alert.innerHTML = `
            <div class="kitchen-alert-content">
                <div class="kitchen-alert-icon">🔔</div>
                <div class="kitchen-alert-message">${this.escapeHTML(message)}</div>
            </div>
        `;
        document.body.appendChild(alert);
        
        // Animate in
        setTimeout(() => alert.classList.add('show'), 100);
        
        // Remove after 5 seconds
        setTimeout(() => {
            alert.classList.remove('show');
            setTimeout(() => alert.remove(), 500);
        }, 5000);
        
        // Play sound
        this.playNotificationSound();
        
        // Vibrate if supported
        if (navigator.vibrate) {
            navigator.vibrate([200, 100, 200]);
        }
    }
    
    setupEventListeners() {
        // View toggle
        if (this.dom.serverViewBtn) {
            this.dom.serverViewBtn.addEventListener('click', () => this.switchView('server'));
        }
        if (this.dom.kitchenViewBtn) {
            this.dom.kitchenViewBtn.addEventListener('click', () => this.switchView('kitchen'));
        }
        if (this.dom.hostViewBtn) {
            this.dom.hostViewBtn.addEventListener('click', () => this.switchView('host'));
        }
        
        // Form submission
        this.dom.orderForm.addEventListener('submit', (e) => {
            e.preventDefault();
            this.handleFormSubmit();
        });
        
        // Menu management events
        if (this.dom.categoryForm) {
            this.dom.categoryForm.addEventListener('submit', (e) => {
                e.preventDefault();
                const name = this.dom.categoryNameInput.value.trim();
                if (!name) return;
                this.addCategory(name);
                this.dom.categoryNameInput.value = '';
            });
        }
        if (this.dom.dishForm) {
            this.dom.dishForm.addEventListener('submit', (e) => {
                e.preventDefault();
                const categoryId = this.dom.dishCategorySelect.value;
                const name = this.dom.dishNameInput.value.trim();
                const price = parseFloat(this.dom.dishPriceInput.value);
                const availability = this.dom.dishAvailabilitySelect ? this.dom.dishAvailabilitySelect.value : 'available';
                const allergens = this.dom.dishAllergensInput ? this.dom.dishAllergensInput.value.trim() : '';
                const description = this.dom.dishDescriptionInput ? this.dom.dishDescriptionInput.value.trim() : '';
                if (!categoryId || !name || isNaN(price)) return;
                this.addDish(categoryId, name, price, { availability, allergens, description });
                this.dom.dishNameInput.value = '';
                this.dom.dishPriceInput.value = '';
                if (this.dom.dishAllergensInput) this.dom.dishAllergensInput.value = '';
                if (this.dom.dishDescriptionInput) this.dom.dishDescriptionInput.value = '';
            });
        }
        if (this.dom.categorySelect) {
            this.dom.categorySelect.addEventListener('change', () => {
                if (this.dom.categorySelect.value === '__add_category__') {
                    const name = prompt('Nom de la nouvelle catégorie');
                    // Reset selection if cancelled or empty
                    if (!name || !name.trim()) {
                        this.dom.categorySelect.value = '';
                    } else {
                        const beforeCount = this.menu.categories.length;
                        this.addCategory(name.trim());
                        // Select the newly added category
                        const added = this.menu.categories[this.menu.categories.length - 1];
                        if (added && this.menu.categories.length > beforeCount) {
                            this.dom.categorySelect.value = added.id;
                        }
                    }
                }
                this.refreshDishOptions();
                // Clear dish selection and price when category changes
                if (this.dom.priceInput) this.dom.priceInput.value = '';
            });
        }
        if (this.dom.dishSelect) {
            this.dom.dishSelect.addEventListener('change', () => {
                const selectedDish = this.getSelectedDish();
                if (selectedDish) {
                    if (this.dom.priceInput) {
                        this.dom.priceInput.value = selectedDish.price.toFixed(2);
                    }
                    // Also mirror name in free text input for visibility
                    this.dom.dishInput.value = selectedDish.name;
                    // Check availability
                    if (selectedDish.availability === 'unavailable') {
                        this.showToast('Ce plat n\'est plus disponible', 'warning');
                    }
                }
                this.recalculateTotal();
            });
        }
        if (this.dom.dishCategorySelect) {
            // Keep category dropdowns in sync
            this.dom.dishCategorySelect.addEventListener('focus', () => this.refreshDishCategorySelect());
            this.dom.dishCategorySelect.addEventListener('change', () => {
                if (this.dom.dishCategorySelect.value === '__add_category__') {
                    const name = prompt('Nom de la nouvelle catégorie');
                    if (!name || !name.trim()) {
                        this.dom.dishCategorySelect.value = '';
                    } else {
                        const beforeCount = this.menu.categories.length;
                        this.addCategory(name.trim());
                        const added = this.menu.categories[this.menu.categories.length - 1];
                        if (added && this.menu.categories.length > beforeCount) {
                            this.dom.dishCategorySelect.value = added.id;
                        }
                    }
                }
            });
        }
        
        // Actions
        this.dom.sendAllBtn.addEventListener('click', () => this.sendAllOpenPads());
        this.dom.exportBtn.addEventListener('click', () => this.exportToCSV());
        if (this.dom.exportSalesBtn) {
            this.dom.exportSalesBtn.addEventListener('click', () => this.exportSalesCSV());
        }

        // POS settings
        const posForm = document.getElementById('pos-settings-form');
        if (posForm) {
            posForm.addEventListener('submit', (e) => {
                e.preventDefault();
                this.savePOSSettings();
            });
        }

        // Payment panel events
        if (this.dom.paymentMethod) {
            this.dom.paymentMethod.addEventListener('change', () => {
                this.updatePaymentUI();
                if (this.dom.splitPaymentRow) {
                    this.dom.splitPaymentRow.style.display = this.dom.paymentMethod.value === 'split' ? 'grid' : 'none';
                }
            });
        }
        
        // Tables management
        if (this.dom.addTableBtn) {
            this.dom.addTableBtn.addEventListener('click', () => this.addTable());
        }
        if (this.dom.saveTablesConfigBtn) {
            this.dom.saveTablesConfigBtn.addEventListener('click', () => this.saveTablesConfig());
        }
        if (this.dom.tablesViewBtn) {
            this.dom.tablesViewBtn.addEventListener('click', () => this.toggleHostView('tables'));
        }
        if (this.dom.reservationsViewBtn) {
            this.dom.reservationsViewBtn.addEventListener('click', () => this.toggleHostView('reservations'));
        }
        if (this.dom.statsViewBtn) {
            this.dom.statsViewBtn.addEventListener('click', () => this.toggleHostView('stats'));
        }
        if (this.dom.menuViewBtn) {
            this.dom.menuViewBtn.addEventListener('click', () => this.toggleHostView('menu'));
        }
        if (this.dom.inventoryViewBtn) {
            this.dom.inventoryViewBtn.addEventListener('click', () => this.toggleHostView('inventory'));
        }
        if (this.dom.shiftsViewBtn) {
            this.dom.shiftsViewBtn.addEventListener('click', () => this.toggleHostView('shifts'));
        }
        if (this.dom.discountsViewBtn) {
            this.dom.discountsViewBtn.addEventListener('click', () => this.toggleHostView('discounts'));
        }
        if (this.dom.reportsViewBtn) {
            this.dom.reportsViewBtn.addEventListener('click', () => this.toggleHostView('reports'));
        }
        
        // New section event listeners
        if (this.dom.addShiftBtn) {
            this.dom.addShiftBtn.addEventListener('click', () => this.showAddShiftModal());
        }
        if (this.dom.addDiscountBtn) {
            this.dom.addDiscountBtn.addEventListener('click', () => this.showAddDiscountModal());
        }
        if (this.dom.generateReportBtn) {
            this.dom.generateReportBtn.addEventListener('click', () => this.generateReport());
        }
        if (this.dom.exportPdfBtn) {
            this.dom.exportPdfBtn.addEventListener('click', () => this.exportReportToPDF());
        }
        
        // Inventory filters
        const inventorySearchInput = document.getElementById('inventory-search-input');
        if (inventorySearchInput) {
            inventorySearchInput.addEventListener('input', () => this.renderInventory());
        }
        const inventoryStatusFilter = document.getElementById('inventory-status-filter');
        if (inventoryStatusFilter) {
            inventoryStatusFilter.addEventListener('change', () => this.renderInventory());
        }
        const refreshInventoryBtn = document.getElementById('refresh-inventory-btn');
        if (refreshInventoryBtn) {
            refreshInventoryBtn.addEventListener('click', () => this.renderInventory());
        }
        
        // Online/offline detection
        window.addEventListener('online', () => {
            this.isOnline = true;
            this.syncOfflineQueue();
            this.showToast('Connexion rétablie', 'success');
        });
        
        window.addEventListener('offline', () => {
            this.isOnline = false;
            this.showToast('Mode hors ligne activé', 'info');
        });
        if (this.dom.clientsViewBtn) {
            this.dom.clientsViewBtn.addEventListener('click', () => this.toggleHostView('clients'));
        }
        if (this.dom.historyViewBtn) {
            this.dom.historyViewBtn.addEventListener('click', () => this.toggleHostView('history'));
        }
        if (this.dom.settingsViewBtn) {
            this.dom.settingsViewBtn.addEventListener('click', () => this.toggleHostView('settings'));
        }
        if (this.dom.mapViewBtn) {
            this.dom.mapViewBtn.addEventListener('click', () => this.toggleHostView('map'));
        }
        
        // Reservations
        if (this.dom.reservationForm) {
            this.dom.reservationForm.addEventListener('submit', (e) => {
                e.preventDefault();
                this.addReservation();
            });
        }
        
        // Statistics
        if (this.dom.statsPeriodSelect) {
            this.dom.statsPeriodSelect.addEventListener('change', () => this.updateStatistics());
        }
        
        // History
        if (this.dom.historyFilterSelect) {
            this.dom.historyFilterSelect.addEventListener('change', () => this.renderHistory());
        }
        if (this.dom.historySearchInput) {
            this.dom.historySearchInput.addEventListener('input', () => this.renderHistory());
        }
        
        // Reservation calendar
        if (this.dom.prevDayBtn) {
            this.dom.prevDayBtn.addEventListener('click', () => {
                this.currentReservationDate.setDate(this.currentReservationDate.getDate() - 1);
                this.renderReservationCalendar();
            });
        }
        if (this.dom.nextDayBtn) {
            this.dom.nextDayBtn.addEventListener('click', () => {
                this.currentReservationDate.setDate(this.currentReservationDate.getDate() + 1);
                this.renderReservationCalendar();
            });
        }
        if (this.dom.todayBtn) {
            this.dom.todayBtn.addEventListener('click', () => {
                this.currentReservationDate = new Date();
                this.renderReservationCalendar();
            });
        }
        
        // Tables view toggle
        if (this.dom.gridViewBtn) {
            this.dom.gridViewBtn.addEventListener('click', () => {
                this.isFloorPlanView = false;
                this.dom.gridViewBtn.classList.add('active');
                this.dom.floorPlanViewBtn.classList.remove('active');
                this.dom.tablesGridView.classList.remove('hidden');
                this.dom.tablesFloorPlanView.classList.add('hidden');
            });
        }
        if (this.dom.floorPlanViewBtn) {
            this.dom.floorPlanViewBtn.addEventListener('click', () => {
                this.isFloorPlanView = true;
                this.dom.floorPlanViewBtn.classList.add('active');
                this.dom.gridViewBtn.classList.remove('active');
                this.dom.tablesGridView.classList.add('hidden');
                this.dom.tablesFloorPlanView.classList.remove('hidden');
                this.renderFloorPlan();
            });
        }
        
        // Restaurant settings
        if (this.dom.restaurantSettingsForm) {
            this.dom.restaurantSettingsForm.addEventListener('submit', (e) => {
                e.preventDefault();
                this.saveRestaurantSettings();
            });
        }
        
        // Events
        if (this.dom.eventForm) {
            this.dom.eventForm.addEventListener('submit', (e) => {
                e.preventDefault();
                this.addEvent();
            });
        }
        
        // Client search
        if (this.dom.clientSearchInput) {
            this.dom.clientSearchInput.addEventListener('input', () => this.renderClientPreferences());
        }
        
        // Server view search
        if (this.dom.serverSearchInput) {
            this.dom.serverSearchInput.addEventListener('input', () => this.renderServerView());
        }
        if (this.dom.serverStatusFilter) {
            this.dom.serverStatusFilter.addEventListener('change', () => this.renderServerView());
        }
        
        // Menu search
        if (this.dom.menuSearchInput) {
            this.dom.menuSearchInput.addEventListener('input', () => this.renderMenuList());
        }
        if (this.dom.importMenuBtn) {
            this.dom.importMenuBtn.addEventListener('click', () => this.importMenu());
        }
        if (this.dom.exportMenuBtn) {
            this.dom.exportMenuBtn.addEventListener('click', () => this.exportMenu());
        }
        
        // Payment panel close
        if (this.dom.paymentCloseBtn) {
            this.dom.paymentCloseBtn.addEventListener('click', () => this.closePaymentPanel());
        }
        
        // Payment split options
        if (this.dom.splitByPersonBtn) {
            this.dom.splitByPersonBtn.addEventListener('click', () => this.splitByPerson());
        }
        if (this.dom.splitByCoversBtn) {
            this.dom.splitByCoversBtn.addEventListener('click', () => this.splitByCovers());
        }
        if (this.dom.splitCustomBtn) {
            this.dom.splitCustomBtn.addEventListener('click', () => this.splitCustom());
        }
        if (this.dom.paymentSplitAmount) {
            this.dom.paymentSplitAmount.addEventListener('input', () => this.updatePaymentChange());
        }
        if (this.dom.paymentReceived) {
            this.dom.paymentReceived.addEventListener('input', () => this.updatePaymentChange());
        }
        
        // History
        if (this.dom.clearHistoryBtn) {
            this.dom.clearHistoryBtn.addEventListener('click', () => this.clearHistory());
        }
        
        // Backup & Restore
        if (this.dom.backupAllBtn) {
            this.dom.backupAllBtn.addEventListener('click', () => this.backupAllData());
        }
        if (this.dom.restoreBtn) {
            this.dom.restoreBtn.addEventListener('click', () => {
                if (this.dom.restoreFileInput) this.dom.restoreFileInput.click();
            });
        }
        if (this.dom.restoreFileInput) {
            this.dom.restoreFileInput.addEventListener('change', (e) => this.restoreFromFile(e));
        }
        
        // Kitchen
        if (this.dom.kitchenFilterSelect) {
            this.dom.kitchenFilterSelect.addEventListener('change', () => this.renderKitchenView());
        }
        if (this.dom.soundToggleBtn) {
            this.dom.soundToggleBtn.addEventListener('click', () => this.toggleSound());
        }
        
        if (this.dom.fullscreenBtn) {
            this.dom.fullscreenBtn.addEventListener('click', () => this.toggleFullscreen());
        }
        
        if (this.dom.printAllKitchenBtn) {
            this.dom.printAllKitchenBtn.addEventListener('click', () => this.printAllKitchenTickets());
        }
        
        // Render modifiers on init
        this.renderModifiers();
        
        // Servers
        // Set initial active tab for host view
        if (this.dom.tablesViewBtn) {
            this.dom.tablesViewBtn.classList.add('active');
        }
        if (this.dom.serverForm) {
            this.dom.serverForm.addEventListener('submit', (e) => {
                e.preventDefault();
                this.addServer();
            });
        }
        
        // Statistics
        if (this.dom.exportReportBtn) {
            this.dom.exportReportBtn.addEventListener('click', () => this.exportReport());
        }
        if (this.dom.paymentReceived) {
            this.dom.paymentReceived.addEventListener('input', () => this.updatePaymentChange());
            this.dom.paymentReceived.addEventListener('change', () => this.updatePaymentChange());
        }
        if (this.dom.paymentCancel) {
            this.dom.paymentCancel.addEventListener('click', () => this.closePaymentPanel());
        }
        if (this.dom.paymentConfirm) {
            this.dom.paymentConfirm.addEventListener('click', () => this.confirmPayment());
        }

        // Live total recalculation
        if (this.dom.qtyInput) {
            this.dom.qtyInput.addEventListener('input', () => this.recalculateTotal());
            this.dom.qtyInput.addEventListener('change', () => this.recalculateTotal());
        }
        if (this.dom.priceInput) {
            this.dom.priceInput.addEventListener('input', () => this.recalculateTotal());
            this.dom.priceInput.addEventListener('change', () => this.recalculateTotal());
        }
        
        // Undo
        this.dom.undoBtn.addEventListener('click', () => this.performUndo());
        
        // Keyboard shortcuts
        document.addEventListener('keydown', (e) => {
            if ((e.ctrlKey || e.metaKey) && e.key === 'z') {
                e.preventDefault();
                this.performUndo();
            } else if (e.key === 'u' || e.key === 'U') {
                if (!e.target.matches('input, textarea, select')) {
                    e.preventDefault();
                    this.performUndo();
                }
            }
        });
    }
    
    // HOOK POINT: Replace with Supabase persistence
    // supabase.from('pads').insert(pad).then(...)
    saveToStorage() {
        clearTimeout(this.debounceTimer);
        this.debounceTimer = setTimeout(() => {
            try {
                localStorage.setItem('cuisync-pads', JSON.stringify(this.pads));
                localStorage.setItem('cuisync-settings', JSON.stringify({
                    pos: this.posSettings || null,
                    maxTables: this.maxTables
                }));
                localStorage.setItem('cuisync-menu', JSON.stringify(this.menu));
                if (this.sales && Array.isArray(this.sales)) {
                    localStorage.setItem('cuisync-sales', JSON.stringify(this.sales));
                }
                if (this.tables && Array.isArray(this.tables)) {
                    localStorage.setItem('cuisync-tables', JSON.stringify(this.tables));
                }
                if (this.reservations && Array.isArray(this.reservations)) {
                    localStorage.setItem('cuisync-reservations', JSON.stringify(this.reservations));
                }
                if (this.history && Array.isArray(this.history)) {
                    localStorage.setItem('cuisync-history', JSON.stringify(this.history));
                }
                if (this.events && Array.isArray(this.events)) {
                    localStorage.setItem('cuisync-events', JSON.stringify(this.events));
                }
                if (this.clientPreferences && Array.isArray(this.clientPreferences)) {
                    localStorage.setItem('cuisync-client-preferences', JSON.stringify(this.clientPreferences));
                }
                if (this.restaurantSettings) {
                    localStorage.setItem('cuisync-restaurant-settings', JSON.stringify(this.restaurantSettings));
                }
                if (this.servers && Array.isArray(this.servers)) {
                    localStorage.setItem('cuisync-servers', JSON.stringify(this.servers));
                }
                if (this.notifications && Array.isArray(this.notifications)) {
                    localStorage.setItem('cuisync-notifications', JSON.stringify(this.notifications));
                }
                if (this.inventory && Array.isArray(this.inventory)) {
                    localStorage.setItem('cuisync-inventory', JSON.stringify(this.inventory));
                }
                if (this.shifts && Array.isArray(this.shifts)) {
                    localStorage.setItem('cuisync-shifts', JSON.stringify(this.shifts));
                }
                if (this.discounts && Array.isArray(this.discounts)) {
                    localStorage.setItem('cuisync-discounts', JSON.stringify(this.discounts));
                }
                if (this.offlineQueue && Array.isArray(this.offlineQueue)) {
                    localStorage.setItem('cuisync-offline-queue', JSON.stringify(this.offlineQueue));
                }
                localStorage.setItem('cuisync-sound-enabled', JSON.stringify(this.soundEnabled));
            } catch (error) {
                console.error('Failed to save to localStorage:', error);
                this.showToast('Erreur de sauvegarde', 'error');
            }
        }, 300);
    }
    
    // HOOK POINT: Replace with Supabase loading
    // supabase.from('pads').select('*').then(...)
    loadFromStorage() {
        try {
            const savedPads = localStorage.getItem('cuisync-pads');
            if (savedPads) {
                this.pads = JSON.parse(savedPads);
            }
            
            const savedSettings = localStorage.getItem('cuisync-settings');
            if (savedSettings) {
                const settings = JSON.parse(savedSettings);
                this.posSettings = settings.pos || { taxRatePct: 10, currency: '€', defaultTipPct: 0, printAfterPay: false };
                this.maxTables = settings.maxTables || 20;
            }
            const savedSales = localStorage.getItem('cuisync-sales');
            this.sales = savedSales ? JSON.parse(savedSales) : [];
            
            const savedSound = localStorage.getItem('cuisync-sound-enabled');
            if (savedSound !== null) {
                this.soundEnabled = JSON.parse(savedSound);
            }
        } catch (error) {
            console.error('Failed to load from localStorage:', error);
            this.pads = [];
        }
    }

    loadMenuFromStorage() {
        try {
            const savedMenu = localStorage.getItem('cuisync-menu');
            if (savedMenu) {
                this.menu = JSON.parse(savedMenu);
            }
        } catch (error) {
            console.error('Failed to load menu from localStorage:', error);
            this.menu = { categories: [] };
        }
    }
    
    loadTablesFromStorage() {
        try {
            const savedTables = localStorage.getItem('cuisync-tables');
            if (savedTables) {
                this.tables = JSON.parse(savedTables);
            } else {
                // Initialiser avec des tables par défaut
                this.initializeDefaultTables();
            }
        } catch (error) {
            console.error('Failed to load tables from localStorage:', error);
            this.initializeDefaultTables();
        }
    }
    
    loadReservationsFromStorage() {
        try {
            const savedReservations = localStorage.getItem('cuisync-reservations');
            if (savedReservations) {
                this.reservations = JSON.parse(savedReservations);
            } else {
                this.reservations = [];
            }
        } catch (error) {
            console.error('Failed to load reservations from localStorage:', error);
            this.reservations = [];
        }
    }
    
    loadHistoryFromStorage() {
        try {
            const savedHistory = localStorage.getItem('cuisync-history');
            if (savedHistory) {
                this.history = JSON.parse(savedHistory);
            } else {
                this.history = [];
            }
        } catch (error) {
            console.error('Failed to load history from localStorage:', error);
            this.history = [];
        }
    }
    
    loadEventsFromStorage() {
        try {
            const savedEvents = localStorage.getItem('cuisync-events');
            if (savedEvents) {
                this.events = JSON.parse(savedEvents);
            } else {
                this.events = [];
            }
        } catch (error) {
            console.error('Failed to load events from localStorage:', error);
            this.events = [];
        }
    }
    
    loadClientPreferencesFromStorage() {
        try {
            const savedPreferences = localStorage.getItem('cuisync-client-preferences');
            if (savedPreferences) {
                this.clientPreferences = JSON.parse(savedPreferences);
            } else {
                this.clientPreferences = [];
            }
        } catch (error) {
            console.error('Failed to load client preferences from localStorage:', error);
            this.clientPreferences = [];
        }
    }
    
    loadRestaurantSettingsFromStorage() {
        try {
            const savedSettings = localStorage.getItem('cuisync-restaurant-settings');
            if (savedSettings) {
                this.restaurantSettings = { ...this.restaurantSettings, ...JSON.parse(savedSettings) };
            }
            // Populate form if elements exist
            if (this.dom.restaurantNameInput) this.dom.restaurantNameInput.value = this.restaurantSettings.name || '';
            if (this.dom.restaurantPhoneInput) this.dom.restaurantPhoneInput.value = this.restaurantSettings.phone || '';
            if (this.dom.restaurantEmailInput) this.dom.restaurantEmailInput.value = this.restaurantSettings.email || '';
            if (this.dom.restaurantAddressInput) this.dom.restaurantAddressInput.value = this.restaurantSettings.address || '';
        } catch (error) {
            console.error('Failed to load restaurant settings from localStorage:', error);
        }
    }
    
    loadServersFromStorage() {
        try {
            const savedServers = localStorage.getItem('cuisync-servers');
            if (savedServers) {
                this.servers = JSON.parse(savedServers);
            } else {
                this.servers = [];
            }
        } catch (error) {
            console.error('Failed to load servers from localStorage:', error);
            this.servers = [];
        }
    }
    
    loadInventoryFromStorage() {
        try {
            const savedInventory = localStorage.getItem('cuisync-inventory');
            if (savedInventory) {
                this.inventory = JSON.parse(savedInventory);
            } else {
                this.inventory = [];
            }
        } catch (error) {
            console.error('Failed to load inventory from localStorage:', error);
            this.inventory = [];
        }
    }
    
    loadShiftsFromStorage() {
        try {
            const savedShifts = localStorage.getItem('cuisync-shifts');
            if (savedShifts) {
                this.shifts = JSON.parse(savedShifts);
            } else {
                this.shifts = [];
            }
        } catch (error) {
            console.error('Failed to load shifts from localStorage:', error);
            this.shifts = [];
        }
    }
    
    loadDiscountsFromStorage() {
        try {
            const savedDiscounts = localStorage.getItem('cuisync-discounts');
            if (savedDiscounts) {
                this.discounts = JSON.parse(savedDiscounts);
            } else {
                this.discounts = [];
            }
        } catch (error) {
            console.error('Failed to load discounts from localStorage:', error);
            this.discounts = [];
        }
    }
    
    loadOfflineQueueFromStorage() {
        try {
            const savedQueue = localStorage.getItem('cuisync-offline-queue');
            if (savedQueue) {
                this.offlineQueue = JSON.parse(savedQueue);
            } else {
                this.offlineQueue = [];
            }
        } catch (error) {
            console.error('Failed to load offline queue from localStorage:', error);
            this.offlineQueue = [];
        }
    }
    
    setupNotifications() {
        // Check for upcoming reservations every minute
        setInterval(() => {
            this.checkUpcomingReservations();
        }, 60000);
        
        // Check immediately
        this.checkUpcomingReservations();
    }
    
    checkUpcomingReservations() {
        const now = new Date();
        const in30Minutes = new Date(now.getTime() + 30 * 60000);
        
        const upcoming = this.reservations.filter(r => {
            if (r.status !== 'pending' && r.status !== 'confirmed') return false;
            const resDate = new Date(r.date);
            return resDate >= now && resDate <= in30Minutes;
        });
        
        upcoming.forEach(reservation => {
            const exists = this.notifications.some(n => n.type === 'reservation' && n.reservationId === reservation.id);
            if (!exists) {
                this.addNotification({
                    type: 'reservation',
                    title: 'Réservation à venir',
                    message: `${reservation.name} - ${reservation.covers} couverts à ${new Date(reservation.date).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}`,
                    reservationId: reservation.id,
                    priority: 'high',
                    createdAt: new Date().toISOString()
                });
            }
        });
        
        this.renderNotifications();
    }
    
    addNotification(notification) {
        notification.id = notification.id || this.generateId();
        this.notifications.unshift(notification);
        // Keep only last 50 notifications
        if (this.notifications.length > 50) {
            this.notifications = this.notifications.slice(0, 50);
        }
        this.saveToStorage();
        
        if (this.soundEnabled && notification.priority === 'high') {
            this.playNotificationSound();
        }
    }
    
    renderNotifications() {
        if (!this.dom.notificationsList) return;
        
        const recent = this.notifications.slice(0, 10);
        const html = recent.map(notif => {
            const icon = notif.type === 'reservation' ? '📅' : notif.type === 'order' ? '🍽️' : 'ℹ️';
            return `
                <div class="notification-item ${notif.priority || 'normal'}" data-notification-id="${notif.id}">
                    <div class="notification-icon">${icon}</div>
                    <div class="notification-content">
                        <div class="notification-title">${this.escapeHTML(notif.title)}</div>
                        <div class="notification-message">${this.escapeHTML(notif.message)}</div>
                        <div class="notification-time">${this.formatDate(notif.createdAt)}</div>
                    </div>
                    <button class="btn btn-sm btn-icon" onclick="window.cuisyncApp.dismissNotification('${notif.id}')" title="Fermer">✕</button>
                </div>
            `;
        }).join('');
        
        this.dom.notificationsList.innerHTML = html || '<div class="empty-state"><p>Aucune notification</p></div>';
    }
    
    dismissNotification(notificationId) {
        this.notifications = this.notifications.filter(n => n.id !== notificationId);
        this.saveToStorage();
        this.renderNotifications();
    }
    
    renderModifiers() {
        if (!this.dom.modifiersContainer) return;
        
        const html = this.modifiers.map(modifier => `
            <label class="modifier-checkbox">
                <input type="checkbox" value="${this.escapeHTML(modifier)}" class="modifier-check">
                <span>${this.escapeHTML(modifier)}</span>
            </label>
        `).join('');
        
        this.dom.modifiersContainer.innerHTML = html;
    }
    
    getSelectedModifiers() {
        if (!this.dom.modifiersContainer) return [];
        const checkboxes = this.dom.modifiersContainer.querySelectorAll('.modifier-check:checked');
        return Array.from(checkboxes).map(cb => cb.value);
    }
    
    printAllKitchenTickets() {
        const sentPads = this.pads.filter(p => p.status === 'sent');
        if (sentPads.length === 0) {
            this.showToast('Aucune commande en attente à imprimer', 'info');
            return;
        }
        
        sentPads.forEach((pad, index) => {
            setTimeout(() => {
                this.printKitchenTicket(pad.id);
            }, index * 1000); // Stagger prints by 1 second
        });
        
        this.showToast(`${sentPads.length} ticket(s) en cours d'impression`, 'success');
    }
    
    initializeDefaultTables() {
        this.tables = [];
        for (let i = 1; i <= this.maxTables; i++) {
            this.tables.push({
                id: i,
                number: i,
                status: 'free', // free, occupied, reserved, cleaning
                capacity: 4,
                notes: ''
            });
        }
    }

    saveMenuToStorage() {
        try {
            localStorage.setItem('cuisync-menu', JSON.stringify(this.menu));
        } catch (error) {
            console.error('Failed to save menu to localStorage:', error);
            this.showToast('Erreur de sauvegarde du menu', 'error');
        }
    }
    
    switchView(view) {
        this.currentView = view;
        
        // Hide all views first
        if (this.dom.serverView) this.dom.serverView.classList.remove('active');
        if (this.dom.kitchenView) this.dom.kitchenView.classList.remove('active');
        if (this.dom.hostView) this.dom.hostView.classList.remove('active');
        
        // Remove active class from all buttons
        if (this.dom.serverViewBtn) this.dom.serverViewBtn.classList.remove('active');
        if (this.dom.kitchenViewBtn) this.dom.kitchenViewBtn.classList.remove('active');
        if (this.dom.hostViewBtn) this.dom.hostViewBtn.classList.remove('active');
        
        // Set aria-pressed to false for all buttons
        if (this.dom.serverViewBtn) this.dom.serverViewBtn.setAttribute('aria-pressed', 'false');
        if (this.dom.kitchenViewBtn) this.dom.kitchenViewBtn.setAttribute('aria-pressed', 'false');
        if (this.dom.hostViewBtn) this.dom.hostViewBtn.setAttribute('aria-pressed', 'false');
        
        // Show selected view and activate button
        if (view === 'server') {
            if (this.dom.serverView) this.dom.serverView.classList.add('active');
            if (this.dom.serverViewBtn) {
                this.dom.serverViewBtn.classList.add('active');
                this.dom.serverViewBtn.setAttribute('aria-pressed', 'true');
            }
        } else if (view === 'kitchen') {
            if (this.dom.kitchenView) this.dom.kitchenView.classList.add('active');
            if (this.dom.kitchenViewBtn) {
                this.dom.kitchenViewBtn.classList.add('active');
                this.dom.kitchenViewBtn.setAttribute('aria-pressed', 'true');
            }
        } else if (view === 'host') {
            if (this.dom.hostView) this.dom.hostView.classList.add('active');
            if (this.dom.hostViewBtn) {
                this.dom.hostViewBtn.classList.add('active');
                this.dom.hostViewBtn.setAttribute('aria-pressed', 'true');
            }
        }
        
        this.renderViews();
    }
    
    handleFormSubmit() {
        if (!this.validateForm()) {
            // Focus on first error field
            if (this.dom.tableInput && !this.dom.tableInput.value) {
                this.dom.tableInput.focus();
            } else if (this.dom.dishInput && !this.dom.dishInput.value.trim() && (!this.dom.dishSelect || !this.dom.dishSelect.value)) {
                this.dom.dishInput.focus();
            }
            return;
        }
        
        const tableNum = parseInt(this.dom.tableInput.value);
        if (isNaN(tableNum) || tableNum < 1 || tableNum > 99) {
            this.showToast('Numéro de table invalide', 'error');
            return;
        }
        
        const coversStr = this.dom.coversInput ? this.dom.coversInput.value : '';
        const covers = coversStr ? (parseInt(coversStr) || null) : null;
        if (covers !== null && (covers < 1 || covers > 50)) {
            this.showToast('Nombre de couverts invalide (1-50)', 'error');
            return;
        }
        
        const clientName = this.dom.clientNameInput ? this.dom.clientNameInput.value.trim() : null;
        const tableNotes = this.dom.tableNotesInput ? this.dom.tableNotesInput.value.trim() : null;
        let dish = this.dom.dishInput ? this.dom.dishInput.value.trim() : '';
        const qty = parseInt(this.dom.qtyInput ? this.dom.qtyInput.value : '1');
        const course = this.dom.courseInput ? this.dom.courseInput.value : 'plat';
        const note = this.dom.noteInput ? this.dom.noteInput.value.trim() : null;
        const hasAllergens = this.dom.itemAllergenCheck ? this.dom.itemAllergenCheck.checked : false;
        const selectedCategory = this.getSelectedCategory();
        const selectedDish = this.getSelectedDish();
        
        let price = null;
        if (this.dom.priceInput && this.dom.priceInput.value !== '') {
            price = parseFloat(this.dom.priceInput.value);
            if (isNaN(price) || price < 0) price = null;
        } else if (selectedDish && typeof selectedDish.price === 'number') {
            price = selectedDish.price;
        }
        
        if (selectedDish) {
            dish = selectedDish.name;
        }
        
        if (!dish || dish.trim() === '') {
            this.showToast('Le nom du plat est requis', 'error');
            return;
        }
        
        if (qty < 1 || qty > 100) {
            this.showToast('Quantité invalide (1-100)', 'error');
            return;
        }
        
        const modifiers = this.getSelectedModifiers();
        
        this.addItemToPad(tableNum, dish, qty, course, note, {
            categoryName: selectedCategory ? selectedCategory.name : null,
            price: price,
            hasAllergens: hasAllergens,
            modifiers: modifiers
        }, {
            covers: covers,
            clientName: clientName,
            tableNotes: tableNotes
        });
        this.recalculateTotal();
        this.clearForm();
        if (this.dom.tableInput) this.dom.tableInput.focus();
    }
    
    validateForm() {
        let isValid = true;
        
        // Clear previous errors
        document.querySelectorAll('.error-message').forEach(el => el.textContent = '');
        
        // Validate table
        const table = this.dom.tableInput.value;
        if (!table || parseInt(table) < 1 || parseInt(table) > 99) {
            document.getElementById('table-error').textContent = 'Table doit être entre 1 et 99';
            isValid = false;
        }
        
        // Validate dish: either a selection or free text
        const dish = this.dom.dishInput.value.trim();
        const selectedDishId = this.dom.dishSelect ? this.dom.dishSelect.value : '';
        if (!dish && !selectedDishId) {
            document.getElementById('dish-error').textContent = 'Le nom du plat est requis';
            isValid = false;
        }
        
        return isValid;
    }
    
    clearForm() {
        this.dom.dishInput.value = '';
        if (this.dom.categorySelect) this.dom.categorySelect.value = '';
        if (this.dom.dishSelect) this.dom.dishSelect.value = '';
        this.dom.qtyInput.value = '1';
        this.dom.courseInput.value = 'plat';
        this.dom.noteInput.value = '';
        if (this.dom.priceInput) this.dom.priceInput.value = '';
        if (this.dom.itemAllergenCheck) this.dom.itemAllergenCheck.checked = false;
        
        // Clear modifiers
        if (this.dom.modifiersContainer) {
            const checkboxes = this.dom.modifiersContainer.querySelectorAll('.modifier-check');
            checkboxes.forEach(cb => cb.checked = false);
        }
        
        // Keep table number, covers, client name, and table notes for convenience
        // this.dom.tableInput.value = '';
    }
    
    addItemToPad(tableNum, dish, qty, course, note, extra = {}, tableInfo = {}) {
        if (!tableNum || !dish || !qty) {
            this.showToast('Données invalides pour la commande', 'error');
            return;
        }
        
        let pad = this.pads.find(p => p.table === tableNum && p.status === 'open');
        
        if (!pad) {
            pad = {
                id: this.generateId(),
                table: tableNum,
                status: 'open',
                items: [],
                covers: tableInfo.covers || null,
                clientName: tableInfo.clientName || null,
                tableNotes: tableInfo.tableNotes || null,
                partialPayments: [], // Paiements partiels
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString()
            };
            this.pads.push(pad);
            // Mettre à jour le statut de la table
            this.updateTableStatus(tableNum, 'occupied');
        } else {
            // Mettre à jour les infos de table si fournies
            if (tableInfo.covers !== undefined && tableInfo.covers !== null) pad.covers = tableInfo.covers;
            if (tableInfo.clientName !== undefined && tableInfo.clientName !== null) pad.clientName = tableInfo.clientName;
            if (tableInfo.tableNotes !== undefined && tableInfo.tableNotes !== null) pad.tableNotes = tableInfo.tableNotes;
        }
        
        const item = {
            id: this.generateId(),
            dish,
            qty,
            course,
            note: note || null,
            price: typeof extra.price === 'number' ? extra.price : null,
            category: extra.categoryName || null,
            hasAllergens: extra.hasAllergens || false,
            modifiers: extra.modifiers && extra.modifiers.length > 0 ? extra.modifiers : null,
            allergen: extra.hasAllergens || false,
            createdAt: new Date().toISOString()
        };
        
        pad.items.push(item);
        pad.updatedAt = new Date().toISOString();
        
        this.saveToStorage();
        this.renderViews();
        this.renderTablesGrid();
        this.updateSendAllButton();
        
        this.showToast(`${dish} ajouté à la table ${tableNum}`, 'success');
        this.playNotificationSound();
    }

    recalculateTotal() {
        if (!this.dom.totalInput) return;
        const qtyStr = this.dom.qtyInput && this.dom.qtyInput.value ? this.dom.qtyInput.value : '0';
        const priceStr = this.dom.priceInput && this.dom.priceInput.value ? this.dom.priceInput.value : '0';
        const qty = parseFloat(qtyStr);
        const price = parseFloat(priceStr);
        const total = (isNaN(qty) || qty < 0 ? 0 : qty) * (isNaN(price) || price < 0 ? 0 : price);
        this.dom.totalInput.value = isNaN(total) ? '0.00' : total.toFixed(2);
    }

    // Menu APIs
    addCategory(name) {
        const exists = this.menu.categories.some(c => c.name.toLowerCase() === name.toLowerCase());
        if (exists) {
            this.showToast('Catégorie existe déjà', 'info');
            return;
        }
        const category = { id: this.generateId(), name, dishes: [] };
        this.menu.categories.push(category);
        this.saveMenuToStorage();
        this.refreshCategoryOptions();
        this.refreshDishCategorySelect();
        this.renderMenuList();
        this.showToast('Catégorie ajoutée', 'success');
    }

    addDish(categoryId, name, price, extra = {}) {
        const category = this.menu.categories.find(c => c.id === categoryId);
        if (!category) return;
        const exists = category.dishes.some(d => d.name.toLowerCase() === name.toLowerCase());
        if (exists) {
            this.showToast('Plat existe déjà dans cette catégorie', 'info');
            return;
        }
        const dish = {
            id: this.generateId(),
            name,
            price,
            availability: extra.availability || 'available',
            allergens: extra.allergens || '',
            description: extra.description || ''
        };
        category.dishes.push(dish);
        this.saveMenuToStorage();
        this.refreshDishOptions();
        this.renderMenuList();
        this.showToast('Plat ajouté', 'success');
    }

    editCategory(categoryId) {
        const category = this.menu.categories.find(c => c.id === categoryId);
        if (!category) return;
        const newName = prompt('Nouveau nom de la catégorie', category.name);
        if (!newName || !newName.trim()) return;
        const name = newName.trim();
        const duplicate = this.menu.categories.some(c => c.id !== categoryId && c.name.toLowerCase() === name.toLowerCase());
        if (duplicate) {
            this.showToast('Une catégorie avec ce nom existe déjà', 'error');
            return;
        }
        category.name = name;
        this.saveMenuToStorage();
        this.refreshCategoryOptions();
        this.renderMenuList();
        this.showToast('Catégorie renommée', 'success');
    }

    editDish(categoryId, dishId) {
        const category = this.menu.categories.find(c => c.id === categoryId);
        if (!category) return;
        const dish = (category.dishes || []).find(d => d.id === dishId);
        if (!dish) return;
        const newName = prompt('Nouveau nom du plat', dish.name);
        if (!newName || !newName.trim()) return;
        const name = newName.trim();
        const priceStr = prompt('Nouveau prix (€)', typeof dish.price === 'number' ? dish.price.toFixed(2) : '0.00');
        if (priceStr === null) return;
        const price = parseFloat(priceStr);
        if (isNaN(price) || price < 0) {
            this.showToast('Prix invalide', 'error');
            return;
        }
        const duplicate = category.dishes.some(d => d.id !== dishId && d.name.toLowerCase() === name.toLowerCase());
        if (duplicate) {
            this.showToast('Un plat avec ce nom existe déjà', 'error');
            return;
        }
        dish.name = name;
        dish.price = price;
        this.saveMenuToStorage();
        this.refreshDishOptions();
        this.renderMenuList();
        this.showToast('Plat modifié', 'success');
    }

    deleteDish(categoryId, dishId) {
        const category = this.menu.categories.find(c => c.id === categoryId);
        if (!category) return;
        const dish = (category.dishes || []).find(d => d.id === dishId);
        if (!dish) return;
        const confirmed = confirm(`Supprimer le plat "${dish.name}" ?`);
        if (!confirmed) return;
        category.dishes = category.dishes.filter(d => d.id !== dishId);
        this.saveMenuToStorage();
        this.refreshDishOptions();
        this.renderMenuList();
        this.showToast('Plat supprimé', 'success');
    }

	deleteCategory(categoryId) {
		const category = this.menu.categories.find(c => c.id === categoryId);
		if (!category) return;
		const confirmed = confirm(`Supprimer la catégorie "${category.name}" et tous ses plats ?`);
		if (!confirmed) return;
		this.menu.categories = this.menu.categories.filter(c => c.id !== categoryId);
		this.saveMenuToStorage();
		this.refreshCategoryOptions();
		this.refreshDishOptions();
		this.renderMenuList();
		this.showToast('Catégorie supprimée', 'success');
	}

    refreshCategoryOptions() {
        const selects = [this.dom.categorySelect, this.dom.dishCategorySelect].filter(Boolean);
        selects.forEach(select => {
            const current = select.value;
            select.innerHTML = '';
            const placeholder = document.createElement('option');
            placeholder.value = '';
            placeholder.textContent = select === this.dom.categorySelect ? 'Catégorie…' : 'Choisir catégorie…';
            placeholder.selected = true;
            select.appendChild(placeholder);
            this.menu.categories.forEach(cat => {
                const opt = document.createElement('option');
                opt.value = cat.id;
                opt.textContent = cat.name;
                select.appendChild(opt);
            });
            // Add inline add option
            const addOpt = document.createElement('option');
            addOpt.value = '__add_category__';
            addOpt.textContent = 'Ajouter une catégorie…';
            select.appendChild(addOpt);
            // Try to preserve selection
            if ([...select.options].some(o => o.value === current)) select.value = current;
        });
    }

    refreshDishCategorySelect() {
        // Ensures add-dish form category select includes latest categories
        this.refreshCategoryOptions();
    }

    refreshDishOptions() {
        if (!this.dom.dishSelect) return;
        const categoryId = this.dom.categorySelect ? this.dom.categorySelect.value : '';
        const dishSelect = this.dom.dishSelect;
        const current = dishSelect.value;
        dishSelect.innerHTML = '';
        const placeholder = document.createElement('option');
        placeholder.value = '';
        placeholder.textContent = 'Plat…';
        placeholder.selected = true;
        dishSelect.appendChild(placeholder);
        if (categoryId) {
            const category = this.menu.categories.find(c => c.id === categoryId);
            if (category) {
                category.dishes.forEach(dish => {
                    const opt = document.createElement('option');
                    opt.value = dish.id;
                    opt.textContent = dish.availability === 'unavailable' ? `${dish.name} (Indisponible)` : dish.name;
                    opt.disabled = dish.availability === 'unavailable';
                    dishSelect.appendChild(opt);
                });
            }
        }
        if ([...dishSelect.options].some(o => o.value === current)) dishSelect.value = current;
    }

    getSelectedCategory() {
        const id = this.dom.categorySelect ? this.dom.categorySelect.value : '';
        if (!id) return null;
        return this.menu.categories.find(c => c.id === id) || null;
    }

    getSelectedDish() {
        const category = this.getSelectedCategory();
        if (!category || !this.dom.dishSelect) return null;
        const dishId = this.dom.dishSelect.value;
        if (!dishId) return null;
        return category.dishes.find(d => d.id === dishId) || null;
    }
    
    sendAllOpenPads() {
        const openPads = this.pads.filter(p => p.status === 'open');
        if (openPads.length === 0) return;
        
        const oldStates = openPads.map(pad => ({ ...pad }));
        
        openPads.forEach(pad => {
            pad.status = 'sent';
            pad.sentAt = new Date().toISOString();
            pad.updatedAt = new Date().toISOString();
            
            // Broadcast to other devices
            this.broadcastMessage('pad-sent', pad.id);
            this.broadcastMessage('pad-updated', pad);
        });
        
        this.undoStack.push({
           type: 'sendAll',
           data: oldStates
       });
       
       this.saveToStorage();
       this.renderViews();
       this.updateSendAllButton();
       
       this.showToast(`${openPads.length} commande(s) envoyée(s) en cuisine`, 'success');
       this.playNotificationSound();
       this.showUndoNotification('Commandes envoyées');
       
       // Auto-print kitchen tickets if enabled
       const printEnabled = localStorage.getItem('cuisync-auto-print') === 'true';
       if (printEnabled) {
           openPads.forEach((pad, index) => {
               setTimeout(() => this.printKitchenTicket(pad.id), index * 1000);
           });
       }
   }
   
   sendPad(padId) {
       const pad = this.pads.find(p => p.id === padId);
       if (!pad) return;
       
       const oldState = { ...pad };
       
       pad.status = 'sent';
       pad.sentAt = new Date().toISOString();
       pad.updatedAt = new Date().toISOString();
       
       this.undoStack.push({
           type: 'sendPad',
           data: oldState
       });
       
       // Broadcast to other devices
       this.broadcastMessage('pad-sent', padId);
       this.broadcastMessage('pad-updated', pad);
       
       this.saveToStorage();
       this.renderViews();
       this.updateSendAllButton();
       
       this.showToast(`Table ${pad.table} envoyée en cuisine`, 'success');
       this.playNotificationSound();
       this.showUndoNotification('Commande envoyée');
       
       // Auto-print kitchen ticket if enabled
       const printEnabled = localStorage.getItem('cuisync-auto-print') === 'true';
       if (printEnabled) {
           setTimeout(() => this.printKitchenTicket(padId), 500);
       }
   }
   
   markPadReady(padId) {
       const pad = this.pads.find(p => p.id === padId);
       if (!pad) return;
       
       const oldState = { ...pad };
       
       pad.status = 'ready';
       pad.readyAt = new Date().toISOString();
       pad.updatedAt = new Date().toISOString();
       
       this.undoStack.push({
           type: 'markReady',
           data: oldState
       });
       
       // Broadcast to other devices
       this.broadcastMessage('pad-ready', padId);
       this.broadcastMessage('pad-updated', pad);
       
       this.saveToStorage();
       this.renderViews();
       
       this.showToast(`Table ${pad.table} prête à servir`, 'success');
       this.playNotificationSound();
       this.vibrate();
       this.showUndoNotification('Commande marquée prête');
   }
   
   deletePad(padId) {
       const padIndex = this.pads.findIndex(p => p.id === padId);
       if (padIndex === -1) return;
       
       const pad = this.pads[padIndex];
       const oldState = { ...pad, _index: padIndex };
       
       this.pads.splice(padIndex, 1);
       
       this.undoStack.push({
           type: 'deletePad',
           data: oldState
       });
       
       this.saveToStorage();
       this.renderViews();
       this.updateSendAllButton();
       
       this.showToast(`Table ${pad.table} supprimée`, 'info');
       this.showUndoNotification('Commande supprimée');
   }
   
   performUndo() {
       if (this.undoStack.length === 0) return;
       
       const action = this.undoStack.pop();
       
       switch (action.type) {
           case 'sendAll':
               action.data.forEach(oldPad => {
                   const pad = this.pads.find(p => p.id === oldPad.id);
                   if (pad) {
                       Object.assign(pad, oldPad);
                   }
               });
               break;
               
           case 'sendPad':
           case 'markReady':
               const pad = this.pads.find(p => p.id === action.data.id);
               if (pad) {
                   Object.assign(pad, action.data);
               }
               break;
               
           case 'markServed':
           case 'deletePad':
               const index = action.data._index !== undefined ? action.data._index : this.pads.length;
               delete action.data._index;
               this.pads.splice(index, 0, action.data);
               break;
       }
       
       this.saveToStorage();
       this.renderViews();
       this.updateSendAllButton();
       this.hideUndoNotification();
       
       this.showToast('Action annulée', 'info');
   }
   
   
   renderViews() {
       this.renderServerView();
       this.renderKitchenView(); // Always update for stats
       this.renderHostView();
   }

    renderMenuList() {
        if (!this.dom.menuList) return;
        let categories = this.menu.categories;
        if (!categories || categories.length === 0) {
            this.dom.menuList.innerHTML = '<div class="empty-state"><p>Aucune catégorie/plat enregistrés</p></div>';
            return;
        }
        
        // Apply search filter
        const search = this.dom.menuSearchInput ? this.dom.menuSearchInput.value.toLowerCase() : '';
        if (search) {
            categories = categories.map(cat => {
                const filteredDishes = (cat.dishes || []).filter(d => 
                    d.name.toLowerCase().includes(search) ||
                    (d.description && d.description.toLowerCase().includes(search)) ||
                    (d.allergens && d.allergens.toLowerCase().includes(search))
                );
                if (cat.name.toLowerCase().includes(search) || filteredDishes.length > 0) {
                    return { ...cat, dishes: filteredDishes };
                }
                return null;
            }).filter(Boolean);
        }
        
		const html = categories.map(cat => {
            const dishes = cat.dishes || [];
            const chips = dishes.length ? dishes.map(d => `
                <span class=\"menu-chip ${d.availability === 'unavailable' ? 'unavailable' : ''}\">
                    <span>${this.escapeHTML(d.name)} — ${Number(d.price).toFixed(2)} € ${d.availability === 'unavailable' ? '(Indisponible)' : ''}</span>
                    ${d.allergens ? `<span class=\"allergen-badge\" title=\"Allergènes: ${this.escapeHTML(d.allergens)}\">Allergènes</span>` : ''}
                    <button type=\"button\" class=\"btn btn-secondary btn-icon\" data-action=\"edit-dish\" data-category-id=\"${cat.id}\" data-dish-id=\"${d.id}\" title=\"Modifier le plat\">✎</button>
                    <button type=\"button\" class=\"btn btn-secondary btn-icon\" data-action=\"delete-dish\" data-category-id=\"${cat.id}\" data-dish-id=\"${d.id}\" title=\"Supprimer le plat\">✕</button>
                </span>
            `).join(' ') : '<span class=\"menu-chip\">(aucun plat)</span>';
			return `
				<div class=\"menu-category\">
					<h4>
						${this.escapeHTML(cat.name)}
                        <button type=\"button\" class=\"btn btn-secondary btn-icon\" data-action=\"edit-category\" data-category-id=\"${cat.id}\" title=\"Renommer la catégorie\">✎</button>
						<button type=\"button\" class=\"btn btn-secondary btn-icon\" data-action=\"delete-category\" data-category-id=\"${cat.id}\" title=\"Supprimer la catégorie\">✕</button>
					</h4>
					<div class=\"menu-dishes\">${chips}</div>
				</div>
			`;
        }).join('');
        this.dom.menuList.innerHTML = html;
		// Attach handlers
		if (this.dom.menuList) {
            this.dom.menuList.querySelectorAll('[data-action="delete-category"]').forEach(btn => {
                btn.addEventListener('click', (e) => {
                    const id = e.currentTarget && e.currentTarget.dataset ? e.currentTarget.dataset.categoryId : null;
                    if (id) this.deleteCategory(id);
                });
            });

            this.dom.menuList.querySelectorAll('[data-action="edit-category"]').forEach(btn => {
                btn.addEventListener('click', (e) => {
                    const id = e.currentTarget && e.currentTarget.dataset ? e.currentTarget.dataset.categoryId : null;
                    if (id) this.editCategory(id);
                });
            });

            this.dom.menuList.querySelectorAll('[data-action="edit-dish"]').forEach(btn => {
                btn.addEventListener('click', (e) => {
                    const { categoryId, dishId } = e.currentTarget.dataset || {};
                    if (categoryId && dishId) this.editDish(categoryId, dishId);
                });
            });

            this.dom.menuList.querySelectorAll('[data-action="delete-dish"]').forEach(btn => {
                btn.addEventListener('click', (e) => {
                    const { categoryId, dishId } = e.currentTarget.dataset || {};
                    if (categoryId && dishId) this.deleteDish(categoryId, dishId);
                });
            });
        }
    }
   
   renderServerView() {
       const container = this.dom.serverPadsContainer;
       let pads = this.pads.filter(p => p.status !== 'served');
       
       // Apply search filter
       const search = this.dom.serverSearchInput ? this.dom.serverSearchInput.value.toLowerCase() : '';
       if (search) {
           pads = pads.filter(p => 
               String(p.table).includes(search) ||
               (p.clientName && p.clientName.toLowerCase().includes(search)) ||
               (p.items && p.items.some(item => item.dish.toLowerCase().includes(search)))
           );
       }
       
       // Apply status filter
       const statusFilter = this.dom.serverStatusFilter ? this.dom.serverStatusFilter.value : 'all';
       if (statusFilter !== 'all') {
           pads = pads.filter(p => p.status === statusFilter);
       }
       
       // Update count
       this.updatePadsCount();
       
       if (pads.length === 0) {
           container.innerHTML = '<div class="empty-state"><p>Aucune commande en cours</p></div>';
           return;
       }
       
       // Sort by table number
       pads.sort((a, b) => a.table - b.table);
       
       container.innerHTML = pads.map(pad => this.renderPadHTML(pad, 'server')).join('');
       
       // Attach event listeners
       container.querySelectorAll('[data-action]').forEach(btn => {
           btn.addEventListener('click', (e) => {
               const action = e.target.dataset.action;
               const padId = e.target.dataset.padId;
               
               switch (action) {
                   case 'send':
                       this.sendPad(padId);
                       break;
                   case 'delete':
                       this.deletePad(padId);
                       break;
                   case 'edit':
                       this.editPad(padId);
                       break;
               }
           });
       });
   }
   
   renderKitchenView() {
       const container = this.dom.kitchenPadsContainer;
       let pads = this.pads.filter(p => p.status === 'sent' || p.status === 'ready');
       
       // Apply filter
       const filter = this.dom.kitchenFilterSelect ? this.dom.kitchenFilterSelect.value : 'all';
       if (filter === 'sent') {
           pads = pads.filter(p => p.status === 'sent');
       } else if (filter === 'ready') {
           pads = pads.filter(p => p.status === 'ready');
       }
       
       // Update stats
       const pending = this.pads.filter(p => p.status === 'sent').length;
       const ready = this.pads.filter(p => p.status === 'ready').length;
       if (this.dom.kitchenPendingCount) this.dom.kitchenPendingCount.textContent = pending;
       if (this.dom.kitchenReadyCount) this.dom.kitchenReadyCount.textContent = ready;
       
       // Calculate average time
       const sentPads = this.pads.filter(p => p.status === 'sent' && p.sentAt);
       if (sentPads.length > 0 && this.dom.kitchenAvgTime) {
           const avgTime = sentPads.reduce((sum, pad) => {
               const sentTime = new Date(pad.sentAt);
               const now = new Date();
               return sum + (now - sentTime);
           }, 0) / sentPads.length;
           const minutes = Math.floor(avgTime / 60000);
           this.dom.kitchenAvgTime.textContent = `${minutes} min`;
       } else if (this.dom.kitchenAvgTime) {
           this.dom.kitchenAvgTime.textContent = '—';
       }
       
       if (pads.length === 0) {
           container.innerHTML = '<div class="empty-state"><p>Aucune commande envoyée</p></div>';
           return;
       }
       
       // Sort by status (sent first, then ready) and time
       pads.sort((a, b) => {
           if (a.status === 'sent' && b.status === 'ready') return -1;
           if (a.status === 'ready' && b.status === 'sent') return 1;
           return new Date(a.sentAt || a.createdAt) - new Date(b.sentAt || b.createdAt);
       });
       
       container.innerHTML = pads.map(pad => this.renderPadHTML(pad, 'kitchen')).join('');
       
       // Attach event listeners
       container.querySelectorAll('[data-action]').forEach(btn => {
           btn.addEventListener('click', (e) => {
               const action = e.target.dataset.action;
               const padId = e.target.dataset.padId;
               
               switch (action) {
                   case 'ready':
                       this.markPadReady(padId);
                       break;
                   case 'served':
                       this.markPadServed(padId);
                       break;
                   case 'print-kitchen':
                       this.printKitchenTicket(padId);
                       break;
               }
           });
       });
   }
   
   toggleSound() {
       this.soundEnabled = !this.soundEnabled;
       if (this.dom.soundToggleBtn) {
           this.dom.soundToggleBtn.textContent = this.soundEnabled ? '🔊 Son activé' : '🔇 Son désactivé';
           this.dom.soundToggleBtn.setAttribute('aria-pressed', this.soundEnabled.toString());
       }
       this.saveToStorage();
   }
   
   // Servers Management
   addServer() {
       if (!this.dom.serverNameInput) return;
       const name = this.dom.serverNameInput.value.trim();
       if (!name) return;
       
       const server = {
           id: this.generateId(),
           name,
           active: true,
           createdAt: new Date().toISOString()
       };
       
       this.servers.push(server);
       this.saveToStorage();
       this.renderServers();
       this.dom.serverForm.reset();
       this.showToast('Serveur ajouté', 'success');
   }
   
   renderServers() {
       if (!this.dom.serversList) return;
       
       const html = this.servers.map(server => {
           const serverPads = this.pads.filter(p => p.serverId === server.id && p.status !== 'served');
           return `
               <div class="server-card">
                   <div class="server-header">
                       <h4>${this.escapeHTML(server.name)}</h4>
                       <span class="server-status ${server.active ? 'active' : 'inactive'}">${server.active ? 'Actif' : 'Inactif'}</span>
                   </div>
                   <div class="server-info">
                       <div>Commandes en cours: ${serverPads.length}</div>
                   </div>
                   <div class="server-actions">
                       <button class="btn btn-sm btn-secondary" onclick="window.cuisyncApp.toggleServer('${server.id}')">
                           ${server.active ? 'Désactiver' : 'Activer'}
                       </button>
                       <button class="btn btn-sm btn-danger" onclick="window.cuisyncApp.deleteServer('${server.id}')">Supprimer</button>
                   </div>
               </div>
           `;
       }).join('');
       
       this.dom.serversList.innerHTML = html || '<div class="empty-state"><p>Aucun serveur</p></div>';
   }
   
   toggleServer(serverId) {
       const server = this.servers.find(s => s.id === serverId);
       if (server) {
           server.active = !server.active;
           this.saveToStorage();
           this.renderServers();
       }
   }
   
   deleteServer(serverId) {
       if (confirm('Supprimer ce serveur ?')) {
           this.servers = this.servers.filter(s => s.id !== serverId);
           this.saveToStorage();
           this.renderServers();
           this.showToast('Serveur supprimé', 'info');
       }
   }

   renderHostView() {
       if (!this.dom.hostPadsContainer) return;
       const container = this.dom.hostPadsContainer;
       // Host sees all pads except 'served' and can act on open/sent/ready
       const pads = this.pads.filter(p => p.status !== 'served');
       if (pads.length === 0) {
           container.innerHTML = '<div class="empty-state"><p>Aucune commande</p></div>';
           return;
       }
       container.innerHTML = pads.map(pad => this.renderPadHTML(pad, 'host')).join('');
       container.querySelectorAll('[data-action]').forEach(btn => {
           btn.addEventListener('click', (e) => {
               const action = e.target.dataset.action;
               const padId = e.target.dataset.padId;
               switch (action) {
                   case 'send':
                       this.sendPad(padId);
                       break;
                   case 'ready':
                       this.markPadReady(padId);
                       break;
                   case 'served':
                       this.markPadServed(padId);
                       break;
                    case 'print':
                        this.printPadReceipt(padId);
                        break;
                    case 'pay':
                        this.openPaymentPanel(padId);
                        break;
                   case 'delete':
                       this.deletePad(padId);
                       break;
                   case 'edit':
                       this.editPad(padId);
                       break;
               }
           });
       });
   }
   
   renderPadHTML(pad, view) {
       const statusText = {
           'open': 'Ouvert',
           'sent': 'Envoyé',
           'ready': 'Prêt'
       };
       
       // Calculate elapsed time for kitchen view
       let elapsedTimeHTML = '';
       if (view === 'kitchen' && pad.sentAt) {
           const sentTime = new Date(pad.sentAt);
           const now = new Date();
           const elapsed = Math.floor((now - sentTime) / 60000); // minutes
           const hours = Math.floor(elapsed / 60);
           const minutes = elapsed % 60;
           const timeStr = hours > 0 ? `${hours}h${minutes}min` : `${minutes}min`;
           elapsedTimeHTML = `<div class="pad-timer ${elapsed > 30 ? 'warning' : ''}">⏱️ ${timeStr}</div>`;
       }
       
       const itemsHTML = pad.items.map(item => `
           <div class="pad-item ${item.allergen || (item.hasAllergens && item.hasAllergens) ? 'has-allergen' : ''}">
               <div class="item-details">
                   <h4>${this.escapeHTML(item.dish)}</h4>
                   <div class="item-meta">
                       <span>${item.course}</span>
                       ${item.category ? `<span>•</span><span>${this.escapeHTML(item.category)}</span>` : ''}
                       ${typeof item.price === 'number' ? `<span>•</span><span>${item.price.toFixed(2)} €</span>` : ''}
                   </div>
                   ${item.allergen || (item.hasAllergens && item.hasAllergens) ? '<div class="allergen-warning">⚠️ CONTIENT DES ALLERGÈNES</div>' : ''}
                   ${item.modifiers && item.modifiers.length > 0 ? `<div class="item-modifiers">${item.modifiers.map(m => `<span class="modifier-tag">${this.escapeHTML(m)}</span>`).join('')}</div>` : ''}
                   ${item.note ? `<div class="item-note">📝 ${this.escapeHTML(item.note)}</div>` : ''}
               </div>
               <div class="item-qty">${item.qty}</div>
           </div>
       `).join('');
       
       const padInfoHTML = `
           ${pad.covers ? `<div class="pad-info">Couverts: ${pad.covers}</div>` : ''}
           ${pad.clientName ? `<div class="pad-info">Client: ${this.escapeHTML(pad.clientName)}</div>` : ''}
           ${pad.tableNotes ? `<div class="pad-info pad-notes">Notes: ${this.escapeHTML(pad.tableNotes)}</div>` : ''}
           ${elapsedTimeHTML}
       `;
       
       let actionsHTML = '';
      if (view === 'server') {
           if (pad.status === 'open') {
               actionsHTML = `
                   <button class="btn btn-secondary btn-sm" data-action="send" data-pad-id="${pad.id}">
                       Envoyer
                   </button>
                   <button class="btn btn-danger btn-sm" data-action="delete" data-pad-id="${pad.id}">
                       Supprimer
                   </button>
               `;
           } else if (pad.status === 'ready') {
               actionsHTML = `
                   <button class="btn btn-primary btn-sm" data-action="served" data-pad-id="${pad.id}">
                       Marquer servi
                   </button>
               `;
           }
      } else if (view === 'kitchen') {
           if (pad.status === 'sent') {
               actionsHTML = `
                   <button class="btn btn-outline btn-sm" data-action="print-kitchen" data-pad-id="${pad.id}">
                       🖨️ Imprimer
                   </button>
                   <button class="btn btn-primary btn-sm" data-action="ready" data-pad-id="${pad.id}">
                       Marquer prêt
                   </button>
               `;
           }
      } else if (view === 'host') {
          if (pad.status === 'open') {
              actionsHTML = `
                  <button class="btn btn-secondary btn-sm" data-action="send" data-pad-id="${pad.id}">Envoyer</button>
                  <button class="btn btn-outline btn-sm" data-action="edit" data-pad-id="${pad.id}">Modifier</button>
                  <button class="btn btn-danger btn-sm" data-action="delete" data-pad-id="${pad.id}">Supprimer</button>
              `;
          } else if (pad.status === 'sent') {
              actionsHTML = `
                  <button class="btn btn-primary btn-sm" data-action="ready" data-pad-id="${pad.id}">Marquer prêt</button>
              `;
          } else if (pad.status === 'ready') {
              actionsHTML = `
                  <button class="btn btn-outline btn-sm" data-action="print" data-pad-id="${pad.id}">Imprimer ticket</button>
                  <button class="btn btn-primary btn-sm" data-action="pay" data-pad-id="${pad.id}">Encaisser</button>
              `;
          }
       }
       
      const padTotal = this.getPadTotal(pad);
      return `
          <div class="pad status-${pad.status}">
              <div class="pad-header">
                  <h3>Table ${pad.table}</h3>
                  <span class="pad-status ${pad.status}">${statusText[pad.status]}</span>
              </div>
              ${padInfoHTML}
              <div class="pad-items">
                  ${itemsHTML}
              </div>
              ${padTotal > 0 ? `<div class="pad-total">Total: <strong>${padTotal.toFixed(2)} €</strong></div>` : ''}
              ${actionsHTML ? `<div class="pad-actions">${actionsHTML}</div>` : ''}
          </div>
      `;
   }

    getPadTotal(pad) {
        if (!pad || !Array.isArray(pad.items)) return 0;
        return pad.items.reduce((sum, item) => {
            const price = typeof item.price === 'number' && !isNaN(item.price) ? item.price : 0;
            const qty = typeof item.qty === 'number' && !isNaN(item.qty) && item.qty > 0 ? item.qty : 0;
            return sum + (price * qty);
        }, 0);
    }

    buildReceiptHTML(pad) {
        if (!pad || !pad.items || !Array.isArray(pad.items)) {
            return '<html><body><p>Erreur: Commande invalide</p></body></html>';
        }
        
        const restaurantName = this.restaurantSettings.name || 'Restaurant';
        const restaurantAddress = this.restaurantSettings.address || '';
        const restaurantPhone = this.restaurantSettings.phone || '';
        const created = this.formatDate(pad.createdAt);
        const now = this.formatDate(new Date().toISOString());
        
        const lines = pad.items.map(item => {
            const unit = typeof item.price === 'number' && !isNaN(item.price) ? `${item.price.toFixed(2)} €` : '-';
            const qty = typeof item.qty === 'number' && !isNaN(item.qty) && item.qty > 0 ? item.qty : 0;
            const lineTotal = typeof item.price === 'number' && !isNaN(item.price) ? (item.price * qty).toFixed(2) + ' €' : '-';
            return `
                <tr>
                    <td>${qty} ×</td>
                    <td>${this.escapeHTML(item.dish)}</td>
                    <td class="num">${unit}</td>
                    <td class="num">${lineTotal}</td>
                </tr>
            `;
        }).join('');
        
        const subtotal = this.getPadTotal(pad);
        const taxRate = this.posSettings ? (this.posSettings.taxRatePct || 0) : 0;
        const tax = subtotal * taxRate / 100;
        const total = subtotal + tax;

        return `
            <html>
            <head>
                <meta charset="utf-8" />
                <title>Ticket Table ${pad.table}</title>
                <style>
                    body { font-family: -apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Arial,sans-serif; margin: 0; padding: 16px; }
                    .ticket { width: 280px; margin: 0 auto; }
                    .restaurant-name { font-size: 18px; font-weight: 700; text-align: center; margin-bottom: 8px; }
                    .restaurant-info { font-size: 11px; text-align: center; margin-bottom: 12px; color: #666; }
                    h1 { font-size: 16px; text-align: center; margin: 8px 0; }
                    .meta { font-size: 12px; text-align: center; margin-bottom: 8px; }
                    table { width: 100%; border-collapse: collapse; font-size: 12px; margin-bottom: 8px; }
                    td { padding: 4px 0; }
                    .num { text-align: right; white-space: nowrap; }
                    .subtotal { border-top: 1px solid #ddd; padding-top: 8px; margin-top: 8px; }
                    .tax { font-size: 11px; color: #666; }
                    .total { border-top: 2px solid #000; margin-top: 8px; padding-top: 8px; font-weight: 700; font-size: 14px; }
                    .footer { text-align: center; font-size: 11px; margin-top: 16px; color: #666; }
                    @media print { body { margin: 0; padding: 0; } }
                </style>
            </head>
            <body>
                <div class="ticket">
                    <div class="restaurant-name">${this.escapeHTML(restaurantName)}</div>
                    ${restaurantAddress ? `<div class="restaurant-info">${this.escapeHTML(restaurantAddress)}</div>` : ''}
                    ${restaurantPhone ? `<div class="restaurant-info">Tél: ${this.escapeHTML(restaurantPhone)}</div>` : ''}
                    <div class="meta">
                        Table ${pad.table}${pad.covers ? ` — ${pad.covers} couverts` : ''}<br/>
                        ${pad.clientName ? `Client: ${this.escapeHTML(pad.clientName)}<br/>` : ''}
                        Créé: ${created}<br/>
                        Imprimé: ${now}
                    </div>
                    <table>
                        ${lines}
                    </table>
                    <div class="subtotal">
                        Sous-total: <span style="float:right">${subtotal.toFixed(2)} €</span>
                    </div>
                    ${taxRate > 0 ? `<div class="tax">TVA (${taxRate}%): <span style="float:right">${tax.toFixed(2)} €</span></div>` : ''}
                    <div class="total">
                        Total: <span style="float:right">${total.toFixed(2)} €</span>
                    </div>
                    ${pad.tableNotes ? `<div class="footer" style="margin-top: 8px; text-align: left; font-size: 10px;">Notes: ${this.escapeHTML(pad.tableNotes)}</div>` : ''}
                    <div class="footer">Merci de votre visite !</div>
                </div>
                <script>window.onload = function(){ window.print(); setTimeout(function(){ window.close(); }, 300); }<\/script>
            </body>
            </html>
        `;
    }

    printPadReceipt(padId) {
        const pad = this.pads.find(p => p.id === padId);
        if (!pad) return;
        const win = window.open('', 'PRINT', 'height=600,width=400');
        if (!win) {
            this.showToast("Impossible d'ouvrir la fenêtre d'impression", 'error');
            return;
        }
        win.document.open();
        win.document.write(this.buildReceiptHTML(pad));
        win.document.close();
    }
    
    printKitchenTicket(padId) {
        const pad = this.pads.find(p => p.id === padId);
        if (!pad) return;
        
        const restaurantName = this.restaurantSettings.name || 'RESTAURANT';
        const now = new Date();
        const timeStr = now.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
        const dateStr = now.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' });
        
        // Group items by course
        const itemsByCourse = {};
        pad.items.forEach(item => {
            const course = item.course || 'plat';
            if (!itemsByCourse[course]) {
                itemsByCourse[course] = [];
            }
            itemsByCourse[course].push(item);
        });
        
        let itemsHTML = '';
        Object.keys(itemsByCourse).forEach(course => {
            const courseLabel = course === 'entrée' ? 'ENTRÉE' : course === 'dessert' ? 'DESSERT' : course === 'boisson' ? 'BOISSON' : 'PLAT';
            itemsHTML += `<div class="course-section"><div class="course-label">${courseLabel}</div>`;
            itemsByCourse[course].forEach(item => {
                const allergenBadge = item.allergen ? '<span class="allergen-badge">⚠️ ALLERGÈNE</span>' : '';
                const modifierBadges = item.modifiers && item.modifiers.length > 0 
                    ? item.modifiers.map(m => `<span class="modifier-badge">${m.toUpperCase()}</span>`).join('')
                    : '';
                const note = item.note ? `<div class="item-note">⚠️ ${this.escapeHTML(item.note)}</div>` : '';
                itemsHTML += `
                    <div class="kitchen-item">
                        <div class="item-header">
                            <span class="item-qty">${item.qty}x</span>
                            <span class="item-name">${this.escapeHTML(item.dish)}</span>
                        </div>
                        ${allergenBadge}
                        ${modifierBadges}
                        ${note}
                    </div>
                `;
            });
            itemsHTML += '</div>';
        });
        
        const html = `
            <!DOCTYPE html>
            <html>
            <head>
                <meta charset="utf-8">
                <title>Ticket Cuisine - Table ${pad.table}</title>
                <style>
                    @page { size: 80mm auto; margin: 0; }
                    * { margin: 0; padding: 0; box-sizing: border-box; }
                    body { 
                        font-family: 'Courier New', monospace;
                        font-size: 12px;
                        padding: 8px;
                        width: 72mm;
                    }
                    .header {
                        text-align: center;
                        border-bottom: 2px solid #000;
                        padding-bottom: 8px;
                        margin-bottom: 8px;
                    }
                    .restaurant-name {
                        font-size: 16px;
                        font-weight: bold;
                        margin-bottom: 4px;
                    }
                    .ticket-info {
                        font-size: 10px;
                        margin-top: 4px;
                    }
                    .table-info {
                        font-size: 14px;
                        font-weight: bold;
                        text-align: center;
                        margin: 8px 0;
                        padding: 4px;
                        background: #f0f0f0;
                    }
                    .course-section {
                        margin-bottom: 12px;
                    }
                    .course-label {
                        font-weight: bold;
                        font-size: 11px;
                        text-transform: uppercase;
                        border-bottom: 1px solid #000;
                        margin-bottom: 4px;
                        padding-bottom: 2px;
                    }
                    .kitchen-item {
                        margin-bottom: 6px;
                        padding: 4px 0;
                    }
                    .item-header {
                        display: flex;
                        align-items: center;
                        gap: 4px;
                    }
                    .item-qty {
                        font-weight: bold;
                        font-size: 14px;
                        min-width: 20px;
                    }
                    .item-name {
                        font-weight: bold;
                        flex: 1;
                    }
                    .allergen-badge {
                        display: inline-block;
                        background: #ff0000;
                        color: #fff;
                        font-weight: bold;
                        font-size: 9px;
                        padding: 2px 4px;
                        margin-top: 2px;
                    }
                    .modifier-badge {
                        display: inline-block;
                        background: #ffa500;
                        color: #000;
                        font-weight: bold;
                        font-size: 9px;
                        padding: 2px 4px;
                        margin: 2px 2px 0 0;
                    }
                    .item-note {
                        font-size: 10px;
                        font-style: italic;
                        margin-top: 2px;
                        padding-left: 24px;
                        color: #d00;
                    }
                    .table-notes {
                        margin-top: 8px;
                        padding: 4px;
                        background: #fff3cd;
                        font-size: 10px;
                        border: 1px dashed #000;
                    }
                    .footer {
                        text-align: center;
                        font-size: 9px;
                        margin-top: 8px;
                        padding-top: 8px;
                        border-top: 1px solid #000;
                    }
                    @media print {
                        body { margin: 0; padding: 8px; }
                    }
                </style>
            </head>
            <body>
                <div class="header">
                    <div class="restaurant-name">${this.escapeHTML(restaurantName)}</div>
                    <div class="ticket-info">CUISINE</div>
                    <div class="ticket-info">${dateStr} ${timeStr}</div>
                </div>
                <div class="table-info">
                    TABLE ${pad.table}${pad.covers ? ` - ${pad.covers} COUVERTS` : ''}
                </div>
                ${pad.clientName ? `<div style="text-align: center; font-size: 10px; margin-bottom: 8px;">Client: ${this.escapeHTML(pad.clientName)}</div>` : ''}
                ${itemsHTML}
                ${pad.tableNotes ? `<div class="table-notes"><strong>Notes table:</strong> ${this.escapeHTML(pad.tableNotes)}</div>` : ''}
                <div class="footer">
                    Ticket généré le ${dateStr} à ${timeStr}
                </div>
                <script>
                    window.onload = function() {
                        window.print();
                        setTimeout(function() { window.close(); }, 500);
                    };
                </script>
            </body>
            </html>
        `;
        
        const win = window.open('', 'KITCHEN_TICKET', 'height=600,width=300');
        if (!win) {
            this.showToast("Impossible d'ouvrir la fenêtre d'impression", 'error');
            return;
        }
        win.document.open();
        win.document.write(html);
        win.document.close();
    }

    savePOSSettings() {
        const taxRateInput = document.getElementById('pos-tva');
        const currencyInput = document.getElementById('pos-currency');
        const tipInput = document.getElementById('pos-default-tip');
        const printAfterPayInput = document.getElementById('pos-print-after-pay');
        this.posSettings = {
            taxRatePct: Math.max(0, parseFloat(taxRateInput && taxRateInput.value ? taxRateInput.value : '0') || 0),
            currency: currencyInput && currencyInput.value ? currencyInput.value : '€',
            defaultTipPct: Math.max(0, parseFloat(tipInput && tipInput.value ? tipInput.value : '0') || 0),
            printAfterPay: !!(printAfterPayInput && printAfterPayInput.checked)
        };
        this.saveToStorage();
        this.showToast('Paramètres enregistrés', 'success');
    }

    recordSale(sale) {
        if (!this.sales) this.sales = [];
        this.sales.push(sale);
        this.saveToStorage();
    }

    exportSalesCSV() {
        if (!this.sales || this.sales.length === 0) {
            this.showToast('Aucune vente à exporter', 'info');
            return;
        }
        const headers = ['Date/Heure','Table','Sous-total','Remise','TVA','Pourboire','Total','Méthode'];
        const rows = [headers];
        this.sales.forEach(s => {
            rows.push([
                this.formatDate(s.createdAt),
                s.table,
                s.subtotal.toFixed(2),
                s.discount.toFixed(2),
                s.tax.toFixed(2),
                s.tip.toFixed(2),
                s.total.toFixed(2),
                s.method
            ]);
        });
        const csvContent = rows.map(r => r.map(f => `"${String(f).replace(/"/g,'""')}"`).join(',')).join('\n');
        const timestamp = new Date().toISOString().slice(0,19).replace(/[:.]/g,'-');
        const filename = `cuisync-ventes-${timestamp}.csv`;
        this.downloadFile(csvContent, filename, 'text/csv');
        this.showToast('Export des ventes téléchargé', 'success');
    }


    openPaymentPanel(padId) {
        this.currentPaymentPadId = padId;
        const pad = this.pads.find(p => p.id === padId);
        if (!pad || !this.dom.paymentPanel) return;
        
        // Initialize partialPayments if not exists
        if (!pad.partialPayments) pad.partialPayments = [];
        
        const subtotal = this.getPadTotal(pad);
        const taxRate = this.posSettings ? (this.posSettings.taxRatePct || 0) : 0;
        const totalDue = subtotal + (subtotal * taxRate / 100);
        const paidAmount = this.getPaidAmount(pad);
        const remaining = Math.max(0, totalDue - paidAmount);
        
        // Render pad summary
        if (this.dom.paymentPadSummary) {
            const itemsHTML = (pad.items || []).map(item => {
                const itemTotal = (typeof item.price === 'number' ? item.price : 0) * (typeof item.qty === 'number' ? item.qty : 0);
                return `
                    <div class="payment-item-summary">
                        <span>${item.qty}x ${this.escapeHTML(item.dish)}</span>
                        <span>${itemTotal.toFixed(2)} €</span>
                    </div>
                `;
            }).join('');
            this.dom.paymentPadSummary.innerHTML = `
                <div class="payment-summary-header">Table ${pad.table}${pad.covers ? ` — ${pad.covers} couverts` : ''}</div>
                <div class="payment-items-summary">${itemsHTML}</div>
            `;
        }
        
        // Render existing payments
        this.renderExistingPayments(pad);
        
        // Update totals
        if (this.dom.paymentTotalDue) this.dom.paymentTotalDue.textContent = `${totalDue.toFixed(2)} ${this.posSettings?.currency || '€'}`;
        if (this.dom.paymentPaid) this.dom.paymentPaid.textContent = `${paidAmount.toFixed(2)} ${this.posSettings?.currency || '€'}`;
        if (this.dom.paymentRemaining) {
            this.dom.paymentRemaining.textContent = `${remaining.toFixed(2)} ${this.posSettings?.currency || '€'}`;
            this.dom.paymentRemaining.className = remaining > 0 ? 'payment-remaining' : 'payment-remaining payment-paid-full';
        }
        
        // Reset form
        if (this.dom.paymentMethod) this.dom.paymentMethod.value = 'cash';
        if (this.dom.paymentReceived) this.dom.paymentReceived.value = '';
        if (this.dom.paymentChange) this.dom.paymentChange.textContent = '0,00 €';
        if (this.dom.paymentDiscount) this.dom.paymentDiscount.value = '';
        if (this.dom.paymentTip) this.dom.paymentTip.value = '';
        if (this.dom.paymentSplitAmount) this.dom.paymentSplitAmount.value = '';
        if (this.dom.paymentSplitPeople) this.dom.paymentSplitPeople.value = '';
        
        // Set default split amount to remaining
        if (this.dom.paymentSplitAmount && remaining > 0) {
            this.dom.paymentSplitAmount.value = remaining.toFixed(2);
        }
        
        this.updatePaymentUI();
        this.dom.paymentPanel.classList.remove('hidden');
        
        // Focus on split amount
        if (this.dom.paymentSplitAmount) {
            setTimeout(() => this.dom.paymentSplitAmount.focus(), 100);
        }
    }
    
    getPaidAmount(pad) {
        if (!pad.partialPayments || !Array.isArray(pad.partialPayments)) return 0;
        return pad.partialPayments.reduce((sum, payment) => sum + (payment.amount || 0), 0);
    }
    
    renderExistingPayments(pad) {
        if (!this.dom.paymentExistingPayments) return;
        
        if (!pad.partialPayments || pad.partialPayments.length === 0) {
            this.dom.paymentExistingPayments.innerHTML = '';
            return;
        }
        
        const paymentsHTML = pad.partialPayments.map((payment, index) => {
            const methodNames = {
                cash: 'Espèces',
                card: 'Carte bancaire',
                cheque: 'Chèque',
                voucher: 'Bon d\'achat',
                other: 'Autre'
            };
            return `
                <div class="payment-existing-item">
                    <div class="payment-existing-info">
                        <span class="payment-existing-amount">${payment.amount.toFixed(2)} €</span>
                        <span class="payment-existing-method">${methodNames[payment.method] || 'Autre'}</span>
                        ${payment.people ? `<span class="payment-existing-people">(${payment.people} personne${payment.people > 1 ? 's' : ''})</span>` : ''}
                        <span class="payment-existing-time">${this.formatTime(payment.createdAt)}</span>
                    </div>
                    <button class="btn btn-icon btn-sm" data-action="remove-payment" data-index="${index}" title="Supprimer">✕</button>
                </div>
            `;
        }).join('');
        
        this.dom.paymentExistingPayments.innerHTML = `
            <div class="payment-existing-header">Paiements effectués</div>
            <div class="payment-existing-list">${paymentsHTML}</div>
        `;
        
        // Attach remove handlers
        this.dom.paymentExistingPayments.querySelectorAll('[data-action="remove-payment"]').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const index = parseInt(e.target.dataset.index);
                this.removePartialPayment(pad.id, index);
            });
        });
    }
    
    formatTime(dateString) {
        const date = new Date(dateString);
        return date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
    }
    
    removePartialPayment(padId, index) {
        const pad = this.pads.find(p => p.id === padId);
        if (!pad || !pad.partialPayments || index < 0 || index >= pad.partialPayments.length) return;
        
        if (confirm('Supprimer ce paiement ?')) {
            pad.partialPayments.splice(index, 1);
            pad.updatedAt = new Date().toISOString();
            this.saveToStorage();
            this.openPaymentPanel(padId); // Refresh panel
            this.showToast('Paiement supprimé', 'info');
        }
    }
    
    splitByPerson() {
        const pad = this.pads.find(p => p.id === this.currentPaymentPadId);
        if (!pad || !this.dom.paymentSplitAmount) return;
        
        const totalDue = this.getPadTotal(pad) + (this.getPadTotal(pad) * (this.posSettings?.taxRatePct || 0) / 100);
        const paidAmount = this.getPaidAmount(pad);
        const remaining = Math.max(0, totalDue - paidAmount);
        
        const people = pad.covers || 1;
        const perPerson = remaining / people;
        
        if (this.dom.paymentSplitAmount) {
            this.dom.paymentSplitAmount.value = perPerson.toFixed(2);
        }
        if (this.dom.paymentSplitPeople) {
            this.dom.paymentSplitPeople.value = '1';
        }
        
        this.updatePaymentChange();
    }
    
    splitByCovers() {
        const pad = this.pads.find(p => p.id === this.currentPaymentPadId);
        if (!pad || !this.dom.paymentSplitAmount) return;
        
        const totalDue = this.getPadTotal(pad) + (this.getPadTotal(pad) * (this.posSettings?.taxRatePct || 0) / 100);
        const paidAmount = this.getPaidAmount(pad);
        const remaining = Math.max(0, totalDue - paidAmount);
        
        const covers = pad.covers || 1;
        const perCover = remaining / covers;
        
        if (this.dom.paymentSplitAmount) {
            this.dom.paymentSplitAmount.value = perCover.toFixed(2);
        }
        if (this.dom.paymentSplitPeople) {
            this.dom.paymentSplitPeople.value = String(covers);
        }
        
        this.updatePaymentChange();
    }
    
    splitCustom() {
        if (this.dom.paymentSplitAmount) {
            this.dom.paymentSplitAmount.focus();
        }
    }

    closePaymentPanel() {
        if (!this.dom.paymentPanel) return;
        this.dom.paymentPanel.classList.add('hidden');
        this.currentPaymentPadId = null;
    }

    updatePaymentUI() {
        if (!this.dom.paymentMethod || !this.dom.paymentReceivedRow) return;
        const isCash = this.dom.paymentMethod.value === 'cash';
        this.dom.paymentReceivedRow.style.display = isCash ? 'grid' : 'none';
        this.updatePaymentChange();
    }

   updatePaymentChange() {
       if (!this.currentPaymentPadId || !this.dom.paymentChange) return;
       const pad = this.pads.find(p => p.id === this.currentPaymentPadId);
       if (!pad) {
           this.dom.paymentChange.textContent = '0,00 €';
           return;
       }
       
       // Get the amount for this payment
       const splitAmountStr = this.dom.paymentSplitAmount && this.dom.paymentSplitAmount.value ? this.dom.paymentSplitAmount.value : '0';
       const splitAmount = parseFloat(splitAmountStr) || 0;
       
       if (!this.dom.paymentMethod) return;
       if (this.dom.paymentMethod.value !== 'cash') {
           this.dom.paymentChange.textContent = '0,00 €';
           return;
       }
       const receivedStr = this.dom.paymentReceived && this.dom.paymentReceived.value ? this.dom.paymentReceived.value : '0';
       const received = parseFloat(receivedStr) || 0;
       const change = Math.max(0, received) - splitAmount;
       const display = change >= 0 ? `${change.toFixed(2)} ${this.posSettings?.currency || '€'}` : '—';
       this.dom.paymentChange.textContent = display;
   }

   updateSendAllButton() {
       const openPads = this.pads.filter(p => p.status === 'open');
       this.dom.sendAllBtn.disabled = openPads.length === 0;
       this.dom.sendAllBtn.textContent = `Envoyer les commandes ouvertes (${openPads.length})`;
   }
   
   exportToCSV() {
       if (this.pads.length === 0) {
           this.showToast('Aucune données à exporter', 'info');
           return;
       }
       
       const headers = ['Table', 'Statut', 'Catégorie', 'Plat', 'Quantité', 'Prix', 'Service', 'Note', 'Créé le', 'Envoyé le', 'Prêt le'];
       const rows = [headers];
       
       this.pads.forEach(pad => {
           pad.items.forEach(item => {
               rows.push([
                   pad.table,
                   pad.status,
                   item.category || '',
                   item.dish,
                   item.qty,
                   typeof item.price === 'number' ? item.price.toFixed(2) : '',
                   item.course,
                   item.note || '',
                   this.formatDate(pad.createdAt),
                   pad.sentAt ? this.formatDate(pad.sentAt) : '',
                   pad.readyAt ? this.formatDate(pad.readyAt) : ''
               ]);
           });
       });
       
       const csvContent = rows.map(row => 
           row.map(field => `"${String(field).replace(/"/g, '""')}"`).join(',')
       ).join('\n');
       
       const timestamp = new Date().toISOString().slice(0, 19).replace(/[:.]/g, '-');
       const filename = `cuisync-export-${timestamp}.csv`;
       
       this.downloadFile(csvContent, filename, 'text/csv');
       this.showToast('Export CSV téléchargé', 'success');
   }
   
   downloadFile(content, filename, mimeType) {
       const blob = new Blob([content], { type: mimeType });
       const url = URL.createObjectURL(blob);
       const link = document.createElement('a');
       link.href = url;
       link.download = filename;
       document.body.appendChild(link);
       link.click();
       document.body.removeChild(link);
       URL.revokeObjectURL(url);
   }
   
   showToast(message, type = 'info') {
       const toast = document.createElement('div');
       toast.className = `toast ${type}`;
       toast.textContent = message;
       
       this.dom.toastContainer.appendChild(toast);
       
       // Trigger animation
       setTimeout(() => toast.classList.add('show'), 100);
       
       // Remove after 3 seconds
       setTimeout(() => {
           toast.classList.remove('show');
           setTimeout(() => {
               if (toast.parentNode) {
                   toast.parentNode.removeChild(toast);
               }
           }, 300);
       }, 3000);
   }
   
   showUndoNotification(message) {
       this.dom.undoMessage.textContent = message;
       this.dom.undoNotification.classList.remove('hidden');
       
       // Hide after 5 seconds
       setTimeout(() => {
           this.hideUndoNotification();
       }, 5000);
   }
   
   hideUndoNotification() {
       this.dom.undoNotification.classList.add('hidden');
   }
   
   playNotificationSound() {
       if (!this.soundEnabled) return;
       
       try {
           const audioContext = new (window.AudioContext || window.webkitAudioContext)();
           const oscillator = audioContext.createOscillator();
           const gainNode = audioContext.createGain();
           
           oscillator.connect(gainNode);
           gainNode.connect(audioContext.destination);
           
           oscillator.frequency.setValueAtTime(800, audioContext.currentTime);
           gainNode.gain.setValueAtTime(0.1, audioContext.currentTime);
           gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.2);
           
           oscillator.start(audioContext.currentTime);
           oscillator.stop(audioContext.currentTime + 0.2);
       } catch (error) {
           // Fallback - beep not available
           console.warn('Audio notification not available');
       }
   }
   
   vibrate() {
       if (navigator.vibrate) {
           navigator.vibrate([100, 30, 100]);
       }
   }
   
   generateId() {
       return Date.now().toString(36) + Math.random().toString(36).substr(2);
   }
   
   escapeHTML(text) {
       const div = document.createElement('div');
       div.textContent = text;
       return div.innerHTML;
   }
   
   formatDate(dateString) {
       if (!dateString) return '—';
       try {
           const date = new Date(dateString);
           if (isNaN(date.getTime())) return '—';
           return date.toLocaleString('fr-FR', {
               day: '2-digit',
               month: '2-digit',
               year: 'numeric',
               hour: '2-digit',
               minute: '2-digit'
           });
       } catch (error) {
           console.error('Error formatting date:', error);
           return '—';
       }
   }
   
   // Tables Management
   updateTableStatus(tableNum, status) {
       const table = this.tables.find(t => t.number === tableNum);
       if (table) {
           table.status = status;
           this.saveToStorage();
           this.renderTablesGrid();
       }
   }
   
   addTable() {
       const newTableNum = this.tables.length > 0 ? Math.max(...this.tables.map(t => t.number)) + 1 : 1;
       this.tables.push({
           id: this.generateId(),
           number: newTableNum,
           status: 'free',
           capacity: 4,
           notes: ''
       });
       this.saveToStorage();
       this.renderTablesGrid();
       this.showToast(`Table ${newTableNum} ajoutée`, 'success');
   }
   
   saveTablesConfig() {
       if (this.dom.maxTablesInput && this.dom.maxTablesInput.value) {
           const max = parseInt(this.dom.maxTablesInput.value);
           if (max > 0 && max <= 200) {
               this.maxTables = max;
               // Ajuster les tables si nécessaire
               while (this.tables.length < max) {
                   this.addTable();
               }
               while (this.tables.length > max) {
                   this.tables.pop();
               }
               this.saveToStorage();
               this.renderTablesGrid();
               this.showToast('Configuration enregistrée', 'success');
           }
       }
   }
   
   renderTablesGrid() {
       if (!this.dom.tablesGrid) return;
       const html = this.tables.map(table => {
           const pad = this.pads.find(p => p.table === table.number && p.status !== 'served');
           const statusClass = `table-status-${table.status}`;
           const statusText = {
               'free': 'Libre',
               'occupied': 'Occupée',
               'reserved': 'Réservée',
               'cleaning': 'Nettoyage'
           };
           return `
               <div class="table-card ${statusClass}" data-table-num="${table.number}">
                   <div class="table-header">
                       <h4>Table ${table.number}</h4>
                       <span class="table-status-badge ${table.status}">${statusText[table.status] || table.status}</span>
                   </div>
                   <div class="table-info">
                       <div>Capacité: ${table.capacity}</div>
                       ${pad ? `<div>Client: ${pad.clientName || '—'}</div>` : ''}
                       ${pad && pad.covers ? `<div>Couverts: ${pad.covers}</div>` : ''}
                       ${table.notes ? `<div class="table-notes">${this.escapeHTML(table.notes)}</div>` : ''}
                   </div>
                   <div class="table-actions">
                       <button class="btn btn-sm btn-secondary" onclick="window.cuisyncApp.editTable(${table.number})">Modifier</button>
                       <button class="btn btn-sm btn-danger delete-table-btn" data-table-num="${table.number}" title="Supprimer la table">🗑️</button>
                       <select class="table-status-select" onchange="window.cuisyncApp.changeTableStatus(${table.number}, this.value)">
                           <option value="free" ${table.status === 'free' ? 'selected' : ''}>Libre</option>
                           <option value="occupied" ${table.status === 'occupied' ? 'selected' : ''}>Occupée</option>
                           <option value="reserved" ${table.status === 'reserved' ? 'selected' : ''}>Réservée</option>
                           <option value="cleaning" ${table.status === 'cleaning' ? 'selected' : ''}>Nettoyage</option>
                       </select>
                   </div>
               </div>
           `;
       }).join('');
       this.dom.tablesGrid.innerHTML = html || '<div class="empty-state"><p>Aucune table configurée</p></div>';
       
       // Attacher les event listeners pour les boutons de suppression
       const deleteButtons = this.dom.tablesGrid.querySelectorAll('.delete-table-btn');
       deleteButtons.forEach(btn => {
           btn.addEventListener('click', (e) => {
               e.preventDefault();
               e.stopPropagation();
               const tableNum = parseInt(btn.dataset.tableNum);
               if (!isNaN(tableNum)) {
                   this.deleteTable(tableNum);
               }
           });
       });
   }
   
   editTable(tableNum) {
       const table = this.tables.find(t => t.number === tableNum);
       if (!table) return;
       const capacity = prompt('Capacité de la table:', table.capacity);
       if (capacity && !isNaN(capacity) && parseInt(capacity) > 0) {
           table.capacity = parseInt(capacity);
       }
       const notes = prompt('Notes sur la table:', table.notes);
       if (notes !== null) {
           table.notes = notes;
       }
       this.saveToStorage();
       this.renderTablesGrid();
       this.renderFloorPlan();
   }
   
   deleteTable(tableNum) {
       // Convertir en nombre si c'est une string
       const num = typeof tableNum === 'string' ? parseInt(tableNum) : tableNum;
       const table = this.tables.find(t => t.number === num);
       if (!table) {
           console.error('Table non trouvée:', num);
           this.showToast('Table non trouvée', 'error');
           return;
       }
       
       // Vérifier si la table est occupée
       const pad = this.pads.find(p => p.table === num && p.status !== 'served');
       if (pad) {
           this.showToast('Impossible de supprimer une table occupée', 'error');
           return;
       }
       
       // Vérifier s'il y a des réservations pour cette table
       const hasReservations = this.reservations.some(r => 
           r.tableNum === num && 
           r.status !== 'cancelled' && 
           r.status !== 'completed'
       );
       
       if (hasReservations) {
           if (!confirm(`La table ${num} a des réservations actives. Voulez-vous vraiment la supprimer ?`)) {
               return;
           }
       } else {
           if (!confirm(`Êtes-vous sûr de vouloir supprimer la table ${num} ?`)) {
               return;
           }
       }
       
       // Supprimer la table
       this.tables = this.tables.filter(t => t.number !== num);
       this.saveToStorage();
       this.renderTablesGrid();
       if (this.dom.floorPlan) {
           this.renderFloorPlan();
       }
       if (this.dom.mapView && typeof this.renderMapView === 'function') {
           this.renderMapView();
       }
       this.showToast(`Table ${num} supprimée`, 'success');
   }
   
   renderMapView() {
       if (!this.dom.restaurantMap) return;
       
       // Créer une visualisation 2D interactive avec drag & drop
       const html = `
           <div class="map-2d-container">
               <div class="map-2d-canvas" id="map-2d-canvas">
                   ${this.tables.map(table => {
                       const pad = this.pads.find(p => p.table === table.number && p.status !== 'served');
                       const x = table.x !== undefined ? table.x : Math.random() * 70 + 10; // Position par défaut si non définie
                       const y = table.y !== undefined ? table.y : Math.random() * 70 + 10;
                       const statusClass = table.status || 'free';
                       
                       return `
                           <div class="map-2d-table ${statusClass}" 
                                data-table-num="${table.number}"
                                style="left: ${x}%; top: ${y}%;">
                               <div class="map-2d-table-number">${table.number}</div>
                               <div class="map-2d-table-capacity">${table.capacity}</div>
                               ${pad ? `<div class="map-2d-table-client">${pad.clientName || ''}</div>` : ''}
                           </div>
                       `;
                   }).join('')}
               </div>
               <div class="map-2d-controls">
                   <button class="btn btn-sm btn-secondary" onclick="window.cuisyncApp.resetMapPositions()">Réinitialiser positions</button>
                   <button class="btn btn-sm btn-primary" onclick="window.cuisyncApp.saveMapPositions()">Enregistrer positions</button>
               </div>
           </div>
       `;
       
       this.dom.restaurantMap.innerHTML = html || '<div class="empty-state"><p>Aucune table configurée</p></div>';
       
       // Initialiser le drag & drop
       this.initMapDragAndDrop();
   }
   
   initMapDragAndDrop() {
       const canvas = document.getElementById('map-2d-canvas');
       if (!canvas) return;
       
       const tables = canvas.querySelectorAll('.map-2d-table');
       let draggedTable = null;
       let offsetX = 0;
       let offsetY = 0;
       let isDragging = false;
       
       tables.forEach(table => {
           table.addEventListener('mousedown', (e) => {
               e.preventDefault();
               draggedTable = table;
               const rect = table.getBoundingClientRect();
               const canvasRect = canvas.getBoundingClientRect();
               offsetX = e.clientX - rect.left;
               offsetY = e.clientY - rect.top;
               table.style.opacity = '0.7';
               table.style.zIndex = '1000';
               table.style.cursor = 'grabbing';
               isDragging = true;
           });
       });
       
       canvas.addEventListener('mousemove', (e) => {
           if (draggedTable && isDragging) {
               e.preventDefault();
               const canvasRect = canvas.getBoundingClientRect();
               const x = ((e.clientX - canvasRect.left - offsetX) / canvasRect.width) * 100;
               const y = ((e.clientY - canvasRect.top - offsetY) / canvasRect.height) * 100;
               
               // Limiter dans les bounds
               const clampedX = Math.max(0, Math.min(95, x));
               const clampedY = Math.max(0, Math.min(95, y));
               
               draggedTable.style.left = clampedX + '%';
               draggedTable.style.top = clampedY + '%';
           }
       });
       
       const handleMouseUp = () => {
           if (draggedTable && isDragging) {
               draggedTable.style.opacity = '1';
               draggedTable.style.zIndex = '1';
               draggedTable.style.cursor = 'move';
               this.saveMapPositions();
               draggedTable = null;
               isDragging = false;
           }
       };
       
       canvas.addEventListener('mouseup', handleMouseUp);
       document.addEventListener('mouseup', handleMouseUp);
   }
   
   saveMapPositions() {
       const canvas = document.getElementById('map-2d-canvas');
       if (!canvas) return;
       
       const tables = canvas.querySelectorAll('.map-2d-table');
       tables.forEach(tableEl => {
           const tableNum = parseInt(tableEl.dataset.tableNum);
           const table = this.tables.find(t => t.number === tableNum);
           if (table) {
               const left = parseFloat(tableEl.style.left);
               const top = parseFloat(tableEl.style.top);
               table.x = left;
               table.y = top;
           }
       });
       
       this.saveToStorage();
       this.showToast('Positions enregistrées', 'success');
   }
   
   resetMapPositions() {
       if (!confirm('Voulez-vous réinitialiser toutes les positions des tables ?')) {
           return;
       }
       
       this.tables.forEach(table => {
           delete table.x;
           delete table.y;
       });
       
       this.saveToStorage();
       this.renderMapView();
       this.showToast('Positions réinitialisées', 'success');
   }
   
   changeTableStatus(tableNum, status) {
       this.updateTableStatus(tableNum, status);
   }
   
   // Reservations Management
   addReservation() {
       if (!this.dom.reservationForm) return;
       
       const name = this.dom.reservationNameInput ? this.dom.reservationNameInput.value.trim() : '';
       const coversStr = this.dom.reservationCoversInput ? this.dom.reservationCoversInput.value : '';
       const date = this.dom.reservationDateInput ? this.dom.reservationDateInput.value : '';
       const time = this.dom.reservationTimeInput ? this.dom.reservationTimeInput.value : '19:00';
       const tableNumStr = this.dom.reservationTableSelect && this.dom.reservationTableSelect.value ? this.dom.reservationTableSelect.value : '';
       const phone = this.dom.reservationPhoneInput ? this.dom.reservationPhoneInput.value.trim() : '';
       const email = this.dom.reservationEmailInput ? this.dom.reservationEmailInput.value.trim() : null;
       const occasion = this.dom.reservationOccasionSelect ? this.dom.reservationOccasionSelect.value : null;
       const notes = this.dom.reservationNotesInput ? this.dom.reservationNotesInput.value.trim() : null;
       
       // Validation
       if (!name || name.length < 2) {
           this.showToast('Le nom du client est requis (min 2 caractères)', 'error');
           return;
       }
       
       const covers = parseInt(coversStr);
       if (!coversStr || isNaN(covers) || covers < 1 || covers > 50) {
           this.showToast('Nombre de couverts invalide (1-50)', 'error');
           return;
       }
       
       if (!date) {
           this.showToast('La date est requise', 'error');
           return;
       }
       
       if (!time) {
           this.showToast('L\'heure est requise', 'error');
           return;
       }
       
       // Check if date is in the past
       const datetime = `${date}T${time}`;
       const reservationDate = new Date(datetime);
       const now = new Date();
       if (reservationDate < now) {
           if (!confirm('Cette réservation est dans le passé. Voulez-vous continuer ?')) {
               return;
           }
       }
       
       // Check if table is already reserved at this time
       const tableNum = tableNumStr ? parseInt(tableNumStr) : null;
       if (tableNum) {
           const conflictingReservation = this.reservations.find(r => 
               r.tableNum === tableNum &&
               r.status !== 'cancelled' &&
               r.status !== 'completed' &&
               new Date(r.date).toDateString() === reservationDate.toDateString() &&
               Math.abs(new Date(r.date).getTime() - reservationDate.getTime()) < 2 * 60 * 60 * 1000 // 2 hours window
           );
           if (conflictingReservation) {
               if (!confirm(`La table ${tableNum} est déjà réservée à cette heure. Voulez-vous continuer ?`)) {
                   return;
               }
           }
       }
       
       // Validate email if provided
       if (email && email.trim() && !this.isValidEmail(email)) {
           this.showToast('Adresse email invalide', 'error');
           return;
       }
       
       // Validate phone if provided
       if (phone && phone.trim() && !this.isValidPhone(phone)) {
           this.showToast('Numéro de téléphone invalide', 'error');
           return;
       }
       
       const reservation = {
           id: this.generateId(),
           name: name.trim(),
           covers: covers,
           date: datetime,
           tableNum: tableNum,
           phone: phone || null,
           email: email || null,
           occasion: occasion || null,
           notes: notes || null,
           status: 'pending', // pending, confirmed, cancelled, completed
           createdAt: new Date().toISOString()
       };
       
       this.reservations.push(reservation);
       
       // Save client preferences if email or phone provided
       if (email || phone) {
           this.updateClientPreferences(name, phone, email, notes);
       }
       
       if (tableNum) {
           this.updateTableStatus(tableNum, 'reserved');
       }
       
       this.saveToStorage();
       this.renderReservations();
       this.renderReservationCalendar();
       this.renderTablesGrid();
       this.refreshReservationTableSelect();
       this.dom.reservationForm.reset();
       this.showToast('Réservation ajoutée', 'success');
       
       // Add notification
       this.addNotification({
           type: 'reservation',
           title: 'Nouvelle réservation',
           message: `${name} - ${covers} couverts le ${this.formatDate(datetime)}`,
           reservationId: reservation.id,
           priority: 'normal',
           createdAt: new Date().toISOString()
       });
   }
   
   isValidEmail(email) {
       const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
       return emailRegex.test(email);
   }
   
   isValidPhone(phone) {
       // Basic phone validation (allows international format)
       const phoneRegex = /^[\d\s\+\-\(\)]{8,20}$/;
       return phoneRegex.test(phone);
   }
   
   renderReservations() {
       if (!this.dom.reservationsList) return;
       const now = new Date();
       const html = this.reservations
           .filter(r => new Date(r.date) >= now || r.status === 'pending')
           .sort((a, b) => new Date(a.date) - new Date(b.date))
           .map(reservation => {
               const statusText = {
                   'pending': 'En attente',
                   'confirmed': 'Confirmée',
                   'cancelled': 'Annulée',
                   'completed': 'Terminée'
               };
               const occasionText = {
                   'anniversary': 'Anniversaire',
                   'birthday': 'Fête d\'anniversaire',
                   'business': 'Dîner d\'affaires',
                   'romantic': 'Romantique',
                   'other': 'Autre'
               };
               return `
                   <div class="reservation-card">
                       <div class="reservation-header">
                           <h4>${this.escapeHTML(reservation.name)}</h4>
                           <span class="reservation-status ${reservation.status}">${statusText[reservation.status] || reservation.status}</span>
                       </div>
                       <div class="reservation-info">
                           <div>📅 ${this.formatDate(reservation.date)}</div>
                           <div>👥 ${reservation.covers} couverts</div>
                           ${reservation.tableNum ? `<div>🪑 Table: ${reservation.tableNum}</div>` : ''}
                           ${reservation.phone ? `<div>📞 ${reservation.phone}</div>` : ''}
                           ${reservation.email ? `<div>✉️ ${this.escapeHTML(reservation.email)}</div>` : ''}
                           ${reservation.occasion ? `<div>🎉 ${occasionText[reservation.occasion] || reservation.occasion}</div>` : ''}
                           ${reservation.notes ? `<div class="reservation-notes">📝 ${this.escapeHTML(reservation.notes)}</div>` : ''}
                       </div>
                       <div class="reservation-actions">
                           <button class="btn btn-sm btn-primary" onclick="window.cuisyncApp.confirmReservation('${reservation.id}')">Confirmer</button>
                           <button class="btn btn-sm btn-secondary" onclick="window.cuisyncApp.editReservation('${reservation.id}')">Modifier</button>
                           <button class="btn btn-sm btn-danger" onclick="window.cuisyncApp.cancelReservation('${reservation.id}')">Annuler</button>
                       </div>
                   </div>
               `;
           }).join('');
       this.dom.reservationsList.innerHTML = html || '<div class="empty-state"><p>Aucune réservation</p></div>';
   }
   
   confirmReservation(reservationId) {
       const reservation = this.reservations.find(r => r.id === reservationId);
       if (reservation) {
           reservation.status = 'confirmed';
           if (reservation.tableNum) {
               this.updateTableStatus(reservation.tableNum, 'reserved');
           }
           this.saveToStorage();
           this.renderReservations();
           this.renderTablesGrid();
           this.showToast('Réservation confirmée', 'success');
       }
   }
   
   cancelReservation(reservationId) {
       const reservation = this.reservations.find(r => r.id === reservationId);
       if (reservation && confirm('Annuler cette réservation ?')) {
           reservation.status = 'cancelled';
           if (reservation.tableNum) {
               this.updateTableStatus(reservation.tableNum, 'free');
           }
           this.saveToStorage();
           this.renderReservations();
           this.renderTablesGrid();
           this.showToast('Réservation annulée', 'info');
       }
   }
   
   editReservation(reservationId) {
       const reservation = this.reservations.find(r => r.id === reservationId);
       if (!reservation) return;
       // Simple edit - could be improved with a modal
       const newName = prompt('Nom:', reservation.name);
       if (newName) reservation.name = newName;
       this.saveToStorage();
       this.renderReservations();
   }
   
   refreshReservationTableSelect() {
       if (!this.dom.reservationTableSelect) return;
       const current = this.dom.reservationTableSelect.value;
       this.dom.reservationTableSelect.innerHTML = '<option value="">Table (optionnel)</option>';
       this.tables.forEach(table => {
           const opt = document.createElement('option');
           opt.value = table.number;
           opt.textContent = `Table ${table.number}`;
           this.dom.reservationTableSelect.appendChild(opt);
       });
       if (current) this.dom.reservationTableSelect.value = current;
   }
   
   // Statistics
   updateStatistics() {
       if (!this.dom.statRevenue) return;
       const period = this.dom.statsPeriodSelect ? this.dom.statsPeriodSelect.value : 'today';
       const now = new Date();
       let startDate;
       
       switch (period) {
           case 'today':
               startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
               break;
           case 'week':
               startDate = new Date(now);
               startDate.setDate(now.getDate() - 7);
               break;
           case 'month':
               startDate = new Date(now.getFullYear(), now.getMonth(), 1);
               break;
           default:
               startDate = new Date(0);
       }
       
       const filteredSales = this.sales.filter(s => new Date(s.createdAt) >= startDate);
       const revenue = filteredSales.reduce((sum, s) => sum + (s.total || 0), 0);
       const orders = filteredSales.length;
       const tables = new Set(filteredSales.map(s => s.table)).size;
       const average = orders > 0 ? revenue / orders : 0;
       
       this.dom.statRevenue.textContent = `${revenue.toFixed(2)} €`;
       this.dom.statOrders.textContent = orders;
       this.dom.statTables.textContent = tables;
       this.dom.statAverage.textContent = `${average.toFixed(2)} €`;
       
       // Top dishes
       const dishCounts = {};
       this.history.forEach(h => {
           if (h.items && Array.isArray(h.items)) {
               h.items.forEach(item => {
                   if (new Date(h.createdAt) >= startDate) {
                       dishCounts[item.dish] = (dishCounts[item.dish] || 0) + (item.qty || 0);
                   }
               });
           }
       });
       
       const topDishes = Object.entries(dishCounts)
           .sort((a, b) => b[1] - a[1])
           .slice(0, 10);
       
       if (this.dom.topDishesList) {
           if (topDishes.length === 0) {
               this.dom.topDishesList.innerHTML = '<div class="empty-state"><p>Aucune donnée</p></div>';
           } else {
               this.dom.topDishesList.innerHTML = topDishes.map(([dish, count]) => `
                   <div class="top-dish-item">
                       <span>${this.escapeHTML(dish)}</span>
                       <strong>${count}</strong>
                   </div>
               `).join('');
           }
       }
       
       // Peak hour
       const hourCounts = {};
       filteredSales.forEach(s => {
           const hour = new Date(s.createdAt).getHours();
           hourCounts[hour] = (hourCounts[hour] || 0) + 1;
       });
       const peakHour = Object.entries(hourCounts).sort((a, b) => b[1] - a[1])[0];
       if (this.dom.statPeakHour && peakHour) {
           this.dom.statPeakHour.textContent = `${peakHour[0]}h (${peakHour[1]} commandes)`;
       }
       
       // Payment methods
       const paymentCounts = {};
       filteredSales.forEach(s => {
           paymentCounts[s.method] = (paymentCounts[s.method] || 0) + 1;
       });
       if (this.dom.statPaymentMethods) {
           const methods = Object.entries(paymentCounts)
               .sort((a, b) => b[1] - a[1])
               .map(([method, count]) => {
                   const methodNames = {
                       'cash': 'Espèces',
                       'card': 'Carte',
                       'cheque': 'Chèque',
                       'voucher': 'Bon',
                       'split': 'Partagé',
                       'other': 'Autre'
                   };
                   return `<div class="payment-method-item"><span>${methodNames[method] || method}:</span><strong>${count}</strong></div>`;
               }).join('');
           this.dom.statPaymentMethods.innerHTML = methods || '<div class="empty-state"><p>Aucune donnée</p></div>';
       }
       
       // Revenue chart (simple bar chart)
       if (this.dom.revenueChart && period !== 'all') {
           const days = [];
           const revenues = [];
           const today = new Date();
           
           for (let i = 6; i >= 0; i--) {
               const date = new Date(today);
               date.setDate(date.getDate() - i);
               const dayStart = new Date(date.getFullYear(), date.getMonth(), date.getDate());
               const dayEnd = new Date(dayStart);
               dayEnd.setHours(23, 59, 59, 999);
               
               const daySales = this.sales.filter(s => {
                   const saleDate = new Date(s.createdAt);
                   return saleDate >= dayStart && saleDate <= dayEnd;
               });
               
               const dayRevenue = daySales.reduce((sum, s) => sum + (s.total || 0), 0);
               days.push(date.toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric' }));
               revenues.push(dayRevenue);
           }
           
           const maxRevenue = Math.max(...revenues, 1);
           const chartHTML = `
               <div class="chart-container">
                   ${revenues.map((rev, i) => `
                       <div class="chart-bar-container">
                           <div class="chart-bar" style="height: ${(rev / maxRevenue) * 100}%"></div>
                           <div class="chart-label">${days[i]}</div>
                           <div class="chart-value">${rev.toFixed(0)}€</div>
                       </div>
                   `).join('')}
               </div>
           `;
           this.dom.revenueChart.innerHTML = chartHTML;
       }
   }
   
   exportReport() {
       const period = this.dom.statsPeriodSelect ? this.dom.statsPeriodSelect.value : 'today';
       const now = new Date();
       let startDate;
       
       switch (period) {
           case 'today':
               startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
               break;
           case 'week':
               startDate = new Date(now);
               startDate.setDate(now.getDate() - 7);
               break;
           case 'month':
               startDate = new Date(now.getFullYear(), now.getMonth(), 1);
               break;
           default:
               startDate = new Date(0);
       }
       
       const filteredSales = this.sales.filter(s => new Date(s.createdAt) >= startDate);
       
       const report = {
           period: period,
           date: now.toISOString(),
           revenue: filteredSales.reduce((sum, s) => sum + (s.total || 0), 0),
           orders: filteredSales.length,
           tables: new Set(filteredSales.map(s => s.table)).size,
           average: filteredSales.length > 0 ? filteredSales.reduce((sum, s) => sum + (s.total || 0), 0) / filteredSales.length : 0,
           sales: filteredSales
       };
       
       const content = JSON.stringify(report, null, 2);
       const timestamp = new Date().toISOString().slice(0, 19).replace(/[:.]/g, '-');
       const filename = `cuisync-rapport-${period}-${timestamp}.json`;
       this.downloadFile(content, filename, 'application/json');
       this.showToast('Rapport exporté', 'success');
   }
   
   // History
   renderHistory() {
       if (!this.dom.historyList) return;
       const filter = this.dom.historyFilterSelect ? this.dom.historyFilterSelect.value : 'all';
       const search = this.dom.historySearchInput ? this.dom.historySearchInput.value.toLowerCase() : '';
       
       const now = new Date();
       let startDate;
       switch (filter) {
           case 'today':
               startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
               break;
           case 'week':
               startDate = new Date(now);
               startDate.setDate(now.getDate() - 7);
               break;
           case 'month':
               startDate = new Date(now.getFullYear(), now.getMonth(), 1);
               break;
           default:
               startDate = new Date(0);
       }
       
       let filtered = this.history.filter(h => new Date(h.createdAt) >= startDate);
       if (search) {
           filtered = filtered.filter(h => 
               String(h.table).includes(search) ||
               (h.clientName && h.clientName.toLowerCase().includes(search))
           );
       }
       
       const html = filtered.map(entry => {
           const total = this.getPadTotal(entry);
           return `
               <div class="history-card">
                   <div class="history-header">
                       <h4>Table ${entry.table}</h4>
                       <span>${this.formatDate(entry.createdAt)}</span>
                   </div>
                   ${entry.clientName ? `<div>Client: ${this.escapeHTML(entry.clientName)}</div>` : ''}
                   <div class="history-items">
                       ${(entry.items || []).map(item => `
                           <div class="history-item">
                               ${item.qty}x ${this.escapeHTML(item.dish)} - ${item.price ? (item.price * item.qty).toFixed(2) + ' €' : '—'}
                           </div>
                       `).join('')}
                   </div>
                   <div class="history-total">Total: <strong>${total.toFixed(2)} €</strong></div>
               </div>
           `;
       }).join('');
       this.dom.historyList.innerHTML = html || '<div class="empty-state"><p>Aucun historique</p></div>';
   }
   
   // Host view toggle
   toggleHostView(view) {
       const tablesMgmt = document.getElementById('tables-management');
       const reservationsMgmt = document.getElementById('reservations-management');
       const statisticsView = this.dom.statisticsView;
       const historySection = this.dom.historySection;
       const menuMgmt = this.dom.menuManagement;
       const clientsMgmt = this.dom.clientsManagement;
       const settingsMgmt = this.dom.settingsManagement;
       
       // Hide all content sections
       if (tablesMgmt) tablesMgmt.classList.add('hidden');
       if (reservationsMgmt) reservationsMgmt.classList.add('hidden');
       if (statisticsView) statisticsView.classList.add('hidden');
       if (historySection) historySection.classList.add('hidden');
       if (menuMgmt) menuMgmt.classList.add('hidden');
       if (clientsMgmt) clientsMgmt.classList.add('hidden');
       if (settingsMgmt) settingsMgmt.classList.add('hidden');
       if (this.dom.mapView) this.dom.mapView.classList.add('hidden');
       if (this.dom.inventoryManagement) this.dom.inventoryManagement.classList.add('hidden');
       if (this.dom.shiftsManagement) this.dom.shiftsManagement.classList.add('hidden');
       if (this.dom.discountsManagement) this.dom.discountsManagement.classList.add('hidden');
       if (this.dom.reportsManagement) this.dom.reportsManagement.classList.add('hidden');
       
       // Update tab states
       document.querySelectorAll('.host-main-tab').forEach(tab => {
           tab.classList.remove('active');
       });
       
       // Show selected
       switch (view) {
           case 'tables':
               if (tablesMgmt) tablesMgmt.classList.remove('hidden');
               if (this.dom.tablesViewBtn) this.dom.tablesViewBtn.classList.add('active');
               break;
           case 'reservations':
               if (reservationsMgmt) reservationsMgmt.classList.remove('hidden');
               if (this.dom.reservationsViewBtn) this.dom.reservationsViewBtn.classList.add('active');
               break;
           case 'stats':
               if (statisticsView) {
                   statisticsView.classList.remove('hidden');
                   this.updateStatistics();
               }
               if (this.dom.statsViewBtn) this.dom.statsViewBtn.classList.add('active');
               break;
           case 'menu':
               if (menuMgmt) {
                   menuMgmt.classList.remove('hidden');
                   this.renderMenuList();
               }
               if (this.dom.menuViewBtn) this.dom.menuViewBtn.classList.add('active');
               break;
           case 'clients':
               if (clientsMgmt) {
                   clientsMgmt.classList.remove('hidden');
                   this.renderClientPreferences();
               }
               if (this.dom.clientsViewBtn) this.dom.clientsViewBtn.classList.add('active');
               break;
           case 'history':
               if (historySection) {
                   historySection.classList.remove('hidden');
                   this.renderHistory();
               }
               if (this.dom.historyViewBtn) this.dom.historyViewBtn.classList.add('active');
               break;
           case 'settings':
               if (settingsMgmt) {
                   settingsMgmt.classList.remove('hidden');
                   this.renderServers();
                   this.renderEvents();
                   this.renderOpeningHours();
               }
               if (this.dom.settingsViewBtn) this.dom.settingsViewBtn.classList.add('active');
               break;
           case 'map':
               if (this.dom.mapView) {
                   this.dom.mapView.classList.remove('hidden');
                   this.renderMapView();
               }
               if (this.dom.mapViewBtn) this.dom.mapViewBtn.classList.add('active');
               break;
           case 'inventory':
               if (this.dom.inventoryManagement) {
                   this.dom.inventoryManagement.classList.remove('hidden');
                   this.renderInventory();
               }
               if (this.dom.inventoryViewBtn) this.dom.inventoryViewBtn.classList.add('active');
               break;
           case 'shifts':
               if (this.dom.shiftsManagement) {
                   this.dom.shiftsManagement.classList.remove('hidden');
                   this.renderShifts();
               }
               if (this.dom.shiftsViewBtn) this.dom.shiftsViewBtn.classList.add('active');
               break;
           case 'discounts':
               if (this.dom.discountsManagement) {
                   this.dom.discountsManagement.classList.remove('hidden');
                   this.renderDiscounts();
               }
               if (this.dom.discountsViewBtn) this.dom.discountsViewBtn.classList.add('active');
               break;
           case 'reports':
               if (this.dom.reportsManagement) {
                   this.dom.reportsManagement.classList.remove('hidden');
                   this.renderReports();
               }
               if (this.dom.reportsViewBtn) this.dom.reportsViewBtn.classList.add('active');
               break;
       }
   }
   
   // Update markPadServed to save to history
   markPadServed(padId) {
       const padIndex = this.pads.findIndex(p => p.id === padId);
       if (padIndex === -1) return;
       
       const pad = this.pads[padIndex];
       const oldState = { ...pad, _index: padIndex };
       
       // Save to history before removing
       this.history.push({
           ...pad,
           status: 'served',
           servedAt: new Date().toISOString()
       });
       
       this.pads.splice(padIndex, 1);
       
       // Update table status
       this.updateTableStatus(pad.table, 'free');
       
       this.undoStack.push({
           type: 'markServed',
           data: oldState
       });
       
       this.saveToStorage();
       this.renderViews();
       this.renderTablesGrid();
       this.renderHistory();
       
       this.showToast(`Table ${pad.table} servie`, 'success');
       this.showUndoNotification('Commande servie');
   }
   
   // Update markPadPaid to save to history
   markPadPaid(padId) {
       const padIndex = this.pads.findIndex(p => p.id === padId);
       if (padIndex === -1) return;
       const pad = this.pads[padIndex];
       const oldState = { ...pad, _index: padIndex };
       
       // Save to history before removing
       this.history.push({
           ...pad,
           status: 'served',
           paidAt: new Date().toISOString(),
           updatedAt: new Date().toISOString()
       });
       
       this.pads.splice(padIndex, 1);
       
       // Update table status
       this.updateTableStatus(pad.table, 'free');
       
       this.undoStack.push({
           type: 'markPaid',
           data: oldState
       });
       
       this.saveToStorage();
       this.renderViews();
       this.renderTablesGrid();
       this.renderHistory();
       
       this.showToast(`Table ${pad.table} encaissée`, 'success');
       this.showUndoNotification('Paiement enregistré');
   }
   
   // Update confirmPayment to handle multiple partial payments
   confirmPayment() {
       if (!this.currentPaymentPadId) {
           this.showToast('Aucune commande sélectionnée', 'error');
           return;
       }
       
       const padId = this.currentPaymentPadId;
       const pad = this.pads.find(p => p.id === padId);
       if (!pad) {
           this.showToast('Commande introuvable', 'error');
           this.closePaymentPanel();
           return;
       }
       
       // Initialize partialPayments if not exists
       if (!pad.partialPayments) pad.partialPayments = [];
       
       const method = this.dom.paymentMethod ? this.dom.paymentMethod.value : 'other';
       const subtotal = this.getPadTotal(pad);
       
       if (subtotal <= 0) {
           this.showToast('Le total de la commande doit être supérieur à 0', 'error');
           return;
       }
       
       const taxRate = this.posSettings ? (Math.max(0, this.posSettings.taxRatePct || 0)) : 0;
       const discountStr = this.dom.paymentDiscount && this.dom.paymentDiscount.value ? this.dom.paymentDiscount.value : '0';
       const tipStr = this.dom.paymentTip && this.dom.paymentTip.value ? this.dom.paymentTip.value : '0';
       const discount = Math.max(0, parseFloat(discountStr) || 0);
       const tip = Math.max(0, parseFloat(tipStr) || 0);
       
       // Calculate total due (only once, applied to first payment)
       const totalDue = Math.max(0, subtotal - discount) + (Math.max(0, subtotal - discount) * taxRate / 100) + tip;
       
       // Get amount for this payment
       const splitAmountStr = this.dom.paymentSplitAmount && this.dom.paymentSplitAmount.value ? this.dom.paymentSplitAmount.value : '';
       let paymentAmount = parseFloat(splitAmountStr) || 0;
       
       // If no split amount specified, use remaining amount
       if (paymentAmount <= 0) {
           const paidAmount = this.getPaidAmount(pad);
           paymentAmount = Math.max(0, totalDue - paidAmount);
       }
       
       if (paymentAmount <= 0) {
           this.showToast('Montant invalide', 'error');
           return;
       }
       
       // Check if payment exceeds remaining
       const paidAmount = this.getPaidAmount(pad);
       const remaining = Math.max(0, totalDue - paidAmount);
       
       if (paymentAmount > remaining) {
           this.showToast(`Montant trop élevé. Reste à payer: ${remaining.toFixed(2)} €`, 'error');
           return;
       }
       
       // Validate cash payment
       if (method === 'cash') {
           const receivedStr = this.dom.paymentReceived && this.dom.paymentReceived.value ? this.dom.paymentReceived.value : '0';
           const received = parseFloat(receivedStr) || 0;
           if (isNaN(received) || received < paymentAmount) {
               this.showToast(`Montant reçu insuffisant. Montant: ${paymentAmount.toFixed(2)} €`, 'error');
               return;
           }
       }
       
       // Get number of people for this payment
       const peopleStr = this.dom.paymentSplitPeople && this.dom.paymentSplitPeople.value ? this.dom.paymentSplitPeople.value : '';
       const people = parseInt(peopleStr) || null;
       
       // Add partial payment
       const partialPayment = {
           id: this.generateId(),
           amount: paymentAmount,
           method: method,
           people: people,
           discount: pad.partialPayments.length === 0 ? discount : 0, // Apply discount only to first payment
           tip: pad.partialPayments.length === 0 ? tip : 0, // Apply tip only to first payment
           createdAt: new Date().toISOString()
       };
       
       pad.partialPayments.push(partialPayment);
       pad.updatedAt = new Date().toISOString();
       
       // Record sale for this payment
       this.recordSale({
           padId,
           table: pad.table,
           subtotal: Math.max(0, subtotal),
           discount: pad.partialPayments.length === 1 ? discount : 0,
           tax: Math.max(0, (Math.max(0, subtotal - discount) * taxRate / 100)),
           tip: pad.partialPayments.length === 1 ? tip : 0,
           total: paymentAmount,
           method,
           people: people,
           createdAt: new Date().toISOString()
       });
       
       // Check if fully paid
       const newPaidAmount = this.getPaidAmount(pad);
       const newRemaining = Math.max(0, totalDue - newPaidAmount);
       
       if (newRemaining <= 0.01) { // Allow small rounding differences
           // Fully paid
           this.markPadPaid(padId);
           if (this.posSettings && this.posSettings.printAfterPay) {
               setTimeout(() => {
                   this.printPadReceipt(padId);
               }, 500);
           }
           this.closePaymentPanel();
           this.showToast(`Table ${pad.table} entièrement payée`, 'success');
       } else {
           // Partially paid, refresh panel
           this.openPaymentPanel(padId);
           this.showToast(`Paiement de ${paymentAmount.toFixed(2)} € enregistré. Reste: ${newRemaining.toFixed(2)} €`, 'success');
       }
       
       this.saveToStorage();
   }
   
   // Reservation Calendar
   renderReservationCalendar() {
       if (!this.dom.reservationCalendar || !this.dom.currentDateDisplay) return;
       
       const date = this.currentReservationDate;
       const dateStr = date.toLocaleDateString('fr-FR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
       this.dom.currentDateDisplay.textContent = dateStr;
       
       // Get reservations for this day
       const dayStart = new Date(date);
       dayStart.setHours(0, 0, 0, 0);
       const dayEnd = new Date(date);
       dayEnd.setHours(23, 59, 59, 999);
       
       const dayReservations = this.reservations.filter(r => {
           const resDate = new Date(r.date);
           return resDate >= dayStart && resDate <= dayEnd;
       }).sort((a, b) => new Date(a.date) - new Date(b.date));
       
       // Create hourly slots
       const hours = [];
       for (let h = 8; h <= 23; h++) {
           hours.push(h);
       }
       
       const html = hours.map(hour => {
           const hourReservations = dayReservations.filter(r => {
               const resDate = new Date(r.date);
               return resDate.getHours() === hour;
           });
           
           return `
               <div class="calendar-hour-slot">
                   <div class="calendar-hour">${hour.toString().padStart(2, '0')}:00</div>
                   <div class="calendar-reservations">
                       ${hourReservations.map(r => `
                           <div class="calendar-reservation ${r.status}" title="${this.escapeHTML(r.name)} - ${r.covers} couverts">
                               <span class="reservation-time">${new Date(r.date).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}</span>
                               <span class="reservation-name">${this.escapeHTML(r.name)}</span>
                               <span class="reservation-covers">${r.covers} pers.</span>
                           </div>
                       `).join('')}
                   </div>
               </div>
           `;
       }).join('');
       
       this.dom.reservationCalendar.innerHTML = html || '<div class="empty-state"><p>Aucune réservation ce jour</p></div>';
   }
   
   // Floor Plan
   renderFloorPlan() {
       if (!this.dom.floorPlan) return;
       
       // Simple grid layout for floor plan
       const cols = Math.ceil(Math.sqrt(this.tables.length));
       const rows = Math.ceil(this.tables.length / cols);
       
       const html = `
           <div class="floor-plan-grid" style="grid-template-columns: repeat(${cols}, 1fr); grid-template-rows: repeat(${rows}, 1fr);">
               ${this.tables.map(table => {
                   const pad = this.pads.find(p => p.table === table.number && p.status !== 'served');
                   const reservation = this.reservations.find(r => r.tableNum === table.number && r.status !== 'cancelled' && new Date(r.date) >= new Date());
                   
                   return `
                       <div class="floor-plan-table ${table.status}" 
                            data-table-num="${table.number}"
                            onclick="window.cuisyncApp.editTable(${table.number})"
                            title="Table ${table.number} - ${table.status}">
                           <div class="floor-plan-table-number">${table.number}</div>
                           ${pad ? `<div class="floor-plan-table-info">${pad.covers || ''} pers.</div>` : ''}
                           ${reservation ? `<div class="floor-plan-table-reservation">Réservé</div>` : ''}
                       </div>
                   `;
               }).join('')}
           </div>
       `;
       
       this.dom.floorPlan.innerHTML = html;
   }
   
   // Restaurant Settings
   saveRestaurantSettings() {
       if (!this.dom.restaurantNameInput) return;
       
       this.restaurantSettings.name = this.dom.restaurantNameInput.value.trim();
       this.restaurantSettings.phone = this.dom.restaurantPhoneInput ? this.dom.restaurantPhoneInput.value.trim() : '';
       this.restaurantSettings.email = this.dom.restaurantEmailInput ? this.dom.restaurantEmailInput.value.trim() : '';
       this.restaurantSettings.address = this.dom.restaurantAddressInput ? this.dom.restaurantAddressInput.value.trim() : '';
       
       // Save opening hours from form
       const dayInputs = this.dom.openingHoursContainer.querySelectorAll('[data-day]');
       dayInputs.forEach(input => {
           const day = input.dataset.day;
           const type = input.dataset.type; // 'open', 'close', 'evening-open', 'evening-close'
           
           if (day && this.restaurantSettings.openingHours[day]) {
               if (type === 'open' || type === 'close') {
                   this.restaurantSettings.openingHours[day][type] = input.value;
               } else if (type === 'evening-open' || type === 'evening-close') {
                   if (!this.restaurantSettings.openingHours[day].evening) {
                       this.restaurantSettings.openingHours[day].evening = {};
                   }
                   this.restaurantSettings.openingHours[day].evening[type.replace('evening-', '')] = input.value;
               }
           }
       });
       
       this.saveToStorage();
       this.showToast('Paramètres enregistrés', 'success');
   }
   
   renderOpeningHours() {
       if (!this.dom.openingHoursContainer) return;
       
       const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
       const dayNames = {
           monday: 'Lundi',
           tuesday: 'Mardi',
           wednesday: 'Mercredi',
           thursday: 'Jeudi',
           friday: 'Vendredi',
           saturday: 'Samedi',
           sunday: 'Dimanche'
       };
       
       const html = days.map(day => {
           const hours = this.restaurantSettings.openingHours[day] || {};
           return `
               <div class="opening-hours-day">
                   <label>${dayNames[day]}</label>
                   <div class="opening-hours-inputs">
                       <input type="time" data-day="${day}" data-type="open" value="${hours.open || '12:00'}" placeholder="Ouverture">
                       <span>-</span>
                       <input type="time" data-day="${day}" data-type="close" value="${hours.close || '14:00'}" placeholder="Fermeture">
                       <span>|</span>
                       <input type="time" data-day="${day}" data-type="evening-open" value="${hours.evening?.open || '19:00'}" placeholder="Soir">
                       <span>-</span>
                       <input type="time" data-day="${day}" data-type="evening-close" value="${hours.evening?.close || '22:00'}" placeholder="Fermeture">
                   </div>
               </div>
           `;
       }).join('');
       
       this.dom.openingHoursContainer.innerHTML = html;
   }
   
   // Events Management
   addEvent() {
       if (!this.dom.eventForm) return;
       const name = this.dom.eventNameInput.value.trim();
       const date = this.dom.eventDateInput.value;
       const time = this.dom.eventTimeInput ? this.dom.eventTimeInput.value : '';
       const description = this.dom.eventDescriptionInput ? this.dom.eventDescriptionInput.value.trim() : '';
       const capacity = this.dom.eventCapacityInput ? parseInt(this.dom.eventCapacityInput.value) : null;
       
       if (!name || !date) {
           this.showToast('Veuillez remplir tous les champs obligatoires', 'error');
           return;
       }
       
       const event = {
           id: this.generateId(),
           name,
           date: time ? `${date}T${time}` : date,
           description: description || null,
           capacity: capacity || null,
           createdAt: new Date().toISOString()
       };
       
       this.events.push(event);
       this.saveToStorage();
       this.renderEvents();
       this.dom.eventForm.reset();
       this.showToast('Événement ajouté', 'success');
   }
   
   renderEvents() {
       if (!this.dom.eventsList) return;
       const now = new Date();
       
       const html = this.events
           .filter(e => new Date(e.date) >= now)
           .sort((a, b) => new Date(a.date) - new Date(b.date))
           .map(event => {
               return `
                   <div class="event-card">
                       <div class="event-header">
                           <h4>${this.escapeHTML(event.name)}</h4>
                           <span class="event-date">${this.formatDate(event.date)}</span>
                       </div>
                       ${event.description ? `<div class="event-description">${this.escapeHTML(event.description)}</div>` : ''}
                       ${event.capacity ? `<div class="event-capacity">Capacité: ${event.capacity} personnes</div>` : ''}
                       <div class="event-actions">
                           <button class="btn btn-sm btn-danger" onclick="window.cuisyncApp.deleteEvent('${event.id}')">Supprimer</button>
                       </div>
                   </div>
               `;
           }).join('');
       
       this.dom.eventsList.innerHTML = html || '<div class="empty-state"><p>Aucun événement à venir</p></div>';
   }
   
   deleteEvent(eventId) {
       if (confirm('Supprimer cet événement ?')) {
           this.events = this.events.filter(e => e.id !== eventId);
           this.saveToStorage();
           this.renderEvents();
           this.showToast('Événement supprimé', 'info');
       }
   }
   
   // Client Preferences
   updateClientPreferences(name, phone, email, notes) {
       if (!name) return;
       
       // Find existing client or create new
       let client = this.clientPreferences.find(c => 
           (phone && c.phone === phone) || (email && c.email === email)
       );
       
       if (!client) {
           client = {
               id: this.generateId(),
               name,
               phone: phone || null,
               email: email || null,
               preferences: [],
               notes: notes || null,
               visitCount: 0,
               lastVisit: null,
               createdAt: new Date().toISOString()
           };
           this.clientPreferences.push(client);
       } else {
           // Update existing client
           if (name) client.name = name;
           if (phone) client.phone = phone;
           if (email) client.email = email;
           if (notes) client.notes = notes;
       }
       
       client.visitCount = (client.visitCount || 0) + 1;
       client.lastVisit = new Date().toISOString();
       
       this.saveToStorage();
   }
   
   renderClientPreferences() {
       if (!this.dom.clientPreferencesList) return;
       
       const search = this.dom.clientSearchInput ? this.dom.clientSearchInput.value.toLowerCase() : '';
       
       let filtered = this.clientPreferences;
       if (search) {
           filtered = this.clientPreferences.filter(c => 
               c.name.toLowerCase().includes(search) ||
               (c.phone && c.phone.includes(search)) ||
               (c.email && c.email.toLowerCase().includes(search))
           );
       }
       
       const html = filtered.map(client => {
           return `
               <div class="client-preference-card">
                   <div class="client-header">
                       <h4>${this.escapeHTML(client.name)}</h4>
                       <span class="client-visit-count">${client.visitCount || 0} visite(s)</span>
                   </div>
                   <div class="client-info">
                       ${client.phone ? `<div>📞 ${this.escapeHTML(client.phone)}</div>` : ''}
                       ${client.email ? `<div>✉️ ${this.escapeHTML(client.email)}</div>` : ''}
                       ${client.notes ? `<div class="client-notes">Notes: ${this.escapeHTML(client.notes)}</div>` : ''}
                       ${client.lastVisit ? `<div class="client-last-visit">Dernière visite: ${this.formatDate(client.lastVisit)}</div>` : ''}
                   </div>
                   <div class="client-actions">
                       <button class="btn btn-sm btn-secondary" onclick="window.cuisyncApp.editClientPreference('${client.id}')">Modifier</button>
                       <button class="btn btn-sm btn-primary" onclick="window.cuisyncApp.useClientPreference('${client.id}')">Utiliser pour réservation</button>
                   </div>
               </div>
           `;
       }).join('');
       
       this.dom.clientPreferencesList.innerHTML = html || '<div class="empty-state"><p>Aucun client trouvé</p></div>';
   }
   
   editClientPreference(clientId) {
       const client = this.clientPreferences.find(c => c.id === clientId);
       if (!client) return;
       
       const newName = prompt('Nom:', client.name);
       if (newName) client.name = newName;
       
       const newNotes = prompt('Notes:', client.notes || '');
       if (newNotes !== null) client.notes = newNotes;
       
       this.saveToStorage();
       this.renderClientPreferences();
   }
   
   useClientPreference(clientId) {
       const client = this.clientPreferences.find(c => c.id === clientId);
       if (!client) return;
       
       // Fill reservation form with client data
       if (this.dom.reservationNameInput) this.dom.reservationNameInput.value = client.name;
       if (this.dom.reservationPhoneInput) this.dom.reservationPhoneInput.value = client.phone || '';
       if (this.dom.reservationEmailInput) this.dom.reservationEmailInput.value = client.email || '';
       if (this.dom.reservationNotesInput) this.dom.reservationNotesInput.value = client.notes || '';
       
       // Switch to reservations view
       this.toggleHostView('reservations');
       this.showToast(`Informations de ${client.name} chargées`, 'success');
   }
   
   // ========== INVENTORY MANAGEMENT ==========
   initializeInventory() {
       // Initialize inventory from menu items
       if (!this.inventory || this.inventory.length === 0) {
           this.inventory = [];
           this.menu.categories.forEach(category => {
               (category.dishes || []).forEach(dish => {
                   const existing = this.inventory.find(inv => inv.dishId === dish.id);
                   if (!existing) {
                       this.inventory.push({
                           id: this.generateId(),
                           dishId: dish.id,
                           dishName: dish.name,
                           categoryId: category.id,
                           stock: 100,
                           minStock: 10,
                           unit: 'portion',
                           lastUpdated: new Date().toISOString()
                       });
                   }
               });
           });
           this.saveToStorage();
       }
   }
   
   renderInventory() {
       if (!this.dom.inventoryList) return;
       this.initializeInventory();
       
       const searchTerm = document.getElementById('inventory-search-input')?.value.toLowerCase() || '';
       const statusFilter = document.getElementById('inventory-status-filter')?.value || 'all';
       
       let filtered = this.inventory.filter(inv => {
           const matchesSearch = !searchTerm || inv.dishName.toLowerCase().includes(searchTerm);
           const matchesStatus = statusFilter === 'all' || 
               (statusFilter === 'in-stock' && inv.stock > inv.minStock) ||
               (statusFilter === 'low-stock' && inv.stock > 0 && inv.stock <= inv.minStock) ||
               (statusFilter === 'out-of-stock' && inv.stock === 0);
           return matchesSearch && matchesStatus;
       });
       
       if (filtered.length === 0) {
           this.dom.inventoryList.innerHTML = '<div class="empty-state"><p>Aucun article en stock</p></div>';
           return;
       }
       
       const html = filtered.map(inv => {
           const statusClass = inv.stock === 0 ? 'out-of-stock' : inv.stock <= inv.minStock ? 'low-stock' : 'in-stock';
           const statusText = inv.stock === 0 ? 'Rupture' : inv.stock <= inv.minStock ? 'Stock faible' : 'En stock';
           
           return `
               <div class="inventory-item ${statusClass}">
                   <div class="inventory-item-header">
                       <h4>${this.escapeHTML(inv.dishName)}</h4>
                       <span class="inventory-status-badge ${statusClass}">${statusText}</span>
                   </div>
                   <div class="inventory-item-details">
                       <div class="inventory-stock-info">
                           <label>Stock actuel:</label>
                           <input type="number" min="0" value="${inv.stock}" 
                                  data-inventory-id="${inv.id}" 
                                  class="inventory-stock-input" 
                                  data-action="update-stock">
                           <span>${inv.unit}</span>
                       </div>
                       <div class="inventory-min-stock">
                           <label>Seuil d'alerte:</label>
                           <input type="number" min="0" value="${inv.minStock}" 
                                  data-inventory-id="${inv.id}" 
                                  class="inventory-min-input"
                                  data-action="update-min-stock">
                           <span>${inv.unit}</span>
                       </div>
                   </div>
                   <div class="inventory-item-actions">
                       <button class="btn btn-sm btn-secondary" data-action="adjust-inventory" data-inventory-id="${inv.id}" data-delta="1">+1</button>
                       <button class="btn btn-sm btn-secondary" data-action="adjust-inventory" data-inventory-id="${inv.id}" data-delta="-1">-1</button>
                       <button class="btn btn-sm btn-secondary" data-action="adjust-inventory" data-inventory-id="${inv.id}" data-delta="10">+10</button>
                       <button class="btn btn-sm btn-secondary" data-action="adjust-inventory" data-inventory-id="${inv.id}" data-delta="-10">-10</button>
                   </div>
               </div>
           `;
       }).join('');
       
       this.dom.inventoryList.innerHTML = html;
       
       // Attach event listeners for inventory actions using event delegation
       // Remove old listeners by cloning the node
       const newInventoryList = this.dom.inventoryList.cloneNode(true);
       this.dom.inventoryList.parentNode.replaceChild(newInventoryList, this.dom.inventoryList);
       this.dom.inventoryList = newInventoryList;
       
       // Click events for buttons
       this.dom.inventoryList.addEventListener('click', (e) => {
           const btn = e.target.closest('[data-action]');
           if (!btn || btn.tagName !== 'BUTTON') return;
           
           const action = btn.dataset.action;
           const inventoryId = btn.dataset.inventoryId;
           const delta = btn.dataset.delta;
           
           if (action === 'adjust-inventory' && inventoryId && delta) {
               e.preventDefault();
               e.stopPropagation();
               this.adjustInventory(inventoryId, parseInt(delta));
           }
       });
       
       // Change events for inputs
       this.dom.inventoryList.addEventListener('change', (e) => {
           const input = e.target;
           if (!input.classList.contains('inventory-stock-input') && !input.classList.contains('inventory-min-input')) return;
           
           const inventoryId = input.dataset.inventoryId;
           if (!inventoryId) return;
           
           if (input.classList.contains('inventory-stock-input')) {
               this.updateInventoryStock(inventoryId, input.value);
           } else if (input.classList.contains('inventory-min-input')) {
               this.updateInventoryMinStock(inventoryId, input.value);
           }
       });
   }
   
   updateInventoryStock(inventoryId, newStock) {
       const inv = this.inventory.find(i => i.id === inventoryId);
       if (!inv) return;
       
       inv.stock = Math.max(0, parseInt(newStock) || 0);
       inv.lastUpdated = new Date().toISOString();
       this.updateDishAvailabilityFromInventory(inv);
       this.saveToStorage();
       this.renderInventory();
       this.broadcastMessage('inventory-updated', inv);
   }
   
   updateInventoryMinStock(inventoryId, newMinStock) {
       const inv = this.inventory.find(i => i.id === inventoryId);
       if (!inv) return;
       
       inv.minStock = Math.max(0, parseInt(newMinStock) || 0);
       this.saveToStorage();
       this.renderInventory();
   }
   
   adjustInventory(inventoryId, delta) {
       const inv = this.inventory.find(i => i.id === inventoryId);
       if (!inv) return;
       
       inv.stock = Math.max(0, inv.stock + delta);
       inv.lastUpdated = new Date().toISOString();
       this.updateDishAvailabilityFromInventory(inv);
       this.saveToStorage();
       this.renderInventory();
       this.broadcastMessage('inventory-updated', inv);
   }
   
   updateDishAvailabilityFromInventory(inv) {
       this.menu.categories.forEach(category => {
           const dish = category.dishes?.find(d => d.id === inv.dishId);
           if (dish) {
               dish.availability = inv.stock > 0 ? 'available' : 'unavailable';
           }
       });
       this.saveMenuToStorage();
       this.refreshDishOptions(); // Update dish selects
       this.renderMenuList(); // Update menu display
       this.broadcastMessage('menu-updated', this.menu);
   }
   
   // ========== SHIFTS MANAGEMENT ==========
   renderShifts() {
       if (!this.dom.shiftsList) return;
       
       const today = new Date();
       const currentShift = this.shifts.find(s => {
           const start = new Date(s.startTime);
           const end = new Date(s.endTime);
           return today >= start && today <= end;
       });
       
       if (this.dom.currentShiftInfo) {
           if (currentShift) {
               const members = currentShift.members.map(m => m.name).join(', ') || 'Aucun';
               this.dom.currentShiftInfo.innerHTML = `
                   <div class="current-shift-card">
                       <h3>Shift en cours</h3>
                       <div class="shift-info">
                           <div><strong>Début:</strong> ${this.formatDate(currentShift.startTime)}</div>
                           <div><strong>Fin:</strong> ${this.formatDate(currentShift.endTime)}</div>
                           <div><strong>Équipe:</strong> ${members}</div>
                       </div>
                   </div>
               `;
           } else {
               this.dom.currentShiftInfo.innerHTML = '<div class="current-shift-card"><p>Aucun shift en cours</p></div>';
           }
       }
       
       const upcomingShifts = this.shifts
           .filter(s => new Date(s.startTime) >= today)
           .sort((a, b) => new Date(a.startTime) - new Date(b.startTime))
           .slice(0, 10);
       
       if (upcomingShifts.length === 0) {
           this.dom.shiftsList.innerHTML = '<div class="empty-state"><p>Aucun shift programmé</p></div>';
           return;
       }
       
       const html = upcomingShifts.map(shift => `
           <div class="shift-card">
               <div class="shift-header">
                   <h4>${this.formatDate(shift.startTime)}</h4>
                   <span class="shift-time">${new Date(shift.startTime).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })} - ${new Date(shift.endTime).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}</span>
               </div>
               <div class="shift-members">
                   ${shift.members.map(m => `<span class="shift-member">${this.escapeHTML(m.name)} (${m.role})</span>`).join('')}
               </div>
               <div class="shift-actions">
                   <button class="btn btn-sm btn-danger" data-action="delete-shift" data-shift-id="${shift.id}">Supprimer</button>
               </div>
           </div>
       `).join('');
       
       this.dom.shiftsList.innerHTML = html;
       
       // Attach event listeners for shift actions using event delegation
       // Remove old listeners by cloning the node
       if (this.dom.shiftsList && this.dom.shiftsList.parentNode) {
           const newShiftsList = this.dom.shiftsList.cloneNode(true);
           this.dom.shiftsList.parentNode.replaceChild(newShiftsList, this.dom.shiftsList);
           this.dom.shiftsList = newShiftsList;
           
           this.dom.shiftsList.addEventListener('click', (e) => {
               const btn = e.target.closest('[data-action]');
               if (!btn || btn.tagName !== 'BUTTON') return;
               
               const action = btn.dataset.action;
               const shiftId = btn.dataset.shiftId;
               
               if (action === 'delete-shift' && shiftId) {
                   e.preventDefault();
                   e.stopPropagation();
                   this.deleteShift(shiftId);
               }
           });
       }
   }
   
   showAddShiftModal() {
       const startTime = prompt('Heure de début (HH:MM):', '09:00');
       const endTime = prompt('Heure de fin (HH:MM):', '17:00');
       const date = prompt('Date (YYYY-MM-DD):', new Date().toISOString().split('T')[0]);
       
       if (!startTime || !endTime || !date) return;
       
       const startDateTime = new Date(`${date}T${startTime}`);
       const endDateTime = new Date(`${date}T${endTime}`);
       
       if (isNaN(startDateTime.getTime()) || isNaN(endDateTime.getTime())) {
           this.showToast('Format de date/heure invalide', 'error');
           return;
       }
       
       const shift = {
           id: this.generateId(),
           startTime: startDateTime.toISOString(),
           endTime: endDateTime.toISOString(),
           members: [],
           createdAt: new Date().toISOString()
       };
       
       this.shifts.push(shift);
       this.saveToStorage();
       this.renderShifts();
       this.showToast('Shift ajouté', 'success');
   }
   
   deleteShift(shiftId) {
       if (!confirm('Supprimer ce shift ?')) return;
       this.shifts = this.shifts.filter(s => s.id !== shiftId);
       this.saveToStorage();
       this.renderShifts();
       this.showToast('Shift supprimé', 'success');
   }
   
   // ========== DISCOUNTS MANAGEMENT ==========
   renderDiscounts() {
       if (!this.dom.discountsList) return;
       
       // Show all discounts, not just active ones
       if (this.discounts.length === 0) {
           this.dom.discountsList.innerHTML = '<div class="empty-state"><p>Aucune remise enregistrée</p></div>';
           return;
       }
       
       // Sort: active first, then by creation date
       const sortedDiscounts = [...this.discounts].sort((a, b) => {
           if (a.active !== b.active) return b.active ? 1 : -1;
           return new Date(b.createdAt) - new Date(a.createdAt);
       });
       
       const html = sortedDiscounts.map(discount => {
           const now = new Date();
           const start = discount.startDate ? new Date(discount.startDate) : null;
           const end = discount.endDate ? new Date(discount.endDate) : null;
           const isExpired = end && now > end;
           const notStarted = start && now < start;
           
           return `
           <div class="discount-card ${!discount.active ? 'discount-inactive' : ''} ${isExpired ? 'discount-expired' : ''}">
               <div class="discount-header">
                   <h4>${this.escapeHTML(discount.name)}</h4>
                   <div style="display: flex; align-items: center; gap: 8px;">
                       ${!discount.active ? '<span class="discount-status-badge inactive">Inactive</span>' : ''}
                       ${isExpired ? '<span class="discount-status-badge expired">Expirée</span>' : ''}
                       ${notStarted ? '<span class="discount-status-badge pending">À venir</span>' : ''}
                       ${discount.active && !isExpired && !notStarted ? '<span class="discount-status-badge active">Active</span>' : ''}
                       <span class="discount-value">${discount.type === 'percentage' ? discount.value + '%' : discount.value + ' €'}</span>
                   </div>
               </div>
               <div class="discount-details">
                   <div>Type: ${discount.type === 'percentage' ? 'Pourcentage' : 'Montant fixe'}</div>
                   ${discount.startDate ? `<div>Début: ${this.formatDate(discount.startDate)}</div>` : '<div>Début: Immédiat</div>'}
                   ${discount.endDate ? `<div>Fin: ${this.formatDate(discount.endDate)}</div>` : '<div>Fin: Aucune</div>'}
                   ${discount.description ? `<div style="margin-top: 8px; font-style: italic;">${this.escapeHTML(discount.description)}</div>` : ''}
               </div>
               <div class="discount-actions">
                   <button class="btn btn-sm btn-secondary" data-action="toggle-discount" data-discount-id="${discount.id}">
                       ${discount.active ? 'Désactiver' : 'Activer'}
                   </button>
                   <button class="btn btn-sm btn-danger" data-action="delete-discount" data-discount-id="${discount.id}">Supprimer</button>
               </div>
           </div>
       `;
       }).join('');
       
       this.dom.discountsList.innerHTML = html;
       
       // Attach event listeners for discount actions using event delegation
       // Remove old listeners by cloning the node
       const newDiscountsList = this.dom.discountsList.cloneNode(true);
       this.dom.discountsList.parentNode.replaceChild(newDiscountsList, this.dom.discountsList);
       this.dom.discountsList = newDiscountsList;
       
       this.dom.discountsList.addEventListener('click', (e) => {
           const btn = e.target.closest('[data-action]');
           if (!btn || btn.tagName !== 'BUTTON') return;
           
           const action = btn.dataset.action;
           const discountId = btn.dataset.discountId;
           
           if (!discountId) {
               console.error('Discount ID missing', btn, btn.dataset);
               return;
           }
           
           e.preventDefault();
           e.stopPropagation();
           
           if (action === 'toggle-discount') {
               this.toggleDiscount(discountId);
           } else if (action === 'delete-discount') {
               this.deleteDiscount(discountId);
           }
       });
   }
   
   showAddDiscountModal() {
       const name = prompt('Nom de la remise:');
       if (!name) return;
       
       const type = confirm('Remise en pourcentage ? (OK = %, Annuler = montant fixe)') ? 'percentage' : 'fixed';
       const valueStr = prompt(type === 'percentage' ? 'Pourcentage (ex: 10):' : 'Montant (ex: 5):');
       const value = parseFloat(valueStr);
       
       if (isNaN(value) || value <= 0) {
           this.showToast('Valeur invalide', 'error');
           return;
       }
       
       const discount = {
           id: this.generateId(),
           name: name,
           type: type,
           value: value,
           active: true,
           description: '',
           startDate: null,
           endDate: null,
           createdAt: new Date().toISOString()
       };
       
       this.discounts.push(discount);
       this.saveToStorage();
       this.renderDiscounts();
       this.showToast('Remise ajoutée', 'success');
   }
   
   toggleDiscount(discountId) {
       if (!discountId) {
           console.error('toggleDiscount: discountId is missing');
           return;
       }
       const discount = this.discounts.find(d => d.id === discountId);
       if (!discount) {
           console.error('toggleDiscount: discount not found', discountId, 'Available:', this.discounts.map(d => d.id));
           this.showToast('Remise introuvable', 'error');
           return;
       }
       discount.active = !discount.active;
       this.saveToStorage();
       this.renderDiscounts();
       this.showToast(`Remise "${discount.name}" ${discount.active ? 'activée' : 'désactivée'}`, 'success');
   }
   
   deleteDiscount(discountId) {
       if (!discountId) {
           console.error('deleteDiscount: discountId is missing');
           return;
       }
       const discount = this.discounts.find(d => d.id === discountId);
       if (!discount) {
           console.error('deleteDiscount: discount not found', discountId, 'Available:', this.discounts.map(d => d.id));
           this.showToast('Remise introuvable', 'error');
           return;
       }
       if (!confirm(`Supprimer la remise "${discount.name}" ?`)) return;
       this.discounts = this.discounts.filter(d => d.id !== discountId);
       this.saveToStorage();
       this.renderDiscounts();
       this.showToast('Remise supprimée', 'success');
   }
   
   // ========== REPORTS ==========
   renderReports() {
       if (!this.dom.reportsContent) return;
       this.dom.reportsContent.innerHTML = `
           <div class="reports-info">
               <p>Sélectionnez un type de rapport et cliquez sur "Générer rapport" pour voir les analyses détaillées.</p>
           </div>
       `;
   }
   
   generateReport() {
       if (!this.dom.reportsContent) return;
       const reportType = this.dom.reportTypeSelect?.value || 'sales';
       let reportHTML = '';
       
       switch (reportType) {
           case 'sales':
               reportHTML = this.generateSalesReport();
               break;
           case 'dishes':
               reportHTML = this.generateDishesReport();
               break;
           case 'tables':
               reportHTML = this.generateTablesReport();
               break;
           case 'servers':
               reportHTML = this.generateServersReport();
               break;
           case 'hours':
               reportHTML = this.generateHoursReport();
               break;
       }
       
       this.dom.reportsContent.innerHTML = reportHTML;
   }
   
   generateSalesReport() {
       const today = new Date();
       const startOfDay = new Date(today.setHours(0, 0, 0, 0));
       const todaySales = this.sales.filter(s => new Date(s.timestamp) >= startOfDay);
       const totalRevenue = todaySales.reduce((sum, s) => sum + (s.total || 0), 0);
       const totalOrders = todaySales.length;
       const avgOrder = totalOrders > 0 ? totalRevenue / totalOrders : 0;
       
       return `
           <div class="report-section">
               <h3>Rapport des ventes - ${new Date().toLocaleDateString('fr-FR')}</h3>
               <div class="report-stats">
                   <div class="report-stat-card">
                       <h4>Chiffre d'affaires</h4>
                       <div class="report-stat-value">${totalRevenue.toFixed(2)} €</div>
                   </div>
                   <div class="report-stat-card">
                       <h4>Nombre de commandes</h4>
                       <div class="report-stat-value">${totalOrders}</div>
                   </div>
                   <div class="report-stat-card">
                       <h4>Panier moyen</h4>
                       <div class="report-stat-value">${avgOrder.toFixed(2)} €</div>
                   </div>
               </div>
           </div>
       `;
   }
   
   generateDishesReport() {
       const dishStats = {};
       this.history.forEach(order => {
           order.items.forEach(item => {
               if (!dishStats[item.dish]) {
                   dishStats[item.dish] = { count: 0, revenue: 0 };
               }
               dishStats[item.dish].count += item.qty || 1;
               dishStats[item.dish].revenue += (item.price || 0) * (item.qty || 1);
           });
       });
       
       const sorted = Object.entries(dishStats).sort((a, b) => b[1].count - a[1].count).slice(0, 10);
       
       return `
           <div class="report-section">
               <h3>Top 10 des plats les plus vendus</h3>
               <table class="report-table">
                   <thead><tr><th>Plat</th><th>Quantité</th><th>Revenus</th></tr></thead>
                   <tbody>
                       ${sorted.map(([dish, stats]) => `
                           <tr>
                               <td>${this.escapeHTML(dish)}</td>
                               <td>${stats.count}</td>
                               <td>${stats.revenue.toFixed(2)} €</td>
                           </tr>
                       `).join('')}
                   </tbody>
               </table>
           </div>
       `;
   }
   
   generateTablesReport() {
       const tableStats = {};
       this.history.forEach(order => {
           const table = order.table || 'N/A';
           if (!tableStats[table]) {
               tableStats[table] = { orders: 0, revenue: 0 };
           }
           tableStats[table].orders++;
           tableStats[table].revenue += order.total || 0;
       });
       
       return `
           <div class="report-section">
               <h3>Statistiques par table</h3>
               <table class="report-table">
                   <thead><tr><th>Table</th><th>Commandes</th><th>Revenus</th></tr></thead>
                   <tbody>
                       ${Object.entries(tableStats).map(([table, stats]) => `
                           <tr>
                               <td>${table}</td>
                               <td>${stats.orders}</td>
                               <td>${stats.revenue.toFixed(2)} €</td>
                           </tr>
                       `).join('')}
                   </tbody>
               </table>
           </div>
       `;
   }
   
   generateServersReport() {
       return '<div class="report-section"><h3>Rapport serveurs</h3><p>Fonctionnalité à venir</p></div>';
   }
   
   generateHoursReport() {
       const hourStats = {};
       this.sales.forEach(sale => {
           const hour = new Date(sale.timestamp).getHours();
           if (!hourStats[hour]) {
               hourStats[hour] = { orders: 0, revenue: 0 };
           }
           hourStats[hour].orders++;
           hourStats[hour].revenue += sale.total || 0;
       });
       
       const sortedHours = Object.entries(hourStats).sort((a, b) => parseInt(a[0]) - parseInt(b[0]));
       
       return `
           <div class="report-section">
               <h3>Ventes par heure</h3>
               <table class="report-table">
                   <thead><tr><th>Heure</th><th>Commandes</th><th>Revenus</th></tr></thead>
                   <tbody>
                       ${sortedHours.map(([hour, stats]) => `
                           <tr>
                               <td>${hour}:00</td>
                               <td>${stats.orders}</td>
                               <td>${stats.revenue.toFixed(2)} €</td>
                           </tr>
                       `).join('')}
                   </tbody>
               </table>
           </div>
       `;
   }
   
   exportReportToPDF() {
       const reportContent = this.dom.reportsContent.innerHTML;
       const printWindow = window.open('', '_blank');
       printWindow.document.write(`
           <html>
           <head>
               <title>Rapport Cuisync</title>
               <style>
                   body { font-family: Arial, sans-serif; padding: 20px; }
                   table { width: 100%; border-collapse: collapse; margin: 20px 0; }
                   th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
                   th { background-color: #f2f2f2; }
               </style>
           </head>
           <body>
               <h1>Rapport Cuisync - ${new Date().toLocaleDateString('fr-FR')}</h1>
               ${reportContent}
           </body>
           </html>
       `);
       printWindow.document.close();
       printWindow.print();
   }
   
   // ========== OFFLINE SYNC ==========
   syncOfflineQueue() {
       if (this.offlineQueue.length === 0) return;
       this.offlineQueue.forEach(item => {
           this.broadcastMessage(item.type, item.data);
       });
       this.offlineQueue = [];
       this.saveToStorage();
       this.showToast('Synchronisation terminée', 'success');
   }
}

// HOOK POINTS for Supabase integration:
/*
// 1. Initialize Supabase client
import { createClient } from '@supabase/supabase-js';
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// 2. Replace saveToStorage method
async saveToSupabase() {
   try {
       // Upsert pads
       for (const pad of this.pads) {
           const { error: padError } = await supabase
               .from('pads')
               .upsert(pad);
           
           if (padError) throw padError;
           
           // Upsert items
           for (const item of pad.items) {
               const { error: itemError } = await supabase
                   .from('pad_items')
                   .upsert({ ...item, pad_id: pad.id });
               
               if (itemError) throw itemError;
           }
       }
   } catch (error) {
       console.error('Supabase save error:', error);
       this.showToast('Erreur de synchronisation', 'error');
   }
}

// 3. Replace loadFromStorage method  
async loadFromSupabase() {
   try {
       const { data: pads, error: padsError } = await supabase
           .from('pads')
           .select(`
               *,
               pad_items (*)
           `)
           .order('created_at', { ascending: false });
           
       if (padsError) throw padsError;
       
       this.pads = pads.map(pad => ({
           ...pad,
           items: pad.pad_items || []
       }));
   } catch (error) {
       console.error('Supabase load error:', error);
       this.pads = [];
   }
}

// 4. Add real-time subscriptions
setupRealtimeSubscription() {
   supabase
       .channel('pads-channel')
       .on('postgres_changes', 
           { event: '*', schema: 'public', table: 'pads' },
           () => this.loadFromSupabase().then(() => this.renderViews())
       )
       .subscribe();
}
*/

// Initialize app when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
   window.cuisyncApp = new CuisyncApp();
});