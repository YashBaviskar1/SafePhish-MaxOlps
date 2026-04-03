rule Suspicious_PowerShell
{
    meta:
        description = "Detects PowerShell invocation in non-script files"
        severity = "high"
    strings:
        $ps1 = "powershell" nocase
        $ps2 = "pwsh" nocase
        $ps3 = "-encodedcommand" nocase
        $ps4 = "-exec bypass" nocase
        $ps5 = "invoke-expression" nocase
        $ps6 = "iex(" nocase
        $ps7 = "invoke-webrequest" nocase
        $ps8 = "downloadstring" nocase
    condition:
        any of them
}

rule Suspicious_VBA_Macro
{
    meta:
        description = "Detects suspicious VBA/macro patterns"
        severity = "high"
    strings:
        $m1 = "Auto_Open" nocase
        $m2 = "AutoOpen" nocase
        $m3 = "Document_Open" nocase
        $m4 = "Workbook_Open" nocase
        $m5 = "Shell(" nocase
        $m6 = "WScript.Shell" nocase
        $m7 = "CreateObject" nocase
        $m8 = "cmd.exe" nocase
    condition:
        2 of them
}

rule Suspicious_JavaScript
{
    meta:
        description = "Detects suspicious JavaScript patterns in documents"
        severity = "medium"
    strings:
        $js1 = "eval(" nocase
        $js2 = "unescape(" nocase
        $js3 = "fromCharCode" nocase
        $js4 = "document.write" nocase
        $js5 = "ActiveXObject" nocase
        $js6 = "XMLHttpRequest" nocase
    condition:
        2 of them
}

rule Suspicious_Obfuscation
{
    meta:
        description = "Detects common obfuscation techniques"
        severity = "medium"
    strings:
        $o1 = "chr(" nocase
        $o2 = "\\x" nocase
        $o3 = "base64" nocase
        $o4 = "String.fromCharCode" nocase
        $o5 = "charCodeAt" nocase
        $o6 = /[A-Za-z0-9+\/]{100,}={0,2}/
    condition:
        2 of them
}

rule Suspicious_Executable_Header
{
    meta:
        description = "Detects executable file signatures embedded in documents"
        severity = "critical"
    strings:
        $mz = { 4D 5A }
        $elf = { 7F 45 4C 46 }
        $pe = "This program cannot be run in DOS mode"
    condition:
        any of them
}

rule Suspicious_URL_Patterns
{
    meta:
        description = "Detects suspicious URL patterns in files"
        severity = "medium"
    strings:
        $u1 = /https?:\/\/[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}/
        $u2 = /https?:\/\/.*\.tk\//
        $u3 = /https?:\/\/.*\.ml\//
        $u4 = /https?:\/\/.*\.ga\//
        $u5 = /https?:\/\/bit\.ly\//
        $u6 = /https?:\/\/tinyurl\.com\//
    condition:
        any of them
}
