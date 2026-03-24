import sqlite3, os, pandas as pd, sys
sys.path.insert(0, '.')
from utils.anomaly_detector import AnomalyDetector

os.chdir(os.path.dirname(os.path.abspath(__file__)))

conn = sqlite3.connect('ledger.db')
conn.execute('DELETE FROM ledger_entries')
conn.commit()
conn.close()

d = AnomalyDetector()
csv_path = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), 'updated_financial_ledger_with_anomalies.csv')
df = pd.read_csv(csv_path)
print(f'CSV rows: {len(df)}')

conn = sqlite3.connect('ledger.db')
cur = conn.cursor()
added, flagged = 0, 0
for _, row in df.iterrows():
    amount   = float(row['amount'])   if pd.notnull(row.get('amount'))   else 0.0
    category = str(row['category'])   if pd.notnull(row.get('category')) else ''
    desc     = str(row['description'])
    debit    = float(row['debit'])    if pd.notnull(row.get('debit'))    else 0.0
    credit   = float(row['credit'])   if pd.notnull(row.get('credit'))   else 0.0
    is_anom  = d.detect_anomaly({'amount': amount, 'category': category, 'description': desc})
    cur.execute('INSERT INTO ledger_entries (date,description,debit,credit,category,amount,is_anomaly) VALUES (?,?,?,?,?,?,?)',
                (str(row['date']), desc, debit, credit, category, amount, int(is_anom)))
    added += 1
    if is_anom:
        flagged += 1
        print(f'  ANOMALY: {desc} | {amount} | {category}')
conn.commit()

cur.execute('SELECT COUNT(*) FROM ledger_entries');          print(f'\nTotal entries in DB : {cur.fetchone()[0]}')
cur.execute('SELECT COALESCE(SUM(amount),0) FROM ledger_entries'); print(f'Total amount        : {cur.fetchone()[0]:,.2f}')
cur.execute('SELECT COUNT(*) FROM ledger_entries WHERE is_anomaly=1'); print(f'Anomalies flagged   : {cur.fetchone()[0]}')
conn.close()
print('\nAll checks passed!' if added == len(df) else f'WARNING: only {added}/{len(df)} rows inserted')
