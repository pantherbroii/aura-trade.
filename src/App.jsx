import { useState, useEffect } from 'react';
import axios from 'axios';
import { PlusCircle } from 'lucide-react';
import auraLogo from './assets/logo.png'; 

const MiniChart = ({ data, color }) => {
  if (!data || data.length < 2) return <div style={{ height: '60px' }} />;
  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;
  const points = data.map((d, i) => ({
    x: (i / (data.length - 1)) * 100,
    y: 100 - ((d - min) / range) * 80 - 10
  }));
  const pathData = `M ${points.map(p => `${p.x},${p.y}`).join(' L ')}`;
  return (
    <svg viewBox="0 0 100 100" preserveAspectRatio="none" style={{ width: '100%', height: '60px', marginTop: '10px' }}>
      <path d={pathData} fill="none" stroke={color} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
};

export default function App() {
  const getSaved = (k, v) => { try { const s = localStorage.getItem(k); return s ? JSON.parse(s) : v; } catch { return v; } };

  const [cash, setCash] = useState(() => getSaved('aura_cash', 10000));
  const [holdings, setHoldings] = useState(() => getSaved('aura_holdings', { BTC: 0, SOL: 0, ETH: 0, BNB: 0, ADA: 0, DOGE: 0, HULKY: 0 }));
  const [invested, setInvested] = useState(() => getSaved('aura_invested', { BTC: 0, SOL: 0, ETH: 0, BNB: 0, ADA: 0, DOGE: 0, HULKY: 0 }));
  const [prices, setPrices] = useState({ BTC: 0, SOL: 0, ETH: 0, BNB: 0, ADA: 0, DOGE: 0, HULKY: 0.000185 });
  const [history, setHistory] = useState({ BTC: [], SOL: [], ETH: [], BNB: [], ADA: [], DOGE: [], HULKY: [] });
  const [tradeInputs, setTradeInputs] = useState({ BTC: 1000, SOL: 1000, ETH: 1000, BNB: 1000, ADA: 1000, DOGE: 1000, HULKY: 1000 });

  useEffect(() => {
    localStorage.setItem('aura_cash', JSON.stringify(cash));
    localStorage.setItem('aura_holdings', JSON.stringify(holdings));
    localStorage.setItem('aura_invested', JSON.stringify(invested));
  }, [cash, holdings, invested]);

  const fetchPrices = async () => {
    try {
      const res = await axios.get(`https://api.binance.com/api/v3/ticker/price`);
      const newP = { ...prices };
      const newH = { ...history };
      
      res.data.forEach(item => {
        const t = item.symbol.replace('USDT', '');
        if (["BTC","SOL","ETH","BNB","ADA","DOGE"].includes(t)) {
          const v = parseFloat(item.price);
          newP[t] = v;
          newH[t] = [...(newH[t] || []), v].slice(-40);
        }
      });

      // HULKY Random Digit Jitter
      const start = new Date("2026-02-10T00:00:00");
      const progress = Math.min(1, Math.max(0, (new Date() - start) / (30 * 24 * 60 * 60 * 1000)));
      const base = 0.0001 + (0.10 - 0.0001) * Math.pow(progress, 2);
      const jitter = (Math.random() - 0.5) * 0.000015; 
      newP.HULKY = Math.max(0.0001, base + jitter);
      newH.HULKY = [...(newH.HULKY || []), newP.HULKY].slice(-40);

      setPrices(newP);
      setHistory(newH);
    } catch (e) { console.error("Update failed"); }
  };

  useEffect(() => { 
    fetchPrices(); 
    const i = setInterval(fetchPrices, 2000); 
    return () => clearInterval(i); 
  }, [history]);

  const totalCost = Object.values(invested).reduce((a, b) => a + (b || 0), 0);
  const equity = Object.keys(holdings).reduce((s, t) => s + (holdings[t] * prices[t]), 0);

  const handleBuy = (t) => {
    const s = parseFloat(tradeInputs[t]) || 0;
    if (prices[t] > 0 && cash >= s && s > 0) {
      setCash(c => c - s);
      setInvested(p => ({ ...p, [t]: (p[t] || 0) + s }));
      setHoldings(p => ({ ...p, [t]: (p[t] || 0) + (s / prices[t]) }));
    }
  };

  const handleSell = (t) => {
    if (holdings[t] > 0) {
      setCash(c => c + (holdings[t] * prices[t]));
      setHoldings(p => ({ ...p, [t]: 0 }));
      setInvested(p => ({ ...p, [t]: 0 }));
    }
  };

  return (
    <div style={{ backgroundColor: '#0b0e14', color: 'white', minHeight: '100vh', width: '100vw', padding: '20px', display: 'flex', flexDirection: 'column', fontFamily: 'sans-serif', boxSizing: 'border-box' }}>
      
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px', background: '#0d1117', padding: '15px 30px', borderRadius: '16px', border: '1px solid #30363d' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '30px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <img src={auraLogo} alt="Logo" style={{ width: '35px', height: '35px' }} />
            <h1 style={{ margin: 0, fontSize: '1.4rem', fontWeight: 900 }}>AURA <span style={{ color: '#22c55e' }}>TRADE</span></h1>
          </div>
          <div style={{ display: 'flex', gap: '15px' }}>
            <div style={{ background: '#161b22', padding: '8px 15px', borderRadius: '10px' }}>
              <div style={{ fontSize: '0.55rem', color: '#8b949e' }}>TOTAL COST</div>
              <div style={{ fontSize: '1.1rem', fontWeight: 'bold' }}>${totalCost.toLocaleString()}</div>
            </div>
            <div style={{ background: '#161b22', padding: '8px 15px', borderRadius: '10px' }}>
              <div style={{ fontSize: '0.55rem', color: '#8b949e' }}>LIVE EQUITY</div>
              <div style={{ fontSize: '1.1rem', fontWeight: 'bold', color: '#22c55e' }}>${equity.toLocaleString(undefined, {minimumFractionDigits: 2})}</div>
            </div>
          </div>
        </div>
        
        <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
          <button onClick={() => setCash(c => c + 10000)} style={{ background: '#22c55e', color: 'black', border: 'none', padding: '10px 18px', borderRadius: '8px', fontWeight: '900', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <PlusCircle size={18} /> REFILL $10K
          </button>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: '0.65rem', color: '#8b949e' }}>WALLET CASH</div>
            <div style={{ fontSize: '1.6rem', fontWeight: '900' }}>${cash.toLocaleString(undefined, {minimumFractionDigits: 2})}</div>
          </div>
        </div>
      </header>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '20px', width: '100%' }}>
        {Object.keys(prices).map(t => {
          const isH = t === 'HULKY';
          const prof = (holdings[t] * prices[t]) - (invested[t] || 0);
          return (
            <div key={t} style={{ background: isH ? 'linear-gradient(135deg, #161b22 0%, #064e3b 100%)' : '#161b22', borderRadius: '16px', border: isH ? '2px solid #22c55e' : '1px solid #30363d', padding: '20px', display: 'flex', flexDirection: 'column' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ fontWeight: 'bold', color: isH ? '#22c55e' : '#f8fafc' }}>{t} / USDT</span>
                <span style={{ color: prof >= 0 ? '#3fb950' : '#f85149', fontWeight: 'bold' }}>{prof >= 0 ? '+' : ''}{prof.toFixed(2)}</span>
              </div>
              <div style={{ fontSize: '2.1rem', fontWeight: '900', margin: '10px 0', fontFamily: 'monospace' }}>
                ${prices[t] < 1 ? prices[t].toFixed(8) : prices[t].toLocaleString(undefined, {minimumFractionDigits: 2})}
              </div>
              
              <MiniChart data={history[t]} color={isH ? '#22c55e' : '#6366f1'} />

              <div style={{ marginTop: '15px' }}>
                <div style={{ display: 'flex', gap: '8px', marginBottom: '10px' }}>
                  <input type="number" value={tradeInputs[t]} onChange={(e) => setTradeInputs({...tradeInputs, [t]: e.target.value})} style={{ flex: 1, background: '#0d1117', border: '1px solid #30363d', color: 'white', padding: '10px', borderRadius: '8px' }} />
                  <button onClick={() => handleBuy(t)} style={{ background: isH ? '#22c55e' : '#6366f1', color: 'white', border: 'none', padding: '0 15px', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold' }}>BUY</button>
                  {/* FIXED SELL BUTTON: Always Rendered */}
                  <button onClick={() => handleSell(t)} style={{ background: (holdings[t] > 0) ? '#f85149' : '#30363d', color: 'white', border: 'none', padding: '0 15px', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold' }}>SELL</button>
                </div>
                {holdings[t] > 0 && <div style={{ fontSize: '0.65rem', color: '#8b949e' }}>Balance: {holdings[t].toFixed(2)} {t}</div>}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}