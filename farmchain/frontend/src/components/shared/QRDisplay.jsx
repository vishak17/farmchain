import React, { useRef, useState } from 'react';
import { QRCodeCanvas } from 'qrcode.react';
import { Download, Copy, Check } from 'lucide-react';

const QRDisplay = ({ batchId = 'UNKNOWN', size = 200 }) => {
  const [copied, setCopied] = useState(false);
  const qrRef = useRef();

  const handleDownload = () => {
    const canvas = qrRef.current.querySelector('canvas');
    if (canvas) {
      const url = canvas.toDataURL("image/png");
      const a = document.createElement('a');
      a.download = `farmchain-qr-${batchId}.png`;
      a.href = url;
      a.click();
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(batchId);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="flex flex-col items-center">
      <div className="p-4 bg-white border-4 border-farm-green rounded-xl shadow-lg mb-4" ref={qrRef}>
        <QRCodeCanvas 
          value={JSON.stringify({ type: 'FARMCHAIN_BATCH', id: batchId })} 
          size={size} 
          level={"Q"}
          fgColor="#0f172a" 
          bgColor="#ffffff" 
        />
      </div>
      
      <div className="flex flex-col items-center w-full max-w-[250px] space-y-3">
        <div className="w-full flex items-center justify-between bg-farm-surface-2 border border-farm-border rounded px-3 py-2 cursor-pointer hover:bg-farm-surface-3 transition-colors" onClick={handleCopy}>
          <span className="font-mono text-sm text-farm-text truncate mr-2" title={batchId}>{batchId}</span>
          {copied ? <Check size={16} className="text-farm-green flex-shrink-0" /> : <Copy size={16} className="text-farm-muted hover:text-farm-text flex-shrink-0" />}
        </div>
        
        <button onClick={handleDownload} className="w-full btn-ghost flex items-center justify-center gap-2">
          <Download size={16} />
          <span>Download Label</span>
        </button>
      </div>
    </div>
  );
};

export default QRDisplay;
