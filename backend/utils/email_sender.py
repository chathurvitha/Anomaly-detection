import smtplib
import io
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from email.mime.base import MIMEBase
from email import encoders
from datetime import datetime

class EmailSender:
    def __init__(self):
        self.smtp_server = "smtp.gmail.com"
        self.smtp_port = 587
        self.sender_email = "chathurvitha@gmail.com"
        self.sender_password = "ebxn vqta qbve alyq"
        self.authority_email = "23619232@vistas.ac.in"

    def _build_pdf(self, anomalies):
        """Build a PDF report for a list of anomalies and return bytes."""
        from reportlab.lib.pagesizes import A4
        from reportlab.lib import colors
        from reportlab.lib.units import inch
        from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer
        from reportlab.lib.styles import getSampleStyleSheet

        buf = io.BytesIO()
        doc = SimpleDocTemplate(buf, pagesize=A4, topMargin=0.5*inch, bottomMargin=0.5*inch)
        styles = getSampleStyleSheet()
        elems = [
            Paragraph('<b style="color:#d32f2f;">🚨Anomaly Report Alert</b>', styles['Title']),
            Spacer(1, 8),
            Paragraph(f"Generated: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')} &nbsp;|&nbsp; Total Anomalies: {len(anomalies)}", styles['Normal']),
            Spacer(1, 14),
        ]

        rows = [['#', 'Entry ID', 'Date', 'Description', 'Amount (₹)', 'Category']]
        for i, a in enumerate(anomalies, 1):
            desc = (a['description'][:38] + '...') if len(a['description']) > 38 else a['description']
            rows.append([
                str(i), str(a['entry_id']), str(a['date']), desc,
                f"{float(a['amount']):,.2f}", str(a['category'] or '')
            ])

        col_widths = [0.3*inch, 0.6*inch, 0.9*inch, 2.6*inch, 1.1*inch, 0.9*inch]
        t = Table(rows, colWidths=col_widths, repeatRows=1)
        t.setStyle(TableStyle([
            ('BACKGROUND',  (0, 0), (-1, 0), colors.HexColor('#b71c1c')),
            ('TEXTCOLOR',   (0, 0), (-1, 0), colors.white),
            ('FONTNAME',    (0, 0), (-1, 0), 'Helvetica-Bold'),
            ('FONTSIZE',    (0, 0), (-1, 0), 9),
            ('FONTSIZE',    (0, 1), (-1, -1), 8),
            ('BACKGROUND',  (0, 1), (-1, -1), colors.mistyrose),
            ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.mistyrose, colors.HexColor('#ffe4e4')]),
            ('GRID',        (0, 0), (-1, -1), 0.5, colors.grey),
            ('ALIGN',       (0, 0), (-1, -1), 'CENTER'),
            ('VALIGN',      (0, 0), (-1, -1), 'MIDDLE'),
            ('TOPPADDING',  (0, 0), (-1, -1), 4),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 4),
        ]))
        elems.append(t)
        doc.build(elems)
        buf.seek(0)
        return buf.read()

    def send_bulk_anomaly_alert(self, anomalies):
        """Send a single email with all anomalies from a bulk upload as a PDF attachment."""
        try:
            pdf_bytes = self._build_pdf(anomalies)

            msg = MIMEMultipart()
            msg['From'] = self.sender_email
            msg['To'] = self.authority_email
            msg['Subject'] = f"🚨 Bulk Upload Anomaly Report — {len(anomalies)} Anomalies Detected"

            body = f"""
            <html><body>
            <h2 style="color:#d32f2f;">⚠️ Bulk Upload Anomaly Report</h2>
            <p>A bulk CSV upload was processed and <strong>{len(anomalies)} anomalous entries</strong> were detected.</p>
            <p>Please review the attached PDF for the full list of flagged transactions.</p>
            <hr>
            <p style="font-size:12px;color:#666;">Generated at: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}<br>
            This is an automated message from FinanceGuard Pro.</p>
            </body></html>
            """
            msg.attach(MIMEText(body, 'html'))

            part = MIMEBase('application', 'octet-stream')
            part.set_payload(pdf_bytes)
            encoders.encode_base64(part)
            filename = f"anomaly_report_{datetime.now().strftime('%Y%m%d_%H%M%S')}.pdf"
            part.add_header('Content-Disposition', f'attachment; filename="{filename}"')
            msg.attach(part)

            server = smtplib.SMTP(self.smtp_server, self.smtp_port)
            server.starttls()
            server.login(self.sender_email, self.sender_password)
            server.sendmail(self.sender_email, self.authority_email, msg.as_string())
            server.quit()
            print(f"Bulk anomaly report sent: {len(anomalies)} anomalies")
            return True
        except Exception as e:
            print(f"Bulk email failed: {e}")
            return False

    def send_anomaly_alert(self, ledger_data, entry_id):
        """Send email alert for detected anomaly"""
        try:
            # Create message
            msg = MIMEMultipart()
            msg['From'] = self.sender_email
            msg['To'] = self.authority_email
            msg['Subject'] = f"🚨 ANOMALY DETECTED - Ledger Entry #{entry_id}"
            
            # Email body
            body = f"""
            <html>
            <body>
                <h2 style="color: #d32f2f;">⚠️ ANOMALY ALERT</h2>
                
                <p>An anomalous ledger entry has been detected:</p>
                
                <div style="background-color: #f5f5f5; padding: 15px; border-left: 4px solid #d32f2f;">
                    <h3>Entry Details:</h3>
                    <ul>
                        <li><strong>Entry ID:</strong> {entry_id}</li>
                        <li><strong>Date:</strong> {ledger_data['date']}</li>
                        <li><strong>Description:</strong> {ledger_data['description']}</li>
                        <li><strong>Amount:</strong> ₹{float(ledger_data.get('amount', 0) or 0):,.2f}</li>
                        <li><strong>Category:</strong> {ledger_data.get('category', 'N/A')}</li>
                        <li><strong>Detection Time:</strong> {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}</li>
                    </ul>
                </div>
                
                <h3>Possible Reasons for Anomaly:</h3>
                <ul>
                    <li>Unusually high transaction amount</li>
                    <li>Inconsistent category-amount relationship</li>
                    <li>Pattern deviation from historical data</li>
                </ul>
                
                <p><strong>Action Required:</strong> Please review this entry and take appropriate action.</p>
                
                <hr>
                <p style="font-size: 12px; color: #666;">
                    This is an automated message from FinanceGuard Pro.<br>
                    Generated at: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}
                </p>
            </body>
            </html>
            """
            
            msg.attach(MIMEText(body, 'html'))
            
            # Send email
            server = smtplib.SMTP(self.smtp_server, self.smtp_port)
            server.starttls()
            server.login(self.sender_email, self.sender_password)
            text = msg.as_string()
            server.sendmail(self.sender_email, self.authority_email, text)
            server.quit()
            
            print(f"Anomaly alert sent for entry {entry_id}")
            return True
            
        except Exception as e:
            print(f"Email sending failed: {e}")
            # Log to file as backup
            self._log_anomaly(ledger_data, entry_id)
            return False
    
    def _log_anomaly(self, ledger_data, entry_id):
        """Log anomaly to file as backup"""
        try:
            with open('anomaly_log.txt', 'a') as f:
                f.write(f"\n{'='*50}\n")
                f.write(f"ANOMALY DETECTED - {datetime.now()}\n")
                f.write(f"Entry ID: {entry_id}\n")
                f.write(f"Date: {ledger_data['date']}\n")
                f.write(f"Description: {ledger_data['description']}\n")
                f.write(f"Amount: ₹{float(ledger_data.get('amount', 0) or 0)}\n")
                f.write(f"Category: {ledger_data.get('category', 'N/A')}\n")
                f.write(f"{'='*50}\n")
        except Exception as e:
            print(f"Logging failed: {e}")
    
    def test_email_connection(self):
        """Test email configuration"""
        try:
            server = smtplib.SMTP(self.smtp_server, self.smtp_port)
            server.starttls()
            server.login(self.sender_email, self.sender_password)
            server.quit()
            return True
        except Exception as e:
            print(f"Email test failed: {e}")
            return False