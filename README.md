# Anomaly Detection System

A full-stack application that detects anomalies in ledger entries using machine learning and sends automated email alerts.

## Features

- **Admin Authentication**: Secure login system
- **Ledger Management**: Submit and view ledger entries
- **ML Anomaly Detection**: Uses Isolation Forest algorithm
- **Email Notifications**: Automated alerts to authorities
- **Real-time Dashboard**: View all entries with anomaly status

## Setup Instructions

### Backend Setup

1. Navigate to backend directory:
```bash
cd backend
```

2. Install Python dependencies:
```bash
pip install -r requirements.txt
```

3. Configure email settings in `utils/email_sender.py`:
   - Update `sender_email` with your Gmail address
   - Update `sender_password` with your Gmail App Password
   - Update `authority_email` with the recipient email

4. Run the Flask application:
```bash
python app.py
```

Backend will run on http://localhost:5000

### Frontend Setup

1. Navigate to frontend directory:
```bash
cd frontend
```

2. Install Node.js dependencies:
```bash
npm install
```

3. Start the React development server:
```bash
npm start
```

Frontend will run on http://localhost:3000

## Usage

1. **Login**: Use default credentials (admin/admin123)
2. **Submit Ledger**: Fill out the form with transaction details
3. **Anomaly Detection**: System automatically detects anomalies based on:
   - Unusually high amounts (>₹8,00,000)
   - Category-amount inconsistencies
   - Pattern deviations from historical data
4. **Email Alerts**: Authorities receive automated emails for detected anomalies
5. **Dashboard**: View all entries with their anomaly status

## Email Configuration

To enable email notifications:

1. Enable 2-Factor Authentication on your Gmail account
2. Generate an App Password for Gmail
3. Update the email configuration in `backend/utils/email_sender.py`

## Database

The system uses SQLite database (`ledger.db`) with tables:
- `admin`: Admin credentials
- `ledger_entries`: Transaction records with anomaly flags

## Machine Learning Model

- **Algorithm**: Isolation Forest
- **Features**: Amount, category, description length, amount magnitude
- **Training**: Automatically trains on historical data
- **Fallback**: Rule-based detection for initial entries

## Security Features

- JWT token authentication
- Password-based admin access
- CORS protection
- Input validation

## File Structure

```
anomaly detection/
├── backend/
│   ├── app.py                 # Main Flask application
│   ├── requirements.txt       # Python dependencies
│   └── utils/
│       ├── anomaly_detector.py # ML model
│       └── email_sender.py     # Email notifications
└── frontend/
    ├── package.json           # Node.js dependencies
    ├── public/
    │   └── index.html         # HTML template
    └── src/
        ├── App.js             # Main React component
        ├── App.css            # Styles
        ├── index.js           # React entry point
        └── pages/
            ├── Login.js       # Login page
            └── Dashboard.js   # Main dashboard
```