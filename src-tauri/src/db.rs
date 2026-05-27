use rusqlite::{Connection, Result};
use std::path::PathBuf;
use tauri::Manager;

pub fn init_db(app_handle: &tauri::AppHandle) -> Result<Connection> {
    let app_dir = app_handle.path().app_local_data_dir().unwrap_or_else(|_| PathBuf::from("."));
    std::fs::create_dir_all(&app_dir).unwrap_or(());
    let db_path = app_dir.join("fonts.db");
    let conn = Connection::open(db_path)?;

    conn.execute(
        "CREATE TABLE IF NOT EXISTS fonts (
            id INTEGER PRIMARY KEY,
            file_path TEXT UNIQUE,
            family TEXT,
            subfamily TEXT,
            postscript_name TEXT,
            is_variable BOOLEAN,
            has_arabic BOOLEAN
        )",
        [],
    )?;

    conn.execute(
        "CREATE TABLE IF NOT EXISTS tags (
            font_id INTEGER,
            tag TEXT,
            UNIQUE(font_id, tag),
            FOREIGN KEY(font_id) REFERENCES fonts(id)
        )",
        [],
    )?;

    Ok(conn)
}
