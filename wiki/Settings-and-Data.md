# Settings and Data

The Settings page is where you arrange the sidebar, choose your currency, and get your data in and out. It's also where the app's privacy promise is spelled out.

## Sidebar menu

Every sidebar section is listed at the top of Settings, in the order it appears in the sidebar.

- **Reorder** a section with the ↑ and ↓ arrows next to it. The sidebar updates immediately. *Reset order* puts everything back the way it shipped.
- **Hide** a section by switching it off. It disappears from the sidebar but keeps all its data; switch it back on any time.

Dashboard can be moved but not hidden, and Settings always stays at the bottom of the sidebar. If you hide a section while you're on it, the app takes you back to the Dashboard.

## Currency

ManMoney uses **one currency** for everything — every account, transaction, budget, goal, and total. Pick it here. Changing it relabels all amounts; it doesn't convert them.

The app works offline with no exchange rates, so a single currency is what keeps totals like your net worth correct: every number being added up is in the same unit.

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

The About section shows how much you've recorded: your transaction, account, category and loan counts. They're counted in the database, so they're always the real totals.

## Tips

- Make a **Backup** before anything risky, like a big edit session or moving to a new computer.
- To move to a new computer, make a backup on the old one and **Restore from backup** on the new one.
- CSV and Excel exports are one-way. Use them for spreadsheets, and a backup for moving your data.

Related: [[Getting Started]] · [[Troubleshooting]]
