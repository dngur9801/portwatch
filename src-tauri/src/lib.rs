mod ports;

use tauri::{
    tray::{MouseButton, MouseButtonState, TrayIconBuilder, TrayIconEvent},
    Manager, WebviewWindow,
};
use tauri_plugin_positioner::{Position, WindowExt};

#[tauri::command]
fn get_listening_ports() -> Result<Vec<ports::PortEntry>, String> {
    ports::get_listening_ports()
}

#[tauri::command]
fn kill_process(pid: u32, force: bool) -> Result<(), String> {
    if pid == 0 {
        return Err("잘못된 PID".into());
    }
    let signal = if force { libc::SIGKILL } else { libc::SIGTERM };
    // Safety: kill(2) is a plain syscall; no memory is shared.
    let rc = unsafe { libc::kill(pid as libc::pid_t, signal) };
    if rc == 0 {
        Ok(())
    } else {
        Err(format!(
            "종료 실패 (PID {pid}): {}",
            std::io::Error::last_os_error()
        ))
    }
}

#[tauri::command]
fn hide_popover(window: WebviewWindow) {
    let _ = window.hide();
}

/// Show the popover anchored to the tray, or hide it if already visible.
fn toggle_popover(window: &WebviewWindow) {
    if window.is_visible().unwrap_or(false) {
        let _ = window.hide();
    } else {
        let _ = window.move_window(Position::TrayCenter);
        let _ = window.show();
        let _ = window.set_focus();
    }
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_positioner::init())
        .invoke_handler(tauri::generate_handler![
            get_listening_ports,
            kill_process,
            hide_popover
        ])
        .setup(|app| {
            // Menubar-only app: no Dock icon.
            #[cfg(target_os = "macos")]
            app.set_activation_policy(tauri::ActivationPolicy::Accessory);

            let window = app
                .get_webview_window("main")
                .expect("main window missing");

            // Menubar popover: hide when focus is lost (release only, so the
            // devtools stay usable during development).
            #[cfg(not(debug_assertions))]
            {
                let w = window.clone();
                window.on_window_event(move |event| {
                    if let tauri::WindowEvent::Focused(false) = event {
                        let _ = w.hide();
                    }
                });
            }

            let tray_window = window.clone();
            let tray_icon =
                tauri::image::Image::from_bytes(include_bytes!("../icons/tray.png"))?;
            TrayIconBuilder::with_id("main-tray")
                .icon(tray_icon)
                .icon_as_template(true)
                .tooltip("PortWatch")
                .on_tray_icon_event(move |tray, event| {
                    // Forward to positioner so TrayCenter anchoring works.
                    tauri_plugin_positioner::on_tray_event(tray.app_handle(), &event);
                    if let TrayIconEvent::Click {
                        button: MouseButton::Left,
                        button_state: MouseButtonState::Up,
                        ..
                    } = event
                    {
                        toggle_popover(&tray_window);
                    }
                })
                .build(app)?;

            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
