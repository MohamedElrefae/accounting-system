import React, { useState, useRef } from 'react'
import { Paperclip, X, Eye, Download, Trash2, FileText, Image, File } from 'lucide-react'

interface Attachment {
  id: string
  filename: string
  type: string
  size: number
  url: string
  uploadedAt: Date
}

interface AttachmentsCellProps {
  lineId: string
  attachments: Attachment[]
  onUpload: (files: File[]) => void
  onDelete: (attachmentId: string) => void
  onView?: (attachment: Attachment) => void
  onDownload?: (attachment: Attachment) => void
}

export const AttachmentsCell: React.FC<AttachmentsCellProps> = ({
  lineId,
  attachments,
  onUpload,
  onDelete,
  onView,
  onDownload,
}) => {
  const [isDragging, setIsDragging] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    const files = Array.from(e.dataTransfer.files)
    onUpload(files)
  }
  
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }
  
  const handleDragLeave = () => {
    setIsDragging(false)
  }
  
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      onUpload(Array.from(e.target.files))
    }
  }
  
  const handleDeleteAttachment = (attachmentId: string) => {
    onDelete(attachmentId)
  }
  
  const getFileIcon = (type: string) => {
    if (type.startsWith('image/')) {
      return <Image size={16} />
    } else if (type === 'application/pdf') {
      return <FileText size={16} />
    } else {
      return <File size={16} />
    }
  }
  
  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }
  
  return (
    <div 
      className={`attachments-cell ${isDragging ? 'dragging' : ''}`}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      <style>{`
        .attachments-cell {
          position: relative;
          display: flex;
          align-items: center;
          gap: 8px;
          min-height: 32px;
          padding: 4px;
          border-radius: 6px;
          transition: all 0.2s;
        }
        
        .attachments-cell.dragging {
          background: #dbeafe;
          border: 2px dashed #3b82f6;
        }
        
        .upload-btn {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 32px;
          height: 32px;
          border: 1px solid #d1d5db;
          background: #ffffff;
          border-radius: 6px;
          color: #6b7280;
          cursor: pointer;
          transition: all 0.2s;
          position: relative;
        }
        
        .upload-btn:hover {
          background: #f3f4f6;
          color: #374151;
          border-color: #9ca3af;
        }
        
        .attachment-count {
          position: absolute;
          top: -6px;
          right: -6px;
          background: #3b82f6;
          color: white;
          font-size: 10px;
          font-weight: 600;
          padding: 2px 4px;
          border-radius: 8px;
          min-width: 16px;
          text-align: center;
        }
        
        .attachments-preview {
          display: flex;
          align-items: center;
          gap: 4px;
          flex: 1;
        }
        
        .attachment-thumbnail {
          display: flex;
          align-items: center;
          gap: 4px;
          padding: 4px 8px;
          background: #f9fafb;
          border: 1px solid #e5e7eb;
          border-radius: 4px;
          font-size: 12px;
          color: #374151;
          position: relative;
          max-width: 120px;
          overflow: hidden;
        }
        
        .attachment-thumbnail:hover {
          background: #f3f4f6;
        }
        
        .delete-attachment {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 16px;
          height: 16px;
          background: #ef4444;
          color: white;
          border: none;
          border-radius: 50%;
          cursor: pointer;
          font-size: 10px;
          padding: 0;
          margin-left: 4px;
        }
        
        .delete-attachment:hover {
          background: #dc2626;
        }
        
        .more-attachments {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 24px;
          height: 24px;
          background: #e5e7eb;
          color: #6b7280;
          border-radius: 4px;
          font-size: 11px;
          font-weight: 600;
        }
        
        .attachments-gallery {
          background: #ffffff;
          border: 1px solid #e5e7eb;
          border-radius: 8px;
          padding: 16px;
          margin-top: 8px;
        }
        
        .gallery-header {
          display: flex;
          align-items: center;
          gap: 8px;
          margin-bottom: 12px;
          font-weight: 600;
          color: #374151;
        }
        
        .gallery-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
          gap: 12px;
        }
        
        .attachment-card {
          display: flex;
          flex-direction: column;
          border: 1px solid #e5e7eb;
          border-radius: 6px;
          padding: 12px;
          background: #ffffff;
          transition: all 0.2s;
        }
        
        .attachment-card:hover {
          border-color: #d1d5db;
          box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
        }
        
        .attachment-preview {
          display: flex;
          align-items: center;
          justify-content: center;
          height: 60px;
          margin-bottom: 8px;
          background: #f9fafb;
          border-radius: 4px;
          color: #6b7280;
        }
        
        .attachment-preview img {
          max-width: 100%;
          max-height: 100%;
          object-fit: cover;
          border-radius: 4px;
        }
        
        .attachment-info {
          flex: 1;
          min-width: 0;
        }
        
        .attachment-name {
          font-size: 13px;
          font-weight: 500;
          color: #374151;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
          margin-bottom: 2px;
        }
        
        .attachment-meta {
          font-size: 11px;
          color: #6b7280;
        }
        
        .attachment-actions {
          display: flex;
          gap: 4px;
          margin-top: 8px;
        }
        
        .attachment-action-btn {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 28px;
          height: 28px;
          border: 1px solid #d1d5db;
          background: #ffffff;
          border-radius: 4px;
          color: #6b7280;
          cursor: pointer;
          transition: all 0.2s;
        }
        
        .attachment-action-btn:hover {
          background: #f3f4f6;
          color: #374151;
        }
        
        .attachment-action-btn.danger:hover {
          background: #fef2f2;
          color: #ef4444;
          border-color: #fecaca;
        }
      `}</style>
      
      {/* Upload Button */}
      <button
        className="upload-btn"
        onClick={() => fileInputRef.current?.click()}
        title="رفع مرفق"
      >
        <Paperclip size={16} />
        {attachments.length > 0 && (
          <span className="attachment-count">{attachments.length}</span>
        )}
      </button>
      
      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept=".pdf,.jpg,.jpeg,.png,.xlsx,.docx,.txt"
        onChange={handleFileSelect}
        style={{ display: 'none' }}
      />
      
      {/* Attachments Preview */}
      {attachments.length > 0 && (
        <div className="attachments-preview">
          {attachments.slice(0, 3).map((attachment) => (
            <div key={attachment.id} className="attachment-thumbnail">
              {getFileIcon(attachment.type)}
              <span style={{ 
                maxWidth: '80px', 
                overflow: 'hidden', 
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap'
              }}>
                {attachment.filename}
              </span>
              <button
                className="delete-attachment"
                onClick={() => handleDeleteAttachment(attachment.id)}
                title="حذف"
              >
                ✕
              </button>
            </div>
          ))}
          {attachments.length > 3 && (
            <div className="more-attachments">
              +{attachments.length - 3}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// Attachments Gallery Component
interface AttachmentsGalleryProps {
  attachments: Attachment[]
  onView?: (attachment: Attachment) => void
  onDownload?: (attachment: Attachment) => void
  onDelete: (attachmentId: string) => void
}

export const AttachmentsGallery: React.FC<AttachmentsGalleryProps> = ({
  attachments,
  onView,
  onDownload,
  onDelete,
}) => {
  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat('ar-SA', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(date)
  }
  
  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }
  
  const isImage = (type: string) => {
    return type.startsWith('image/')
  }
  
  const getFileIcon = (type: string, size: number = 48) => {
    if (type.startsWith('image/')) {
      return <Image size={size} />
    } else if (type === 'application/pdf') {
      return <FileText size={size} />
    } else {
      return <File size={size} />
    }
  }
  
  return (
    <div className="attachments-gallery">
      <div className="gallery-header">
        <Paperclip size={18} />
        <span>المرفقات ({attachments.length})</span>
      </div>
      
      <div className="gallery-grid">
        {attachments.map((attachment) => (
          <div key={attachment.id} className="attachment-card">
            {/* Preview */}
            <div className="attachment-preview">
              {isImage(attachment.type) ? (
                <img 
                  src={attachment.url} 
                  alt={attachment.filename}
                  onError={(e) => {
                    e.currentTarget.style.display = 'none'
                    e.currentTarget.nextElementSibling.style.display = 'flex'
                  }}
                />
              ) : null}
              <div style={{ display: isImage(attachment.type) ? 'none' : 'flex' }}>
                {getFileIcon(attachment.type)}
              </div>
            </div>
            
            {/* Info */}
            <div className="attachment-info">
              <div className="attachment-name" title={attachment.filename}>
                {attachment.filename}
              </div>
              <div className="attachment-meta">
                {formatFileSize(attachment.size)} • {formatDate(attachment.uploadedAt)}
              </div>
            </div>
            
            {/* Actions */}
            <div className="attachment-actions">
              {onView && (
                <button 
                  className="attachment-action-btn"
                  onClick={() => onView(attachment)}
                  title="عرض"
                >
                  <Eye size={16} />
                </button>
              )}
              {onDownload && (
                <button 
                  className="attachment-action-btn"
                  onClick={() => onDownload(attachment)}
                  title="تحميل"
                >
                  <Download size={16} />
                </button>
              )}
              <button 
                className="attachment-action-btn danger"
                onClick={() => onDelete(attachment.id)}
                title="حذف"
              >
                <Trash2 size={16} />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

export default AttachmentsCell
