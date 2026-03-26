/**
 * PRAETO TASK AUTOMATION SYSTEM
 * Production Entry Point
 *
 * Usage:
 *   node main.js              - run once (fetch + send digest if tasks found)
 *   node main.js --daemon     - run continuously, check every 5 minutes
 */

'use strict';

const path      = require('path');
const fs        = require('fs');
const Imap      = require('imap');
const { simpleParser } = require('mailparser');
const nodemailer = require('nodemailer');
const DigestEmailGenerator = require('./digest_email_generator.js');

// ── Resolve base directory (works both via `node` and as a pkg .exe) ─────────
const BASE_DIR = process.pkg
  ? path.dirname(process.execPath)   // running as .exe
  : process.cwd();                   // running via node

// ── Load .env ─────────────────────────────────────────────────────────────────
require('dotenv').config({ path: path.join(BASE_DIR, '.env') });

// ── Load config ───────────────────────────────────────────────────────────────
const configPath = path.join(BASE_DIR, 'praeto_automation_config_v2.json');
const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));

// ── Validate required env vars ────────────────────────────────────────────────
const required = ['IMAP_HOST', 'IMAP_USER', 'IMAP_PASSWORD', 'SMTP_HOST', 'SMTP_USER', 'SMTP_PASSWORD'];
const missing  = required.filter(k => !process.env[k]);
if (missing.length) {
  console.error(`❌ Missing required environment variables: ${missing.join(', ')}`);
  console.error(`   Edit the .env file next to praeto-email.exe and fill in your credentials.`);
  process.exit(1);
}

// ── IMAP: fetch unseen emails ─────────────────────────────────────────────────
function fetchEmails() {
  return new Promise((resolve, reject) => {
    const imap = new Imap({
      user:    process.env.IMAP_USER,
      password: process.env.IMAP_PASSWORD,
      host:    process.env.IMAP_HOST,
      port:    parseInt(process.env.IMAP_PORT || '993'),
      tls:     true,
      tlsOptions: { rejectUnauthorized: false }
    });

    const emails = [];

    imap.once('ready', () => {
      imap.openBox('INBOX', false, (err, box) => {
        if (err) { imap.end(); return reject(err); }

        console.log(`📬 Inbox: ${box.messages.total} total, checking for UNSEEN...`);

        imap.search(['UNSEEN'], (err, results) => {
          if (err) { imap.end(); return reject(err); }

          if (!results || results.length === 0) {
            console.log('   No new emails.');
            imap.end();
            return resolve([]);
          }

          console.log(`   Found ${results.length} unseen email(s).`);
          const f = imap.fetch(results, { bodies: '', markSeen: true });
          let pending = results.length;

          f.on('message', (msg, seqno) => {
            msg.on('body', stream => {
              simpleParser(stream, (err, parsed) => {
                if (!err) {
                  emails.push({
                    id:          seqno,
                    subject:     parsed.subject || '(no subject)',
                    from:        parsed.from ? parsed.from.text : '(unknown)',
                    date:        parsed.date,
                    body:        parsed.text || '',
                    html:        parsed.html || '',
                    attachments: parsed.attachments || []
                  });
                }
                if (--pending === 0) imap.end();
              });
            });
          });

          f.once('error', reject);
        });
      });
    });

    imap.once('error', reject);
    imap.once('end', () => resolve(emails));
    imap.connect();
  });
}

// ── Categorise by config keywords ─────────────────────────────────────────────
function categorise(email) {
  const text = (email.subject + ' ' + email.body).toLowerCase();
  const categories = Object.entries(config.task_categories);
  for (const [key, cat] of categories) {
    if (cat.keywords.some(kw => text.includes(kw.toLowerCase()))) return key;
  }
  return 'followup';
}

function extractField(text, patterns) {
  for (const p of patterns) {
    const m = text.match(new RegExp(p, 'i'));
    if (m && m[1]) return m[1].trim();
  }
  return '-';
}

