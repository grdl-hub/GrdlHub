import { getUserPermissions } from '../accessControl.js';
import { loadHomeSections } from '../utils/homeSections.js';
import { getAvailablePagesArray, getTranslatedPageName } from '../utils/pageRegistry.js';
import { getCurrentUser } from '../auth.js';
import { db } from '../auth.js';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { getUserLanguagePreference } from '../utils/translationManagement.js';

class HomePageManager {
    constructor() {
        // Sections will be loaded dynamically from Firestore
        this.sections = [];
        // Load available pages from registry
        this.availablePages = null;
        // Action items
        this.actionItems = [];
    }

    async initialize() {
        console.log('🏠 Initializing Home Page Manager...');
        // Load available pages from registry
        this.availablePages = getAvailablePagesArray();
        await this.loadSections();
        await this.loadActionItems();
        await this.renderSections();
        this.renderActionItems();
        this.setupEventListeners();
        this.setupHeroImage();
        console.log('✅ Home Page Manager initialized');
    }

    async loadSections() {
        try {
            console.log('🏠 Loading sections from Firestore...');
            const sectionsData = await loadHomeSections();
            
            // Convert Firestore sections to the format expected by the UI
            this.sections = sectionsData
                .filter(section => section.enabled) // Only show enabled sections
                .map(section => ({
                    id: section.sectionId,
                    title: section.title,
                    cards: this.createCardsForSection(section)
                }));
                
            console.log('✅ Loaded sections:', this.sections.length);
        } catch (error) {
            console.error('❌ Error loading sections:', error);
            // Use default fallback if loading fails
            this.sections = [];
        }
    }

    createCardsForSection(section) {
        if (!section.pages || !Array.isArray(section.pages)) {
            return [];
        }

        // Use the page registry instead of hardcoded map
        const pageToCardMap = {};
        const userLang = getUserLanguagePreference();
        
        // Build the map dynamically from available pages with translated names
        this.availablePages.forEach(page => {
            const translatedName = getTranslatedPageName(page.id, userLang);
            
            pageToCardMap[page.id] = {
                id: page.id,
                title: translatedName, // ← Use translated name
                icon: page.icon,
                page: page.id
            };
        });

        return section.pages
            .map(pageId => pageToCardMap[pageId])
            .filter(card => card !== undefined); // Remove any unknown page IDs
    }

    async renderSections() {
        const container = document.getElementById('home-sections-container');
        if (!container) {
            console.error('Home sections container not found');
            return;
        }

        const userPermissions = await getUserPermissions();
        console.log('🔐 User permissions:', userPermissions);

        let html = '';

        for (const section of this.sections) {
            // Filter cards based on user permissions
            // For sub-pages like 'availability-tracker', check if user has parent page permission
            const accessibleCards = section.cards.filter(card => {
                const pageId = card.page;
                
                // Check direct permission
                if (userPermissions.includes(pageId)) {
                    return true;
                }
                
                // Check if it's a sub-page (contains hyphen)
                if (pageId.includes('-')) {
                    // Extract parent page (e.g., 'availability-tracker' -> 'availability')
                    const parentPage = pageId.split('-')[0];
                    if (userPermissions.includes(parentPage)) {
                        return true;
                    }
                }
                
                return false;
            });

            // Only show section if user has access to at least one card
            if (accessibleCards.length > 0) {
                html += this.renderSection(section, accessibleCards);
            }
        }

        container.innerHTML = html;
    }

    renderSection(section, cards) {
        return `
            <div class="home-section" data-section="${section.id}">
                <div class="section-header">
                    <h3 class="section-title">${section.title}</h3>
                </div>
                <div class="cards-carousel">
                    <div class="cards-container">
                        ${cards.map(card => this.renderCard(card)).join('')}
                    </div>
                </div>
            </div>
        `;
    }

