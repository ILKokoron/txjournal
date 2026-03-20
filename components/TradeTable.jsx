// components/TradeTable.jsx
import s from './TradeTable.module.css';

export default function TradeTable({ trades, onEdit, onDelete }) {
  if (!trades.length) return (
    <div className={s.empty}>
      <span className={s.emptyIcon}>◈</span>
      <span>no trades found. add your first entry.</span>
    </div>
  );

  return (
    <div className={s.wrap}>
      <table className={s.table}>
        <thead>
          <tr>
            {['date','pair','dir','strategy','entry','exit','size','r:r','p&l','status',''].map(h => (
              <th key={h}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {trades.map(t => (
            <tr key={t.id} className={s.row}>
              <td className={s.dim}>{t.date}</td>
              <td className={s.pair}>{t.pair}</td>
              <td><span className={`${s.badge} ${t.direction==='LONG'?s.long:s.short}`}>{t.direction}</span></td>
              <td className={s.dim}>{t.strategy||'—'}</td>
              <td>{t.entryPrice||'—'}</td>
              <td>{t.exitPrice||'—'}</td>
              <td>{t.size||'—'}</td>
              <td>{t.rr?`1:${t.rr}`:'—'}</td>
              <td>
                {t.pnl!==null&&t.pnl!==undefined
                  ? <span className={t.pnl>=0?s.pos:s.neg}>${t.pnl>=0?'+':''}{t.pnl}</span>
                  : <span className={s.dim}>—</span>}
              </td>
              <td><span className={`${s.badge} ${t.status==='open'?s.open:s.closed}`}>{t.status}</span></td>
              <td>
                <div className={s.acts}>
                  <button className={s.editBtn} onClick={()=>onEdit(t)} title="edit">✎</button>
                  <button className={s.delBtn} onClick={()=>onDelete(t.id)} title="delete">✕</button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
