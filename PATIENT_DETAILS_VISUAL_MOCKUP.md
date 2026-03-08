# Patient Details Page - Visual Mockups

## 🎨 Design Overview

### Layout Structure

```
┌─────────────────────────────────────────────────────────────────────────┐
│  [← Back]  Patient Details                    [Edit] [Delete]          │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │  🎨 HERO SECTION (Gradient Background)                          │   │
│  │  ┌───────────────────────────────────────────────────────────┐ │   │
│  │  │  [Profile Image]  John Doe                    [Active]     │ │   │
│  │  │  128x128px        PAT-20241201-000001        [Status Badge]│ │   │
│  │  │                                                             │ │   │
│  │  │  ┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐                      │ │   │
│  │  │  │ Age  │ │Gender│ │Blood │ │Visits│                      │ │   │
│  │  │  │ 45   │ │ Male │ │ O+   │ │  12  │                      │ │   │
│  │  │  └──────┘ └──────┘ └──────┘ └──────┘                      │ │   │
│  │  │                                                             │ │   │
│  │  │  [📞 Call] [✉️ Email] [✏️ Update Status]                    │ │   │
│  │  └───────────────────────────────────────────────────────────┘ │   │
│  │                                                                 │   │
│  │  ⚠️ ALERT BANNERS (if allergies/conditions exist)              │   │
│  │  ┌───────────────────────────────────────────────────────────┐ │   │
│  │  │ ⚠️ Allergies: [Penicillin] [Peanuts] [Dust]               │ │   │
│  │  └───────────────────────────────────────────────────────────┘ │   │
│  │  ┌───────────────────────────────────────────────────────────┐ │   │
│  │  │ 📋 Chronic Conditions: [Diabetes] [Hypertension]            │ │   │
│  │  └───────────────────────────────────────────────────────────┘ │   │
│  └─────────────────────────────────────────────────────────────────┘   │
│                                                                         │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │  📑 TAB NAVIGATION                                               │   │
│  │  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐          │   │
│  │  │ Overview │ │ Medical  │ │ Visits(12)│ │Docs (5)  │          │   │
│  │  │   ✓      │ │   Info   │ │           │ │          │          │   │
│  │  └──────────┘ └──────────┘ └──────────┘ └──────────┘          │   │
│  └─────────────────────────────────────────────────────────────────┘   │
│                                                                         │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │  📄 TAB CONTENT AREA                                             │   │
│  │                                                                   │   │
│  │  [Content changes based on selected tab]                         │   │
│  │                                                                   │   │
│  └─────────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## 1️⃣ HERO SECTION (Detailed View)

```
╔═══════════════════════════════════════════════════════════════════════╗
║  🎨 GRADIENT BACKGROUND (Indigo-50 → White → Slate-50)              ║
║                                                                       ║
║  ┌─────────────────────────────────────────────────────────────────┐  ║
║  │                                                                 │  ║
║  │  ┌──────────┐                                                  │  ║
║  │  │          │  John Doe                    [Active] [Discharged]│  ║
║  │  │  [IMG]   │  PAT-20241201-000001                             │  ║
║  │  │ 128x128  │                                                  │  ║
║  │  │ Rounded  │  ┌─────┐ ┌─────┐ ┌─────┐ ┌─────┐               │  ║
║  │  │  Border  │  │ Age │ │Gender│ │Blood│ │Total│               │  ║
║  │  │  White   │  │ 45  │ │ Male │ │ O+  │ │Visits│               │  ║
║  │  │ Shadow   │  │ yrs │ │      │ │     │ │  12  │               │  ║
║  │  └──────────┘  └─────┘ └─────┘ └─────┘ └─────┘               │  ║
║  │                                                                 │  ║
║  │  ┌───────────────────────────────────────────────────────────┐ │  ║
║  │  │ [📞 +91 9876543210] [✉️ Email] [✏️ Update Status]          │ │  ║
║  │  └───────────────────────────────────────────────────────────┘ │  ║
║  │                                                                 │  ║
║  └─────────────────────────────────────────────────────────────────┘  ║
║                                                                       ║
║  ⚠️ ALERT BANNERS (Conditional - Only if data exists)                ║
║  ┌─────────────────────────────────────────────────────────────────┐  ║
║  │ ⚠️  Allergies                                                   │  ║
║  │     [Penicillin] [Peanuts] [Dust] [Latex]                      │  ║
║  │     Amber Background, Red Border                                │  ║
║  └─────────────────────────────────────────────────────────────────┘  ║
║  ┌─────────────────────────────────────────────────────────────────┐  ║
║  │ 📋  Chronic Conditions                                           │  ║
║  │     [Diabetes Type 2] [Hypertension] [Asthma]                   │  ║
║  │     Rose Background, Red Border                                  │  ║
║  └─────────────────────────────────────────────────────────────────┘  ║
╚═══════════════════════════════════════════════════════════════════════╝
```

**Color Scheme:**
- Background: Gradient from `indigo-50` → `white` → `slate-50`
- Profile Image: White border with shadow
- Stats Cards: White background, subtle borders
- Buttons: Indigo for primary, Slate for secondary
- Alert Banners: Amber (allergies), Rose (conditions)

---

## 2️⃣ TAB NAVIGATION

```
┌─────────────────────────────────────────────────────────────────────┐
│  TAB NAVIGATION BAR                                                 │
│  ┌──────────────┐ ┌──────────────┐ ┌──────────────┐ ┌────────────┐ │
│  │ 📄 Overview  │ │ 🏥 Medical   │ │ ⏰ Visits(12)│ │📁 Docs (5)│ │
│  │   Active      │ │   Info       │ │             │ │            │ │
│  │   ─────────   │ │              │ │             │ │            │ │
│  │   Indigo      │ │              │ │             │ │            │ │
│  └──────────────┘ └──────────────┘ └──────────────┘ └────────────┘ │
└─────────────────────────────────────────────────────────────────────┘
```

**Active Tab:**
- Indigo border bottom (2px)
- Indigo text color
- Icon visible

**Inactive Tabs:**
- Transparent border
- Slate text color
- Hover: Slate border, darker text

---

## 3️⃣ OVERVIEW TAB CONTENT

```
┌─────────────────────────────────────────────────────────────────────┐
│  📄 OVERVIEW TAB                                                     │
│                                                                      │
│  ┌──────────────────────────────────────────────────────────────┐  │
│  │ 📋 Personal Information                                        │  │
│  │ ┌──────────────────────────────────────────────────────────┐ │  │
│  │ │ Patient ID: PAT-20241201-000001                          │ │  │
│  │ │ Date of Birth: January 15, 1979                          │ │  │
│  │ │ Gender: Male                                              │ │  │
│  │ │ Blood Group: O+                                            │ │  │
│  │ │ Registered: Dec 1, 2024                                    │ │  │
│  │ └──────────────────────────────────────────────────────────┘ │  │
│  └──────────────────────────────────────────────────────────────┘  │
│                                                                      │
│  ┌──────────────────────────────────────────────────────────────┐  │
│  │ 📞 Contact Information                                         │  │
│  │ ┌──────────────────────────────────────────────────────────┐ │  │
│  │ │ Phone: +91 9876543210                                    │ │  │
│  │ │ Email: john.doe@example.com                               │ │  │
│  │ │                                                           │ │  │
│  │ │ Emergency Contact:                                        │ │  │
│  │ │   Jane Doe (Spouse) - +91 9876543211                     │ │  │
│  │ └──────────────────────────────────────────────────────────┘ │  │
│  └──────────────────────────────────────────────────────────────┘  │
│                                                                      │
│  ┌──────────────────────────────────────────────────────────────┐  │
│  │ 📍 Address                                                     │  │
│  │ ┌──────────────────────────────────────────────────────────┐ │  │
│  │ │ 123 Main Street                                           │ │  │
│  │ │ Downtown Area                                             │ │  │
│  │ │ Mumbai, Maharashtra 400001                                │ │  │
│  │ │ India                                                      │ │  │
│  │ └──────────────────────────────────────────────────────────┘ │  │
│  └──────────────────────────────────────────────────────────────┘  │
│                                                                      │
│  ┌──────────────────────────────────────────────────────────────┐  │
│  │ 🏷️ Tags                                                       │  │
│  │ ┌──────────────────────────────────────────────────────────┐ │  │
│  │ │ [VIP] [Senior Citizen] [Regular Patient]                 │ │  │
│  │ └──────────────────────────────────────────────────────────┘ │  │
│  └──────────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────┘
```

**Card Design:**
- White background
- Rounded corners (xl)
- Subtle border (slate-200)
- Shadow on hover
- Icon + Title header
- Clean spacing

---

## 4️⃣ MEDICAL INFO TAB CONTENT

```
┌─────────────────────────────────────────────────────────────────────┐
│  🏥 MEDICAL INFO TAB                                                │
│                                                                      │
│  ┌──────────────────────────────────────────────────────────────┐  │
│  │ 📋 Medical History                                             │  │
│  │ ┌──────────────────────────────────────────────────────────┐ │  │
│  │ │ Previous surgeries: Appendectomy (2010)                  │ │  │
│  │ │ Family history: Father - Heart disease                     │ │  │
│  │ │ Current medications: Metformin, Lisinopril               │ │  │
│  │ └──────────────────────────────────────────────────────────┘ │  │
│  └──────────────────────────────────────────────────────────────┘  │
│                                                                      │
│  ┌──────────────────────────────────────────────────────────────┐  │
│  │ ⚠️ Allergies                                                   │  │
│  │ ┌──────────────────────────────────────────────────────────┐ │  │
│  │ │ [Penicillin] [Peanuts] [Dust] [Latex]                    │ │  │
│  │ │ Amber badges with warning icon                            │ │  │
│  │ └──────────────────────────────────────────────────────────┘ │  │
│  └──────────────────────────────────────────────────────────────┘  │
│                                                                      │
│  ┌──────────────────────────────────────────────────────────────┐  │
│  │ 📋 Chronic Conditions                                         │  │
│  │ ┌──────────────────────────────────────────────────────────┐ │  │
│  │ │ [Diabetes Type 2] [Hypertension] [Asthma]               │ │  │
│  │ │ Rose badges with document icon                            │ │  │
│  │ └──────────────────────────────────────────────────────────┘ │  │
│  └──────────────────────────────────────────────────────────────┘  │
│                                                                      │
│  ┌──────────────────────────────────────────────────────────────┐  │
│  │ 📝 Notes                                                       │  │
│  │ ┌──────────────────────────────────────────────────────────┐ │  │
│  │ │ Patient prefers morning appointments.                     │ │  │
│  │ │ Requires wheelchair assistance.                           │ │  │
│  │ └──────────────────────────────────────────────────────────┘ │  │
│  └──────────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────┘
```

**Visual Elements:**
- Medical History: Text area with scroll
- Allergies: Amber badges with ⚠️ icon
- Conditions: Rose badges with 📋 icon
- Notes: Plain text area

---

## 5️⃣ VISITS TAB CONTENT

```
┌─────────────────────────────────────────────────────────────────────┐
│  ⏰ VISITS TAB (12 visits)                                         │
│                                                                      │
│  [+ Add Visit]                                                       │
│                                                                      │
│  ┌──────────────────────────────────────────────────────────────┐  │
│  │ 📅 Timeline View (Chronological - Newest First)              │  │
│  │                                                              │  │
│  │ ┌────────────────────────────────────────────────────────┐  │  │
│  │ │ Dec 15, 2024  [Consultation]  Dr. Smith               │  │  │
│  │ │ ────────────────────────────────────────────────────── │  │  │
│  │ │ Chief Complaint: Fever and cough                        │  │  │
│  │ │ Diagnosis: Upper respiratory infection                 │  │  │
│  │ │ Treatment: Antibiotics, rest                           │  │  │
│  │ │ Notes: Patient responding well to treatment            │  │  │
│  │ └────────────────────────────────────────────────────────┘  │  │
│  │                                                              │  │
│  │ ┌────────────────────────────────────────────────────────┐  │  │
│  │ │ Dec 10, 2024  [Follow-up]  Dr. Smith                   │  │  │
│  │ │ ────────────────────────────────────────────────────── │  │  │
│  │ │ Chief Complaint: Routine checkup                        │  │  │
│  │ │ Diagnosis: Stable condition                           │  │  │
│  │ │ Treatment: Continue current medications                │  │  │
│  │ └────────────────────────────────────────────────────────┘  │  │
│  │                                                              │  │
│  │ ┌────────────────────────────────────────────────────────┐  │  │
│  │ │ Dec 5, 2024  [Emergency]  Dr. Johnson                  │  │  │
│  │ │ ────────────────────────────────────────────────────── │  │  │
│  │ │ Chief Complaint: Chest pain                             │  │  │
│  │ │ Diagnosis: Acid reflux                                 │  │  │
│  │ │ Treatment: Antacids, dietary changes                   │  │  │
│  │ └────────────────────────────────────────────────────────┘  │  │
│  │                                                              │  │
│  └──────────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────┘
```

**Timeline Design:**
- Each visit in a card
- Date badge (indigo)
- Visit type badge (color-coded)
- Doctor name
- Collapsible details
- Hover effect

---

## 6️⃣ DOCUMENTS TAB CONTENT

```
┌─────────────────────────────────────────────────────────────────────┐
│  📁 DOCUMENTS TAB (5 documents)                                    │
│                                                                      │
│  [+ Upload Document]                                                 │
│                                                                      │
│  ┌──────────────────────────────────────────────────────────────┐  │
│  │ Grid Layout (3 columns on desktop, 2 on tablet, 1 on mobile)│  │
│  │                                                              │  │
│  │ ┌──────────┐ ┌──────────┐ ┌──────────┐                    │  │
│  │ │ [Report] │ │[Prescrip]│ │ [Lab]     │                    │  │
│  │ │          │ │          │ │           │                    │  │
│  │ │ Blood    │ │Medication│ │X-Ray      │                    │  │
│  │ │ Test     │ │List      │ │Chest      │                    │  │
│  │ │          │ │          │ │           │                    │  │
│  │ │ 2.5 MB   │ │ 1.2 MB   │ │ 5.8 MB    │                    │  │
│  │ │ Dec 15   │ │ Dec 10   │ │ Dec 5     │                    │  │
│  │ │          │ │          │ │           │                    │  │
│  │ │[View][DL]│ │[View][DL]│ │[View][DL]│                    │  │
│  │ └──────────┘ └──────────┘ └──────────┘                    │  │
│  │                                                              │  │
│  │ ┌──────────┐ ┌──────────┐                                  │  │
│  │ │ [Scan]   │ │ [Other]  │                                  │  │
│  │ │          │ │          │                                  │  │
│  │ │ CT Scan  │ │Insurance │                                  │  │
│  │ │ Head     │ │Card Copy │                                  │  │
│  │ │          │ │          │                                  │  │
│  │ │ 8.3 MB   │ │ 0.5 MB   │                                  │  │
│  │ │ Nov 28   │ │ Nov 20   │                                  │  │
│  │ │          │ │          │                                  │  │
│  │ │[View][DL]│ │[View][DL]│                                  │  │
│  │ └──────────┘ └──────────┘                                  │  │
│  └──────────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────┘
```

**Document Card:**
- Type badge (top)
- Title (bold)
- Description (optional)
- File size + Date
- Action buttons: View, Download, Delete

---

## 🎨 Color Palette

### Status Colors
```
Active:      Emerald (Green)   - bg-emerald-50, text-emerald-700
Discharged:  Blue              - bg-blue-50, text-blue-700
Transferred: Purple            - bg-purple-50, text-purple-700
Deceased:    Red               - bg-red-50, text-red-700
Absconded:   Orange            - bg-orange-50, text-orange-700
On Leave:    Yellow            - bg-yellow-50, text-yellow-700
Follow-up:   Indigo            - bg-indigo-50, text-indigo-700
Inactive:    Slate (Gray)      - bg-slate-50, text-slate-700
```

### Alert Colors
```
Allergies:        Amber (Yellow-Orange) - bg-amber-50, border-amber-200
Conditions:       Rose (Pink-Red)       - bg-rose-50, border-rose-200
```

### Primary Colors
```
Indigo: Primary actions, active states
Slate:  Secondary text, borders
White:  Card backgrounds
```

---

## 📱 Responsive Breakpoints

### Mobile (< 640px)
- Single column layout
- Stacked hero section
- Full-width tabs (scrollable)
- Single column cards

### Tablet (640px - 1024px)
- 2-column grid for stats
- 2-column document grid
- Horizontal hero section

### Desktop (> 1024px)
- 4-column stats grid
- 3-column document grid
- Full hero section with all elements

---

## ✨ Interactive Elements

### Hover States
- Cards: Subtle shadow increase
- Buttons: Background color darken
- Tabs: Border appears on hover

### Active States
- Tab: Indigo border bottom, indigo text
- Button: Darker shade when clicked

### Loading States
- Spinner animation
- Skeleton screens for content

---

## 🔄 User Flow

```
1. User lands on page
   ↓
2. Sees Hero Section with key info
   ↓
3. Notices Alert Banners (if critical info exists)
   ↓
4. Clicks tab to navigate
   ↓
5. Views organized content in cards
   ↓
6. Takes quick actions (call, email, update status)
```

---

## 🎯 Key UX Improvements

1. **Information Hierarchy**: Critical info at top (Hero)
2. **Reduced Scrolling**: Tabs organize content
3. **Quick Actions**: One-click contact buttons
4. **Visual Alerts**: Prominent allergy/condition warnings
5. **Card Layout**: Easy to scan and read
6. **Responsive**: Works on all devices
7. **Color Coding**: Status and alerts are color-coded
8. **Timeline View**: Chronological visit history

---

## 📊 Before vs After Comparison

### BEFORE
- Single long form
- All info in one scroll
- No visual hierarchy
- Hard to find critical info
- No quick actions

### AFTER
- Hero section with key info
- Tabbed organization
- Clear visual hierarchy
- Prominent alerts
- Quick action buttons
- Card-based layout
- Better mobile experience
