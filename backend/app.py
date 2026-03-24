from flask import Flask, request, jsonify, send_file
from flask_cors import CORS
from flask_jwt_extended import JWTManager, jwt_required, create_access_token
import sqlite3
import os
import io
import pandas as pd
from datetime import datetime, timedelta
from utils.anomaly_detector import AnomalyDetector
from utils.email_sender import EmailSender

app = Flask(__name__)
app.config['JWT_SECRET_KEY'] = 'financeguard-secret-2024'
app.config['JWT_ACCESS_TOKEN_EXPIRES'] = timedelta(hours=24)
CORS(app)
jwt = JWTManager(app)

detector = AnomalyDetector()
email_sender = EmailSender()

DB_PATH = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'ledger.db')
CSV_PATH = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), 'updated_financial_ledger_with_anomalies.csv')


def get_db():
    return sqlite3.connect(DB_PATH)


def init_db():
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS admin (
            id INTEGER PRIMARY KEY,
            username TEXT UNIQUE NOT NULL,
            password TEXT NOT NULL
        )
    ''')
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS ledger_entries (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            date TEXT NOT NULL,
            description TEXT NOT NULL,
            debit REAL DEFAULT 0,
            credit REAL DEFAULT 0,
            account_code TEXT,
            voucher_number TEXT,
            invoice_number TEXT,
            department TEXT,
            cost_center TEXT,
            vendor_name TEXT,
            payment_mode TEXT,
            category TEXT,
            amount REAL DEFAULT 0,
            user_id INTEGER,
            is_anomaly INTEGER DEFAULT 0,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    ''')
    cursor.execute('SELECT COUNT(*) FROM admin')
    if cursor.fetchone()[0] == 0:
        cursor.execute('INSERT INTO admin (username, password) VALUES (?, ?)', ('admin', 'admin123'))
    conn.commit()
    conn.close()


def process_rows(df, cursor, bulk=False):
    """Process dataframe rows, insert into DB, return (added, anomaly_count, errors, anomalies_list)."""
    added, anomaly_count, errors, anomalies = 0, 0, [], []
    for idx, row in df.iterrows():
        try:
            date        = str(row['date'])
            description = str(row['description'])
            debit       = float(row['debit'])       if 'debit'          in df.columns and pd.notnull(row['debit'])          else 0.0
            credit      = float(row['credit'])      if 'credit'         in df.columns and pd.notnull(row['credit'])         else 0.0
            account_code   = str(row['account_code'])   if 'account_code'   in df.columns and pd.notnull(row['account_code'])   else None
            voucher_number = str(row['voucher_number']) if 'voucher_number' in df.columns and pd.notnull(row['voucher_number']) else None
            invoice_number = str(row['invoice_number']) if 'invoice_number' in df.columns and pd.notnull(row['invoice_number']) else None
            department     = str(row['department'])     if 'department'     in df.columns and pd.notnull(row['department'])     else None
            cost_center    = str(row['cost_center'])    if 'cost_center'    in df.columns and pd.notnull(row['cost_center'])    else None
            vendor_name    = str(row['vendor_name'])    if 'vendor_name'    in df.columns and pd.notnull(row['vendor_name'])    else None
            payment_mode   = str(row['payment_mode'])   if 'payment_mode'   in df.columns and pd.notnull(row['payment_mode'])   else None
            category       = str(row['category'])       if 'category'       in df.columns and pd.notnull(row['category'])       else None
            user_id        = int(row['user_id'])         if 'user_id'        in df.columns and pd.notnull(row['user_id'])        else None

            raw = row['amount'] if 'amount' in df.columns and pd.notnull(row['amount']) else None
            if raw is not None and str(raw).strip() != '':
                amount = float(raw)
            elif debit or credit:
                amount = debit if debit else credit
            else:
                amount = 0.0

            is_anomaly = detector.detect_anomaly({
                'amount': amount,
                'category': category or '',
                'description': description
            })

            cursor.execute('''
                INSERT INTO ledger_entries (
                    date, description, debit, credit, account_code, voucher_number,
                    invoice_number, department, cost_center, vendor_name, payment_mode,
                    category, amount, user_id, is_anomaly
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ''', (date, description, debit, credit, account_code, voucher_number,
                  invoice_number, department, cost_center, vendor_name, payment_mode,
                  category, amount, user_id, int(is_anomaly)))

            added += 1
            if is_anomaly:
                anomaly_count += 1
                entry_id = cursor.lastrowid
                if bulk:
                    anomalies.append({'entry_id': entry_id, 'date': date,
                                      'description': description, 'amount': amount, 'category': category})
                else:
                    email_sender.send_anomaly_alert(
                        {'date': date, 'description': description, 'amount': amount, 'category': category},
                        entry_id)
        except Exception as e:
            errors.append(f"Row {idx}: {e}")
            print(f"Row {idx} error: {e}")
    return added, anomaly_count, errors, anomalies


