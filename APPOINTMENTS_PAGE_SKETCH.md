# GrdlHub - Appointments Page Sketch

## 📅 **APPOINTMENTS PAGE LAYOUT**

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                              🏠 GrdlHub - Appointments                            │
├─────────────────────────────────────────────────────────────────────────────────┤
│                                                                                 │
│  ┌─ CALENDAR HEADER ──────────────────────────────────────────────────────────┐ │
│  │  ← [September 2025] →                                [➕ New Appointment]  │ │
│  └─────────────────────────────────────────────────────────────────────────────┘ │
│                                                                                 │
│  ┌─ MONTHLY CALENDAR GRID (Monday Start) ─────────────────────────────────────┐ │
│  │                                                                             │ │
│  │  ┌───┬───┬───┬───┬───┬───┬───┐                                             │ │
│  │  │Mon│Tue│Wed│Thu│Fri│Sat│Sun│                                             │ │
│  │  ├───┼───┼───┼───┼───┼───┼───┤                                             │ │
│  │  │   │   │ 1 │ 2 │ 3 │ 4 │ 5 │                                             │ │
│  │  ├───┼───┼───┼───┼───┼───┼───┤                                             │ │
│  │  │ 6 │ 7 │ 8 │ 9 │10 │11 │12 │                                             │ │
│  │  ├───┼───┼───┼───┼───┼───┼───┤                                             │ │
│  │  │13 │14 │15 │16*│17 │18 │19 │  (* = Today highlighted)                   │ │
│  │  │   │   │   │🎉│   │   │   │                                             │ │
│  │  │   │   │   │📋│   │   │   │  (🎉📋 = Appointment icons in cells)      │ │
│  │  ├───┼───┼───┼───┼───┼───┼───┤                                             │ │
│  │  │20 │21 │22 │23 │24 │25 │26 │                                             │ │
│  │  │📋 │   │⏰ │   │   │📋 │   │                                             │ │
│  │  │10:00AM│  │9:00AM│  │  │2:00PM│                                          │ │
│  │  ├───┼───┼───┼───┼───┼───┼───┤                                             │ │
│  │  │27 │28 │29 │30 │   │   │   │                                             │ │
│  │  └───┴───┴───┴───┴───┴───┴───┘                                             │ │
│  │                                                                             │ │
│  │  🔍 Each day cell shows:                                                   │ │
│  │     • Day number                                                           │ │
│  │     • Appointment previews (max 3 visible)                                │ │
│  │     • "+X more" indicator if > 3 appointments                             │ │
│  │     • Click day = Create new appointment                                  │ │
│  │     • Click appointment = Edit existing                                   │ │
│  └─────────────────────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────────────────────┘
```

## 📝 **CREATE APPOINTMENT MODAL**

```
┌─ CREATE NEW APPOINTMENT MODAL ──────────────────────────────────────────────────┐
│ ✕                                                                               │
│                                                                                 │
│  📋 Basic Information:                                                         │
│  ┌─ Title ─────────────────────┐  ┌─ Type ──────────────────────┐              │
│  │ [Dropdown: Testemunho...]▼ │  │ [📋 Meeting] ▼               │              │
│  │ [Custom input if needed]   │  │                              │              │
│  └────────────────────────────┘  └──────────────────────────────┘              │
│                                                                                 │
│  ┌─ Location/Place ──────────────────────────┐  ┌─ Duration ──────────────┐    │
│  │ [Text input + suggestions datalist]       │  │ [60 min] ▼             │    │
│  └───────────────────────────────────────────┘  └────────────────────────┘    │
│                                                                                 │
│  ┌─ Date ────────────┐  ┌─ Time ────────────┐                                  │
│  │ [2025-09-22] 📅   │  │ [14:30] 🕒       │                                  │
│  └───────────────────┘  └───────────────────┘                                  │
│                                                                                 │
│  🔄 Recurring Options:                                                         │
│  ☐ Make this a recurring appointment                                           │
│                                                                                 │
│  [If checked, shows:]                                                          │
│  ┌─ Repeat Pattern ────────────┐  ┌─ End Date ─────────────┐                  │
│  │ [Weekly] ▼                  │  │ [2025-12-31] 📅        │                  │
│  └─────────────────────────────┘  └────────────────────────┘                  │
│                                                                                 │
│  📝 Additional Notes:                                                          │
│  ┌─ Description ─────────────────────────────────────────────────────────────┐ │
│  │ [Multi-line text area for notes...]                                       │ │
│  └───────────────────────────────────────────────────────────────────────────┘ │
│                                                                                 │
│  [Cancel]                                              [💾 Save Appointment]  │
└─────────────────────────────────────────────────────────────────────────────────┘
```

## ✏️ **EDIT APPOINTMENT MODAL**

```
┌─ EDIT APPOINTMENT MODAL ────────────────────────────────────────────────────────┐
│ ✕                                                                               │
│                                                                                 │
│  ✏️ Edit Appointment (same form fields as create)                             │
│                                                                                 │
│  [Pre-populated with existing appointment data]                                │
│                                                                                 │
│  🔄 For Recurring Appointments:                                               │
│  ┌─ Recurring Notice ─────────────────────────────────────────────────────────┐ │
│  │ 🔄 This is a recurring appointment (Weekly)                               │ │
│  │ When you save changes, you'll be asked if you want to apply them to      │ │
│  │ all future occurrences.                                                   │ │
│  └───────────────────────────────────────────────────────────────────────────┘ │
│                                                                                 │
│  [Cancel]                                              [💾 Save Changes]      │
└─────────────────────────────────────────────────────────────────────────────────┘
```

## 🎯 **KEY FEATURES**

### **📅 Calendar Interaction:**
- **Monday-start weeks** (Mon, Tue, Wed, Thu, Fri, Sat, Sun)
- **Click empty day area** → Opens create appointment modal
- **Click appointment item** → Opens edit appointment modal
- **Navigation**: ← → buttons to change months
- **Today highlighting**: Current date has special styling

### **📋 Smart Form System:**
- **Dynamic title dropdown**: Loads from Firestore with custom option
- **Appointment types**: Meeting 📋, Task ✅, Event 🎉, Reminder ⏰
- **Location suggestions**: Datalist with common locations
- **Duration presets**: 15min to 2+ hours
- **Recurring support**: Weekly, monthly patterns with end dates

### **🔄 Recurring Appointments:**
- **Pattern options**: Daily, Weekly, Monthly, Yearly
- **Exception handling**: Cancel/modify individual occurrences
- **End date support**: Optional termination
- **Bulk edit prompts**: Apply changes to all future occurrences

### **⚡ Real-time Features:**
- **Firestore sync**: Real-time appointment updates
- **Usage statistics**: Track appointment title usage
- **Admin controls**: Manage titles in Settings page
- **Validation**: Form validation with user feedback

### **📱 Responsive Design:**
- **Mobile-first**: Calendar adapts to screen size
- **Touch-friendly**: Large touch targets for mobile
- **Modal overlays**: Backdrop blur with animations
- **Keyboard navigation**: Full keyboard support

### **🎨 Visual Polish:**
- **Appointment previews**: Time + title in calendar cells
- **Type icons**: Visual indicators for appointment types
- **Status indicators**: Active/cancelled/modified styling
- **Smooth animations**: Modal transitions and hover effects