import { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { BookOpen, Check, Moon, Save, SlidersHorizontal, Sun, X } from 'lucide-react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onOpenMethodology: () => void;
  onOpenSettings: () => void;
  onSetAsDefault: () => void;
  theme: 'light' | 'dark';
  onToggleTheme: () => void;
}

const menuItemClass = `
  flex items-center gap-3 w-full px-4 py-3
  text-left text-foreground
  hover:bg-accent
  transition-colors
  min-h-[48px]
`;

const iconClass = 'w-5 h-5 text-muted-foreground flex-shrink-0';

export function BurgerMenu({
  isOpen,
  onClose,
  onOpenMethodology,
  onOpenSettings,
  onSetAsDefault,
  theme,
  onToggleTheme,
}: Props) {
  const [saved, setSaved] = useState(false);

  const handleSetAsDefault = () => {
    onSetAsDefault();
    setSaved(true);
    setTimeout(() => setSaved(false), 1500);
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            className="fixed inset-0 bg-black/25 z-[55]"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />

          {/* Drawer */}
          <motion.div
            className="fixed top-0 right-0 bottom-0 w-64 bg-card border-l border-border shadow-sm z-[56] flex flex-col"
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 30, stiffness: 300, bounce: 0 }}
            drag="x"
            dragConstraints={{ left: 0, right: 0 }}
            dragElastic={{ left: 0, right: 0.5 }}
            onDragEnd={(_, info) => {
              if (info.offset.x > 100) onClose();
            }}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-border">
              <span className="font-semibold text-lg text-foreground">Menu</span>
              <button
                onClick={onClose}
                className="p-2 -mr-2 rounded-lg hover:bg-accent transition-colors"
                aria-label="Close menu"
              >
                <X className="w-5 h-5 text-muted-foreground" />
              </button>
            </div>

            {/* Menu Items */}
            <div className="py-2 flex-1">
              <button onClick={onToggleTheme} className={menuItemClass}>
                {theme === 'dark' ? <Sun className={iconClass} /> : <Moon className={iconClass} />}
                <span>{theme === 'dark' ? 'Light Mode' : 'Dark Mode'}</span>
              </button>

              <button onClick={onOpenMethodology} className={menuItemClass}>
                <BookOpen className={iconClass} />
                <span>Methodology</span>
              </button>

              <button onClick={onOpenSettings} className={menuItemClass}>
                <SlidersHorizontal className={iconClass} />
                <span>Settings</span>
              </button>

              <div className="my-1 mx-4 border-t border-border" />

              <button onClick={handleSetAsDefault} className={menuItemClass} disabled={saved}>
                {saved ? (
                  <Check className="w-5 h-5 text-green-500 flex-shrink-0" />
                ) : (
                  <Save className={iconClass} />
                )}
                <span>{saved ? 'Saved!' : 'Set as Default'}</span>
              </button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
