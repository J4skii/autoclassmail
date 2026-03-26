/**
 * PRAETO TASK AUTOMATION SYSTEM
 * Email Digest Template Generator
 * 
 * Generates professional HTML email digests for each admin
 * Groups tasks by Type → Client Name
 * Sends at configured time (default: 4:15 PM SAST)
 */

class DigestEmailGenerator {
  constructor(config) {
    this.config = config;
    this.tasks = [];
  }

  /**
   * Main method to generate digest email for a specific admin
   */
  generateDigestEmail(adminEmail, tasksForAdmin) {
    this.tasks = tasksForAdmin;
    
    const groupedTasks = this.groupTasksByTypeAndClient();
    const stats = this.calculateStats();
    
    return {
      to: adminEmail,
      subject: this.generateSubject(),
      html: this.generateHTMLEmail(groupedTasks, stats),
      plain_text: this.generatePlainText(groupedTasks, stats),
      sendTime: this.config.digestTime // e.g., "16:15"
    };
  }

  /**
   * Group tasks: First by Type (Claims, Quotes, etc), then by Client Name
   */
  groupTasksByTypeAndClient() {
    const grouped = {
      claim: {},
      quote: {},
      servicing: {},
      followup: {}
    };

    this.tasks.forEach(task => {
      const type = task.category || 'followup';
      const client = task.extractedData.clientName || 'Unknown Client';
      
      if (!grouped[type][client]) {
        grouped[type][client] = [];
      }
      grouped[type][client].push(task);
    });

    return grouped;
  }

  /**
   * Calculate summary statistics
   */
  calculateStats() {
    return {
      total: this.tasks.length,
      claims: this.tasks.filter(t => t.category === 'claim').length,
      quotes: this.tasks.filter(t => t.category === 'quote').length,
      servicing: this.tasks.filter(t => t.category === 'servicing').length,
      followups: this.tasks.filter(t => t.category === 'followup').length,
      attachments: this.tasks.filter(t => t.attachments && t.attachments.length > 0).length
    };
  }

  /**
   * Generate email subject line
   */
  generateSubject() {
    const today = new Date().toLocaleDateString('en-ZA', { 
      weekday: 'short', 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric' 
    });
    return `Praeto Daily Task Digest - ${today}`;
  }

  /**
   * Generate professional HTML email
   */
  generateHTMLEmail(grouped, stats) {
    const styleBlock = this.getEmailStyles();
    const headerSection = this.getHeaderSection(stats);
    const tasksSection = this.getTasksSection(grouped);
    const footerSection = this.getFooterSection(stats);

    return `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Praeto Daily Task Digest</title>
    ${styleBlock}
</head>
<body>
    <div class="container">
        ${headerSection}
        ${tasksSection}
        ${footerSection}
    </div>
</body>
</html>
    `;
  }