    renderCard(card) {
        return `
            <div class="home-card" data-page="${card.page}">
                <div class="card-icon">${card.icon}</div>
                <div class="card-title">${card.title}</div>
            </div>
        `;
    }

    setupEventListeners() {
        const container = document.getElementById('home-sections-container');
        if (!container) return;

        // Add click listeners to cards
        container.addEventListener('click', (event) => {
            const card = event.target.closest('.home-card');
            if (card) {
                const page = card.dataset.page;
                if (page) {
                    console.log('🎯 Navigating to page:', page);
                    window.location.hash = `#${page}`;
                }
            }
        });

        // Listen for language changes and reload sections
        window.addEventListener('languageChanged', async (event) => {
            console.log('🌍 Language changed, reloading home sections with new language:', event.detail.lang);
            await this.loadSections();
            await this.renderSections();
        });

        // Add horizontal scroll support for touch devices
        const carousels = container.querySelectorAll('.cards-carousel');
        carousels.forEach(carousel => {
            let isDown = false;
            let startX;
            let scrollLeft;

            carousel.addEventListener('mousedown', (e) => {
                isDown = true;
                carousel.classList.add('active');
                startX = e.pageX - carousel.offsetLeft;
                scrollLeft = carousel.scrollLeft;
            });

            carousel.addEventListener('mouseleave', () => {
                isDown = false;
                carousel.classList.remove('active');
            });

            carousel.addEventListener('mouseup', () => {
                isDown = false;
                carousel.classList.remove('active');
            });

            carousel.addEventListener('mousemove', (e) => {
                if (!isDown) return;
                e.preventDefault();
                const x = e.pageX - carousel.offsetLeft;
                const walk = (x - startX) * 2;
                carousel.scrollLeft = scrollLeft - walk;
            });
        });
    }

    async loadActionItems() {
        try {
            console.log('📋 Loading action items...');
            const currentUser = getCurrentUser();
            
            if (!currentUser || !currentUser.email) {
                console.log('⚠️ No current user found');
                this.actionItems = [];
                return;
            }

            const actionItemsRef = collection(db, 'actionItems');
            const q = query(
                actionItemsRef,
                where('assignedTo', 'array-contains', currentUser.email),
                where('completed', '==', false)
            );

            const querySnapshot = await getDocs(q);
            this.actionItems = [];

            querySnapshot.forEach((doc) => {
                this.actionItems.push({
                    id: doc.id,
                    ...doc.data()
                });
            });

            console.log(`✅ Loaded ${this.actionItems.length} action items`);
        } catch (error) {
            console.error('❌ Error loading action items:', error);
            this.actionItems = [];
        }
    }

    renderActionItems() {
        const container = document.getElementById('action-items-list');
        if (!container) {
            console.error('❌ Action items container not found');
            return;
        }

        if (this.actionItems.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <p class="text-muted">✅ No pending action items</p>
                </div>
            `;
            return;
        }

        // Wrap all items in a single card
        const itemsHtml = this.actionItems.map(item => this.renderActionItem(item)).join('');
        container.innerHTML = `
            <div class="home-action-card">
                ${itemsHtml}
            </div>
        `;
    }

    renderActionItem(item) {
        // Format the due date if available
        let dueDate = '';
        let dueInfo = '';
        if (item.dueDate) {
            try {
                const date = item.dueDate.toDate ? item.dueDate.toDate() : new Date(item.dueDate);
                dueDate = date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' });
                
                // Calculate "Due in X days/weeks/months"
                const today = new Date();
                const diffTime = date - today;
                const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                
                if (diffDays < 0) {
                    dueInfo = 'Overdue';
                } else if (diffDays === 0) {
                    dueInfo = 'Due today';
                } else if (diffDays === 1) {
                    dueInfo = 'Due tomorrow';
                } else if (diffDays < 7) {
                    dueInfo = `Due in ${diffDays} days`;
                } else if (diffDays < 30) {
                    const weeks = Math.floor(diffDays / 7);
                    dueInfo = `Due in ${weeks} ${weeks === 1 ? 'week' : 'weeks'}`;
                } else {
                    dueInfo = 'Due next month';
                }
            } catch (error) {
                console.error('Error formatting date:', error);
                dueDate = 'No deadline';
            }
        }

        // Determine the icon and URL based on form type
        let icon = '✓';
        let actionUrl = '#availability';
        
        if (item.formType === 'monthly-availability') {
            icon = '✓';
            actionUrl = `#availability-tracker`;
        } else if (item.formType === 'availability-form') {
            icon = '✓';
            actionUrl = `#availability-forms`;
        }

        return `
            <div class="home-action-item" data-item-id="${item.id}" onclick="window.location.hash='${actionUrl}'">
                <div class="home-action-icon">${icon}</div>
                <div class="home-action-content">
                    <div class="home-action-title">${item.title || 'Untitled Task'}</div>
                </div>
                <div class="home-action-meta">
                    <div class="home-action-date">${dueDate}</div>
                    <div class="home-action-due">${dueInfo}</div>
                </div>
            </div>
        `;
    }

