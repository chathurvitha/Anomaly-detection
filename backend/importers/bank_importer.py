import pandas as pd
from flask import request, jsonify
from flask_jwt_extended import jwt_required
from app import app
import sqlite3
import os

def parse_bank_csv(file):
    df = pd.read_csv(file)
    # Try to map common bank statement columns
    mapping = {
        'Txn Date': 'date',
        'Description': 'description',
        'Withdrawal Amt.': 'debit',
        'Deposit Amt.': 'credit',
        'Chq/Ref No.': 'voucher_number',
        'Balance': 'balance',
        'Account No.': 'account_code',
        'Transaction Type': 'payment_mode',
        'Party Name': 'vendor_name',
    }
    df = df.rename(columns={k: v for k, v in mapping.items() if k in df.columns})
    for col in ['date','description','debit','credit','account_code','voucher_number','vendor_name','payment_mode']:
        if col not in df.columns:
            df[col] = None
    return df

@app.route('/api/import/bank', methods=['POST'])
@jwt_required()
def import_bank():
    if 'file' not in request.files:
        return jsonify({'error': 'No file uploaded'}), 400
    file = request.files['file']
    if file.filename == '':
        return jsonify({'error': 'No file selected'}), 400
    try:
        df = parse_bank_csv(file)
        conn = sqlite3.connect('ledger.db')
        cursor = conn.cursor()
        added_count = 0
        for _, row in df.iterrows():
            cursor.execute('''
                INSERT INTO ledger_entries (date, description, debit, credit, account_code, voucher_number, vendor_name, payment_mode)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            ''', (
                row['date'], row['description'], row['debit'], row['credit'], row['account_code'], row['voucher_number'], row['vendor_name'], row['payment_mode']
            ))
            added_count += 1
        conn.commit()
        conn.close()
        return jsonify({'message': f'Successfully imported {added_count} entries from Bank CSV.'}), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500
