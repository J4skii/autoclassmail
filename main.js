/**
 * PRAETO TASK AUTOMATION SYSTEM
 * Production Entry Point
 *
 * Usage:
 *   node main.js              - run once (fetch + send digest if tasks found)
 *   node main.js --daemon     - run continuously, digest at scheduled time
 */

import 'dotenv/config';
import Imap from 'imap';
import { simpleParser } from 'mailparser';
import nodemailer from 'nodemailer';
import fs from 'fs';
import { readFileSync } from 'fs';

// ── Load config ──────────────────────────────────────────────────────────────
const config = JSON.parse(readFileSync('./praeto_automation_config_v2.json', 'utf8'));

// ── Validate required env vars ───────────────────────────────────────────────
const required = ['IMAP_HOST', 'IMAP_USER', 'IMAP_PASSWORD', 'SMTP_HOST', 'SMTP_USER', 'SMTP_PASSWORD'];
const missing = required.filter(k => !process.env[k]);
if (missing.length) {
  console.error(`❌ Missing required environment variables: ${missing.join(', ')}`);
  console.error('   Copy .env.example to .env and fill in your credentials.');
  process.exit(1);
}

// ── IMAP: fetch new/unseen emails ─────────────────────────────────────────────
function fetchEmails() {
  return new Promise((resolve, reject) => {
    const imap = new Imap({
      user: process.env.IMAP_USER,
      password: process.env.IMAP_PASSWORD,
      host: process.env.IMAP_HOST,
      port: parseInt(process.env.IMAP_PORT || '993'),
      tls: true,
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
                    id: seqno,
                    subject: parsed.subject || '(no subject)',
                    from: parsed.from?.text || '(unknown)',
                    date: parsed.date,
                    body: parsed.text || '',
                    html: parsed.html || '',
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

// ── Email categorisation (from config keywords) ───────────────────────────────
function categorise(email) {
  const text = `${email.subject} ${email.body}`.toLowerCase();
  for (const [key, cat] of Object.entries(config.task_categories)) {
    if (cat.keywords.some(kw => text.includes(kw.toLowerCase()))) return key;
  }
  return 'followup';
}

function extractField(text, patterns) {
  for (const p of patterns) {
    const m = text.match(new RegExp(p, 'i'));
    if (m?.[1]) return m[1].trim();
  }
  return '-';
}

function buildTask(email) {
  const text = `${email.subject} ${email.body}`;
  const category = categorise(email);
  const rules = config.extraction_rules;
  const clientName = extractField(text, rules.clientNamePatterns) || 'Unknown Client';
  const policyNumber = extractField(text, rules.policyNumberPatterns);
  const claimReference = extractField(text, rules.claimReferencePatterns);

  const folders = config.onedrive_structure.folders;
  const folderMap = { claim: folders.claims, quote: folders.quotes, servicing: folders.policies, followup: folders.followups };

  return {
    id: Date.now() + Math.random(),
    timestamp: new Date().toISOString(),
    from: email.from,
    subject: email.subject,
    category,
    status: 'processed',
    attachments: email.attachments.map(a => a.filename).filter(Boolean),
    extractedData: {
      clientName,
      policyNumber,
      claimReference,
      description: email.body.substring(0, 200).trim(),
      assignedRep: config.sales_representatives[0]?.name || 'Admin',
      oneDrivePath: `${folderMap[category] || folders.claims}/${clientName}/`
    }
  };
}

// ── SMTP: send digest email ───────────────────────────────────────────────────
async function sendDigest(tasks) {
  const { default: DigestEmailGenerator } = await import('./digest_email_generator.js');
  const generator = new DigestEmailGenerator(config.email_settings);
  const toEmail = process.env.DIGEST_TO_EMAIL || config.admin_team[0].email;
  const emailData = generator.generateDigestEmail(toEmail, tasks);

  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: parseInt(process.env.SMTP_PORT || '587'),
    secure: parseInt(process.env.SMTP_PORT || '587') === 465,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASSWORD
    },
    tls: { rejectUnauthorized: false }
  });

  await transporter.sendMail({
    from: `"${process.env.SMTP_FROM_NAME || 'Praeto Automation'}" <${process.env.SMTP_FROM_EMAIL || process.env.SMTP_USER}>`,
    to: toEmail,
    subject: emailData.subject,
    html: emailData.html,
    text: emailData.plain_text
  });

  console.log(`✅ Digest sent to ${toEmail} — ${tasks.length} task(s)`);
}

// ── Main run ──────────────────────────────────────────────────────────────────
async function run() {
  console.log(`\n[${new Date().toLocaleString('en-ZA')}] 🔄 Checking emails...\n`);

  const emails = await fetchEmails();
  if (emails.length === 0) return;

  const tasks = emails.map(buildTask);

  // Log summary
  tasks.forEach(t => {
    const cat = config.task_categories[t.category];
    console.log(`  ${cat.icon} [${t.category.toUpperCase()}] ${t.subject}`);
    console.log(`     Client: ${t.extractedData.clientName}`);
  });

  // Save to file for record-keeping
  const logFile = `tasks_${new Date().toISOString().split('T')[0]}.json`;
  const existing = fs.existsSync(logFile) ? JSON.parse(fs.readFileSync(logFile)) : [];
  fs.writeFileSync(logFile, JSON.stringify([...existing, ...tasks], null, 2));
  console.log(`\n💾 Tasks appended to ${logFile}`);

  // Send digest
  await sendDigest(tasks);
}

// ── Daemon mode (continuous) vs one-shot ─────────────────────────────────────
const isDaemon = process.argv.includes('--daemon');

if (isDaemon) {
  const CHECK_INTERVAL_MS = 5 * 60 * 1000; // every 5 minutes
  console.log('🚀 Praeto Automation running in daemon mode');
  console.log(`   Checking every 5 minutes. Digest sent immediately when new emails arrive.\n`);
  run().catch(console.error); // run once immediately
  setInterval(() => run().catch(console.error), CHECK_INTERVAL_MS);
} else {
  run().then(() => {
    console.log('\nDone.');
    process.exit(0);
  }).catch(err => {
    console.error('❌ Fatal error:', err.message);
    process.exit(1);
  });
}
