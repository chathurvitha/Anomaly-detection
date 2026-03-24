import pandas as pd
from flask import request, jsonify
from flask_jwt_extended import jwt_required
from app import app
import sqlite3
import os

def parse_tally_csv(file):
    df = pd.read_csv(file)
    # Map Tally columns to internal schema
    mapping = {
        'Date': 'date',
        'Particulars': 'description',
        'Debit': 'debit',
        'Credit': 'credit',
        'Voucher Type': 'voucher_number',
        'Voucher No.': 'invoice_number',
        'Account': 'account_code',
        'Cost Centre': 'cost_center',
        'Party': 'vendor_name',
        'Payment Mode': 'payment_mode',
    }
    df = df.rename(columns={k: v for k, v in mapping.items() if k in df.columns})
    # Fill missing columns
    for col in ['date','description','debit','credit','account_code','voucher_number','invoice_number','cost_center','vendor_name','payment_mode']:
        if col not in df.columns:
            df[col] = None
    return df

@app.route('/api/import/tally', methods=['POST'])
@jwt_required()
def import_tally():
    if 'file' not in request.files:
        return jsonify({'error': 'No file uploaded'}), 400
    file = request.files['file']
    if file.filename == '':
        return jsonify({'error': 'No file selected'}), 400
    try:
        df = parse_tally_csv(file)
        conn = sqlite3.connect('ledger.db')
        cursor = conn.cursor()
        added_count = 0
        for _, row in df.iterrows():
            cursor.execute('''
                INSERT INTO ledger_entries (date, description, debit, credit, account_code, voucher_number, invoice_number, cost_center, vendor_name, payment_mode)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ''', (
                row['date'], row['description'], row['debit'], row['credit'], row['account_code'], row['voucher_number'], row['invoice_number'], row['cost_center'], row['vendor_name'], row['payment_mode']
            ))
            added_count += 1
        conn.commit()
        conn.close()
        return jsonify({'message': f'Successfully imported {added_count} entries from Tally CSV.'}), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500
