"""
Files router — browse, upload, download, delete.
"""

from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, status
from sqlalchemy.orm import Session

from backend.database.engine import get_db
from backend.middleware.auth import get_current_user
from backend.models.user import User
from backend.services.file_service import browse_files, get_drives, delete_file_at, save_uploaded_file
from backend.services.activity_service import log_activity

router = APIRouter(prefix="/files", tags=["Files"])


@router.get("")
def list_files(
    path: str = "/",
    current_user: User = Depends(get_current_user),
):
    """Matches fetchFiles(path) → array of items."""
    return browse_files(path)


@router.get("/drives")
def list_drives(current_user: User = Depends(get_current_user)):
    """Matches fetchDrives() → drives array."""
    return get_drives()


@router.get("/transfers")
def list_transfers(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Matches fetchTransfers() → transfers array."""
    from backend.models.file_transfer import FileTransfer
    transfers = db.query(FileTransfer).filter(
        FileTransfer.user_id == current_user.id
    ).order_by(FileTransfer.created_at.desc()).limit(20).all()

    return [
        {
            "id": t.id,
            "name": t.name,
            "size": t.size,
            "sizeBytes": t.size_bytes,
            "direction": t.direction,
            "device": t.device,
            "time": t.created_at.strftime("%I:%M %p").lstrip("0") if t.created_at else "",
            "type": t.type,
            "status": t.status,
            "progress": t.progress,
        }
        for t in transfers
    ]


@router.post("/upload")
async def upload_file(
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Matches uploadFile(name) → { success, name, message }."""
    content = await file.read()
    save_uploaded_file(file.filename, content)

    # Log activity
    log_activity(db, current_user.id, "file_transfer",
                 f"File uploaded — {file.filename}", file_name=file.filename, icon="file")

    return {
        "success": True,
        "name": file.filename,
        "message": f"{file.filename} uploaded successfully",
    }


@router.delete("/{file_id}")
def delete_file(
    file_id: str,
    path: str = "",
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Matches deleteFile(id) → { success, message }."""
    if path:
        delete_file_at(path)

    log_activity(db, current_user.id, "file_download",
                 f"File deleted", icon="file")

    return {"success": True, "message": "File deleted successfully"}


@router.get("/download/{filename}")
def download_file(
    filename: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Matches downloadFile(name) → { success, name, message }."""
    log_activity(db, current_user.id, "file_download",
                 f"File downloaded — {filename}", file_name=filename, icon="download")

    return {
        "success": True,
        "name": filename,
        "message": f"{filename} download started",
    }