function buildTask(email) {
  const text      = email.subject + ' ' + email.body;
  const category  = categorise(email);
  const rules     = config.extraction_rules;
  const folders   = config.onedrive_structure.folders;
  const folderMap = { claim: folders.claims, quote: folders.quotes, servicing: folders.policies, followup: folders.followups };
  const clientName = extractField(text, rules.clientNamePatterns) || 'Unknown Client';

  return {
    id:        Date.now() + Math.random(),
    timestamp: new Date().toISOString(),
    from:      email.from,
    subject:   email.subject,
    category,
    status:    'processed',
    attachments: email.attachments.map(a => a.filename).filter(Boolean),
    extractedData: {
      clientName,
      policyNumber:   extractField(text, rules.policyNumberPatterns),
      claimReference: extractField(text, rules.claimReferencePatterns),
      description:    email.body.substring(0, 200).trim(),
      assignedRep:    (config.sales_representatives[0] && config.sales_representatives[0].name) || 'Admin',
      oneDrivePath:   (folderMap[category] || folders.claims) + '/' + clientName + '/'
    }
  };
}

// ── Send digest via SMTP ───────────────────────────────────────────────────────
async function sendDigest(tasks) {
  const generator = new DigestEmailGenerator(config.email_settings);
  const toEmail   = process.env.DIGEST_TO_EMAIL || config.admin_team[0].email;
  const emailData = generator.generateDigestEmail(toEmail, tasks);

  const transporter = nodemailer.createTransport({
    host:   process.env.SMTP_HOST,
    port:   parseInt(process.env.SMTP_PORT || '587'),
    secure: parseInt(process.env.SMTP_PORT || '587') === 465,
    auth:   { user: process.env.SMTP_USER, pass: process.env.SMTP_PASSWORD },
    tls:    { rejectUnauthorized: false }
  });

  await transporter.sendMail({
    from:    '"' + (process.env.SMTP_FROM_NAME || 'Praeto Automation') + '" <' + (process.env.SMTP_FROM_EMAIL || process.env.SMTP_USER) + '>',
    to:      toEmail,
    subject: emailData.subject,
    html:    emailData.html,
    text:    emailData.plain_text
  });

  console.log('✅ Digest sent to ' + toEmail + ' — ' + tasks.length + ' task(s)');
}

// ── Main run ───────────────────────────────────────────────────────────────────
async function run() {
  console.log('\n[' + new Date().toLocaleString('en-ZA') + '] 🔄 Checking emails...\n');

  const emails = await fetchEmails();
  if (emails.length === 0) return;

  const tasks = emails.map(buildTask);

  tasks.forEach(t => {
    const cat = config.task_categories[t.category];
    console.log('  ' + cat.icon + ' [' + t.category.toUpperCase() + '] ' + t.subject);
    console.log('     Client: ' + t.extractedData.clientName);
  });

  // Save daily log next to exe / cwd
  const logFile = path.join(BASE_DIR, 'tasks_' + new Date().toISOString().split('T')[0] + '.json');
  const existing = fs.existsSync(logFile) ? JSON.parse(fs.readFileSync(logFile)) : [];
  fs.writeFileSync(logFile, JSON.stringify(existing.concat(tasks), null, 2));
  console.log('\n💾 Tasks saved to ' + logFile);

  await sendDigest(tasks);
}

// ── Daemon vs one-shot ─────────────────────────────────────────────────────────
const isDaemon = process.argv.includes('--daemon');

if (isDaemon) {
  const INTERVAL = 5 * 60 * 1000;
  console.log('🚀 Praeto Automation running in daemon mode (every 5 min)\n');
  run().catch(console.error);
  setInterval(() => run().catch(console.error), INTERVAL);
} else {
  run().then(() => {
    console.log('\nDone.');
    process.exit(0);
  }).catch(err => {
    console.error('❌ Fatal error:', err.message);
    process.exit(1);
  });
}
