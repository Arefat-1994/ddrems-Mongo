import pandas as pd
import numpy as np
import joblib
import matplotlib.pyplot as plt
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import LabelEncoder, StandardScaler
from sklearn.ensemble import RandomForestRegressor
from sklearn.metrics import mean_absolute_error, r2_score

# =========================
# 1. LOAD DATA WITH CORRECT DELIMITER
# =========================

# Try different delimiters
try:
    # First try tab delimiter (based on your error message)
    data = pd.read_csv("dire_dawa_real_estate_dataset.csv", sep='\t')
    print("✅ File loaded with tab delimiter")
except:
    try:
        # If tab doesn't work, try comma
        data = pd.read_csv("dire_dawa_real_estate_dataset.csv", sep=',')
        print("✅ File loaded with comma delimiter")
    except:
        # If both fail, try auto-detect
        data = pd.read_csv("dire_dawa_real_estate_dataset.csv", sep=None, engine='python')
        print("✅ File loaded with auto-detected delimiter")

# Clean column names (remove any whitespace)
data.columns = data.columns.str.strip()

print("\n" + "="*50)
print("DATASET INFORMATION")
print("="*50)
print(f"Shape: {data.shape}")
print(f"Columns: {data.columns.tolist()}")
print(f"First row:\n{data.iloc[0].to_dict()}")

# =========================
# 2. FEATURE ENGINEERING
# =========================

# Convert Yes/No to 1/0
binary_cols = ["near_school", "near_hospital", "near_market", "parking"]

for col in binary_cols:
    if col in data.columns:
        print(f"Converting {col}...")
        # Check unique values before conversion
        unique_vals = data[col].unique()
        print(f"  Unique values: {unique_vals}")
        
        # Handle potential NaN values
        data[col] = data[col].fillna("No")
        
        # Convert to binary
        data[col] = data[col].map({"Yes": 1, "No": 0, "YES": 1, "NO": 0, "yes": 1, "no": 0})
        
        # Fill any remaining NaN with 0
        data[col] = data[col].fillna(0).astype(int)
    else:
        print(f"⚠️ Column '{col}' not found in dataset - creating with default value 0")
        data[col] = 0

# Add NEW REAL-WORLD FEATURES (simulate Ethiopian context)
np.random.seed(42)  # For reproducibility

# Railway importance (Dire Dawa railway center)
if "distance_to_railway_km" not in data.columns:
    data["distance_to_railway_km"] = np.random.uniform(0.5, 8, len(data))

# Market influence (very important in Dire Dawa economy)
if "distance_to_market_km" not in data.columns:
    data["distance_to_market_km"] = np.random.uniform(0.2, 5, len(data))

# Main road access (transport hub)
if "distance_to_main_road_km" not in data.columns:
    data["distance_to_main_road_km"] = np.random.uniform(0.1, 3, len(data))

# =========================
# 3. ENCODE CATEGORICAL DATA
# =========================

label_encoders = {}
categorical_cols = ["property_type", "condition", "location_name"]

for col in categorical_cols:
    if col in data.columns:
        print(f"Encoding {col}...")
        le = LabelEncoder()
        # Handle any NaN values
        data[col] = data[col].fillna("Unknown").astype(str)
        data[col] = le.fit_transform(data[col])
        label_encoders[col] = le
        print(f"  Classes: {list(le.classes_)}")
    else:
        print(f"⚠️ Column '{col}' not found in dataset - creating with default value 0")
        data[col] = 0

# =========================
# 4. DEFINE FEATURES & TARGET
# =========================

# Target variable
if "price" in data.columns:
    y = data["price"]
    print(f"\n✅ Target variable 'price' found")
    print(f"Price range: {y.min():,.0f} - {y.max():,.0f} ETB")
    print(f"Average price: {y.mean():,.0f} ETB")
else:
    raise KeyError("Column 'price' not found in dataset!")

# Feature columns - only use columns that exist or we created
feature_columns = [
    "size_m2",
    "bedrooms", 
    "bathrooms",
    "distance_to_center_km",
    "distance_to_market_km",
    "distance_to_railway_km",
    "distance_to_main_road_km",
    "near_school",
    "near_hospital", 
    "near_market",
    "parking",
    "security_rating",
    "property_type",
    "condition",
    "location_name"
]

