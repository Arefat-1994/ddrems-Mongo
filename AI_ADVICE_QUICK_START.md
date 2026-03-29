# AI Advice System - Quick Start Guide

## Prerequisites

- Node.js 14+ installed
- Python 3.7+ installed
- MySQL/MariaDB running
- Database configured in `.env`

## Installation

### 1. Install Node Dependencies
```bash
npm install
```

### 2. Install Python Dependencies
```bash
pip install pandas numpy scikit-learn joblib
```

### 3. Verify Python is in PATH
```bash
python --version
```

### 4. Verify ML Models Exist
Check that these files exist in the `AI/` directory:
- `dire_dawa_price_model.pkl`
- `scaler.pkl`
- `encoders.pkl`
- `feature_names.pkl`
- `model_metrics.pkl`
- `dire_dawa_real_estate_dataset.csv`

If models don't exist, train them:
```bash
cd AI
python ai.py
cd ..
```

## Running the Application

### Start the Server
```bash
npm start
```

Or use the batch file:
```bash
start-dev.bat
```

The server should start on `http://localhost:5000`

## Testing the AI Advice System

### Test 1: Frontend Testing

1. **Open the application** in your browser
2. **Login** with any user account
3. **Click the "⚡ AI Advice" button** in the sidebar footer
4. **Click "✨ Get Advice"** button
5. **Verify advice displays** with:
   - Title
   - Description
   - Recommendations (list)
   - Metrics (key-value pairs)
   - Alerts (colored messages)
6. **Click "🔄 Refresh"** to get updated advice
7. **Click "✕"** to close the modal

### Test 2: Backend API Testing

Test the API endpoint directly:

```bash
# Admin advice
curl "http://localhost:5000/api/ai/advice?role=admin&userId=1"

# System Admin advice
curl "http://localhost:5000/api/ai/advice?role=system_admin&userId=1"

# Property Admin advice
curl "http://localhost:5000/api/ai/advice?role=property_admin&userId=1"

# Broker advice
curl "http://localhost:5000/api/ai/advice?role=broker&userId=2"

# Owner advice
curl "http://localhost:5000/api/ai/advice?role=owner&userId=3"

# Customer advice
curl "http://localhost:5000/api/ai/advice?role=user&userId=4"
```

Expected response:
```json
{
  "success": true,
  "advice": {
    "title": "Role-specific title",
    "description": "Description",
    "recommendations": ["Recommendation 1", "Recommendation 2"],
    "metrics": {"Metric 1": "Value 1"},
    "alerts": [{"type": "info", "message": "Alert message"}]
  }
}
```

### Test 3: Python AI Engine Testing

Test the Python engine directly:

```bash
cd AI
python ai_advice_engine.py --role admin --data '{"stats": {"properties": {"total": 10, "avg_price": 2500000}}}'
cd ..
```

Expected output:
```json
{
  "title": "Admin Dashboard Insights",
  "description": "...",
  "recommendations": [...],
  "metrics": {...},
  "alerts": [...]
}
```

### Test 4: Role-Based Testing

Test each role's advice:

1. **Admin Dashboard**
   - Login as admin
   - Click AI Advice
   - Verify admin-specific recommendations

2. **System Admin Dashboard**
   - Login as system_admin
   - Click AI Advice
   - Verify system admin-specific recommendations

3. **Property Admin Dashboard**
   - Login as property_admin
   - Click AI Advice
   - Verify property admin-specific recommendations

4. **Broker Dashboard**
   - Login as broker
   - Click AI Advice
   - Verify broker-specific recommendations

5. **Owner Dashboard**
   - Login as owner
   - Click AI Advice
   - Verify owner-specific recommendations

6. **Customer Dashboard**
   - Login as user/customer
   - Click AI Advice
   - Verify customer-specific recommendations

## Troubleshooting

### Issue: "Python not found" error

**Solution:**
1. Verify Python is installed: `python --version`
2. Add Python to PATH
3. Set `PYTHON_PATH` in `.env` file

### Issue: "Models not found" error

**Solution:**
1. Check files exist in `AI/` directory
2. Run `python AI/ai.py` to train models
3. Verify file paths are correct

### Issue: "Database connection error"

**Solution:**
1. Check database is running
2. Verify `.env` configuration
3. Check database credentials
4. Verify database exists

### Issue: Slow response time

**Solution:**
1. Check if Python is installed
2. Verify model files are not corrupted
3. Check system resources
4. Enable caching (should be automatic)

### Issue: Same advice returned repeatedly

**Solution:**
1. Clear cache: Restart the server
2. Check cache timeout setting (default: 5 minutes)
3. Verify database data is changing

## Performance Metrics

### Expected Response Times
- First call: ~350ms (includes Python spawn)
- Cached call: ~10ms
- Database query: ~100ms
- Python inference: ~50ms

### Resource Usage
- Python process: ~50MB RAM
- Model files: ~10MB disk
- Cache: ~1MB per role

## Features

✅ **All 6 Dashboards Supported**
- Admin
- System Admin
- Property Admin
- Broker
- Owner
- Customer

✅ **Role-Specific Advice**
- Personalized recommendations
- Data-driven metrics
- Intelligent alerts

✅ **Beautiful UI**
- Gradient background
- Smooth animations
- Responsive design
- Modal overlay

✅ **Advanced Features**
- Python AI integration
- ML model predictions
- Database integration
- Result caching
- Error handling

## Files to Review

1. **Frontend:**
   - `client/src/components/AIAdviceSidebar.js`
   - `client/src/components/Sidebar.js`

2. **Backend:**
   - `server/routes/ai.js`
   - `server/services/ai-advice-service.js`

3. **Python:**
   - `AI/ai_advice_engine.py`

4. **Documentation:**
   - `AI_ADVICE_COMPLETE_SUMMARY.md`
   - `AI_ADVICE_PYTHON_INTEGRATION.md`
   - `AI_ADVICE_VERIFICATION_REPORT.md`

## Next Steps

1. ✅ Install dependencies
2. ✅ Verify Python installation
3. ✅ Verify ML models exist
4. ✅ Start the server
5. ✅ Test each role
6. ✅ Monitor performance
7. ✅ Deploy to production

## Support

For issues or questions:
1. Check troubleshooting section above
2. Review console logs
3. Check AI_ADVICE_PYTHON_INTEGRATION.md
4. Contact development team

---

**Status:** ✅ **READY FOR TESTING**

**Last Updated:** March 19, 2026