  /**
   * Email CSS styles (inline for email compatibility)
   */
  getEmailStyles() {
    return `
<style type="text/css">
    * {
        margin: 0;
        padding: 0;
        box-sizing: border-box;
    }
    
    body {
        font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
        background-color: #f5f5f5;
        color: #333;
        line-height: 1.6;
    }
    
    .container {
        max-width: 600px;
        margin: 0 auto;
        background-color: #ffffff;
    }
    
    /* Header Section */
    .header {
        background: linear-gradient(135deg, #1e5a7a 0%, #2a7ba8 100%);
        color: white;
        padding: 40px 30px;
        text-align: center;
    }
    
    .header-title {
        font-size: 28px;
        font-weight: 600;
        margin-bottom: 8px;
        letter-spacing: -0.5px;
    }
    
    .header-subtitle {
        font-size: 14px;
        opacity: 0.9;
        font-weight: 300;
    }
    
    /* Stats Bar */
    .stats-container {
        display: grid;
        grid-template-columns: 1fr 1fr 1fr 1fr;
        background-color: #f9f9f9;
        border-top: 1px solid #e0e0e0;
        border-bottom: 1px solid #e0e0e0;
    }
    
    .stat-item {
        padding: 20px;
        text-align: center;
        border-right: 1px solid #e0e0e0;
    }
    
    .stat-item:last-child {
        border-right: none;
    }
    
    .stat-number {
        font-size: 24px;
        font-weight: 700;
        color: #1e5a7a;
        display: block;
    }
    
    .stat-label {
        font-size: 12px;
        color: #666;
        margin-top: 4px;
        text-transform: uppercase;
        letter-spacing: 0.5px;
    }
    
    /* Content Section */
    .content {
        padding: 30px;
    }
    
    .greeting {
        font-size: 16px;
        color: #333;
        margin-bottom: 24px;
        line-height: 1.5;
    }
    
    /* Task Type Section Headers */
    .task-type-header {
        display: flex;
        align-items: center;
        padding: 12px 16px;
        margin: 24px 0 12px 0;
        border-radius: 4px;
        font-weight: 600;
        font-size: 14px;
        color: white;
        text-transform: uppercase;
        letter-spacing: 0.5px;
    }
    
    .task-type-header.claims {
        background-color: #E24B4A;
    }
    
    .task-type-header.quotes {
        background-color: #EF9F27;
    }
    
    .task-type-header.servicing {
        background-color: #639922;
    }
    
    .task-type-header.followup {
        background-color: #378ADD;
    }
    
    .task-type-icon {
        font-size: 18px;
        margin-right: 8px;
    }
    
    .task-type-count {
        margin-left: auto;
        font-size: 13px;
        opacity: 0.9;
    }
    
    /* Client Subsection */
    .client-section {
        margin-bottom: 12px;
    }
    
    .client-name {
        font-weight: 600;
        font-size: 14px;
        color: #1e5a7a;
        margin-bottom: 8px;
        padding: 0 12px;
    }
    
    /* Task Card */
    .task-card {
        background-color: #fafafa;
        border-left: 3px solid #1e5a7a;
        padding: 14px 16px;
        margin-bottom: 10px;
        border-radius: 2px;
    }
    
    .task-card.claims {
        border-left-color: #E24B4A;
    }
    
    .task-card.quotes {
        border-left-color: #EF9F27;
    }
    
    .task-card.servicing {
        border-left-color: #639922;
    }
    
    .task-card.followup {
        border-left-color: #378ADD;
    }
    
    .task-title {
        font-weight: 600;
        font-size: 13px;
        color: #333;
        margin-bottom: 8px;
    }
    
    .task-detail {
        font-size: 12px;
        color: #666;
        margin-bottom: 4px;
        line-height: 1.4;
    }
    
    .task-detail strong {
        color: #333;
        font-weight: 600;
    }
    
    .task-detail.label {
        color: #999;
        font-size: 11px;
        margin-top: 8px;
        padding-top: 8px;
        border-top: 1px solid #e0e0e0;
    }
    
    .task-files {
        background-color: #f0f0f0;
        padding: 8px;
        border-radius: 3px;
        font-family: 'Courier New', monospace;
        font-size: 11px;
        color: #555;
        margin-top: 8px;
        word-break: break-all;
    }
    
    /* Skye CRM Ready Section */
    .skye-ready {
        background-color: #e8f5e9;
        border: 1px solid #81c784;
        border-radius: 4px;
        padding: 12px;
        margin-top: 10px;
        font-size: 11px;
        color: #2e7d32;
    }
    
    .skye-ready-label {
        font-weight: 600;
        display: block;
        margin-bottom: 6px;
    }
    
    .skye-ready-text {
        background-color: white;
        padding: 8px;
        border-radius: 2px;
        font-family: 'Courier New', monospace;
        font-size: 10px;
        line-height: 1.5;
    }
    
    /* Action Section */
    .action-section {
        background-color: #f0f7ff;
        border: 1px solid #b3d9ff;
        border-radius: 4px;
        padding: 16px;
        margin: 24px 0;
        text-align: center;
    }
    
    .action-title {
        font-weight: 600;
        color: #1e5a7a;
        margin-bottom: 8px;
        font-size: 14px;
    }
    
    .action-description {
        font-size: 12px;
        color: #666;
        line-height: 1.5;
    }
    
    /* Footer */
    .footer {
        background-color: #f9f9f9;
        border-top: 1px solid #e0e0e0;
        padding: 24px 30px;
        font-size: 12px;
        color: #999;
        line-height: 1.6;
    }
    
    .footer-divider {
        height: 1px;
        background-color: #e0e0e0;
        margin: 12px 0;
    }
    
    .footer-section {
        margin-bottom: 12px;
    }
    
    .footer-section:last-child {
        margin-bottom: 0;
    }
    
    .footer-label {
        font-weight: 600;
        color: #666;
        display: block;
        margin-bottom: 4px;
    }
    
    /* Responsive */
    @media only screen and (max-width: 600px) {
        .container {
            width: 100% !important;
        }
        
        .header {
            padding: 24px 20px;
        }
        
        .header-title {
            font-size: 22px;
        }
        
        .content {
            padding: 20px;
        }
        
        .stats-container {
            grid-template-columns: 1fr 1fr;
        }
        
        .stat-item {
            padding: 16px;
            border-right: none !important;
            border-bottom: 1px solid #e0e0e0;
        }
        
        .stat-item:nth-child(3),
        .stat-item:nth-child(4) {
            border-bottom: none;
        }
    }
</style>
    `;
  }

