import React from 'react';
import { Home, HeartHandshake, Building2, Bike, BarChart3 } from 'lucide-react';
import { useRescue } from '../../context/RescueContext';

interface MobileDockProps {
  currentTab: string;
  onTabChange: (tab: string) => void;
}

export const MobileDock: React.FC<MobileDockProps> = ({ currentTab, onTabChange }) => {
  const { stats } = useRescue();

  const dockItems = [
    { id: 'home', label: 'Home', icon: Home },
    { id: 'donate', label: 'Donate', icon: HeartHandshake, badge: stats.activeOpen },
    { id: 'ngos', label: 'NGOs', icon: Building2 },
    { id: 'volunteer', label: 'Volunteer', icon: Bike, badge: stats.inTransit },
    { id: 'impact', label: 'Impact', icon: BarChart3 },
  ];

  return (
    <div className="md:hidden fixed bottom-3 left-4 right-4 z-40">
      <nav className="glass-panel bg-card/95 rounded-2xl p-1.5 shadow-2xl border border-line flex items-center justify-around">
        {dockItems.map((item) => {
          const Icon = item.icon;
          const active = currentTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onTabChange(item.id)}
              className={`relative flex flex-col items-center justify-center py-1.5 px-3 rounded-xl transition-all ${
                active ? 'text-primary font-bold bg-primary-soft' : 'text-mute hover:text-ink'
              }`}
            >
              <div className="relative">
                <Icon className={`w-5 h-5 ${active ? 'scale-110' : ''} transition-transform`} />
                {item.badge !== undefined && item.badge > 0 && (
                  <span className="absolute -top-1 -right-2 px-1 min-w-[14px] h-[14px] rounded-full bg-amber-500 text-white text-[9px] font-bold flex items-center justify-center">
                    {item.badge}
                  </span>
                )}
              </div>
              <span className="text-[10px] mt-0.5 tracking-tight">{item.label}</span>
            </button>
          );
        })}
      </nav>
    </div>
  );
};