# ── AUTH ──────────────────────────────────────────────────────────────────────

@app.route('/api/login', methods=['POST'])
def login():
    try:
        data = request.get_json()
        conn = get_db()
        cur = conn.cursor()
        cur.execute('SELECT * FROM admin WHERE username=? AND password=?',
                    (data.get('username'), data.get('password')))
        admin = cur.fetchone()
        conn.close()
        if admin:
            token = create_access_token(identity=data['username'])
            return jsonify({'access_token': token, 'message': 'Login successful'}), 200
        return jsonify({'message': 'Invalid credentials'}), 401
    except Exception as e:
        return jsonify({'error': str(e)}), 500


# ── LEDGER ────────────────────────────────────────────────────────────────────

@app.route('/api/ledger', methods=['POST'])
@jwt_required()
def add_ledger_entry():
    try:
        data = request.get_json()
        if not data.get('date') or not data.get('description'):
            return jsonify({'error': 'date and description are required'}), 400

        debit  = float(data.get('debit',  0) or 0)
        credit = float(data.get('credit', 0) or 0)
        category = data.get('category') or ''

        raw = data.get('amount')
        if raw is not None and str(raw).strip() != '':
            amount = float(raw)
        elif debit or credit:
            amount = debit if debit else credit
        else:
            amount = 0.0

        is_anomaly = detector.detect_anomaly({
            'amount': amount,
            'category': category,
            'description': data.get('description', '')
        })

        conn = get_db()
        cur = conn.cursor()
        cur.execute('''
            INSERT INTO ledger_entries (
                date, description, debit, credit, account_code, voucher_number,
                invoice_number, department, cost_center, vendor_name, payment_mode,
                category, amount, user_id, is_anomaly
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ''', (data['date'], data['description'], debit, credit,
              data.get('account_code'), data.get('voucher_number'),
              data.get('invoice_number'), data.get('department'),
              data.get('cost_center'), data.get('vendor_name'),
              data.get('payment_mode'), category, amount,
              data.get('user_id'), int(is_anomaly)))
        entry_id = cur.lastrowid
        conn.commit()
        conn.close()

        if is_anomaly:
            email_sender.send_anomaly_alert(data, entry_id)

        return jsonify({'message': 'Entry added', 'entry_id': entry_id, 'is_anomaly': is_anomaly}), 201
    except Exception as e:
        print(f"add_ledger_entry error: {e}")
        return jsonify({'error': str(e)}), 500


@app.route('/api/ledger', methods=['GET'])
@jwt_required()
def get_ledger_entries():
    try:
        conn = get_db()
        df = pd.read_sql_query(
            'SELECT * FROM ledger_entries ORDER BY created_at DESC', conn)
        conn.close()
        entries = df.to_dict('records')
        # Replace NaN/Infinity with None so JSON serialization doesn't break
        import math
        for entry in entries:
            for k, v in entry.items():
                if isinstance(v, float) and (math.isnan(v) or math.isinf(v)):
                    entry[k] = None
        total_amount = sum(float(e.get('amount') or 0) for e in entries)
        return jsonify({
            'entries': entries,
            'total_count': len(entries),
            'anomaly_count': sum(1 for e in entries if e['is_anomaly'] == 1),
            'total_amount': total_amount
        }), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@app.route('/api/ledger/reset', methods=['DELETE'])
