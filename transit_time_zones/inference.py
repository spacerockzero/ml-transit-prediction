import pandas as pd
import numpy as np
import lightgbm as lgb
from joblib import load
from datetime import datetime, timedelta
import warnings
warnings.filterwarnings('ignore')

class TransitTimePredictor:
    """
    A class for making transit time predictions using the trained LightGBM model.
    """
    
    def __init__(self, model_path="lgb_transit_model.txt", 
                 feature_cols_path="feature_cols.joblib",
                 historical_data_path="historical_shipments.parquet"):
        """
        Initialize the predictor with trained model and historical data.
        
        Args:
            model_path: Path to the trained LightGBM model
            feature_cols_path: Path to the saved feature columns
            historical_data_path: Path to historical data for target encoding and rolling features
        """
        # Load the trained model
        self.model = lgb.Booster(model_file=model_path)
        
        # Load feature columns
        self.feature_cols = load(feature_cols_path)
        
        # Load historical data for feature engineering
        self.historical_data = pd.read_parquet(historical_data_path)
        self.historical_data['ship_date'] = pd.to_datetime(self.historical_data['ship_date'])
        
        # Prepare target encoding mappings and rolling features from training data
        self._prepare_encoding_mappings()
        
    def _prepare_encoding_mappings(self):
        """Prepare target encoding mappings from historical data."""
        # Create derived features for historical data
        df = self.historical_data.copy()
        df['route'] = df['origin_zone'].astype(str) + '->' + df['dest_zone'].astype(str)
        df['origin_service'] = df['origin_zone'].astype(str) + '::' + df['service_level'].astype(str)
        df['carrier_service'] = df['carrier'].astype(str) + '::' + df['service_level'].astype(str)
        
        # Calculate target encoding mappings (using all historical data as "training")
        self.target_encodings = {}
        self.global_mean = df['transit_time_days'].mean()
        
        for col in ['route', 'origin_zone', 'dest_zone', 'carrier', 'service_level', 'origin_service', 'carrier_service']:
            # Simple mean encoding with smoothing
            agg = df.groupby(col)['transit_time_days'].agg(['count', 'mean']).fillna(0)
            agg.columns = ['n', 'mean']
            # Apply smoothing: blend with global mean based on sample size
            min_samples = 100
            smoothing = 10
            agg['smoothing'] = 1 / (1 + np.exp(-(agg['n'] - min_samples) / smoothing))
            agg['enc'] = self.global_mean * (1 - agg['smoothing']) + agg['mean'] * agg['smoothing']
            self.target_encodings[col] = agg['enc'].to_dict()
    
    def _cyclical_encode(self, df, col, period):
        """Apply cyclical encoding to a column."""
        radians = 2 * np.pi * df[col] / period
        df[f"{col}_sin"] = np.sin(radians)
        df[f"{col}_cos"] = np.cos(radians)
        return df
    
    def _get_rolling_median(self, route, ship_date, window_days=30):
        """Get the rolling median transit time for a route."""
        cutoff = ship_date - timedelta(days=window_days)
        
        # Filter historical data for the same route within the window
        mask = (
            (self.historical_data['origin_zone'] + '->' + self.historical_data['dest_zone'] == route) &
            (self.historical_data['ship_date'] < ship_date) &
            (self.historical_data['ship_date'] >= cutoff)
        )
        
        relevant_data = self.historical_data[mask]
        
        if len(relevant_data) > 0:
            return relevant_data['transit_time_days'].median()
        else:
            # Fallback to global median
            return self.historical_data['transit_time_days'].median()
    
    def _engineer_features(self, df):
        """Apply the same feature engineering as in training."""
        df = df.copy()
        
        # Ensure ship_date is datetime
        df['ship_date'] = pd.to_datetime(df['ship_date'])
        
        # Date features
        df['dow'] = df['ship_date'].dt.weekday  # 0=Mon
        df['month'] = df['ship_date'].dt.month
        
        # Cyclical encoding
        df = self._cyclical_encode(df, 'dow', 7)
        df = self._cyclical_encode(df, 'month', 12)
        
        # Route and combination features
        df['route'] = df['origin_zone'].astype(str) + '->' + df['dest_zone'].astype(str)
        df['origin_service'] = df['origin_zone'].astype(str) + '::' + df['service_level'].astype(str)
        df['carrier_service'] = df['carrier'].astype(str) + '::' + df['service_level'].astype(str)
        
        # Rolling historical features
        df['route_30d_median'] = df.apply(
            lambda row: self._get_rolling_median(row['route'], row['ship_date']), 
            axis=1
        )
        
        # Target encoding
        for col in ['route', 'origin_zone', 'dest_zone', 'carrier', 'service_level', 'origin_service', 'carrier_service']:
            df[f'{col}_te'] = df[col].map(self.target_encodings[col]).fillna(self.global_mean)
        
        return df
    
    def predict_single(self, ship_date, origin_zone, dest_zone, carrier, service_level):
        """
        Make a prediction for a single shipment.
        
        Args:
            ship_date: Date of shipment (string or datetime)
            origin_zone: Origin zone code
            dest_zone: Destination zone code  
            carrier: Carrier name
            service_level: Service level
            
        Returns:
            Predicted transit time in days (float)
        """
        # Create a single-row dataframe
        data = pd.DataFrame({
            'ship_date': [ship_date],
            'origin_zone': [origin_zone],
            'dest_zone': [dest_zone],
            'carrier': [carrier],
            'service_level': [service_level]
        })
        
        # Apply feature engineering
        features_df = self._engineer_features(data)
        
        # Select only the features used in training
        X = features_df[self.feature_cols]
        
        # Make prediction
        prediction = self.model.predict(X)[0]
        
        return round(prediction, 2)
    
    def predict_batch(self, df):
        """
        Make predictions for a batch of shipments.
        
        Args:
            df: DataFrame with columns [ship_date, origin_zone, dest_zone, carrier, service_level]
            
        Returns:
            Array of predicted transit times
        """
        # Apply feature engineering
        features_df = self._engineer_features(df)
        
        # Select only the features used in training
        X = features_df[self.feature_cols]
        
        # Make predictions
        predictions = self.model.predict(X)
        
        return np.round(predictions, 2)
    
    def predict_with_uncertainty(self, ship_date, origin_zone, dest_zone, carrier, service_level,
                                quantile_models_paths=None):
        """
        Make predictions with uncertainty estimates using quantile models.
        
        Args:
            ship_date: Date of shipment
            origin_zone: Origin zone code
            dest_zone: Destination zone code
            carrier: Carrier name
            service_level: Service level
            quantile_models_paths: Dict with quantile model paths, e.g.,
                                 {0.1: 'lgb_transit_quantile_10.txt', 
                                  0.5: 'lgb_transit_quantile_50.txt',
                                  0.9: 'lgb_transit_quantile_90.txt'}
        
        Returns:
            Dict with predictions and uncertainty bounds
        """
        # Default quantile model paths
        if quantile_models_paths is None:
            quantile_models_paths = {
                0.1: 'lgb_transit_quantile_10.txt',
                0.5: 'lgb_transit_quantile_50.txt', 
                0.9: 'lgb_transit_quantile_90.txt'
            }
        
        # Get main prediction
        main_prediction = self.predict_single(ship_date, origin_zone, dest_zone, carrier, service_level)
        
        # Create input data
        data = pd.DataFrame({
            'ship_date': [ship_date],
            'origin_zone': [origin_zone],
            'dest_zone': [dest_zone],
            'carrier': [carrier],
            'service_level': [service_level]
        })
        
        # Apply feature engineering
        features_df = self._engineer_features(data)
        X = features_df[self.feature_cols]
        
        # Get quantile predictions
        quantile_predictions = {}
        for quantile, model_path in quantile_models_paths.items():
            try:
                quantile_model = lgb.Booster(model_file=model_path)
                pred = quantile_model.predict(X)[0]
                quantile_predictions[f'q{int(quantile*100)}'] = round(pred, 2)
            except Exception as e:
                print(f"Warning: Could not load quantile model {model_path}: {e}")
        
        return {
            'predicted_transit_time': main_prediction,
            'quantiles': quantile_predictions
        }


