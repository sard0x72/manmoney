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
    pub transfer_account_id: Option<String>,
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
    pub month_savings: f64,
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

    seed_defaults(conn)?;
    Ok(())
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
               t.is_recurring,t.recurring_id,t.transfer_account_id,
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
        transfer_account_id: r.get(12)?, created_at: r.get(13)?, updated_at: r.get(14)?,
        category_name: r.get(15)?, category_color: r.get(16)?, category_icon: r.get(17)?,
        account_name: r.get(18)?,
    })).map_err(|e| e.to_string())?
    .collect::<Result<Vec<_>, _>>().map_err(|e| e.to_string())?;
    Ok(result)
}

#[tauri::command]
fn create_transaction(
    state: State<DbState>,
    account_id: String, category_id: String, transaction_type: String, amount: f64,
    date: String, notes: String, payee: String, payment_method: String, tags: String,
    transfer_account_id: Option<String>,
) -> Result<Transaction, String> {
    let conn = state.0.lock().map_err(|e| e.to_string())?;
    let id = Uuid::new_v4().to_string();
    let now = Utc::now().to_rfc3339();

    conn.execute(
        "INSERT INTO transactions(id,account_id,category_id,transaction_type,amount,date,notes,payee,payment_method,tags,is_recurring,transfer_account_id,created_at,updated_at) VALUES(?1,?2,?3,?4,?5,?6,?7,?8,?9,?10,0,?11,?12,?12)",
        params![id, account_id, category_id, transaction_type, amount, date, notes, payee, payment_method, tags, transfer_account_id, now],
    ).map_err(|e| e.to_string())?;

    match transaction_type.as_str() {
        "income" => { conn.execute("UPDATE accounts SET balance=balance+?1 WHERE id=?2", params![amount, account_id]).map_err(|e| e.to_string())?; }
        "expense" => { conn.execute("UPDATE accounts SET balance=balance-?1 WHERE id=?2", params![amount, account_id]).map_err(|e| e.to_string())?; }
        "transfer" => {
            if let Some(ref to_id) = transfer_account_id {
                conn.execute("UPDATE accounts SET balance=balance-?1 WHERE id=?2", params![amount, account_id]).map_err(|e| e.to_string())?;
                conn.execute("UPDATE accounts SET balance=balance+?1 WHERE id=?2", params![amount, to_id]).map_err(|e| e.to_string())?;
            }
        }
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
        payment_method, tags, is_recurring: false, recurring_id: None, transfer_account_id,
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

    let (old_type, old_amount, old_acct, old_to): (String, f64, String, Option<String>) = conn.query_row(
        "SELECT transaction_type,amount,account_id,transfer_account_id FROM transactions WHERE id=?1",
        params![id], |r| Ok((r.get(0)?, r.get(1)?, r.get(2)?, r.get(3)?))
    ).map_err(|e| e.to_string())?;

    match old_type.as_str() {
        "income" => { conn.execute("UPDATE accounts SET balance=balance-?1 WHERE id=?2", params![old_amount, old_acct]).map_err(|e| e.to_string())?; }
        "expense" => { conn.execute("UPDATE accounts SET balance=balance+?1 WHERE id=?2", params![old_amount, old_acct]).map_err(|e| e.to_string())?; }
        "transfer" => {
            if let Some(ref to) = old_to {
                conn.execute("UPDATE accounts SET balance=balance+?1 WHERE id=?2", params![old_amount, old_acct]).map_err(|e| e.to_string())?;
                conn.execute("UPDATE accounts SET balance=balance-?1 WHERE id=?2", params![old_amount, to]).map_err(|e| e.to_string())?;
            }
        }
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
    let (old_type, old_amount, old_acct, old_to): (String, f64, String, Option<String>) = conn.query_row(
        "SELECT transaction_type,amount,account_id,transfer_account_id FROM transactions WHERE id=?1",
        params![id], |r| Ok((r.get(0)?, r.get(1)?, r.get(2)?, r.get(3)?))
    ).map_err(|e| e.to_string())?;

    match old_type.as_str() {
        "income" => { conn.execute("UPDATE accounts SET balance=balance-?1 WHERE id=?2", params![old_amount, old_acct]).map_err(|e| e.to_string())?; }
        "expense" => { conn.execute("UPDATE accounts SET balance=balance+?1 WHERE id=?2", params![old_amount, old_acct]).map_err(|e| e.to_string())?; }
        "transfer" => {
            if let Some(ref to) = old_to {
                conn.execute("UPDATE accounts SET balance=balance+?1 WHERE id=?2", params![old_amount, old_acct]).map_err(|e| e.to_string())?;
                conn.execute("UPDATE accounts SET balance=balance-?1 WHERE id=?2", params![old_amount, to]).map_err(|e| e.to_string())?;
            }
        }
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

// ─── Analytics ────────────────────────────────────────────────────────────────

#[tauri::command]
fn get_dashboard_data(state: State<DbState>) -> Result<DashboardData, String> {
    let conn = state.0.lock().map_err(|e| e.to_string())?;
    let now = Utc::now();
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
        month_savings: month_income - month_expenses,
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
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            get_accounts, create_account, update_account, delete_account,
            get_categories, create_category, update_category, delete_category,
            get_transactions, create_transaction, update_transaction, delete_transaction,
            get_budgets, upsert_budget, delete_budget,
            get_savings_goals, create_savings_goal, update_savings_goal, delete_savings_goal,
            get_dashboard_data, get_spending_by_category, get_daily_spending,
            get_recurring_transactions, create_recurring_transaction, delete_recurring_transaction,
            export_transactions_csv, get_db_path,
        ])
        .run(tauri::generate_context!())
        .expect("ManMoney startup failed");
}
