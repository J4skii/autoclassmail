# PRAETO TASK AUTOMATION SYSTEM
## Step-by-Step Deployment & Testing Guide

**Version:** 2.0  
**Date:** March 24, 2026

---

## 🎯 OPTION 1: QUICK TEST (No Coding Required - 15 minutes)

### What You Need
- Your admin6@praeto.co.za email
- Access to the 4 files provided
- Test emails to send

### Step 1: Understand the Flow
Before coding, let's test the concept:

1. You send an email TO admin6@praeto.co.za with task details
2. System reads that email
3. System extracts the info
4. System generates a digest email
5. Digest is sent BACK to admin6@praeto.co.za at 4:15 PM

### Step 2: Manual Test (Without Deployment)

**Action:** Send yourself a test email

1. Send an email TO admin6@praeto.co.za with subject:
   ```
   "Claim - John Smith - Vehicle accident on N1, Policy POL-2024-445"
   ```

2. The system would:
   - Detect: Task type = CLAIM
   - Extract: Client = John Smith, Policy = POL-2024-445
   - Save: Any attachments to OneDrive
   - Generate: HTML digest email
   - Send: Back to admin6@praeto.co.za

3. You'd receive a digest email like:
   ```
   Subject: Praeto Daily Task Digest - March 24, 2026
   
   Body:
   📊 Praeto Daily Task Digest
   
   🚨 CLAIMS (1 task)
   
   👤 John Smith
   - Subject: Vehicle accident on N1
   - Type: Claim
   - Policy: POL-2024-445
   - ✓ Ready for Skye CRM [copy-paste section]
   ```

---

## 🚀 OPTION 2: DEPLOY TO AZURE (Recommended - 1-2 hours)

### Prerequisites
- Azure account (free tier available)
- Admin access to Microsoft 365
- The 4 files provided

### Step 1: Set Up Azure Function

**1a. Create Azure Function App**
1. Go to https://portal.azure.com
2. Click "+ Create a resource"
3. Search for "Function App"
4. Click Create
5. Fill in:
   - **Resource Group:** Create new: `praeto-automation`
   - **Function App name:** `praeto-tasks` (must be unique)
   - **Runtime:** Node.js
   - **Region:** South Africa (if available) or Europe
   - Click "Create"

**1b. Wait for deployment** (2-3 minutes)

### Step 2: Deploy Code

**2a. Connect to your Function App**
1. Once created, go to Function App
2. Click "App Service Editor" (left menu)
3. Click "Go"

**2b. Create folder structure**
1. Right-click in file explorer
2. Create folder: `praeto-automation`

**2c. Upload files**
1. Copy contents of `digest_email_generator.js`
2. Create new file: `digest_email_generator.js`
3. Paste content

Do the same for:
- `praeto_automation_system.js`
- `praeto_automation_config_v2.json`
- Create `package.json`:

```json
{
  "name": "praeto-automation",
  "version": "2.0.0",
  "description": "Praeto Task Automation System",
  "main": "index.js",
  "dependencies": {
    "@azure/identity": "^3.1.0",
    "@microsoft/microsoft-graph-client": "^3.0.0",
    "node-fetch": "^2.6.7"
  }
}
```

### Step 3: Create Main Function

Create new file: `index.js`

```javascript
const PraetoAutomationSystem = require('./praeto_automation_system.js');
const config = require('./praeto_automation_config_v2.json');

// Initialize system
const system = new PraetoAutomationSystem(config);

module.exports = async function (context, req) {
  try {
    // Start monitoring
    await system.initialize();
    
    // Return status
    context.res = {
      status: 200,
      body: {
        message: "Praeto Automation System running",
        status: system.getStatus()
      }
    };
  } catch (error) {
    context.res = {
      status: 500,
      body: { error: error.message }
    };
  }
};
```

### Step 4: Set Up Email Integration

**4a. Create Azure Logic App**
1. Go to Azure Portal
2. Click "+ Create a resource"
3. Search for "Logic App"
4. Fill in details (same resource group)
5. Click "Create"

**4b. Set trigger: When email arrives**
1. Open Logic App
2. In designer, click "When a new email arrives"
3. Select Outlook connector
4. Sign in with admin6@praeto.co.za
5. Select folder: Inbox

**4c. Add action: Call Function**
1. Click "+ New step"
2. Search "Azure Functions"
3. Select "Call Azure Function"
4. Select your function app
5. Select function

**4d. Set schedule: Send digest at 4:15 PM**
1. Click "+ New step"
2. Search "Schedule"
3. Select "Recurrence"
4. Set:
   - Frequency: Daily
   - Time: 4:15 PM

