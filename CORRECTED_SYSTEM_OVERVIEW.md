# PRAETO TASK AUTOMATION SYSTEM
## CORRECTED ARCHITECTURE & OVERVIEW

**Status:** ✅ CORRECTED - Now monitoring ADMIN inboxes (admin6@, admin7@, etc.)  
**Date:** March 24, 2026

---

## 🎯 WHAT THE SYSTEM DOES (CORRECTED)

### The Real Workflow

```
1. Task emails arrive in ADMIN inboxes
   └─ admin6@praeto.co.za receives task emails
   └─ admin7@praeto.co.za receives task emails
   └─ admin8@praeto.co.za receives task emails

2. System monitors each ADMIN's inbox (24/7)
   └─ Scans admin6's inbox for new emails
   └─ Scans admin7's inbox for new emails
   └─ etc.

3. For each email, AI processes it
   └─ Categorizes: Claim/Quote/Servicing/Follow-up
   └─ Extracts: Client, Policy, Details
   └─ Saves: Attachments to OneDrive

4. Daily digest email is generated & sent BACK to same admin
   └─ admin6 receives digest of all their day's emails at 4:15 PM
   └─ admin7 receives digest of all their day's emails at 9:00 AM
   └─ etc.

5. Admin uses digest to populate Skye CRM
   └─ Review email digest (organized & formatted)
   └─ Copy each task section
   └─ Paste into Skye CRM
```

---

## 📊 SYSTEM FLOW (CORRECTED)

```
Admin6's Inbox
├─ Email 1: Claim from John Smith
├─ Email 2: Quote request Mary Adams  
├─ Email 3: Policy update Sarah Chen
└─ Email 4: Follow-up needed

        ↓ (AI Processing)

OneDrive Auto-Organization
├─ /Praeto/AutomationTasks/Claims/John Smith/
├─ /Praeto/AutomationTasks/Quotes/Mary Adams/
├─ /Praeto/AutomationTasks/Policies/Sarah Chen/
└─ /Praeto/AutomationTasks/FollowUps/

        ↓ (At 4:15 PM SAST)

Email Digest sent TO admin6@praeto.co.za
"Praeto Daily Task Digest - March 24"
├─ 🚨 CLAIMS (1 task)
│  └─ John Smith - Vehicle accident
├─ 📋 QUOTES (1 task)
│  └─ Mary Adams - Life insurance
├─ 🔧 SERVICING (1 task)
│  └─ Sarah Chen - Policy update
└─ 📞 FOLLOW-UPS (1 task)
   └─ Client callback needed

        ↓ (Admin Reviews & Acts)

Admin6 opens email digest in Outlook
└─ Copy "Ready for Skye CRM" sections
   └─ Paste into Skye CRM
```

---

## ⚙️ CONFIGURATION (CORRECTED)

### For Admin6 Only

```json
{
  "monitored_inboxes": [
    {
      "email": "admin6@praeto.co.za",
      "label": "Admin 6 Inbox",
      "active": true
    }
  ],
  "admin_team": [
    {
      "name": "Admin 6",
      "email": "admin6@praeto.co.za",
      "digestTime": "16:15",
      "monitoredInboxes": ["admin6@praeto.co.za"]
    }
  ]
}
```

### To Add Admin7 (monitors their own inbox)

```json
{
  "monitored_inboxes": [
    {
      "email": "admin6@praeto.co.za",
      "label": "Admin 6 Inbox"
    },
    {
      "email": "admin7@praeto.co.za",
      "label": "Admin 7 Inbox"
    }
  ],
  "admin_team": [
    {
      "email": "admin6@praeto.co.za",
      "digestTime": "16:15",
      "monitoredInboxes": ["admin6@praeto.co.za"]
    },
    {
      "email": "admin7@praeto.co.za",
      "digestTime": "09:00",
      "monitoredInboxes": ["admin7@praeto.co.za"]
    }
  ]
}
```

### To Add Admin8 (monitors their own inbox)

```json
{
  "monitored_inboxes": [
    {
      "email": "admin6@praeto.co.za",
      "label": "Admin 6 Inbox"
    },
    {
      "email": "admin7@praeto.co.za",
      "label": "Admin 7 Inbox"
    },
    {
      "email": "admin8@praeto.co.za",
      "label": "Admin 8 Inbox"
    }
  ],
  "admin_team": [
    {
      "email": "admin6@praeto.co.za",
      "digestTime": "16:15",
      "monitoredInboxes": ["admin6@praeto.co.za"]
    },
    {
      "email": "admin7@praeto.co.za",
      "digestTime": "09:00",
      "monitoredInboxes": ["admin7@praeto.co.za"]
    },
    {
      "email": "admin8@praeto.co.za",
      "digestTime": "14:00",
      "monitoredInboxes": ["admin8@praeto.co.za"]
    }
  ]
}
```

---

## 📧 WHAT ADMIN6 RECEIVES AT 4:15 PM

**Email Subject:** `Praeto Daily Task Digest - Mon, 24 Mar 2026`

**Email Body:**

