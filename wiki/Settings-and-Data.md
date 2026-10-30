# Settings and Data

The Settings page is where you arrange the sidebar, choose your currency, and get your data in and out. It's also where the app's privacy promise is spelled out.

Settings has four groups: **General**, **Sidebar**, **Data** and **About**.

## Currency

ManMoney uses **one currency** for everything: every account, transaction, budget, goal and total. Pick it under **General**. Changing it only changes the symbol; amounts aren't converted. If you change it by mistake, click **Undo** in the message that appears.

The app works offline with no exchange rates, so a single currency is what keeps totals like your net worth correct.

## Sidebar

Every sidebar section is listed in the order it appears.

- **Reorder** a section with the ↑ and ↓ arrows. **Reset** puts everything back the way it shipped.
- **Hide** a section by switching it off. It keeps all its data; switch it back on any time.

Categories and Accounts are setup pages, so the sidebar lists them apart, under **Manage**. Dashboard can be moved but not hidden, and Settings always stays at the bottom. If you hide a section while you're on it, the app takes you back to the Dashboard.

## Exporting transactions

- **CSV**: every transaction in a plain, spreadsheet-friendly file.
- **Excel**: the same transactions as an `.xlsx` workbook with named columns.

Both always contain **all** your transactions, however many you have.

## Backup and restore

**Backup** saves everything in one `.json` file: accounts, categories, transactions, budgets, goals, tuition, loans and their paybacks, and recurring entries. The file name includes the date, so you can keep dated copies.

**Restore from backup** replaces all your data with a backup file:

1. Click **Restore** and pick a ManMoney backup file.
2. ManMoney tells you what the file contains and asks you to confirm.
3. Before it changes anything, it saves your current data as `manmoney-before-restore-<date>.db` next to the database. If you restored the wrong file, you can go back to that copy (see [[Troubleshooting]]).
4. The app reloads with the restored data.

Files that aren't ManMoney backups, and backups from a newer version of the app, are refused without changing anything. Older JSON exports, which only held transactions, categories and accounts, can't be restored.

## Database

Your data is one SQLite file named `manmoney.db`. The **Show path** button reveals exactly where it lives on your device. That single file is your entire dataset: copy it somewhere safe and you have a full backup.

## Privacy and security

ManMoney is local-only by design. Your financial data is stored on your device and is never sent to any server. There's no account, no sync, and no telemetry. The app works completely offline.

## About

**About** repeats the privacy promise, shows how much you've recorded (transactions, accounts, categories and loans, counted in the database, so they're always the real totals), and the app version, like "ManMoney 1.4.0".

## Tips

- Make a **Backup** before anything risky, like a big edit session or moving to a new computer.
- To move to a new computer, make a backup on the old one and **Restore from backup** on the new one.
- CSV and Excel exports are one-way. Use them for spreadsheets, and a backup for moving your data.

Related: [[Getting Started]] · [[Troubleshooting]]
