# Troubleshooting

Common issues and how to fix them.

## Windows says "Windows protected your PC" when I run the installer

This is Windows SmartScreen. It appears because ManMoney is not commercially code-signed, not because anything is wrong with the file.

**Fix:** Click **More info** in the warning dialog, then click **Run anyway**. The installer will proceed normally.

## macOS says the app is from an unidentified developer / can't be opened

macOS Gatekeeper blocks apps that haven't been notarized through Apple's paid developer program. ManMoney is safe — it just doesn't have that certificate.

**Fix (easiest):** Right-click the ManMoney icon in Applications → **Open** → click **Open** in the dialog that appears.

**Fix (alternative):** Open **System Settings** → **Privacy & Security**, scroll down to the message about ManMoney being blocked, and click **Open Anyway**.

You only need to do this once. After the first launch, macOS opens the app normally.

## macOS says the app is "damaged and can't be opened"

This can happen if macOS quarantined the file during download. Open Terminal and run:

```bash
xattr -cr /Applications/ManMoney.app
```

Then try opening the app again.

## The app shows "Desktop App Required" / nothing loads

**Cause:** You launched only the web frontend (for example with `npm run dev`), so the desktop data layer isn't running. None of the data features work in that mode.

**Fix:** Close it and start the app the right way:

```bash
npm run tauri dev
```

This runs the frontend and the backend together as a desktop window. Always use this command. See [[Getting Started]].

## Creating or saving anything fails with an argument error

If you ever see an error mentioning a missing key like `accountType` or `categoryId`, it means the frontend and backend disagree on argument names. The app sends camelCase argument names (`accountType`, `categoryId`, `paymentMethod`) which the backend maps to its snake_case fields. If you've modified the code, make sure any new commands keep that convention. A clean checkout shouldn't hit this.

## A balance looks wrong

Balances are calculated entirely from transactions, so the fix is always in the transaction history, not the account:

- Check for a **miscategorized or wrong-type** transaction (an expense entered as income, or vice versa).
- Check for a **transfer entered as two separate transactions**, which double-counts.
- Make sure no transaction is **missing or duplicated**.

Edit the offending transaction — the app reverses its old effect and applies the corrected one. See [[Transactions]].

## A category won't delete

You can only delete **custom** categories that have **no transactions**. Default categories can't be deleted at all. If a custom category has transactions, reassign those transactions to another category first, then delete it. See [[Categories]].

## The first run is slow

The first `npm run tauri dev` compiles the Rust backend, which takes a while. This is normal and only happens once (and again after backend code changes). Subsequent launches are fast.

## I can't find my data / I want to back it up

Your entire dataset is the `manmoney.db` SQLite file. Open [[Settings and Data]] and click **Show Path** to see exactly where it is. Copy that file to back up; restore by putting it back. You can also export CSV, Excel, or JSON from the same page.

## Build prerequisites are missing

If `npm run tauri dev` fails before the window opens, you're likely missing a system library Tauri needs. Install your platform's WebKitGTK and build dependencies (on Debian-based systems, packages like `libwebkit2gtk-4.1-dev` and `build-essential`), then try again. See [[Getting Started]] for the list.

Still stuck? Open an issue on the project's GitHub repository with what you did and the exact error text.
