use std::fs;
use tauri::{Manager, Emitter};
use tauri_plugin_dialog::DialogExt;

// Learn more about Tauri commands at https://tauri.app/develop/calling-rust/
#[tauri::command]
fn greet(name: &str) -> String {
    format!("Hello, {}! You've been greeted from Rust!", name)
}

#[tauri::command]
async fn save_json_file(content: String) -> Result<String, String> {
    // 简化版本：直接保存到用户桌面
    let desktop_path = dirs::desktop_dir()
        .ok_or_else(|| "无法获取桌面路径".to_string())?;
    
    let file_path = desktop_path.join("ujson-export.json");
    
    // 写入文件
    match fs::write(&file_path, content) {
        Ok(_) => Ok(format!("文件已保存到: {}", file_path.display())),
        Err(e) => Err(format!("保存文件失败: {}", e)),
    }
}

#[tauri::command]
async fn save_ujson_file(content: String) -> Result<String, String> {
    // 保存UJson格式文件到用户桌面
    let desktop_path = dirs::desktop_dir()
        .ok_or_else(|| "无法获取桌面路径".to_string())?;
    
    let file_path = desktop_path.join("graph.ujson");
    
    // 写入文件
    match fs::write(&file_path, content) {
        Ok(_) => Ok(format!("UJson文件已保存到: {}", file_path.display())),
        Err(e) => Err(format!("保存UJson文件失败: {}", e)),
    }
}

#[tauri::command]
async fn save_ujson_to_path(file_path: String, content: String) -> Result<String, String> {
    // 保存到指定路径
    match fs::write(&file_path, content) {
        Ok(_) => Ok(format!("UJson文件已保存到: {}", file_path)),
        Err(e) => Err(format!("保存UJson文件失败: {}", e)),
    }
}

#[tauri::command]
async fn save_json_to_path(file_path: String, content: String) -> Result<String, String> {
    // 断言：确保文件路径不为空
    assert!(!file_path.trim().is_empty(), "文件路径不能为空");
    
    // 保存JSON到指定路径
    match fs::write(&file_path, content) {
        Ok(_) => Ok(format!("JSON文件已保存到: {}", file_path)),
        Err(e) => Err(format!("保存JSON文件失败: {}", e)),
    }
}

#[tauri::command]
async fn browse_json_save_path(app_handle: tauri::AppHandle) -> Result<String, String> {
    // 打开保存文件对话框，专门用于JSON导出
    let file_path = app_handle.dialog()
        .file()
        .add_filter("JSON files", &["json"])
        .set_file_name("output.json")
        .blocking_save_file();
    
    match file_path {
        Some(path) => {
            let path_buf = path.as_path().unwrap();
            Ok(path_buf.to_string_lossy().to_string())
        }
        None => Err("用户取消了文件选择".to_string()),
    }
}

#[tauri::command]
async fn save_ujson_file_as(app_handle: tauri::AppHandle, content: String) -> Result<String, String> {
    // 打开保存文件对话框
    let file_path = app_handle.dialog()
        .file()
        .add_filter("UJson files", &["ujson"])
        .add_filter("JSON files", &["json"])
        .set_file_name("graph.ujson")
        .blocking_save_file();
    
    match file_path {
        Some(path) => {
            let path_buf = path.as_path().unwrap();
            // 写入文件
            match fs::write(path_buf, content) {
                Ok(_) => Ok(path_buf.to_string_lossy().to_string()),
                Err(e) => Err(format!("保存UJson文件失败: {}", e)),
            }
        }
        None => Err("用户取消了保存操作".to_string()),
    }
}

#[tauri::command]
async fn open_ujson_file(app_handle: tauri::AppHandle) -> Result<(String, String), String> {
    // 打开文件选择对话框
    let file_path = app_handle.dialog()
        .file()
        .add_filter("UJson files", &["ujson"])
        .add_filter("JSON files", &["json"])
        .blocking_pick_file();
    
    match file_path {
        Some(path) => {
            let path_buf = path.as_path().unwrap();
            // 读取文件内容
            match fs::read_to_string(path_buf) {
                Ok(content) => Ok((content, path_buf.to_string_lossy().to_string())),
                Err(e) => Err(format!("读取文件失败: {}", e)),
            }
        }
        None => Err("用户取消了打开操作".to_string()),
    }
}

#[tauri::command]
async fn update_window_title(app_handle: tauri::AppHandle, title: String) -> Result<(), String> {
    if let Some(window) = app_handle.get_webview_window("main") {
        window.set_title(&title).map_err(|e| format!("设置窗口标题失败: {}", e))?;
    }
    Ok(())
}

#[tauri::command]
async fn check_scene_dirty_before_close() -> Result<bool, String> {
    // 这个命令会被前端调用来检查场景状态
    // 返回true表示可以关闭，false表示需要用户确认
    Ok(true)
}

#[tauri::command]
async fn import_file(app_handle: tauri::AppHandle) -> Result<String, String> {
    // 打开文件选择对话框
    let file_path = app_handle.dialog()
        .file()
        .add_filter("JSON & UJson files", &["json", "ujson"])
        .blocking_pick_file();
    
    match file_path {
        Some(path) => {
            // 返回文件路径
            match path.as_path() {
                Some(path_buf) => Ok(path_buf.to_string_lossy().to_string()),
                None => Err("无效的文件路径".to_string()),
            }
        }
        None => Err("用户取消了文件选择".to_string()),
    }
}

#[tauri::command]
async fn read_file_content(file_path: String) -> Result<String, String> {
    // 读取指定路径的文件内容
    match fs::read_to_string(file_path) {
        Ok(content) => Ok(content),
        Err(e) => Err(format!("读取文件内容失败: {}", e)),
    }
}

#[tauri::command]
async fn close_application() -> Result<(), String> {
    // 强制关闭应用程序，使用exit而不是window.close()避免循环触发
    std::process::exit(0);
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_dialog::init())
        .invoke_handler(tauri::generate_handler![greet, save_json_file, save_ujson_file, save_ujson_file_as, open_ujson_file, save_ujson_to_path, save_json_to_path, browse_json_save_path, update_window_title, check_scene_dirty_before_close, close_application, import_file, read_file_content])
        .setup(|app| {
            // 获取版本号并设置初始窗口标题
            let version = app.package_info().version.to_string();
            let title = format!("UJson {} -- 未保存*", version);
            
            // 获取主窗口并设置标题
            if let Some(window) = app.get_webview_window("main") {
                let _ = window.set_title(&title);
                
                // 监听窗口关闭事件
                let window_clone = window.clone();
                window.on_window_event(move |event| {
                    if let tauri::WindowEvent::CloseRequested { api, .. } = event {
                        // 阻止默认关闭行为
                        api.prevent_close();
                        
                        // 向前端发送关闭请求事件
                        let _ = window_clone.emit("close-requested", ());
                    }
                });
            }
            
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
