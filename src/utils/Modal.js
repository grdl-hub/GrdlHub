/**
 * Unified Modal Component
 * Replaces duplicate modal creation patterns across the application
 */
export class Modal {
    constructor(options = {}) {
        this.options = {
            title: options.title || '',
            size: options.size || 'medium', // small, medium, large
            closeOnEscape: options.closeOnEscape !== false,
            closeOnOverlay: options.closeOnOverlay !== false,
            showCloseButton: options.showCloseButton !== false,
            ...options
        };
        
        this.overlay = null;
        this.modal = null;
        this.onClose = options.onClose || (() => {});
        this.isOpen = false;
        
        this.create();
        this.bindEvents();
    }

    create() {
        // Create overlay
        this.overlay = document.createElement('div');
        this.overlay.className = 'modal-overlay-common';
        
        // Create modal container
        this.modal = document.createElement('div');
        this.modal.className = `modal-common modal-${this.options.size}`;
        
        // Create header
        const header = document.createElement('div');
        header.className = 'modal-header-common';
        
        const title = document.createElement('h2');
        title.textContent = this.options.title;
        title.style.margin = '0';
        title.style.color = '#424242';
        header.appendChild(title);
        
        if (this.options.showCloseButton) {
            const closeBtn = document.createElement('button');
            closeBtn.innerHTML = '×';
            closeBtn.className = 'btn-common modal-close-btn';
            closeBtn.style.cssText = `
                background: none;
                border: none;
                font-size: 1.5rem;
                cursor: pointer;
                color: #757575;
                padding: 4px 8px;
                border-radius: 4px;
                transition: background-color 0.3s ease;
            `;
            closeBtn.addEventListener('click', () => this.close());
            closeBtn.addEventListener('mouseenter', (e) => {
                e.target.style.background = '#f5f5f5';
            });
            closeBtn.addEventListener('mouseleave', (e) => {
                e.target.style.background = 'none';
            });
            header.appendChild(closeBtn);
        }
        
        // Create content container
        this.content = document.createElement('div');
        this.content.className = 'modal-content-common';
        
        // Assemble modal
        this.modal.appendChild(header);
        this.modal.appendChild(this.content);
        this.overlay.appendChild(this.modal);
    }

    bindEvents() {
        // Close on escape key
        if (this.options.closeOnEscape) {
            this.escapeHandler = (e) => {
                if (e.key === 'Escape' && this.isOpen) {
                    this.close();
                }
            };
        }
        
        // Close on overlay click
        if (this.options.closeOnOverlay) {
            this.overlay.addEventListener('click', (e) => {
                if (e.target === this.overlay) {
                    this.close();
                }
            });
        }
    }

    setContent(content) {
        this.content.innerHTML = '';
        
        if (typeof content === 'string') {
            this.content.innerHTML = content;
        } else if (content instanceof HTMLElement) {
            this.content.appendChild(content);
        } else if (Array.isArray(content)) {
            content.forEach(item => {
                if (typeof item === 'string') {
                    const div = document.createElement('div');
                    div.innerHTML = item;
                    this.content.appendChild(div);
                } else if (item instanceof HTMLElement) {
                    this.content.appendChild(item);
                }
            });
        }
        
        return this;
    }

    createForm(fields = [], options = {}) {
        const form = document.createElement('form');
        form.className = 'form-common';
        
        fields.forEach(field => {
            const group = document.createElement('div');
            group.className = 'form-group-common';
            
            if (field.label) {
                const label = document.createElement('label');
                label.className = 'form-label-common';
                label.textContent = field.label;
                if (field.required) {
                    label.innerHTML += ' <span style="color: #d32f2f;">*</span>';
                }
                group.appendChild(label);
            }
            
            let input;
            
            switch (field.type) {
                case 'select':
                    input = document.createElement('select');
                    input.className = 'form-input-common';
                    if (field.options) {
                        field.options.forEach(option => {
                            const opt = document.createElement('option');
                            opt.value = option.value || option;
                            opt.textContent = option.text || option;
                            if (option.selected) opt.selected = true;
                            input.appendChild(opt);
                        });
                    }
                    break;
                    
                case 'textarea':
                    input = document.createElement('textarea');
                    input.className = 'form-input-common';
                    input.rows = field.rows || 3;
                    break;
                    
                case 'checkbox':
                    const checkboxWrapper = document.createElement('div');
                    checkboxWrapper.style.display = 'flex';
                    checkboxWrapper.style.alignItems = 'center';
                    checkboxWrapper.style.gap = '8px';
                    
                    input = document.createElement('input');
                    input.type = 'checkbox';
                    input.id = field.name || field.id || '';
                    
                    const checkboxLabel = document.createElement('label');
                    checkboxLabel.htmlFor = input.id;
                    checkboxLabel.textContent = field.checkboxLabel || '';
                    
                    checkboxWrapper.appendChild(input);
                    checkboxWrapper.appendChild(checkboxLabel);
                    group.appendChild(checkboxWrapper);
                    break;
                    
                default:
                    input = document.createElement('input');
                    input.className = 'form-input-common';
                    input.type = field.type || 'text';
            }
            
            if (field.type !== 'checkbox') {
                // Standard input properties
                if (field.name) input.name = field.name;
                if (field.id) input.id = field.id;
                if (field.value) input.value = field.value;
                if (field.placeholder) input.placeholder = field.placeholder;
                if (field.required) input.required = true;
                if (field.disabled) input.disabled = true;
                
                group.appendChild(input);
            }
            
            form.appendChild(group);
        });
        
        // Add action buttons
        if (options.buttons && options.buttons.length > 0) {
            const actions = document.createElement('div');
            actions.className = 'form-actions-common';
            
            options.buttons.forEach(btn => {
                const button = document.createElement('button');
                button.type = btn.type || 'button';
                button.className = `btn-common ${btn.variant ? `btn-${btn.variant}-common` : 'btn-primary-common'}`;
                button.textContent = btn.text;
                
                if (btn.onClick) {
                    button.addEventListener('click', btn.onClick);
                }
                
                actions.appendChild(button);
            });
            
            form.appendChild(actions);
        }
        
        this.setContent(form);
        return form;
    }

