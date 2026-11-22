import React, { useState, useEffect, useRef } from 'react';
import { BackgroundMesh } from './components/common/BackgroundMesh';
import { Navbar } from './components/common/Navbar';
import { MobileDock } from './components/common/MobileDock';
import { ErrorBoundary } from './components/common/ErrorBoundary';
import { HomePage } from './pages/HomePage';
import { DonatePage } from './pages/DonatePage';
import { NgoPage } from './pages/NgoPage';
import { VolunteerPage } from './pages/VolunteerPage';
import { ImpactPage } from './pages/ImpactPage';

const TABS = ['home', 'donate', 'ngos', 'volunteer', 'impact'] as const;

export const App: React.FC = () => {
  const [currentTab, setCurrentTab] = useState<string>('home');
  const [scrollProgress, setScrollProgress] = useState<number>(0);
  const isProgrammaticScroll = useRef<boolean>(false);
  const scrollTimeout = useRef<number | null>(null);

  // Smooth scroll to a section on click
  const handleTabChange = (tab: string) => {
    setCurrentTab(tab);
    isProgrammaticScroll.current = true;

    if (scrollTimeout.current) {
      window.clearTimeout(scrollTimeout.current);
    }

    const target = document.getElementById(`view-${tab}`);
    if (target) {
      target.scrollIntoView({ behavior: 'smooth' });
      window.history.replaceState(null, '', `#${tab}`);
    } else if (tab === 'home') {
      window.scrollTo({ top: 0, behavior: 'smooth' });
      window.history.replaceState(null, '', '#home');
    }

    scrollTimeout.current = window.setTimeout(() => {
      isProgrammaticScroll.current = false;
    }, 850);
  };

  // Scroll Spy: automatically changes active tab as user scrolls down/up
  useEffect(() => {
    // 1. Initial Hash Check
    if (typeof window !== 'undefined') {
      const hash = window.location.hash.replace('#', '');
      if (TABS.includes(hash as any)) {
        setTimeout(() => {
          handleTabChange(hash);
        }, 150);
      }
    }

    // 2. IntersectionObserver for Section Visibility
    const observerCallback: IntersectionObserverCallback = (entries) => {
      if (isProgrammaticScroll.current) return;

      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          const tabId = entry.target.id.replace('view-', '');
          if (TABS.includes(tabId as any)) {
            setCurrentTab(tabId);
            window.history.replaceState(null, '', `#${tabId}`);
          }
        }
      });
    };

    const observer = new IntersectionObserver(observerCallback, {
      rootMargin: '-30% 0px -45% 0px',
      threshold: [0.1, 0.25],
    });

    TABS.forEach((id) => {
      const el = document.getElementById(`view-${id}`);
      if (el) observer.observe(el);
    });

    // 3. Scroll Progress and Top/Bottom Edge Guards
    const handleScroll = () => {
      const totalHeight = document.documentElement.scrollHeight - window.innerHeight;
      if (totalHeight > 0) {
        const pct = Math.min(100, Math.max(0, (window.scrollY / totalHeight) * 100));
        setScrollProgress(pct);
      }

      if (isProgrammaticScroll.current) return;

      // Top edge safeguard
      if (window.scrollY < 100) {
        setCurrentTab('home');
        window.history.replaceState(null, '', '#home');
        return;
      }

      // Bottom edge safeguard
      if (window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 70) {
        setCurrentTab('impact');
        window.history.replaceState(null, '', '#impact');
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll();

    return () => {
      observer.disconnect();
      window.removeEventListener('scroll', handleScroll);
      if (scrollTimeout.current) window.clearTimeout(scrollTimeout.current);
    };
  }, []);

  return (
    <div className="relative min-h-screen flex flex-col font-sans text-ink selection:bg-primary/20 selection:text-primary">
      {/* Background Animated Gradient Blobs */}
      <BackgroundMesh />

      {/* Sticky Frosted Header */}
      <div className="sticky top-0 z-40">
        <Navbar currentTab={currentTab} onTabChange={handleTabChange} />
        {/* Scroll Progress Indicator Bar */}
        <div className="w-full h-[2.5px] bg-transparent">
          <div
            className="h-full bg-gradient-to-r from-primary via-amber-500 to-primary transition-all duration-150 ease-out"
            style={{ width: `${scrollProgress}%` }}
          />
        </div>
      </div>

      {/* Main Single-Page Continuous Flow */}
      <main className="flex-1 max-w-6xl w-full mx-auto px-4 sm:px-6 pt-6 sm:pt-8 z-10 space-y-20 pb-24">
        <ErrorBoundary>
          {/* 1. HOME SECTION */}
          <section id="view-home" className="scroll-mt-20">
            <HomePage onNavigate={handleTabChange} />
          </section>

          {/* 2. DONATE SECTION */}
          <section id="view-donate" className="scroll-mt-20 pt-8 sm:pt-12 border-t border-line/60">
            <DonatePage />
          </section>

          {/* 3. NGOS SECTION */}
          <section id="view-ngos" className="scroll-mt-20 pt-8 sm:pt-12 border-t border-line/60">
            <NgoPage />
          </section>

          {/* 4. VOLUNTEER SECTION */}
          <section id="view-volunteer" className="scroll-mt-20 pt-8 sm:pt-12 border-t border-line/60">
            <VolunteerPage onNavigateToNgo={() => handleTabChange('ngos')} />
          </section>

          {/* 5. IMPACT SECTION */}
          <section id="view-impact" className="scroll-mt-20 pt-8 sm:pt-12 border-t border-line/60">
            <ImpactPage />
          </section>
        </ErrorBoundary>

        {/* Global Footer */}
        <footer className="text-center text-xs text-mute pt-10 border-t border-line space-y-1.5 pb-6">
          <p className="font-semibold text-ink/80">
            Built by Berozgar Developer Association for Track 1: Here, Together.
          </p>
          <p className="text-[11px]">
            Meals and CO₂ figures are standards-based estimates (1 kg ≈ 2.5 meals ≈ 2.5 kg CO₂). Demo data stored in local browser state.
          </p>
        </footer>
      </main>

      {/* Mobile Floating Bottom Dock */}
      <MobileDock currentTab={currentTab} onTabChange={handleTabChange} />
    </div>
  );
};

export default App;
