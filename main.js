'use strict';

/**
 * PRAETO TASK AUTOMATION SYSTEM
 * Production Entry Point
 *
 * Usage:
 *   node main.js              - run once (scan today's mail, send digest)
 *   node main.js --daemon     - persistent IMAP connection, reacts to new mail
 */

const path       = require('path');
const fs         = require('fs');
const Imap       = require('imap');
const { simpleParser } = require('mailparser');
const nodemailer = require('nodemailer');
const DigestEmailGenerator = require('./digest_email_generator.js');

// ── Base directory (works via `node` and as a pkg .exe) ──────────────────────
const BASE_DIR = process.pkg ? path.dirname(process.execPath) : process.cwd();

// ── Load .env ────────────────────────────────────────────────────────────────
require('dotenv').config({ path: path.join(BASE_DIR, '.env') });

// ── Load config ──────────────────────────────────────────────────────────────
let config;
try {
  config = JSON.parse(fs.readFileSync(path.join(BASE_DIR, 'praeto_automation_config_v2.json'), 'utf8'));
} catch (e) {
  console.error('FATAL: Cannot load praeto_automation_config_v2.json —', e.message);
  console.error('       Check that the file exists next to the .exe and contains valid JSON.');
  process.exit(1);
}

// ── Validate required env vars ───────────────────────────────────────────────
const REQUIRED_VARS = ['IMAP_HOST', 'IMAP_USER', 'IMAP_PASSWORD', 'SMTP_HOST', 'SMTP_USER', 'SMTP_PASSWORD'];
const missing = REQUIRED_VARS.filter(k => !process.env[k]);
if (missing.length) {
  console.error(`❌ Missing required environment variables: ${missing.join(', ')}`);
  console.error('   Edit the .env file and fill in your credentials.');
  process.exit(1);
}

// ── Global safety net ────────────────────────────────────────────────────────
// Catches any error that escapes all other try/catch blocks.
// uncaughtException exits with code 1 so Task Scheduler can restart the process.
// unhandledRejection stays alive — async rejections in the mail handler are often transient.
process.on('uncaughtException', (err) => {
  console.error(`[FATAL] uncaughtException: ${err.message}`);
  console.error(err.stack);
  sendAdminAlert('Process crash — uncaughtException', err.message)
    .finally(() => process.exit(1));
});

process.on('unhandledRejection', (reason) => {
  const msg = reason instanceof Error ? reason.message : String(reason);
  console.error(`[FATAL] unhandledRejection: ${msg}`);
  sendAdminAlert('Unhandled promise rejection', msg).catch(() => {});
  // intentionally no process.exit — daemon continues for transient failures
});

// ── Timezone helpers (Africa/Johannesburg) ───────────────────────────────────
const TZ = 'Africa/Johannesburg';

function nowSAST() {
  return new Date().toLocaleString('en-ZA', { timeZone: TZ });
}

function todayDateStrSAST() {
  return new Date().toLocaleDateString('en-ZA', { timeZone: TZ })
    .split('/').reverse().join('-'); // → YYYY-MM-DD
}

// ── Log file management ──────────────────────────────────────────────────────
const LOG_MAX_DAYS  = 30;
const LOG_MAX_BYTES = 5 * 1024 * 1024; // 5 MB
const LOG_MAX_ENTRIES = 500;

function cleanupLogs() {
  const cutoff = Date.now() - LOG_MAX_DAYS * 24 * 60 * 60 * 1000;
  try {
    const files = fs.readdirSync(BASE_DIR)
      .filter(f => /^tasks_\d{4}-\d{2}-\d{2}\.json$/.test(f));

    let deleted = 0;
    for (const file of files) {
      const fullPath = path.join(BASE_DIR, file);
      const stat = fs.statSync(fullPath);

      if (stat.mtimeMs < cutoff) {
        fs.unlinkSync(fullPath);
        deleted++;
        continue;
      }

      if (stat.size > LOG_MAX_BYTES) {
        try {
          const data = JSON.parse(fs.readFileSync(fullPath, 'utf8'));
          const trimmed = data.slice(-LOG_MAX_ENTRIES);
          fs.writeFileSync(fullPath, JSON.stringify(trimmed, null, 2));
          console.log(`⚠️  ${file} exceeded 5 MB — trimmed to last ${LOG_MAX_ENTRIES} entries`);
        } catch (e) {
          console.error(`⚠️  Could not trim ${file}: ${e.message}`);
        }
      }
    }

    if (deleted > 0) console.log(`🧹 Removed ${deleted} log file(s) older than ${LOG_MAX_DAYS} days`);
  } catch (e) {
    console.error('⚠️  Log cleanup failed:', e.message);
  }
}

