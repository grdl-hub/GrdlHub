# Appointment Titles Schema Design

## Firestore Collection: `appointmentTitles`

### Document Structure:
```javascript
{
  id: "auto-generated-id",
  title: "Testemunho Público",
  emoji: "🎤",
  displayOrder: 1,
  isActive: true,
  createdAt: Timestamp,
  createdBy: "user-uid",
  updatedAt: Timestamp,
  updatedBy: "user-uid"
}
```

### Example Documents:
```javascript
// Document 1
{
  title: "Testemunho Público",
  emoji: "🎤",
  displayOrder: 1,
  isActive: true,
  createdAt: "2025-09-22T10:00:00Z",
  createdBy: "admin-uid"
}

// Document 2
{
  title: "Reunião VMC",
  emoji: "📋",
  displayOrder: 2,
  isActive: true,
  createdAt: "2025-09-22T10:01:00Z",
  createdBy: "admin-uid"
}

// Document 3
{
  title: "Reunião de Oração",
  emoji: "🙏",
  displayOrder: 3,
  isActive: true,
  createdAt: "2025-09-22T10:02:00Z",
  createdBy: "admin-uid"
}
```

### Field Descriptions:
- `title`: The actual title text (required, unique)
- `emoji`: Icon for visual identification (optional)
- `displayOrder`: Sort order in dropdown (required, integer)
- `isActive`: Whether to show in dropdown (default: true)
- `createdAt/updatedAt`: Audit trail
- `createdBy/updatedBy`: User tracking

### Benefits:
1. **Dynamic Management**: Add/remove/edit titles through UI
2. **Ordering Control**: Custom sort order with displayOrder
3. **Soft Deletion**: Use isActive instead of deleting
4. **Audit Trail**: Track who created/modified what
5. **Visual Enhancement**: Emojis stored per title
6. **Real-time**: Changes reflect immediately across all users

### Security Rules:
```javascript
// Only authenticated users can read
// Only admins can write/modify
match /appointmentTitles/{titleId} {
  allow read: if request.auth != null;
  allow write: if request.auth != null && 
    get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'admin';
}
```

### Admin Interface Features:
- View all title options in sortable table
- Add new title with emoji picker
- Edit existing titles
- Reorder with drag-and-drop
- Enable/disable titles
- Delete confirmation with usage check