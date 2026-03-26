import Imap from 'imap';
import { simpleParser } from 'mailparser';

// Your cPanel email settings
const imapConfig = {
  user: 'jaden@praeto.co.za',           // Your email
  password: 'J@d3nPr@3to',               // Your email password
  host: 'mail.praeto.co.za',             // Your mail server (ask admin if unsure)
  port: 993,                             // IMAP port (usually 993 for SSL)
  tls: true                              // Use TLS
};

console.log('📧 Connecting to cPanel Email (IMAP)...\n');

const imap = new Imap(imapConfig);

function openInbox(cb) {
  imap.openBox('INBOX', false, cb);
}

async function main() {
  try {
    console.log('🔗 Connecting to mail server...\n');
    
    imap.openBox('INBOX', false, (err, box) => {
      if (err) {
        console.error('❌ Error:', err.message);
        console.error('\nCommon issues:');
        console.error('1. Wrong email/password');
        console.error('2. Mail server host incorrect (ask your admin)');
        console.error('3. Port 993 blocked (try 143 instead)');
        imap.end();
        return;
      }
      
      console.log(`✅ Connected! Inbox has ${box.messages.total} messages\n`);
      console.log('═══════════════════════════════════════\n');
      
      // Search for recent emails
      imap.search(['RECENT'], (err, results) => {
        if (err) {
          console.error('❌ Search error:', err);
          imap.end();
          return;
        }
        
        if (results.length === 0) {
          console.log('No recent emails found');
          imap.end();
          return;
        }
        
        // Get latest 10 emails
        const f = imap.fetch(results.slice(-10), { bodies: '' });
        const emails = [];
        
        f.on('message', (msg, seqno) => {
          let subject = '';
          let from = '';
          let text = '';
          
          msg.on('structure', (structure) => {
            // Parse structure
          });
          
          msg.on('attributes', (attrs) => {
            // Get attributes
          });
          
          simpleParser(msg, async (err, parsed) => {
            if (err) return;
            
            subject = parsed.subject || '(no subject)';
            from = parsed.from.text || '(unknown)';
            text = parsed.text || parsed.html || '';
            
            emails.push({
              id: seqno,
              subject: subject,
              from: from,
              body: text.substring(0, 200),
              received: parsed.date
            });
            
            console.log(`Email ${seqno}:`);
            console.log(`  Subject: ${subject}`);
            console.log(`  From: ${from}`);
            console.log(`  Date: ${parsed.date}\n`);
          });
        });
        
        f.on('error', (err) => {
          console.error('Fetch error:', err);
        });
        
        f.on('end', () => {
          console.log('═══════════════════════════════════════\n');
          console.log(`✅ Retrieved ${emails.length} emails\n`);
          imap.end();
        });
      });
    });
    
    imap.openBox('INBOX', false, (err, box) => {
      if (err) throw err;
    });
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

imap.openBox('INBOX', false, (err, box) => {
  if (err) {
    console.error('❌ Connection error:', err.message);
    console.error('\n⚠️ Common fixes:');
    console.error('1. Check email: jaden@praeto.co.za');
    console.error('2. Check password: J@d3nPr@3to');
    console.error('3. Check mail host: mail.praeto.co.za (ask admin if wrong)');
    console.error('4. Check port: 993 (or 143 if 993 blocked)');
    process.exit(1);
  }
  
  console.log(`✅ Connected to INBOX (${box.messages.total} total messages)\n`);
  
  imap.search(['RECENT'], (err, results) => {
    if (err) {
      console.error('❌ Search error:', err.message);
      imap.end();
      return;
    }
    
    if (results.length === 0) {
      console.log('⚠️  No recent emails found');
      imap.end();
      return;
    }
    
    console.log(`📧 Found ${results.length} recent emails\n`);
    console.log('═══════════════════════════════════════\n');
    
    const f = imap.fetch(results.slice(-10), { bodies: '' });
    let emailCount = 0;
    const emails = [];
    
    f.on('message', (msg, seqno) => {
      simpleParser(msg, (err, parsed) => {
        if (err) {
          console.log(`Email ${seqno}: (error parsing)`);
          return;
        }
        
        emailCount++;
        const subject = parsed.subject || '(no subject)';
        const from = parsed.from?.text || '(unknown)';
        
        emails.push({
          subject: subject,
          from: from,
          date: parsed.date
        });
        
        console.log(`✓ Email ${seqno}:`);
        console.log(`  Subject: ${subject}`);
        console.log(`  From: ${from}`);
        console.log(`  Date: ${parsed.date}\n`);
      });
    });
    
    f.on('error', (err) => {
      console.error('❌ Fetch error:', err.message);
    });
    
    f.on('end', () => {
      console.log('═══════════════════════════════════════\n');
      console.log(`✅ Retrieved ${emailCount} emails\n`);
      imap.end();
    });
  });
});

imap.openBox('INBOX', false, (err, box) => {
  if (err) throw err;
});

imap.on('error', (err) => {
  console.error('❌ IMAP error:', err.message);
});

imap.on('end', () => {
  console.log('Connection closed');
});