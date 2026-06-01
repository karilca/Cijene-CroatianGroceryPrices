import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Button } from '../ui/Button';

interface ConfirmDialogProps {
  isOpen: boolean;
  title: string;
  message: string;
  confirmLabel: string;
  cancelLabel: string;
  onConfirm: () => void;
  onCancel: () => void;
  isLoading?: boolean;
}

export const ConfirmDialog: React.FC<ConfirmDialogProps> = ({
  isOpen,
  title,
  message,
  confirmLabel,
  cancelLabel,
  onConfirm,
  onCancel,
  isLoading = false,
}) => {
  const [mounted, setMounted] = useState(false);
  const [isAnimateIn, setIsAnimateIn] = useState(false);

  useEffect(() => {
    setMounted(true);
    return () => setMounted(false);
  }, []);

  useEffect(() => {
    if (isOpen) {
      const timer = setTimeout(() => setIsAnimateIn(true), 20);
      return () => clearTimeout(timer);
    } else {
      setIsAnimateIn(false);
    }
  }, [isOpen]);

  if (!isOpen || !mounted) return null;

  return createPortal(
    <div
      className={`app-modal-overlay transition-all duration-300 ${
        isAnimateIn ? 'bg-black/35 backdrop-blur-[4px]' : 'bg-black/0 backdrop-blur-none'
      }`}
      style={{ zIndex: 9999 }}
    >
      <div
        className={`w-full max-w-md rounded-xl border border-gray-100 bg-white shadow-2xl overflow-hidden
          transition-all duration-300 transform
          ${isAnimateIn ? 'scale-100 opacity-100 translate-y-0' : 'scale-95 opacity-0 translate-y-4'}`}
      >
        <div className="p-6">
          <h2 className="text-lg font-bold text-gray-900">{title}</h2>
          <p className="mt-2 text-sm text-gray-600">{message}</p>
        </div>
        <div className="flex gap-2 border-t border-gray-100 bg-gray-50 p-4">
          <Button
            type="button"
            variant="ghost"
            onClick={onCancel}
            disabled={isLoading}
            className="flex-1"
          >
            {cancelLabel}
          </Button>
          <Button
            type="button"
            variant="danger"
            onClick={onConfirm}
            isLoading={isLoading}
            className="flex-1"
          >
            {confirmLabel}
          </Button>
        </div>
      </div>
    </div>, document.body
  );
};