@jwt_required()
def reset_ledger():
    try:
        conn = get_db()
        conn.execute('DELETE FROM ledger_entries')
        conn.commit()
        conn.close()
        return jsonify({'message': 'All transactions cleared'}), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500


# ── CSV UPLOAD ────────────────────────────────────────────────────────────────

@app.route('/api/upload-csv', methods=['POST'])
@jwt_required()
def upload_csv():
    try:
        if 'file' not in request.files:
            return jsonify({'error': 'No file uploaded'}), 400
        file = request.files['file']
        if not file.filename.endswith('.csv'):
            return jsonify({'error': 'Only CSV files allowed'}), 400

        df = pd.read_csv(file)
        print(f"CSV upload: {len(df)} rows, cols: {df.columns.tolist()}")

        for col in ['date', 'description']:
            if col not in df.columns:
                return jsonify({'error': f'Missing required column: {col}'}), 400

        conn = get_db()
        added, anomaly_count, errors, anomalies = process_rows(df, conn.cursor(), bulk=True)
        conn.commit()
        conn.close()

        if added >= 10:
            detector.train_model()

        if anomalies:
            email_sender.send_bulk_anomaly_alert(anomalies)

        return jsonify({
            'message': f'Uploaded {added} entries',
            'added_count': added,
            'anomaly_count': anomaly_count,
            'errors': errors[:5]
        }), 200
    except Exception as e:
        print(f"upload_csv error: {e}")
        return jsonify({'error': str(e)}), 500


@app.route('/api/load-default-csv', methods=['POST'])
@jwt_required()
def load_default_csv():
    try:
        print(f"Looking for CSV at: {CSV_PATH}")
        if not os.path.exists(CSV_PATH):
            return jsonify({'error': f'CSV not found at: {CSV_PATH}'}), 404

        df = pd.read_csv(CSV_PATH)
        print(f"CSV loaded: {len(df)} rows, cols: {df.columns.tolist()}")

        conn = get_db()
        added, anomaly_count, errors, anomalies = process_rows(df, conn.cursor(), bulk=True)
        conn.commit()
        conn.close()

        if added >= 10:
            detector.train_model()

        if anomalies:
            email_sender.send_bulk_anomaly_alert(anomalies)

        print(f"Default CSV: {added} added, {anomaly_count} anomalies, {len(errors)} errors")
        return jsonify({
            'message': f'Loaded {added} entries',
            'added_count': added,
            'anomaly_count': anomaly_count,
            'errors': errors[:5]
        }), 200
    except Exception as e:
        print(f"load_default_csv error: {e}")
        return jsonify({'error': str(e)}), 500


# ── ANALYTICS ─────────────────────────────────────────────────────────────────

@app.route('/api/analytics', methods=['GET'])
@jwt_required()
def get_analytics():
    try:
        conn = get_db()
        cur = conn.cursor()

        cur.execute('SELECT COUNT(*) FROM ledger_entries')
        total_entries = cur.fetchone()[0]
        cur.execute('SELECT COUNT(*) FROM ledger_entries WHERE is_anomaly=1')
        total_anomalies = cur.fetchone()[0]
        cur.execute('SELECT COALESCE(SUM(amount),0) FROM ledger_entries')
        total_amount = cur.fetchone()[0]

        category_data  = pd.read_sql_query('SELECT category, SUM(amount) as total, COUNT(*) as count, SUM(is_anomaly) as anomalies FROM ledger_entries GROUP BY category', conn).to_dict('records')
        timeline_data  = pd.read_sql_query('SELECT date, SUM(amount) as total, COUNT(*) as count, SUM(is_anomaly) as anomalies FROM ledger_entries GROUP BY date ORDER BY date', conn).to_dict('records')
        vendor_data    = pd.read_sql_query('SELECT vendor_name, SUM(amount) as total, COUNT(*) as count, SUM(is_anomaly) as anomalies FROM ledger_entries GROUP BY vendor_name', conn).to_dict('records')
        payment_data   = pd.read_sql_query('SELECT payment_mode, SUM(amount) as total, COUNT(*) as count FROM ledger_entries GROUP BY payment_mode', conn).to_dict('records')
        department_data= pd.read_sql_query('SELECT department, SUM(amount) as total, COUNT(*) as count, SUM(is_anomaly) as anomalies FROM ledger_entries GROUP BY department', conn).to_dict('records')
        anomaly_list   = pd.read_sql_query('SELECT date, description, amount, category, vendor_name FROM ledger_entries WHERE is_anomaly=1 ORDER BY amount DESC', conn).to_dict('records')

        conn.close()
        return jsonify({
            'total_entries': total_entries,
            'total_anomalies': total_anomalies,
            'total_amount': total_amount,
            'anomaly_rate': round(total_anomalies / total_entries * 100, 2) if total_entries else 0,
            'category_data': category_data,
            'timeline_data': timeline_data,
            'vendor_data': vendor_data,
            'payment_data': payment_data,
            'department_data': department_data,
            'anomaly_list': anomaly_list
        }), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500


