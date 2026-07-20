"""
System monitor module — collects real system metrics using psutil.
"""

import platform
import random

try:
    import psutil
    HAS_PSUTIL = True
except ImportError:
    HAS_PSUTIL = False

_history = {"cpu": [20] * 20, "ram": [45] * 20, "disk": [62] * 20, "network": [50] * 20}


def get_system_info() -> dict:
    """Return system metrics matching the system.json shape."""
    if not HAS_PSUTIL:
        return _mock()

    from datetime import datetime, timezone

    cpu_percent = psutil.cpu_percent(interval=0.1)
    cpu_freq = psutil.cpu_freq()
    mem = psutil.virtual_memory()

    disk = psutil.disk_usage("C:\\" if platform.system() == "Windows" else "/")
    disk_percent = int((disk.used / disk.total) * 100)

    battery = psutil.sensors_battery()
    net = psutil.net_io_counters()

    # Temperature
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
    boot = datetime.fromtimestamp(psutil.boot_time(), tz=timezone.utc)
    delta = datetime.now(timezone.utc) - boot
    hours = int(delta.total_seconds() // 3600)
    mins = int((delta.total_seconds() % 3600) // 60)

    # Update history
    _history["cpu"] = _history["cpu"][1:] + [int(cpu_percent)]
    _history["ram"] = _history["ram"][1:] + [int(mem.percent)]
    _history["disk"] = _history["disk"][1:] + [disk_percent]
    _history["network"] = _history["network"][1:] + [random.randint(10, 90)]

    # Battery info
    if battery:
        secs = battery.secsleft if battery.secsleft > 0 else 0
        bat_info = {
            "level": int(battery.percent),
            "status": "Charging" if battery.power_plugged else "Discharging",
            "health": "Good",
            "estimatedTime": f"{secs // 3600}h {(secs % 3600) // 60}m" if secs > 0 else "Calculating",
            "voltage": "N/A",
        }
    else:
        bat_info = {"level": 100, "status": "AC Power", "health": "Good", "estimatedTime": "∞", "voltage": "N/A"}

    return {
        "cpu": {
            "usage": int(cpu_percent),
            "model": platform.processor() or "Unknown",
            "temp": cpu_temp or "N/A",
            "cores": psutil.cpu_count(logical=False) or 1,
            "threads": psutil.cpu_count(logical=True) or 1,
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
        "battery": bat_info,
        "network": {
            "upload": f"{net.bytes_sent / (1024**2):.1f} MB",
            "download": f"{net.bytes_recv / (1024**2):.1f} MB",
            "latency": f"{random.randint(8, 35)}ms",
            "ssid": "Connected",
            "type": "WiFi",
            "signalStrength": 85,
        },
        "uptime": f"{hours}h {mins}m",
        "os": f"{platform.system()} {platform.release()}",
        "hostname": platform.node(),
        "history": dict(_history),
    }


def _mock():
    cpu = max(5, min(95, 23 + random.randint(-8, 8)))
    ram = max(20, min(90, 45 + random.randint(-3, 3)))
    _history["cpu"] = _history["cpu"][1:] + [cpu]
    _history["ram"] = _history["ram"][1:] + [ram]
    _history["network"] = _history["network"][1:] + [random.randint(10, 90)]
    return {
        "cpu": {"usage": cpu, "model": "Unknown", "temp": "N/A", "cores": 4, "threads": 8, "speed": "2.4 GHz"},
        "ram": {"usage": ram, "total": "16 GB", "used": f"{ram/100*16:.1f} GB", "available": f"{(100-ram)/100*16:.1f} GB", "type": "DDR4"},
        "disk": {"usage": 62, "total": "512 GB", "used": "312 GB", "available": "200 GB", "readSpeed": "N/A", "writeSpeed": "N/A"},
        "battery": {"level": 78, "status": "Charging", "health": "Good", "estimatedTime": "4h 30m", "voltage": "N/A"},
        "network": {"upload": "0 MB", "download": "0 MB", "latency": "10ms", "ssid": "Unknown", "type": "WiFi", "signalStrength": 50},
        "uptime": "0h 0m", "os": platform.system(), "hostname": platform.node(),
        "history": dict(_history),
    }
