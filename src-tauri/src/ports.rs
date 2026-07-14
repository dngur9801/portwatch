use serde::Serialize;
use std::process::Command;

#[derive(Serialize, Clone, Debug)]
#[serde(rename_all = "camelCase")]
pub struct PortEntry {
    pub port: u16,
    pub pid: u32,
    pub process: String,
    pub user: String,
    pub protocol: String,
    pub address: String,
    pub ip_version: String,
    pub is_system: bool,
}

/// Fields collected for the current open file (socket) while parsing.
#[derive(Default)]
struct FileAcc {
    ip_version: String,
    protocol: String,
    name: String,
}

/// Run `lsof` and parse listening TCP ports.
///
/// Uses `-F` field mode (machine-readable) rather than the columnar output,
/// which is fragile: command names get truncated and can contain spaces.
pub fn get_listening_ports() -> Result<Vec<PortEntry>, String> {
    let output = Command::new("lsof")
        .args(["-nP", "-iTCP", "-sTCP:LISTEN", "-FpcnLtP"])
        .output()
        .map_err(|e| format!("lsof 실행 실패: {e}"))?;

    // lsof exits non-zero when *some* handles are inaccessible but still
    // prints the accessible ones, so we parse stdout regardless of status.
    let stdout = String::from_utf8_lossy(&output.stdout);
    let mut entries = parse_lsof(&stdout);

    if entries.is_empty() && !output.status.success() && output.stdout.is_empty() {
        let stderr = String::from_utf8_lossy(&output.stderr);
        if !stderr.trim().is_empty() {
            return Err(format!("lsof 오류: {}", stderr.trim()));
        }
    }

    entries.sort_by(|a, b| a.port.cmp(&b.port).then(a.pid.cmp(&b.pid)));
    Ok(entries)
}

fn parse_lsof(stdout: &str) -> Vec<PortEntry> {
    let mut entries = Vec::new();

    let mut pid: u32 = 0;
    let mut command = String::new();
    let mut user = String::new();
    let mut file = FileAcc::default();
    let mut in_file = false;

    let flush = |file: &FileAcc,
                     pid: u32,
                     command: &str,
                     user: &str,
                     out: &mut Vec<PortEntry>| {
        if file.name.is_empty() {
            return;
        }
        if let Some((address, port)) = split_addr_port(&file.name) {
            out.push(PortEntry {
                port,
                pid,
                process: command.to_string(),
                user: user.to_string(),
                protocol: if file.protocol.is_empty() {
                    "TCP".into()
                } else {
                    file.protocol.clone()
                },
                address,
                ip_version: file.ip_version.clone(),
                is_system: is_system_process(pid, user),
            });
        }
    };

    for line in stdout.lines() {
        let (tag, value) = match line.split_at_checked(1) {
            Some(pair) => pair,
            None => continue,
        };
        match tag {
            "p" => {
                if in_file {
                    flush(&file, pid, &command, &user, &mut entries);
                }
                pid = value.parse().unwrap_or(0);
                command.clear();
                user.clear();
                file = FileAcc::default();
                in_file = false;
            }
            "c" => command = value.to_string(),
            "L" => user = value.to_string(),
            "f" => {
                if in_file {
                    flush(&file, pid, &command, &user, &mut entries);
                }
                file = FileAcc::default();
                in_file = true;
            }
            "t" => file.ip_version = value.to_string(),
            "P" => file.protocol = value.to_string(),
            "n" => file.name = value.to_string(),
            _ => {}
        }
    }
    if in_file {
        flush(&file, pid, &command, &user, &mut entries);
    }

    entries
}

/// Split an lsof NAME like `127.0.0.1:3000`, `[::1]:5173`, `*:8080`
/// into (address, port). Returns None if there is no numeric port.
fn split_addr_port(name: &str) -> Option<(String, u16)> {
    // Some entries look like "127.0.0.1:3000->..." for established conns,
    // but with -sTCP:LISTEN we only get the local listening socket.
    let name = name.split("->").next().unwrap_or(name);
    let idx = name.rfind(':')?;
    let (addr, port_str) = name.split_at(idx);
    let port: u16 = port_str[1..].parse().ok()?;
    Some((addr.to_string(), port))
}

/// Heuristic for "system" processes worth confirming before a kill.
fn is_system_process(pid: u32, user: &str) -> bool {
    pid <= 1000 || user == "root"
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn parses_field_mode_output() {
        // One process (node) with two sockets, plus a root system process.
        let sample = "\
p47704
cnode
Lwoohyuk-jo
f60
tIPv6
PTCP
n[::1]:3000
f61
tIPv4
PTCP
n127.0.0.1:8080
p1
claunchd
Lroot
f7
tIPv4
PTCP
n*:22
";
        let mut entries = parse_lsof(sample);
        entries.sort_by_key(|e| e.port);
        assert_eq!(entries.len(), 3);

        assert_eq!(entries[0].port, 22);
        assert_eq!(entries[0].process, "launchd");
        assert_eq!(entries[0].address, "*");
        assert!(entries[0].is_system);

        assert_eq!(entries[1].port, 3000);
        assert_eq!(entries[1].process, "node");
        assert_eq!(entries[1].address, "[::1]");
        assert_eq!(entries[1].ip_version, "IPv6");
        assert!(!entries[1].is_system);

        assert_eq!(entries[2].port, 8080);
        assert_eq!(entries[2].address, "127.0.0.1");
    }

    #[test]
    fn split_addr_port_variants() {
        assert_eq!(split_addr_port("127.0.0.1:3000"), Some(("127.0.0.1".into(), 3000)));
        assert_eq!(split_addr_port("[::1]:5173"), Some(("[::1]".into(), 5173)));
        assert_eq!(split_addr_port("*:8080"), Some(("*".into(), 8080)));
        assert_eq!(split_addr_port("no-port"), None);
    }
}