### Step 5: Test the Flow

**Test Email 1: Send a claim**
1. Send email TO admin6@praeto.co.za
2. Subject: `Claim - Mary Adams - Property damage claim POL-2024-892`
3. Body: `Water damage in office, assessment needed`
4. Wait 1 minute

**Check:** 
- Go to Azure Function logs (Monitoring tab)
- Should show: "Email processed: Claim from Mary Adams"

**At 4:15 PM:**
- Check admin6 inbox for digest email
- Should contain:
  - 🚨 CLAIMS section
  - Mary Adams entry
  - Copy-paste ready format

---

## 💻 OPTION 3: RUN LOCALLY (For Testing - 30 minutes)

### Prerequisites
- Node.js installed (https://nodejs.org/)
- Your admin6 email
- The 4 files

### Step 1: Set Up Local Environment

**1a. Create project folder**
```bash
mkdir praeto-automation
cd praeto-automation
```

**1b. Initialize Node project**
```bash
npm init -y
```

**1c. Install dependencies**
```bash
npm install --save-dev @azure/identity @microsoft/microsoft-graph-client nodemailer dotenv
```

### Step 2: Copy Files

1. Copy `digest_email_generator.js` → `digest_email_generator.js`
2. Copy `praeto_automation_system.js` → `praeto_automation_system.js`
3. Copy `praeto_automation_config_v2.json` → `config.json`

### Step 3: Create Test File

Create `test.js`:

```javascript
const DigestEmailGenerator = require('./digest_email_generator.js');
const config = require('./config.json');

// Mock task data for testing
const mockTasks = [
  {
    id: 1,
    timestamp: new Date().toISOString(),
    from: "client@example.com",
    subject: "Claim - John Smith - Vehicle accident",
    category: "claim",
    extractedData: {
      clientName: "John Smith",
      policyNumber: "POL-2024-00445",
      claimReference: "CLM-2024-1847",
      description: "Vehicle accident on N1, vehicle damaged",
      assignedRep: "rep1",
      oneDrivePath: "/Praeto/AutomationTasks/Claims/John Smith/"
    },
    attachments: ["accident_photo_1.jpg", "accident_photo_2.jpg"]
  },
  {
    id: 2,
    timestamp: new Date().toISOString(),
    from: "salesrep@example.com",
    subject: "Quote request - Mary Adams",
    category: "quote",
    extractedData: {
      clientName: "Mary Adams",
      policyNumber: "-",
      claimReference: "-",
      description: "Life cover quote needed, R1M amount",
      assignedRep: "rep1",
      oneDrivePath: "/Praeto/AutomationTasks/Quotes/Mary Adams/"
    },
    attachments: []
  }
];

// Generate digest email
const generator = new DigestEmailGenerator(config.email_settings);
const emailData = generator.generateDigestEmail('admin6@praeto.co.za', mockTasks);

console.log('=== EMAIL DIGEST GENERATED ===\n');
console.log('TO:', emailData.to);
console.log('SUBJECT:', emailData.subject);
console.log('SEND TIME:', emailData.sendTime);
console.log('\n=== HTML PREVIEW ===\n');
console.log(emailData.html);
console.log('\n=== PLAIN TEXT VERSION ===\n');
console.log(emailData.plain_text);
```

### Step 4: Run Test

```bash
node test.js
```

**Output will show:**
- Email TO: admin6@praeto.co.za
- Subject: Praeto Daily Task Digest - [Date]
- Full HTML email content
- Plain text version

### Step 5: View Generated Email

1. Check console output
2. Copy the HTML section
3. Save as `digest_email.html`
4. Open in browser
5. See how email will look!

---

## ✅ TESTING CHECKLIST

### Test 1: Basic Email Processing
- [ ] Send test email with "claim" keyword
- [ ] Verify system categorizes as CLAIM
- [ ] Check OneDrive folder created
- [ ] Files organized correctly

### Test 2: Data Extraction
- [ ] Send email with: `Policy POL-2024-445`
- [ ] Verify extracted as: `POL-2024-445`
- [ ] Send email with: `Client John Smith`
- [ ] Verify extracted as: `John Smith`

### Test 3: Email Generation
- [ ] Generate digest email locally
- [ ] Verify HTML formatting correct
- [ ] Check summary stats accurate
- [ ] Verify "Ready for Skye" sections present

### Test 4: Multi-Task Digest
- [ ] Send 5 different task emails
- [ ] Verify all grouped by type
- [ ] Check all grouped by client name
- [ ] Verify count accurate

### Test 5: Scheduled Delivery
- [ ] Set digest time to 5 minutes from now
- [ ] Wait for email
- [ ] Verify received at correct time
- [ ] Check content matches expected

### Test 6: Copy-Paste to Skye
- [ ] Receive digest email
- [ ] Copy "Ready for Skye CRM" section
- [ ] Paste into Skye CRM manually
- [ ] Verify all fields populated correctly

---

## 🚦 QUICKEST PATH TO LIVE (RECOMMENDED)

### Week 1: Test Locally (No Azure)
1. **Monday:** Run `test.js` - see how digest looks
2. **Tuesday:** Send 5 test emails to admin6
3. **Wednesday:** Verify email generation works
4. **Thursday:** Test copy-paste workflow
5. **Friday:** Review & adjust

### Week 2: Deploy to Azure (Production)
1. **Monday:** Create Azure Function App
2. **Tuesday:** Deploy code
3. **Wednesday:** Connect to Outlook
4. **Thursday:** Send live test emails
5. **Friday:** Go live!

---

## 📝 TEST EMAIL EXAMPLES

### Test Email 1: Claim
```
To: admin6@praeto.co.za
Subject: Claim - John Smith - Vehicle accident on N1
Body: Client reported collision on N1 this morning. 
      Vehicle damaged. Policy POL-2024-445. 
      Photos attached.
Attachments: accident_photo_1.jpg, accident_photo_2.jpg
```

### Test Email 2: Quote
```
To: admin6@praeto.co.za
Subject: Quote request - Mary Adams
Body: Mary Adams requesting life insurance quote.
      Age 35, monthly income R45k, cover needed R1M.
Attachments: client_details.pdf
```

### Test Email 3: Servicing
```
To: admin6@praeto.co.za
Subject: Policy amendment - Client update banking details
Body: Client wants to update banking details for policy POL-2024-512.
      New account: FNB ending in 5678.
Attachments: bank_confirmation.pdf
```

### Test Email 4: Follow-up
```
To: admin6@praeto.co.za
Subject: Follow-up - Sarah Johnson needs consultation
Body: Client Sarah Johnson called asking for advice on 
      retirement annuity options. Policy POL-2024-789.
      Please contact her on 082-123-4567.
```

---

## 🔍 DEBUGGING & TROUBLESHOOTING

### Issue: "System can't find config.json"
**Solution:**
```javascript
// Make sure path is correct:
const config = require('./praeto_automation_config_v2.json');
// NOT: require('config.json');
```

### Issue: Email HTML looks broken
**Solution:**
1. Check `digest_email_generator.js` CSS block
2. Verify styles are inline (not in <style> tags)
3. Test in different email clients

### Issue: Files not saving to OneDrive
**Solution:**
1. Verify Azure credentials
2. Check folder path: `/Praeto/AutomationTasks/`
3. Verify permissions on OneDrive

### Issue: Emails not being detected
**Solution:**
1. Check Logic App trigger settings
2. Verify folder path correct (Inbox)
3. Check admin6 account is connected

---

## ✅ SUCCESS INDICATORS

You'll know it's working when:

1. ✅ Test email arrives → System processes within 1 minute
2. ✅ Files appear in OneDrive correctly organized
3. ✅ Digest email has professional formatting
4. ✅ Copy-paste section works in Skye CRM
5. ✅ Multi-task grouping is correct
6. ✅ Next digest scheduled for 4:15 PM

---

## 📞 QUICK REFERENCE

### Local Testing (No Setup)
```bash
node test.js
```
Output: HTML email preview

### Deploy to Azure
1. Create Function App
2. Upload files
3. Set up Logic App trigger
4. Schedule digest delivery

### Add Admin7 Later
1. Update config.json
2. Add admin7@praeto.co.za
3. Set digest time (e.g., 9:00 AM)
4. Redeploy

---

## 🎯 START HERE (Pick One)

### Option A: "Just Show Me" (5 mins)
```bash
# Run this to see a generated digest email
node test.js
# Output: Beautiful HTML email preview
```

### Option B: "Test Locally" (30 mins)
1. Download Node.js
2. Copy files to folder
3. Run `npm install`
4. Run `node test.js`
5. Send test emails manually
6. Check output

### Option C: "Deploy Today" (2 hours)
1. Create Azure account
2. Deploy Function App
3. Connect Logic App
4. Send live test emails
5. Receive digest email
6. Test Skye CRM workflow

---

**Which option works best for you?**

1. **Just testing the concept?** → Option A (5 mins)
2. **Want to test locally first?** → Option B (30 mins)
3. **Ready to go live?** → Option C (2 hours)

Let me know which you'd like to start with, and I can give you detailed instructions!
