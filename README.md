# ManMoney

A private, offline-first personal finance tracker for the desktop. Track accounts, transactions, budgets, savings goals, and recurring bills — all stored locally on your device, never sent to a server.

Built with Tauri, React, TypeScript, and Rust (SQLite for storage).

## Download and install

Go to the **[Releases page](https://github.com/sard0x72/manmoney/releases)** and download the installer for your operating system.

| Platform | File to download |
|----------|-----------------|
| Windows | `ManMoney_x.x.x_x64-setup.exe` or `_x64_en-US.msi` |
| macOS (Apple Silicon) | `ManMoney_x.x.x_aarch64.dmg` |
| macOS (Intel) | `ManMoney_x.x.x_x64.dmg` |
| Linux (Debian/Ubuntu) | `man-money_x.x.x_amd64.deb` |
| Linux (other) | `ManMoney_x.x.x_amd64.AppImage` |

Full installation instructions — including how to get past security warnings on Windows and macOS — are in the **[Getting Started](https://github.com/sard0x72/manmoney/wiki/Getting-Started)** wiki page.

## For developers

Requires Node.js 18+ and Rust (stable). On Debian/Ubuntu/Kali you'll also need the usual Tauri system libraries (`libwebkit2gtk-4.1-dev`, `build-essential`, and friends — see the [Tauri prerequisites](https://tauri.app/start/prerequisites/)).

```bash
npm install
npm run tauri dev
```

Use `npm run tauri dev` — it runs the frontend and Rust backend together as a desktop app. Running `npm run dev` alone opens only the web frontend, where the data layer doesn't exist and nothing will save.

## What's inside

- **Accounts** — cash, bank, credit, and investment, with balances driven by your transactions
- **Transactions** — income, expenses, and transfers, with search, filters, tags, and notes
- **Budgets** — monthly per-category spending limits with progress tracking
- **Analytics** — daily cash flow, 12-month trends, and category breakdowns
- **Savings Goals** — track progress toward what you're saving for
- **Recurring** — schedule repeating bills and income
- **Export** — CSV, Excel, or JSON, any time

Everything is local. No account, no sync, no telemetry.

## Documentation

Full guides for every feature live in the **[Wiki](https://github.com/sard0x72/manmoney/wiki)**:

- [Getting Started](https://github.com/sard0x72/manmoney/wiki/Getting-Started)
- [Tips and Best Practices](https://github.com/sard0x72/manmoney/wiki/Tips-and-Best-Practices)
- [Troubleshooting](https://github.com/sard0x72/manmoney/wiki/Troubleshooting)

The wiki source is also versioned in the [`wiki/`](./wiki) folder.

## License

[PolyForm Noncommercial License 1.0.0](./LICENSE). You're free to use, modify, build on, and redistribute ManMoney for any non-commercial purpose. Commercial use is not permitted.
