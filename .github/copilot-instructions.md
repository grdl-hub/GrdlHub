# Copilot Instructions

<!-- Use this file to provide workspace-specific custom instructions to Copilot. For more details, visit https://code.visualstudio.com/docs/copilot/copilot-customization#_use-a-githubcopilotinstructionsmd-file -->

## Project Overview
This is a Progressive Web App (PWA) hub built with Vite, Firebase Authentication, and Firestore. The app serves as a centralized platform with multiple pages and role-based access control.

## Key Architecture Principles
- **Minimalistic Design**: Follow jwevent.org design principles for clean, accessible UI
- **Security First**: Implement invite-only access with email verification
- **Offline Capable**: Use IndexedDB for local data caching and offline functionality
- **Role-Based Access**: Admin controls for page-level user permissions
- **Mobile-First**: Responsive design for desktop, tablet, and phone

## Technical Stack
- **Frontend**: Vite + Vanilla JavaScript
- **Authentication**: Firebase Auth with email/password
- **Database**: Firestore for user management and permissions
- **PWA**: Service Worker for offline capabilities and app installation
- **Styling**: Modern CSS with CSS Grid/Flexbox
- **Offline Storage**: IndexedDB via idb library

## Code Style Guidelines
- Use ES6+ features and modern JavaScript
- Implement modular architecture with separate files for each feature
- Follow async/await patterns for Firebase operations
- Use semantic HTML and accessible design patterns
- Implement proper error handling and user feedback

## Security Considerations
- Validate all user inputs
- Implement proper Firebase security rules
- Use email verification before granting access
- Store sensitive data securely in Firestore
- Implement proper session management

## Firebase Integration
- Use Firebase v9+ modular SDK
- Implement real-time listeners for user state changes
- Follow Firebase best practices for security rules
- Use Firestore for scalable data management

## User Experience
- Provide clear feedback for all user actions
- Implement loading states and error messages
- Ensure accessibility compliance (WCAG 2.1)
- Support offline usage with graceful degradation
