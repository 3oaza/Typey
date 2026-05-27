use std::fs;
use std::path::Path;
use tauri::State;
use rusqlite::Connection;
use std::sync::Mutex;
use rayon::prelude::*;
use walkdir::WalkDir;

pub struct DbState {
    pub db: Mutex<Connection>,
}

#[derive(serde::Serialize, serde::Deserialize, Clone)]
pub struct FontMeta {
    pub id: Option<i64>,
    pub file_path: String,
    pub family: String,
    pub subfamily: String,
    pub postscript_name: String,
    pub is_variable: bool,
    pub has_arabic: bool,
}

#[derive(serde::Serialize, serde::Deserialize, Clone)]
pub struct StyleMeta {
    pub id: i64,
    pub file_path: String,
    pub subfamily: String,
    pub postscript_name: String,
}

#[derive(serde::Serialize, serde::Deserialize, Clone)]
pub struct FamilyMeta {
    pub family: String,
    pub is_variable: bool,
    pub has_arabic: bool,
    pub styles: Vec<StyleMeta>,
}

pub fn parse_font<P: AsRef<Path>>(path: P) -> Option<FontMeta> {
    let data = fs::read(path.as_ref()).ok()?;
    let face = ttf_parser::Face::parse(&data, 0).ok()?;

    let mut family = String::new();
    let mut subfamily = String::new();
    let mut postscript_name = String::new();

    for name in face.names() {
        if let Some(n) = name.to_string() {
            match name.name_id {
                1 => if family.is_empty() { family = n; },
                2 => if subfamily.is_empty() { subfamily = n; },
                6 => if postscript_name.is_empty() { postscript_name = n; },
                _ => {}
            }
        }
    }

    if family.is_empty() {
        family = path.as_ref().file_stem()?.to_string_lossy().to_string();
    }

    let is_variable = face.is_variable();
    // Rough check for Arabic coverage ('ا' U+0627)
    let has_arabic = face.glyph_index(char::from_u32(0x0627).unwrap()).is_some();

    Some(FontMeta {
        id: None,
        file_path: path.as_ref().to_string_lossy().to_string(),
        family,
        subfamily,
        postscript_name,
        is_variable,
        has_arabic,
    })
}

#[tauri::command]
pub fn scan_directory(state: State<'_, DbState>, dir: String) -> Result<usize, String> {
    let mut paths = Vec::new();
    for entry in WalkDir::new(&dir).into_iter().filter_map(|e| e.ok()) {
        if entry.file_type().is_file() {
            let ext = entry.path().extension().and_then(|e| e.to_str()).unwrap_or("").to_lowercase();
            if ext == "ttf" || ext == "otf" || ext == "woff" || ext == "woff2" {
                paths.push(entry.into_path());
            }
        }
    }

    let metas: Vec<FontMeta> = paths.par_iter().filter_map(|p| parse_font(p)).collect();

    let mut db = state.db.lock().map_err(|e| e.to_string())?;
    let tx = db.transaction().map_err(|e| e.to_string())?;
    
    let mut count = 0;
    for meta in &metas {
        let res = tx.execute(
            "INSERT OR IGNORE INTO fonts (file_path, family, subfamily, postscript_name, is_variable, has_arabic)
             VALUES (?1, ?2, ?3, ?4, ?5, ?6)",
            rusqlite::params![meta.file_path, meta.family, meta.subfamily, meta.postscript_name, meta.is_variable, meta.has_arabic],
        );
        if res.is_ok() { count += 1; }
    }
    tx.commit().map_err(|e| e.to_string())?;

    Ok(count)
}

#[tauri::command]
pub fn get_fonts(state: State<'_, DbState>, query: String, tag: String, offset: u32, limit: u32) -> Result<Vec<FamilyMeta>, String> {
    let db = state.db.lock().map_err(|e| e.to_string())?;
    
    let sql = "SELECT DISTINCT f.id, f.file_path, f.family, f.subfamily, f.postscript_name, f.is_variable, f.has_arabic \
               FROM fonts f \
               LEFT JOIN tags t ON f.id = t.font_id \
               WHERE (:tag = '' OR t.tag = :tag) \
                 AND (:query = '' OR f.family LIKE :query_like) \
               ORDER BY f.family ASC";
    
    let mut stmt = db.prepare(sql).map_err(|e| {
        println!("SQL prepare error: {}", e);
        e.to_string()
    })?;
    
    let q = format!("%{}%", query);
    
    let mut rows = stmt.query(rusqlite::named_params! {
        ":tag": tag,
        ":query": query,
        ":query_like": q,
    }).map_err(|e| {
        println!("SQL query error: {}", e);
        e.to_string()
    })?;

    let mut families: Vec<FamilyMeta> = Vec::new();
    
    while let Some(row) = rows.next().map_err(|e| e.to_string())? {
        let id: i64 = row.get(0).unwrap_or(0);
        let file_path: String = row.get(1).unwrap_or_default();
        let family: String = row.get(2).unwrap_or_default();
        let subfamily: String = row.get(3).unwrap_or_default();
        let postscript_name: String = row.get(4).unwrap_or_default();
        let is_variable: bool = row.get(5).unwrap_or(false);
        let has_arabic: bool = row.get(6).unwrap_or(false);
        
        let style = StyleMeta {
            id,
            file_path,
            subfamily,
            postscript_name,
        };
        
        if let Some(fam) = families.iter_mut().find(|f| f.family == family) {
            if !fam.styles.iter().any(|s| s.subfamily == style.subfamily) {
                fam.styles.push(style);
            }
        } else {
            families.push(FamilyMeta {
                family,
                is_variable,
                has_arabic,
                styles: vec![style],
            });
        }
    }

    let start = offset as usize;
    if start >= families.len() {
        return Ok(Vec::new());
    }
    let end = std::cmp::min(start + limit as usize, families.len());
    let paginated = families[start..end].to_vec();

    Ok(paginated)
}