# Convenience function for quick predictions
def predict_transit_time(ship_date, origin_zone, dest_zone, carrier, service_level):
    """
    Quick function to predict transit time for a single shipment.
    
    Usage:
        prediction = predict_transit_time('2024-01-15', 'US_WEST', 'US_EAST', 'FedEx', 'EXPRESS')
    """
    predictor = TransitTimePredictor()
    return predictor.predict_single(ship_date, origin_zone, dest_zone, carrier, service_level)


if __name__ == "__main__":
    # Example usage with USPS zones
    print("Loading Transit Time Predictor...")
    predictor = TransitTimePredictor()
    
    # Single prediction example
    print("\n=== Single Prediction Example ===")
    prediction = predictor.predict_single(
        ship_date='2024-01-15',
        origin_zone='Zone_2', 
        dest_zone='Zone_7',
        carrier='FedEx',
        service_level='EXPRESS'
    )
    print(f"Predicted transit time: {prediction} days")
    
    # Prediction with uncertainty
    print("\n=== Prediction with Uncertainty ===")
    uncertainty_result = predictor.predict_with_uncertainty(
        ship_date='2024-01-15',
        origin_zone='Zone_1',
        dest_zone='Zone_9', 
        carrier='USPS',
        service_level='STANDARD'
    )
    print(f"Main prediction: {uncertainty_result['predicted_transit_time']} days")
    print(f"Uncertainty bounds: {uncertainty_result['quantiles']}")
    
    # Batch prediction example
    print("\n=== Batch Prediction Example ===")
    test_data = pd.DataFrame({
        'ship_date': ['2024-01-15', '2024-01-16', '2024-01-17'],
        'origin_zone': ['Zone_1', 'Zone_3', 'Zone_8'],
        'dest_zone': ['Zone_4', 'Zone_2', 'Zone_5'], 
        'carrier': ['FedEx', 'UPS', 'USPS'],
        'service_level': ['EXPRESS', 'STANDARD', 'PRIORITY']
    })
    
    batch_predictions = predictor.predict_batch(test_data)
    test_data['predicted_transit_time'] = batch_predictions
    print(test_data)