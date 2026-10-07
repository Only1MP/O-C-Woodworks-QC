# Daily QC Defect Log — Full-Stack Woodshop App

A Quality Control defect tallying app designed for woodshop inspection, real-time defect tracking, shift auditing, user authentication, and containerized deployment with an embedded server database on a Raspberry Pi.

---

## 🔒 User Accounts & Authentication

The app includes full-stack authentication designed for shop-floor tablets and laptops running over Tailscale or local Wi-Fi:

- **Quick User Switching**: Operators can switch between inspector profiles with a single click and a 4-digit PIN.
- **Roles**:
  - `admin`: Full control to add user accounts, change PINs, and manage rosters.
  - `lead`: Lead inspector credentials with auditing privileges.
  - `inspector`: Floor defect tallying and report submission.
- **Default Seed Accounts**:
  - **Admin**: Username: `admin` | Default PIN: `1234`
  - **Lead**: Username: `lead` | Default PIN: `4321`
  - **Inspector**: Username: `inspector` | Default PIN: `0000`

---

## 💾 Server Database & Volume Persistence

The database runs directly on your server/Raspberry Pi (`/app/data/qc_store.json`), mounted via a Docker volume to `./data/` on the host:
- **No separate DB containers** (PostgreSQL/MySQL) eating up Pi memory.
- **Atomic file writes** preventing corruption during unexpected power cuts.
- **Instant Backups**: To back up your logs and users, copy `./data/qc_store.json`.
- **Automatic Migration**: Any existing audits saved in browser `localStorage` automatically sync to the server database upon first load.

---

## 🐳 Quick Start with Docker Compose (Raspberry Pi / Server)

1. **Start the container**:
   ```bash
   HOST_PORT=8084 docker compose up -d --build
   ```
2. **Access the application**:
   - Local: `http://localhost:8084`
   - Tailscale: `http://<pi-tailscale-ip>:8084` or `https://<pi-node-name>.ts.net:8084`
   - Tailscale Funnel (Public): `https://<your-funnel-subdomain>.ts.net`

3. **View logs or stop**:
   ```bash
   docker compose logs -f
   docker compose down
   ```

---

## 💻 Local Development

```bash
# Run full-stack dev server (Vite + Express API on port 3000)
npm run dev

# Lint check
npm run lint

# Production build verification
npm run build
```
