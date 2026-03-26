import { useEffect } from 'react';
import { AnimatePresence, motion } from 'framer-motion';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
}

export function Overlay({ isOpen, onClose, title, children }: Props) {
  // ESC key dismissal
  useEffect(() => {
    if (!isOpen) return;
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen, onClose]);

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            className="overlay-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.1 }}
            onClick={onClose}
          />
          <motion.div
            className="overlay-panel"
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.96 }}
            transition={{ duration: 0.15, ease: [0.16, 1, 0.3, 1] }}
          >
            <div className="overlay-topbar">
              <h2 className="overlay-title">{title}</h2>
              <button type="button" className="overlay-close" onClick={onClose}>
                ✕
              </button>
            </div>
            <div className="overlay-content">{children}</div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
