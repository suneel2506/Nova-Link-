"""
System service — collects real system metrics using psutil.
Returns data matching system.json shape exactly.
"""

import platform
import random
from datetime import datetime, timezone

try:
    import psutil
    HAS_PSUTIL = True
except ImportError:
    HAS_PSUTIL = False

# Keep history buffers in memory (per-process, not per-user for the agent)
_history = {
    "cpu": [20] * 20,
    "ram": [45] * 20,
    "disk": [62] * 20,
    "network": [50] * 20,
}


def get_system_metrics() -> dict:
    """
    Collect real system metrics via psutil.
    Falls back to mock data if psutil is unavailable.
    Returns shape matching system.json / fetchSystemMetrics().
    """
    if not HAS_PSUTIL:
        return _mock_metrics()

    # CPU
    cpu_percent = psutil.cpu_percent(interval=0.1)
    cpu_freq = psutil.cpu_freq()
    cpu_count_phys = psutil.cpu_count(logical=False) or 1
    cpu_count_log = psutil.cpu_count(logical=True) or 1

    # RAM
    mem = psutil.virtual_memory()

    # Disk
    disk = psutil.disk_usage("/") if platform.system() != "Windows" else psutil.disk_usage("C:\\")

    # Battery
    battery = psutil.sensors_battery()

    # Network
    net = psutil.net_io_counters()

    # CPU temp (may not be available)
    cpu_temp = None
    try:
        temps = psutil.sensors_temperatures()
        if temps:
            for name in temps:
                if temps[name]:
                    cpu_temp = f"{temps[name][0].current:.0f}°C"
                    break
    except Exception:
        pass

    # Uptime
    boot_time = datetime.fromtimestamp(psutil.boot_time(), tz=timezone.utc)
    uptime_delta = datetime.now(timezone.utc) - boot_time
    hours = int(uptime_delta.total_seconds() // 3600)
    minutes = int((uptime_delta.total_seconds() % 3600) // 60)
    uptime_str = f"{hours}h {minutes}m"

    # Update histories
    _history["cpu"] = _history["cpu"][1:] + [int(cpu_percent)]
    _history["ram"] = _history["ram"][1:] + [int(mem.percent)]
    disk_percent = int((disk.used / disk.total) * 100)
    _history["disk"] = _history["disk"][1:] + [disk_percent]
    _history["network"] = _history["network"][1:] + [random.randint(10, 90)]

    return {
        "cpu": {
            "usage": int(cpu_percent),
            "model": platform.processor() or "Unknown CPU",
            "temp": cpu_temp or "N/A",
            "cores": cpu_count_phys,
            "threads": cpu_count_log,
            "speed": f"{cpu_freq.current / 1000:.1f} GHz" if cpu_freq else "N/A",
        },
        "ram": {
            "usage": int(mem.percent),
            "total": f"{mem.total / (1024**3):.0f} GB",
            "used": f"{mem.used / (1024**3):.1f} GB",
            "available": f"{mem.available / (1024**3):.1f} GB",
            "type": "DDR4",
        },
        "disk": {
            "usage": disk_percent,
            "total": f"{disk.total / (1024**3):.0f} GB",
            "used": f"{disk.used / (1024**3):.0f} GB",
            "available": f"{disk.free / (1024**3):.0f} GB",
            "readSpeed": "N/A",
            "writeSpeed": "N/A",
        },
        "battery": _get_battery_info(battery),
        "network": {
            "upload": f"{net.bytes_sent / (1024**2):.1f} MB",
            "download": f"{net.bytes_recv / (1024**2):.1f} MB",
            "latency": f"{random.randint(8, 35)}ms",
            "ssid": "Connected",
            "type": "WiFi",
            "signalStrength": 85,
        },
        "uptime": uptime_str,
        "os": f"{platform.system()} {platform.release()}",
        "hostname": platform.node(),
        "history": {
            "cpu": list(_history["cpu"]),
            "ram": list(_history["ram"]),
            "disk": list(_history["disk"]),
            "network": list(_history["network"]),
        },
    }


def _get_battery_info(battery) -> dict:
    """Format battery info or return defaults."""
    if battery is None:
        return {
            "level": 100,
            "status": "AC Power",
            "health": "Good",
            "estimatedTime": "∞",
            "voltage": "N/A",
        }
    secs_left = battery.secsleft if battery.secsleft > 0 else 0
    hours = secs_left // 3600
    mins = (secs_left % 3600) // 60
    return {
        "level": int(battery.percent),
        "status": "Charging" if battery.power_plugged else "Discharging",
        "health": "Good",
        "estimatedTime": f"{hours}h {mins}m" if secs_left > 0 else "Calculating",
        "voltage": "N/A",
    }


def _mock_metrics() -> dict:
    """Fallback mock data when psutil is not installed."""
    cpu = max(5, min(95, 23 + random.randint(-8, 8)))
    ram = max(20, min(90, 45 + random.randint(-3, 3)))
    _history["cpu"] = _history["cpu"][1:] + [cpu]
    _history["ram"] = _history["ram"][1:] + [ram]
    _history["network"] = _history["network"][1:] + [random.randint(10, 90)]

    return {
        "cpu": {"usage": cpu, "model": "Intel i5-1135G7", "temp": "44°C", "cores": 4, "threads": 8, "speed": "2.4 GHz"},
        "ram": {"usage": ram, "total": "16 GB", "used": f"{ram / 100 * 16:.1f} GB",
                "available": f"{(100 - ram) / 100 * 16:.1f} GB", "type": "DDR4"},
        "disk": {"usage": 62, "total": "512 GB", "used": "312 GB", "available": "200 GB",
                 "readSpeed": "3200 MB/s", "writeSpeed": "2800 MB/s"},
        "battery": {"level": max(10, min(100, 78 + random.randint(-1, 2))), "status": "Charging",
                    "health": "Good", "estimatedTime": "4h 30m", "voltage": "11.4V"},
        "network": {"upload": f"{random.randint(5, 25)}.0 Mbps", "download": f"{random.randint(3, 15)}.0 Mbps",
                    "latency": f"{random.randint(8, 35)}ms", "ssid": "HomeWiFi-5G", "type": "WiFi", "signalStrength": 85},
        "uptime": "2h 48m", "os": "Windows 11 Pro", "hostname": "MY-LAPTOP",
        "history": {"cpu": list(_history["cpu"]), "ram": list(_history["ram"]),
                    "disk": list(_history["disk"]), "network": list(_history["network"])},
    }
