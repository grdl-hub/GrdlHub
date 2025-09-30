import { db } from '../auth.js';
import { collection, query, where, getDocs } from 'firebase/firestore';

class ReportsManager {
    constructor() {
        console.log('📊 Creating ReportsManager instance...');
        this.currentReportType = 'testemunho';
        this.currentReportData = null;
        this.initialized = false;
        this.months = [
            'January', 'February', 'March', 'April', 'May', 'June',
            'July', 'August', 'September', 'October', 'November', 'December'
        ];
        this.weekDays = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
        console.log('✅ ReportsManager instance created');
    }

    init() {
        console.log('📊 Initializing Reports Manager...');
        try {
            this.setupEventListeners();
            this.populateDropdowns();
            this.initialized = true;
            console.log('✅ Reports Manager initialized successfully');
        } catch (error) {
            console.error('❌ Error during Reports Manager initialization:', error);
            throw error;
        }
    }

    setupEventListeners() {
        console.log('📊 Setting up Reports event listeners...');
        try {
            // Report tab switching
            const reportTabs = document.querySelectorAll('.report-tab');
            console.log(`Found ${reportTabs.length} report tabs`);
            reportTabs.forEach(tab => {
                tab.addEventListener('click', (e) => {
                    const reportType = e.target.dataset.report;
                    this.switchReportType(reportType);
                });
            });

            // Generate report button
            const generateBtn = document.getElementById('generate-report-btn');
            if (generateBtn) {
                console.log('Found generate report button');
                generateBtn.addEventListener('click', () => {
                    this.generateTestemunhoReport();
                });
            } else {
                console.warn('⚠️ Generate report button not found');
            }

            // Export buttons
            const exportPdfBtn = document.getElementById('export-pdf-btn');
            if (exportPdfBtn) {
                exportPdfBtn.addEventListener('click', () => {
                    this.exportToPDF();
                });
            }

            const exportExcelBtn = document.getElementById('export-excel-btn');
            if (exportExcelBtn) {
                exportExcelBtn.addEventListener('click', () => {
                    this.exportToExcel();
                });
            }
            console.log('✅ Event listeners setup complete');
        } catch (error) {
            console.error('❌ Error setting up event listeners:', error);
            throw error;
        }
    }

    switchReportType(reportType) {
        // Update tab states
        document.querySelectorAll('.report-tab').forEach(tab => {
            tab.classList.remove('active');
        });
        const activeTab = document.querySelector(`[data-report="${reportType}"]`);
        if (activeTab) {
            activeTab.classList.add('active');
        }

        // Show corresponding report content
        document.querySelectorAll('.report-content').forEach(content => {
            content.classList.remove('active');
        });
        const activeContent = document.getElementById(`${reportType}-report`);
        if (activeContent) {
            activeContent.classList.add('active');
        }

        this.currentReportType = reportType;
    }

    populateDropdowns() {
        const monthSelect = document.getElementById('report-month');
        const yearSelect = document.getElementById('report-year');
        
        if (!monthSelect || !yearSelect) {
            console.log('⚠️ Report dropdowns not found yet');
            return;
        }

        const currentDate = new Date();

        // Populate months
        monthSelect.innerHTML = '';
        this.months.forEach((month, index) => {
            const option = document.createElement('option');
            option.value = index;
            option.textContent = month;
            if (index === currentDate.getMonth()) {
                option.selected = true;
            }
            monthSelect.appendChild(option);
        });

        // Populate years (current year and 2 years back)
        yearSelect.innerHTML = '';
        const currentYear = currentDate.getFullYear();
        for (let year = currentYear; year >= currentYear - 2; year--) {
            const option = document.createElement('option');
            option.value = year;
            option.textContent = year;
            if (year === currentYear) {
                option.selected = true;
            }
            yearSelect.appendChild(option);
        }
    }

    async generateTestemunhoReport() {
        const monthSelect = document.getElementById('report-month');
        const yearSelect = document.getElementById('report-year');
        
        if (!monthSelect || !yearSelect) {
            this.showError('Report controls not found');
            return;
        }

        const month = parseInt(monthSelect.value);
        const year = parseInt(yearSelect.value);

        this.showLoading(true);
        this.hideResults();

        try {
            const appointments = await this.fetchTestemunhoAppointments(month, year);
            
            if (appointments.length === 0) {
                this.showEmptyState();
                return;
            }

            const weeklyReport = this.groupAppointmentsByWeek(appointments, month, year);
            this.currentReportData = {
                appointments,
                weeklyReport,
                month,
                year
            };

            this.renderTestemunhoReport(weeklyReport, month, year);
            this.showExportButtons();

        } catch (error) {
            console.error('Error generating report:', error);
            this.showError('Failed to generate report. Please try again.');
        } finally {
            this.showLoading(false);
        }
    }

