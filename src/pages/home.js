import { getUserPermissions } from '../accessControl.js';
import { loadHomeSections } from '../utils/homeSections.js';

class HomePageManager {
    constructor() {
        // Sections will be loaded dynamically from Firestore
        this.sections = [];
    }

    async initialize() {
        console.log('🏠 Initializing Home Page Manager...');
        await this.loadSections();
        await this.renderSections();
        this.setupEventListeners();
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

        // Map page IDs to card objects
        const pageToCardMap = {
            'monthly': { id: 'monthly', title: 'Monthly View', icon: '📅', page: 'monthly' },
            'reports': { id: 'reports', title: 'Reports', icon: '📊', page: 'reports' },
            'availability': { id: 'availability', title: 'Availability', icon: '📋', page: 'availability' },
            'users': { id: 'users', title: 'Users', icon: '👥', page: 'users' },
            'appointments': { id: 'appointments', title: 'Appointments', icon: '📅', page: 'appointments' },
            'content': { id: 'content', title: 'Content', icon: '📝', page: 'content' },
            'pages': { id: 'pages', title: 'Pages', icon: '📄', page: 'pages' },
            'settings': { id: 'settings', title: 'Settings', icon: '⚙️', page: 'settings' }
        };

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
            const accessibleCards = section.cards.filter(card => 
                userPermissions.includes(card.page)
            );

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

    async refreshSections() {
        console.log('🔄 Refreshing home sections...');
        await this.renderSections();
        this.setupEventListeners();
    }
}

export { HomePageManager };