import { useEffect, useState, useCallback } from 'react';

interface ToastProps {
  message: string;
  type: 'success' | 'error';
  onClose: () => void;
}

export function Toast({ message, type, onClose }: ToastProps) {
  useEffect(() => {
    const t = setTimeout(onClose, 3500);
    return () => clearTimeout(t);
  }, [onClose]);

  return (
    <div className={`toast-notification toast-${type}`}>
      <span className="toast-icon">{type === 'success' ? '✓' : '✕'}</span>
      <span className="toast-text">{message}</span>
      <button onClick={onClose} className="toast-close-btn" aria-label="Close notification">✕</button>
    </div>
  );
}

export function useToast() {
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const show = useCallback((message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type });
  }, []);
  const hide = useCallback(() => {
    setToast(null);
  }, []);
  return { toast, show, hide };
}

export function SkeletonRow({ cols = 5 }: { cols?: number }) {
  return (
    <tr>
      {Array.from({ length: cols }).map((_, i) => (
        <td key={i} style={{ padding: '14px 16px' }}>
          <div className="skeleton-line" style={{ height: 16, width: `${60 + (i * 7) % 35}%` }} />
        </td>
      ))}
    </tr>
  );
}

interface StatCardProps {
  label: string;
  value: string | number;
  icon: React.ReactNode;
  change?: string;
  colorTheme?: 'indigo' | 'emerald' | 'amber' | 'rose' | string;
  gradient?: string;
}

export function StatCard({ label, value, icon, change, colorTheme = 'indigo' }: StatCardProps) {
  return (
    <div className={`stat-card theme-${colorTheme}`}>
      <div className="stat-card-top">
        <span className="stat-card-label">{label}</span>
        <div className={`stat-card-icon-badge badge-${colorTheme}`}>
          {icon}
        </div>
      </div>
      <div className="stat-card-main-val">
        {value}
      </div>
      {change ? (
        <div className="stat-card-caption">{change}</div>
      ) : (
        <div className="stat-card-caption-empty">&nbsp;</div>
      )}
    </div>
  );
}

interface ConfirmModalProps {
  title: string;
  message: string;
  onConfirm: () => void;
  onCancel: () => void;
  danger?: boolean;
}

export function ConfirmModal({ title, message, onConfirm, onCancel, danger = false }: ConfirmModalProps) {
  return (
    <div className="modal-backdrop">
      <div className="modal-card">
        <h3 className="modal-title">{title}</h3>
        <p className="modal-desc">{message}</p>
        <div className="modal-actions">
          <button className="btn-secondary" onClick={onCancel}>Cancel</button>
          <button className={danger ? 'btn-danger' : 'btn-primary'} onClick={onConfirm}>Confirm</button>
        </div>
      </div>
    </div>
  );
}
