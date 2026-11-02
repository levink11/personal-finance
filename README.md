# CrediPulse ⚡ • Peer Lending & Personal Finance PWA

A private, single-user Personal Finance & Peer-Lending Tracking Web App (PWA) built for **100% zero ongoing cost ($0/month)**. It opens instantly on both Laptop and Mobile devices **without any login screens or PIN locks**.

---

## 🚀 Sprint 1 Completed: Peer-Lending Engine

### 1. Core Modules Built
- **Two-Tier Intelligent Sorting**:
  - **Top Section (Active & Extended)**: High-contrast, bright cards displaying all active receivables. Default sorted **Newest to Oldest by Date Lent**. Includes live status badges (`Active`, `Extended`, `Overdue by X days`, `Due Today`, `X days left`).
  - **Bottom Section (Settled Loans)**: Visually dimmed (50% opacity, faint gray background, strikethrough borrower name, muted accents). Sorted **Newest to Oldest by Settlement Date**, with lifetime interest earned breakdown and 1-click Reopen option.
- **Arbitrary & Flexible Tenures**:
  - Loans are not restricted to monthly cycles. Set any custom duration (7 days, 15 days, 45 days, etc.).
  - **Quick Presets**: `+7 Days`, `+15 Days`, `+1 Month`, `+45 Days`, `+3 Months`, `+6 Months`.
  - **Live Tenure Counter**: Automatically calculates total tenure days (e.g. `45 Days (~1.5 mo)`).
- **Two-Way Reactive Interest Calculator**:
  - Typing **Interest Rate %** instantly computes **Interest Amount (₹)**.
  - Typing **Interest Amount (₹)** instantly computes **Interest Rate %**.
  - Supports both **Flat Tenure Rate** and **Pro-Rata Monthly Rate** (`% Per Month`).
  - Live summary of Total Return (`Principal + Interest`) and daily earning velocity.
- **1-Click Rollover / Extension**:
  - Allows borrower to pay only the interest for a period.
  - Automatically records collected interest in the `Interest_Ledger`.
  - Extends the return due date using the calendar picker or quick preset buttons (`+15 Days`, `+1 Month`, etc.).
  - Preserves principal amount and updates loan status to `Extended`.
  - Updates "Total Interest Collected" on the Dashboard in real time.
- **Settlement & Closure Flow**:
  - Breakdown modal displays: `Total Received = Principal (P) + Final Cycle Accrued Interest (I)`.
  - Final interest collected is permanently saved into `Interest_Ledger` so interest revenue is never lost.
  - Decreases active lent principal and moves loan to Settled status with celebration confetti.
- **Permanent Interest Ledger**:
  - Chronological transaction audit log of all interest collections (Rollovers and Settlements).
  - Filter by individual borrower or view all.
- **Master Dashboard**:
  - Real-time Net Worth calculation:
    $$\text{Net Worth} = (\text{Bank Balances} + \text{Active Principal} + \text{Total Interest Collected}) - \text{Debts}$$
- **Modular Data Portability**:
  - **JSON Backup & Restore**: Transfer data seamlessly between Laptop and Mobile phone with zero server accounts.
  - **CSV Exports**: Independent downloads for Loans list and Interest Ledger.
- **Cross-Device PWA Architecture**:
  - Progressive Web App with `manifest.json` and `sw.js` (Service Worker) for offline operation.
  - Optimized mobile navigation bar + desktop top bar.
  - Installable directly to Home Screen on iOS (Safari) and Android (Chrome).

---

## 🛠️ How to Run Locally

### Option 1: macOS Double-Click
Simply double-click `start.command` in this folder. It will launch the local server and open your default browser to `http://localhost:8080`.

### Option 2: Terminal
Run:
```bash
python3 -m http.server 8080
```
Then open [http://localhost:8080](http://localhost:8080) in your browser.

---

## 🌐 100% Free Hosting ($0/Month)

### Deploying to Cloudflare Pages (Recommended)
1. Push this folder to a private GitHub repository.
2. In Cloudflare Pages dashboard, select **Create a project** → **Connect to Git**.
3. Set **Framework preset** to `None` and **Build output directory** to `/`.
4. Deploy! Your app will be live on `https://your-app.pages.dev` with free SSL, global CDN, and zero maintenance.

### Deploying to Vercel
1. Import the repository in Vercel.
2. Framework: `Other`. Root Directory: `./`.
3. Deploy!
