import React, { createContext, useContext, useState } from 'react';
import CustomDialog from '../components/CustomDialog';

const DialogContext = createContext(null);

export function DialogProvider({ children }) {
  const [dialogConfig, setDialogConfig] = useState({
    isOpen: false,
    title: '',
    message: '',
    type: 'info',
    isConfirm: false,
    confirmLabel: 'Confirm',
    cancelLabel: 'Cancel',
    onConfirm: null,
    onCancel: null
  });

  const triggerAlert = (title, message, type = 'info') => {
    return new Promise((resolve) => {
      setDialogConfig({
        isOpen: true,
        title,
        message,
        type,
        isConfirm: false,
        confirmLabel: 'OK',
        cancelLabel: '',
        onConfirm: () => {
          setDialogConfig(prev => ({ ...prev, isOpen: false }));
          resolve(true);
        },
        onCancel: null
      });
    });
  };

  const triggerConfirm = (title, message, type = 'warning', confirmLabel = 'Confirm') => {
    return new Promise((resolve) => {
      setDialogConfig({
        isOpen: true,
        title,
        message,
        type,
        isConfirm: true,
        confirmLabel,
        cancelLabel: 'Cancel',
        onConfirm: () => {
          setDialogConfig(prev => ({ ...prev, isOpen: false }));
          resolve(true);
        },
        onCancel: () => {
          setDialogConfig(prev => ({ ...prev, isOpen: false }));
          resolve(false);
        }
      });
    });
  };

  return (
    <DialogContext.Provider value={{ triggerAlert, triggerConfirm }}>
      {children}
      <CustomDialog
        isOpen={dialogConfig.isOpen}
        title={dialogConfig.title}
        message={dialogConfig.message}
        type={dialogConfig.type}
        isConfirm={dialogConfig.isConfirm}
        confirmLabel={dialogConfig.confirmLabel}
        cancelLabel={dialogConfig.cancelLabel}
        onConfirm={dialogConfig.onConfirm}
        onCancel={dialogConfig.onCancel}
      />
    </DialogContext.Provider>
  );
}

export function useDialog() {
  const context = useContext(DialogContext);
  if (!context) {
    throw new Error('useDialog must be used within a DialogProvider');
  }
  return context;
}
