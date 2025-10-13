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
            menuList: document.getElementById('menu-list'),
            
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
            undoMessage: document.getElementById('undo-message')
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
                if (!categoryId || !name || isNaN(price)) return;
                this.addDish(categoryId, name, price);
                this.dom.dishNameInput.value = '';
                this.dom.dishPriceInput.value = '';
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
        this.dom.sendAllBtn.addEventListener('click', () => this.sendAllOpenPads());
        this.dom.exportBtn.addEventListener('click', () => this.exportToCSV());
        this.dom.compactModeBtn.addEventListener('click', () => this.toggleCompactMode());

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
                    compactMode: this.isCompactMode
                }));
                localStorage.setItem('cuisync-menu', JSON.stringify(this.menu));
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

    addDish(categoryId, name, price) {
        const category = this.menu.categories.find(c => c.id === categoryId);
        if (!category) return;
        const exists = category.dishes.some(d => d.name.toLowerCase() === name.toLowerCase());
        if (exists) {
            this.showToast('Plat existe déjà dans cette catégorie', 'info');
            return;
        }
        category.dishes.push({ id: this.generateId(), name, price });
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
            const chips = dishes.length ? dishes.map(d => `<span class=\"menu-chip\">${this.escapeHTML(d.name)} — ${Number(d.price).toFixed(2)} €</span>`).join(' ') : '<span class=\"menu-chip\">(aucun plat)</span>';
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
       const pads = this.pads.filter(p => p.status !== 'served');
       
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
               }
           });
       });
   }
   
   renderKitchenView() {
       const container = this.dom.kitchenPadsContainer;
       const pads = this.pads.filter(p => p.status === 'sent' || p.status === 'ready');
       
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
               }
           });
       });
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
                        this.markPadPaid(padId);
                        break;
                   case 'delete':
                       this.deletePad(padId);
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
               `;
           }
      } else if (view === 'host') {
          if (pad.status === 'open') {
              actionsHTML = `
                  <button class="btn btn-secondary btn-sm" data-action="send" data-pad-id="${pad.id}">Envoyer</button>
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

    getPadTotal(pad) {
        if (!pad || !Array.isArray(pad.items)) return 0;
        return pad.items.reduce((sum, item) => {
            const price = typeof item.price === 'number' ? item.price : 0;
            const qty = typeof item.qty === 'number' ? item.qty : 0;
            return sum + price * qty;
        }, 0);
    }

    buildReceiptHTML(pad) {
        const created = this.formatDate(pad.createdAt);
        const now = this.formatDate(new Date().toISOString());
        const lines = (pad.items || []).map(item => {
            const unit = typeof item.price === 'number' ? `${item.price.toFixed(2)} €` : '-';
            const lineTotal = typeof item.price === 'number' ? (item.price * (item.qty || 0)).toFixed(2) + ' €' : '-';
            return `
                <tr>
                    <td>${(item.qty || 0)} ×</td>
                    <td>${this.escapeHTML(item.dish)}</td>
                    <td class="num">${unit}</td>
                    <td class="num">${lineTotal}</td>
                </tr>
            `;
        }).join('');
        const total = this.getPadTotal(pad).toFixed(2) + ' €';

        return `
            <html>
            <head>
                <meta charset="utf-8" />
                <title>Ticket Table ${pad.table}</title>
                <style>
                    body { font-family: -apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Arial,sans-serif; }
                    .ticket { width: 280px; margin: 0 auto; }
                    h1 { font-size: 16px; text-align: center; margin: 8px 0; }
                    .meta { font-size: 12px; text-align: center; margin-bottom: 8px; }
                    table { width: 100%; border-collapse: collapse; font-size: 12px; }
                    td { padding: 4px 0; }
                    .num { text-align: right; white-space: nowrap; }
                    .total { border-top: 1px dashed #000; margin-top: 8px; padding-top: 8px; font-weight: 600; }
                    .footer { text-align: center; font-size: 11px; margin-top: 12px; }
                    @media print { body { margin: 0; } }
                </style>
            </head>
            <body>
                <div class="ticket">
                    <h1>Cuisync — Hôte</h1>
                    <div class="meta">
                        Table ${pad.table}<br/>
                        Créé: ${created} — Imprimé: ${now}
                    </div>
                    <table>
                        ${lines}
                    </table>
                    <div class="total">
                        Total: <span style="float:right">${total}</span>
                    </div>
                    <div class="footer">Merci et à bientôt</div>
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

    markPadPaid(padId) {
        const padIndex = this.pads.findIndex(p => p.id === padId);
        if (padIndex === -1) return;
        const pad = this.pads[padIndex];
        const oldState = { ...pad, _index: padIndex };
        // Mark as served and store paid timestamp
        this.pads.splice(padIndex, 1);
        const servedPad = { ...pad, status: 'served', paidAt: new Date().toISOString(), updatedAt: new Date().toISOString() };
        // Insert back? Keeping behavior consistent with served removal
        // For simplicity, keep removal like markPadServed

        this.undoStack.push({
            type: 'markPaid',
            data: oldState
        });
        
        // No need to keep servedPad in list (same as markPadServed)
        this.saveToStorage();
        this.renderViews();
        this.updateSendAllButton();
        
        this.showToast(`Table ${pad.table} encaissée`, 'success');
        this.showUndoNotification('Paiement enregistré');
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
});