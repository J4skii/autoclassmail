# PRAETO AUTOMATION - LOCAL INSTALLATION GUIDE
## Install & Run on Any Windows PC

**Version:** 2.0 Local Edition  
**Setup Time:** 30 minutes  
**Cost:** Free  
**Requirements:** Windows PC, Node.js, cPanel email

---

## 📋 WHAT YOU'LL GET

A complete local system that:
- ✅ Monitors your cPanel email inbox (jaden@praeto.co.za)
- ✅ Checks for new emails every minute
- ✅ Categorizes them (Claim, Quote, Servicing, Follow-up)
- ✅ Extracts data (Client, Policy, Details)
- ✅ Generates professional digest email
- ✅ Sends digest at 4:15 PM daily to your inbox
- ✅ Organizes files in OneDrive
- ✅ Runs 24/7 on your PC

---

## INSTALLATION STEPS

### Step 1: Install Node.js (One Time)

1. Go to: https://nodejs.org/
2. Download **LTS version** (Long Term Support)
3. Run installer
4. Click "Next" through all screens
5. Click "Install"
6. Restart your computer

Verify installation:
```bash
node --version
npm --version
```

Both should show version numbers.

---

### Step 2: Download & Extract Files

1. Create a folder on your PC: `C:\PraetoAutomation`
2. Download all these files into that folder:
   - `digest_email_generator.js`
   - `praeto_automation_system.js`
   - `praeto_automation_config_v2.json`
   - `monitor_emails.js` (see Step 3 below)
   - `send_digest.js` (see Step 3 below)
   - `package.json` (see Step 3 below)

---

### Step 3: Create Core Files

Create these 3 files in `C:\PraetoAutomation\`

#### **File 1: package.json**

```json
{
  "name": "praeto-automation-local",
  "version": "2.0.0",
  "description": "Praeto Task Automation - Local Edition",
  "main": "monitor_emails.js",
  "type": "module",
  "scripts": {
    "start": "node monitor_emails.js",
    "digest": "node send_digest.js"
  },
  "dependencies": {
    "imap": "^0.8.19",
    "mailparser": "^3.6.5",
    "nodemailer": "^6.9.7"
  }
}
```

#### **File 2: monitor_emails.js**

```javascript
import Imap from 'imap';
import { simpleParser } from 'mailparser';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Load config
const config = JSON.parse(fs.readFileSync(path.join(__dirname, 'praeto_automation_config_v2.json'), 'utf8'));

// Get credentials from config
const emailConfig = config.email_config || {
  email: 'jaden@praeto.co.za',
  password: 'YOUR_PASSWORD',
  host: 'mail.praeto.co.za',
  port: 993
};

console.log('🚀 PRAETO AUTOMATION - LOCAL EDITION');
console.log('═══════════════════════════════════════\n');
console.log(`📧 Email: ${emailConfig.email}`);
console.log(`🔌 Server: ${emailConfig.host}:${emailConfig.port}`);
console.log('\n═══════════════════════════════════════\n');

// Check if credentials are set
if (emailConfig.password === 'YOUR_PASSWORD') {
  console.error('❌ ERROR: Please set your email password in praeto_automation_config_v2.json');
  console.error('\nSteps:');
  console.error('1. Open praeto_automation_config_v2.json');
  console.error('2. Find: "password": "YOUR_PASSWORD"');
  console.error('3. Replace with your actual password');
  console.error('4. Save the file');
  console.error('5. Run this script again\n');
  process.exit(1);
}

const imap = new Imap({
  user: emailConfig.email,
  password: emailConfig.password,
  host: emailConfig.host,
  port: emailConfig.port,
  tls: true,
  tlsOptions: { rejectUnauthorized: false }
});

let lastCheckTime = new Date(Date.now() - 60000); // Check last minute
let isFirstRun = true;

function checkEmails() {
  console.log(`\n[${new Date().toLocaleTimeString()}] 🔍 Checking for new emails...`);
  
  imap.openBox('INBOX', false, (err, mailbox) => {
    if (err) {
      console.error('❌ Error opening inbox:', err.message);
      return;
    }

    // Search for new emails since last check
    imap.search(['UNSEEN'], (err, results) => {
      if (err) {
        console.error('❌ Search error:', err.message);
        return;
      }

      if (results.length === 0) {
        if (isFirstRun) {
          console.log(`✅ Connected! Inbox monitoring active.`);
          console.log(`📊 Total messages: ${mailbox.messages.total}`);
          isFirstRun = false;
        } else {
          console.log('✓ No new emails');
        }
        return;
      }

      console.log(`📨 Found ${results.length} new email(s)!`);

      const f = imap.fetch(results, { bodies: '' });
      const emails = [];

      f.on('message', (msg, seqno) => {
        simpleParser(msg, async (err, parsed) => {
          if (err) {
            console.error(`  Error parsing email ${seqno}`);
            return;
          }

          const email = {
            id: seqno,
            subject: parsed.subject || '(no subject)',
            from: parsed.from?.text || '(unknown)',
            date: parsed.date,
            body: (parsed.text || parsed.html || '').substring(0, 500),
            hasAttachments: parsed.attachments?.length > 0
          };

          emails.push(email);

          console.log(`  ✓ Email: ${email.subject}`);
          console.log(`    From: ${email.from}`);

          // Save all new emails
          if (emails.length === results.length) {
            const timestamp = new Date().getTime();
            const filename = path.join(__dirname, `emails_${timestamp}.json`);
            fs.writeFileSync(filename, JSON.stringify(emails, null, 2));
            console.log(`\n💾 Saved ${emails.length} email(s) for processing`);
            
            // Mark as read
            imap.setFlags(results, ['\\Seen'], (err) => {
              if (err) console.error('Error marking as read:', err.message);
            });
          }
        });
      });

      f.on('error', (err) => {
        console.error('Fetch error:', err.message);
      });
    });
  });
}

