import React, { useRef, useState, useEffect } from 'react';
import { Button } from './Button';
import { Trash2, Check } from 'lucide-react';

interface SignaturePadProps {
  onSave: (dataUrl: string) => void;
  onClear?: () => void;
  error?: string;
}

export const SignaturePad: React.FC<SignaturePadProps> = ({ onSave, onClear, error }) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [isEmpty, setIsEmpty] = useState(true);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set drawing properties
    ctx.strokeStyle = '#1E5AA8'; // Forge Blue
    ctx.lineWidth = 3;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    // Handle high DPI displays
    const rect = canvas.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.scale(dpr, dpr);
    
    // Fill canvas background to white (so output image has clean background)
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, rect.width, rect.height);
  }, []);

  const getCoordinates = (e: React.MouseEvent | React.TouchEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };

    const rect = canvas.getBoundingClientRect();
    
    // Support Touch/Mouse coords
    let clientX = 0;
    let clientY = 0;

    if ('touches' in e) {
      if (e.touches.length === 0) return { x: 0, y: 0 };
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
    } else {
      clientX = e.clientX;
      clientY = e.clientY;
    }

    return {
      x: clientX - rect.left,
      y: clientY - rect.top,
    };
  };

  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const coords = getCoordinates(e);
    ctx.beginPath();
    ctx.moveTo(coords.x, coords.y);
    setIsDrawing(true);
    setIsEmpty(false);
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    e.preventDefault();

    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const coords = getCoordinates(e);
    ctx.lineTo(coords.x, coords.y);
    ctx.stroke();
  };

  const stopDrawing = () => {
    if (!isDrawing) return;
    setIsDrawing(false);
    
    // Auto-save stroke to form callback
    saveSignature();
  };

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, rect.width, rect.height);
    
    setIsEmpty(true);
    if (onClear) onClear();
  };

  const saveSignature = () => {
    const canvas = canvasRef.current;
    if (!canvas || isEmpty) return;

    const dataUrl = canvas.toDataURL('image/png');
    onSave(dataUrl);
  };

  return (
    <div className="w-full">
      <label className="block text-xs font-semibold text-forgeGray-500 mb-1.5 ml-1">
        Customer Digital Signature
      </label>
      <div className={`relative border rounded-xl overflow-hidden ${error ? 'border-red-400' : 'border-forgeGray-200'}`}>
        <canvas
          ref={canvasRef}
          onMouseDown={startDrawing}
          onMouseMove={draw}
          onMouseUp={stopDrawing}
          onMouseLeave={stopDrawing}
          onTouchStart={startDrawing}
          onTouchMove={draw}
          onTouchEnd={stopDrawing}
          className="w-full h-40 bg-white cursor-crosshair block"
        />
        
        {/* Buttons Overlay */}
        <div className="absolute right-2 bottom-2 flex items-center space-x-1">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={clearCanvas}
            className="h-8 w-8 !p-0 flex items-center justify-center rounded-lg border-forgeGray-300 hover:bg-red-50 text-forgeGray-600 hover:text-red-500 hover:border-red-200"
            title="Clear signature"
          >
            <Trash2 className="w-4 h-4" />
          </Button>
          {!isEmpty && (
            <Button
              type="button"
              variant="success"
              size="sm"
              onClick={saveSignature}
              className="h-8 w-8 !p-0 flex items-center justify-center rounded-lg"
              title="Confirm signature"
            >
              <Check className="w-4 h-4" />
            </Button>
          )}
        </div>
        
        {isEmpty && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none text-xs text-forgeGray-400">
            Sign here using mouse or finger
          </div>
        )}
      </div>

      {error && (
        <p className="mt-1 text-xs text-red-500 font-medium pl-1 animate-fade-in">
          {error}
        </p>
      )}
    </div>
  );
};
