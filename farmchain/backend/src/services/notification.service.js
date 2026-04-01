class NotificationService {
  constructor() {
    this.notifications = [];
    this.subscribers = new Map();
  }

  addNotification(userId, type, message, data) {
    const notification = {
      id: Date.now() + Math.floor(Math.random() * 1000), // Random component in case of collision
      userId,
      type,
      message,
      data,
      read: false,
      createdAt: new Date()
    };
    this.notifications.push(notification);
    
    // Broadcast if subscribed (placeholder for WebSockets)
    this.broadcastToRole('ALL', notification.message, notification.data);
    return notification;
  }

  getNotifications(userId) {
    return this.notifications
      .filter(n => n.userId === userId)
      .sort((a, b) => b.createdAt - a.createdAt);
  }

  markRead(notificationId) {
    // Coerce types just in case inputs are strings
    const notif = this.notifications.find(n => n.id === Number(notificationId));
    if (notif) {
      notif.read = true;
      return true;
    }
    return false;
  }

  broadcastToRole(role, message, data) {
    // In production, loop over WebSocket clients assigned to 'role'
    console.log(`[Notification] Broacast to ${role}: ${message}`);
  }
}

module.exports = new NotificationService();