    async refreshSections() {
        console.log('🔄 Refreshing home sections...');
        await this.renderSections();
        this.setupEventListeners();
    }

    setupHeroImage() {
        // Set up hero image - load admin image directly and as fast as possible
        const heroBackground = document.getElementById('heroBackground');
        if (heroBackground) {
            console.log('🖼️ Hero background element found, loading admin image...');
            this.loadAdminHeroImageDirectly(heroBackground);
        } else {
            console.error('❌ Hero background element not found!');
        }
    }

    async loadAdminHeroImageDirectly(heroBackground) {
        try {
            // Load admin image as fast as possible
            const heroImageData = await this.getHeroImageFromFirestore();
            
            if (heroImageData && heroImageData.imageUrl) {
                console.log('🖼️ Loading admin hero image:', heroImageData.fileName);
                
                // Handle base64 images with CSP restrictions
                if (heroImageData.imageUrl.startsWith('data:')) {
                    try {
                        // Convert base64 to blob URL for CSP compliance
                        const byteCharacters = atob(heroImageData.imageUrl.split(',')[1]);
                        const byteNumbers = new Array(byteCharacters.length);
                        for (let i = 0; i < byteCharacters.length; i++) {
                            byteNumbers[i] = byteCharacters.charCodeAt(i);
                        }
                        const byteArray = new Uint8Array(byteNumbers);
                        const blob = new Blob([byteArray], { type: 'image/jpeg' });
                        const blobUrl = URL.createObjectURL(blob);
                        
                        heroBackground.style.backgroundImage = `url(${blobUrl})`;
                        console.log('✅ Admin hero image loaded successfully');
                        return;
                    } catch (error) {
                        console.error('Error converting base64 to blob:', error);
                    }
                } else {
                    // Regular URL
                    heroBackground.style.backgroundImage = `url(${heroImageData.imageUrl})`;
                    console.log('✅ Admin hero image loaded successfully');
                    return;
                }
            }
            
            // Only if no admin image found, use simple fallback
            console.log('🖼️ No admin hero image found, using simple fallback');
            heroBackground.style.backgroundImage = 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)';
            
        } catch (error) {
            console.error('Error loading admin hero image:', error);
            // Simple fallback on error
            heroBackground.style.backgroundImage = 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)';
        }
    }

    async getHeroImageFromFirestore() {
        try {
            const { doc, getDoc } = await import('firebase/firestore');
            const { db } = await import('../auth.js');
            
            const heroImageRef = doc(db, 'settings', 'heroImage');
            const docSnap = await getDoc(heroImageRef);
            
            if (docSnap.exists()) {
                return docSnap.data();
            } else {
                return null;
            }
        } catch (error) {
            console.error('Error getting hero image from Firestore:', error);
            return null;
        }
    }
}

export { HomePageManager };