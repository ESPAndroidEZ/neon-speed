# Lets a phone on the home network reach the dev server running inside WSL2 (npm run dev, port 5173).
# WSL2 sits behind its own virtual network, so Windows has to forward the port and open it in the firewall.
# Run in PowerShell AS ADMINISTRATOR (Start > PowerShell > right click > Run as administrator):
#   powershell -ExecutionPolicy Bypass -File \\wsl.localhost\Ubuntu-26.04\home\carlos\projects\racer-blood\scripts\phone-access.ps1
# Re-run after a reboot or `wsl --shutdown` (the WSL address changes). Remove: add -Remove.
param([int]$Port = 5173, [switch]$Remove)

$rule = "Neon Speed dev $Port"
netsh interface portproxy delete v4tov4 listenport=$Port listenaddress=0.0.0.0 2>$null | Out-Null
Get-NetFirewallRule -DisplayName $rule -ErrorAction SilentlyContinue | Remove-NetFirewallRule
if ($Remove) { Write-Host "Removed port forward and firewall rule for $Port."; exit 0 }

$wslIp = ((wsl.exe hostname -I) -split '\s+' | Where-Object { $_ -match '^\d+\.\d+\.\d+\.\d+$' })[0]
if (-not $wslIp) { Write-Error "Could not read the WSL address. Is WSL running?"; exit 1 }

netsh interface portproxy add v4tov4 listenport=$Port listenaddress=0.0.0.0 connectport=$Port connectaddress=$wslIp | Out-Null
New-NetFirewallRule -DisplayName $rule -Direction Inbound -Protocol TCP -LocalPort $Port -Action Allow -Profile Private,Domain | Out-Null

$lan = Get-NetIPAddress -AddressFamily IPv4 | Where-Object { $_.PrefixOrigin -in 'Dhcp', 'Manual' -and $_.InterfaceAlias -notlike 'vEthernet*' } | Select-Object -First 1
Write-Host "Forwarding 0.0.0.0:$Port -> WSL $wslIp`:$Port"
Write-Host "On the phone (same router, Wi-Fi is fine): http://$($lan.IPAddress):$Port/"
$prof = (Get-NetConnectionProfile | Select-Object -First 1).NetworkCategory
if ($prof -eq 'Public') { Write-Host "Your network is set to PUBLIC: set it to Private (Settings > Network > Ethernet) or the firewall still blocks the phone." }