# ── REPORTS ───────────────────────────────────────────────────────────────────

def build_report(entries, period_label):
    total_entries = len(entries)
    anomalies     = sum(1 for e in entries if e[15] == 1)
    total_amount  = sum(float(e[13] or 0) for e in entries)
    anomaly_rate  = round(anomalies / total_entries * 100, 2) if total_entries else 0
    risk_level    = 'High' if anomaly_rate > 15 else 'Medium' if anomaly_rate > 10 else 'Low'
    risk_action   = {'High': 'Immediate review required', 'Medium': 'Monitor closely', 'Low': 'Continue normal operations'}[risk_level]
    compliance    = max(0, 100 - anomaly_rate * 2)
    return {
        'period': period_label,
        'generated_at': datetime.now().isoformat(),
        'summary': {
            'total_entries': total_entries,
            'anomalies': anomalies,
            'anomaly_rate': anomaly_rate,
            'total_amount': total_amount
        },
        'risk_assessment': {'level': risk_level, 'action': risk_action},
        'compliance_status': {
            'score': round(compliance),
            'status': 'Compliant' if compliance >= 80 else 'Non-Compliant'
        },
        'top_anomalies': [
            {'date': e[1], 'description': e[2], 'amount': float(e[13] or 0), 'category': e[12] or ''}
            for e in entries if e[15] == 1
        ][:10]
    }


@app.route('/api/reports/quarterly', methods=['POST'])
@jwt_required()
def quarterly_report():
    try:
        data = request.get_json()
        year, quarter = data.get('year'), data.get('quarter')
        months = {1: (1,3), 2: (4,6), 3: (7,9), 4: (10,12)}
        start, end = months[quarter]
        conn = get_db()
        cur = conn.cursor()
        cur.execute('''SELECT * FROM ledger_entries
            WHERE strftime('%Y',date)=? AND CAST(strftime('%m',date) AS INTEGER) BETWEEN ? AND ?
            ORDER BY date DESC''', (str(year), start, end))
        entries = cur.fetchall()
        conn.close()
        report = build_report(entries, f'Q{quarter}-{year}')
        report['quarter'] = f'Q{quarter} {year}'
        report['year'] = year
        return jsonify(report), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@app.route('/api/reports/annual', methods=['POST'])
@jwt_required()
def annual_report():
    try:
        data = request.get_json()
        year = data.get('year')
        conn = get_db()
        cur = conn.cursor()
        cur.execute("SELECT * FROM ledger_entries WHERE strftime('%Y',date)=? ORDER BY date DESC", (str(year),))
        entries = cur.fetchall()
        conn.close()
        report = build_report(entries, str(year))
        report['year'] = year
        report['annual_summary'] = report['summary']
        return jsonify(report), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@app.route('/api/reports/trial-balance', methods=['GET'])
@jwt_required()
def trial_balance():
    try:
        conn = get_db()
        df = pd.read_sql_query('SELECT account_code, SUM(debit) as total_debit, SUM(credit) as total_credit FROM ledger_entries GROUP BY account_code', conn)
        conn.close()
        return jsonify({'trial_balance': df.to_dict('records')}), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@app.route('/api/reports/profit-loss', methods=['GET'])
