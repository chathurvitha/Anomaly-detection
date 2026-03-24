import os
import pickle
import numpy as np
import pandas as pd
import sqlite3
from sklearn.ensemble import IsolationForest
from sklearn.preprocessing import LabelEncoder

BASE_DIR  = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DB_PATH   = os.path.join(BASE_DIR, 'ledger.db')
MODEL_PATH = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'anomaly_model.pkl')

CATEGORIES = ['income', 'expense', 'transfer', 'investment', 'loan', 'cash', 'other']


class AnomalyDetector:
    def __init__(self):
        self.model = IsolationForest(contamination=0.15, n_estimators=100, random_state=42)
        self.label_encoder = LabelEncoder()
        self.label_encoder.fit(CATEGORIES)
        self.is_trained = False
        self._load_model()

    def _encode_category(self, category):
        cat = (category or '').lower().strip()
        if cat not in CATEGORIES:
            cat = 'other'
        return self.label_encoder.transform([cat])[0]

    def _features(self, data):
        amount = float(data.get('amount') or 0)
        cat_enc = self._encode_category(data.get('category', ''))
        desc_len = len(data.get('description', ''))
        return np.array([[amount, cat_enc, desc_len, np.log1p(abs(amount)), amount / 100000]])

    def detect_anomaly(self, data):
        # Always run rule-based first — it catches definitive cases
        if self._rule_based(data):
            return True
        # ML model as secondary check when trained
        if self.is_trained:
            try:
                pred = self.model.predict(self._features(data))
                return pred[0] == -1
            except Exception as e:
                print(f"ML detection error: {e}")
        return False

    def _rule_based(self, data):
        amount   = float(data.get('amount') or 0)
        category = (data.get('category') or '').lower().strip()
        desc     = (data.get('description') or '').lower()

        if abs(amount) > 800000:                          return True
        if category == 'income'   and amount < 0:         return True
        if category == 'expense'  and amount > 400000:    return True
        if category == 'expense'  and amount < -5000:     return True
        if category == 'cash'     and abs(amount) > 500000: return True
        if any(kw in desc for kw in ['duplicate', 'negative', 'fraud', 'suspicious', 'round number']):
            return True
        return False

    def train_model(self):
        try:
            conn = sqlite3.connect(DB_PATH)
            df = pd.read_sql_query(
                'SELECT amount, category, description FROM ledger_entries WHERE amount IS NOT NULL', conn)
            conn.close()

            if len(df) < 10:
                print(f"Not enough data to train: {len(df)} rows")
                return False

            df['category'] = df['category'].fillna('other')
            df['description'] = df['description'].fillna('')
            df['amount'] = df['amount'].fillna(0)

            X = np.array([
                self._features({'amount': r['amount'], 'category': r['category'], 'description': r['description']})[0]
                for _, r in df.iterrows()
            ])

            self.model.fit(X)
            self.is_trained = True
            self._save_model()
            print(f"Model trained on {len(X)} entries")
            return True
        except Exception as e:
            print(f"Training error: {e}")
            return False

    def _save_model(self):
        try:
            with open(MODEL_PATH, 'wb') as f:
                pickle.dump({'model': self.model, 'is_trained': self.is_trained}, f)
        except Exception as e:
            print(f"Model save error: {e}")

    def _load_model(self):
        try:
            if os.path.exists(MODEL_PATH):
                with open(MODEL_PATH, 'rb') as f:
                    data = pickle.load(f)
                self.model = data['model']
                self.is_trained = data.get('is_trained', False)
                print(f"Model loaded — trained: {self.is_trained}")
        except Exception as e:
            print(f"Model load error: {e}")
