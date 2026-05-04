#!/usr/bin/env python3
"""
DDREMS Hybrid ML + GIS + Amenity-Based Real Estate Pricing Engine
"""
import sys
import json
import os
import warnings
import pickle
import numpy as np
import pandas as pd
from sklearn.ensemble import RandomForestRegressor
from sklearn.preprocessing import LabelEncoder
from sklearn.model_selection import cross_val_score
from math import radians, sin, cos, sqrt, atan2, exp

warnings.filterwarnings('ignore')

# ──────────────────────────────────────────────
# CONFIG
# ──────────────────────────────────────────────
SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
SALE_CSV = os.path.join(SCRIPT_DIR, 'dataset for sale 1.csv')
RENT_CSV = os.path.join(SCRIPT_DIR, 'dataset for rent 1.csv')
MODEL_CACHE_DIR = os.path.join(SCRIPT_DIR, 'cache')

if not os.path.exists(MODEL_CACHE_DIR):
    os.makedirs(MODEL_CACHE_DIR)

# City center (Dire Dawa)
CITY_CENTER = (9.5931, 41.8661)

FEATURE_COLS = [
    'latitude', 'longitude', 'bedrooms', 'bathrooms'
]

CAT_COLS = ['location_name', 'property_type', 'condition']

# Amenity multipliers (Percentage increase)
AMENITY_WEIGHTS = {
    'near_school': 0.05,    # +5%
    'near_hospital': 0.05,  # +5%
    'near_market': 0.04,    # +4%
    'parking': 0.03,        # +3%
}
SECURITY_WEIGHT_PER_LEVEL = 0.02 # +2% per rating level (1-5)

# ──────────────────────────────────────────────
# GIS FUNCTIONS
# ──────────────────────────────────────────────
def haversine(lat1, lon1, lat2, lon2):
    R = 6371
    dlat = radians(lat2 - lat1)
    dlon = radians(lon2 - lon1)
    a = sin(dlat/2)**2 + cos(radians(lat1)) * cos(radians(lat2)) * sin(dlon/2)**2
    c = 2 * atan2(sqrt(a), sqrt(1 - a))
    return R * c

def neighborhood_price(df, lat, lon, radius=2):
    # Vectorized haversine approximation for faster filtering
    # In a real app we might use a spatial index, but for small datasets this is fine
    df['dist'] = df.apply(lambda r: haversine(lat, lon, r['latitude'], r['longitude']), axis=1)
    nearby = df[df['dist'] <= radius]
    if len(nearby) == 0:
        return df['price'].mean()
    return nearby['price'].mean()

# ──────────────────────────────────────────────
# DATA LOADING
# ──────────────────────────────────────────────
def load_and_prepare(csv_path):
    df = pd.read_csv(csv_path)
    df.columns = df.columns.str.strip()

    for col in FEATURE_COLS:
        if col in df.columns:
            df[col] = pd.to_numeric(df[col], errors='coerce').fillna(0)

    df['price'] = pd.to_numeric(df['price'], errors='coerce')
    df = df.dropna(subset=['price'])

    encoders = {}
    for col in CAT_COLS:
        if col in df.columns:
            le = LabelEncoder()
            df[col + '_encoded'] = le.fit_transform(df[col].astype(str).str.strip().str.lower())
            encoders[col] = le

    return df, encoders

# ──────────────────────────────────────────────
# MODEL
# ──────────────────────────────────────────────
def build_model(csv_path):
    model_name = "sale_model.pkl" if "sale" in csv_path else "rent_model.pkl"
    model_path = os.path.join(MODEL_CACHE_DIR, model_name)
    meta_path = model_path + ".meta"

    # Try loading from cache
    if os.path.exists(model_path) and os.path.exists(meta_path):
        try:
            with open(model_path, 'rb') as f:
                model = pickle.load(f)
            with open(meta_path, 'rb') as f:
                meta = pickle.load(f)
            df, encoders = load_and_prepare(csv_path) # still need df for neigh_price
            return model, meta['encoders'], meta['feature_names'], df, meta['confidence']
        except:
            pass

    # Train new model
    df, encoders = load_and_prepare(csv_path)

    feature_names = []
    X_parts = []

    for col in FEATURE_COLS:
        if col in df.columns:
            X_parts.append(df[col].values.reshape(-1, 1))
            feature_names.append(col)

    for col in CAT_COLS:
        enc_col = col + '_encoded'
        if enc_col in df.columns:
            X_parts.append(df[enc_col].values.reshape(-1, 1))
            feature_names.append(col)

    X = np.hstack(X_parts)
    y = df['price'].values

    model = RandomForestRegressor(
        n_estimators=100, # Reduced trees for speed
        max_depth=12,
        random_state=42,
        n_jobs=-1
    )
    model.fit(X, y)

    try:
        scores = cross_val_score(model, X, y, cv=3, scoring='r2')
        confidence = int(max(0, min(100, scores.mean() * 100)))
    except:
        confidence = 75

    # Save to cache
    try:
        with open(model_path, 'wb') as f:
            pickle.dump(model, f)
        with open(meta_path, 'wb') as f:
            pickle.dump({
                'encoders': encoders,
                'feature_names': feature_names,
                'confidence': confidence
            }, f)
    except:
        pass

    return model, encoders, feature_names, df, confidence

