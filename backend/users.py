import sqlite3
from flask import request, jsonify
from flask_jwt_extended import jwt_required
from app import app
import pandas as pd

@app.route('/api/users', methods=['GET'])
@jwt_required()
def get_users():
    conn = sqlite3.connect('ledger.db')
    df = pd.read_sql_query('SELECT id, username, department FROM admin', conn)
    conn.close()
    return jsonify({'users': df.to_dict('records')})

@app.route('/api/users', methods=['POST'])
@jwt_required()
def add_user():
    data = request.get_json()
    username = data.get('username')
    password = data.get('password')
    department = data.get('department')
    if not username or not password:
        return jsonify({'error': 'Username and password required'}), 400
    conn = sqlite3.connect('ledger.db')
    cursor = conn.cursor()
    try:
        cursor.execute('INSERT INTO admin (username, password, department) VALUES (?, ?, ?)', (username, password, department))
        conn.commit()
        return jsonify({'message': 'User added successfully'}), 201
    except Exception as e:
        return jsonify({'error': str(e)}), 500
    finally:
        conn.close()

@app.route('/api/users/<int:user_id>', methods=['DELETE'])
@jwt_required()
def delete_user(user_id):
    conn = sqlite3.connect('ledger.db')
    cursor = conn.cursor()
    cursor.execute('DELETE FROM admin WHERE id = ?', (user_id,))
    conn.commit()
    conn.close()
    return jsonify({'message': 'User deleted successfully'})
