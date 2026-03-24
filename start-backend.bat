@echo off
echo Starting Backend Server...
cd backend
call ..\.venv\Scripts\activate.bat
python app.py