    async fetchTestemunhoAppointments(month, year) {
        try {
            // Create date range for the month
            const startDate = new Date(year, month, 1);
            const endDate = new Date(year, month + 1, 0, 23, 59, 59);

            console.log(`Fetching Testemunho Público appointments for ${this.months[month]} ${year}`);

            // Use the simplest possible query - just filter by title
            // All date filtering will be done in JavaScript to avoid any index issues
            const appointmentsRef = collection(db, 'appointments');
            const q = query(
                appointmentsRef,
                where('title', '==', 'Testemunho Público')
            );

            console.log('🔍 Executing Firebase query with only title filter...');
            const querySnapshot = await getDocs(q);
            console.log('✅ Query executed successfully, processing results...');
            const appointments = [];

            querySnapshot.forEach((doc) => {
                const data = doc.data();
                
                // Ensure we have a valid date field
                if (data.date) {
                    let appointmentDate;
                    
                    // Handle different date formats that might be stored in Firestore
                    if (typeof data.date.toDate === 'function') {
                        // Firestore Timestamp
                        appointmentDate = data.date.toDate();
                    } else if (data.date instanceof Date) {
                        // Already a Date object
                        appointmentDate = data.date;
                    } else if (typeof data.date === 'string') {
                        // Date string
                        appointmentDate = new Date(data.date);
                    } else {
                        // Skip this appointment if we can't parse the date
                        console.warn('Could not parse date for appointment:', doc.id, data.date);
                        return;
                    }
                    
                    // Filter by date range in JavaScript to completely avoid any composite index requirements
                    if (appointmentDate >= startDate && appointmentDate <= endDate) {
                        appointments.push({
                            id: doc.id,
                            ...data,
                            date: appointmentDate
                        });
                    }
                }
            });

            // Sort appointments by date in JavaScript
            appointments.sort((a, b) => a.date - b.date);

            console.log(`Found ${appointments.length} Testemunho Público appointments`);
            return appointments;

        } catch (error) {
            console.error('Error fetching appointments:', error);
            throw error;
        }
    }

    groupAppointmentsByWeek(appointments, month, year) {
        const weeks = {};
        const monthStart = new Date(year, month, 1);
        
        appointments.forEach(appointment => {
            const appointmentDate = appointment.date;
            const weekNumber = this.getWeekNumber(appointmentDate, monthStart);
            const weekKey = `week-${weekNumber}`;

            if (!weeks[weekKey]) {
                weeks[weekKey] = {
                    weekNumber,
                    startDate: this.getWeekStartDate(appointmentDate),
                    endDate: this.getWeekEndDate(appointmentDate),
                    appointments: []
                };
            }

            weeks[weekKey].appointments.push(appointment);
        });

        // Convert to array and sort by week number
        return Object.values(weeks).sort((a, b) => a.weekNumber - b.weekNumber);
    }

    getWeekNumber(date, monthStart) {
        const firstDayOfMonth = new Date(monthStart.getFullYear(), monthStart.getMonth(), 1);
        const daysSinceStart = Math.floor((date - firstDayOfMonth) / (24 * 60 * 60 * 1000));
        return Math.floor(daysSinceStart / 7) + 1;
    }

    getWeekStartDate(date) {
        const startDate = new Date(date);
        const dayOfWeek = startDate.getDay();
        startDate.setDate(startDate.getDate() - dayOfWeek);
        return startDate;
    }

    getWeekEndDate(date) {
        const endDate = new Date(date);
        const dayOfWeek = endDate.getDay();
        endDate.setDate(endDate.getDate() + (6 - dayOfWeek));
        return endDate;
    }

    renderTestemunhoReport(weeklyReport, month, year) {
        const resultsContainer = document.getElementById('report-results');
        if (!resultsContainer) return;
        
        const reportHTML = `
            <div class="report-header">
                <h3>📅 Testemunho Público Report - ${this.months[month]} ${year}</h3>
                <div class="report-summary">
                    <div class="summary-item">
                        <span class="summary-label">Total Appointments:</span>
                        <span class="summary-value">${this.currentReportData.appointments.length}</span>
                    </div>
                    <div class="summary-item">
                        <span class="summary-label">Weeks with Activity:</span>
                        <span class="summary-value">${weeklyReport.length}</span>
                    </div>
                </div>
            </div>

            <div class="weekly-breakdown">
                ${weeklyReport.map(week => this.renderWeekSection(week)).join('')}
            </div>
        `;

        resultsContainer.innerHTML = reportHTML;
        this.showResults();
    }