# Check which features are available
available_features = []
for col in feature_columns:
    if col in data.columns:
        available_features.append(col)
        print(f"✅ Using feature: {col}")
    else:
        print(f"⚠️ Feature '{col}' not found - adding with default value 0")
        data[col] = 0
        available_features.append(col)

X = data[available_features]

print(f"\n📊 Total features: {len(available_features)}")
print(f"Feature list: {available_features}")

# =========================
# 5. HANDLE MISSING VALUES
# =========================

# Check for any missing values
missing_counts = X.isnull().sum()
if missing_counts.sum() > 0:
    print("\n⚠️ Missing values found:")
    for col in missing_counts[missing_counts > 0].index:
        print(f"  {col}: {missing_counts[col]} missing values")
    
    # Fill missing values with mean for numeric columns
    numeric_cols = X.select_dtypes(include=[np.number]).columns
    X[numeric_cols] = X[numeric_cols].fillna(X[numeric_cols].mean())
    print("✅ Missing values filled with mean")

# Convert all to numeric
X = X.apply(pd.to_numeric, errors='coerce').fillna(0)

# =========================
# 6. NORMALIZATION
# =========================

scaler = StandardScaler()
X_scaled = scaler.fit_transform(X)

# =========================
# 7. TRAIN TEST SPLIT
# =========================

X_train, X_test, y_train, y_test = train_test_split(
    X_scaled, y, test_size=0.2, random_state=42
)

print(f"\n📊 Training set size: {len(X_train)} samples")
print(f"📊 Test set size: {len(X_test)} samples")

# =========================
# 8. TRAIN MODEL
# =========================

model = RandomForestRegressor(
    n_estimators=200,
    max_depth=10,
    random_state=42,
    n_jobs=-1  # Use all available cores
)

print("\n🚀 Training model...")
model.fit(X_train, y_train)
print("✅ Model training complete!")

# =========================
# 9. EVALUATION
# =========================

y_pred = model.predict(X_test)

mae = mean_absolute_error(y_test, y_pred)
r2 = r2_score(y_test, y_pred)

print("\n" + "="*50)
print("📊 MODEL PERFORMANCE")
print("="*50)
print(f"Mean Absolute Error: {mae:,.2f} ETB")
print(f"R² Score: {r2:.4f}")
print(f"Accuracy (approximate): {r2*100:.2f}%")

# Calculate additional metrics
print(f"\n📈 Detailed Metrics:")
print(f"Average Price: {y.mean():,.2f} ETB")
print(f"MAE as % of Avg Price: {(mae/y.mean())*100:.2f}%")
print(f"RMSE: {np.sqrt(((y_test - y_pred) ** 2).mean()):,.2f} ETB")

# =========================
# 10. FEATURE IMPORTANCE
# =========================

feature_importance = model.feature_importances_
features = X.columns

# Sort features by importance
sorted_idx = np.argsort(feature_importance)[::-1]
sorted_features = features[sorted_idx]
sorted_importance = feature_importance[sorted_idx]

print("\n📊 Top 10 Most Important Features:")
for i in range(min(10, len(sorted_features))):
    print(f"  {i+1}. {sorted_features[i]}: {sorted_importance[i]:.4f}")

# Plot feature importance
plt.figure(figsize=(12, 8))
plt.barh(range(len(sorted_importance[:15])), sorted_importance[:15][::-1])
plt.yticks(range(len(sorted_importance[:15])), sorted_features[:15][::-1])
plt.title("Top 15 Feature Importance (Dire Dawa Real Estate)")
plt.xlabel("Importance Score")
plt.ylabel("Features")
plt.tight_layout()
plt.savefig("feature_importance.png", dpi=300, bbox_inches='tight')
plt.show()

# =========================
# 11. SAVE MODEL AND ARTIFACTS
# =========================

joblib.dump(model, "dire_dawa_price_model.pkl")
joblib.dump(scaler, "scaler.pkl")
joblib.dump(label_encoders, "encoders.pkl")
joblib.dump(available_features, "feature_names.pkl")