  /**
   * Generate header section with greeting and stats
   */
  getHeaderSection(stats) {
    const today = new Date().toLocaleDateString('en-ZA', { 
      weekday: 'long', 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });

    return `
    <div class="header">
        <div class="header-title">📊 Praeto Daily Task Digest</div>
        <div class="header-subtitle">${today}</div>
    </div>
    
    <div class="stats-container">
        <div class="stat-item">
            <span class="stat-number">${stats.total}</span>
            <span class="stat-label">Total Tasks</span>
        </div>
        <div class="stat-item">
            <span class="stat-number">${stats.claims}</span>
            <span class="stat-label">Claims</span>
        </div>
        <div class="stat-item">
            <span class="stat-number">${stats.quotes}</span>
            <span class="stat-label">Quotes</span>
        </div>
        <div class="stat-item">
            <span class="stat-number">${stats.attachments}</span>
            <span class="stat-label">Files</span>
        </div>
    </div>
    
    <div class="content">
        <div class="greeting">
            Good afternoon!<br>
            <br>
            Below is your daily summary of processed tasks from your monitored inboxes. 
            Each task is ready to copy-paste directly into Skye CRM.
        </div>
    `;
  }

  /**
   * Generate tasks section grouped by Type → Client
   */
  getTasksSection(grouped) {
    let html = '';

    const taskTypes = [
      { key: 'claim', icon: '🚨', label: 'CLAIMS', class: 'claims' },
      { key: 'quote', icon: '📋', label: 'QUOTES', class: 'quotes' },
      { key: 'servicing', icon: '🔧', label: 'POLICY SERVICING', class: 'servicing' },
      { key: 'followup', icon: '📞', label: 'FOLLOW-UPS', class: 'followup' }
    ];

    taskTypes.forEach(type => {
      const tasks = grouped[type.key];
      const taskCount = Object.values(tasks).reduce((sum, arr) => sum + arr.length, 0);

      if (taskCount === 0) return; // Skip if no tasks of this type

      html += `
    <div class="task-type-header ${type.class}">
        <span class="task-type-icon">${type.icon}</span>
        <span>${type.label}</span>
        <span class="task-type-count">${taskCount} task${taskCount !== 1 ? 's' : ''}</span>
    </div>
      `;

      // Group by client name within this type
      Object.keys(tasks).sort().forEach(clientName => {
        const clientTasks = tasks[clientName];
        html += `<div class="client-section">`;
        html += `<div class="client-name">👤 ${clientName}</div>`;

        clientTasks.forEach((task, idx) => {
          html += this.generateTaskCard(task, type.class, idx + 1);
        });

        html += `</div>`;
      });
    });

    return html;
  }

  /**
   * Generate individual task card
   */
  generateTaskCard(task, typeClass, sequenceNum) {
    const data = task.extractedData;
    const categoryLabel = {
      claim: 'Claim',
      quote: 'Quote Request',
      servicing: 'Policy Servicing',
      followup: 'Follow-up'
    }[task.category] || 'Task';

    let taskCardHTML = `
    <div class="task-card ${typeClass}">
        <div class="task-title">${task.subject}</div>
        <div class="task-detail">
            <strong>Type:</strong> ${categoryLabel}
        </div>
    `;

    // Dynamic fields based on task type
    if (data.policyNumber && data.policyNumber !== '-') {
      taskCardHTML += `
        <div class="task-detail">
            <strong>Policy:</strong> ${data.policyNumber}
        </div>
      `;
    }

    if (data.claimReference && data.claimReference !== '-') {
      taskCardHTML += `
        <div class="task-detail">
            <strong>Claim Ref:</strong> ${data.claimReference}
        </div>
      `;
    }

    if (data.description) {
      taskCardHTML += `
        <div class="task-detail">
            <strong>Details:</strong> ${data.description}
        </div>
      `;
    }

    // Files location
    if (data.oneDrivePath) {
      taskCardHTML += `
        <div class="task-files">
            📁 ${data.oneDrivePath}
        </div>
      `;
    }

    // Assigned Rep
    if (data.assignedRep) {
      taskCardHTML += `
        <div class="task-detail label">
            👤 Assigned to: <strong>${data.assignedRep}</strong>
        </div>
      `;
    }

    // Skye CRM ready format
    taskCardHTML += `
        <div class="skye-ready">
            <span class="skye-ready-label">✓ Ready for Skye CRM</span>
            <div class="skye-ready-text">
Task Type: ${categoryLabel}<br>
Client: ${data.clientName}<br>
Policy #: ${data.policyNumber}<br>
Summary: ${data.description}<br>
Assigned: ${data.assignedRep}
            </div>
        </div>
    </div>
    `;

    return taskCardHTML;
  }

