# Praeto Email Automation — Server Setup Guide

**For:** Server / IT Administrator
**Difficulty:** Easy — no coding required
**Time:** 10 minutes

---

## What You Are Installing

A background service that monitors the company email inbox,
classifies incoming emails, and sends a formatted summary
to the manager. It runs silently in the background and
starts automatically every time the server restarts.

---

## What You Need Before Starting

- [ ] Windows Server (any version)
- [ ] Administrator access on the server
- [ ] The password for `admin6@praeto.co.za`
- [ ] The 5 files listed below (provided by your developer)

---

## Files You Need

Make sure you have all 5 of these:

```
praeto-email.exe
praeto_automation_config_v2.json
.env
install-service.bat
uninstall-service.bat
```

---

## Step 1 — Create a Folder on the Server

Open File Explorer and create this exact folder:

```
C:\PraetoEmail\
```

Copy all 5 files into that folder.

When done it should look like this:

```
C:\PraetoEmail\
    praeto-email.exe
    praeto_automation_config_v2.json
    .env
    install-service.bat
    uninstall-service.bat
```

---

## Step 2 — Fill In the Password

1. Right-click the `.env` file
2. Click **Open with** → **Notepad**
3. You will see this:

```
IMAP_USER=admin6@praeto.co.za
IMAP_PASSWORD=your_password_here

SMTP_USER=admin6@praeto.co.za
SMTP_PASSWORD=your_password_here
```

4. Replace **both** instances of `your_password_here` with the
   real password for `admin6@praeto.co.za`

5. Save the file (Ctrl + S) and close Notepad

> ⚠️ Do not change anything else in this file

---

## Step 3 — Test That It Works

Before installing as a service, do a quick test:

1. Double-click `praeto-email.exe`
2. A black window will open — wait about 30 seconds
3. You should see something like:

```
✅ Connected to mail.praeto.co.za
📬 INBOX open — 45 message(s) in mailbox
   Found 3 email(s) for today.
✅ Digest sent to manager@praeto.co.za
Done.
```

4. The window will close on its own when finished

If you see a red error message, the password in `.env` is
likely incorrect. Go back to Step 2 and check it.

---

## Step 4 — Install as a Background Service

1. Right-click `install-service.bat`
2. Click **"Run as administrator"**
3. Click **Yes** if Windows asks for permission
4. Wait — you will see:

```
[OK] Service installed and started successfully.

The system is now:
  - Running in the background
  - Will start automatically when Windows starts
  - Monitoring admin6@praeto.co.za
  - Sending digests to manager@praeto.co.za
```

5. Press any key to close the window

The system is now running.

---

## Step 5 — Confirm It Is Running

1. Press the Windows key and search for **Task Scheduler**
2. Open it
3. In the left panel click **Task Scheduler Library**
4. Look for **"Praeto Email Automation"** in the list
5. The **Status** column should say **Running**

That's it. Setup is complete.

---

## What Happens Going Forward

- The service runs silently in the background 24/7
- It monitors the `admin6@praeto.co.za` inbox
- When new emails arrive, manager@praeto.co.za gets a digest
- If the server restarts, the service starts automatically
- If the connection drops, it reconnects automatically

You do not need to do anything else.

---

## If You Need to Stop the Service

1. Right-click `uninstall-service.bat`
2. Click **"Run as administrator"**
3. The service will stop and be removed

To restart it, run `install-service.bat` as Administrator again.

---

## If the Developer Sends a New Version

When the developer sends an updated `praeto-email.exe`:

1. Right-click `uninstall-service.bat` → Run as administrator
2. Replace the old `praeto-email.exe` in `C:\PraetoEmail\` with the new one
3. Right-click `install-service.bat` → Run as administrator
4. Done

---

## Troubleshooting

**Black window appears then immediately closes with red text**
→ The password in `.env` is wrong. Open `.env` in Notepad and correct it.

**"Run as administrator" option not available**
→ Your account may not have admin rights. Contact someone who does.

**Task Scheduler shows Status as "Ready" not "Running"**
→ Right-click "Praeto Email Automation" in Task Scheduler → click Run

**Manager says they are not receiving digest emails**
→ Check the manager's spam/junk folder first
→ If not there, re-run `install-service.bat` as administrator

---

## Support

Contact your developer with a screenshot of any error messages.
