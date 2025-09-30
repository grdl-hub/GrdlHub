import { db } from '../auth.js';
import { collection, query, where, getDocs } from 'firebase/firestore';

class MonthlyViewManager {
    constructor() {
        console.log('📅 Creating MonthlyViewManager instance...');
        this.currentMonthData = null;
        this.initialized = false;
        this.months = [
            'January', 'February', 'March', 'April', 'May', 'June',
            'July', 'August', 'September', 'October', 'November', 'December'
        ];
    }

    async initialize() {
        if (this.initialized) return;
        
        console.log('📅 Initializing Monthly View...');
        this.setupEventListeners();
        this.initializeDefaultDate();
        this.initialized = true;
        console.log('✅ Monthly View initialized successfully');
    }

    setupEventListeners() {
        const generateBtn = document.getElementById('generate-monthly-btn');
        if (generateBtn) {
            generateBtn.addEventListener('click', () => this.generateMonthlyView());
        }
    }

    initializeDefaultDate() {
        const now = new Date();
        const monthSelect = document.getElementById('monthly-month-select');
        const yearSelect = document.getElementById('monthly-year-select');
        
        if (monthSelect) {
            monthSelect.value = now.getMonth();
        }
        
        if (yearSelect) {
            yearSelect.value = now.getFullYear();
        }
    }

    async generateMonthlyView() {
        const monthSelect = document.getElementById('monthly-month-select');
        const yearSelect = document.getElementById('monthly-year-select');
        
        if (!monthSelect || !yearSelect) {
            console.error('Monthly controls not found');
            return;
        }

        const month = parseInt(monthSelect.value);
        const year = parseInt(yearSelect.value);

        this.showLoading(true);
        this.hideResults();

        try {
            const appointments = await this.fetchMonthlyAppointments(month, year);
            
            if (appointments.length === 0) {
                this.showEmptyState(month, year);
                return;
            }

            this.renderMonthlyView(appointments, month, year);

        } catch (error) {
            console.error('Error generating monthly view:', error);
            this.showError('Failed to load monthly view. Please try again.');
        } finally {
            this.showLoading(false);
        }
    }

    async fetchMonthlyAppointments(month, year) {
        try {
            const startDate = new Date(year, month, 1);
            const endDate = new Date(year, month + 1, 0, 23, 59, 59);

            console.log(`Fetching Testemunho Público appointments for ${this.months[month]} ${year}`);

            const appointmentsRef = collection(db, 'appointments');
            const q = query(
                appointmentsRef,
                where('title', '==', 'Testemunho Público')
            );

            const querySnapshot = await getDocs(q);
            const appointments = [];

            querySnapshot.forEach((doc) => {
                const data = doc.data();
                
                if (data.date) {
                    let appointmentDate;
                    
                    // Handle different date formats
                    if (typeof data.date.toDate === 'function') {
                        appointmentDate = data.date.toDate();
                    } else if (data.date instanceof Date) {
                        appointmentDate = data.date;
                    } else if (typeof data.date === 'string') {
                        appointmentDate = new Date(data.date);
                    } else {
                        return;
                    }
                    
                    // Filter by date range
                    if (appointmentDate >= startDate && appointmentDate <= endDate) {
                        appointments.push({
                            id: doc.id,
                            ...data,
                            date: appointmentDate
                        });
                    }
                }
            });

            // Sort appointments by date
            appointments.sort((a, b) => a.date - b.date);

            console.log(`Found ${appointments.length} Testemunho Público appointments`);
            return appointments;

        } catch (error) {
            console.error('Error fetching appointments:', error);
            throw error;
        }
    }

    renderMonthlyView(appointments, month, year) {
        const resultsDiv = document.getElementById('monthly-results');
        if (!resultsDiv) return;

        const monthName = this.months[month];
        
        let html = `
            <div class="monthly-header">
                <h3>📅 ${monthName} ${year} - Testemunho Público</h3>
                <p class="monthly-count">${appointments.length} appointment${appointments.length !== 1 ? 's' : ''} found</p>
            </div>
            <div class="monthly-list">
        `;

        appointments.forEach(appointment => {
            const dateStr = appointment.date.toLocaleDateString('en-US', {
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric'
            });
            
            const timeStr = appointment.date.toLocaleTimeString('en-US', {
                hour: '2-digit',
                minute: '2-digit'
            });

            html += `
                <div class="monthly-appointment">
                    <div class="appointment-date">
                        <span class="date-day">${dateStr}</span>
                        <span class="date-time">${timeStr}</span>
                    </div>
                    <div class="appointment-details">
                        <h4>${appointment.title}</h4>
                        ${appointment.description ? `<p class="appointment-description">${appointment.description}</p>` : ''}
                        ${appointment.location ? `<p class="appointment-location">📍 ${appointment.location}</p>` : ''}
                    </div>
                </div>
            `;
        });

        html += '</div>';
        
        resultsDiv.innerHTML = html;
        resultsDiv.style.display = 'block';
    }

    showEmptyState(month, year) {
        const resultsDiv = document.getElementById('monthly-results');
        if (!resultsDiv) return;

        const monthName = this.months[month];
        
        resultsDiv.innerHTML = `
            <div class="monthly-empty">
                <div class="empty-icon">📅</div>
                <h3>No Appointments Found</h3>
                <p>No "Testemunho Público" appointments were found for ${monthName} ${year}.</p>
            </div>
        `;
        resultsDiv.style.display = 'block';
    }

    showError(message) {
        const resultsDiv = document.getElementById('monthly-results');
        if (!resultsDiv) return;

        resultsDiv.innerHTML = `
            <div class="monthly-error">
                <div class="error-icon">⚠️</div>
                <h3>Error</h3>
                <p>${message}</p>
            </div>
        `;
        resultsDiv.style.display = 'block';
    }

    showLoading(show) {
        const loadingDiv = document.getElementById('monthly-loading');
        if (loadingDiv) {
            loadingDiv.style.display = show ? 'block' : 'none';
        }
    }

    hideResults() {
        const resultsDiv = document.getElementById('monthly-results');
        if (resultsDiv) {
            resultsDiv.style.display = 'none';
        }
    }
}

// Export for dynamic import
export { MonthlyViewManager };