import React from "react";
import "./DocumentViewer.css";

interface DocumentViewerProps {
  src: string;
  title?: string;
}

export const DocumentViewer: React.FC<DocumentViewerProps> = ({ src, title }) => {
  return (
    <div className="document-viewer">
      <div className="document-viewer-header">
        <span className="document-viewer-title">{title || "Recovered File"}</span>
        <div className="document-viewer-status">
          <span className="status-dot"></span>
          DECRYPTED
        </div>
      </div>
      <div className="document-viewer-content">
        <div className="document-image-container">
          <img src={src} alt="Secret Document" className="document-image" />
          <div className="document-scan-line"></div>
          <div className="document-glitch-overlay"></div>
        </div>
      </div>
      <div className="document-viewer-footer">
        <div className="footer-info">SECURITY LEVEL: TOP SECRET</div>
        <div className="footer-warning">DO NOT DISTRIBUTE</div>
      </div>
    </div>
  );
};