# Save model performance metrics
metrics = {
    'mae': mae,
    'r2': r2,
    'avg_price': y.mean(),
    'feature_importance': dict(zip(features, feature_importance))
}
joblib.dump(metrics, "model_metrics.pkl")

print("\n" + "="*50)
print("✅ Model saved successfully!")
print("Files created:")
print("  - dire_dawa_price_model.pkl")
print("  - scaler.pkl")
print("  - encoders.pkl")
print("  - feature_names.pkl")
print("  - model_metrics.pkl")
print("  - feature_importance.png")
print("="*50)

# =========================
# 12. TEST PREDICTION
# =========================

print("\n" + "="*50)
print("🏠 TEST PREDICTION EXAMPLE")
print("="*50)

# Create a sample property using the first property from dataset as example
first_property = data.iloc[0].to_dict()

sample_property = {
    "size_m2": first_property.get("size_m2", 120),
    "bedrooms": first_property.get("bedrooms", 3),
    "bathrooms": first_property.get("bathrooms", 2),
    "distance_to_center_km": first_property.get("distance_to_center_km", 2.5),
    "distance_to_market_km": first_property.get("distance_to_market_km", 1.2),
    "distance_to_railway_km": first_property.get("distance_to_railway_km", 3.1),
    "distance_to_main_road_km": first_property.get("distance_to_main_road_km", 0.5),
    "near_school": first_property.get("near_school", 1),
    "near_hospital": first_property.get("near_hospital", 0),
    "near_market": first_property.get("near_market", 1),
    "parking": first_property.get("parking", 1),
    "security_rating": first_property.get("security_rating", 4),
    "property_type": first_property.get("property_type_encoded", 1),
    "condition": first_property.get("condition_encoded", 2),
    "location_name": first_property.get("location_name_encoded", 3)
}

# Convert to DataFrame
sample_df = pd.DataFrame([sample_property])

# Ensure columns are in the same order and all exist
for col in available_features:
    if col not in sample_df.columns:
        sample_df[col] = 0

sample_df = sample_df[available_features]

# Scale the sample
sample_scaled = scaler.transform(sample_df)

# Predict
predicted_price = model.predict(sample_scaled)[0]
actual_price = first_property.get("price", 0)

print(f"Sample Property (First row in dataset):")
print(f"  Location: {first_property.get('location_name', 'Unknown')}")
print(f"  Size: {sample_property['size_m2']} m²")
print(f"  Bedrooms: {sample_property['bedrooms']}")
print(f"  Bathrooms: {sample_property['bathrooms']}")
print(f"  Distance to center: {sample_property['distance_to_center_km']} km")
print(f"\n  Actual Price: {actual_price:,.2f} ETB")
print(f"  Predicted Price: {predicted_price:,.2f} ETB")
print(f"  Difference: {abs(predicted_price - actual_price):,.2f} ETB ({abs(predicted_price - actual_price)/actual_price*100:.1f}%)")

# =========================
# 13. SIMPLE PREDICTION FUNCTION
# =========================

def predict_price(features_dict):
    """
    Simple function to predict price for a new property
    
    Example:
    features = {
        'size_m2': 120,
        'bedrooms': 3,
        'bathrooms': 2,
        'distance_to_center_km': 2.5,
        'near_school': 1,
        'near_hospital': 0,
        'near_market': 1,
        'parking': 1,
        'security_rating': 4
    }
    price = predict_price(features)
    """
    # Load model if not already loaded
    if 'model' not in locals():
        model = joblib.load("dire_dawa_price_model.pkl")
        scaler = joblib.load("scaler.pkl")
        feature_names = joblib.load("feature_names.pkl")
    
    # Create DataFrame with all required features
    df = pd.DataFrame([features_dict])
    
    # Add missing features with default values
    for col in feature_names:
        if col not in df.columns:
            df[col] = 0
    
    df = df[feature_names]
    df_scaled = scaler.transform(df)
    
    return model.predict(df_scaled)[0]

print("\n✅ Prediction function ready! Use predict_price() to estimate property prices.")