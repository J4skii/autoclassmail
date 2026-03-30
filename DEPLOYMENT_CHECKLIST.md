# Praeto Email Automation — Deployment Checklist
*Target: 15-minute deployment by server admin. No technical knowledge required.*

---

## Step 1 — Copy These 4 Files to the Server

Copy this exact folder to the server. You only need these files:

```
praeto-email.exe              ← the program (44 MB)
praeto_automation_config_v2.json  ← keyword rules
install-service.bat           ← installer (run this once)
.env                          ← your credentials (fill this in first — see Step 2)
```

Recommended location on the server:
```
C:\Praeto\EmailAutomation\
```

> **Note:** The `.env` file may be hidden in Windows Explorer.
> To show hidden files: View → Show → Hidden items (tick the box).

---

## Step 2 — Fill In the `.env` File

Open `.env` in Notepad. It looks like this:

```
IMAP_HOST=mail.praeto.co.za
IMAP_PORT=993
IMAP_USER=admin6@praeto.co.za
IMAP_PASSWORD=your_password_here

SMTP_HOST=mail.praeto.co.za
SMTP_PORT=587
SMTP_USER=admin6@praeto.co.za
SMTP_PASSWORD=your_password_here
SMTP_FROM_NAME=Praeto Task Automation
SMTP_FROM_EMAIL=admin6@praeto.co.za

DIGEST_TO_EMAIL=manager@praeto.co.za
ALERT_EMAIL=manager@praeto.co.za
```

**Change these 3 things only:**
1. Replace both `your_password_here` with the real email password
2. Change `DIGEST_TO_EMAIL` to whoever should receive the task summary emails
3. Change `ALERT_EMAIL` to whoever should be notified if the system crashes (can be the same person)

Save and close Notepad.

---

## Step 3 — Run the Installer

1. Right-click `install-service.bat`
2. Choose **"Run as administrator"**
3. A black window will appear. Wait for it to finish.
4. You should see: `[OK] Service installed and started successfully.`
5. Press any key to close.

If you see `[ERROR]` — read the message. The most common cause is:
- You forgot to fill in the password in Step 2 (it still says `your_password_here`)
- You did not run as Administrator

---

## Step 4 — Verify in Task Scheduler

1. Press `Windows key + R`, type `taskschd.msc`, press Enter
2. In the left panel, click **Task Scheduler Library**
3. Find **"Praeto Email Automation"** in the list
4. Check these values:

| Column | Should say |
|--------|-----------|
| Status | **Running** |
| Triggers | **At system startup** |
| Last Run Result | **0x0** (success) or still running |

5. Right-click the task → **Properties** → **Settings** tab
6. Confirm: "If the task fails, restart every: **1 minute**" and "Attempt restart up to: **10** times"

> If Status says "Ready" instead of "Running": right-click → **Run** to start it manually.

---

## Step 5 — Send a Test Email

Send any email to `admin6@praeto.co.za` with a subject that includes a keyword like:
- "New claim" or "Claim number 12345"
- "Quote request" or "Need a quote"

Within 5 minutes, `manager@praeto.co.za` should receive a digest email with that task listed.

---

## First 24 Hours — What to Watch For

| Time | What to check |
|------|--------------|
| After install | Digest email arrives within 5 min of test email |
| Morning Day 1 | Check Task Scheduler — Status should still say **Running** |
| Morning Day 1 | Check `C:\Praeto\EmailAutomation\logs\` — a `.log` file should exist with today's date |
| If system crashed | You will receive an alert email at `ALERT_EMAIL` automatically |
| If no digest arrives | Check the log file for errors |

**The log file is your first port of call for any problem.**
It is in: `C:\Praeto\EmailAutomation\logs\praeto-YYYY-MM-DD.log`

---

## Uninstalling

Double-click `uninstall-service.bat` (run as Administrator).
This stops the service and removes it from Task Scheduler.
Your `.env` file and logs are not deleted.

---

## Quick Reference

| What | Value |
|------|-------|
| Inbox monitored | `admin6@praeto.co.za` |
| Digest sent to | `DIGEST_TO_EMAIL` in `.env` |
| Alert emails to | `ALERT_EMAIL` in `.env` |
| Logs location | `C:\Praeto\EmailAutomation\logs\` |
| Task Scheduler name | `Praeto Email Automation` |
| Restarts after crash | Yes — automatically, within 1 minute |
| Starts on Windows boot | Yes — automatically |
