"""
System router — real system metrics via psutil.
"""

from fastapi import APIRouter, Depends

from backend.middleware.auth import get_current_user
from backend.models.user import User
from backend.services.system_service import get_system_metrics

router = APIRouter(prefix="/system", tags=["System"])


@router.get("")
def system_metrics(current_user: User = Depends(get_current_user)):
    """Matches fetchSystemMetrics() → full system object."""
    return get_system_metrics()


@router.get("/processes")
def system_processes(current_user: User = Depends(get_current_user)):
    """Return running processes."""
    try:
        import psutil
        procs = []
        for p in psutil.process_iter(["pid", "name", "cpu_percent", "memory_percent"]):
            try:
                info = p.info
                if info["name"] and info["cpu_percent"] is not None:
                    procs.append({
                        "pid": info["pid"],
                        "name": info["name"],
                        "cpu": round(info["cpu_percent"], 1),
                        "memory": round(info["memory_percent"], 1),
                    })
            except (psutil.NoSuchProcess, psutil.AccessDenied):
                continue
        # Sort by CPU usage, top 50
        procs.sort(key=lambda x: x["cpu"], reverse=True)
        return procs[:50]
    except ImportError:
        return []


@router.get("/applications")
def running_applications(current_user: User = Depends(get_current_user)):
    """Return running GUI applications (Windows-focused)."""
    try:
        import psutil
        apps = []
        seen = set()
        for p in psutil.process_iter(["pid", "name", "status"]):
            try:
                info = p.info
                name = info["name"]
                if name and name not in seen and info["status"] == "running":
                    if not name.startswith("svc") and not name.startswith("System"):
                        apps.append({"pid": info["pid"], "name": name})
                        seen.add(name)
            except (psutil.NoSuchProcess, psutil.AccessDenied):
                continue
        return apps[:30]
    except ImportError:
        return []
