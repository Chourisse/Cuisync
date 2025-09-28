/**
 * Cuisync - Order Management App
 * Local-first with Supabase hooks
 */

class CuisyncApp {
    constructor() {
        this.pads = [];
        this.menu = { categories: [] };
        this.currentView = 'server';
        this.undoStack = [];
        this.isCompactMode = false;
        this.debounceTimer = null;
        
        // DOM elements cache
        this.dom = {};
        this.cacheDOMElements();
        
        this.init();
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
            installAppBtn: document.getElementById('install-app-btn'),
            settingsBtn: document.getElementById('settings-btn'),
            // Filters
            serverFilter: document.getElementById('server-filter'),
            kitchenFilter: document.getElementById('kitchen-filter'),
            hostFilter: document.getElementById('host-filter'),
            
            // Form
            orderForm: document.getElementById('order-form'),
            tableInput: document.getElementById('table-input'),
            dishInput: document.getElementById('dish-input'),
            categorySelect: document.getElementById('category-select'),
            dishSelect: document.getElementById('dish-select'),
            qtyInput: document.getElementById('qty-input'),
            courseInput: document.getElementById('course-input'),
            noteInput: document.getElementById('note-input'),
            priceInput: document.getElementById('price-input'),
            totalInput: document.getElementById('total-input'),
            
            // Menu management
            categoryForm: document.getElementById('category-form'),
            categoryNameInput: document.getElementById('category-name-input'),
            dishForm: document.getElementById('dish-form'),
            dishCategorySelect: document.getElementById('dish-category-select'),
            dishNameInput: document.getElementById('dish-name-input'),
            dishPriceInput: document.getElementById('dish-price-input'),
            dishVatInput: document.getElementById('dish-vat-input'),
            menuList: document.getElementById('menu-list'),
            menuExportBtn: document.getElementById('menu-export-btn'),
            menuImportInput: document.getElementById('menu-import-input'),
            
            // Actions
            sendAllBtn: document.getElementById('send-all-btn'),
            exportBtn: document.getElementById('export-csv-btn'),
            compactModeBtn: document.getElementById('compact-mode-btn'),
            
            // Containers
            serverPadsContainer: document.getElementById('server-pads-container'),
            kitchenPadsContainer: document.getElementById('kitchen-pads-container'),
            hostPadsContainer: document.getElementById('host-pads-container'),
            toastContainer: document.getElementById('toast-container'),
            undoNotification: document.getElementById('undo-notification'),
            undoBtn: document.getElementById('undo-btn'),
            undoMessage: document.getElementById('undo-message'),
            hostExportPaymentsBtn: document.getElementById('host-export-payments-btn'),
            hostResetPaymentsBtn: document.getElementById('host-reset-payments-btn')
        };
    }
    
    init() {
        this.loadFromStorage();
        this.loadMenuFromStorage();
        this.setupEventListeners();
        this.refreshCategoryOptions();
        this.refreshDishOptions();
        this.renderMenuList();
        this.renderViews();
        this.updateSendAllButton();

        this.setupPwaInstall();

        this.loadSettings();
        this.loadFloorPlan();
        
        // Focus first input
        this.dom.tableInput.focus();
    }
    
    setupEventListeners() {
        // View toggle
        this.dom.serverViewBtn.addEventListener('click', () => this.switchView('server'));
        this.dom.kitchenViewBtn.addEventListener('click', () => this.switchView('kitchen'));
        if (this.dom.hostViewBtn) {
            this.dom.hostViewBtn.addEventListener('click', () => this.switchView('host'));
        }
        if (this.dom.settingsBtn) {
            this.dom.settingsBtn.addEventListener('click', () => this.toggleSettings(true));
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
                const vat = this.dom.dishVatInput && this.dom.dishVatInput.value !== '' ? parseFloat(this.dom.dishVatInput.value) : null;
                if (!categoryId || !name || isNaN(price)) return;
                this.addDish(categoryId, name, price, vat);
                this.dom.dishNameInput.value = '';
                this.dom.dishPriceInput.value = '';
                if (this.dom.dishVatInput) this.dom.dishVatInput.value = '';
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
                if (selectedDish && this.dom.priceInput) {
                    this.dom.priceInput.value = selectedDish.price.toFixed(2);
                    // Also mirror name in free text input for visibility
                    this.dom.dishInput.value = selectedDish.name;
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
        this.dom.sendAllBtn.addEventListener('click', () => this.confirmSendAll());
        this.dom.exportBtn.addEventListener('click', () => this.exportToCSV());
        this.dom.compactModeBtn.addEventListener('click', () => this.toggleCompactMode());
        // Menu export/import
        if (this.dom.menuExportBtn) this.dom.menuExportBtn.addEventListener('click', () => this.exportMenu());
        if (this.dom.menuImportInput) this.dom.menuImportInput.addEventListener('change', (e) => this.importMenu(e));

        // Settings panel handlers
        const panel = document.getElementById('settings-panel');
        const closeBtn = document.getElementById('settings-close-btn');
        const saveBtn = document.getElementById('settings-save-btn');
        const backupExportBtn = document.getElementById('backup-export-btn');
        const backupImportInput = document.getElementById('backup-import-input');
        const cloudTestBtn = document.getElementById('cloud-test-btn');
        const printerConnectBtn = document.getElementById('printer-connect-btn');
        const printerTestBtn = document.getElementById('printer-test-btn');
        const printerDisconnectBtn = document.getElementById('printer-disconnect-btn');
        if (closeBtn) closeBtn.addEventListener('click', () => this.toggleSettings(false));
        if (panel) panel.addEventListener('click', (e) => { if (e.target === panel) this.toggleSettings(false); });
        if (saveBtn) saveBtn.addEventListener('click', () => this.saveSettings());
        if (backupExportBtn) backupExportBtn.addEventListener('click', () => this.exportBackup());
        if (backupImportInput) backupImportInput.addEventListener('change', (e) => this.importBackup(e));
        if (cloudTestBtn) cloudTestBtn.addEventListener('click', () => this.setupSupabase());
        if (printerConnectBtn) printerConnectBtn.addEventListener('click', () => this.printerConnect());
        if (printerTestBtn) printerTestBtn.addEventListener('click', () => this.printerTest());
        if (printerDisconnectBtn) printerDisconnectBtn.addEventListener('click', () => this.printerDisconnect());

        // Floor plan handlers
        const floorAddInput = document.getElementById('floor-add-table-input');
        const floorAddBtn = document.getElementById('floor-add-table-btn');
        const floorClearBtn = document.getElementById('floor-clear-tables-btn');
        if (floorAddBtn) floorAddBtn.addEventListener('click', () => {
            const val = parseInt(floorAddInput && floorAddInput.value);
            if (!val || val < 1 || val > 99) { this.showToast('Numéro invalide', 'error'); return; }
            this.addFloorTable(val);
            if (floorAddInput) floorAddInput.value = '';
        });
        if (floorClearBtn) floorClearBtn.addEventListener('click', () => {
            if (!confirm('Vider le plan de salle ?')) return;
            this.floor = [];
            this.saveFloorPlan();
            this.renderFloorPlan();
        });

        if (this.dom.hostExportPaymentsBtn) this.dom.hostExportPaymentsBtn.addEventListener('click', () => this.exportPayments());
        if (this.dom.hostResetPaymentsBtn) this.dom.hostResetPaymentsBtn.addEventListener('click', () => this.resetPayments());
        const perItemVatCheckbox = document.getElementById('host-per-item-vat');
        const dailyReportBtn = document.getElementById('host-daily-report-btn');
        if (perItemVatCheckbox) perItemVatCheckbox.addEventListener('change', () => this.renderViews());
        if (dailyReportBtn) dailyReportBtn.addEventListener('click', () => this.exportDailyReport());

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
            } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === '1') {
                e.preventDefault();
                this.switchView('server');
            } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === '2') {
                e.preventDefault();
                this.switchView('kitchen');
            } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === '3') {
                e.preventDefault();
                this.switchView('host');
            } else if (e.key === 'Escape') {
                this.toggleSettings(false);
            }
        });

        // Filters
        if (this.dom.serverFilter) this.dom.serverFilter.addEventListener('input', () => this.renderServerView());
        if (this.dom.kitchenFilter) this.dom.kitchenFilter.addEventListener('input', () => this.renderKitchenView());
        if (this.dom.hostFilter) this.dom.hostFilter.addEventListener('input', () => this.renderHostView());
    }
    setupPwaInstall() {
        let deferredPrompt = null;
        const btn = this.dom.installAppBtn;
        if (!btn) return;
        window.addEventListener('beforeinstallprompt', (e) => {
            e.preventDefault();
            deferredPrompt = e;
            btn.hidden = false;
        });
        btn.addEventListener('click', async () => {
            if (!deferredPrompt) return;
            btn.disabled = true;
            deferredPrompt.prompt();
            const { outcome } = await deferredPrompt.userChoice;
            if (outcome === 'accepted') {
                this.showToast("Installation lancée", 'success');
                btn.hidden = true;
            } else {
                this.showToast("Installation annulée", 'info');
                btn.disabled = false;
            }
            deferredPrompt = null;
        });
        window.addEventListener('appinstalled', () => {
            this.showToast('Application installée', 'success');
            btn.hidden = true;
        });
    }

    exportMenu() {
        try {
            const data = JSON.stringify(this.menu, null, 2);
            const ts = new Date().toISOString().slice(0,19).replace(/[:.]/g,'-');
            this.downloadFile(data, `cuisync-menu-${ts}.json`, 'application/json');
            this.showToast('Menu exporté', 'success');
        } catch (e) {
            this.showToast('Erreur export menu', 'error');
        }
    }

    importMenu(event) {
        const file = (event.target && event.target.files && event.target.files[0]) || null;
        if (!file) return;
        const reader = new FileReader();
        reader.onload = () => {
            try {
                const data = JSON.parse(reader.result);
                if (!data || typeof data !== 'object' || !Array.isArray(data.categories)) {
                    throw new Error('Format invalide');
                }
                // basic normalization
                data.categories.forEach(cat => {
                    cat.id = cat.id || this.generateId();
                    cat.name = String(cat.name || '').trim();
                    cat.dishes = Array.isArray(cat.dishes) ? cat.dishes : [];
                    cat.dishes.forEach(d => {
                        d.id = d.id || this.generateId();
                        d.name = String(d.name || '').trim();
                        d.price = Number(d.price || 0);
                        if (isNaN(d.price)) d.price = 0;
                        d.vatPct = (typeof d.vatPct === 'number') ? d.vatPct : null;
                    });
                });
                this.menu = { categories: data.categories };
                this.saveMenuToStorage();
                this.refreshCategoryOptions();
                this.refreshDishOptions();
                this.renderMenuList();
                this.showToast('Menu importé', 'success');
            } catch (err) {
                console.error(err);
                this.showToast('Fichier de menu invalide', 'error');
            } finally {
                // reset input
                if (this.dom.menuImportInput) this.dom.menuImportInput.value = '';
            }
        };
        reader.onerror = () => {
            this.showToast('Erreur de lecture du fichier', 'error');
        };
        reader.readAsText(file);
    }

    confirmSendAll() {
        if (this.pads.filter(p => p.status === 'open').length === 0) return;
        if (!confirm('Envoyer toutes les commandes ouvertes en cuisine ?')) return;
        this.sendAllOpenPads();
    }

    // Settings and backup
    toggleSettings(show) {
        const panel = document.getElementById('settings-panel');
        if (!panel) return;
        panel.hidden = !show;
        if (show) this.populateSettingsForm();
    }

    loadSettings() {
        try {
            const raw = localStorage.getItem('cuisync-settings-restaurant');
            this.restaurant = raw ? JSON.parse(raw) : {};
        } catch { this.restaurant = {}; }
    }

    populateSettingsForm() {
        const s = this.restaurant || {};
        const byId = (id) => document.getElementById(id);
        const setVal = (id, val) => { const el = byId(id); if (el) el.value = val || ''; };
        setVal('restaurant-name', s.name);
        setVal('restaurant-address', s.address);
        setVal('restaurant-siret', s.siret);
        setVal('restaurant-vat', s.vat);
        setVal('receipt-footer', s.receiptFooter);
        setVal('cloud-url', s.cloudUrl);
        setVal('cloud-key', s.cloudKey);
    }

    saveSettings() {
        const byId = (id) => document.getElementById(id);
        const val = (id) => (byId(id) && byId(id).value) || '';
        this.restaurant = {
            name: val('restaurant-name'),
            address: val('restaurant-address'),
            siret: val('restaurant-siret'),
            vat: val('restaurant-vat'),
            receiptFooter: val('receipt-footer'),
            cloudUrl: val('cloud-url'),
            cloudKey: val('cloud-key')
        };
        localStorage.setItem('cuisync-settings-restaurant', JSON.stringify(this.restaurant));
        this.showToast('Paramètres enregistrés', 'success');
        this.toggleSettings(false);
        // Setup Supabase if enabled
        this.setupSupabase();
    }

    exportBackup() {
        const payload = {
            version: 1,
            exportedAt: new Date().toISOString(),
            pads: this.pads,
            menu: this.menu,
            payments: this.payments || [],
            settings: this.restaurant || {}
        };
        const data = JSON.stringify(payload, null, 2);
        const ts = new Date().toISOString().slice(0,19).replace(/[:.]/g,'-');
        this.downloadFile(data, `cuisync-backup-${ts}.json`, 'application/json');
        this.showToast('Sauvegarde exportée', 'success');
    }

    importBackup(event) {
        const file = (event.target && event.target.files && event.target.files[0]) || null;
        if (!file) return;
        const reader = new FileReader();
        reader.onload = () => {
            try {
                const data = JSON.parse(reader.result);
                if (!data || typeof data !== 'object') throw new Error('format');
                if (!Array.isArray(data.pads) || !data.menu || !Array.isArray(data.menu.categories)) throw new Error('format');
                this.pads = data.pads;
                this.menu = data.menu;
                this.payments = Array.isArray(data.payments) ? data.payments : [];
                this.restaurant = data.settings || {};
                this.saveToStorage();
                this.saveMenuToStorage();
                localStorage.setItem('cuisync-settings-restaurant', JSON.stringify(this.restaurant));
                this.refreshCategoryOptions();
                this.refreshDishOptions();
                this.renderMenuList();
                this.renderViews();
                this.updateSendAllButton();
                this.showToast('Sauvegarde importée', 'success');
            } catch (e) {
                this.showToast('Fichier de sauvegarde invalide', 'error');
            } finally {
                const input = document.getElementById('backup-import-input');
                if (input) input.value = '';
            }
        };
        reader.onerror = () => this.showToast('Erreur lecture fichier', 'error');
        reader.readAsText(file);
    }

    // Printing via WebUSB (ESC/POS minimal)
    async printerConnect() {
        try {
            this.printer = await navigator.usb.requestDevice({ filters: [] });
            await this.printer.open();
            if (this.printer.configuration === null) await this.printer.selectConfiguration(1);
            await this.printer.claimInterface(0);
            this.showToast('Imprimante connectée', 'success');
        } catch (e) {
            this.showToast('Connexion imprimante échouée', 'error');
        }
    }

    async printerDisconnect() {
        try {
            if (this.printer) {
                await this.printer.close();
                this.printer = null;
            }
            this.showToast('Imprimante déconnectée', 'info');
        } catch {}
    }

    async printerSend(data) {
        if (!this.printer) { this.showToast('Aucune imprimante', 'error'); return; }
        // Try endpoint 1, out
        await this.printer.transferOut(1, data);
    }

    encoder(text) {
        const simplified = text
            .replace(/[éèêë]/g,'e')
            .replace(/[àâä]/g,'a')
            .replace(/[îï]/g,'i')
            .replace(/[ôö]/g,'o')
            .replace(/[ûü]/g,'u')
            .replace(/[ç]/g,'c');
        return new TextEncoder().encode(simplified);
    }

    async printerTest() {
        const cmds = [];
        cmds.push(this.encoder('\x1B@')); // init
        cmds.push(this.encoder('*** TEST CUISYNC ***\n\n'));
        cmds.push(this.encoder('Merci !\n\n\n\n'));
        cmds.push(this.encoder('\x1DV\x41\x03')); // cut
        await this.printerSend(this.concatUint8(cmds));
    }

    concatUint8(chunks) {
        const size = chunks.reduce((s, c) => s + c.length, 0);
        const out = new Uint8Array(size);
        let offset = 0;
        for (const c of chunks) { out.set(c, offset); offset += c.length; }
        return out;
    }
    
    // HOOK POINT: Replace with Supabase persistence
    // supabase.from('pads').insert(pad).then(...)
    saveToStorage() {
        clearTimeout(this.debounceTimer);
        this.debounceTimer = setTimeout(() => {
            try {
                localStorage.setItem('cuisync-pads', JSON.stringify(this.pads));
                localStorage.setItem('cuisync-settings', JSON.stringify({
                    compactMode: this.isCompactMode
                }));
                localStorage.setItem('cuisync-menu', JSON.stringify(this.menu));
                localStorage.setItem('cuisync-payments', JSON.stringify(this.payments || []));
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
                this.isCompactMode = settings.compactMode || false;
            }

            const savedPayments = localStorage.getItem('cuisync-payments');
            this.payments = savedPayments ? JSON.parse(savedPayments) : [];
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
        
        if (view === 'server') {
            this.dom.serverView.classList.add('active');
            this.dom.kitchenView.classList.remove('active');
            if (this.dom.hostView) this.dom.hostView.classList.remove('active');
            this.dom.serverViewBtn.classList.add('active');
            this.dom.kitchenViewBtn.classList.remove('active');
            if (this.dom.hostViewBtn) this.dom.hostViewBtn.classList.remove('active');
            this.dom.serverViewBtn.setAttribute('aria-pressed', 'true');
            this.dom.kitchenViewBtn.setAttribute('aria-pressed', 'false');
            if (this.dom.hostViewBtn) this.dom.hostViewBtn.setAttribute('aria-pressed', 'false');
        } else if (view === 'kitchen') {
            this.dom.kitchenView.classList.add('active');
            this.dom.serverView.classList.remove('active');
            if (this.dom.hostView) this.dom.hostView.classList.remove('active');
            this.dom.kitchenViewBtn.classList.add('active');
            this.dom.serverViewBtn.classList.remove('active');
            if (this.dom.hostViewBtn) this.dom.hostViewBtn.classList.remove('active');
            this.dom.kitchenViewBtn.setAttribute('aria-pressed', 'true');
            this.dom.serverViewBtn.setAttribute('aria-pressed', 'false');
            if (this.dom.hostViewBtn) this.dom.hostViewBtn.setAttribute('aria-pressed', 'false');
        } else if (view === 'host') {
            if (this.dom.hostView) this.dom.hostView.classList.add('active');
            this.dom.serverView.classList.remove('active');
            this.dom.kitchenView.classList.remove('active');
            if (this.dom.hostViewBtn) this.dom.hostViewBtn.classList.add('active');
            this.dom.serverViewBtn.classList.remove('active');
            this.dom.kitchenViewBtn.classList.remove('active');
            if (this.dom.hostViewBtn) this.dom.hostViewBtn.setAttribute('aria-pressed', 'true');
            this.dom.serverViewBtn.setAttribute('aria-pressed', 'false');
            this.dom.kitchenViewBtn.setAttribute('aria-pressed', 'false');
        }
        
        this.renderViews();
    }
    
    handleFormSubmit() {
        if (!this.validateForm()) return;
        
        const tableNum = parseInt(this.dom.tableInput.value);
        let dish = this.dom.dishInput.value.trim();
        const qty = parseInt(this.dom.qtyInput.value);
        const course = this.dom.courseInput.value;
        const note = this.dom.noteInput.value.trim();
        const selectedCategory = this.getSelectedCategory();
        const selectedDish = this.getSelectedDish();
        const price = this.dom.priceInput && this.dom.priceInput.value !== '' ? parseFloat(this.dom.priceInput.value) : (selectedDish ? selectedDish.price : null);
        if (selectedDish) {
            dish = selectedDish.name;
        }
        
        this.addItemToPad(tableNum, dish, qty, course, note, {
            categoryName: selectedCategory ? selectedCategory.name : null,
            price: price !== null && !isNaN(price) ? price : null
        });
        this.recalculateTotal();
        this.clearForm();
        this.dom.tableInput.focus();
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
        
        // Keep table number for convenience
        // this.dom.tableInput.value = '';
    }
    
    addItemToPad(tableNum, dish, qty, course, note, extra = {}) {
        let pad = this.pads.find(p => p.table === tableNum && p.status === 'open');
        
        if (!pad) {
            pad = {
                id: this.generateId(),
                table: tableNum,
                status: 'open',
                items: [],
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString()
            };
            this.pads.push(pad);
        }
        
        const item = {
            id: this.generateId(),
            dish,
            qty,
            course,
            note: note || null,
            price: typeof extra.price === 'number' ? extra.price : null,
            category: extra.categoryName || null,
            createdAt: new Date().toISOString()
        };
        
        pad.items.push(item);
        pad.updatedAt = new Date().toISOString();
        
        this.saveToStorage();
        this.renderViews();
        this.updateSendAllButton();
        
        this.showToast(`${dish} ajouté à la table ${tableNum}`, 'success');
        this.playNotificationSound();
    }

    recalculateTotal() {
        if (!this.dom.totalInput) return;
        const qty = parseFloat(this.dom.qtyInput && this.dom.qtyInput.value ? this.dom.qtyInput.value : '0');
        const price = parseFloat(this.dom.priceInput && this.dom.priceInput.value ? this.dom.priceInput.value : '0');
        const total = (isNaN(qty) ? 0 : qty) * (isNaN(price) ? 0 : price);
        this.dom.totalInput.value = total.toFixed(2);
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

    addDish(categoryId, name, price, vatPct = null) {
        const category = this.menu.categories.find(c => c.id === categoryId);
        if (!category) return;
        const exists = category.dishes.some(d => d.name.toLowerCase() === name.toLowerCase());
        if (exists) {
            this.showToast('Plat existe déjà dans cette catégorie', 'info');
            return;
        }
        category.dishes.push({ id: this.generateId(), name, price, vatPct: (typeof vatPct === 'number' && !isNaN(vatPct)) ? vatPct : null });
        this.saveMenuToStorage();
        this.refreshDishOptions();
        this.renderMenuList();
        this.showToast('Plat ajouté', 'success');
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
                    opt.textContent = dish.name;
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
   }
   
   sendPad(padId) {
       const pad = this.pads.find(p => p.id === padId);
       if (!pad) return;
       if (pad.status === 'open') {
           const ok = confirm(`Envoyer la table ${pad.table} en cuisine ?`);
           if (!ok) return;
       }
       
       const oldState = { ...pad };
       
       pad.status = 'sent';
       pad.sentAt = new Date().toISOString();
       pad.updatedAt = new Date().toISOString();
       
       this.undoStack.push({
           type: 'sendPad',
           data: oldState
       });
       
       this.saveToStorage();
       this.renderViews();
       this.updateSendAllButton();
       
       this.showToast(`Table ${pad.table} envoyée en cuisine`, 'success');
       this.playNotificationSound();
       this.showUndoNotification('Commande envoyée');
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
       
       this.saveToStorage();
       this.renderViews();
       
       this.showToast(`Table ${pad.table} prête à servir`, 'success');
       this.playNotificationSound();
       this.vibrate();
       this.showUndoNotification('Commande marquée prête');
   }
   
   markPadServed(padId) {
       const padIndex = this.pads.findIndex(p => p.id === padId);
       if (padIndex === -1) return;
       
       const pad = this.pads[padIndex];
       const oldState = { ...pad, _index: padIndex };
       
       this.pads.splice(padIndex, 1);
       
       this.undoStack.push({
           type: 'markServed',
           data: oldState
       });
       
       this.saveToStorage();
       this.renderViews();
       
       this.showToast(`Table ${pad.table} servie`, 'success');
       this.showUndoNotification('Commande servie');
   }
   
   deletePad(padId) {
       const padIndex = this.pads.findIndex(p => p.id === padId);
       if (padIndex === -1) return;
       if (!confirm('Supprimer cette commande ?')) return;
       
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
   
   toggleCompactMode() {
       this.isCompactMode = !this.isCompactMode;
       this.dom.compactModeBtn.setAttribute('aria-pressed', this.isCompactMode.toString());
       this.dom.compactModeBtn.textContent = this.isCompactMode ? 'Mode normal' : 'Mode compact';
       
       if (this.isCompactMode) {
           this.dom.kitchenPadsContainer.classList.add('compact');
       } else {
           this.dom.kitchenPadsContainer.classList.remove('compact');
       }
       
       this.saveToStorage();
   }
   
   renderViews() {
       this.renderServerView();
       this.renderKitchenView();
        this.renderHostView();
        this.renderFloorPlan();
   }

    renderMenuList() {
        if (!this.dom.menuList) return;
        const categories = this.menu.categories;
        if (!categories || categories.length === 0) {
            this.dom.menuList.innerHTML = '<div class="empty-state"><p>Aucune catégorie/plat enregistrés</p></div>';
            return;
        }
        const html = categories.map(cat => {
            const dishes = cat.dishes || [];
            const chips = dishes.length ? dishes.map(d => `<span class=\"menu-chip\">${this.escapeHTML(d.name)} — ${Number(d.price).toFixed(2)} €${typeof d.vatPct === 'number' ? ` (TVA ${d.vatPct.toFixed(1)}%)` : ''}</span>`).join(' ') : '<span class=\"menu-chip\">(aucun plat)</span>';
            return `
                <div class=\"menu-category\">
                    <h4>${this.escapeHTML(cat.name)}</h4>
                    <div class=\"menu-dishes\">${chips}</div>
                </div>
            `;
        }).join('');
        this.dom.menuList.innerHTML = html;
    }
   
   renderServerView() {
       const container = this.dom.serverPadsContainer;
        let pads = this.pads.filter(p => p.status !== 'served');
        const q = (this.dom.serverFilter && this.dom.serverFilter.value || '').trim();
        if (q) {
            pads = pads.filter(p => String(p.table).includes(q));
        }
       
       if (pads.length === 0) {
           container.innerHTML = '<div class="empty-state"><p>Aucune commande en cours</p></div>';
           return;
       }
       
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
                   case 'served':
                       this.markPadServed(padId);
                       break;
               }
           });
       });
   }
   
   renderKitchenView() {
       const container = this.dom.kitchenPadsContainer;
        let pads = this.pads.filter(p => p.status === 'sent' || p.status === 'ready');
        const q = (this.dom.kitchenFilter && this.dom.kitchenFilter.value || '').trim();
        if (q) pads = pads.filter(p => String(p.table).includes(q));
       
       if (pads.length === 0) {
           container.innerHTML = '<div class="empty-state"><p>Aucune commande envoyée</p></div>';
           return;
       }
        
       
       // Sort by status (sent first, then ready)
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

   calculatePadTotal(pad) {
       let total = 0;
       pad.items.forEach(item => {
           if (typeof item.price === 'number' && !isNaN(item.price)) {
               const qty = isNaN(item.qty) ? 0 : Number(item.qty);
               total += qty * item.price;
           }
       });
       return total;
   }

   renderHostView() {
       const container = this.dom.hostPadsContainer;
       if (!container) return;
       let pads = this.pads.filter(p => p.status === 'sent' || p.status === 'ready');
       const q = (this.dom.hostFilter && this.dom.hostFilter.value || '').trim();
       if (q) pads = pads.filter(p => String(p.table).includes(q));
       if (pads.length === 0) {
           container.innerHTML = '<div class="empty-state"><p>Aucune commande à encaisser</p></div>';
           return;
       }

       // Sort: ready first, then sent, then by time
       pads.sort((a, b) => {
           if (a.status === 'ready' && b.status === 'sent') return -1;
           if (a.status === 'sent' && b.status === 'ready') return 1;
           return new Date(a.updatedAt || a.createdAt) - new Date(b.updatedAt || b.createdAt);
       });

        container.innerHTML = pads.map(pad => {
            const itemsHTML = pad.items.map(item => `
                <div class="pad-item">
                    <input type="checkbox" class="item-select" data-item-id="${item.id}" aria-label="Sélectionner ${this.escapeHTML(item.dish)}">
                    <div class="item-details">
                        <h4>${this.escapeHTML(item.dish)}</h4>
                        <div class="item-meta">
                            <span>x${item.qty}</span>
                            ${typeof item.price === 'number' ? `<span>•</span><span>${item.price.toFixed(2)} €</span>` : ''}
                        </div>
                    </div>
                    <div class="item-qty">${(typeof item.price === 'number') ? (item.qty * item.price).toFixed(2) + ' €' : ''}</div>
                </div>
            `).join('');
            return `
                <div class="pad status-${pad.status}" data-pad-id="${pad.id}">
                    <div class="pad-header">
                        <h3>Table ${pad.table}</h3>
                        <span class="pad-status ${pad.status}">${pad.status === 'ready' ? 'Prêt' : 'Envoyé'}</span>
                    </div>
                    <div class="checkout-controls">
                        <div class="controls-row">
                            <label>TVA % <input type="number" class="tva-input" value="10" min="0" max="100" step="0.5"></label>
                            <label>Remise % <input type="number" class="discount-pct-input" value="0" min="0" max="100" step="0.5"></label>
                            <label>Remise € <input type="number" class="discount-amt-input" value="0" min="0" step="0.01"></label>
                            <label>Pourboire % <input type="number" class="tip-pct-input" value="0" min="0" max="100" step="0.5"></label>
                            <label>Personnes <input type="number" class="people-input" value="1" min="1" step="1"></label>
                        </div>
                        <div class="controls-help">Sélectionnez des articles ci-dessous pour un encaissement partiel (sinon: tout).</div>
                    </div>
                    <div class="pad-items">${itemsHTML}</div>
                    <div class="checkout-summary">
                        <div class="checkout-row"><span>Sous-total</span><strong class="subtotal-amount">0.00 €</strong></div>
                        <div class="checkout-row"><span>Remise</span><strong class="discount-amount">-0.00 €</strong></div>
                        <div class="checkout-row"><span>TVA</span><strong class="tva-amount">0.00 €</strong></div>
                        <div class="checkout-row"><span>Pourboire</span><strong class="tip-amount">0.00 €</strong></div>
                        <div class="checkout-row"><span>Total</span><strong class="total-amount">0.00 €</strong></div>
                        <div class="checkout-row"><span>Par personne</span><strong class="perperson-amount">0.00 €</strong></div>
                    </div>
                    <div class="payment-panel">
                        <label>Moyen 
                            <select class="pay-method">
                                <option value="cash">Espèces</option>
                                <option value="card">CB</option>
                                <option value="other">Autre</option>
                            </select>
                        </label>
                        <label>Reçu # <input type="text" class="pay-receipt" placeholder="auto"></label>
                        <label>Reçu à <input type="datetime-local" class="pay-datetime"></label>
                        <div class="payment-inline">
                            <label>Reçu (€) <input type="number" class="pay-tendered" min="0" step="0.01" placeholder="0.00"></label>
                            <span class="pay-change">Rendu: 0.00 €</span>
                        </div>
                    </div>
                    <div class="pad-actions">
                        <button class="btn btn-primary btn-sm" data-action="pay" data-pad-id="${pad.id}">Encaisser</button>
                        <button class="btn btn-secondary btn-sm" data-action="print" data-pad-id="${pad.id}">Imprimer</button>
                        <button class="btn btn-outline btn-sm" data-action="print-client" data-pad-id="${pad.id}">Ticket client</button>
                    </div>
                </div>
            `;
        }).join('');

        const updateSummary = (padEl) => {
            const padId = padEl.getAttribute('data-pad-id');
            const pad = this.pads.find(p => p.id === padId);
            if (!pad) return;
            const selectedIds = Array.from(padEl.querySelectorAll('.item-select:checked')).map(cb => cb.getAttribute('data-item-id'));
            const items = pad.items.filter(it => selectedIds.length === 0 || selectedIds.includes(it.id));
            const subtotal = items.reduce((acc, it) => acc + (typeof it.price === 'number' ? (Number(it.qty) * it.price) : 0), 0);
            const uiTvaPct = parseFloat(padEl.querySelector('.tva-input').value || '0');
            const discPct = parseFloat(padEl.querySelector('.discount-pct-input').value || '0');
            const discAmtFixed = parseFloat(padEl.querySelector('.discount-amt-input').value || '0');
            const tipPct = parseFloat(padEl.querySelector('.tip-pct-input').value || '0');
            const people = Math.max(1, parseInt(padEl.querySelector('.people-input').value || '1'));
            const discountFromPct = subtotal * (isNaN(discPct) ? 0 : discPct / 100);
            const discount = Math.min(subtotal, (isNaN(discountFromPct) ? 0 : discountFromPct) + (isNaN(discAmtFixed) ? 0 : discAmtFixed));
            const baseHt = Math.max(0, subtotal - discount);
            const perItemVat = (document.getElementById('host-per-item-vat') || {}).checked;
            let tva = 0;
            if (perItemVat) {
                tva = items.reduce((acc, it) => {
                    const vatPct = (this.findDishVatPct(it) ?? uiTvaPct);
                    const line = (typeof it.price === 'number' ? (Number(it.qty) * it.price) : 0);
                    const lineHtProportion = baseHt === 0 ? 0 : (line / subtotal) * baseHt;
                    return acc + lineHtProportion * (isNaN(vatPct) ? 0 : vatPct / 100);
                }, 0);
            } else {
                tva = baseHt * (isNaN(uiTvaPct) ? 0 : uiTvaPct / 100);
            }
            const totalTtc = baseHt + tva;
            const tip = totalTtc * (isNaN(tipPct) ? 0 : tipPct / 100);
            const grand = totalTtc + tip;
            const perPerson = grand / people;
            const setText = (sel, val) => padEl.querySelector(sel).textContent = `${val.toFixed(2)} €`;
            setText('.subtotal-amount', subtotal);
            setText('.discount-amount', -discount);
            setText('.tva-amount', tva);
            setText('.tip-amount', tip);
            setText('.total-amount', grand);
            setText('.perperson-amount', perPerson);
            // change for cash
            const tenderedEl = padEl.querySelector('.pay-tendered');
            const changeEl = padEl.querySelector('.pay-change');
            const tendered = parseFloat(tenderedEl && tenderedEl.value ? tenderedEl.value : '0');
            const change = (isNaN(tendered) ? 0 : tendered) - grand;
            if (changeEl) changeEl.textContent = `Rendu: ${change.toFixed(2)} €`;
        };

        container.querySelectorAll('.pad.status-sent, .pad.status-ready, .pad[data-pad-id]').forEach(padEl => {
            padEl.querySelectorAll('.item-select, .tva-input, .discount-pct-input, .discount-amt-input, .tip-pct-input, .people-input, .pay-tendered').forEach(input => {
                input.addEventListener('input', () => updateSummary(padEl));
                input.addEventListener('change', () => updateSummary(padEl));
            });
            updateSummary(padEl);
        });

        container.querySelectorAll('[data-action]').forEach(btn => {
           btn.addEventListener('click', (e) => {
               const action = e.target.dataset.action;
               const padId = e.target.dataset.padId;
                const padEl = e.target.closest('.pad');
                if (action === 'pay') {
                    const pad = this.pads.find(p => p.id === padId);
                    if (!pad) return;
                    const selectedIds = Array.from(padEl.querySelectorAll('.item-select:checked')).map(cb => cb.getAttribute('data-item-id'));
                    const tvaPct = parseFloat(padEl.querySelector('.tva-input').value || '0');
                    const discPct = parseFloat(padEl.querySelector('.discount-pct-input').value || '0');
                    const discAmtFixed = parseFloat(padEl.querySelector('.discount-amt-input').value || '0');
                    const tipPct = parseFloat(padEl.querySelector('.tip-pct-input').value || '0');
                    const people = Math.max(1, parseInt(padEl.querySelector('.people-input').value || '1'));
                    const method = (padEl.querySelector('.pay-method') || {}).value || 'cash';
                    const receipt = (padEl.querySelector('.pay-receipt') || {}).value || `R${Date.now()}`;
                    const when = (padEl.querySelector('.pay-datetime') || {}).value || new Date().toISOString();
                    const subtotalText = padEl.querySelector('.subtotal-amount').textContent;
                    const totalText = padEl.querySelector('.total-amount').textContent;
                    const parseEuro = (t) => parseFloat(String(t).replace(/[^\d.,-]/g,'').replace(',','.')) || 0;
                    const subtotal = parseEuro(subtotalText);
                    const total = parseEuro(totalText);
                    const tendered = parseFloat((padEl.querySelector('.pay-tendered') || {}).value || '0') || 0;
                    const change = tendered - total;
                    const paidItems = pad.items.filter(it => selectedIds.length === 0 || selectedIds.includes(it.id));
                    // record payment
                    this.payments = this.payments || [];
                    this.payments.push({
                        id: this.generateId(), padId: pad.id, table: pad.table, method, receipt,
                        when, subtotal, total, tvaPct, discPct, discAmtFixed, tipPct, people,
                        tendered, change, itemCount: paidItems.length
                    });
                    // apply encaissement
                    if (selectedIds.length === 0) {
                        this.markPadServed(padId);
                    } else {
                        pad.items = pad.items.filter(it => !selectedIds.includes(it.id));
                        if (pad.items.length === 0) {
                            this.markPadServed(padId);
                        } else {
                            pad.updatedAt = new Date().toISOString();
                            this.saveToStorage();
                            this.renderViews();
                            this.showToast('Articles encaissés', 'success');
                        }
                    }
               } else if (action === 'print') {
                    const pad = this.pads.find(p => p.id === padId);
                    if (!pad) return;
                    const padEl = e.target.closest('.pad');
                    const selectedIds = Array.from(padEl.querySelectorAll('.item-select:checked')).map(cb => cb.getAttribute('data-item-id'));
                    const tvaPct = parseFloat(padEl.querySelector('.tva-input').value || '0');
                    const discPct = parseFloat(padEl.querySelector('.discount-pct-input').value || '0');
                    const discAmtFixed = parseFloat(padEl.querySelector('.discount-amt-input').value || '0');
                    const tipPct = parseFloat(padEl.querySelector('.tip-pct-input').value || '0');
                    const people = Math.max(1, parseInt(padEl.querySelector('.people-input').value || '1'));
                    const method = (padEl.querySelector('.pay-method') || {}).value || 'cash';
                    const receipt = (padEl.querySelector('.pay-receipt') || {}).value || '';
                   this.printPad(padId, { selectedIds, tvaPct, discPct, discAmtFixed, tipPct, people, method, receipt });
               } else if (action === 'print-client') {
                    const pad = this.pads.find(p => p.id === padId);
                    if (!pad) return;
                    const selectedIds = Array.from(padEl.querySelectorAll('.item-select:checked')).map(cb => cb.getAttribute('data-item-id'));
                    const tvaPct = parseFloat(padEl.querySelector('.tva-input').value || '0');
                    const discPct = parseFloat(padEl.querySelector('.discount-pct-input').value || '0');
                    const discAmtFixed = parseFloat(padEl.querySelector('.discount-amt-input').value || '0');
                    const tipPct = parseFloat(padEl.querySelector('.tip-pct-input').value || '0');
                    const people = Math.max(1, parseInt(padEl.querySelector('.people-input').value || '1'));
                    this.printClientTicket(padId, { selectedIds, tvaPct, discPct, discAmtFixed, tipPct, people });
               }
           });
       });
   }

    printPad(padId, opts = {}) {
        const pad = this.pads.find(p => p.id === padId);
        if (!pad) return;
        const useItems = pad.items.filter(it => !opts.selectedIds || opts.selectedIds.length === 0 || opts.selectedIds.includes(it.id));
        const subtotal = useItems.reduce((acc, it) => acc + (typeof it.price === 'number' ? (Number(it.qty) * it.price) : 0), 0);
        const discPct = Number(opts.discPct || 0);
        const discAmtFixed = Number(opts.discAmtFixed || 0);
        const tvaPct = Number(opts.tvaPct || 0);
        const tipPct = Number(opts.tipPct || 0);
        const people = Math.max(1, Number(opts.people || 1));
        const discountFromPct = subtotal * (isNaN(discPct) ? 0 : discPct / 100);
        const discount = Math.min(subtotal, (isNaN(discountFromPct) ? 0 : discountFromPct) + (isNaN(discAmtFixed) ? 0 : discAmtFixed));
        const baseHt = Math.max(0, subtotal - discount);
        const tva = baseHt * (isNaN(tvaPct) ? 0 : tvaPct / 100);
        const totalTtc = baseHt + tva;
        const tip = totalTtc * (isNaN(tipPct) ? 0 : tipPct / 100);
        const grand = totalTtc + tip;
        const perPerson = grand / people;
        const rows = useItems.map(item => `
           <tr>
               <td>${this.escapeHTML(item.dish)}</td>
               <td style="text-align:center;">${item.qty}</td>
               <td style="text-align:right;">${typeof item.price === 'number' ? item.price.toFixed(2) : '-'}</td>
               <td style="text-align:right;">${typeof item.price === 'number' ? (item.qty * item.price).toFixed(2) : '-'}</td>
           </tr>
       `).join('');
       const win = window.open('', '_blank');
       if (!win) return;
       win.document.write(`
           <html><head><title>Note - Table ${pad.table}</title>
           <meta charset="utf-8">
           <style>
               body { font-family: Arial, sans-serif; padding: 16px; }
               h1 { font-size: 18px; margin-bottom: 12px; }
               table { width: 100%; border-collapse: collapse; }
               th, td { padding: 6px 4px; border-bottom: 1px solid #ddd; font-size: 14px; }
                tfoot td { font-weight: bold; }
                .right { text-align: right; }
           </style>
           </head><body>
            <h1>Cuisync — Table ${pad.table}</h1>
            <div style="margin-bottom:8px; font-size:13px;">
                ${opts && opts.method ? `Paiement: ${opts.method.toUpperCase()} • ` : ''}
                ${opts && opts.receipt ? `Reçu: ${opts.receipt} • ` : ''}
                ${new Date().toLocaleString('fr-FR')}
            </div>
           <table>
               <thead><tr><th>Article</th><th>Qté</th><th>Prix</th><th>Sous-total</th></tr></thead>
                <tbody>${rows}</tbody>
                <tfoot>
                    <tr><td colspan="3" class="right">Sous-total</td><td class="right">${subtotal.toFixed(2)} €</td></tr>
                    <tr><td colspan="3" class="right">Remise</td><td class="right">-${discount.toFixed(2)} €</td></tr>
                    <tr><td colspan="3" class="right">TVA (${tvaPct.toFixed(2)}%)</td><td class="right">${tva.toFixed(2)} €</td></tr>
                    <tr><td colspan="3" class="right">Pourboire (${tipPct.toFixed(2)}%)</td><td class="right">${tip.toFixed(2)} €</td></tr>
                    <tr><td colspan="3" class="right"><strong>Total</strong></td><td class="right"><strong>${grand.toFixed(2)} €</strong></td></tr>
                    <tr><td colspan="3" class="right">Par personne (${people})</td><td class="right">${perPerson.toFixed(2)} €</td></tr>
                </tfoot>
           </table>
           <script>window.onload = () => { window.print(); setTimeout(() => window.close(), 300); }<\/script>
           </body></html>
       `);
       win.document.close();
   }

   async printClientTicket(padId, opts = {}) {
       const pad = this.pads.find(p => p.id === padId);
       if (!pad) return;
       if (!this.printer) { this.showToast('Connectez une imprimante', 'error'); return; }
        const useItems = pad.items.filter(it => !opts.selectedIds || opts.selectedIds.length === 0 || opts.selectedIds.includes(it.id));
        const subtotal = useItems.reduce((acc, it) => acc + (typeof it.price === 'number' ? (Number(it.qty) * it.price) : 0), 0);
        const discPct = Number(opts.discPct || 0);
        const discAmtFixed = Number(opts.discAmtFixed || 0);
        const tvaPct = Number(opts.tvaPct || 0);
        const tipPct = Number(opts.tipPct || 0);
        const people = Math.max(1, Number(opts.people || 1));
        const discountFromPct = subtotal * (isNaN(discPct) ? 0 : discPct / 100);
        const discount = Math.min(subtotal, (isNaN(discountFromPct) ? 0 : discountFromPct) + (isNaN(discAmtFixed) ? 0 : discAmtFixed));
        const baseHt = Math.max(0, subtotal - discount);
        const tva = baseHt * (isNaN(tvaPct) ? 0 : tvaPct / 100);
        const totalTtc = baseHt + tva;
        const tip = totalTtc * (isNaN(tipPct) ? 0 : tipPct / 100);
        const grand = totalTtc + tip;

        const cmds = [];
        cmds.push(this.encoder('\x1B@'));
        cmds.push(this.encoder('\x1B!\x20'));
        const r = this.restaurant || {};
        if (r.name) cmds.push(this.encoder(`${r.name}\n`));
        if (r.address) cmds.push(this.encoder(`${r.address}\n`));
        if (r.siret) cmds.push(this.encoder(`SIRET: ${r.siret}\n`));
        if (r.vat) cmds.push(this.encoder(`TVA: ${r.vat}\n`));
        cmds.push(this.encoder(`Table ${pad.table} - ${new Date().toLocaleString('fr-FR')}\n`));
        cmds.push(this.encoder('------------------------------\n'));
        for (const it of useItems) {
            const price = (typeof it.price === 'number') ? it.price.toFixed(2) : '-';
            const line = `${String(it.qty).padStart(2,' ')} x ${it.dish}`;
            cmds.push(this.encoder(line + '\n'));
            if (typeof it.price === 'number') cmds.push(this.encoder(`    ${price} €   ${(it.qty * it.price).toFixed(2)} €\n`));
        }
        cmds.push(this.encoder('------------------------------\n'));
        cmds.push(this.encoder(`Sous-total: ${subtotal.toFixed(2)} €\n`));
        cmds.push(this.encoder(`Remise: -${discount.toFixed(2)} €\n`));
        cmds.push(this.encoder(`TVA (${tvaPct.toFixed(2)}%): ${tva.toFixed(2)} €\n`));
        cmds.push(this.encoder(`Total: ${grand.toFixed(2)} €\n`));
        cmds.push(this.encoder(`Par personne (${people}): ${(grand/people).toFixed(2)} €\n`));
        if (r.receiptFooter) cmds.push(this.encoder(`\n${r.receiptFooter}\n`));
        cmds.push(this.encoder('\n\n\x1DV\x41\x03'));
        await this.printerSend(this.concatUint8(cmds));
        this.showToast('Ticket client imprimé', 'success');
   }
   
   renderPadHTML(pad, view) {
       const statusText = {
           'open': 'Ouvert',
           'sent': 'Envoyé',
           'ready': 'Prêt'
       };
       
       const itemsHTML = pad.items.map(item => `
           <div class="pad-item">
               <div class="item-details">
                   <h4>${this.escapeHTML(item.dish)}</h4>
                   <div class="item-meta">
                       <span>${item.course}</span>
                       ${item.category ? `<span>•</span><span>${this.escapeHTML(item.category)}</span>` : ''}
                       ${typeof item.price === 'number' ? `<span>•</span><span>${item.price.toFixed(2)} €</span>` : ''}
                       ${item.note ? `<span>•</span><span class="item-note">${this.escapeHTML(item.note)}</span>` : ''}
                   </div>
               </div>
               <div class="item-qty">${item.qty}</div>
           </div>
       `).join('');
       
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
                   <button class="btn btn-primary btn-sm" data-action="ready" data-pad-id="${pad.id}">
                       Marquer prêt
                   </button>
                  <button class="btn btn-secondary btn-sm" data-action="print-kitchen" data-pad-id="${pad.id}">
                      Bon cuisine
                  </button>
               `;
           }
       }
       
       return `
           <div class="pad status-${pad.status}">
               <div class="pad-header">
                   <h3>Table ${pad.table}</h3>
                   <span class="pad-status ${pad.status}">${statusText[pad.status]}</span>
               </div>
               <div class="pad-items">
                   ${itemsHTML}
               </div>
               ${actionsHTML ? `<div class="pad-actions">${actionsHTML}</div>` : ''}
           </div>
       `;
   }

   async printKitchenTicket(padId) {
       const pad = this.pads.find(p => p.id === padId);
       if (!pad) return;
       if (!this.printer) { this.showToast('Connectez une imprimante', 'error'); return; }
       const cmds = [];
       cmds.push(this.encoder('\x1B@'));
       cmds.push(this.encoder('\x1B!\x38')); // double height+width bold
       cmds.push(this.encoder(`TABLE ${pad.table}\n`));
       cmds.push(this.encoder('\x1B!\x00'));
       cmds.push(this.encoder(`${new Date().toLocaleString('fr-FR')}\n`));
       cmds.push(this.encoder('------------------------------\n'));
       for (const it of pad.items) {
           cmds.push(this.encoder(`${String(it.qty).padStart(2,' ')} x ${it.dish}\n`));
           if (it.note) cmds.push(this.encoder(`   * ${it.note}\n`));
       }
       cmds.push(this.encoder('\n\n'));
       cmds.push(this.encoder('\x1DV\x41\x03'));
       await this.printerSend(this.concatUint8(cmds));
       this.showToast('Bon cuisine imprimé', 'success');
   }
   
   updateSendAllButton() {
       const openPads = this.pads.filter(p => p.status === 'open');
       this.dom.sendAllBtn.disabled = openPads.length === 0;
       this.dom.sendAllBtn.textContent = `Envoyer les commandes ouvertes (${openPads.length})`;
   }

    // Floor plan
    loadFloorPlan() {
        try { this.floor = JSON.parse(localStorage.getItem('cuisync-floor') || '[]'); }
        catch { this.floor = []; }
    }
    saveFloorPlan() {
        localStorage.setItem('cuisync-floor', JSON.stringify(this.floor || []));
    }
    addFloorTable(table) {
        if (!this.floor.some(t => t.table === table)) {
            this.floor.push({ table, occupied: false });
            this.floor.sort((a,b) => a.table - b.table);
            this.saveFloorPlan();
            this.renderFloorPlan();
        } else {
            this.showToast('Table déjà présente', 'info');
        }
    }
    toggleFloorOccupancy(table, occupied) {
        const t = this.floor.find(t => t.table === table);
        if (!t) return;
        t.occupied = occupied;
        this.saveFloorPlan();
        this.renderFloorPlan();
    }
    removeFloorTable(table) {
        this.floor = this.floor.filter(t => t.table !== table);
        this.saveFloorPlan();
        this.renderFloorPlan();
    }
    renderFloorPlan() {
        const container = document.getElementById('floor-plan');
        if (!container) return;
        const items = (this.floor || []).map(t => {
            const hasOpen = this.pads.some(p => p.table === t.table && p.status !== 'served');
            return `
                <div class="floor-table ${t.occupied || hasOpen ? 'occupied' : ''}" data-table="${t.table}">
                    <div><strong>Table ${t.table}</strong>${hasOpen ? ' — commande en cours' : ''}</div>
                    <div class="floor-actions">
                        <button class="btn btn-outline btn-sm" data-action="select">Sélectionner</button>
                        <button class="btn btn-secondary btn-sm" data-action="toggle">${t.occupied ? 'Libérer' : 'Occuper'}</button>
                        <button class="btn btn-danger btn-sm" data-action="remove">Supprimer</button>
                    </div>
                </div>
            `;
        }).join('');
        container.innerHTML = items || '<div class="empty-state"><p>Ajoutez des tables pour le plan de salle</p></div>';
        container.querySelectorAll('.floor-table .btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const wrap = e.target.closest('.floor-table');
                const table = parseInt(wrap.getAttribute('data-table'));
                const action = e.target.getAttribute('data-action');
                if (action === 'select') {
                    this.dom.tableInput.value = String(table);
                    this.dom.tableInput.focus();
                } else if (action === 'toggle') {
                    const t = this.floor.find(t => t.table === table);
                    this.toggleFloorOccupancy(table, !(t && t.occupied));
                } else if (action === 'remove') {
                    if (!confirm(`Supprimer table ${table} ?`)) return;
                    this.removeFloorTable(table);
                }
            });
        });
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
  
  exportPayments() {
      const payments = this.payments || [];
      if (payments.length === 0) {
          this.showToast('Aucun paiement à exporter', 'info');
          return;
      }
      const headers = ['ID paiement','Table','Méthode','Reçu','Date','Sous-total','Total','TVA %','Remise %','Remise €','Pourboire %','Personnes','Reçu (€)','Rendu (€)','Articles'];
      const rows = [headers];
      payments.forEach(p => {
          rows.push([
              p.id,
              p.table,
              p.method,
              p.receipt,
              p.when,
              p.subtotal.toFixed(2),
              p.total.toFixed(2),
              Number(p.tvaPct || 0).toFixed(2),
              Number(p.discPct || 0).toFixed(2),
              Number(p.discAmtFixed || 0).toFixed(2),
              Number(p.tipPct || 0).toFixed(2),
              Number(p.people || 1),
              Number(p.tendered || 0).toFixed(2),
              Number(p.change || 0).toFixed(2),
              p.itemCount
          ]);
      });
      const csvContent = rows.map(row => row.map(field => `"${String(field).replace(/"/g,'""')}"`).join(',')).join('\n');
      const ts = new Date().toISOString().slice(0,19).replace(/[:.]/g,'-');
      this.downloadFile(csvContent, `cuisync-payments-${ts}.csv`, 'text/csv');
      this.showToast('Export paiements téléchargé', 'success');
  }

  findDishVatPct(item) {
      // If the item has category/name, look up from menu for its VAT
      if (!item || !item.dish) return null;
      for (const cat of this.menu.categories) {
          const found = (cat.dishes || []).find(d => d.name === item.dish);
          if (found && typeof found.vatPct === 'number') return found.vatPct;
      }
      return null;
  }

  resetPayments() {
      if (!confirm('Supprimer tous les paiements enregistrés ?')) return;
      this.payments = [];
      this.saveToStorage();
      this.showToast('Paiements réinitialisés', 'info');
  }

  exportDailyReport() {
      const payments = (this.payments || []).filter(p => {
          const d = new Date(p.when || Date.now());
          const now = new Date();
          return d.toDateString() === now.toDateString();
      });
      const agg = {
          total: 0, cash: 0, card: 0, other: 0,
          count: payments.length
      };
      payments.forEach(p => {
          agg.total += Number(p.total || 0);
          if (p.method === 'cash') agg.cash += Number(p.total || 0);
          else if (p.method === 'card') agg.card += Number(p.total || 0);
          else agg.other += Number(p.total || 0);
      });
      const headers = ['Date','Nbr paiements','Total','Espèces','CB','Autre'];
      const rows = [headers, [
          new Date().toLocaleDateString('fr-FR'),
          agg.count,
          agg.total.toFixed(2),
          agg.cash.toFixed(2),
          agg.card.toFixed(2),
          agg.other.toFixed(2)
      ]];
      const csv = rows.map(r => r.join(',')).join('\n');
      const ts = new Date().toISOString().slice(0,10);
      this.downloadFile(csv, `cuisync-rapport-${ts}.csv`, 'text/csv');
      this.showToast('Rapport du jour exporté', 'success');
  }
   
  // Supabase realtime sync (optional)
  async setupSupabase() {
      const s = this.restaurant || {};
      if (!s.cloudUrl || !s.cloudKey || !document.getElementById('cloud-realtime')?.checked) return;
      if (!window.supabase) {
          this.showToast('Supabase non chargé', 'error');
          return;
      }
      try {
          if (!this.sb) this.sb = window.supabase.createClient(s.cloudUrl, s.cloudKey);
          // Initial load
          await this.loadFromSupabase();
          this.renderViews();
          // Realtime
          this.sb
            .channel('pads-rt')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'pads' }, () => this.loadFromSupabase().then(() => this.renderViews()))
            .subscribe();
      } catch (e) {
          this.showToast('Erreur Supabase', 'error');
      }
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
       return new Date(dateString).toLocaleString('fr-FR', {
           day: '2-digit',
           month: '2-digit',
           year: 'numeric',
           hour: '2-digit',
           minute: '2-digit'
       });
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
   if ('serviceWorker' in navigator) {
       navigator.serviceWorker.register('service-worker.js').catch(() => {
           console.warn('Service worker registration failed');
       });
   }
});