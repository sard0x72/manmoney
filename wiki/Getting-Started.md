# Getting Started

This page gets you from a fresh copy of the project to a running app with your first account and transaction.

## Requirements

ManMoney is a Tauri app, so you need both the web and Rust toolchains installed:

- **Node.js** (18 or newer) and npm
- **Rust** (stable) with Cargo
- The system libraries Tauri needs on your platform. On Debian/Ubuntu/Kali this is typically `libwebkit2gtk-4.1-dev`, `build-essential`, `libssl-dev`, `libayatana-appindicator3-dev`, and `librsvg2-dev`. See the Tauri prerequisites guide for the exact list for your OS.

## Install and run

From the project folder:

```bash
npm install
npm run tauri dev
```

`npm run tauri dev` is the command that matters. It starts the Vite frontend **and** the Rust backend together and opens the desktop window. The first run compiles the Rust side, so it takes a while; later runs are fast.

### Why not `npm run dev`?

`npm run dev` starts only the web frontend. In that mode the desktop data layer does not exist, so every action that reads or writes data fails. If you open the app this way you'll see a screen telling you to use `npm run tauri dev` instead. Always launch with the Tauri command.

## What you get on first run

The app sets up its database automatically the first time it starts. To save you from staring at an empty screen, it seeds some defaults:

- A starter set of **income categories** (Salary, Freelance, Business, Investment, Gift, Other Income).
- A starter set of **expense categories** (Food & Dining, Transport, Shopping, Entertainment, Rent & Housing, Utilities, Health, Education, Travel, Subscriptions, Insurance, Other Expense).
- A single **Cash** account with a zero balance.

You can rename, recolor, add to, or delete these (defaults can't be deleted, but your own additions can). Nothing here is permanent except the defaults.

## Your first five minutes

1. **Set up your accounts.** Go to [[Accounts]] and add the real places your money lives — your bank account, a credit card, savings, and so on. Give each one its correct opening balance. This is the one time you type a balance in directly.
2. **Record a transaction or two.** Open [[Transactions]], click *Add Transaction*, and log something recent. Watch the account balance update on the Accounts page.
3. **Tidy up categories.** Visit [[Categories]] and adjust the defaults to match how you actually think about your spending.
4. **Set a budget (optional).** If you want spending limits, head to [[Budgets]] and set a monthly amount for a category or two.
5. **Check the Dashboard.** Go back to [[Dashboard]] to see the month take shape.

## Where your data lives

Everything is stored in a single SQLite file named `manmoney.db` inside the app's data directory. You can see the exact path any time from [[Settings and Data]] using the *Show Path* button. Back that file up and you've backed up everything.
