# Getting Started

This page covers two paths: installing the app as a regular user, and running it from source as a developer.

## Installing the app (no coding required)

### Step 1 — Download the right file

Go to the [Releases page](https://github.com/sard0x72/manmoney/releases) and expand the **Assets** section under the latest release. Download the file that matches your computer:

| Your computer | File to download |
|---------------|-----------------|
| Windows | `ManMoney_x.x.x_x64-setup.exe` (recommended) or `_x64_en-US.msi` |
| Mac with Apple Silicon (M1/M2/M3/M4) | `ManMoney_x.x.x_aarch64.dmg` |
| Mac with Intel processor | `ManMoney_x.x.x_x64.dmg` |
| Linux — Debian, Ubuntu, Mint, and similar | `man-money_x.x.x_amd64.deb` |
| Linux — other distributions | `ManMoney_x.x.x_amd64.AppImage` |

Not sure which Mac you have? Click the Apple menu in the top-left corner and choose **About This Mac**. If it says "Apple M..." it's Apple Silicon; if it says "Intel" it's Intel.

### Step 2 — Install it

**Windows**

1. Double-click the `.exe` or `.msi` file you downloaded.
2. Windows may show a SmartScreen warning saying "Windows protected your PC." This appears because the app is not commercially code-signed.
   - Click **More info**, then click **Run anyway**.
3. Follow the installer prompts. ManMoney will appear in your Start menu when done.

**macOS**

1. Double-click the `.dmg` file. A window opens showing the ManMoney icon.
2. Drag ManMoney into the Applications folder shortcut shown in that window.
3. The first time you open ManMoney from Applications, macOS will block it with a message like *"ManMoney cannot be opened because it is from an unidentified developer."* This is because the app is not notarized through Apple. To get past it:
   - Open **System Settings** → **Privacy & Security**.
   - Scroll down until you see a message about ManMoney being blocked.
   - Click **Open Anyway**, then confirm.
   - Alternatively: right-click the app icon → **Open** → **Open** in the dialog that appears.
4. After the first launch, macOS remembers your choice and opens normally from then on.

**Linux — .deb (Debian, Ubuntu, Mint)**

Open a terminal in the folder where you downloaded the file and run:

```bash
sudo dpkg -i man-money_*.deb
```

ManMoney will appear in your application launcher. You can also double-click the `.deb` file in your file manager if your system has a graphical package installer.

**Linux — AppImage (other distributions)**

AppImages are self-contained and don't need installation. You just make the file executable and run it:

```bash
chmod +x ManMoney_*.AppImage
./ManMoney_*.AppImage
```

Or right-click the file in your file manager, go to Properties, and enable the *Allow executing file as program* option, then double-click it.

---

## What you get on first run

The app creates its database automatically the first time it starts. To save you from staring at an empty screen, it sets up some defaults:

- A starter set of **income categories** (Salary, Freelance, Business, Investment, Gift, Other Income).
- A starter set of **expense categories** (Food & Dining, Transport, Shopping, Entertainment, Rent & Housing, Utilities, Health, Education, Travel, Subscriptions, Insurance, Other Expense).
- A single **Cash** account with a zero balance.

You can rename, recolor, or add to these. The defaults themselves can't be deleted, but anything you create can be.

## Your first five minutes

1. **Set up your accounts.** Go to [[Accounts]] and add the real places your money lives — your bank account, a credit card, savings, and so on. Give each one its correct opening balance. This is the one time you type a balance in directly.
2. **Record a transaction or two.** Open [[Transactions]], click *Add Transaction*, and log something recent. Watch the account balance update.
3. **Tidy up categories.** Visit [[Categories]] and adjust the defaults to match how you actually think about your spending.
4. **Set a budget (optional).** If you want spending limits, head to [[Budgets]] and set a monthly amount for a category or two.
5. **Check the Dashboard.** Go back to [[Dashboard]] to see the month take shape.

## Where your data lives

Everything is stored in a single file named `manmoney.db` on your computer. To find the exact location, open [[Settings and Data]] and click **Show Path**. Copy that file to back everything up; put it back to restore.

---

## For developers — running from source

Requires Node.js 18+ and Rust (stable). On Debian/Ubuntu you'll also need the system libraries Tauri depends on: `libwebkit2gtk-4.1-dev`, `build-essential`, `libssl-dev`, `libayatana-appindicator3-dev`, and `librsvg2-dev`. See the [Tauri prerequisites guide](https://tauri.app/start/prerequisites/) for other platforms.

```bash
npm install
npm run tauri dev
```

`npm run tauri dev` starts the Vite frontend and the Rust backend together and opens the desktop window. The first run compiles the Rust side, so it takes a few minutes; later runs are fast.

**Do not use `npm run dev` alone.** That starts only the web frontend. Without the desktop runtime, every action that reads or writes data fails.
