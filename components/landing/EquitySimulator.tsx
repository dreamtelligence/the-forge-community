'use client';

import { useState, useMemo } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import { DollarSign, Clock, PieChart as PieIcon } from 'lucide-react';

const COLORS = {
  YOU: '#FF9900',        // Gold
  INVESTORS: '#334155',  // Slate 700
  TEAM: '#475569',       // Slate 600
  TREASURY: '#1e293b'    // Slate 800
};

export default function EquitySimulator() {
  const [capital, setCapital] = useState(5000); // Euros
  const [hours, setHours] = useState(10);       // Hours per week

  // Slicing Pie Logic (Simplified for Demo)
  // Assumptions:
  // - Total Capital Pool needed: 50,000€
  // - Total Team Hours needed: 100h / week
  // - Hourly Rate (blended): 50€ / h
  // - Cash Multiplier: 4x (Cash is king)
  // - Sweat Multiplier: 2x (Work is valuable)

  const calculation = useMemo(() => {
    const cashMultiplier = 4;
    const sweatMultiplier = 2;
    const hourlyRate = 100; // Implied value

    // Your Contribution
    const yourCashSlices = capital * cashMultiplier;
    const yourSweatSlices = (hours * 52 * hourlyRate) * sweatMultiplier; // Annualized
    const yourTotalSlices = yourCashSlices + yourSweatSlices;

    // Others Contribution (Static Baseline for Context)
    // Assuming a typical Squad setup
    const squadCapital = 45000 * cashMultiplier; // Rest of 50k
    const squadSweat = (150 * 52 * hourlyRate) * sweatMultiplier; // Rest of team work
    const squadTotalSlices = squadCapital + squadSweat;

    // Treasury / Platform Fee (Fixed 10% slice for simplicity in demo)
    // In reality, this is calculated differently, but for visualization:
    const totalPie = yourTotalSlices + squadTotalSlices;
    const treasurySlices = totalPie * 0.10; 
    
    const grandTotal = totalPie + treasurySlices;

    const yourShare = (yourTotalSlices / grandTotal) * 100;
    const squadShare = (squadTotalSlices / grandTotal) * 100;
    const treasuryShare = (treasurySlices / grandTotal) * 100;

    return {
      yourShare,
      squadShare,
      treasuryShare,
      value: yourTotalSlices // abstract score
    };
  }, [capital, hours]);

  const data = [
    { name: 'Dein Anteil', value: calculation.yourShare, color: COLORS.YOU },
    { name: 'Squad & Investoren', value: calculation.squadShare, color: COLORS.TEAM },
    { name: 'Forge Treasury', value: calculation.treasuryShare, color: COLORS.TREASURY },
  ];

  const formatMoney = (val: number) => 
    new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(val);

  return (
    <div className="w-full max-w-4xl mx-auto p-1 rounded-3xl bg-gradient-to-b from-white/10 to-transparent">
      <div className="bg-[#0B0C0E] rounded-[22px] border border-white/5 p-6 md:p-10 relative overflow-hidden">
        
        {/* Background Effects */}
        <div className="absolute top-0 right-0 w-[300px] h-[300px] bg-[var(--accent)]/5 blur-[100px] rounded-full pointer-events-none" />

        <div className="relative z-10 grid lg:grid-cols-2 gap-12 items-center">
          
          {/* Controls */}
          <div className="space-y-10">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[var(--accent)]/10 border border-[var(--accent)]/20 text-[10px] font-bold text-[var(--accent)] uppercase tracking-widest mb-4">
                <PieIcon className="w-3 h-3" />
                Fair Equity Model
              </div>
              <h3 className="text-3xl font-instrument-serif text-white mb-2">
                Dein Einsatz.<br/>Dein Anteil.
              </h3>
              <p className="text-white/40 text-sm leading-relaxed">
                Wir nutzen das "Slicing Pie" Modell. Keine fixen Anteile, sondern dynamische Fairness basierend auf deinem echten Beitrag.
              </p>
            </div>

            <div className="space-y-8">
              {/* Capital Slider */}
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <label className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-white/60">
                    <DollarSign className="w-4 h-4 text-[var(--accent)]" />
                    Kapital-Einsatz
                  </label>
                  <span className="font-mono text-white text-lg">{formatMoney(capital)}</span>
                </div>
                <input 
                  type="range" 
                  min="0" 
                  max="50000" 
                  step="1000"
                  value={capital} 
                  onChange={(e) => setCapital(parseInt(e.target.value))}
                  className="w-full h-2 bg-white/10 rounded-lg appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:bg-[var(--accent)] [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:shadow-[0_0_10px_rgba(212,175,55,0.5)] transition-all"
                />
                <div className="flex justify-between text-[10px] text-white/20 uppercase tracking-widest">
                  <span>0€</span>
                  <span>50.000€</span>
                </div>
              </div>

              {/* Time Slider */}
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <label className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-white/60">
                    <Clock className="w-4 h-4 text-[var(--accent)]" />
                    Zeit-Invest (Woche)
                  </label>
                  <span className="font-mono text-white text-lg">{hours}h / Woche</span>
                </div>
                <input 
                  type="range" 
                  min="0" 
                  max="40" 
                  step="2"
                  value={hours} 
                  onChange={(e) => setHours(parseInt(e.target.value))}
                  className="w-full h-2 bg-white/10 rounded-lg appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:bg-[var(--accent)] [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:shadow-[0_0_10px_rgba(212,175,55,0.5)] transition-all"
                />
                <div className="flex justify-between text-[10px] text-white/20 uppercase tracking-widest">
                  <span>Passive (0h)</span>
                  <span>Full-Time (40h)</span>
                </div>
              </div>
            </div>
          </div>

          {/* Visualization */}
          <div className="relative flex flex-col items-center justify-center p-8 bg-white/[0.02] rounded-3xl border border-white/5">
            <div className="relative w-64 h-64">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={data}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={5}
                    dataKey="value"
                    stroke="none"
                  >
                    {data.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#000', borderColor: '#333', borderRadius: '12px' }}
                    itemStyle={{ color: '#fff', fontSize: '12px' }}
                    formatter={(value: any) => `${parseFloat(value).toFixed(1)}%`}
                  />
                </PieChart>
              </ResponsiveContainer>
              
              {/* Center Text */}
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-center">
                <div className="text-3xl font-instrument-serif text-white">{calculation.yourShare.toFixed(1)}%</div>
                <div className="text-[9px] text-white/40 uppercase tracking-widest font-bold">Dein Equity</div>
              </div>
            </div>

            <div className="w-full mt-8 space-y-3">
              <div className="flex items-center justify-between p-3 rounded-xl bg-[var(--accent)]/10 border border-[var(--accent)]/20">
                <div className="flex items-center gap-3">
                  <div className="w-3 h-3 rounded-full bg-[var(--accent)]" />
                  <span className="text-xs font-bold text-white">Dein Anteil</span>
                </div>
                <span className="font-mono text-[var(--accent)]">{calculation.yourShare.toFixed(1)}%</span>
              </div>
              <div className="flex items-center justify-between p-3 rounded-xl bg-white/5 border border-white/10">
                <div className="flex items-center gap-3">
                  <div className="w-3 h-3 rounded-full bg-[#475569]" />
                  <span className="text-xs text-white/60">Squad & Investoren</span>
                </div>
                <span className="font-mono text-white/60">{calculation.squadShare.toFixed(1)}%</span>
              </div>
            </div>
            
            <p className="text-[10px] text-white/20 mt-6 text-center leading-relaxed">
              *Dynamische Berechnung. Cash wird 4x gewichtet, Arbeit 2x. 
              Deine Anteile wachsen mit deinem Beitrag.
            </p>
          </div>

        </div>
      </div>
    </div>
  );
}