function appendToLog(tasks) {
  const logFile = path.join(BASE_DIR, `tasks_${todayDateStrSAST()}.json`);
  try {
    const existing = fs.existsSync(logFile)
      ? JSON.parse(fs.readFileSync(logFile, 'utf8'))
      : [];
    fs.writeFileSync(logFile, JSON.stringify(existing.concat(tasks), null, 2));
    console.log(`💾 Tasks saved to ${path.basename(logFile)}`);
  } catch (e) {
    console.error(`⚠️  Could not write log file: ${e.message}`);
  }
}

// ── IMAP helpers ─────────────────────────────────────────────────────────────
function createIMAPClient() {
  return new Imap({
    user:     process.env.IMAP_USER,
    password: process.env.IMAP_PASSWORD,
    host:     process.env.IMAP_HOST,
    port:     parseInt(process.env.IMAP_PORT || '993'),
    tls:      true,
    tlsOptions: { rejectUnauthorized: false },
    keepalive: {
      interval:     10000,  // send NOOP every 10 s to keep connection alive
      idleInterval: 300000, // re-enter IDLE every 5 min
      forceNoop:    true    // use NOOP if server doesn't support IDLE
    }
  });
}

/**
 * Fetch all emails received today (SAST midnight onwards).
 * Does NOT mark any message as seen.
 */
function fetchTodaysEmails(imap) {
  return new Promise((resolve) => {
    const todayMidnight = new Date();
    todayMidnight.setHours(0, 0, 0, 0);

    imap.search([['SINCE', todayMidnight]], (err, results) => {
      if (err) {
        console.error('⚠️  IMAP search error:', err.message);
        return resolve([]);
      }

      if (!results || results.length === 0) {
        console.log('   No emails found for today.');
        return resolve([]);
      }

      console.log(`   Found ${results.length} email(s) for today.`);

      const emails  = [];
      const f       = imap.fetch(results, { bodies: '' }); // no markSeen
      let   pending = results.length;

      function done() {
        if (--pending === 0) resolve(emails);
      }

      f.on('message', (msg, seqno) => {
        msg.on('body', stream => {
          simpleParser(stream, (parseErr, parsed) => {
            if (parseErr) {
              console.error(`⚠️  Email #${seqno} could not be parsed: ${parseErr.message}`);
            } else {
              emails.push({
                id:          seqno,
                subject:     parsed.subject  || '(no subject)',
                from:        parsed.from ? parsed.from.text : '(unknown)',
                date:        parsed.date,
                body:        parsed.text     || '',
                html:        parsed.html     || '',
                attachments: parsed.attachments || []
              });
            }
            done();
          });
        });

        msg.on('error', msgErr => {
          console.error(`⚠️  Message stream error #${seqno}: ${msgErr.message}`);
          done();
        });
      });

      f.on('error', fetchErr => {
        console.error('⚠️  Fetch error:', fetchErr.message);
        resolve(emails); // return what we have so far
      });
    });
  });
}

// ── Email processing ─────────────────────────────────────────────────────────
function categorise(email) {
  const text = (email.subject + ' ' + email.body).toLowerCase();
  for (const [key, cat] of Object.entries(config.task_categories)) {
    if (cat.keywords.some(kw => text.includes(kw.toLowerCase()))) return key;
  }
  return 'followup';
}

function extractField(text, patterns) {
  for (const p of patterns) {
    try {
      const m = text.match(new RegExp(p, 'i'));
      if (m && m[1]) return m[1].trim();
    } catch (e) {
      console.error(`⚠️  Invalid extraction pattern "${p}": ${e.message}`);
    }
  }
  return '-';
}

