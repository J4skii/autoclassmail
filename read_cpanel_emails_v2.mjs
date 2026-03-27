import Imap from 'imap';
import { simpleParser } from 'mailparser';
import fs from 'fs';
import dotenv from 'dotenv';
dotenv.config();

console.log('📧 Connecting to cPanel Email via IMAP...\n');

if (!process.env.IMAP_USER || !process.env.IMAP_PASSWORD || !process.env.IMAP_HOST) {
  console.error('❌ Missing IMAP credentials in .env (IMAP_HOST, IMAP_USER, IMAP_PASSWORD)');
  process.exit(1);
}

const imap = new Imap({
  user:     process.env.IMAP_USER,
  password: process.env.IMAP_PASSWORD,
  host:     process.env.IMAP_HOST,
  port:     parseInt(process.env.IMAP_PORT || '993'),
  tls:      true,
  tlsOptions: { rejectUnauthorized: false }
});

function openInbox(cb) {
  imap.openBox('INBOX', false, cb);
}

imap.on('ready', () => {
  console.log('✅ IMAP Connected!\n');
  
  openInbox((err, mailbox) => {
    if (err) {
      console.error('❌ Error opening inbox:', err.message);
      imap.end();
      return;
    }
    
    console.log(`📊 Inbox has ${mailbox.messages.total} total messages`);
    console.log(`📨 ${mailbox.messages.unseen} unread messages\n`);
    console.log('═══════════════════════════════════════\n');
    
    // Get the last 10 emails
    const results = imap.seq.search(['ALL'], (err, results) => {
      if (err) {
        console.error('❌ Search error:', err);
        imap.end();
        return;
      }
      
      if (results.length === 0) {
        console.log('⚠️  No emails found in inbox');
        imap.end();
        return;
      }
      
      // Get last 10
      const lastEmails = results.slice(Math.max(0, results.length - 10));
      const f = imap.fetch(lastEmails, { bodies: '' });
      const emails = [];
      let processed = 0;
      
      f.on('message', (msg, seqno) => {
        msg.on('body', (stream) => {
          simpleParser(stream, (err, parsed) => {
            if (err) {
              console.log(`Email ${seqno}: [Error parsing]\n`);
              processed++;
              return;
            }

            const email = {
              id: seqno,
              subject: parsed.subject || '(no subject)',
              from: parsed.from?.text || '(unknown)',
              date: parsed.date,
              body: (parsed.text || parsed.html || '').substring(0, 200),
              hasAttachments: parsed.attachments?.length > 0
            };

            emails.push(email);
            processed++;

            console.log(`✓ Email ${seqno}:`);
            console.log(`  Subject: ${email.subject}`);
            console.log(`  From: ${email.from}`);
            console.log(`  Date: ${email.date}`);
            console.log(`  Attachments: ${email.hasAttachments ? 'Yes' : 'No'}\n`);

            // When all done, save and close
            if (processed === lastEmails.length) {
              console.log('═══════════════════════════════════════\n');
              console.log(`✅ Retrieved ${emails.length} emails\n`);

              // Save to JSON for processing
              fs.writeFileSync('real_emails.json', JSON.stringify(emails, null, 2));
              console.log('💾 Emails saved to: real_emails.json');
              console.log('\n🎯 Next: Run process_outlook_emails.js to generate digest\n');

              imap.end();
            }
          });
        });
      });
      
      f.on('error', (err) => {
        console.error('❌ Fetch error:', err);
      });
    });
  });
});

imap.on('error', (err) => {
  console.error('❌ IMAP Error:', err.message);
  console.error('\nDebugging tips:');
  console.error('1. Check email: jaden@praeto.co.za');
  console.error('2. Check password: J@d3nPr@3to');
  console.error('3. Check host: mail.praeto.co.za');
  console.error('4. Check port: 993');
  console.error('5. Try disabling 2FA if enabled');
});

imap.on('end', () => {
  console.log('Connection closed');
});

imap.connect();