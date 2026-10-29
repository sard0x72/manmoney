use rusqlite::{Connection, params};
use serde::{Deserialize, Serialize};
use std::sync::Mutex;
use tauri::{Manager, State};
use uuid::Uuid;
use chrono::Utc;

// ─── State ───────────────────────────────────────────────────────────────────

pub struct DbState(pub Mutex<Connection>);

// ─── Models ──────────────────────────────────────────────────────────────────

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct Account {
    pub id: String,
    pub name: String,
    pub account_type: String,
    pub balance: f64,
    pub currency: String,
    pub color: String,
    pub icon: String,
    pub created_at: String,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct Category {
    pub id: String,
    pub name: String,
    pub category_type: String,
    pub color: String,
    pub icon: String,
    pub is_default: bool,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct Transaction {
    pub id: String,
    pub account_id: String,
    pub category_id: String,
    pub transaction_type: String,
    pub amount: f64,
    pub date: String,
    pub notes: String,
    pub payee: String,
    pub payment_method: String,
    pub tags: String,
    pub is_recurring: bool,
    pub recurring_id: Option<String>,
    pub created_at: String,
    pub updated_at: String,
    pub category_name: Option<String>,
    pub category_color: Option<String>,
    pub category_icon: Option<String>,
    pub account_name: Option<String>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct Budget {
    pub id: String,
    pub category_id: String,
    pub amount: f64,
    pub period: String,
    pub year: i32,
    pub month: i32,
    pub spent: Option<f64>,
    pub category_name: Option<String>,
    pub category_color: Option<String>,
    pub category_icon: Option<String>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct SavingsGoal {
    pub id: String,
    pub name: String,
    pub target_amount: f64,
    pub current_amount: f64,
    pub deadline: Option<String>,
    pub color: String,
    pub icon: String,
    pub notes: String,
    pub created_at: String,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct TuitionFee {
    pub id: String,
    pub name: String,
    pub total_amount: f64,
    pub paid: f64,
    pub due_date: Option<String>,
    pub notes: String,
    pub created_at: String,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct TuitionPayment {
    pub id: String,
    pub amount: f64,
    pub date: String,
    pub notes: String,
    pub account_name: Option<String>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct Loan {
    pub id: String,
    pub person: String,
    pub direction: String, // "lent" (I gave money) or "borrowed" (I took money)
    pub amount: f64,
    pub returned: f64,
    pub account_id: String,
    pub account_name: Option<String>,
    pub date: String,
    pub due_date: Option<String>,
    pub notes: String,
    pub created_at: String,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct LoanRepayment {
    pub id: String,
    pub loan_id: String,
    pub amount: f64,
    pub date: String,
    pub notes: String,
    pub account_name: Option<String>,
    pub offset_id: Option<String>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct RecurringTransaction {
    pub id: String,
    pub account_id: String,
    pub category_id: String,
    pub transaction_type: String,
    pub amount: f64,
    pub payee: String,
    pub notes: String,
    pub payment_method: String,
    pub frequency: String,
    pub start_date: String,
    pub next_date: String,
    pub end_date: Option<String>,
    pub is_active: bool,
    pub category_name: Option<String>,
    pub account_name: Option<String>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct DashboardData {
    pub total_balance: f64,
    pub month_income: f64,
    pub month_expenses: f64,
    pub month_budget_total: f64,
    pub month_budget_spent: f64,
    pub net_worth: f64,
    pub accounts: Vec<Account>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct SpendingByCategory {
    pub category_id: String,
    pub category_name: String,
    pub category_color: String,
    pub category_icon: String,
    pub amount: f64,
    pub count: i64,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct DailySpending {
    pub date: String,
    pub income: f64,
    pub expenses: f64,
}

// ─── Database Setup ───────────────────────────────────────────────────────────

fn setup_database(conn: &Connection) -> rusqlite::Result<()> {
    conn.execute_batch("PRAGMA journal_mode=WAL; PRAGMA foreign_keys=ON;")?;

    conn.execute_batch(r#"
        CREATE TABLE IF NOT EXISTS accounts (
            id TEXT PRIMARY KEY,
            name TEXT NOT NULL,
            account_type TEXT NOT NULL DEFAULT 'cash',
            balance REAL NOT NULL DEFAULT 0.0,
            currency TEXT NOT NULL DEFAULT 'USD',
            color TEXT NOT NULL DEFAULT '#6174f5',
            icon TEXT NOT NULL DEFAULT 'wallet',
            created_at TEXT NOT NULL
        );
        CREATE TABLE IF NOT EXISTS categories (
            id TEXT PRIMARY KEY,
            name TEXT NOT NULL,
            category_type TEXT NOT NULL,
            color TEXT NOT NULL DEFAULT '#6174f5',
            icon TEXT NOT NULL DEFAULT 'tag',
            is_default INTEGER NOT NULL DEFAULT 0
        );
        CREATE TABLE IF NOT EXISTS transactions (
            id TEXT PRIMARY KEY,
            account_id TEXT NOT NULL REFERENCES accounts(id),
            category_id TEXT NOT NULL REFERENCES categories(id),
            transaction_type TEXT NOT NULL,
            amount REAL NOT NULL,
            date TEXT NOT NULL,
            notes TEXT NOT NULL DEFAULT '',
            payee TEXT NOT NULL DEFAULT '',
            payment_method TEXT NOT NULL DEFAULT 'cash',
            tags TEXT NOT NULL DEFAULT '',
            is_recurring INTEGER NOT NULL DEFAULT 0,
            recurring_id TEXT,
            transfer_account_id TEXT REFERENCES accounts(id),
            created_at TEXT NOT NULL,
            updated_at TEXT NOT NULL
        );
        CREATE TABLE IF NOT EXISTS budgets (
            id TEXT PRIMARY KEY,
            category_id TEXT NOT NULL REFERENCES categories(id),
            amount REAL NOT NULL,
            period TEXT NOT NULL DEFAULT 'monthly',
            year INTEGER NOT NULL,
            month INTEGER NOT NULL,
            UNIQUE(category_id, year, month)
        );
        CREATE TABLE IF NOT EXISTS savings_goals (
            id TEXT PRIMARY KEY,
            name TEXT NOT NULL,
            target_amount REAL NOT NULL,
            current_amount REAL NOT NULL DEFAULT 0.0,
            deadline TEXT,
            color TEXT NOT NULL DEFAULT '#6174f5',
            icon TEXT NOT NULL DEFAULT 'target',
            notes TEXT NOT NULL DEFAULT '',
            created_at TEXT NOT NULL
        );
        CREATE TABLE IF NOT EXISTS tuition_fees (
            id TEXT PRIMARY KEY,
            name TEXT NOT NULL,
            total_amount REAL NOT NULL,
            due_date TEXT,
            notes TEXT NOT NULL DEFAULT '',
            created_at TEXT NOT NULL
        );
        CREATE TABLE IF NOT EXISTS loans (
            id TEXT PRIMARY KEY,
            person TEXT NOT NULL,
            direction TEXT NOT NULL,
            amount REAL NOT NULL,
            account_id TEXT NOT NULL REFERENCES accounts(id),
            date TEXT NOT NULL,
            due_date TEXT,
            notes TEXT NOT NULL DEFAULT '',
            created_at TEXT NOT NULL
        );
        CREATE TABLE IF NOT EXISTS loan_repayments (
            id TEXT PRIMARY KEY,
            loan_id TEXT NOT NULL REFERENCES loans(id),
            amount REAL NOT NULL,
            account_id TEXT NOT NULL REFERENCES accounts(id),
            date TEXT NOT NULL,
            notes TEXT NOT NULL DEFAULT '',
            created_at TEXT NOT NULL
        );
        CREATE TABLE IF NOT EXISTS recurring_transactions (
            id TEXT PRIMARY KEY,
            account_id TEXT NOT NULL REFERENCES accounts(id),
            category_id TEXT NOT NULL REFERENCES categories(id),
            transaction_type TEXT NOT NULL,
            amount REAL NOT NULL,
            payee TEXT NOT NULL DEFAULT '',
            notes TEXT NOT NULL DEFAULT '',
            payment_method TEXT NOT NULL DEFAULT 'cash',
            frequency TEXT NOT NULL,
            start_date TEXT NOT NULL,
            next_date TEXT NOT NULL,
            end_date TEXT,
            is_active INTEGER NOT NULL DEFAULT 1
        );
        CREATE INDEX IF NOT EXISTS idx_tx_date ON transactions(date);
        CREATE INDEX IF NOT EXISTS idx_tx_account ON transactions(account_id);
        CREATE INDEX IF NOT EXISTS idx_tx_category ON transactions(category_id);
    "#)?;

    // Tuition payments are ordinary expense transactions linked to a fee.
    let has_tuition_col = conn
        .prepare("SELECT 1 FROM pragma_table_info('transactions') WHERE name='tuition_id'")?
        .exists([])?;
    if !has_tuition_col {
        conn.execute_batch("ALTER TABLE transactions ADD COLUMN tuition_id TEXT REFERENCES tuition_fees(id)")?;
    }

    // Repayments that share an offset_id cancel loans against each other: no money moves.
    let has_offset_col = conn
        .prepare("SELECT 1 FROM pragma_table_info('loan_repayments') WHERE name='offset_id'")?
        .exists([])?;
    if !has_offset_col {
        conn.execute_batch("ALTER TABLE loan_repayments ADD COLUMN offset_id TEXT")?;
    }

    seed_defaults(conn)?;
    migrate_transfers(conn)?;
    Ok(())
}

/// Transfers were removed as a transaction type. Each legacy transfer becomes an
/// expense on the source account plus a matching income on the destination, so
/// balances stay correct if either half is later edited or deleted.
fn migrate_transfers(conn: &Connection) -> rusqlite::Result<()> {
    let count: i64 = conn.query_row(
        "SELECT COUNT(*) FROM transactions WHERE transaction_type='transfer'", [], |r| r.get(0))?;
    if count == 0 { return Ok(()); }

    let category_for = |kind: &str, preferred: &str| -> rusqlite::Result<String> {
        conn.query_row(
            "SELECT id FROM categories WHERE category_type=?1 ORDER BY (name=?2) DESC, is_default DESC, name LIMIT 1",
            params![kind, preferred], |r| r.get(0))
    };
    let expense_cat = category_for("expense", "Other Expense")?;
    let income_cat = category_for("income", "Other Income")?;

    let tx = conn.unchecked_transaction()?;
    let legacy: Vec<(String, f64, String, String, String, String, String, Option<String>, String)> = {
        let mut stmt = tx.prepare(
            "SELECT id,amount,date,notes,payee,payment_method,tags,transfer_account_id,created_at FROM transactions WHERE transaction_type='transfer'")?;
        let rows = stmt.query_map([], |r| Ok((r.get(0)?, r.get(1)?, r.get(2)?, r.get(3)?, r.get(4)?,
            r.get(5)?, r.get(6)?, r.get(7)?, r.get(8)?)))?
            .collect::<rusqlite::Result<Vec<_>>>()?;
        rows
    };
    let now = Utc::now().to_rfc3339();
    for (id, amount, date, notes, payee, method, tags, to_id, created_at) in legacy {
        tx.execute(
            "UPDATE transactions SET transaction_type='expense',category_id=?1,transfer_account_id=NULL,updated_at=?2 WHERE id=?3",
            params![expense_cat, now, id])?;
        if let Some(to_id) = to_id {
            tx.execute(
                "INSERT INTO transactions(id,account_id,category_id,transaction_type,amount,date,notes,payee,payment_method,tags,is_recurring,created_at,updated_at) VALUES(?1,?2,?3,'income',?4,?5,?6,?7,?8,?9,0,?10,?11)",
                params![Uuid::new_v4().to_string(), to_id, income_cat, amount, date, notes, payee, method, tags, created_at, now])?;
        }
    }
    tx.commit()
}

fn seed_defaults(conn: &Connection) -> rusqlite::Result<()> {
    let count: i64 = conn.query_row("SELECT COUNT(*) FROM categories", [], |r| r.get(0))?;
    if count > 0 { return Ok(()); }

    let income_cats = [
        ("Salary", "#22c55e", "briefcase"),
        ("Freelance", "#16a34a", "laptop"),
        ("Business", "#15803d", "store"),
        ("Investment", "#166534", "trending-up"),
        ("Gift", "#86efac", "gift"),
        ("Other Income", "#4ade80", "plus-circle"),
    ];
    let expense_cats = [
        ("Food & Dining", "#ef4444", "utensils"),
        ("Transport", "#f97316", "car"),
        ("Shopping", "#eab308", "shopping-bag"),
        ("Entertainment", "#a855f7", "tv"),
        ("Rent & Housing", "#6366f1", "home"),
        ("Utilities", "#3b82f6", "zap"),
        ("Health", "#ec4899", "heart"),
        ("Education", "#14b8a6", "graduation-cap"),
        ("Travel", "#06b6d4", "plane"),
        ("Subscriptions", "#8b5cf6", "refresh-cw"),
        ("Insurance", "#64748b", "shield"),
        ("Other Expense", "#9ca3af", "minus-circle"),
    ];

    for (name, color, icon) in &income_cats {
        let id = Uuid::new_v4().to_string();
        conn.execute(
            "INSERT INTO categories (id,name,category_type,color,icon,is_default) VALUES(?1,?2,'income',?3,?4,1)",
            params![id, name, color, icon],
        )?;
    }
    for (name, color, icon) in &expense_cats {
        let id = Uuid::new_v4().to_string();
        conn.execute(
            "INSERT INTO categories (id,name,category_type,color,icon,is_default) VALUES(?1,?2,'expense',?3,?4,1)",
            params![id, name, color, icon],
        )?;
    }

    let acct_id = Uuid::new_v4().to_string();
    let now = Utc::now().to_rfc3339();
    conn.execute(
        "INSERT INTO accounts(id,name,account_type,balance,currency,color,icon,created_at) VALUES(?1,'Cash','cash',0.0,'USD','#22c55e','wallet',?2)",
        params![acct_id, now],
    )?;
    Ok(())
}

// ─── Accounts ─────────────────────────────────────────────────────────────────

#[tauri::command]
fn get_accounts(state: State<DbState>) -> Result<Vec<Account>, String> {
    let conn = state.0.lock().map_err(|e| e.to_string())?;
    let mut stmt = conn.prepare(
        "SELECT id,name,account_type,balance,currency,color,icon,created_at FROM accounts ORDER BY name"
    ).map_err(|e| e.to_string())?;
    let result = stmt.query_map([], |r| Ok(Account {
        id: r.get(0)?, name: r.get(1)?, account_type: r.get(2)?,
        balance: r.get(3)?, currency: r.get(4)?, color: r.get(5)?,
        icon: r.get(6)?, created_at: r.get(7)?,
    })).map_err(|e| e.to_string())?
    .collect::<Result<Vec<_>, _>>().map_err(|e| e.to_string())?;
    Ok(result)
}

#[tauri::command]
fn create_account(state: State<DbState>, name: String, account_type: String, balance: f64, currency: String, color: String, icon: String) -> Result<Account, String> {
    let conn = state.0.lock().map_err(|e| e.to_string())?;
    let id = Uuid::new_v4().to_string();
    let now = Utc::now().to_rfc3339();
    conn.execute(
        "INSERT INTO accounts(id,name,account_type,balance,currency,color,icon,created_at) VALUES(?1,?2,?3,?4,?5,?6,?7,?8)",
        params![id, name, account_type, balance, currency, color, icon, now],
    ).map_err(|e| e.to_string())?;
    Ok(Account { id, name, account_type, balance, currency, color, icon, created_at: now })
}

#[tauri::command]
fn update_account(state: State<DbState>, id: String, name: String, account_type: String, currency: String, color: String, icon: String) -> Result<(), String> {
    let conn = state.0.lock().map_err(|e| e.to_string())?;
    conn.execute("UPDATE accounts SET name=?1,account_type=?2,currency=?3,color=?4,icon=?5 WHERE id=?6",
        params![name, account_type, currency, color, icon, id]).map_err(|e| e.to_string())?;
    Ok(())
}

/// The app uses a single currency, so changing it in Settings applies to every account.
#[tauri::command]
fn set_accounts_currency(state: State<DbState>, currency: String) -> Result<(), String> {
    let conn = state.0.lock().map_err(|e| e.to_string())?;
    conn.execute("UPDATE accounts SET currency=?1", params![currency]).map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
fn delete_account(state: State<DbState>, id: String) -> Result<(), String> {
    let conn = state.0.lock().map_err(|e| e.to_string())?;
    conn.execute("DELETE FROM accounts WHERE id=?1", params![id]).map_err(|e| e.to_string())?;
    Ok(())
}

// ─── Categories ───────────────────────────────────────────────────────────────

#[tauri::command]
fn get_categories(state: State<DbState>) -> Result<Vec<Category>, String> {
    let conn = state.0.lock().map_err(|e| e.to_string())?;
    let mut stmt = conn.prepare(
        "SELECT id,name,category_type,color,icon,is_default FROM categories ORDER BY category_type,name"
    ).map_err(|e| e.to_string())?;
    let result = stmt.query_map([], |r| Ok(Category {
        id: r.get(0)?, name: r.get(1)?, category_type: r.get(2)?,
        color: r.get(3)?, icon: r.get(4)?, is_default: r.get::<_, i32>(5)? != 0,
    })).map_err(|e| e.to_string())?
    .collect::<Result<Vec<_>, _>>().map_err(|e| e.to_string())?;
    Ok(result)
}

#[tauri::command]
fn create_category(state: State<DbState>, name: String, category_type: String, color: String, icon: String) -> Result<Category, String> {
    let conn = state.0.lock().map_err(|e| e.to_string())?;
    let id = Uuid::new_v4().to_string();
    conn.execute("INSERT INTO categories(id,name,category_type,color,icon,is_default) VALUES(?1,?2,?3,?4,?5,0)",
        params![id, name, category_type, color, icon]).map_err(|e| e.to_string())?;
    Ok(Category { id, name, category_type, color, icon, is_default: false })
}

#[tauri::command]
fn update_category(state: State<DbState>, id: String, name: String, color: String, icon: String) -> Result<(), String> {
    let conn = state.0.lock().map_err(|e| e.to_string())?;
    conn.execute("UPDATE categories SET name=?1,color=?2,icon=?3 WHERE id=?4",
        params![name, color, icon, id]).map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
fn delete_category(state: State<DbState>, id: String) -> Result<(), String> {
    let conn = state.0.lock().map_err(|e| e.to_string())?;
    let count: i64 = conn.query_row("SELECT COUNT(*) FROM transactions WHERE category_id=?1",
        params![id], |r| r.get(0)).map_err(|e| e.to_string())?;
    if count > 0 { return Err("Cannot delete category that has transactions".to_string()); }
    conn.execute("DELETE FROM categories WHERE id=?1 AND is_default=0", params![id]).map_err(|e| e.to_string())?;
    Ok(())
}

// ─── Transactions ─────────────────────────────────────────────────────────────

#[tauri::command]
fn get_transactions(
    state: State<DbState>,
    limit: Option<i64>,
    offset: Option<i64>,
    account_id: Option<String>,
    category_id: Option<String>,
    transaction_type: Option<String>,
    search: Option<String>,
    date_from: Option<String>,
    date_to: Option<String>,
) -> Result<Vec<Transaction>, String> {
    let conn = state.0.lock().map_err(|e| e.to_string())?;

    let mut sql = r#"
        SELECT t.id,t.account_id,t.category_id,t.transaction_type,t.amount,
               t.date,t.notes,t.payee,t.payment_method,t.tags,
               t.is_recurring,t.recurring_id,
               t.created_at,t.updated_at,
               c.name,c.color,c.icon,a.name
        FROM transactions t
        LEFT JOIN categories c ON t.category_id=c.id
        LEFT JOIN accounts a ON t.account_id=a.id
        WHERE 1=1
    "#.to_string();

    let mut params_vec: Vec<Box<dyn rusqlite::ToSql>> = vec![];

    if let Some(ref v) = account_id { sql.push_str(&format!(" AND t.account_id=?{}", params_vec.len()+1)); params_vec.push(Box::new(v.clone())); }
    if let Some(ref v) = category_id { sql.push_str(&format!(" AND t.category_id=?{}", params_vec.len()+1)); params_vec.push(Box::new(v.clone())); }
    if let Some(ref v) = transaction_type { sql.push_str(&format!(" AND t.transaction_type=?{}", params_vec.len()+1)); params_vec.push(Box::new(v.clone())); }
    if let Some(ref v) = search {
        let like = format!("%{}%", v);
        sql.push_str(&format!(" AND (t.notes LIKE ?{} OR t.payee LIKE ?{} OR t.tags LIKE ?{} OR c.name LIKE ?{})", params_vec.len()+1, params_vec.len()+2, params_vec.len()+3, params_vec.len()+4));
        params_vec.push(Box::new(like.clone())); params_vec.push(Box::new(like.clone())); params_vec.push(Box::new(like.clone())); params_vec.push(Box::new(like.clone()));
    }
    if let Some(ref v) = date_from { sql.push_str(&format!(" AND t.date>=?{}", params_vec.len()+1)); params_vec.push(Box::new(v.clone())); }
    if let Some(ref v) = date_to { sql.push_str(&format!(" AND t.date<=?{}", params_vec.len()+1)); params_vec.push(Box::new(v.clone())); }

    sql.push_str(" ORDER BY t.date DESC,t.created_at DESC");
    if let Some(l) = limit { sql.push_str(&format!(" LIMIT {}", l)); }
    if let Some(o) = offset { sql.push_str(&format!(" OFFSET {}", o)); }

    let mut stmt = conn.prepare(&sql).map_err(|e| e.to_string())?;
    let refs: Vec<&dyn rusqlite::ToSql> = params_vec.iter().map(|p| p.as_ref()).collect();

    let result = stmt.query_map(refs.as_slice(), |r| Ok(Transaction {
        id: r.get(0)?, account_id: r.get(1)?, category_id: r.get(2)?,
        transaction_type: r.get(3)?, amount: r.get(4)?, date: r.get(5)?,
        notes: r.get(6)?, payee: r.get(7)?, payment_method: r.get(8)?, tags: r.get(9)?,
        is_recurring: r.get::<_, i32>(10)? != 0, recurring_id: r.get(11)?,
        created_at: r.get(12)?, updated_at: r.get(13)?,
        category_name: r.get(14)?, category_color: r.get(15)?, category_icon: r.get(16)?,
        account_name: r.get(17)?,
    })).map_err(|e| e.to_string())?
    .collect::<Result<Vec<_>, _>>().map_err(|e| e.to_string())?;
    Ok(result)
}

#[tauri::command]
fn create_transaction(
    state: State<DbState>,
    account_id: String, category_id: String, transaction_type: String, amount: f64,
    date: String, notes: String, payee: String, payment_method: String, tags: String,
) -> Result<Transaction, String> {
    let conn = state.0.lock().map_err(|e| e.to_string())?;
    let id = Uuid::new_v4().to_string();
    let now = Utc::now().to_rfc3339();

    conn.execute(
        "INSERT INTO transactions(id,account_id,category_id,transaction_type,amount,date,notes,payee,payment_method,tags,is_recurring,created_at,updated_at) VALUES(?1,?2,?3,?4,?5,?6,?7,?8,?9,?10,0,?11,?11)",
        params![id, account_id, category_id, transaction_type, amount, date, notes, payee, payment_method, tags, now],
    ).map_err(|e| e.to_string())?;

    match transaction_type.as_str() {
        "income" => { conn.execute("UPDATE accounts SET balance=balance+?1 WHERE id=?2", params![amount, account_id]).map_err(|e| e.to_string())?; }
        "expense" => { conn.execute("UPDATE accounts SET balance=balance-?1 WHERE id=?2", params![amount, account_id]).map_err(|e| e.to_string())?; }
        _ => {}
    }

    let (cat_name, cat_color, cat_icon): (String, String, String) = conn.query_row(
        "SELECT name,color,icon FROM categories WHERE id=?1", params![category_id],
        |r| Ok((r.get(0)?, r.get(1)?, r.get(2)?))
    ).map_err(|e| e.to_string())?;
    let acct_name: String = conn.query_row("SELECT name FROM accounts WHERE id=?1",
        params![account_id], |r| r.get(0)).map_err(|e| e.to_string())?;

    Ok(Transaction {
        id, account_id, category_id, transaction_type, amount, date, notes, payee,
        payment_method, tags, is_recurring: false, recurring_id: None,
        created_at: now.clone(), updated_at: now,
        category_name: Some(cat_name), category_color: Some(cat_color),
        category_icon: Some(cat_icon), account_name: Some(acct_name),
    })
}

#[tauri::command]
fn update_transaction(
    state: State<DbState>,
    id: String, account_id: String, category_id: String, transaction_type: String, amount: f64,
    date: String, notes: String, payee: String, payment_method: String, tags: String,
) -> Result<(), String> {
    let conn = state.0.lock().map_err(|e| e.to_string())?;
    let now = Utc::now().to_rfc3339();

    let (old_type, old_amount, old_acct): (String, f64, String) = conn.query_row(
        "SELECT transaction_type,amount,account_id FROM transactions WHERE id=?1",
        params![id], |r| Ok((r.get(0)?, r.get(1)?, r.get(2)?))
    ).map_err(|e| e.to_string())?;

    match old_type.as_str() {
        "income" => { conn.execute("UPDATE accounts SET balance=balance-?1 WHERE id=?2", params![old_amount, old_acct]).map_err(|e| e.to_string())?; }
        "expense" => { conn.execute("UPDATE accounts SET balance=balance+?1 WHERE id=?2", params![old_amount, old_acct]).map_err(|e| e.to_string())?; }
        _ => {}
    }
    match transaction_type.as_str() {
        "income" => { conn.execute("UPDATE accounts SET balance=balance+?1 WHERE id=?2", params![amount, account_id]).map_err(|e| e.to_string())?; }
        "expense" => { conn.execute("UPDATE accounts SET balance=balance-?1 WHERE id=?2", params![amount, account_id]).map_err(|e| e.to_string())?; }
        _ => {}
    }
    conn.execute(
        "UPDATE transactions SET account_id=?1,category_id=?2,transaction_type=?3,amount=?4,date=?5,notes=?6,payee=?7,payment_method=?8,tags=?9,updated_at=?10 WHERE id=?11",
        params![account_id, category_id, transaction_type, amount, date, notes, payee, payment_method, tags, now, id],
    ).map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
fn delete_transaction(state: State<DbState>, id: String) -> Result<(), String> {
    let conn = state.0.lock().map_err(|e| e.to_string())?;
    let (old_type, old_amount, old_acct): (String, f64, String) = conn.query_row(
        "SELECT transaction_type,amount,account_id FROM transactions WHERE id=?1",
        params![id], |r| Ok((r.get(0)?, r.get(1)?, r.get(2)?))
    ).map_err(|e| e.to_string())?;

    match old_type.as_str() {
        "income" => { conn.execute("UPDATE accounts SET balance=balance-?1 WHERE id=?2", params![old_amount, old_acct]).map_err(|e| e.to_string())?; }
        "expense" => { conn.execute("UPDATE accounts SET balance=balance+?1 WHERE id=?2", params![old_amount, old_acct]).map_err(|e| e.to_string())?; }
        _ => {}
    }
    conn.execute("DELETE FROM transactions WHERE id=?1", params![id]).map_err(|e| e.to_string())?;
    Ok(())
}

// ─── Budgets ──────────────────────────────────────────────────────────────────

#[tauri::command]
fn get_budgets(state: State<DbState>, year: i32, month: i32) -> Result<Vec<Budget>, String> {
    let conn = state.0.lock().map_err(|e| e.to_string())?;
    let date_from = format!("{}-{:02}-01", year, month);
    let date_to = format!("{}-{:02}-31", year, month);
    let mut stmt = conn.prepare(r#"
        SELECT b.id,b.category_id,b.amount,b.period,b.year,b.month,
               COALESCE((SELECT SUM(t.amount) FROM transactions t
                         WHERE t.category_id=b.category_id AND t.transaction_type='expense'
                         AND t.date>=?1 AND t.date<=?2),0.0),
               c.name,c.color,c.icon
        FROM budgets b LEFT JOIN categories c ON b.category_id=c.id
        WHERE b.year=?3 AND b.month=?4 ORDER BY c.name
    "#).map_err(|e| e.to_string())?;
    let result = stmt.query_map(params![date_from, date_to, year, month], |r| Ok(Budget {
        id: r.get(0)?, category_id: r.get(1)?, amount: r.get(2)?, period: r.get(3)?,
        year: r.get(4)?, month: r.get(5)?, spent: r.get(6)?,
        category_name: r.get(7)?, category_color: r.get(8)?, category_icon: r.get(9)?,
    })).map_err(|e| e.to_string())?
    .collect::<Result<Vec<_>, _>>().map_err(|e| e.to_string())?;
    Ok(result)
}

#[tauri::command]
fn upsert_budget(state: State<DbState>, category_id: String, amount: f64, year: i32, month: i32) -> Result<(), String> {
    let conn = state.0.lock().map_err(|e| e.to_string())?;
    let id = Uuid::new_v4().to_string();
    conn.execute(
        "INSERT INTO budgets(id,category_id,amount,period,year,month) VALUES(?1,?2,?3,'monthly',?4,?5) ON CONFLICT(category_id,year,month) DO UPDATE SET amount=excluded.amount",
        params![id, category_id, amount, year, month],
    ).map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
fn delete_budget(state: State<DbState>, id: String) -> Result<(), String> {
    let conn = state.0.lock().map_err(|e| e.to_string())?;
    conn.execute("DELETE FROM budgets WHERE id=?1", params![id]).map_err(|e| e.to_string())?;
    Ok(())
}

// ─── Savings Goals ────────────────────────────────────────────────────────────

#[tauri::command]
fn get_savings_goals(state: State<DbState>) -> Result<Vec<SavingsGoal>, String> {
    let conn = state.0.lock().map_err(|e| e.to_string())?;
    let mut stmt = conn.prepare(
        "SELECT id,name,target_amount,current_amount,deadline,color,icon,notes,created_at FROM savings_goals ORDER BY created_at DESC"
    ).map_err(|e| e.to_string())?;
    let result = stmt.query_map([], |r| Ok(SavingsGoal {
        id: r.get(0)?, name: r.get(1)?, target_amount: r.get(2)?, current_amount: r.get(3)?,
        deadline: r.get(4)?, color: r.get(5)?, icon: r.get(6)?, notes: r.get(7)?, created_at: r.get(8)?,
    })).map_err(|e| e.to_string())?
    .collect::<Result<Vec<_>, _>>().map_err(|e| e.to_string())?;
    Ok(result)
}

#[tauri::command]
fn create_savings_goal(state: State<DbState>, name: String, target_amount: f64, current_amount: f64, deadline: Option<String>, color: String, icon: String, notes: String) -> Result<SavingsGoal, String> {
    let conn = state.0.lock().map_err(|e| e.to_string())?;
    let id = Uuid::new_v4().to_string();
    let now = Utc::now().to_rfc3339();
    conn.execute(
        "INSERT INTO savings_goals(id,name,target_amount,current_amount,deadline,color,icon,notes,created_at) VALUES(?1,?2,?3,?4,?5,?6,?7,?8,?9)",
        params![id, name, target_amount, current_amount, deadline, color, icon, notes, now],
    ).map_err(|e| e.to_string())?;
    Ok(SavingsGoal { id, name, target_amount, current_amount, deadline, color, icon, notes, created_at: now })
}

#[tauri::command]
fn update_savings_goal(state: State<DbState>, id: String, name: String, target_amount: f64, current_amount: f64, deadline: Option<String>, color: String, icon: String, notes: String) -> Result<(), String> {
    let conn = state.0.lock().map_err(|e| e.to_string())?;
    conn.execute(
        "UPDATE savings_goals SET name=?1,target_amount=?2,current_amount=?3,deadline=?4,color=?5,icon=?6,notes=?7 WHERE id=?8",
        params![name, target_amount, current_amount, deadline, color, icon, notes, id],
    ).map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
fn delete_savings_goal(state: State<DbState>, id: String) -> Result<(), String> {
    let conn = state.0.lock().map_err(|e| e.to_string())?;
    conn.execute("DELETE FROM savings_goals WHERE id=?1", params![id]).map_err(|e| e.to_string())?;
    Ok(())
}

// ─── Tuition ──────────────────────────────────────────────────────────────────

#[tauri::command]
fn get_tuition_fees(state: State<DbState>) -> Result<Vec<TuitionFee>, String> {
    let conn = state.0.lock().map_err(|e| e.to_string())?;
    let mut stmt = conn.prepare(r#"
        SELECT f.id,f.name,f.total_amount,
               COALESCE((SELECT SUM(t.amount) FROM transactions t
                         WHERE t.tuition_id=f.id AND t.transaction_type='expense'),0.0),
               f.due_date,f.notes,f.created_at
        FROM tuition_fees f ORDER BY f.created_at DESC
    "#).map_err(|e| e.to_string())?;
    let result = stmt.query_map([], |r| Ok(TuitionFee {
        id: r.get(0)?, name: r.get(1)?, total_amount: r.get(2)?, paid: r.get(3)?,
        due_date: r.get(4)?, notes: r.get(5)?, created_at: r.get(6)?,
    })).map_err(|e| e.to_string())?
    .collect::<Result<Vec<_>, _>>().map_err(|e| e.to_string())?;
    Ok(result)
}

#[tauri::command]
fn create_tuition_fee(state: State<DbState>, name: String, total_amount: f64, due_date: Option<String>, notes: String) -> Result<(), String> {
    let conn = state.0.lock().map_err(|e| e.to_string())?;
    conn.execute(
        "INSERT INTO tuition_fees(id,name,total_amount,due_date,notes,created_at) VALUES(?1,?2,?3,?4,?5,?6)",
        params![Uuid::new_v4().to_string(), name, total_amount, due_date, notes, Utc::now().to_rfc3339()],
    ).map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
fn update_tuition_fee(state: State<DbState>, id: String, name: String, total_amount: f64, due_date: Option<String>, notes: String) -> Result<(), String> {
    let conn = state.0.lock().map_err(|e| e.to_string())?;
    conn.execute(
        "UPDATE tuition_fees SET name=?1,total_amount=?2,due_date=?3,notes=?4 WHERE id=?5",
        params![name, total_amount, due_date, notes, id],
    ).map_err(|e| e.to_string())?;
    Ok(())
}

/// Deletes the fee but keeps its payments as ordinary Education expenses,
/// so account balances and spending history are unaffected.
#[tauri::command]
fn delete_tuition_fee(state: State<DbState>, id: String) -> Result<(), String> {
    let conn = state.0.lock().map_err(|e| e.to_string())?;
    conn.execute("UPDATE transactions SET tuition_id=NULL WHERE tuition_id=?1", params![id]).map_err(|e| e.to_string())?;
    conn.execute("DELETE FROM tuition_fees WHERE id=?1", params![id]).map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
fn get_tuition_payments(state: State<DbState>, tuition_id: String) -> Result<Vec<TuitionPayment>, String> {
    let conn = state.0.lock().map_err(|e| e.to_string())?;
    let mut stmt = conn.prepare(r#"
        SELECT t.id,t.amount,t.date,t.notes,a.name
        FROM transactions t LEFT JOIN accounts a ON t.account_id=a.id
        WHERE t.tuition_id=?1 AND t.transaction_type='expense'
        ORDER BY t.date DESC,t.created_at DESC
    "#).map_err(|e| e.to_string())?;
    let result = stmt.query_map(params![tuition_id], |r| Ok(TuitionPayment {
        id: r.get(0)?, amount: r.get(1)?, date: r.get(2)?, notes: r.get(3)?, account_name: r.get(4)?,
    })).map_err(|e| e.to_string())?
    .collect::<Result<Vec<_>, _>>().map_err(|e| e.to_string())?;
    Ok(result)
}

/// Records a payment as an Education expense from the chosen account.
#[tauri::command]
fn add_tuition_payment(
    state: State<DbState>,
    tuition_id: String, account_id: String, amount: f64, date: String, notes: String, payment_method: String,
) -> Result<(), String> {
    let conn = state.0.lock().map_err(|e| e.to_string())?;
    let fee_name: String = conn.query_row("SELECT name FROM tuition_fees WHERE id=?1",
        params![tuition_id], |r| r.get(0)).map_err(|e| e.to_string())?;
    let category_id: String = conn.query_row(
        "SELECT id FROM categories WHERE category_type='expense' ORDER BY (name='Education') DESC, (name='Other Expense') DESC, name LIMIT 1",
        [], |r| r.get(0)).map_err(|e| e.to_string())?;
    let now = Utc::now().to_rfc3339();
    conn.execute(
        "INSERT INTO transactions(id,account_id,category_id,transaction_type,amount,date,notes,payee,payment_method,tags,is_recurring,tuition_id,created_at,updated_at) VALUES(?1,?2,?3,'expense',?4,?5,?6,?7,?8,'tuition',0,?9,?10,?10)",
        params![Uuid::new_v4().to_string(), account_id, category_id, amount, date, notes, fee_name, payment_method, tuition_id, now],
    ).map_err(|e| e.to_string())?;
    conn.execute("UPDATE accounts SET balance=balance-?1 WHERE id=?2", params![amount, account_id]).map_err(|e| e.to_string())?;
    Ok(())
}

// ─── Loans ────────────────────────────────────────────────────────────────────
//
// Money lent to or borrowed from friends. Loans move account balances but are
// deliberately not transactions, so they never count as income or spending.

/// +1 when the loan itself brings money in (borrowed), -1 when it sends money out (lent).
/// Repayments move money the opposite way.
fn loan_sign(direction: &str) -> Result<f64, String> {
    match direction {
        "borrowed" => Ok(1.0),
        "lent" => Ok(-1.0),
        _ => Err(format!("Unknown loan direction: {}", direction)),
    }
}

fn adjust_balance(conn: &Connection, account_id: &str, delta: f64) -> Result<(), String> {
    conn.execute("UPDATE accounts SET balance=balance+?1 WHERE id=?2", params![delta, account_id])
        .map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
fn get_loans(state: State<DbState>) -> Result<Vec<Loan>, String> {
    let conn = state.0.lock().map_err(|e| e.to_string())?;
    let mut stmt = conn.prepare(r#"
        SELECT l.id,l.person,l.direction,l.amount,
               COALESCE((SELECT SUM(r.amount) FROM loan_repayments r WHERE r.loan_id=l.id),0.0),
               l.account_id,a.name,l.date,l.due_date,l.notes,l.created_at
        FROM loans l LEFT JOIN accounts a ON l.account_id=a.id
        ORDER BY l.date DESC,l.created_at DESC
    "#).map_err(|e| e.to_string())?;
    let result = stmt.query_map([], |r| Ok(Loan {
        id: r.get(0)?, person: r.get(1)?, direction: r.get(2)?, amount: r.get(3)?, returned: r.get(4)?,
        account_id: r.get(5)?, account_name: r.get(6)?, date: r.get(7)?, due_date: r.get(8)?,
        notes: r.get(9)?, created_at: r.get(10)?,
    })).map_err(|e| e.to_string())?
    .collect::<Result<Vec<_>, _>>().map_err(|e| e.to_string())?;
    Ok(result)
}

#[tauri::command]
fn create_loan(
    state: State<DbState>,
    person: String, direction: String, amount: f64, account_id: String,
    date: String, due_date: Option<String>, notes: String,
) -> Result<(), String> {
    let sign = loan_sign(&direction)?;
    let conn = state.0.lock().map_err(|e| e.to_string())?;
    let tx = conn.unchecked_transaction().map_err(|e| e.to_string())?;
    tx.execute(
        "INSERT INTO loans(id,person,direction,amount,account_id,date,due_date,notes,created_at) VALUES(?1,?2,?3,?4,?5,?6,?7,?8,?9)",
        params![Uuid::new_v4().to_string(), person, direction, amount, account_id, date, due_date, notes, Utc::now().to_rfc3339()],
    ).map_err(|e| e.to_string())?;
    adjust_balance(&tx, &account_id, sign * amount)?;
    tx.commit().map_err(|e| e.to_string())
}

/// Edits a loan. A changed amount adjusts the original account by the difference;
/// the account and direction are fixed once created.
#[tauri::command]
fn update_loan(state: State<DbState>, id: String, person: String, amount: f64, due_date: Option<String>, notes: String) -> Result<(), String> {
    let conn = state.0.lock().map_err(|e| e.to_string())?;
    let (direction, old_amount, account_id): (String, f64, String) = conn.query_row(
        "SELECT direction,amount,account_id FROM loans WHERE id=?1", params![id],
        |r| Ok((r.get(0)?, r.get(1)?, r.get(2)?))).map_err(|e| e.to_string())?;
    let sign = loan_sign(&direction)?;
    let tx = conn.unchecked_transaction().map_err(|e| e.to_string())?;
    tx.execute("UPDATE loans SET person=?1,amount=?2,due_date=?3,notes=?4 WHERE id=?5",
        params![person, amount, due_date, notes, id]).map_err(|e| e.to_string())?;
    adjust_balance(&tx, &account_id, sign * (amount - old_amount))?;
    tx.commit().map_err(|e| e.to_string())
}

/// Deletes a loan and its returns, undoing every balance change they made.
/// Any cancel-out it was part of is undone on the other loans too.
#[tauri::command]
fn delete_loan(state: State<DbState>, id: String) -> Result<(), String> {
    let conn = state.0.lock().map_err(|e| e.to_string())?;
    let (direction, amount, account_id): (String, f64, String) = conn.query_row(
        "SELECT direction,amount,account_id FROM loans WHERE id=?1", params![id],
        |r| Ok((r.get(0)?, r.get(1)?, r.get(2)?))).map_err(|e| e.to_string())?;
    let sign = loan_sign(&direction)?;
    let repayments: Vec<(f64, String, Option<String>)> = {
        let mut stmt = conn.prepare("SELECT amount,account_id,offset_id FROM loan_repayments WHERE loan_id=?1").map_err(|e| e.to_string())?;
        let rows = stmt.query_map(params![id], |r| Ok((r.get(0)?, r.get(1)?, r.get(2)?))).map_err(|e| e.to_string())?
            .collect::<Result<Vec<_>, _>>().map_err(|e| e.to_string())?;
        rows
    };
    let tx = conn.unchecked_transaction().map_err(|e| e.to_string())?;
    adjust_balance(&tx, &account_id, -sign * amount)?;
    for (r_amount, r_account, offset_id) in repayments {
        match offset_id {
            Some(offset_id) => {
                tx.execute("DELETE FROM loan_repayments WHERE offset_id=?1", params![offset_id]).map_err(|e| e.to_string())?;
            }
            None => adjust_balance(&tx, &r_account, sign * r_amount)?,
        }
    }
    tx.execute("DELETE FROM loan_repayments WHERE loan_id=?1", params![id]).map_err(|e| e.to_string())?;
    tx.execute("DELETE FROM loans WHERE id=?1", params![id]).map_err(|e| e.to_string())?;
    tx.commit().map_err(|e| e.to_string())
}

#[tauri::command]
fn get_loan_repayments(state: State<DbState>, loan_id: String) -> Result<Vec<LoanRepayment>, String> {
    let conn = state.0.lock().map_err(|e| e.to_string())?;
    let mut stmt = conn.prepare(r#"
        SELECT r.id,r.loan_id,r.amount,r.date,r.notes,a.name,r.offset_id
        FROM loan_repayments r LEFT JOIN accounts a ON r.account_id=a.id
        WHERE r.loan_id=?1 ORDER BY r.date DESC,r.created_at DESC
    "#).map_err(|e| e.to_string())?;
    let result = stmt.query_map(params![loan_id], |r| Ok(LoanRepayment {
        id: r.get(0)?, loan_id: r.get(1)?, amount: r.get(2)?, date: r.get(3)?, notes: r.get(4)?, account_name: r.get(5)?,
        offset_id: r.get(6)?,
    })).map_err(|e| e.to_string())?
    .collect::<Result<Vec<_>, _>>().map_err(|e| e.to_string())?;
    Ok(result)
}

#[tauri::command]
fn add_loan_repayment(state: State<DbState>, loan_id: String, amount: f64, account_id: String, date: String, notes: String) -> Result<(), String> {
    let conn = state.0.lock().map_err(|e| e.to_string())?;
    let direction: String = conn.query_row("SELECT direction FROM loans WHERE id=?1", params![loan_id], |r| r.get(0))
        .map_err(|e| e.to_string())?;
    let sign = loan_sign(&direction)?;
    let tx = conn.unchecked_transaction().map_err(|e| e.to_string())?;
    tx.execute(
        "INSERT INTO loan_repayments(id,loan_id,amount,account_id,date,notes,created_at) VALUES(?1,?2,?3,?4,?5,?6,?7)",
        params![Uuid::new_v4().to_string(), loan_id, amount, account_id, date, notes, Utc::now().to_rfc3339()],
    ).map_err(|e| e.to_string())?;
    adjust_balance(&tx, &account_id, -sign * amount)?;
    tx.commit().map_err(|e| e.to_string())
}

/// Deletes a return. A cancel-out is removed as a whole, on both sides, since no money moved.
#[tauri::command]
fn delete_loan_repayment(state: State<DbState>, id: String) -> Result<(), String> {
    let conn = state.0.lock().map_err(|e| e.to_string())?;
    let (amount, account_id, direction, offset_id): (f64, String, String, Option<String>) = conn.query_row(
        "SELECT r.amount,r.account_id,l.direction,r.offset_id FROM loan_repayments r JOIN loans l ON r.loan_id=l.id WHERE r.id=?1",
        params![id], |r| Ok((r.get(0)?, r.get(1)?, r.get(2)?, r.get(3)?))).map_err(|e| e.to_string())?;
    let sign = loan_sign(&direction)?;
    let tx = conn.unchecked_transaction().map_err(|e| e.to_string())?;
    match offset_id {
        Some(offset_id) => {
            tx.execute("DELETE FROM loan_repayments WHERE offset_id=?1", params![offset_id]).map_err(|e| e.to_string())?;
        }
        None => {
            adjust_balance(&tx, &account_id, sign * amount)?;
            tx.execute("DELETE FROM loan_repayments WHERE id=?1", params![id]).map_err(|e| e.to_string())?;
        }
    }
    tx.commit().map_err(|e| e.to_string())
}

/// Cancels what you owe a friend against what they owe you. The smaller side is
/// closed in full and the larger side reduced by the same amount, oldest loans
/// first. Account balances don't change: no money actually moves. Returns the
/// amount cancelled.
#[tauri::command]
fn offset_loans(state: State<DbState>, loan_ids: Vec<String>, date: String) -> Result<f64, String> {
    const EPS: f64 = 0.000001;
    let conn = state.0.lock().map_err(|e| e.to_string())?;
    let person_key = |p: &str| p.split_whitespace().collect::<Vec<_>>().join(" ").to_lowercase();

    struct Open { id: String, direction: String, open: f64, account_id: String, person: String, order: String }
    let mut loans: Vec<Open> = Vec::new();
    for id in &loan_ids {
        let l = conn.query_row(
            "SELECT l.direction,l.amount-COALESCE((SELECT SUM(r.amount) FROM loan_repayments r WHERE r.loan_id=l.id),0.0),
                    l.account_id,l.person,l.date||l.created_at
             FROM loans l WHERE l.id=?1",
            params![id], |r| Ok(Open { id: id.clone(), direction: r.get(0)?, open: r.get(1)?, account_id: r.get(2)?, person: r.get(3)?, order: r.get(4)? }),
        ).map_err(|e| e.to_string())?;
        loan_sign(&l.direction)?;
        loans.push(l);
    }
    loans.sort_by(|a, b| a.order.cmp(&b.order));
    let people: std::collections::HashSet<String> = loans.iter().map(|l| person_key(&l.person)).collect();
    if people.len() != 1 {
        return Err("Loans to cancel out must all be with the same friend".into());
    }

    let open_on = |dir: &str| loans.iter().filter(|l| l.direction == dir && l.open > EPS).map(|l| l.open).sum::<f64>();
    let amount = open_on("lent").min(open_on("borrowed"));
    if amount <= EPS {
        return Err("Nothing to cancel out: money needs to be open both ways".into());
    }

    let offset_id = Uuid::new_v4().to_string();
    let now = Utc::now().to_rfc3339();
    let tx = conn.unchecked_transaction().map_err(|e| e.to_string())?;
    for dir in ["lent", "borrowed"] {
        let mut left = amount;
        for l in loans.iter().filter(|l| l.direction == dir && l.open > EPS) {
            if left <= EPS { break; }
            let take = l.open.min(left);
            tx.execute(
                "INSERT INTO loan_repayments(id,loan_id,amount,account_id,date,notes,created_at,offset_id) VALUES(?1,?2,?3,?4,?5,'',?6,?7)",
                params![Uuid::new_v4().to_string(), l.id, take, l.account_id, date, now, offset_id],
            ).map_err(|e| e.to_string())?;
            left -= take;
        }
    }
    tx.commit().map_err(|e| e.to_string())?;
    Ok(amount)
}

// ─── Analytics ────────────────────────────────────────────────────────────────

#[tauri::command]
fn get_dashboard_data(state: State<DbState>) -> Result<DashboardData, String> {
    let conn = state.0.lock().map_err(|e| e.to_string())?;
    let now = chrono::Local::now(); // local month, not UTC (UZT is UTC+5)
    let year_n: i32 = now.format("%Y").to_string().parse().unwrap_or(2024);
    let month_n: i32 = now.format("%m").to_string().parse().unwrap_or(1);
    let date_from = format!("{}-{:02}-01", year_n, month_n);
    let date_to = format!("{}-{:02}-31", year_n, month_n);

    let month_income: f64 = conn.query_row(
        "SELECT COALESCE(SUM(amount),0) FROM transactions WHERE transaction_type='income' AND date>=?1 AND date<=?2",
        params![date_from, date_to], |r| r.get(0)
    ).map_err(|e| e.to_string())?;
    let month_expenses: f64 = conn.query_row(
        "SELECT COALESCE(SUM(amount),0) FROM transactions WHERE transaction_type='expense' AND date>=?1 AND date<=?2",
        params![date_from, date_to], |r| r.get(0)
    ).map_err(|e| e.to_string())?;
    let total_balance: f64 = conn.query_row("SELECT COALESCE(SUM(balance),0) FROM accounts", [], |r| r.get(0)).map_err(|e| e.to_string())?;
    let month_budget_total: f64 = conn.query_row(
        "SELECT COALESCE(SUM(amount),0) FROM budgets WHERE year=?1 AND month=?2",
        params![year_n, month_n], |r| r.get(0)
    ).map_err(|e| e.to_string())?;

    let accounts: Vec<Account> = {
        let mut stmt = conn.prepare(
            "SELECT id,name,account_type,balance,currency,color,icon,created_at FROM accounts ORDER BY name"
        ).map_err(|e| e.to_string())?;
        let rows = stmt.query_map([], |r| Ok(Account {
            id: r.get(0)?, name: r.get(1)?, account_type: r.get(2)?,
            balance: r.get(3)?, currency: r.get(4)?, color: r.get(5)?,
            icon: r.get(6)?, created_at: r.get(7)?,
        })).map_err(|e| e.to_string())?
        .collect::<Result<Vec<_>, _>>().map_err(|e| e.to_string())?;
        rows
    };

    Ok(DashboardData {
        total_balance, month_income, month_expenses,
        month_budget_total, month_budget_spent: month_expenses,
        net_worth: total_balance, accounts,
    })
}

#[tauri::command]
fn get_spending_by_category(state: State<DbState>, date_from: String, date_to: String, transaction_type: String) -> Result<Vec<SpendingByCategory>, String> {
    let conn = state.0.lock().map_err(|e| e.to_string())?;
    let mut stmt = conn.prepare(r#"
        SELECT c.id,c.name,c.color,c.icon,SUM(t.amount),COUNT(*)
        FROM transactions t LEFT JOIN categories c ON t.category_id=c.id
        WHERE t.transaction_type=?1 AND t.date>=?2 AND t.date<=?3
        GROUP BY t.category_id ORDER BY SUM(t.amount) DESC
    "#).map_err(|e| e.to_string())?;
    let result = stmt.query_map(params![transaction_type, date_from, date_to], |r| Ok(SpendingByCategory {
        category_id: r.get(0)?, category_name: r.get(1)?, category_color: r.get(2)?,
        category_icon: r.get(3)?, amount: r.get(4)?, count: r.get(5)?,
    })).map_err(|e| e.to_string())?
    .collect::<Result<Vec<_>, _>>().map_err(|e| e.to_string())?;
    Ok(result)
}

#[tauri::command]
fn get_daily_spending(state: State<DbState>, date_from: String, date_to: String) -> Result<Vec<DailySpending>, String> {
    let conn = state.0.lock().map_err(|e| e.to_string())?;
    let mut stmt = conn.prepare(r#"
        SELECT date,
               SUM(CASE WHEN transaction_type='income' THEN amount ELSE 0 END),
               SUM(CASE WHEN transaction_type='expense' THEN amount ELSE 0 END)
        FROM transactions WHERE date>=?1 AND date<=?2
        GROUP BY date ORDER BY date ASC
    "#).map_err(|e| e.to_string())?;
    let result = stmt.query_map(params![date_from, date_to], |r| Ok(DailySpending {
        date: r.get(0)?, income: r.get(1)?, expenses: r.get(2)?,
    })).map_err(|e| e.to_string())?
    .collect::<Result<Vec<_>, _>>().map_err(|e| e.to_string())?;
    Ok(result)
}

// ─── Recurring ────────────────────────────────────────────────────────────────

#[tauri::command]
fn get_recurring_transactions(state: State<DbState>) -> Result<Vec<RecurringTransaction>, String> {
    let conn = state.0.lock().map_err(|e| e.to_string())?;
    let mut stmt = conn.prepare(r#"
        SELECT r.id,r.account_id,r.category_id,r.transaction_type,r.amount,
               r.payee,r.notes,r.payment_method,r.frequency,
               r.start_date,r.next_date,r.end_date,r.is_active,c.name,a.name
        FROM recurring_transactions r
        LEFT JOIN categories c ON r.category_id=c.id
        LEFT JOIN accounts a ON r.account_id=a.id
        ORDER BY r.next_date ASC
    "#).map_err(|e| e.to_string())?;
    let result = stmt.query_map([], |r| Ok(RecurringTransaction {
        id: r.get(0)?, account_id: r.get(1)?, category_id: r.get(2)?,
        transaction_type: r.get(3)?, amount: r.get(4)?, payee: r.get(5)?,
        notes: r.get(6)?, payment_method: r.get(7)?, frequency: r.get(8)?,
        start_date: r.get(9)?, next_date: r.get(10)?, end_date: r.get(11)?,
        is_active: r.get::<_, i32>(12)? != 0, category_name: r.get(13)?, account_name: r.get(14)?,
    })).map_err(|e| e.to_string())?
    .collect::<Result<Vec<_>, _>>().map_err(|e| e.to_string())?;
    Ok(result)
}

#[tauri::command]
fn create_recurring_transaction(
    state: State<DbState>,
    account_id: String, category_id: String, transaction_type: String, amount: f64,
    payee: String, notes: String, payment_method: String, frequency: String, start_date: String, end_date: Option<String>,
) -> Result<(), String> {
    let conn = state.0.lock().map_err(|e| e.to_string())?;
    let id = Uuid::new_v4().to_string();
    conn.execute(
        "INSERT INTO recurring_transactions(id,account_id,category_id,transaction_type,amount,payee,notes,payment_method,frequency,start_date,next_date,end_date,is_active) VALUES(?1,?2,?3,?4,?5,?6,?7,?8,?9,?10,?10,?11,1)",
        params![id, account_id, category_id, transaction_type, amount, payee, notes, payment_method, frequency, start_date, end_date],
    ).map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
fn delete_recurring_transaction(state: State<DbState>, id: String) -> Result<(), String> {
    let conn = state.0.lock().map_err(|e| e.to_string())?;
    conn.execute("DELETE FROM recurring_transactions WHERE id=?1", params![id]).map_err(|e| e.to_string())?;
    Ok(())
}

// ─── Export ───────────────────────────────────────────────────────────────────

#[tauri::command]
fn export_transactions_csv(state: State<DbState>) -> Result<String, String> {
    let conn = state.0.lock().map_err(|e| e.to_string())?;
    let mut stmt = conn.prepare(r#"
        SELECT t.date,t.transaction_type,t.amount,c.name,t.payee,t.notes,t.payment_method,t.tags,a.name
        FROM transactions t
        LEFT JOIN categories c ON t.category_id=c.id
        LEFT JOIN accounts a ON t.account_id=a.id
        ORDER BY t.date DESC
    "#).map_err(|e| e.to_string())?;
    let mut csv = String::from("Date,Type,Amount,Category,Payee,Notes,Payment Method,Tags,Account\n");
    let rows: Vec<(String,String,f64,String,String,String,String,String,String)> = stmt.query_map([], |r| {
        Ok((r.get(0)?, r.get(1)?, r.get(2)?,
            r.get::<_, Option<String>>(3)?.unwrap_or_default(),
            r.get(4)?, r.get(5)?, r.get(6)?, r.get(7)?,
            r.get::<_, Option<String>>(8)?.unwrap_or_default()))
    }).map_err(|e| e.to_string())?
    .collect::<Result<Vec<_>, _>>().map_err(|e| e.to_string())?;
    for (date, typ, amt, cat, payee, notes, method, tags, acct) in rows {
        csv.push_str(&format!("{},{},{:.2},{},{},{},{},{},{}\n",
            date, typ, amt,
            cat.replace(',', ";"), payee.replace(',', ";"),
            notes.replace(',', ";"), method, tags.replace(',', ";"), acct));
    }
    Ok(csv)
}

#[tauri::command]
fn get_db_path(app: tauri::AppHandle) -> Result<String, String> {
    let data_dir = app.path().app_data_dir().map_err(|e| e.to_string())?;
    Ok(data_dir.join("manmoney.db").to_string_lossy().to_string())
}

// ─── Window ───────────────────────────────────────────────────────────────────

/// Shrinks the main window to fit the monitor's work area (the screen minus
/// the Windows taskbar) and centers it there. The configured 1280×820 size is
/// in logical pixels, so on common Windows laptops with 125–150% display
/// scaling it would otherwise open taller than the screen.
fn fit_window_to_work_area(window: &tauri::WebviewWindow) -> tauri::Result<()> {
    let Some(monitor) = window.current_monitor()? else { return Ok(()) };
    let area = monitor.work_area();
    let inner = window.inner_size()?;
    let outer = window.outer_size()?;
    // Title bar and borders, in physical pixels.
    let frame_w = outer.width.saturating_sub(inner.width);
    let frame_h = outer.height.saturating_sub(inner.height);

    // Leave a small margin around the window so it doesn't look maximized.
    let max_w = (area.size.width as f64 * 0.96) as u32;
    let max_h = (area.size.height as f64 * 0.96) as u32;
    if outer.width <= max_w && outer.height <= max_h {
        return Ok(());
    }

    let width = outer.width.min(max_w);
    let height = outer.height.min(max_h);
    window.set_size(tauri::PhysicalSize::new(
        width.saturating_sub(frame_w),
        height.saturating_sub(frame_h),
    ))?;
    window.set_position(tauri::PhysicalPosition::new(
        area.position.x + (area.size.width.saturating_sub(width) / 2) as i32,
        area.position.y + (area.size.height.saturating_sub(height) / 2) as i32,
    ))?;
    Ok(())
}

// ─── Entry ────────────────────────────────────────────────────────────────────

pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .setup(|app| {
            let data_dir = app.path().app_data_dir().expect("no data dir");
            std::fs::create_dir_all(&data_dir).expect("create data dir");
            let db_path = data_dir.join("manmoney.db");
            let conn = Connection::open(&db_path).expect("open db");
            setup_database(&conn).expect("setup db");
            app.manage(DbState(Mutex::new(conn)));

            // The window starts hidden so it can be resized before it appears.
            if let Some(window) = app.get_webview_window("main") {
                let _ = fit_window_to_work_area(&window);
                window.show()?;
            }
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            get_accounts, create_account, update_account, set_accounts_currency, delete_account,
            get_categories, create_category, update_category, delete_category,
            get_transactions, create_transaction, update_transaction, delete_transaction,
            get_budgets, upsert_budget, delete_budget,
            get_savings_goals, create_savings_goal, update_savings_goal, delete_savings_goal,
            get_tuition_fees, create_tuition_fee, update_tuition_fee, delete_tuition_fee,
            get_tuition_payments, add_tuition_payment,
            get_loans, create_loan, update_loan, delete_loan,
            get_loan_repayments, add_loan_repayment, delete_loan_repayment, offset_loans,
            get_dashboard_data, get_spending_by_category, get_daily_spending,
            get_recurring_transactions, create_recurring_transaction, delete_recurring_transaction,
            export_transactions_csv, get_db_path,
        ])
        .run(tauri::generate_context!())
        .expect("ManMoney startup failed");
}
