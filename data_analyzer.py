import pandas as pd
import numpy as np
import json
import matplotlib.pyplot as plt
import seaborn as sns
from sklearn.decomposition import PCA
from sklearn.cluster import KMeans
from sklearn.preprocessing import StandardScaler
import base64
import io
import sys

def json_serializable(obj):
    """Custom JSON serializer for numpy types"""
    import numpy as np
    if isinstance(obj, (np.integer, np.int64)):
        return int(obj)
    elif isinstance(obj, (np.floating, np.float64)):
        return float(obj)
    elif isinstance(obj, np.ndarray):
        return obj.tolist()
    elif isinstance(obj, pd.Series):
        return obj.to_list()
    else:
        return obj

# Then modify your load_csv function to use this serializer:

def load_csv(file_path):
    try:
        df = pd.read_csv(file_path)
        return {
            'status': 'success',
            'data': {
                'df_json': df.to_json(orient="split"),
                'info': {
                    'shape': df.shape,
                    'columns': list(df.columns),
                    'dtypes': {col: str(dtype) for col, dtype in df.dtypes.items()},
                    'missing': {col: int(val) for col, val in df.isnull().sum().items()},  # Convert to regular int
                    'duplicates': int(df.duplicated().sum())  # Convert to regular int
                },
                'stats': df.describe().to_dict()
            }
        }
    except Exception as e:
        return {
            'status': 'error',
            'message': str(e)
        }

def get_dataset_info(df):
    buffer = io.StringIO()
    df.info(buf=buffer)
    info_str = buffer.getvalue()
    return {
        'shape': df.shape,
        'columns': list(df.columns),
        'dtypes': {col: str(dtype) for col, dtype in df.dtypes.items()},
        'info': info_str,
        'missing': df.isnull().sum().to_dict(),
        'duplicates': df.duplicated().sum()
    }

def get_descriptive_stats(df):
    numeric_cols = df.select_dtypes(include=np.number).columns
    return df[numeric_cols].describe().to_dict()

def handle_missing_values(df_json, method='drop'):
    df = pd.read_json(df_json, orient="split")
    if method == 'drop':
        df = df.dropna()
    else:
        df = df.fillna(method=method)
    return df.to_json(orient="split")

def remove_duplicates(df_json):
    df = pd.read_json(df_json, orient="split")
    return df.drop_duplicates().to_json(orient="split")

def normalize_column_names(df_json):
    df = pd.read_json(df_json, orient="split")
    df.columns = [col.lower().replace(' ', '_') for col in df.columns]
    return df.to_json(orient="split")

def detect_outliers(df_json, column):
    df = pd.read_json(df_json, orient="split")
    plt.figure()
    sns.boxplot(data=df[column])
    buf = io.BytesIO()
    plt.savefig(buf, format='png')
    buf.seek(0)
    return base64.b64encode(buf.read()).decode('utf-8')

def visualize_correlation(df_json):
    df = pd.read_json(df_json, orient="split")
    numeric_cols = df.select_dtypes(include=np.number).columns
    plt.figure(figsize=(10, 8))
    sns.heatmap(df[numeric_cols].corr(), annot=True, cmap='coolwarm')
    buf = io.BytesIO()
    plt.savefig(buf, format='png')
    buf.seek(0)
    return base64.b64encode(buf.read()).decode('utf-8')

def run_pca(df_json):
    df = pd.read_json(df_json, orient="split")
    numeric_data = df.select_dtypes(include=np.number).dropna()
    scaler = StandardScaler()
    scaled_data = scaler.fit_transform(numeric_data)
    pca = PCA(n_components=2)
    transformed = pca.fit_transform(scaled_data)
    
    # Create scatter plot
    plt.figure()
    plt.scatter(transformed[:, 0], transformed[:, 1])
    plt.xlabel('PC1')
    plt.ylabel('PC2')
    plt.title('PCA Results')
    buf = io.BytesIO()
    plt.savefig(buf, format='png')
    buf.seek(0)
    plot_base64 = base64.b64encode(buf.read()).decode('utf-8')
    
    return {
        'transformed': transformed.tolist(),
        'explained_variance': pca.explained_variance_ratio_.tolist(),
        'plot': plot_base64
    }

