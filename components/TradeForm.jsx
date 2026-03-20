// components/TradeForm.jsx
import { useState, useEffect } from 'react';
import { calcPnL, calcRR, generateId, STRATEGIES, MARKETS } from '../lib/tradeUtils';
import s from './TradeForm.module.css';

const blank = {
  date: new Date().toISOString().slice(0,10),
  pair: '', market: 'Crypto Perp', direction: 'LONG', strategy: '',
  entryPrice: '', exitPrice: '', stopLoss: '', takeProfit: '',
  size: '', fees: '', notes: '', status: 'open',
};

export default function TradeForm({ onSave, onCancel, editTrade }) {
  const [f, setF] = useState(editTrade || { ...blank });
  const set = (k, v) => setF(p => ({ ...p, [k]: v }));

  useEffect(() => {
    setF(editTrade || { ...blank });
  }, [editTrade]);

  const entry = parseFloat(f.entryPrice) || 0;
  const exit  = parseFloat(f.exitPrice)  || 0;
  const size  = parseFloat(f.size)       || 0;
  const sl    = parseFloat(f.stopLoss)   || 0;
  const tp    = parseFloat(f.takeProfit) || 0;
  const fees  = parseFloat(f.fees)       || 0;

  const pnl = f.status === 'closed' && exit ? calcPnL(entry, exit, size, f.direction, fees) : null;
  const rr  = calcRR(entry, sl, tp, f.direction);

  const handleSave = () => {
    if (!f.pair || !f.entryPrice) return;
    onSave({
      ...f,
      id: f.id || generateId(),
      pnl,
      rr,
      createdAt: f.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
  };

  return (
    <div className={s.panel}>
      <div className={s.header}>
        <span className={s.title}>{editTrade ? '// edit_trade' : '// new_trade'}<span className="blink">_</span></span>
        <div className={s.statusToggle}>
          {['open','closed'].map(st => (
            <button key={st} className={`${s.stBtn} ${f.status===st ? s.stOn : ''}`}
              onClick={() => set('status', st)}>{st}</button>
          ))}
        </div>
      </div>

      <div className={s.body}>
        <div className={s.row}>
          <Field label="date"><input type="date" value={f.date} onChange={e=>set('date',e.target.value)}/></Field>
          <Field label="pair"><input placeholder="BTC/USDT" value={f.pair} onChange={e=>set('pair',e.target.value.toUpperCase())}/></Field>
          <Field label="market">
            <select value={f.market} onChange={e=>set('market',e.target.value)}>
              {MARKETS.map(m=><option key={m}>{m}</option>)}
            </select>
          </Field>
          <Field label="strategy">
            <select value={f.strategy} onChange={e=>set('strategy',e.target.value)}>
              <option value="">select...</option>
              {STRATEGIES.map(s=><option key={s}>{s}</option>)}
            </select>
          </Field>
        </div>

        <div className={s.row}>
          <Field label="direction">
            <div className={s.dirToggle}>
              <button className={`${s.dir} ${f.direction==='LONG'?s.long:''}`} onClick={()=>set('direction','LONG')}>LONG</button>
              <button className={`${s.dir} ${f.direction==='SHORT'?s.short:''}`} onClick={()=>set('direction','SHORT')}>SHORT</button>
            </div>
          </Field>
          <Field label="entry price"><input type="number" placeholder="0.00" value={f.entryPrice} onChange={e=>set('entryPrice',e.target.value)}/></Field>
          <Field label={`exit price${f.status==='open'?' (opt)':''}`}><input type="number" placeholder="0.00" value={f.exitPrice} onChange={e=>set('exitPrice',e.target.value)}/></Field>
          <Field label="size"><input type="number" placeholder="0.1" value={f.size} onChange={e=>set('size',e.target.value)}/></Field>
        </div>

        <div className={s.row}>
          <Field label="stop loss"><input type="number" placeholder="0.00" value={f.stopLoss} onChange={e=>set('stopLoss',e.target.value)}/></Field>
          <Field label="take profit"><input type="number" placeholder="0.00" value={f.takeProfit} onChange={e=>set('takeProfit',e.target.value)}/></Field>
          <Field label="fees ($)"><input type="number" placeholder="0.00" value={f.fees} onChange={e=>set('fees',e.target.value)}/></Field>
          <Field label="notes"><input placeholder="setup, reason..." value={f.notes} onChange={e=>set('notes',e.target.value)}/></Field>
        </div>

        <div className={s.preview}>
          <span>R:R <b>{rr ? `1:${rr}` : '—'}</b></span>
          {pnl !== null && (
            <span className={pnl>=0?'pos':'neg'}>
              P&L <b>${pnl>=0?'+':''}{pnl}</b>
            </span>
          )}
          {f.direction && <span>DIR <b className={f.direction==='LONG'?'pos':'neg'}>{f.direction}</b></span>}
        </div>
      </div>

      <div className={s.footer}>
        <button className={s.saveBtn} onClick={handleSave} disabled={!f.pair||!f.entryPrice}>
          {editTrade ? 'update_trade' : 'add_trade'}
        </button>
        {onCancel && <button className={s.cancelBtn} onClick={onCancel}>cancel</button>}
      </div>
    </div>
  );
}

function Field({ label, children }) {
  return (
    <div style={{ flex: 1, minWidth: 130 }}>
      <div style={{ fontSize: 9, color: 'var(--dim)', textTransform: 'uppercase', letterSpacing: '0.2em', marginBottom: 5 }}>
        &gt; {label}
      </div>
      {children}
    </div>
  );
}
