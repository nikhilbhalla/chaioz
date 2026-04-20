from fastapi import APIRouter, UploadFile, File, HTTPException, Depends, Response, Query
from datetime import datetime, timezone
import uuid

from auth_utils import get_current_admin
from services.storage import put_object, get_object, build_path, MIME_FROM_EXT

router = APIRouter(prefix="/api/uploads", tags=["uploads"])


@router.post("/image")
async def upload_image(file: UploadFile = File(...), _: dict = Depends(get_current_admin)):
    ext = (file.filename or "").rsplit(".", 1)[-1].lower()
    if ext not in MIME_FROM_EXT:
        raise HTTPException(status_code=400, detail="Unsupported file type. Use jpg/png/webp/gif.")
    content_type = MIME_FROM_EXT[ext]
    data = await file.read()
    if len(data) > 5 * 1024 * 1024:
        raise HTTPException(status_code=400, detail="Max size 5MB")
    path = build_path(ext)
    try:
        result = put_object(path, data, content_type)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Upload failed: {e}")

    from server import db
    file_id = str(uuid.uuid4())
    await db.files.insert_one({
        "id": file_id,
        "storage_path": result["path"],
        "original_filename": file.filename,
        "content_type": content_type,
        "size": result.get("size", len(data)),
        "is_deleted": False,
        "created_at": datetime.now(timezone.utc).isoformat(),
    })
    # Public download URL (no auth required for menu images)
    return {
        "id": file_id,
        "url": f"/api/uploads/public/{result['path']}",
    }


@router.get("/public/{path:path}")
async def download_public(path: str):
    from server import db
    record = await db.files.find_one({"storage_path": path, "is_deleted": False}, {"_id": 0})
    if not record:
        raise HTTPException(status_code=404, detail="File not found")
    try:
        data, ct = get_object(path)
    except Exception:
        raise HTTPException(status_code=404, detail="File not found")
    return Response(content=data, media_type=record.get("content_type") or ct, headers={"Cache-Control": "public, max-age=86400"})
