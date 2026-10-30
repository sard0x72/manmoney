# Loans

The Loans page keeps track of money that moves between you and friends for a short while — you borrow some and pay it back in a few days, or you lend some and wait for it to come back.

## Adding a loan

Click *New Loan* and choose which way the money went:

- **I borrowed** — a friend gave you money and you'll pay it back.
- **I lent** — you gave a friend money and they'll pay you back.

Then fill in the friend's name, the amount, the account the money went into (or came out of), the date, and optionally a **return by** date and a note.

## Splitting a bill

When a friend pays for something of yours, or you pay for them, use **Split a bill** instead of a plain loan. It's at the top of the page and at the bottom of every friend's card. Fill in:

- **Who paid?** Your friend or you.
- **Total bill**, and **how to split** it: *All mine* (they covered you), *All theirs* (you covered them), *Half each*, or a *Custom* share.
- The **category** for your share, such as Food, and the **account**.

A box at the bottom shows what will be recorded before you save. Your share becomes an **expense**, so it counts in your [[Budgets]] and [[Analytics]]. The rest becomes a **loan** between you:

| What happened | What gets recorded | Account balance |
|---|---|---|
| Vali paid $50 for your food | $50 Food expense + you owe Vali $50 | No change: you haven't paid anything yet |
| You paid an $80 dinner, half each | $40 Food expense + Vali owes you $40 | Down $80, the whole bill you paid |
| You paid $30 for Vali's taxi | Vali owes you $30, no expense | Down $30 |

When you pay Vali back, record it with **Pay back** on the loan. Don't add another expense, or the meal would be counted twice.

On the friend's card, these loans show a receipt icon and their category, for example "Vali paid for you $50 · Food".

- **Deleting** the loan also deletes the expense it came with.
- **Editing** the amount of a bill your friend paid also changes your expense to match.
- **Deleting the expense** on the [[Transactions]] page keeps the loan, since you still owe the money, and unlinks it from the expense.

## How loans affect your balances

- **Borrowing** adds the money to the account you picked. **Lending** takes it out.
- **Paying back** or **getting paid back** moves it the other way.

Loans are **not** income or expenses — borrowing isn't earning, and lending isn't spending. So they never change your monthly income and expense totals, your [[Budgets]], or [[Analytics]]. They only move account balances, and they don't appear on the [[Transactions]] page.

## Recording a return

Click *Record payback* (when you borrowed) or *Record return* (when you lent). The amount starts filled in with what's still open, so settling in full is one click — change it for a partial return. You can pick a different account than the original one, for example if a friend lent you cash but you paid them back by card.

## Reading the page

Loans are grouped by friend. Each friend gets one card showing the **net** balance between you. If you borrowed $300 from Ali and lent Ali $400, the card says Ali **owes you $100**, and the line under the name reads "You owe $300 · they owe $400 — cancels out to $100".

Nothing is cancelled automatically. When money is open both ways, the card gets a **Can cancel out** tag; see [Cancelling out](#cancelling-out) below.

- **You owe** lists friends you owe on balance, with the total at the top.
- **Owed to you** lists friends who owe you on balance.
- **Evens out** lists friends whose open loans in each direction are the same size, so nobody owes anything overall, but the loans aren't closed yet.
- Friends with nothing open move to **Settled** at the bottom, collapsed so they stay out of the way.
- An **Overdue** tag means one of that friend's loans has passed its return-by date.

Click a friend to open every loan with them, newest first. Each loan shows what's left, its due date, a bar for how much has come back, and the paybacks or returns recorded against it. Paid-back loans are tucked behind **Show paid-back loans**. Use **New loan with …** at the bottom to add another loan with the same friend.

## Cancelling out

If you owe a friend and they owe you too, open their card and click **Cancel out**. You'll see what each of you owes and what's left afterwards, and nothing happens until you confirm.

Cancelling out records the smaller amount as paid back on **both** sides, oldest loans first. If you owe Ali $300 and Ali owes you $400, both sides get $300 marked as paid back: your loan from Ali is settled, and Ali still owes you $100.

No money actually changes hands, so **account balances don't change**. In the loan history it shows up as "Cancelled out".

To undo it, open the ⋯ menu next to any "Cancelled out" line and choose **Undo cancel-out**. It is removed from every loan it touched at once, so the two sides never get out of step. Deleting a loan that was cancelled out undoes the cancel-out too.

Friends are matched by name, ignoring capital letters and extra spaces, so "Ali" and "ali" are the same person. The name box suggests friends you've already added, which helps keep names consistent.

## Editing and deleting

Edit and delete are in the ⋯ menu at the end of each loan. For a payback or return, hover over it to see its ⋯ menu.

- **Editing** lets you change the name, amount, return-by date, and note. Changing the amount adjusts the original account by the difference. Which way the money went, the account, and the date are fixed — to change those, delete the loan and add it again.
- **Deleting a return** undoes its balance change.
- **Deleting a loan** undoes everything it did: the original amount and all its returns.

Related: [[Accounts]] · [[Dashboard]]
