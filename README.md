# RTCC Panel & Marshaling Box Tracking System

Indo Tech Transformers uses this to track every RTCC panel and marshaling box through inspection, testing and clearance. Departments get an automatic follow-up email when pending points sit open.

- Record the date each panel or box clears each inspection stage.
- List pending points at receiving and see which are still open.
- Log drawing and schematic complaints and follow each one to closure.
- Departments get a follow-up email automatically after 48 hours, and you can send a reminder right away when points are not approved.
- Admins change email recipients from the settings screen, with no code edits.
- Users and admins get separate views.

## Quick start

```bash
git clone https://github.com/KRISH-exe-29/Pannel-Box-Transformers-.git && cd Pannel-Box-Transformers-
npm run install:all
npm run dev     # client on http://localhost:5173, server on http://localhost:5000
```

Before the first run, create a Supabase project, run the SQL files in `supabase/migrations/` in its SQL editor, and add `server/.env` and `client/.env` as shown in [Environment Variables](#2-environment-variables).

## Tech Stack
- **Frontend**: React, Vite, Tailwind CSS v3, Lucide React icons
- **Backend**: Node.js, Express, Nodemailer, node-cron
- **Database**: Supabase (PostgreSQL)
- **Deployment**: Local Windows Server via PM2

---

## 🚀 Setup & Installation

### 1. Prerequisites
- [Node.js](https://nodejs.org/) (v18 or higher)
- [Git](https://git-scm.com/)

### 2. Environment Variables
You need to set up environment variables for both the client and server.

**Server (`server/.env`)**
Create this file and add:
```env
SUPABASE_URL=your_supabase_project_url
SUPABASE_SERVICE_KEY=your_supabase_service_role_key
SUPABASE_ANON_KEY=your_supabase_anon_key
GMAIL_USER=your_email@gmail.com
GMAIL_APP_PASSWORD=your_gmail_app_password
PORT=5000
```

> **How to get a Gmail App Password:**
> 1. Go to your Google Account > Security.
> 2. Enable 2-Step Verification.
> 3. Go to "App passwords" and generate a new password for "Mail".

**Client (`client/.env`)**
Create this file and add:
```env
VITE_SUPABASE_URL=your_supabase_project_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

### 3. Local Development

Install dependencies for all workspaces:
```bash
npm run install:all
```

Start both the client (port 5173) and server (port 5000) concurrently:
```bash
npm run dev
```

---

## 🌍 Production Deployment on Windows (LAN)

To run this application continuously on a local Windows machine and make it accessible across your factory's local network.

### 1. Build the Frontend
```bash
npm run build
```
*This compiles the React app into static files in `client/dist/`, which are then served by the Express backend.*

### 2. Install PM2 Globally
PM2 is a production process manager for Node.js.
```bash
npm install -g pm2
```

### 3. Start the Server with PM2
Open a Command Prompt or PowerShell terminal as Administrator, navigate to the `server/` directory, and run:
```bash
cd server
pm2 start index.js --name "rtcc-tracker"
```

### 4. Enable PM2 Auto-Start on Windows Reboot
To ensure the app restarts if the Windows machine reboots, use `pm2-windows-startup`:
```bash
npm install -g pm2-windows-startup
pm2-startup install
pm2 save
```

### 5. Accessing on the Local Network
To access the app from any tablet or PC on the shopfloor:

1. Find your server's IP address by opening CMD and typing `ipconfig`.
2. Look for the "IPv4 Address" (e.g., `192.168.1.100`).
3. Open a browser on any device on the same network and navigate to:
   `http://192.168.1.100:5000`

> **Note:** Ensure your Windows Firewall allows inbound connections on port 5000.
