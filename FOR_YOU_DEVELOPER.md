# Praeto Email Automation — Developer Reference

## What This System Does
Monitors the `admin6@praeto.co.za` inbox via IMAP.
When emails arrive, it classifies them by keyword (Claims, Quotes, Servicing, Follow-ups),
builds a formatted digest, and emails it to `manager@praeto.co.za`.
Runs as a persistent background service on the company server.

---

## Project Structure

```
emailauto-v01/
├── main.js                          ← Entry point (production logic)
├── digest_email_generator.js        ← HTML email template builder
├── praeto_automation_config_v2.json ← Keywords, categories, rep config
├── .env                             ← Credentials (never committed to git)
├── .env.example                     ← Template for new deployments
├── package.json                     ← Dependencies + build scripts
├── dist/
│   └── praeto-email.exe             ← Compiled standalone executable
├── SETUP.txt                        ← Plain English guide for server guy
├── install-service.bat              ← Registers Windows Task Scheduler
├── uninstall-service.bat            ← Removes the service
└── setup.bat                        ← Full dev environment setup
```

---

## Local Development Setup

### Prerequisites
- Node.js LTS — https://nodejs.org
- Git

### First Time Setup
```bash
git clone https://github.com/J4skii/autoclassmail
cd autoclassmail
npm install
copy .env.example .env
```

Open `.env` and fill in credentials, then:

```bash
# Test the connection only
node test_mail_server.mjs

# Run once (scan today, send digest, exit)
node main.js

# Run as daemon (persistent connection, reacts to new mail)
node main.js --daemon
```

---

## Environment Variables (.env)

| Variable | What it is |
|---|---|
| `IMAP_HOST` | Mail server hostname |
| `IMAP_PORT` | IMAP port (993 for TLS) |
| `IMAP_USER` | Inbox to monitor |
| `IMAP_PASSWORD` | Password for that inbox |
| `SMTP_HOST` | Mail server for sending |
| `SMTP_PORT` | SMTP port (587 or 465) |
| `SMTP_USER` | Account used to send from |
| `SMTP_PASSWORD` | Password for sending account |
| `SMTP_FROM_NAME` | Display name on outgoing emails |
| `SMTP_FROM_EMAIL` | From address on outgoing emails |
| `DIGEST_TO_EMAIL` | Who receives the digest |

---

## Changing Configuration

All classification logic lives in `praeto_automation_config_v2.json`.

**To add a keyword to a category:**
```json
"claim": {
  "keywords": ["claim", "accident", "damage", "your new keyword here"]
}
```

**To change who receives the digest:**
Edit `DIGEST_TO_EMAIL` in `.env`

**To add a new sales rep:**
```json
"sales_representatives": [
  { "id": "rep3", "name": "Rep 3", "email": "rep3@praeto.co.za", "role": "Sales Representative", "active": true }
]
```

---

## Building the .exe

After any code change, rebuild the executable:

```bash
npm run build
```

Output: `dist/praeto-email.exe` (approx 44 MB, self-contained, no Node.js required)

Then copy the new `.exe` to the server and restart the service:
```
Right-click uninstall-service.bat → Run as Administrator
Right-click install-service.bat   → Run as Administrator
```

---

## How the System Works (Flow)

```
1. Daemon starts → connects to IMAP (single persistent connection)
2. Scans all emails received today (SINCE midnight SAST)
3. Waits — server pushes notification when new mail arrives (IMAP IDLE)
4. On new mail:
     a. Fetch email body
     b. Match keywords → assign category
     c. Extract client name, policy number, claim reference
     d. Build task object
     e. Append to daily log file (tasks_YYYY-MM-DD.json)
     f. Generate HTML digest
     g. Send digest via SMTP to DIGEST_TO_EMAIL
5. If connection drops → auto-reconnects after 30 seconds
6. At startup → cleans up log files older than 30 days
```

---

## Log Files

Daily logs are saved as `tasks_YYYY-MM-DD.json` next to the `.exe`.

- Files older than **30 days** are deleted automatically on startup
- Files over **5 MB** are trimmed to the last 500 entries automatically

---

## Deploying an Update

1. Make code changes locally
2. Test with `node main.js`
3. Run `npm run build` → new `dist/praeto-email.exe`
4. Send new `.exe` to server guy
5. He replaces the old `.exe` in `C:\PraetoEmail\` and restarts the service

---

## Troubleshooting

| Problem | Fix |
|---|---|
| `Missing env variables` | `.env` file missing or incomplete |
| `IMAP connection error` | Wrong host/password or port 993 blocked |
| `SMTP send failed` | Try changing `SMTP_PORT` from 587 to 465 in `.env` |
| Digest not arriving | Check spam folder, verify `DIGEST_TO_EMAIL` in `.env` |
| Emails not classified | Check keywords in `praeto_automation_config_v2.json` |
| Service not starting | Re-run `install-service.bat` as Administrator |

---

## Roadmap (Not Yet Built)

- [ ] Automated acknowledgement reply to sender
- [ ] Instant forwarding to manager for Claims (not waiting for digest)
- [ ] Attachment saving to OneDrive (needs Microsoft 365 API access from server admin)
- [ ] Rep assignment logic (currently always assigns to Rep 1)
- [ ] Urgent alerts for high-priority emails

---

## Repository
https://github.com/J4skii/autoclassmail
