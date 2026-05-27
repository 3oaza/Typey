mod db;
mod font_manager;

use std::sync::Mutex;
use tauri::Manager;

#[tauri::command]
fn greet(name: &str) -> String {
    format!("Hello, {}! You've been greeted from Rust!", name)
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_dialog::init())
        .setup(|app| {
            let conn = db::init_db(app.handle()).expect("Failed to init db");
            app.manage(font_manager::DbState {
                db: Mutex::new(conn),
            });
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            greet,
            font_manager::scan_directory,
            font_manager::get_fonts,
            font_manager::scan_system_fonts,
            font_manager::add_font_tag,
            font_manager::remove_font_tag,
            font_manager::get_font_tags,
            font_manager::get_all_tags
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
