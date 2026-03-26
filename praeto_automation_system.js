/**
 * PRAETO TASK AUTOMATION SYSTEM
 * Main System Orchestrator
 * 
 * Monitors multiple inboxes, processes emails, and delivers personalized
 * HTML email digests to each admin member at their configured time
 */

import DigestEmailGenerator from './digest_email_generator.js';

class PraetoAutomationSystem {
  constructor(config) {
    this.config = config;
    this.processedTasks = [];
    this.pendingDigests = {};
    this.isRunning = false;
  }

  /**
   * Initialize the system
   */
  async initialize() {
    console.log('🚀 Initializing Praeto Task Automation System...');
    
    // Validate configuration
    this.validateConfig();
    
    // Initialize admin digests
    this.initializeAdminDigests();
    
    // Start monitoring
    this.startMonitoring();
    
    console.log('✅ System initialized and monitoring started');
  }

  /**
   * Validate configuration
   */
  validateConfig() {
    if (!this.config.monitored_inboxes || this.config.monitored_inboxes.length === 0) {
      throw new Error('No monitored inboxes configured');
    }
    
    if (!this.config.admin_team || this.config.admin_team.length === 0) {
      throw new Error('No admin team configured');
    }
    
    console.log(`✓ Monitoring ${this.config.monitored_inboxes.length} inbox(es)`);
    console.log(`✓ Configured for ${this.config.admin_team.length} admin member(s)`);
  }

  /**
   * Initialize pending digest queues for each admin
   */
  initializeAdminDigests() {
    this.config.admin_team.forEach(admin => {
      this.pendingDigests[admin.email] = {
        admin: admin,
        tasks: [],
        lastSent: null,
        nextScheduledTime: this.calculateNextDigestTime(admin.digestTime)
      };
    });
  }

  /**
   * Calculate next digest delivery time
   */
  calculateNextDigestTime(timeString) {
    const [hours, minutes] = timeString.split(':').map(Number);
    const now = new Date();
    const nextDigest = new Date(now);
    nextDigest.setHours(hours, minutes, 0, 0);
    
    // If time has already passed today, schedule for tomorrow
    if (nextDigest <= now) {
      nextDigest.setDate(nextDigest.getDate() + 1);
    }
    
    return nextDigest;
  }

  /**
   * Start monitoring all configured inboxes
   */
  startMonitoring() {
    this.isRunning = true;
    
    // Check for new emails every minute
    this.monitoringInterval = setInterval(() => {
      this.checkForNewEmails();
      this.checkDigestSchedule();
    }, 60000); // 60 seconds
    
    // Also check immediately
    this.checkForNewEmails();
    this.checkDigestSchedule();
  }

