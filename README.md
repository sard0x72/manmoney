# ManMoney — Personal Finance Tracker

A beautiful, modern desktop application for managing your personal finances. Built with **Tauri**, **React**, **TypeScript**, and **Rust**, ManMoney provides a powerful yet intuitive interface to track transactions, budgets, savings goals, and analyze your spending patterns.

## Features

### Core Finance Management
- **Multi-Account Support** – Manage cash, bank accounts, credit cards, and more
- **Transaction Tracking** – Record income, expenses, and transfers with detailed categorization
- **Smart Categories** – Pre-configured categories with custom icons and colors for both income and expenses
- **Recurring Transactions** – Set up automatic recurring payments and income with flexible frequencies

### Analytics & Insights
- **Dashboard Overview** – Real-time view of total balance, monthly income/expenses, and net worth
- **Spending Analysis** – Visualize daily cash flow and top spending categories
- **Financial Health Score** – Get a quick assessment of your financial wellness (0-100)
- **Daily Cash Flow Charts** – Track income vs. expenses trends throughout the month

### Budget & Savings
- **Monthly Budgets** – Set category-based spending limits and monitor progress
- **Savings Goals** – Create and track progress toward financial goals with deadlines and notes
- **Budget Health Indicator** – Visual indicator showing budget usage percentage

### Additional Features
- **Advanced Search** – Filter transactions by account, category, date range, keywords, and more
- **Payment Methods** – Track payment methods (cash, card, bank transfer, etc.)
- **Tags & Notes** – Add detailed notes and custom tags to transactions
- **Payee Tracking** – Record and track merchant/payee information
- **Dark Mode** – Eye-friendly dark theme for extended use
- **CSV Export** – Export your transaction history for external analysis
- **Lightweight Database** – SQLite with local storage for privacy

## Tech Stack

### Frontend
- **React 19** – Modern UI framework with hooks
- **TypeScript** – Type-safe development
- **Tailwind CSS** – Utility-first styling
- **Recharts** – Beautiful data visualizations
- **Radix UI** – Accessible component primitives
- **React Hook Form** – Efficient form management
- **Zustand** – Lightweight state management

### Backend
- **Tauri 2** – Desktop application framework
- **Rust** – High-performance backend logic
- **SQLite** – Local database with WAL mode for reliability
- **UUID** – Unique identifier generation
- **Chrono** – Date/time handling
- **Serde** – Serialization/deserialization

### Build & Development
- **Vite** – Lightning-fast build tool
- **Tauri CLI** – Application packaging and bundling

## Getting Started

