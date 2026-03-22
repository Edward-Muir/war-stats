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
            onClick={onClose}
          />
          <motion.div
            className="overlay-panel"
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 30, stiffness: 300, bounce: 0 }}
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