#[tauri::command]
pub fn scan_system_fonts(state: State<'_, DbState>) -> Result<usize, String> {
    let mut paths_to_scan = Vec::new();
    
    #[cfg(target_os = "windows")]
    {
        let windir = std::env::var("windir").unwrap_or_else(|_| "C:\\Windows".to_string());
        paths_to_scan.push(format!("{}\\Fonts", windir));
        
        if let Ok(localappdata) = std::env::var("LOCALAPPDATA") {
            paths_to_scan.push(format!("{}\\Microsoft\\Windows\\Fonts", localappdata));
        }
    }
    
    #[cfg(target_os = "macos")]
    {
        paths_to_scan.push("/System/Library/Fonts".to_string());
        paths_to_scan.push("/Library/Fonts".to_string());
        if let Ok(home) = std::env::var("HOME") {
            paths_to_scan.push(format!("{}/Library/Fonts", home));
        }
    }

    #[cfg(not(any(target_os = "windows", target_os = "macos")))]
    {
        paths_to_scan.push("/usr/share/fonts".to_string());
        paths_to_scan.push("/usr/local/share/fonts".to_string());
        if let Ok(home) = std::env::var("HOME") {
            paths_to_scan.push(format!("{}/.local/share/fonts", home));
        }
    }

    let mut total_added = 0;
    
    for dir in paths_to_scan {
        println!("Scanning system fonts directory: {}", dir);
        if std::path::Path::new(&dir).exists() {
            let mut paths = Vec::new();
            for entry in WalkDir::new(&dir).into_iter().filter_map(|e| e.ok()) {
                if entry.file_type().is_file() {
                    let ext = entry.path().extension().and_then(|e| e.to_str()).unwrap_or("").to_lowercase();
                    if ext == "ttf" || ext == "otf" || ext == "woff" || ext == "woff2" {
                        paths.push(entry.into_path());
                    }
                }
            }
            println!("Found {} font files in {}", paths.len(), dir);

            let metas: Vec<FontMeta> = paths.par_iter().filter_map(|p| {
                let m = parse_font(p);
                if m.is_none() {
                    println!("Failed to parse font: {:?}", p);
                }
                m
            }).collect();
            println!("Successfully parsed {} font metas", metas.len());

            let mut db = state.db.lock().map_err(|e| e.to_string())?;
            let tx = db.transaction().map_err(|e| e.to_string())?;
            
            let mut added = 0;
            for meta in &metas {
                let res = tx.execute(
                    "INSERT OR IGNORE INTO fonts (file_path, family, subfamily, postscript_name, is_variable, has_arabic)
                     VALUES (?1, ?2, ?3, ?4, ?5, ?6)",
                    rusqlite::params![meta.file_path, meta.family, meta.subfamily, meta.postscript_name, meta.is_variable, meta.has_arabic],
                );
                if res.is_ok() { added += 1; }
            }
            tx.commit().map_err(|e| e.to_string())?;
            println!("Successfully inserted {} new fonts into database from {}", added, dir);
            total_added += added;
        } else {
            println!("Directory does not exist: {}", dir);
        }
    }
    
    Ok(total_added)
}

#[tauri::command]
pub fn add_font_tag(state: State<'_, DbState>, font_id: i64, tag: String) -> Result<(), String> {
    let db = state.db.lock().map_err(|e| e.to_string())?;
    db.execute(
        "INSERT OR IGNORE INTO tags (font_id, tag) VALUES (?1, ?2)",
        rusqlite::params![font_id, tag],
    ).map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
pub fn remove_font_tag(state: State<'_, DbState>, font_id: i64, tag: String) -> Result<(), String> {
    let db = state.db.lock().map_err(|e| e.to_string())?;
    db.execute(
        "DELETE FROM tags WHERE font_id = ?1 AND tag = ?2",
        rusqlite::params![font_id, tag],
    ).map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
pub fn get_font_tags(state: State<'_, DbState>, font_id: i64) -> Result<Vec<String>, String> {
    let db = state.db.lock().map_err(|e| e.to_string())?;
    let mut stmt = db.prepare("SELECT tag FROM tags WHERE font_id = ?1").map_err(|e| e.to_string())?;
    let mut rows = stmt.query(rusqlite::params![font_id]).map_err(|e| e.to_string())?;
    let mut tags = Vec::new();
    while let Some(row) = rows.next().map_err(|e| e.to_string())? {
        tags.push(row.get(0).unwrap_or_default());
    }
    Ok(tags)
}

#[tauri::command]
pub fn get_all_tags(state: State<'_, DbState>) -> Result<Vec<String>, String> {
    let db = state.db.lock().map_err(|e| e.to_string())?;
    let mut stmt = db.prepare("SELECT DISTINCT tag FROM tags ORDER BY tag ASC").map_err(|e| e.to_string())?;
    let mut rows = stmt.query([]).map_err(|e| e.to_string())?;
    let mut tags = Vec::new();
    while let Some(row) = rows.next().map_err(|e| e.to_string())? {
        tags.push(row.get(0).unwrap_or_default());
    }
    Ok(tags)
}