### Prerequisites
- Node.js 18+ and npm/yarn
- Rust 1.70+ ([install Rust](https://rustup.rs/))
- Tauri CLI: `npm install -g @tauri-apps/cli@latest`

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/sard0x72/manmoney.git
   cd manmoney
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Run in development mode**
   ```bash
   npm run tauri dev
   ```

   This will:
   - Build the TypeScript frontend
   - Compile the Rust backend
   - Launch the Tauri window with hot-reload

4. **Build for production**
   ```bash
   npm run build
   ```

   Output will be in `src-tauri/target/release/` with platform-specific installers.

## Project Structure

```
manmoney/
├── src/                          # React frontend
│   ├── components/
│   │   ├── layout/              # Sidebar, main layout
│   │   ├── pages/               # Dashboard, Transactions, Budgets, etc.
│   │   └── ui/                  # Reusable UI components
│   ├── store/                   # Zustand state management
│   ├── lib/                     # Utilities, API client, formatting
│   ├── types/                   # TypeScript type definitions
│   └── App.tsx
├── src-tauri/
│   ├── src/
│   │   └── lib.rs               # Rust backend with database commands
│   ├── Cargo.toml               # Rust dependencies
│   └── tauri.conf.json          # Tauri configuration
├── package.json
└── tsconfig.json
```

## Database Schema

ManMoney uses SQLite with the following main tables:

- **accounts** – User's financial accounts
- **categories** – Income/expense categories
- **transactions** – Individual transactions
- **budgets** – Monthly budget allocations
- **savings_goals** – Long-term financial goals
- **recurring_transactions** – Automated recurring payments

All data is stored locally in your user data directory (`~/.config/manmoney/` on Linux, etc.).

## Available Pages

### Dashboard
Central hub showing:
- Key financial metrics (balance, income, expenses, savings)
- Financial health score
- Daily cash flow chart
- Top spending categories
- Recent transactions
- Account overview

### Transactions
Complete transaction management:
- Add, edit, and delete transactions
- Filter and search functionality
- Support for transfers between accounts
- Bulk operations

### Budgets
Monthly budget planning:
- Set category-specific spending limits
- Track progress against budgets
- Visual budget utilization indicator

### Analytics
Detailed financial insights:
- Spending by category (pie/bar charts)
- Daily and monthly trends
- Income vs. expense analysis
- Custom date range reports

### Goals
Savings goal tracking:
- Create and edit goals
- Track progress toward targets
- Set deadlines and notes
- Visual goal completion indicators

### Recurring
Manage recurring transactions:
- View all recurring payments and income
- Set frequency and date ranges
- Mark as active/inactive
- Edit or delete recurring items

### Categories
Customize transaction categories:
- Create custom categories
- Assign colors and icons
- View default categories
- Organize income and expense categories separately

### Accounts
Manage financial accounts:
- Add multiple accounts (cash, checking, savings, credit cards, etc.)
- Track account balances
- Set account types and currencies
- Customize account colors and icons

### Settings
Application preferences:
- Theme selection (light/dark mode)
- Currency settings
- Import/export data

## Keyboard Shortcuts

- **⌘/Ctrl + /**: Add transaction
- **Navigation**: Click sidebar items to switch pages
- **Search**: Use filters on transaction pages

## Database Export

Export your financial data as CSV for backup or analysis:
- Use the export feature in Settings
- All transactions are included with full details
- Compatible with Excel, Google Sheets, and data analysis tools

## Development Guide

### Adding a New Page

1. Create a component in `src/components/pages/YourPage.tsx`
2. Add to the `PAGE_MAP` in `src/App.tsx`
3. Update the sidebar navigation in `src/components/layout/Sidebar.tsx`
4. Add corresponding Tauri commands in `src-tauri/src/lib.rs` if needed

### Adding a Tauri Command

All backend operations go through the `#[tauri::command]` macro:

```rust
#[tauri::command]
fn your_command(state: State<DbState>, param: String) -> Result<Data, String> {
    // Implementation
}
```

Then register it in the invoke handler.

### State Management

ManMoney uses Zustand for frontend state. The main store is in `src/store/useAppStore.ts` and handles:
- Current page navigation
- Theme (dark/light)
- Data fetching and caching
- UI state

## Performance Considerations

- Database uses WAL (Write-Ahead Logging) for better concurrency
- Foreign keys are enabled for referential integrity
- Indexed queries on frequently-used columns (date, account, category)
- Efficient React rendering with Zustand selectors

## Security & Privacy

- **Local Storage**: All data is stored locally on your machine—no cloud syncing
- **No Analytics**: ManMoney doesn't track or collect user data
- **Open Source**: Code is transparent and auditable

## Troubleshooting

### Database Locked Error
If you see a database locked error, ensure only one instance of ManMoney is running.

### Tauri Build Issues
```bash
# Clean and rebuild
cargo clean
npm run build
```

### Missing Dependencies
```bash
npm install
# On macOS, ensure Xcode command line tools are installed
xcode-select --install
```

## Contributing

Contributions are welcome! To contribute:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## Roadmap

Planned features:
- Cloud backup/sync
- Mobile app
- Bill reminders
- Investment tracking
- Multi-currency support
- Receipt scanning (OCR)
- Budget automation
- Financial reports (PDF export)
- Data visualization improvements

## License

This project is licensed under the MIT License. See the LICENSE file for details.

## Acknowledgments

- Built with [Tauri](https://tauri.app/) for the desktop framework
- UI components from [Radix UI](https://www.radix-ui.com/)
- Icons from [Lucide React](https://lucide.dev/)
- Charts powered by [Recharts](https://recharts.org/)

## Support

If you encounter issues or have feature requests:
- Open an [Issue](https://github.com/sard0x72/manmoney/issues)
- Check existing issues for solutions
- Provide detailed error messages and steps to reproduce

---

Make managing your money simple and enjoyable.