  /**
   * Generate footer section
   */
  getFooterSection(stats) {
    const nextDigestTime = this.config.digestTime || '16:15';
    const today = new Date();
    const nextDay = new Date(today.getTime() + 24 * 60 * 60 * 1000);
    const nextDigestDate = nextDay.toLocaleDateString('en-ZA', { 
      month: 'short', 
      day: 'numeric' 
    });

    return `
        <div class="action-section">
            <div class="action-title">📋 Ready to Copy-Paste into Skye?</div>
            <div class="action-description">
                Each task above has a formatted section that's ready to copy. 
                Simply select the text under "Ready for Skye CRM" and paste into your task.
            </div>
        </div>
    </div>
    
    <div class="footer">
        <div class="footer-section">
            <span class="footer-label">📊 Today's Summary</span>
            Total: ${stats.total} | Claims: ${stats.claims} | Quotes: ${stats.quotes} | 
            Servicing: ${stats.servicing} | Follow-ups: ${stats.followups}
        </div>
        
        <div class="footer-divider"></div>
        
        <div class="footer-section">
            <span class="footer-label">⏰ Next Digest</span>
            Tomorrow (${nextDigestDate}) at ${nextDigestTime} SAST
        </div>
        
        <div class="footer-divider"></div>
        
        <div class="footer-section">
            <span class="footer-label">❓ Need Help?</span>
            Files are auto-organized in OneDrive at /Praeto/AutomationTasks/
            <br>
            Reply to this email with any questions or issues.
        </div>
        
        <div class="footer-divider"></div>
        
        <div style="text-align: center; font-size: 11px; color: #bbb;">
            Praeto Task Automation System • Powered by Claude AI
        </div>
    </div>
    `;
  }

  /**
   * Generate plain text version for email clients that don't support HTML
   */
  generatePlainText(grouped, stats) {
    let text = `
PRAETO DAILY TASK DIGEST
${new Date().toLocaleDateString('en-ZA', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}

SUMMARY
-------
Total Tasks: ${stats.total}
Claims: ${stats.claims}
Quotes: ${stats.quotes}
Policy Servicing: ${stats.servicing}
Follow-ups: ${stats.followups}
Files with Attachments: ${stats.attachments}

TASKS BY TYPE
=============
    `;

    const typeLabels = {
      claim: 'CLAIMS',
      quote: 'QUOTES',
      servicing: 'POLICY SERVICING',
      followup: 'FOLLOW-UPS'
    };

    Object.keys(grouped).forEach(typeKey => {
      const tasks = grouped[typeKey];
      const taskCount = Object.values(tasks).reduce((sum, arr) => sum + arr.length, 0);

      if (taskCount === 0) return;

      text += `\n${typeLabels[typeKey]} (${taskCount})\n`;
      text += `${'='.repeat(typeLabels[typeKey].length)}\n\n`;

      Object.keys(tasks).sort().forEach(clientName => {
        text += `Client: ${clientName}\n`;
        text += `${'-'.repeat(40)}\n`;

        tasks[clientName].forEach((task, idx) => {
          text += `\n${idx + 1}. ${task.subject}\n`;
          text += `   Type: ${typeLabels[typeKey]}\n`;
          text += `   Policy: ${task.extractedData.policyNumber}\n`;
          text += `   Summary: ${task.extractedData.description}\n`;
          text += `   Assigned to: ${task.extractedData.assignedRep}\n`;
          text += `   Files: ${task.extractedData.oneDrivePath}\n`;
        });

        text += `\n`;
      });
    });

    text += `
INSTRUCTIONS
============
Copy the task details above and paste into Skye CRM.

NEXT DIGEST
===========
Tomorrow at ${this.config.digestTime || '16:15'} SAST

Questions? Reply to this email.
    `;

    return text;
  }
}

// Export for use in main automation system
module.exports = DigestEmailGenerator;
