'use client';
import { useTheme } from './providers/theme-provider';
import React, { useState, useRef, useEffect } from 'react';
import { BsMoon, BsSun } from 'react-icons/bs';
import { useClerk, SignedIn, SignedOut, UserButton } from '@clerk/nextjs';
import { FaArrowUp, FaUser } from 'react-icons/fa';
import { HiDotsVertical } from 'react-icons/hi';
import { IoClose } from 'react-icons/io5';

export default function ThemeSwitch() {
  const { theme, toggleTheme } = useTheme();
  const [isOpen, setIsOpen] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const { openSignIn } = useClerk();

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (panelRef.current && !panelRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  const buttonBase =
    'bg-background w-[2.75rem] h-[2.75rem] bg-opacity-80 backdrop-blur-[0.5rem] border border-border shadow-2xl rounded-full flex items-center justify-center hover:scale-[1.15] active:scale-105 transition-all';

  return (
    <div ref={panelRef} className="fixed bottom-5 right-5 z-50">
      {isOpen && (
        <div className="absolute bottom-14 right-0 flex flex-col gap-3 animate-in slide-in-from-bottom-2 fade-in duration-200">
          <button title="Toggle theme" className={buttonBase} onClick={toggleTheme}>
            {theme === 'light' ? <BsSun /> : <BsMoon />}
          </button>

          <button title="Scroll to top" className={buttonBase} onClick={scrollToTop}>
            <FaArrowUp />
          </button>

          <SignedIn>
            <UserButton
              afterSignOutUrl="/"
              appearance={{
                elements: {
                  avatarBox: 'h-[44px] w-[44px] rounded-[22px]'
                }
              }}
            />
          </SignedIn>

          <SignedOut>
            <button title="Sign in" onClick={() => openSignIn()} className={buttonBase}>
              <FaUser />
            </button>
          </SignedOut>
        </div>
      )}

      <button
        title={isOpen ? 'Close menu' : 'Open menu'}
        className={`${buttonBase} ${isOpen ? 'bg-primary text-primary-foreground' : ''}`}
        onClick={() => setIsOpen((prev) => !prev)}
        aria-expanded={isOpen}
        aria-label="Toggle quick actions menu"
      >
        {isOpen ? <IoClose size={18} /> : <HiDotsVertical size={18} />}
      </button>
    </div>
  );
}
