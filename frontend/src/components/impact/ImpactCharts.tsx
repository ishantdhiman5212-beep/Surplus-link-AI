import React from 'react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import { TrendingUp, PieChart as PieIcon, BarChart2 } from 'lucide-react';
import { FoodListing } from '../../types';
import { NGOS, CATEGORIES } from '../../services/mockData';

interface ImpactChartsProps {
  listings: FoodListing[];
}

export const ImpactCharts: React.FC<ImpactChartsProps> = ({ listings }) => {
  // 1. Cumulative rescued data
  const trendData = [
    { time: '10:00 AM', kg: 12, meals: 30 },
    { time: '12:30 PM', kg: 24, meals: 60 },
    { time: '02:00 PM', kg: 38, meals: 95 },
    { time: '04:30 PM', kg: 52, meals: 130 },
    { time: '06:00 PM', kg: 71, meals: 177 },
    { time: '08:30 PM', kg: 88, meals: 220 },
  ];

  // 2. Breakdown by NGO
  const ngoData = Object.entries(NGOS).map(([id, ngo]) => {
    const totalKg = listings
      .filter((l) => l.ngo === id && l.status === 'collected')
      .reduce((sum, l) => sum + l.kg, 0);

    return {
      name: ngo.name.replace(' Foundation', '').replace(' Community Kitchen', '').replace(' Shelter Home', ''),
      rescued: totalKg || (id === 'roti' ? 12 : id === 'sewa' ? 25 : 8),
      capacity: ngo.cap,
    };
  });

  // 3. Category Breakdown for PieChart
  const categoryCounts: Record<string, number> = {};
  listings.forEach((l) => {
    const label = CATEGORIES[l.cat]?.label || 'Other';
    categoryCounts[label] = (categoryCounts[label] || 0) + l.kg;
  });

  const pieData = Object.entries(categoryCounts).map(([name, value]) => ({
    name,
    value,
  }));

  const COLORS = ['#C2410C', '#FF9A63', '#F2C94C', '#38BDF8', '#2FA866'];

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Rescued Trend Area Chart */}
      <div className="p-5 sm:p-6 rounded-2xl glass-panel border border-line bg-card/80 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-primary" />
            <h4 className="font-bold text-sm text-ink">Cumulative Food Rescued (kg)</h4>
          </div>
          <span className="text-[11px] font-mono text-mute">Hourly Rescue Rate</span>
        </div>

        <div className="h-64 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={trendData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="colorKg" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#C2410C" stopOpacity={0.4} />
                  <stop offset="95%" stopColor="#C2410C" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(42, 22, 18, 0.08)" />
              <XAxis dataKey="time" tick={{ fontSize: 11, fill: 'var(--mute)' }} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: 'var(--mute)' }} tickLine={false} />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'var(--card)',
                  borderColor: 'var(--line)',
                  borderRadius: '12px',
                  boxShadow: 'var(--shadow)',
                  fontSize: '12px',
                }}
              />
              <Area
                type="monotone"
                dataKey="kg"
                stroke="#C2410C"
                strokeWidth={2.5}
                fillOpacity={1}
                fill="url(#colorKg)"
                name="Rescued (kg)"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Recipient NGO Distribution Bar Chart */}
      <div className="p-5 sm:p-6 rounded-2xl glass-panel border border-line bg-card/80 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <BarChart2 className="w-4 h-4 text-primary" />
            <h4 className="font-bold text-sm text-ink">NGO Intake vs Capacity (kg)</h4>
          </div>
          <span className="text-[11px] font-mono text-mute">Partner Intake</span>
        </div>

        <div className="h-64 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={ngoData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(42, 22, 18, 0.08)" />
              <XAxis dataKey="name" tick={{ fontSize: 11, fill: 'var(--mute)' }} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: 'var(--mute)' }} tickLine={false} />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'var(--card)',
                  borderColor: 'var(--line)',
                  borderRadius: '12px',
                  boxShadow: 'var(--shadow)',
                  fontSize: '12px',
                }}
              />
              <Bar dataKey="rescued" fill="#C2410C" radius={[6, 6, 0, 0]} name="Rescued kg" />
              <Bar dataKey="capacity" fill="rgba(42, 22, 18, 0.15)" radius={[6, 6, 0, 0]} name="Max Cap" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Food Category Breakdown */}
      {pieData.length > 0 && (
        <div className="p-5 sm:p-6 rounded-2xl glass-panel border border-line bg-card/80 space-y-4 lg:col-span-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <PieIcon className="w-4 h-4 text-primary" />
              <h4 className="font-bold text-sm text-ink">Rescued Food by Category Share</h4>
            </div>
            <span className="text-[11px] font-mono text-mute">Dietary Taxonomy</span>
          </div>

          <div className="h-56 w-full flex items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={55}
                  outerRadius={80}
                  paddingAngle={4}
                  dataKey="value"
                  label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                >
                  {pieData.map((_, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'var(--card)',
                    borderColor: 'var(--line)',
                    borderRadius: '12px',
                    boxShadow: 'var(--shadow)',
                    fontSize: '12px',
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}
    </div>
  );
};
