# Loans

The Loans page keeps track of money between you and friends: cash you borrow or lend for a while, and bills one of you paid for the other.

## Adding

Click **Add** at the top of the page, or **Add** at the bottom of a friend's card to start with that friend filled in. The Dashboard's **Friend** button opens the same form. Fill in:

1. **Friend**: the name. It suggests friends you've already added.
2. **Who paid?** **<Name> paid** or **I paid**.
3. **For what?** **Cash** for a plain loan, or a category such as Food for a bill. The six categories you use most are shown; **More…** has the rest.
4. **Amount** for cash, or **Total bill** for a bill.
5. For a bill, the **Split**: **All mine** (they covered you), **All theirs** (you covered them), **Half**, or **Custom** with your share.
6. The **account** the money went into or came out of.
7. **More options**: the date, a **Return by** date, and a note.

Before you save, a line of tags shows what will be recorded, for example `Food $25 · Vali owes you $25 · Cash −$50`.

| What happened | Choose | What gets recorded | Account balance |
|---|---|---|---|
| Vali gave you $100 | Vali paid · Cash | You owe Vali $100 | Up $100 |
| You lent Vali $100 | I paid · Cash | Vali owes you $100 | Down $100 |
| Vali paid $50 for your food | Vali paid · Food · All mine | $50 Food expense + you owe Vali $50 | No change yet |
| You paid an $80 dinner, half each | I paid · Food · Half | $40 Food expense + Vali owes you $40 | Down $80 |

Cash loans are **not** income or spending; they only move account balances. For a bill, your share is an **expense**, so it counts in your [[Budgets]] and [[Analytics]], and appears on [[Transactions]] tagged "Split with Vali".

## Reading the page

At the top: what friends **owe you** and what **you owe**. Below, one card per friend, in sections:

- **Owe you**: friends who owe you, on balance.
- **You owe**: friends you owe.
- **Even**: open both ways for the same amount, so nobody owes anything overall yet.
- **Settled**: friends with nothing open, folded away.

A card shows how many loans are open, how many are overdue, and the net amount: **+$100** means they owe you, **−$50** means you owe them.

Click a card to see each loan: what it was, its date and account, what's left, and its paybacks underneath. Settled loans are behind **Show settled**.

## Paying back

Click **Pay back** (you owe) or **Got paid back** (they owe) on a loan. The amount starts at what's left, so settling in full is one click. You can choose a different account than the original one.

## Settle both ways

If you owe a friend and they owe you too, their card shows **Settle $300 both ways**. It closes the smaller amount on both sides, oldest loans first. If you owe Ali $300 and Ali owes you $400, your loan is settled and Ali still owes you $100. No money moves, so account balances don't change.

To undo it, open the ⋯ menu on a "Settled both ways" line and choose **Undo settle**.

## Editing and deleting

The ⋯ menu on each loan has **Edit** and **Delete**; each payback has **Delete**.

- **Editing** changes the name, amount, return-by date and note. Changing the amount adjusts the original account by the difference. For a bill a friend paid, it also changes your expense to match. Which way the money went, the account and the date are fixed; to change those, delete the loan and add it again.
- **Deleting a payback** undoes its balance change. You can **Undo** it for 6 seconds.
- **Deleting a loan** undoes everything it did. A plain loan can be brought back with **Undo**. If it has paybacks, was settled both ways, or came from a bill, ManMoney asks first and lists what goes with it, including the bill's expense.
- **Deleting a bill's expense** on [[Transactions]] keeps the loan, since the money is still owed.

Friends are matched by name, ignoring capital letters and extra spaces, so "Ali" and "ali" are the same person.

Related: [[Accounts]] · [[Dashboard]]