    getFormData() {
        const form = this.content.querySelector('form');
        if (!form) return null;
        
        const formData = new FormData(form);
        const data = {};
        
        // Handle regular form fields
        for (let [key, value] of formData.entries()) {
            data[key] = value;
        }
        
        // Handle checkboxes separately (they don't appear in FormData if unchecked)
        const checkboxes = form.querySelectorAll('input[type="checkbox"]');
        checkboxes.forEach(checkbox => {
            if (checkbox.name) {
                data[checkbox.name] = checkbox.checked;
            }
        });
        
        return data;
    }

    open() {
        document.body.appendChild(this.overlay);
        this.isOpen = true;
        
        if (this.escapeHandler) {
            document.addEventListener('keydown', this.escapeHandler);
        }
        
        // Animate in
        requestAnimationFrame(() => {
            this.overlay.style.opacity = '0';
            this.modal.style.transform = 'scale(0.9)';
            this.overlay.style.transition = 'opacity 0.3s ease';
            this.modal.style.transition = 'transform 0.3s ease';
            
            requestAnimationFrame(() => {
                this.overlay.style.opacity = '1';
                this.modal.style.transform = 'scale(1)';
            });
        });
        
        // Focus first input
        setTimeout(() => {
            const firstInput = this.content.querySelector('input, select, textarea');
            if (firstInput) firstInput.focus();
        }, 100);
        
        return this;
    }

    close() {
        if (!this.isOpen) return;
        
        this.isOpen = false;
        
        if (this.escapeHandler) {
            document.removeEventListener('keydown', this.escapeHandler);
        }
        
        // Animate out
        this.overlay.style.opacity = '0';
        this.modal.style.transform = 'scale(0.9)';
        
        setTimeout(() => {
            if (this.overlay && this.overlay.parentNode) {
                document.body.removeChild(this.overlay);
            }
            this.onClose();
        }, 300);
        
        return this;
    }

    setTitle(title) {
        const titleEl = this.modal.querySelector('h2');
        if (titleEl) {
            titleEl.textContent = title;
        }
        return this;
    }

    destroy() {
        this.close();
        this.overlay = null;
        this.modal = null;
        this.content = null;
    }
}

// Static helper methods for common modal patterns
Modal.confirm = function(message, title = 'Confirm') {
    return new Promise((resolve) => {
        const modal = new Modal({ 
            title,
            size: 'small',
            onClose: () => resolve(false)
        });
        
        const content = document.createElement('div');
        content.innerHTML = `
            <p style="margin: 0 0 24px 0; color: #424242; line-height: 1.5;">${message}</p>
            <div class="form-actions-common">
                <button class="btn-common btn-secondary-common" id="cancel-btn">Cancel</button>
                <button class="btn-common btn-primary-common" id="confirm-btn">Confirm</button>
            </div>
        `;
        
        content.querySelector('#cancel-btn').addEventListener('click', () => {
            modal.close();
            resolve(false);
        });
        
        content.querySelector('#confirm-btn').addEventListener('click', () => {
            modal.close();
            resolve(true);
        });
        
        modal.setContent(content).open();
    });
};

Modal.alert = function(message, title = 'Alert') {
    return new Promise((resolve) => {
        const modal = new Modal({ 
            title,
            size: 'small',
            onClose: () => resolve()
        });
        
        const content = document.createElement('div');
        content.innerHTML = `
            <p style="margin: 0 0 24px 0; color: #424242; line-height: 1.5;">${message}</p>
            <div class="form-actions-common">
                <button class="btn-common btn-primary-common" id="ok-btn">OK</button>
            </div>
        `;
        
        content.querySelector('#ok-btn').addEventListener('click', () => {
            modal.close();
            resolve();
        });
        
        modal.setContent(content).open();
    });
};

Modal.prompt = function(message, defaultValue = '', title = 'Input') {
    return new Promise((resolve) => {
        const modal = new Modal({ 
            title,
            size: 'small',
            onClose: () => resolve(null)
        });
        
        const form = modal.createForm([
            {
                label: message,
                name: 'value',
                type: 'text',
                value: defaultValue,
                required: true
            }
        ], {
            buttons: [
                {
                    text: 'Cancel',
                    variant: 'secondary',
                    onClick: () => {
                        modal.close();
                        resolve(null);
                    }
                },
                {
                    text: 'OK',
                    variant: 'primary',
                    type: 'submit',
                    onClick: (e) => {
                        e.preventDefault();
                        const data = modal.getFormData();
                        modal.close();
                        resolve(data.value);
                    }
                }
            ]
        });
        
        modal.open();
    });
};

export default Modal;