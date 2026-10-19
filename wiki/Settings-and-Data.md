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

## Exporting your data

Three export options, each for a different purpose:

- **Export as CSV** — all your transactions in a plain, spreadsheet-friendly CSV file. Good for opening in any spreadsheet tool or importing elsewhere.
- **Export as Excel** — the same transactions as a proper `.xlsx` workbook, with named columns.
- **Backup as JSON** — a structured backup of your transactions, categories, and accounts together. This is the most complete snapshot for keeping a record.

Each export downloads a file stamped with the current date, so you can keep dated copies.

## Database

Your data is one SQLite file named `manmoney.db`. The **Show Path** button reveals exactly where it lives on your device. That single file is your entire dataset — copy it somewhere safe and you have a full backup; drop it back in place to restore.

## Privacy and security

ManMoney is local-only by design. Your financial data is stored on your device and is never sent to any server. There's no account, no sync, and no telemetry. The app works completely offline.

## About

The About section shows the app version and a quick tally of how much you've recorded — your transaction, account, and category counts.

## Tips

- Make a habit of a **JSON backup** before anything risky (a big edit session, moving machines). It captures the most in one file.
- For the most reliable backup, also keep a copy of the **`manmoney.db` file itself** from the path shown here. That's the true source of everything.
- Exports are one-way (out of the app). To move to a new machine, copy the database file rather than relying on re-importing an export.

Related: [[Getting Started]] · [[Troubleshooting]]
