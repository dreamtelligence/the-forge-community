'use client';

import React, { useState, useEffect } from 'react';
import { Calculator, TrendingUp, AlertCircle, Percent } from 'lucide-react';
import { motion } from 'framer-motion';

export default function MarginCalculator() {
  const [values, setValues] = useState({
    sellingPrice: 49.90,
    productCost: 15.00,
    shippingCost: 4.50,
    packagingCost: 1.20,
    marketingCost: 10.00, // Cost per Acquisition
    taxRate: 19,
  });

  const [results, setResults] = useState({
    netRevenue: 0,
    totalCosts: 0,
    profit: 0,
    margin: 0,
    isProfitable: false,
  });

  useEffect(() => {
    const taxMultiplier = 1 + values.taxRate / 100;
    const netRevenue = values.sellingPrice / taxMultiplier;
    const totalCosts = values.productCost + values.shippingCost + values.packagingCost + values.marketingCost;
    const profit = netRevenue - totalCosts;
    const margin = (profit / netRevenue) * 100;

    setResults({
      netRevenue,
      totalCosts,
      profit,
      margin,
      isProfitable: profit > 0,
    });
  }, [values]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setValues((prev) => ({
      ...prev,
      [name]: parseFloat(value) || 0,
    }));
  };

  const formatCurrency = (val: number) => 
    new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' }).format(val);

  return (
    <div className="bg-white rounded-2xl shadow-xl overflow-hidden border border-slate-100">
      <div className="bg-slate-900 p-6 text-white flex items-center gap-3">
        <Calculator className="w-6 h-6 text-blue-400" />
        <h2 className="text-xl font-bold">Margin Calculator</h2>
      </div>

      <div className="p-8 grid grid-cols-1 lg:grid-cols-2 gap-12">
        {/* Input Section */}
        <div className="space-y-6">
          <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wider">Kosten & Preis</h3>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Verkaufspreis (Brutto)</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">€</span>
                <input
                  type="number"
                  name="sellingPrice"
                  value={values.sellingPrice}
                  onChange={handleChange}
                  className="w-full pl-8 pr-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                  step="0.01"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Einkaufspreis (Netto)</label>
                <input
                  type="number"
                  name="productCost"
                  value={values.productCost}
                  onChange={handleChange}
                  className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                  step="0.01"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Marketing pro Order</label>
                <input
                  type="number"
                  name="marketingCost"
                  value={values.marketingCost}
                  onChange={handleChange}
                  className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                  step="0.01"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Versandkosten</label>
                <input
                  type="number"
                  name="shippingCost"
                  value={values.shippingCost}
                  onChange={handleChange}
                  className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                  step="0.01"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Verpackung</label>
                <input
                  type="number"
                  name="packagingCost"
                  value={values.packagingCost}
                  onChange={handleChange}
                  className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                  step="0.01"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">MwSt. (%)</label>
              <select
                name="taxRate"
                value={values.taxRate}
                onChange={(e) => setValues(p => ({...p, taxRate: parseInt(e.target.value)}))}
                className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-white"
              >
                <option value="19">19% Standard</option>
                <option value="7">7% Ermäßigt</option>
                <option value="0">0% (z.B. Kleinunternehmer)</option>
              </select>
            </div>
          </div>
        </div>

        {/* Results Section */}
        <div className="space-y-6">
          <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wider">Deine Rentabilität</h3>
          
          <div className="grid grid-cols-1 gap-4">
            <motion.div 
              animate={{ backgroundColor: results.isProfitable ? '#f0fdf4' : '#fef2f2' }}
              className="p-6 rounded-2xl border border-slate-100 flex flex-col items-center justify-center text-center"
            >
              <span className="text-sm text-slate-500 mb-1">Gewinn pro Einheit</span>
              <span className={`text-4xl font-black ${results.isProfitable ? 'text-green-600' : 'text-red-600'}`}>
                {formatCurrency(results.profit)}
              </span>
              {!results.isProfitable && (
                <div className="mt-2 flex items-center gap-1 text-xs text-red-500 font-medium uppercase">
                  <AlertCircle className="w-3 h-3" /> Verlustgeschäft
                </div>
              )}
            </motion.div>

            <div className="grid grid-cols-2 gap-4">
              <div className="bg-slate-50 p-4 rounded-xl">
                <span className="text-xs text-slate-500 block mb-1">Marge (Netto)</span>
                <span className="text-xl font-bold text-slate-800 flex items-center gap-1">
                  {results.margin.toFixed(1)}% <Percent className="w-4 h-4 text-slate-400" />
                </span>
              </div>
              <div className="bg-slate-50 p-4 rounded-xl">
                <span className="text-xs text-slate-500 block mb-1">Netto-Umsatz</span>
                <span className="text-xl font-bold text-slate-800">
                  {formatCurrency(results.netRevenue)}
                </span>
              </div>
            </div>

            <div className="bg-slate-50 p-4 rounded-xl">
              <div className="flex justify-between items-center mb-2">
                <span className="text-xs text-slate-500 italic">Break-Even (Preis um 0€ Profit zu machen)</span>
                <span className="text-xs font-bold text-blue-600">
                  {formatCurrency(results.totalCosts * (1 + values.taxRate / 100))} (Brutto)
                </span>
              </div>
              <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden">
                <motion.div 
                  initial={{ width: 0 }}
                  animate={{ width: `${Math.min(100, (results.totalCosts / results.netRevenue) * 100)}%` }}
                  className={`h-full ${results.isProfitable ? 'bg-blue-500' : 'bg-red-400'}`}
                />
              </div>
              <div className="mt-2 flex justify-between text-[10px] text-slate-400 font-medium">
                <span>KOSTEN: {formatCurrency(results.totalCosts)}</span>
                <span>PROFIT: {formatCurrency(Math.max(0, results.profit))}</span>
              </div>
            </div>
          </div>

          <div className="bg-blue-50 p-4 rounded-xl border border-blue-100">
            <h4 className="text-sm font-bold text-blue-900 flex items-center gap-2 mb-2">
              <TrendingUp className="w-4 h-4" /> Analyse & Tipp
            </h4>
            <p className="text-xs text-blue-800 leading-relaxed">
              {results.margin > 40 
                ? "Sehr starke Marge! Du hast viel Spielraum für Marketing und Skalierung." 
                : results.margin > 20 
                ? "Gute Marge. Achte darauf, dass deine Werbekosten (CAC) nicht zu stark steigen."
                : results.margin > 0
                ? "Knappe Marge. Du musst über das Volumen gehen oder versuchen, die Kosten zu senken."
                : "Achtung: Du zahlst aktuell bei jedem Verkauf drauf. Erhöhe den Preis oder senke die Kosten dringend."}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
