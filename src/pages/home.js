import { getUserPermissions } from '../accessControl.js';
import { loadHomeSections } from '../utils/homeSections.js';
import { getAvailablePages } from '../utils/pageRegistry.js';

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
        
        // Listen for page registry updates to refresh home sections
        window.addEventListener('pageRegistryUpdated', () => {
            console.log('🔄 Page registry updated, refreshing home sections...');
            this.renderSections();
        });
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

        // Get available pages from centralized registry
        const availablePages = getAvailablePages();
        
        // Convert page registry to card format  
        const pageToCardMap = {};
        Object.entries(availablePages).forEach(([pageId, pageInfo]) => {
            pageToCardMap[pageId] = {
                id: pageId,
                title: pageInfo.name,
                icon: pageInfo.icon,
                page: pageId
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

    setupHeroImage() {
        // Set up hero image with admin upload or fallback to default images
        const heroBackground = document.getElementById('heroBackground');
        if (heroBackground) {
            console.log('🖼️ Hero background element found, loading image...');
            this.loadHeroImage(heroBackground);
        } else {
            console.error('❌ Hero background element not found!');
        }
    }

    async loadHeroImage(heroBackground) {
        try {
            // Try to load admin-uploaded hero image first
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
                        
                        heroBackground.classList.add('has-image');
                        heroBackground.style.backgroundImage = `url(${blobUrl})`;
                        heroBackground.style.backgroundSize = 'cover';
                        heroBackground.style.backgroundPosition = 'center';
                        console.log('✅ Admin hero image loaded successfully');
                        return;
                    } catch (error) {
                        console.error('Error converting base64 to blob:', error);
                    }
                } else {
                    // Regular URL
                    heroBackground.classList.add('has-image');
                    heroBackground.style.backgroundImage = `url(${heroImageData.imageUrl})`;
                    heroBackground.style.backgroundSize = 'cover';
                    heroBackground.style.backgroundPosition = 'center';
                    console.log('✅ Admin hero image loaded successfully');
                    return;
                }
            } else {
                console.log('🖼️ No admin hero image found, using defaults');
            }
        } catch (error) {
            console.error('Error loading admin hero image:', error);
        }
        
        // Fallback to default images if no admin image
        console.log('🖼️ Loading default hero image');
        const defaultImages = [
            'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?ixlib=rb-4.0.3&auto=format&fit=crop&w=1920&q=80', // Mountain landscape
            'https://images.unsplash.com/photo-1441974231531-c6227db76b6e?ixlib=rb-4.0.3&auto=format&fit=crop&w=1920&q=80', // Forest path
            'https://images.unsplash.com/photo-1469474968028-56623f02e42e?ixlib=rb-4.0.3&auto=format&fit=crop&w=1920&q=80'  // Nature scene
        ];
        
        // Use a random image for now
        const randomImage = defaultImages[Math.floor(Math.random() * defaultImages.length)];
        
        // Load image with fallback
        const img = new Image();
        img.onload = () => {
            heroBackground.classList.add('has-image');
            heroBackground.style.backgroundImage = `url(${randomImage})`;
            heroBackground.style.backgroundSize = 'cover';
            heroBackground.style.backgroundPosition = 'center';
            console.log('✅ Default hero image loaded successfully');
        };
        img.onerror = () => {
            // Fallback to gradient if image fails to load
            console.log('🖼️ Hero image failed to load, using gradient fallback');
            heroBackground.classList.remove('has-image');
            heroBackground.style.backgroundImage = 'none';
        };
        img.src = randomImage;
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