  /**
   * Stop monitoring
   */
  stopMonitoring() {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.isRunning = false;
      console.log('⏹️ Monitoring stopped');
    }
  }

  /**
   * Check for new emails in all monitored inboxes
   */
  async checkForNewEmails() {
    console.log('📧 Checking for new emails...');
    
    for (const inbox of this.config.monitored_inboxes) {
      try {
        const emails = await this.fetchNewEmails(inbox.email);
        
        for (const email of emails) {
          await this.processEmail(email, inbox);
        }
      } catch (error) {
        console.error(`❌ Error checking inbox ${inbox.email}:`, error);
      }
    }
  }

  /**
   * Fetch new emails from an inbox (mocked for demo)
   */
  async fetchNewEmails(inboxEmail) {
    // In production, this would use Microsoft Graph API
    // For now, returning empty array (system would integrate with real API)
    return [];
  }

  /**
   * Process a single email
   */
  async processEmail(email, inbox) {
    console.log(`📨 Processing email: ${email.subject}`);
    
    try {
      // Step 1: Categorize email
      const category = this.categorizeEmail(email);
      
      // Step 2: Extract data
      const extractedData = this.extractTaskData(email, category);
      
      // Step 3: Save attachments to OneDrive
      const attachmentPaths = await this.handleAttachments(email, extractedData);
      
      // Step 4: Create task object
      const task = {
        id: Date.now(),
        timestamp: new Date().toISOString(),
        from: email.from,
        subject: email.subject,
        category: category,
        status: 'processed',
        extractedData: {
          ...extractedData,
          oneDrivePath: `${this.getTypeFolderPath(category)}/${extractedData.clientName}/`,
          attachments: attachmentPaths
        },
        attachments: attachmentPaths
      };
      
      // Step 5: Route to appropriate admins
      this.routeTaskToAdmins(task, inbox);
      
      // Step 6: Log processing
      this.logTaskProcessing(task);
      
      console.log(`✓ Task processed: ${task.extractedData.clientName} - ${category}`);
      
    } catch (error) {
      console.error(`❌ Error processing email:`, error);
    }
  }

  /**
   * Categorize email based on keywords
   */
  categorizeEmail(email) {
    const emailText = `${email.subject} ${email.body}`.toLowerCase();
    
    for (const [categoryKey, categoryConfig] of Object.entries(this.config.task_categories)) {
      for (const keyword of categoryConfig.keywords) {
        if (emailText.includes(keyword.toLowerCase())) {
          return categoryKey;
        }
      }
    }
    
    return 'followup'; // Default category
  }

  /**
   * Extract task data from email
   */
  extractTaskData(email, category) {
    const emailText = `${email.subject} ${email.body}`;
    
    return {
      clientName: this.extractClientName(emailText),
      policyNumber: this.extractPolicyNumber(emailText),
      claimReference: this.extractClaimReference(emailText),
      description: this.extractDescription(email),
      assignedRep: this.assignRep(email),
      dateOfIncident: this.extractDate(emailText)
    };
  }

  /**
   * Extract client name from email
   */
  extractClientName(text) {
    const patterns = this.config.extraction_rules.clientNamePatterns;
    
    for (const pattern of patterns) {
      const regex = new RegExp(pattern, 'i');
      const match = text.match(regex);
      if (match && match[1]) {
        return match[1].trim();
      }
    }
    
    return 'Unknown Client';
  }

  /**
   * Extract policy number from email
   */
  extractPolicyNumber(text) {
    const patterns = this.config.extraction_rules.policyNumberPatterns;
    
    for (const pattern of patterns) {
      const regex = new RegExp(pattern, 'i');
      const match = text.match(regex);
      if (match && match[1]) {
        return match[1].trim();
      }
    }
    
    return '-';
  }

  /**
   * Extract claim reference from email
   */
  extractClaimReference(text) {
    const patterns = this.config.extraction_rules.claimReferencePatterns;
    
    for (const pattern of patterns) {
      const regex = new RegExp(pattern, 'i');
      const match = text.match(regex);
      if (match && match[1]) {
        return match[1].trim();
      }
    }
    
    return '-';
  }

  /**
   * Extract description from email
   */
  extractDescription(email) {
    // Return first 200 characters of email body
    return email.body.substring(0, 200).trim();
  }

  /**
   * Extract date from email
   */
  extractDate(text) {
    const dateRegex = /(\d{4}-\d{2}-\d{2}|\d{2}\/\d{2}\/\d{4})/;
    const match = text.match(dateRegex);
    return match ? match[1] : new Date().toISOString().split('T')[0];
  }

  /**
   * Assign email to appropriate rep
   */
  assignRep(email) {
    // First, try to match by sender
    const senderDomain = email.from.split('@')[1];
    
    for (const rep of this.config.sales_representatives) {
      if (rep.email.includes(email.from.split('@')[0])) {
        return rep.name;
      }
    }
    
    // Default to first rep
    return this.config.sales_representatives[0].name;
  }

  /**
   * Handle email attachments (save to OneDrive)
   */
  async handleAttachments(email, extractedData) {
    if (!email.attachments || email.attachments.length === 0) {
      return [];
    }
    
    const attachmentPaths = [];
    const folderPath = `${this.getTypeFolderPath(extractedData.category)}/${extractedData.clientName}`;
    
    for (const attachment of email.attachments) {
      try {
        // In production: upload to OneDrive using Microsoft Graph API
        const savedPath = `${folderPath}/${attachment.filename}`;
        attachmentPaths.push(savedPath);
      } catch (error) {
        console.error(`❌ Error saving attachment: ${attachment.filename}`, error);
      }
    }
    
    return attachmentPaths;
  }

  /**
   * Get OneDrive folder path for task type
   */
  getTypeFolderPath(category) {
    const folders = this.config.onedrive_structure.folders;
    
    switch(category) {
      case 'claim':
        return folders.claims;
      case 'quote':
        return folders.quotes;
      case 'servicing':
        return folders.policies;
      case 'followup':
        return folders.followups;
      default:
        return folders.claims;
    }
  }

  /**
   * Route task to appropriate admins
   */
  routeTaskToAdmins(task, sourceInbox) {
    // Find admins monitoring this inbox
    const relevantAdmins = this.config.admin_team.filter(admin => 
      admin.monitoredInboxes.includes(sourceInbox.email)
    );
    
    // Add task to each admin's pending digest
    for (const admin of relevantAdmins) {
      if (this.pendingDigests[admin.email]) {
        this.pendingDigests[admin.email].tasks.push(task);
      }
    }
  }

  /**
   * Check if any digests are scheduled to be sent
   */
  async checkDigestSchedule() {
    const now = new Date();
    
    for (const [adminEmail, digestInfo] of Object.entries(this.pendingDigests)) {
      // Check if it's time to send digest for this admin
      if (now >= digestInfo.nextScheduledTime && digestInfo.tasks.length > 0) {
        await this.sendDigestEmail(adminEmail);
        
        // Reset for next day
        digestInfo.tasks = [];
        digestInfo.lastSent = now;
        digestInfo.nextScheduledTime = this.calculateNextDigestTime(digestInfo.admin.digestTime);
      }
    }
  }

  /**
   * Send digest email to admin
   */
  async sendDigestEmail(adminEmail) {
    const digestInfo = this.pendingDigests[adminEmail];
    
    if (!digestInfo || digestInfo.tasks.length === 0) {
      return;
    }
    
    try {
      console.log(`📧 Generating digest for ${adminEmail}...`);
      
      // Generate email using DigestEmailGenerator
      const generator = new DigestEmailGenerator(this.config.email_settings);
      const emailData = generator.generateDigestEmail(adminEmail, digestInfo.tasks);
      
      // Send email
      await this.sendEmail(emailData);
      
      console.log(`✅ Digest email sent to ${adminEmail}`);
      
      // Log delivery
      this.logDigestDelivery(adminEmail, digestInfo.tasks.length);
      
    } catch (error) {
      console.error(`❌ Error sending digest to ${adminEmail}:`, error);
      
      // Log failure
      this.logDeliveryFailure(adminEmail, error.message);
    }
  }

  /**
   * Send email via Outlook (using Microsoft Graph API in production)
   */
  async sendEmail(emailData) {
    // In production: use Microsoft Graph API to send email
    // For demo: log the email that would be sent
    console.log('📨 Email to be sent:');
    console.log(`   To: ${emailData.to}`);
    console.log(`   Subject: ${emailData.subject}`);
    console.log(`   Send Time: ${emailData.sendTime} SAST`);
    
    // Mock success
    return true;
  }

  /**
   * Logging methods
   */
  logTaskProcessing(task) {
    const log = {
      timestamp: new Date().toISOString(),
      event: 'task_processed',
      taskId: task.id,
      client: task.extractedData.clientName,
      type: task.category,
      attachments: task.attachments.length
    };
    
    if (this.config.logging.enabled) {
      console.log(`[${log.timestamp}] Task processed:`, log);
    }
  }

  logDigestDelivery(adminEmail, taskCount) {
    const log = {
      timestamp: new Date().toISOString(),
      event: 'digest_delivered',
      admin: adminEmail,
      taskCount: taskCount
    };
    
    if (this.config.logging.enabled) {
      console.log(`[${log.timestamp}] Digest delivered:`, log);
    }
  }

  logDeliveryFailure(adminEmail, error) {
    const log = {
      timestamp: new Date().toISOString(),
      event: 'delivery_failed',
      admin: adminEmail,
      error: error
    };
    
    if (this.config.logging.enabled) {
      console.error(`[${log.timestamp}] Delivery failed:`, log);
    }
  }

  /**
   * Get system status
   */
  getStatus() {
    return {
      running: this.isRunning,
      monitoredInboxes: this.config.monitored_inboxes.length,
      adminCount: this.config.admin_team.length,
      totalTasksProcessed: this.processedTasks.length,
      pendingDigests: Object.keys(this.pendingDigests).reduce((sum, key) => {
        return sum + this.pendingDigests[key].tasks.length;
      }, 0),
      configuration: {
        timezone: this.config.system.timezone,
        digestTime: this.config.admin_team[0].digestTime,
        emailFormat: this.config.system.emailFormat
      }
    };
  }

  /**
   * Get dashboard data
   */
  getDashboardData() {
    const dashboardData = {};
    
    for (const [adminEmail, digestInfo] of Object.entries(this.pendingDigests)) {
      dashboardData[adminEmail] = {
        admin: digestInfo.admin.name,
        email: adminEmail,
        digestTime: digestInfo.admin.digestTime,
        pendingTasks: digestInfo.tasks.length,
        nextScheduledTime: digestInfo.nextScheduledTime.toISOString(),
        lastSent: digestInfo.lastSent ? digestInfo.lastSent.toISOString() : null,
        tasks: digestInfo.tasks.map(t => ({
          id: t.id,
          subject: t.subject,
          client: t.extractedData.clientName,
          type: t.category,
          timestamp: t.timestamp
        }))
      };
    }
    
    return dashboardData;
  }
}

// Export for use in applications
export default PraetoAutomationSystem;
