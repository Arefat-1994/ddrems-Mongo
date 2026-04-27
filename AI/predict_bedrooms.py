import sys
import json

def predict():
    try:
        # Read from stdin
        line = sys.stdin.read()
        if not line:
            print(json.dumps({"success": False, "error": "No input received"}))
            return
            
        input_data = json.loads(line)
        location = input_data.get('location', 'Kezira')
        bedrooms = int(input_data.get('bedrooms', 2))
        area = float(input_data.get('area', 120))
        model_type = input_data.get('model_type', 'sell')
        
        # Simple heuristic model for Dire Dawa
        base_price_sqm = 18000
        location_multipliers = {
            'kezira': 1.6,
            'sabiyan': 1.3,
            'sabian': 1.3,
            'goro': 1.1,
            'ceido': 1.2,
            'dire dawa': 1.0,
            'kezira': 1.7,
            'ashawa': 1.2,
            'dechetu': 1.1,
            'station road': 1.4
        }
        
        # Match location
        loc_lower = location.lower()
        multiplier = 1.0
        for loc, mult in location_multipliers.items():
            if loc in loc_lower:
                multiplier = mult
                break
        
        price_sqm = base_price_sqm * multiplier
        
        # Bedroom adjustment: +5% per bedroom above 2, -5% below
        price_sqm *= (1 + (bedrooms - 2) * 0.05)
        
        if model_type == 'rent':
            # Rent is roughly 0.6% of sell value per month in this market
            price_sqm *= 0.006 
            
        total_price = price_sqm * area
        
        result = {
            "success": True,
            "predictedPrice": round(price_sqm, 2),
            "totalPrice": round(total_price, 2),
            "lowEstimate": round(total_price * 0.88, 2),
            "highEstimate": round(total_price * 1.12, 2),
            "pricePerSqm": round(price_sqm, 2),
            "confidence": 82,
            "modelType": model_type
        }
        print(json.dumps(result))
    except Exception as e:
        print(json.dumps({"success": False, "error": str(e)}))

if __name__ == "__main__":
    predict()