@jwt_required()
def profit_loss():
    try:
        conn = get_db()
        df = pd.read_sql_query('SELECT category, SUM(amount) as total FROM ledger_entries GROUP BY category', conn)
        conn.close()
        rows = df.to_dict('records')
        income  = sum(r['total'] or 0 for r in rows if r['category'] and r['category'].lower() == 'income')
        expense = sum(r['total'] or 0 for r in rows if r['category'] and r['category'].lower() == 'expense')
        return jsonify({'income': income, 'expense': expense, 'net': income - expense}), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@app.route('/api/reports/cash-flow', methods=['GET'])
@jwt_required()
def cash_flow():
    try:
        conn = get_db()
        cur = conn.cursor()
        cur.execute('SELECT COALESCE(SUM(credit),0) FROM ledger_entries')
        inflow = cur.fetchone()[0]
        cur.execute('SELECT COALESCE(SUM(debit),0) FROM ledger_entries')
        outflow = cur.fetchone()[0]
        conn.close()
        return jsonify({'inflow': inflow, 'outflow': outflow, 'net': inflow - outflow}), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500


# ── PDF EXPORT ────────────────────────────────────────────────────────────────

@app.route('/api/export-pdf', methods=['GET'])
@jwt_required()
def export_pdf():
    try:
        from reportlab.lib.pagesizes import A4
        from reportlab.lib import colors
        from reportlab.lib.units import inch
        from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer
        from reportlab.lib.styles import getSampleStyleSheet

        conn = get_db()
        cur = conn.cursor()
        cur.execute('SELECT * FROM ledger_entries ORDER BY created_at DESC')
        entries = cur.fetchall()
        conn.close()

        buf = io.BytesIO()
        doc = SimpleDocTemplate(buf, pagesize=A4)
        styles = getSampleStyleSheet()
        elems = [
            Paragraph('<b>Transaction History Report</b>', styles['Title']),
            Spacer(1, 12),
            Paragraph(f"Generated: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}", styles['Normal']),
            Spacer(1, 12)
        ]

        # col indices: 0=id,1=date,2=desc,3=debit,4=credit,...,12=category,13=amount,14=user_id,15=is_anomaly
        rows = [['ID', 'Date', 'Description', 'Amount', 'Category', 'Status']]
        for e in entries:
            rows.append([
                str(e[0]), str(e[1]),
                (e[2][:35] + '...') if len(e[2]) > 35 else e[2],
                f"Rs.{float(e[13] or 0):,.2f}",
                str(e[12] or ''),
                'ANOMALY' if e[15] else 'Normal'
            ])

        t = Table(rows, colWidths=[0.5*inch, 1*inch, 2.5*inch, 1.2*inch, 1*inch, 0.8*inch])
        style = [
            ('BACKGROUND', (0,0), (-1,0), colors.grey),
            ('TEXTCOLOR',  (0,0), (-1,0), colors.whitesmoke),
            ('FONTNAME',   (0,0), (-1,0), 'Helvetica-Bold'),
            ('FONTSIZE',   (0,0), (-1,0), 9),
            ('FONTSIZE',   (0,1), (-1,-1), 7),
            ('GRID',       (0,0), (-1,-1), 0.5, colors.black),
            ('ALIGN',      (0,0), (-1,-1), 'CENTER'),
        ]
        for i, e in enumerate(entries, 1):
            if e[15]:
                style += [('BACKGROUND', (0,i), (-1,i), colors.lightcoral)]
        t.setStyle(TableStyle(style))
        elems.append(t)
        doc.build(elems)
        buf.seek(0)
        return send_file(buf, mimetype='application/pdf', as_attachment=True,
                         download_name=f'report_{datetime.now().strftime("%Y%m%d")}.pdf')
    except ImportError:
        return jsonify({'message': 'Run: pip install reportlab'}), 400
    except Exception as e:
        return jsonify({'message': str(e)}), 500


