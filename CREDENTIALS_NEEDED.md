# Add Your Credentials to .env

Edit `food_fox_backend/.env` and replace these placeholders:

## 1. SMTP (for Email OTP - FREE)

```
SMTP_USER=your_actual_email@gmail.com
SMTP_PASS=your_16_char_app_password
SMTP_FROM=Saraswati Tiffin <your_actual_email@gmail.com>
```

**Gmail**: Get App Password at https://myaccount.google.com/apppasswords

## 2. Fast2SMS (for SMS OTP)

```
FAST2SMS_API_KEY=your_api_key_from_fast2sms_dashboard
```

Get it at: https://www.fast2sms.com

## 3. DLT (optional - for consistent sender)

After completing DLT_SETUP_GUIDE.md, uncomment and add:

```
FAST2SMS_SENDER_ID=SRSTFN
FAST2SMS_DLT_TEMPLATE_ID=your_approved_template_id
```

---

**Without credentials**: In development, Email OTP logs to console. SMS falls back to console OTP.