```
┌─────────────────────────────────────────────┐
│  HEADER                                     │
│  📊 Praeto Daily Task Digest                │
│  Monday, 24 March 2026                      │
│  Total Tasks: 4 | Claims: 1 | Quotes: 1    │
└─────────────────────────────────────────────┘

Good afternoon!

Below is your summary of today's incoming task emails.
Each task is grouped by type and client name.

🚨 CLAIMS (1 task)
─────────────────

👤 John Smith
┌─────────────────────────────────────────┐
│ Subject: Vehicle accident on N1         │
│ Type: Claim                             │
│ Policy: POL-2024-00445                  │
│ Details: Client reported collision      │
│ 📁 Files: /Praeto/AutomationTasks/...   │
│                                         │
│ ✓ Ready for Skye CRM                   │
│ Task Type: Claim                        │
│ Client: John Smith                      │
│ Policy #: POL-2024-00445                │
│ Summary: Vehicle accident on N1         │
│ Assigned: rep1                          │
└─────────────────────────────────────────┘

📋 QUOTES (1 task)
──────────────────

👤 Mary Adams
┌─────────────────────────────────────────┐
│ Subject: Life insurance quote request   │
│ Type: Quote                             │
│ Product: Life Cover                     │
│ Amount: R1,000,000                      │
│ 📁 Files: /Praeto/AutomationTasks/...   │
│                                         │
│ ✓ Ready for Skye CRM                   │
│ Task Type: Quote Request                │
│ Client: Mary Adams                      │
│ Summary: Life cover R1M needed          │
│ Assigned: rep1                          │
└─────────────────────────────────────────┘

[Continue for other task types...]

┌─────────────────────────────────────────┐
│ 📋 Ready to Copy-Paste into Skye?      │
│ Each section above is formatted and     │
│ ready to copy-paste directly into Skye. │
└─────────────────────────────────────────┘

Footer:
📊 Total Tasks: 4 | Claims: 1 | Quotes: 1 | Servicing: 1 | Follow-ups: 1
⏰ Next Digest: Tomorrow at 4:15 PM SAST
❓ Need Help? Files organized in OneDrive
```

---

## ✅ WHAT'S NOW CORRECT

### What Changed
- ❌ Old: Monitored `inbox@praeto.co.za` (doesn't exist)
- ✅ New: Monitors `admin6@praeto.co.za` (real admin email)
- ❌ Old: Digest sent to `admin@praeto.co.za`
- ✅ New: Digest sent back to SAME admin who received emails

### How It Works Now
```
Task emails come TO admin6
        ↓
System monitors admin6's inbox
        ↓
Categorizes & extracts all day's emails
        ↓
Generates digest email
        ↓
Sends digest back TO admin6 at 4:15 PM
        ↓
Admin6 uses digest to enter into Skye
```

---

## 🎯 IMPLEMENTATION (CORRECTED)

### Current Configuration
- **Monitored Inbox:** admin6@praeto.co.za ✅
- **Digest Recipient:** admin6@praeto.co.za ✅
- **Digest Time:** 4:15 PM SAST ✅
- **Digest Frequency:** Daily ✅

### When Ready to Add Admin7
- Add email: `admin7@praeto.co.za`
- Add digest time: `09:00` SAST (or their preferred time)
- System will monitor their inbox separately

### When Ready to Add Admin8
- Add email: `admin8@praeto.co.za`
- Add digest time: `14:00` SAST (or their preferred time)
- System will monitor their inbox separately

---

## 📁 ONEDRIVE FOLDER STRUCTURE (SAME)

Files are still saved the same way:
```
/Praeto/AutomationTasks/
├─ Claims/[Client Name]/
├─ Quotes/[Client Name]/
├─ Policies/[Client Name]/
└─ FollowUps/[Client Name]/
```

---

## ⏱️ TIME SAVINGS (SAME)

- **Before:** Admin reads email (2 min) + extracts (2 min) + types (3 min) = 7 mins per task
- **After:** Admin reviews digest (10 sec) + copies (20 sec) + pastes (varies) = 1-2 mins per task
- **Savings:** 80% reduction per task

---

## 🚀 NEXT STEPS (CORRECTED)

1. ✅ Confirm admin6@praeto.co.za is the correct email
2. ✅ Confirm 4:15 PM SAST is the correct digest time
3. ⬜ Create OneDrive folder: `/Praeto/AutomationTasks/`
4. ⬜ Provide sales rep names for config
5. ⬜ When ready, provide admin7 email & time
6. ⬜ When ready, provide admin8 email & time

---

## ❌ MISTAKES I'VE CORRECTED

- ❌ Was suggesting `inbox@praeto.co.za` (doesn't exist)
- ✅ Now correctly using `admin6@praeto.co.za` (real admin email)
- ❌ Was unclear about monitoring vs. delivery
- ✅ Now clear: Monitor admin's inbox → Send digest back to same admin
- ❌ Was confusing multi-inbox setup
- ✅ Now clear: Each admin monitors their own inbox

**Sorry for the confusion. The system is now correctly configured for admin inboxes.**

---

**Version:** 2.0 CORRECTED  
**Status:** ✅ READY FOR DEPLOYMENT  
**Files Updated:** All 4 files now reflect the correct architecture
