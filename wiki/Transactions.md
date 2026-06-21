# Transactions

Transactions are the heart of the app. Every dollar that moves — earned, spent, or shifted between your own accounts — is a transaction. Recording them is what keeps your balances, budgets, and analytics accurate.

## The three types

- **Expense** — money leaving an account. Subtracts from the account balance.
- **Income** — money coming in. Adds to the account balance.
- **Transfer** — moving money between two of your own accounts. Subtracts from the source and adds to the destination. A transfer isn't income or spending, so it doesn't inflate your totals.

## Adding a transaction

Click *Add Transaction* and pick the type first, since it changes the rest of the form.

For income and expenses you'll set:

- **Amount** — must be greater than zero.
- **Date** — defaults to today.
- **Account** — which account it affects.
- **Category** — what kind of income or expense it is (the list filters to match the type).
- **Payee** — who you paid or got paid by (optional but useful).
- **Payment method** — cash, bank transfer, credit card, debit card, mobile payment, check, or other.
- **Notes** and **Tags** — optional free text. Tags are comma-separated and are searchable.

For a transfer, instead of a category you choose a **To Account**. The category is handled automatically.

## Finding transactions

The Transactions page has a filter bar:

- **Search** matches across notes, payee, tags, and category name.
- **Type** narrows to income, expense, or transfer.
- **Account** and **Category** filters narrow to one of each.
- **Clear** resets everything.

Search and filters update the list as you type, with a short delay so it stays responsive.

## Editing and deleting

Hover over a row to reveal the edit and delete buttons.

- **Editing** a transaction reverses its previous effect on balances and applies the new values, so your accounts stay correct no matter how much you change.
- **Deleting** a transaction reverses its balance effect and removes it. The confirmation dialog reminds you that the account balance will change back.

## Tips

- Record transactions soon after they happen. The habit is what makes the rest of the app trustworthy.
- Use the **payee** field consistently (same spelling each time) so search and history stay clean.
- Lean on **tags** for cross-category grouping — for example tag every work-trip expense with `business-trip` regardless of whether it was Transport, Food, or Travel, then search the tag later.
- Use **transfers** rather than an expense-plus-income pair when moving your own money, so your income and expense totals don't get distorted.

Related: [[Accounts]] · [[Categories]] · [[Budgets]] · [[Analytics]]