    renderWeekSection(week) {
        const formatDate = (date) => {
            return date.toLocaleDateString('en-US', { 
                month: 'short', 
                day: 'numeric' 
            });
        };

        const formatTime = (date) => {
            return date.toLocaleTimeString('en-US', { 
                hour: '2-digit', 
                minute: '2-digit',
                hour12: true
            });
        };

        return `
            <div class="week-section">
                <div class="week-header">
                    <h4>📅 Week ${week.weekNumber}</h4>
                    <span class="week-range">
                        ${formatDate(week.startDate)} - ${formatDate(week.endDate)}
                    </span>
                    <span class="week-count">${week.appointments.length} appointment${week.appointments.length !== 1 ? 's' : ''}</span>
                </div>
                
                <div class="week-appointments">
                    ${week.appointments.map(appointment => `
                        <div class="appointment-item">
                            <div class="appointment-datetime">
                                <span class="appointment-date">${this.weekDays[appointment.date.getDay()]}, ${formatDate(appointment.date)}</span>
                                <span class="appointment-time">${formatTime(appointment.date)}</span>
                            </div>
                            <div class="appointment-details">
                                <div class="appointment-title">${appointment.title}</div>
                                ${appointment.description ? `<div class="appointment-description">${appointment.description}</div>` : ''}
                                ${appointment.designations && appointment.designations.length > 0 ? `
                                    <div class="appointment-designations">
                                        <span class="designation-label">👥 Assigned:</span>
                                        <span class="designation-list">${appointment.designations.map(d => d.name).join(', ')}</span>
                                    </div>
                                ` : ''}
                            </div>
                        </div>
                    `).join('')}
                </div>
            </div>
        `;
    }

    showLoading(show) {
        const loadingElement = document.getElementById('report-loading');
        if (loadingElement) {
            loadingElement.style.display = show ? 'block' : 'none';
        }
    }

    showResults() {
        const resultsElement = document.getElementById('report-results');
        if (resultsElement) {
            resultsElement.style.display = 'block';
        }
    }

    hideResults() {
        const resultsElement = document.getElementById('report-results');
        const emptyElement = document.getElementById('report-empty');
        if (resultsElement) resultsElement.style.display = 'none';
        if (emptyElement) emptyElement.style.display = 'none';
    }

    showEmptyState() {
        const emptyElement = document.getElementById('report-empty');
        if (emptyElement) {
            emptyElement.style.display = 'block';
        }
        this.hideExportButtons();
    }

    showExportButtons() {
        const pdfBtn = document.getElementById('export-pdf-btn');
        const excelBtn = document.getElementById('export-excel-btn');
        if (pdfBtn) pdfBtn.style.display = 'inline-block';
        if (excelBtn) excelBtn.style.display = 'inline-block';
    }

    hideExportButtons() {
        const pdfBtn = document.getElementById('export-pdf-btn');
        const excelBtn = document.getElementById('export-excel-btn');
        if (pdfBtn) pdfBtn.style.display = 'none';
        if (excelBtn) excelBtn.style.display = 'none';
    }

    showError(message) {
        // You can implement a toast notification or modal here
        alert(message);
    }

    exportToPDF() {
        if (!this.currentReportData) return;
        alert('PDF export functionality will be implemented soon!');
    }

    exportToExcel() {
        if (!this.currentReportData) return;
        this.exportToCSV();
    }

    exportToCSV() {
        if (!this.currentReportData) return;

        const { appointments, month, year } = this.currentReportData;
        
        let csv = 'Date,Day,Time,Title,Description,Assigned Volunteers\n';
        
        appointments.forEach(appointment => {
            const date = appointment.date.toLocaleDateString();
            const day = this.weekDays[appointment.date.getDay()];
            const time = appointment.date.toLocaleTimeString('en-US', { 
                hour: '2-digit', 
                minute: '2-digit',
                hour12: true
            });
            const title = appointment.title || '';
            const description = (appointment.description || '').replace(/"/g, '""');
            const volunteers = appointment.designations ? 
                appointment.designations.map(d => d.name).join('; ') : '';

            csv += `"${date}","${day}","${time}","${title}","${description}","${volunteers}"\n`;
        });

        // Create and download the file
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);
        link.setAttribute('href', url);
        link.setAttribute('download', `testemunho-publico-${this.months[month]}-${year}.csv`);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }
}

// Export the manager for use in main-app.js
export { ReportsManager };