function buildTask(email) {
  const text      = email.subject + ' ' + email.body;
  const category  = categorise(email);
  const rules     = config.extraction_rules;
  const folders   = config.onedrive_structure.folders;
  const folderMap = {
    claim:     folders.claims,
    quote:     folders.quotes,
    servicing: folders.policies,
    followup:  folders.followups
  };
  const clientName = extractField(text, rules.clientNamePatterns) || 'Unknown Client';

  return {
    id:        `${email.id}-${Date.now()}`,
    timestamp: new Date().toLocaleString('en-ZA', { timeZone: TZ }),
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

// ── Admin alert sender ───────────────────────────────────────────────────────
// Sends a plain-text alert to ops on critical failures.
// MUST NEVER THROW — called from error handlers. All errors are swallowed internally.
const ALERT_TO = process.env.ALERT_EMAIL || process.env.SMTP_USER;

async function sendAdminAlert(subject, detail) {
  if (!ALERT_TO) return;
  try {
    const t = nodemailer.createTransport({
      host:               process.env.SMTP_HOST,
      port:               parseInt(process.env.SMTP_PORT || '587'),
      secure:             parseInt(process.env.SMTP_PORT || '587') === 465,
      auth:               { user: process.env.SMTP_USER, pass: process.env.SMTP_PASSWORD },
      tls:                { rejectUnauthorized: false },
      connectionTimeout:  10000,
      greetingTimeout:    10000,
      socketTimeout:      10000
    });
    await t.sendMail({
      from:    `"Praeto Automation ALERT" <${process.env.SMTP_FROM_EMAIL || process.env.SMTP_USER}>`,
      to:      ALERT_TO,
      subject: `[PRAETO ALERT] ${subject}`,
      text:    [
        'Alert from: Praeto Email Automation',
        `Time (SAST): ${nowSAST()}`,
        '',
        `Issue: ${subject}`,
        '',
        'Detail:',
        detail,
        '',
        '--- The system will attempt to self-recover. No action required unless this repeats. ---'
      ].join('\n')
    });
    console.log(`[${nowSAST()}] 🔔 Admin alert sent to ${ALERT_TO}: ${subject}`);
  } catch (alertErr) {
    console.error(`[${nowSAST()}] ⚠️  Could not send admin alert: ${alertErr.message}`);
  }
}

// ── SMTP digest sender ───────────────────────────────────────────────────────
async function sendDigest(tasks, attempt = 1) {
  const MAX_RETRIES = (config.email_settings && config.email_settings.maxRetries) || 3;
  const toEmail     = process.env.DIGEST_TO_EMAIL || config.admin_team[0].email;
  const generator   = new DigestEmailGenerator(config.email_settings);
  const emailData   = generator.generateDigestEmail(toEmail, tasks);

  const transporter = nodemailer.createTransport({
    host:   process.env.SMTP_HOST,
    port:   parseInt(process.env.SMTP_PORT || '587'),
    secure: parseInt(process.env.SMTP_PORT || '587') === 465,
    auth:   { user: process.env.SMTP_USER, pass: process.env.SMTP_PASSWORD },
    tls:    { rejectUnauthorized: false }
  });

  try {
    await transporter.sendMail({
      from:    `"${process.env.SMTP_FROM_NAME || 'Praeto Automation'}" <${process.env.SMTP_FROM_EMAIL || process.env.SMTP_USER}>`,
      to:      toEmail,
      subject: emailData.subject,
      html:    emailData.html,
      text:    emailData.plain_text
    });
    console.log(`[${nowSAST()}] ✅ Digest sent to ${toEmail} — ${tasks.length} task(s)`);
  } catch (err) {
    console.error(`[${nowSAST()}] ❌ Digest send failed (attempt ${attempt}/${MAX_RETRIES}): ${err.message}`);
    if (attempt < MAX_RETRIES) {
      const delayMs = Math.pow(2, attempt) * 1000; // 2s, 4s, 8s
      console.log(`   Retrying in ${delayMs / 1000}s...`);
      await new Promise(r => setTimeout(r, delayMs));
      return sendDigest(tasks, attempt + 1);
    }
    const lostMsg = `Digest delivery failed after ${MAX_RETRIES} attempts. ${tasks.length} task(s) affected. SMTP error: ${err.message}`;
    console.error(`[${nowSAST()}] ❌ DIGEST LOST — ${lostMsg}`);
    await sendAdminAlert('Digest delivery failure', lostMsg).catch(() => {});
    throw err;
  }
}

// ── Main processing run ───────────────────────────────────────────────────────
// processedIds tracks emails already handled today so we don't double-digest.
const processedIds = new Set();
let   currentDay  = todayDateStrSAST();

function rolloverIfNewDay() {
  const today = todayDateStrSAST();
  if (today !== currentDay) {
    console.log(`\n🌅 New day (${today}) — resetting processed email tracker`);
    processedIds.clear();
    currentDay = today;
    cleanupLogs();
    return true;
  }
  return false;
}

async function processNewEmails(imap) {
  rolloverIfNewDay();
  console.log(`\n[${nowSAST()}] 🔄 Scanning today's inbox...\n`);

  const allToday = await fetchTodaysEmails(imap);
  const newOnes  = allToday.filter(e => !processedIds.has(e.id));

  if (newOnes.length === 0) {
    console.log('   Nothing new to process.');
    return;
  }

  console.log(`   Processing ${newOnes.length} new email(s):\n`);

  const tasks = newOnes.map(e => {
    processedIds.add(e.id);
    return buildTask(e);
  });

  tasks.forEach(t => {
    const cat = config.task_categories[t.category];
    console.log(`  ${cat.icon} [${t.category.toUpperCase()}] ${t.subject}`);
    console.log(`     Client: ${t.extractedData.clientName}`);
  });

  appendToLog(tasks);

  // Verify IMAP is still authenticated before sending — guards against mid-flight reconnects
  if (!activeImap || activeImap.state !== 'authenticated') {
    console.warn(`[${nowSAST()}] ⚠️  IMAP not authenticated — skipping digest until connection is restored`);
    return;
  }

  try {
    await sendDigest(tasks);
  } catch (e) {
    console.error(`[${nowSAST()}] ❌ Failed to send digest: ${e.message}`);
  }
}

// ── Daemon: persistent IMAP connection ──────────────────────────────────────
let reconnectTimer   = null;
let activeImap       = null;
let reconnectAttempts = 0;

function startDaemon() {
  if (reconnectTimer) { clearTimeout(reconnectTimer); reconnectTimer = null; }

  // Destroy previous socket before creating a new one — prevents accumulation
  if (activeImap) {
    try { activeImap.destroy(); } catch (_) {}
    activeImap = null;
  }

  console.log(`\n[${nowSAST()}] 📡 Connecting to IMAP (persistent)...`);
  const imap = createIMAPClient();
  activeImap = imap;

  imap.once('ready', () => {
    reconnectAttempts = 0; // reset backoff counter on successful connect
    console.log(`✅ Connected to ${process.env.IMAP_HOST}`);

    imap.openBox('INBOX', true, (err, box) => { // readOnly = true (we never change flags)
      if (err) {
        console.error('❌ Cannot open INBOX:', err.message);
        scheduleReconnect();
        return;
      }

      console.log(`📬 INBOX open — ${box.messages.total} message(s) in mailbox\n`);

      // Initial scan on connect
      processNewEmails(imap).catch(e => console.error('❌ Initial scan error:', e.message));

      // React to new mail as it arrives (server pushes this via IMAP IDLE)
      imap.on('mail', numNew => {
        console.log(`\n📨 Server notified: ${numNew} new message(s) arrived`);
        processNewEmails(imap).catch(e => console.error('❌ New mail scan error:', e.message));
      });
    });
  });

  imap.on('error', err => {
    console.error(`❌ IMAP connection error: ${err.message}`);
    scheduleReconnect();
  });

  imap.on('end', () => {
    console.warn('⚠️  IMAP connection closed unexpectedly');
    scheduleReconnect();
  });

  imap.connect();
}

function scheduleReconnect() {
  reconnectAttempts++;
  const delayMs  = Math.min(5000 * Math.pow(2, reconnectAttempts - 1), 10 * 60 * 1000);
  const delaySec = Math.round(delayMs / 1000);
  console.log(`🔁 Reconnecting in ${delaySec}s (attempt ${reconnectAttempts})...`);

  if (reconnectAttempts === 5) {
    sendAdminAlert(
      'IMAP connection lost — repeated failures',
      `Failed to reconnect ${reconnectAttempts} times. Target: ${process.env.IMAP_HOST}. Will keep retrying (next delay: ${delaySec}s).`
    ).catch(() => {});
  }

  reconnectTimer = setTimeout(startDaemon, delayMs);
}

// ── One-shot mode ────────────────────────────────────────────────────────────
function runOnce() {
  const imap = createIMAPClient();

  imap.once('ready', () => {
    imap.openBox('INBOX', true, async (err) => {
      if (err) {
        console.error('❌ Cannot open INBOX:', err.message);
        imap.end();
        process.exit(1);
      }
      try {
        await processNewEmails(imap);
      } catch (e) {
        console.error('❌ Fatal error:', e.message);
      } finally {
        imap.end();
      }
    });
  });

  imap.once('error', err => {
    console.error('❌ IMAP error:', err.message);
    process.exit(1);
  });

  imap.once('end', () => {
    console.log('\nDone.');
    process.exit(0);
  });

  imap.connect();
}

// ── Graceful shutdown ────────────────────────────────────────────────────────
// Handles SIGINT (Ctrl-C in dev) and SIGTERM (service managers, future NSSM/pm2).
// Note: Windows Task Scheduler uses TerminateProcess() on stop — SIGTERM is not sent,
// but this handler works correctly in all other contexts with zero future changes needed.
function gracefulShutdown(signal) {
  console.log(`\n[${nowSAST()}] ${signal} received — shutting down cleanly...`);
  if (reconnectTimer) { clearTimeout(reconnectTimer); reconnectTimer = null; }
  if (activeImap) {
    try { activeImap.end(); } catch (_) {}
    activeImap = null;
    console.log('   IMAP connection closed.');
  }
  setTimeout(() => { console.log('   Shutdown complete.'); process.exit(0); }, 5000);
}
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT',  () => gracefulShutdown('SIGINT'));

// ── Entry point ──────────────────────────────────────────────────────────────
const isDaemon = process.argv.includes('--daemon');

cleanupLogs(); // always clean up old logs on start

if (isDaemon) {
  console.log('🚀 Praeto Automation — daemon mode');
  console.log('   Single persistent IMAP connection · reacts to new mail instantly\n');
  startDaemon();
} else {
  console.log('🚀 Praeto Automation — one-shot mode\n');
  runOnce();
}
