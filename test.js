import DigestEmailGenerator from './digest_email_generator.js';
import fs from 'fs';

const config = {
  email_settings: {
    digestTime: "16:15",
    timezone: "Africa/Johannesburg"
  }
};

const mockTasks = [
  {
    id: 1,
    timestamp: new Date().toISOString(),
    from: "client@example.com",
    subject: "Claim - John Smith - Vehicle accident on N1",
    category: "claim",
    extractedData: {
      clientName: "John Smith",
      policyNumber: "POL-2024-00445",
      claimReference: "CLM-2024-1847",
      description: "Vehicle accident on N1, vehicle damaged.",
      assignedRep: "rep1",
      oneDrivePath: "/Praeto/AutomationTasks/Claims/John Smith/"
    },
    attachments: []
  },
  {
    id: 2,
    timestamp: new Date().toISOString(),
    from: "rep@praeto.co.za",
    subject: "Quote request - Mary Adams - Life cover R1M",
    category: "quote",
    extractedData: {
      clientName: "Mary Adams",
      policyNumber: "-",
      claimReference: "-",
      description: "Life insurance quote. Age 35, income R45k, cover R1M",
      assignedRep: "rep1",
      oneDrivePath: "/Praeto/AutomationTasks/Quotes/Mary Adams/"
    },
    attachments: []
  }
];

const generator = new DigestEmailGenerator(config);
const emailData = generator.generateDigestEmail('jaden@praeto.co.za', mockTasks);

console.log('✅ EMAIL GENERATED!\n');
console.log('TO:', emailData.to);
console.log('SUBJECT:', emailData.subject);
console.log('\n📧 Saving preview...\n');

fs.writeFileSync('email_preview.html', `<!DOCTYPE html><html><body>${emailData.html}</body></html>`);
fs.writeFileSync('email_preview.txt', emailData.plain_text);

console.log('📂 Open email_preview.html in your browser to see the email!');