def run_kmeans(df_json, num_clusters):
    df = pd.read_json(df_json, orient="split")
    numeric_data = df.select_dtypes(include=np.number).dropna()
    scaler = StandardScaler()
    scaled_data = scaler.fit_transform(numeric_data)
    
    kmeans = KMeans(n_clusters=int(num_clusters))
    kmeans.fit(scaled_data)
    labels = kmeans.labels_
    
    # Create cluster visualization
    plt.figure()
    sns.scatterplot(x=scaled_data[:, 0], y=scaled_data[:, 1], hue=labels, palette='viridis')
    plt.title('KMeans Clustering Results')
    buf = io.BytesIO()
    plt.savefig(buf, format='png')
    buf.seek(0)
    plot_base64 = base64.b64encode(buf.read()).decode('utf-8')
    
    return {
        'labels': labels.tolist(),
        'plot': plot_base64
    }

def export_data(df_json, file_path):
    try:
        df = pd.read_json(df_json, orient="split")
        # Ensure the path is properly formatted for the OS
        file_path = file_path.strip('"')  # Remove any surrounding quotes
        df.to_csv(file_path, index=False)
        return json.dumps({
            'status': 'success',
            'message': f'Data exported successfully to {file_path}'
        })
    except Exception as e:
        return json.dumps({
            'status': 'error',
            'message': str(e)
        })



def get_stats(df_json):
    """Get descriptive statistics for a dataframe"""
    try:
        df = pd.read_json(df_json, orient="split")
        numeric_cols = df.select_dtypes(include=np.number).columns
        stats = df[numeric_cols].describe().to_dict()
        return stats
    except Exception as e:
        return {"error": str(e)}

if __name__ == "__main__":
    # Make sure we have at least one argument (the command)
    if len(sys.argv) < 2:
        print(json.dumps({"status": "error", "message": "No command specified"}))
        sys.exit(1)
        
    # Get the command from the first argument
    command = sys.argv[1]
    
    # Handle different commands
    if command == "load_csv":
        if len(sys.argv) < 3:
            print(json.dumps({"status": "error", "message": "Missing file path"}))
            sys.exit(1)
        file_path = sys.argv[2]
        result = load_csv(file_path)
        print(json.dumps(result, default=json_serializable))
        
    elif command == "get_stats" and len(sys.argv) > 2:
        json_file_path = sys.argv[2]
        with open(json_file_path, 'r') as f:
            df_json = f.read()
        stats = get_stats(df_json)
        print(json.dumps(stats, default=json_serializable))
        
    # Add handlers for other commands
    elif command == "handle_missing_values" and len(sys.argv) > 3:
        json_file_path = sys.argv[2]
        method = sys.argv[3]
        with open(json_file_path, 'r') as f:
            df_json = f.read()
        result = handle_missing_values(df_json, method)
        print(result)
        

    elif command == "remove_duplicates" and len(sys.argv) > 2:
        json_file_path = sys.argv[2]
        try:
            with open(json_file_path, 'r') as f:
                df_json = f.read()
            result = remove_duplicates(df_json)
            print(result)
        except Exception as e:
            print(json.dumps({"status": "error", "message": str(e)}))
        
    # Add other commands in a similar pattern
    elif command == "export_data" and len(sys.argv) > 3:
        json_file_path = sys.argv[2]
        file_path = sys.argv[3]
        try:
            with open(json_file_path, 'r') as f:
                df_json = f.read()
            result = export_data(df_json, file_path)
            print(result)
        except Exception as e:
            print(json.dumps({
                "status": "error",
                "message": str(e)
            }))
    
    else:
        print(json.dumps({
            "status": "error", 
            "message": f"Unknown command: {command}"
        }))