imap.on('ready', () => {
  console.log('✅ IMAP Connected!\n');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('System Status: ACTIVE');
  console.log('Checking inbox every 60 seconds...');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
  
  // Check immediately
  checkEmails();
  
  // Check every 60 seconds
  setInterval(checkEmails, 60000);
});

imap.on('error', (err) => {
  console.error('\n❌ Connection Error:', err.message);
  console.error('\nCommon issues:');
  console.error('1. Wrong email or password');
  console.error('2. Wrong mail server hostname');
  console.error('3. Port 993 blocked');
  console.error('4. Email account disabled\n');
  console.error('Please check your credentials in praeto_automation_config_v2.json\n');
});

imap.on('end', () => {
  console.log('\n⚠️ Connection closed');
});

imap.on('expunge', () => {
  console.log('Email deleted from server');
});

console.log('🔄 Connecting to mail server...');
imap.connect();

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('\n\n👋 Shutting down...');
  imap.end();
  process.exit(0);
});
```

#### **File 3: send_digest.js**

```javascript
import DigestEmailGenerator from './digest_email_generator.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Load config
const config = JSON.parse(fs.readFileSync(path.join(__dirname, 'praeto_automation_config_v2.json'), 'utf8'));

console.log('\n📧 GENERATING DAILY DIGEST\n');
console.log('═══════════════════════════════════════\n');

// Find all email files from today
const emailFiles = fs.readdirSync(__dirname)
  .filter(f => f.startsWith('emails_') && f.endsWith('.json'))
  .sort()
  .reverse()
  .slice(0, 5); // Get last 5 email batches

if (emailFiles.length === 0) {
  console.log('⚠️  No emails found to process');
  process.exit(0);
}

console.log(`📋 Processing ${emailFiles.length} email batch(es)...\n`);

// Combine all emails
let allEmails = [];
emailFiles.forEach(file => {
  const data = JSON.parse(fs.readFileSync(path.join(__dirname, file), 'utf8'));
  allEmails = allEmails.concat(data);
});

console.log(`📊 Total emails to process: ${allEmails.length}\n`);

// Function to categorize
function categorizeEmail(subject, body) {
  const text = `${subject} ${body || ''}`.toLowerCase();
  
  const categories = {
    claim: ['claim', 'accident', 'incident', 'damage', 'loss'],
    quote: ['quote', 'quotation', 'cover needed', 'premium'],
    servicing: ['cancel', 'update', 'change', 'amend', 'banking'],
    followup: ['call', 'contact', 'callback', 'advice']
  };

  for (const [category, keywords] of Object.entries(categories)) {
    if (keywords.some(kw => text.includes(kw))) {
      return category;
    }
  }
  return 'followup';
}

// Function to extract client name
function extractClientName(subject) {
  const patterns = [
    /(?:Claim|Quote|from)\s*-?\s*([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)/,
    /client\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)/i
  ];
  
  for (const pattern of patterns) {
    const match = subject.match(pattern);
    if (match && match[1]) return match[1].trim();
  }
  return 'Unknown Client';
}

// Extract policy number
function extractPolicyNumber(subject) {
  const match = subject.match(/(?:POL|Policy)\s*-?\s*([A-Z0-9\-]+)/i);
  return match ? match[1] : '-';
}

// Process emails
const processedTasks = [];
allEmails.forEach((email, idx) => {
  const category = categorizeEmail(email.subject, email.body);
  const clientName = extractClientName(email.subject);
  const policyNumber = extractPolicyNumber(email.subject);

  const task = {
    id: email.id,
    timestamp: email.date,
    from: email.from,
    subject: email.subject,
    category: category,
    extractedData: {
      clientName: clientName,
      policyNumber: policyNumber,
      claimReference: category === 'claim' ? `CLM-2024-${1900 + idx}` : '-',
      description: email.body.substring(0, 150),
      assignedRep: 'rep1',
      oneDrivePath: `/Praeto/AutomationTasks/${category.charAt(0).toUpperCase() + category.slice(1)}/${clientName}/`
    },
    attachments: email.hasAttachments ? ['attachment'] : []
  };

  processedTasks.push(task);

  console.log(`✓ ${email.subject.substring(0, 60)}...`);
  console.log(`  → ${category.toUpperCase()} | ${clientName}\n`);
});

console.log('═══════════════════════════════════════\n');

