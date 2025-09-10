# GrdlHub Registration Page - Visual Sketch

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           🌐 GrdlHub Registration Page                        │
└─────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────┐
│                    🎯 HEADER (Blue Background #1976d2)                       │
│                                                                               │
│                               GrdlHub                                        │
│                        User Registration Management                          │
│                                                                               │
└─────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────┐
│  📍 NAVIGATION BAR                                                           │
│  [← Main App]                                    [Sign Out]                  │
└─────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────┐
│                           📝 ADD NEW USER SECTION                            │
│                                                                               │
│   Add New User                                                               │
│   ┌─────────────────────────────────────────────────────────────────────┐   │
│   │                        FORM GRID (2 columns)                        │   │
│   │                                                                     │   │
│   │  ┌──────────────────────────┐  ┌──────────────────────────┐        │   │
│   │  │ Full Name *              │  │ Congregation *           │        │   │
│   │  │ [John Doe____________]   │  │ [Central Congregation__] │        │   │
│   │  └──────────────────────────┘  └──────────────────────────┘        │   │
│   │                                                                     │   │
│   │  ┌──────────────────────────┐  ┌──────────────────────────┐        │   │
│   │  │ Email Address *          │  │ Role                     │        │   │
│   │  │ [user@example.com_____]  │  │ [User ▼]                 │        │   │
│   │  └──────────────────────────┘  └──────────────────────────┘        │   │
│   │                                                                     │   │
│   │  ┌──────────────────────────┐                                      │   │
│   │  │ Status                   │                                      │   │
│   │  │ [Pending Invitation ▼]   │                                      │   │
│   │  └──────────────────────────┘                                      │   │
│   │                                                                     │   │
│   │  ┌─────────────────────────────────────────────────────────────┐   │   │
│   │  │ Notes (Optional)                                            │   │   │
│   │  │ [Additional notes about this user...                       │   │   │
│   │  │                                                             │   │   │
│   │  │                                        ]                    │   │   │
│   │  └─────────────────────────────────────────────────────────────┘   │   │
│   │                                                                     │   │
│   │          [Clear Form]                           [Add User]          │   │
│   └─────────────────────────────────────────────────────────────────────┘   │
│                                                                               │
└─────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────┐
│                        👥 REGISTERED USERS SECTION                           │
│                                                                               │
│   Registered Users                                         [🔄 Refresh]      │
│                                                                               │
│   ┌─────────────────────────────────────────────────────────────────────┐   │
│   │                           USERS TABLE                               │   │
│   │                                                                     │   │
│   │ ┌─────────┬──────────────────┬─────────────────┬──────┬────────┬─────────┐ │   │
│   │ │  Name   │   Congregation   │     Email       │ Role │ Status │ Actions │ │   │
│   │ ├─────────┼──────────────────┼─────────────────┼──────┼────────┼─────────┤ │   │
│   │ │ John D. │ Central Cong.    │ john@example.com│ User │ Active │ [Edit]  │ │   │
│   │ │         │                  │                 │      │        │ [Del]   │ │   │
│   │ ├─────────┼──────────────────┼─────────────────┼──────┼────────┼─────────┤ │   │
│   │ │ Nuno M. │ Development      │ nuno@example.com│Admin │ Active │ [Edit]  │ │   │
│   │ │         │                  │                 │      │        │ [Del]   │ │   │
│   │ ├─────────┼──────────────────┼─────────────────┼──────┼────────┼─────────┤ │   │
│   │ │   ...   │       ...        │       ...       │ ...  │  ...   │   ...   │ │   │
│   │ └─────────┴──────────────────┴─────────────────┴──────┴────────┴─────────┘ │   │
│   └─────────────────────────────────────────────────────────────────────┘   │
│                                                                               │
└─────────────────────────────────────────────────────────────────────────────┘

═══════════════════════════════════════════════════════════════════════════════

📋 FIELD DETAILS:

🔹 Form Fields (2-column grid layout):
   • Full Name * (text input, required)
   • Congregation * (text input, required)  ← MOVED HERE after Name
   • Email Address * (email input, required)
   • Role (dropdown: User/Administrator/Moderator)
   • Status (dropdown: Pending/Active/Suspended)
   • Notes (textarea, optional, full width)

🔹 Buttons:
   • Clear Form (secondary button)
   • Add User (primary blue button)

🔹 Users Table:
   • Shows all registered users
   • Sortable columns
   • Edit/Delete actions per row
   • Refresh button to reload data

🎨 STYLING:
   • Clean white background with blue header
   • Card-based layout with shadows
   • Responsive grid system
   • Inter font family
   • Blue theme (#1976d2)

📱 RESPONSIVE:
   • Form grid adapts to screen size
   • Mobile-friendly input fields
   • Touch-friendly buttons
```
