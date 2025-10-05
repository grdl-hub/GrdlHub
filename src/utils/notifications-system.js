// Notifications System for Admin Alerts
// Handles creating and managing notifications for form submissions

import { collection, addDoc, query, where, getDocs, updateDoc, doc, serverTimestamp, orderBy, limit } from 'firebase/firestore';
import { db, getCurrentUser } from '../auth.js';

/**
 * Create a notification for admins when a user submits a form
 * @param {Object} params - Notification parameters
 * @param {string} params.type - Type of notification ('form_submission', 'task_completed', etc.)
 * @param {string} params.title - Notification title
 * @param {string} params.message - Notification message
 * @param {string} params.userId - ID of user who triggered the notification
 * @param {string} params.userEmail - Email of user who triggered the notification
 * @param {Object} params.metadata - Additional data (formType, taskId, etc.)
 */
export async function createAdminNotification({ type, title, message, userId, userEmail, metadata = {} }) {
    try {
        console.log('📬 Creating admin notification:', { type, title, userId });
        
        const notificationsRef = collection(db, 'notifications');
        
        const notificationData = {
            type,
            title,
            message,
            userId,
            userEmail,
            metadata,
            read: false,
            createdAt: serverTimestamp(),
            targetRole: 'admin' // Only admins should see this
        };
        
        const docRef = await addDoc(notificationsRef, notificationData);
        console.log('✅ Notification created with ID:', docRef.id);
        
        return docRef.id;
    } catch (error) {
        console.error('❌ Error creating notification:', error);
        throw error;
    }
}

/**
 * Get all notifications for the current user (admin only)
 * @param {boolean} unreadOnly - If true, only return unread notifications
 * @param {number} limitCount - Maximum number of notifications to return
 */
export async function getNotifications(unreadOnly = false, limitCount = 50) {
    try {
        const currentUser = getCurrentUser();
        if (!currentUser) {
            throw new Error('No user logged in');
        }
        
        console.log('📬 Loading notifications...');
        
        const notificationsRef = collection(db, 'notifications');
        let q = query(
            notificationsRef,
            where('targetRole', '==', 'admin'),
            orderBy('createdAt', 'desc'),
            limit(limitCount)
        );
        
        if (unreadOnly) {
            q = query(
                notificationsRef,
                where('targetRole', '==', 'admin'),
                where('read', '==', false),
                orderBy('createdAt', 'desc'),
                limit(limitCount)
            );
        }
        
        const querySnapshot = await getDocs(q);
        const notifications = [];
        
        querySnapshot.forEach((doc) => {
            notifications.push({
                id: doc.id,
                ...doc.data()
            });
        });
        
        console.log(`✅ Loaded ${notifications.length} notifications`);
        return notifications;
    } catch (error) {
        console.error('❌ Error loading notifications:', error);
        throw error;
    }
}

/**
 * Mark a notification as read
 * @param {string} notificationId - ID of the notification to mark as read
 */
export async function markNotificationAsRead(notificationId) {
    try {
        console.log('✅ Marking notification as read:', notificationId);
        
        const notificationRef = doc(db, 'notifications', notificationId);
        await updateDoc(notificationRef, {
            read: true,
            readAt: serverTimestamp()
        });
        
        console.log('✅ Notification marked as read');
    } catch (error) {
        console.error('❌ Error marking notification as read:', error);
        throw error;
    }
}

/**
 * Mark all notifications as read for current user
 */
export async function markAllNotificationsAsRead() {
    try {
        console.log('✅ Marking all notifications as read...');
        
        const notificationsRef = collection(db, 'notifications');
        const q = query(
            notificationsRef,
            where('targetRole', '==', 'admin'),
            where('read', '==', false)
        );
        
        const querySnapshot = await getDocs(q);
        const updatePromises = [];
        
        querySnapshot.forEach((docSnapshot) => {
            const notificationRef = doc(db, 'notifications', docSnapshot.id);
            updatePromises.push(
                updateDoc(notificationRef, {
                    read: true,
                    readAt: serverTimestamp()
                })
            );
        });
        
        await Promise.all(updatePromises);
        console.log(`✅ Marked ${updatePromises.length} notifications as read`);
    } catch (error) {
        console.error('❌ Error marking all notifications as read:', error);
        throw error;
    }
}

/**
 * Get count of unread notifications
 */
export async function getUnreadNotificationCount() {
    try {
        const currentUser = getCurrentUser();
        if (!currentUser) {
            return 0;
        }
        
        const notificationsRef = collection(db, 'notifications');
        const q = query(
            notificationsRef,
            where('targetRole', '==', 'admin'),
            where('read', '==', false)
        );
        
        const querySnapshot = await getDocs(q);
        return querySnapshot.size;
    } catch (error) {
        console.error('❌ Error getting unread notification count:', error);
        return 0;
    }
}