@app.route('/api/reports/export-pdf', methods=['POST'])
@jwt_required()
def export_report_pdf():
    try:
        from reportlab.lib.pagesizes import A4
        from reportlab.lib import colors
        from reportlab.lib.units import inch
        from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer
        from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
        from reportlab.lib.enums import TA_CENTER

        rd = request.get_json()
        buf = io.BytesIO()
        doc = SimpleDocTemplate(buf, pagesize=A4, topMargin=0.5*inch, bottomMargin=0.5*inch)
        styles = getSampleStyleSheet()
        title_style = ParagraphStyle('T', parent=styles['Heading1'], fontSize=20,
                                     textColor=colors.HexColor('#1e40af'), alignment=TA_CENTER)
        elems = [
            Paragraph(f"<b>Compliance Report: {rd.get('period','')}</b>", title_style),
            Spacer(1, 10),
            Paragraph(f"Generated: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}", styles['Normal']),
            Spacer(1, 20)
        ]

        if 'summary' in rd:
            s = rd['summary']
            elems.append(Paragraph('<b>Executive Summary</b>', styles['Heading2']))
            elems.append(Spacer(1, 6))
            t = Table([
                ['Metric', 'Value'],
                ['Total Entries', str(s['total_entries'])],
                ['Anomalies', str(s['anomalies'])],
                ['Anomaly Rate', f"{s['anomaly_rate']}%"],
                ['Total Amount', f"Rs.{s['total_amount']:,.2f}"]
            ], colWidths=[3*inch, 3*inch])
            t.setStyle(TableStyle([
                ('BACKGROUND', (0,0), (-1,0), colors.HexColor('#1e40af')),
                ('TEXTCOLOR',  (0,0), (-1,0), colors.white),
                ('FONTNAME',   (0,0), (-1,0), 'Helvetica-Bold'),
                ('BACKGROUND', (0,1), (-1,-1), colors.beige),
                ('GRID',       (0,0), (-1,-1), 1, colors.black),
            ]))
            elems += [t, Spacer(1, 16)]

        if 'risk_assessment' in rd:
            r = rd['risk_assessment']
            rc = colors.green if r['level'] == 'Low' else colors.orange if r['level'] == 'Medium' else colors.red
            elems.append(Paragraph('<b>Risk Assessment</b>', styles['Heading2']))
            elems.append(Spacer(1, 6))
            t = Table([['Risk Level', 'Action'], [r['level'], r['action']]], colWidths=[2*inch, 4*inch])
            t.setStyle(TableStyle([
                ('BACKGROUND', (0,0), (-1,0), colors.HexColor('#1e40af')),
                ('TEXTCOLOR',  (0,0), (-1,0), colors.white),
                ('FONTNAME',   (0,0), (-1,0), 'Helvetica-Bold'),
                ('BACKGROUND', (0,1), (0,1), rc),
                ('TEXTCOLOR',  (0,1), (0,1), colors.white),
                ('GRID',       (0,0), (-1,-1), 1, colors.black),
            ]))
            elems += [t, Spacer(1, 16)]

        if rd.get('top_anomalies'):
            elems.append(Paragraph('<b>Top Anomalies</b>', styles['Heading2']))
            elems.append(Spacer(1, 6))
            rows = [['Date', 'Description', 'Amount', 'Category']]
            for a in rd['top_anomalies'][:10]:
                desc = (a['description'][:40] + '...') if len(a['description']) > 40 else a['description']
                rows.append([a['date'], desc, f"Rs.{float(a['amount']):,.2f}", a['category']])
            t = Table(rows, colWidths=[1*inch, 2.5*inch, 1.5*inch, 1*inch])
            t.setStyle(TableStyle([
                ('BACKGROUND', (0,0), (-1,0), colors.HexColor('#dc2626')),
                ('TEXTCOLOR',  (0,0), (-1,0), colors.white),
                ('FONTNAME',   (0,0), (-1,0), 'Helvetica-Bold'),
                ('BACKGROUND', (0,1), (-1,-1), colors.mistyrose),
                ('GRID',       (0,0), (-1,-1), 1, colors.black),
                ('FONTSIZE',   (0,1), (-1,-1), 8),
            ]))
            elems.append(t)

        doc.build(elems)
        buf.seek(0)
        return send_file(buf, mimetype='application/pdf', as_attachment=True,
                         download_name=f"compliance_{rd.get('period','report')}.pdf")
    except ImportError:
        return jsonify({'message': 'Run: pip install reportlab'}), 400
    except Exception as e:
        return jsonify({'message': str(e)}), 500


if __name__ == '__main__':
    init_db()
    app.run(debug=True, port=5000)