# ──────────────────────────────────────────────
# PREDICTION
# ──────────────────────────────────────────────
def predict_price(input_data):
    listing_type = input_data.get('listing_type', 'sale').lower()
    csv_path = RENT_CSV if listing_type == 'rent' else SALE_CSV

    model, encoders, feature_names, df, confidence = build_model(csv_path)

    lat = float(input_data.get('latitude', CITY_CENTER[0]))
    lon = float(input_data.get('longitude', CITY_CENTER[1]))
    area_sqm = float(input_data.get('area_sqm', input_data.get('size_m2', 120)))

    # ───── BUILD FEATURES ─────
    feature_values = []
    for fname in feature_names:
        if fname in FEATURE_COLS:
            feature_values.append(float(input_data.get(fname, 0)))
        elif fname in CAT_COLS:
            raw = str(input_data.get(fname, '')).lower()
            if fname in encoders and raw in [c.lower() for c in encoders[fname].classes_]:
                idx = [c.lower() for c in encoders[fname].classes_].index(raw)
                feature_values.append(encoders[fname].transform([encoders[fname].classes_[idx]])[0])
            else:
                feature_values.append(0)

    X_input = np.array(feature_values).reshape(1, -1)

    # 1. ML BASE PRICE PER SQM
    # Note: In our dataset 'price' column is actually price per sqm (based on size_m2 being 1)
    base_price_per_sqm = float(model.predict(X_input)[0])

    # 2. GIS ADJUSTMENTS
    distance_center = haversine(lat, lon, CITY_CENTER[0], CITY_CENTER[1])
    neigh_price = neighborhood_price(df, lat, lon)
    
    # Distance adjustment (Closer to center = higher price)
    # Factor: 1.1 at center, drops to 0.8 at 10km
    dist_adjustment = max(0.8, 1.1 - (distance_center * 0.03))
    
    # Neighborhood adjustment (Influence of nearby prices)
    avg_market_price = df['price'].mean()
    neigh_influence = (neigh_price / avg_market_price) if avg_market_price > 0 else 1.0
    # Blend neigh influence (limit to 20% impact)
    gis_factor = dist_adjustment * (1 + (neigh_influence - 1) * 0.2)

    gis_adjusted_price_per_sqm = base_price_per_sqm * gis_factor

    # 3. AMENITY ADJUSTMENTS
    amenity_multiplier = 1.0
    if int(input_data.get('near_school', 0)): amenity_multiplier += AMENITY_WEIGHTS['near_school']
    if int(input_data.get('near_hospital', 0)): amenity_multiplier += AMENITY_WEIGHTS['near_hospital']
    if int(input_data.get('near_market', 0)): amenity_multiplier += AMENITY_WEIGHTS['near_market']
    if int(input_data.get('parking', 0)): amenity_multiplier += AMENITY_WEIGHTS['parking']
    
    security_rate = int(input_data.get('security_rating', 3))
    # Base security is 3. If 4 or 5, increase. If 1 or 2, decrease.
    security_adjustment = (security_rate - 3) * SECURITY_WEIGHT_PER_LEVEL
    amenity_multiplier += security_adjustment

    final_price_per_sqm = gis_adjusted_price_per_sqm * amenity_multiplier
    total_price = final_price_per_sqm * area_sqm

    # ───── RANGE ─────
    tree_preds = np.array([t.predict(X_input)[0] for t in model.estimators_])
    # Apply same GIS and Amenity factors to the range
    low = np.percentile(tree_preds, 10) * gis_factor * amenity_multiplier * area_sqm
    high = np.percentile(tree_preds, 90) * gis_factor * amenity_multiplier * area_sqm

    return {
        "success": True,
        "predicted_price_per_sqm": round(base_price_per_sqm, 2),
        "gis_adjusted_price_per_sqm": round(gis_adjusted_price_per_sqm, 2),
        "final_price_per_sqm": round(final_price_per_sqm, 2),
        "area_sqm": area_sqm,
        "total_price": round(total_price, 2),
        "low_estimate": round(low, 2),
        "high_estimate": round(high, 2),
        "distance_to_center_km": round(distance_center, 2),
        "neighborhood_avg_price": round(neigh_price, 2),
        "amenity_multiplier": round(amenity_multiplier, 2),
        "confidence": confidence,
        "is_gis_ml": True
    }

# ──────────────────────────────────────────────
# MAIN
# ──────────────────────────────────────────────
if __name__ == "__main__":
    try:
        raw_input = sys.stdin.read()
        if not raw_input:
            print(json.dumps({"success": False, "error": "No input received"}))
            sys.exit(0)
        data = json.loads(raw_input)
        result = predict_price(data)
        print(json.dumps(result))
    except Exception as e:
        print(json.dumps({"success": False, "error": str(e)}))