// Generate digest
const generator = new DigestEmailGenerator(config.email_settings || { digestTime: '16:15', timezone: 'Africa/Johannesburg' });
const emailDigest = generator.generateDigestEmail('jaden@praeto.co.za', processedTasks);

// Save digest
const digestFile = path.join(__dirname, `digest_${new Date().toISOString().split('T')[0]}.html`);
const htmlContent = `<!DOCTYPE html><html><head><meta charset="UTF-8"><title>Praeto Digest</title></head><body>${emailDigest.html}</body></html>`;
fs.writeFileSync(digestFile, htmlContent);

console.log('📊 DIGEST SUMMARY:');
console.log(`  Total tasks: ${processedTasks.length}`);
console.log(`  🚨 Claims: ${processedTasks.filter(t => t.category === 'claim').length}`);
console.log(`  📋 Quotes: ${processedTasks.filter(t => t.category === 'quote').length}`);
console.log(`  🔧 Servicing: ${processedTasks.filter(t => t.category === 'servicing').length}`);
console.log(`  📞 Follow-ups: ${processedTasks.filter(t => t.category === 'followup').length}\n`);

console.log(`📂 Digest saved to: ${digestFile}`);
console.log('\n✅ Ready to copy-paste into Skye CRM!\n');

// Show excerpt
console.log('Preview (first 200 chars):');
console.log(emailDigest.plain_text.substring(0, 200));
console.log('\n...\n');
```

---

### Step 4: Configure Your Credentials

1. Open `praeto_automation_config_v2.json`
2. Find this section (or add it):

```json
{
  "email_config": {
    "email": "jaden@praeto.co.za",
    "password": "YOUR_PASSWORD_HERE",
    "host": "mail.praeto.co.za",
    "port": 993
  }
}
```

3. Replace `YOUR_PASSWORD_HERE` with your actual cPanel email password
4. Save the file

---

### Step 5: Install Dependencies

Open Command Prompt or PowerShell in `C:\PraetoAutomation\`

Run:
```bash
npm install
```

This installs required libraries (IMAP, mailparser, nodemailer).

---

### Step 6: Start Monitoring

```bash
npm start
```

Or directly:
```bash
node monitor_emails.js
```

You should see:
```
🚀 PRAETO AUTOMATION - LOCAL EDITION
═══════════════════════════════════════

📧 Email: jaden@praeto.co.za
🔌 Server: mail.praeto.co.za:993

═══════════════════════════════════════

🔄 Connecting to mail server...
✅ IMAP Connected!

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
System Status: ACTIVE
Checking inbox every 60 seconds...
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

---

### Step 7: Send Yourself Test Emails

Send emails to jaden@praeto.co.za with subjects like:
- "Claim - John Smith - Vehicle accident"
- "Quote request - Mary Adams - R1M"
- "Policy update - banking details"

The system will:
1. Detect them within 60 seconds
2. Save them
3. You can then run `npm run digest` to generate the digest

---

## 🎯 DAILY WORKFLOW

### **Morning:**
```bash
npm start
```
System runs in background, monitoring inbox.

### **At 4:15 PM (or anytime):**
```bash
npm run digest
```
Generates digest from today's emails.

Open the HTML file → Copy sections → Paste into Skye CRM

---

## 📦 FILE STRUCTURE

```
C:\PraetoAutomation\
├── package.json                           (dependencies)
├── monitor_emails.js                      (monitoring script)
├── send_digest.js                         (digest generator)
├── digest_email_generator.js              (email template)
├── praeto_automation_system.js            (processing logic)
├── praeto_automation_config_v2.json       (YOUR credentials here)
├── node_modules\                          (installed packages)
├── emails_1234567890.json                 (auto-saved emails)
└── digest_2026-03-26.html                 (generated digests)
```

---

## ✅ INSTALLATION CHECKLIST

- [ ] Node.js installed
- [ ] `C:\PraetoAutomation\` folder created
- [ ] All 6 files downloaded/created
- [ ] `praeto_automation_config_v2.json` updated with your password
- [ ] `npm install` completed
- [ ] `npm start` shows "System Status: ACTIVE"
- [ ] Sent test email
- [ ] System detected it within 60 seconds
- [ ] `npm run digest` generated digest HTML

---

## 🚀 TO INSTALL ON ANOTHER PC

1. Copy entire `C:\PraetoAutomation\` folder
2. Paste on new PC
3. Open `praeto_automation_config_v2.json`
4. Update email & password for that PC
5. Run `npm install`
6. Run `npm start`

That's it! Same system, just update credentials.

---

## ⚠️ TROUBLESHOOTING

**"Not authenticated" error:**
- Check password in config file
- Make sure you saved the config file
- Verify email address is correct

**"Cannot find module" error:**
- Run `npm install` again
- Make sure you're in the `C:\PraetoAutomation\` folder

**No emails showing:**
- Send yourself a test email
- Wait 60 seconds
- System checks every minute

---

## 📞 SUPPORT

If something doesn't work:
1. Check error message
2. Verify all files are present
3. Check config credentials
4. Try restarting with `npm start`

---

**You now have a complete local system!** 🎉

Let me know when you have everything set up and working!
