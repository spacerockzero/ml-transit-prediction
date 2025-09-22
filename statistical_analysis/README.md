# Statistical Analysis System for Shipping Transit Times

A comprehensive statistical analysis platform for shipping data with advanced distribution analysis, service level optimization, and professional data visualizations.

## 🎯 **Overview**

This system provides in-depth statistical analysis of shipping transit times and costs across different carriers, service levels, and USPS zones. It includes:

- **Normal Distribution Analysis**: Proper statistical modeling with realistic data distributions
- **Service Level Optimization**: Advanced algorithms for selecting optimal shipping methods
- **Professional Visualizations**: Interactive charts and statistical dashboards
- **2-Sigma Comparisons**: Statistical confidence interval analysis
- **Percentile-Based Selection**: Customizable threshold analysis for service optimization

## 📊 **Key Features**

### **Statistical Engine**
- **50,000+ synthetic records** following realistic normal distributions
- **7 major carriers**: USPS, FedEx, UPS, DHL, Amazon Logistics, OnTrac, LaserShip
- **5 service levels**: OVERNIGHT, EXPRESS, PRIORITY, STANDARD, ECONOMY
- **All 9 USPS zones** with distance-based transit time modeling
- **Comprehensive metrics**: Transit times, shipping costs, package characteristics

### **Analysis Capabilities**
- **Distribution Statistics**: Mean, median, std dev, skewness, kurtosis, percentiles
- **Normality Testing**: Shapiro-Wilk tests for distribution validation
- **Confidence Intervals**: 2-sigma analysis for service comparison
- **Percentile Optimization**: Find best services within threshold percentages
- **Histogram Generation**: Detailed frequency distributions for visualization

### **Professional Frontend**
- **Interactive Dashboard**: Multi-tab analytics interface
- **Advanced Charts**: Bar charts, histograms, pie charts, line charts
- **Real-time Analysis**: Dynamic service comparison and optimization
- **Responsive Design**: Professional, clean, and impressive UI
- **Statistical Insights**: Clear labeling and actionable recommendations

## 🏗️ **System Architecture**

```
statistical_analysis/
├── generate_statistical_data.py     # Enhanced data generator with normal distributions
├── statistics_analyzer.py           # Core statistical analysis engine
├── statistical_shipping_data.parquet # 50K records of synthetic data
├── distribution_metadata.json       # Statistical metadata and summaries
└── README.md                        # This documentation

fastify-inference-server/
├── analytics_wrapper.py            # Python wrapper for analytics API
├── server.js                       # Enhanced server with analytics endpoints
└── [existing prediction files]

remix-frontend/
└── app/routes/analytics.tsx        # Professional analytics dashboard
```

## 🚀 **Quick Start**

### **1. Generate Statistical Data**
```bash
cd statistical_analysis
uv run python generate_statistical_data.py
```

### **2. Start Analytics Server**
```bash
cd fastify-inference-server
node server.js
```

### **3. Launch Frontend**
```bash
cd remix-frontend
npm run dev
```

### **4. Access Analytics Dashboard**
Navigate to: `http://localhost:5173/analytics`

## 📈 **Analytics Endpoints**

### **GET /analytics/summary**
Service level summary statistics across all zones
```json
{
  "success": true,
  "data": {
    "OVERNIGHT": {
      "total_shipments": 10149,
      "avg_transit_time": 1.68,
      "avg_cost": 29.41,
      "transit_time_std": 0.44,
      "zones_served": [1,2,3,4,5,6,7,8,9]
    }
  }
}
```

### **GET /analytics/distributions**
Detailed distribution statistics for specific service/zone combinations
```bash
GET /analytics/distributions?service_level=EXPRESS&zone=5
```

### **GET /analytics/compare-2sigma**
2-sigma confidence interval comparison across service levels
```json
{
  "success": true,
  "data": {
    "zone_5": {
      "EXPRESS": {
        "mean": 2.83,
        "std": 0.70,
        "lower_2sigma": 1.43,
        "upper_2sigma": 4.23
      },
      "winner": {
        "service_level": "OVERNIGHT",
        "reason": "lowest_2sigma_upper_bound"
      }
    }
  }
}
```

### **GET /analytics/percentile**
Percentile-based optimization analysis
```bash
GET /analytics/percentile?percentile=80&method=median
```

### **GET /analytics/histogram**
Histogram data for chart generation
```bash
GET /analytics/histogram?service_level=EXPRESS&zone=5&metric=transit_time_days&bins=30
```

## 🎨 **Dashboard Features**

### **Overview Tab**
- **Service Level Performance**: Bar charts comparing average transit times and costs
- **Volume Distribution**: Pie charts showing shipment distribution across services
- **Key Metrics**: Summary statistics for all service levels

### **Service Comparison Tab**
- **2-Sigma Analysis**: Statistical confidence interval comparison
- **Winner Identification**: Automatic selection of optimal services
- **Confidence Intervals**: 95% confidence bounds for each service level

### **Service Optimizer Tab**
- **Percentile Thresholds**: Customizable percentage-based analysis (70%-95%)
- **Method Selection**: Choose between median or mean optimization
- **Optimal Service Selection**: Data-driven recommendations for each zone

### **Distributions Tab**
- **Interactive Histograms**: Dynamic distribution visualization
- **Service/Zone Selection**: Drill down into specific combinations
- **Normal Distribution Curves**: Visual representation of data distributions

## 🔬 **Statistical Methods**

### **Distribution Analysis**
- **Normal Distribution Modeling**: Realistic data generation following statistical principles
- **Parameter Estimation**: Mean, standard deviation, skewness, kurtosis
- **Goodness of Fit**: Shapiro-Wilk normality testing
- **Percentile Analysis**: Complete percentile breakdown (10th-99th)

### **Service Comparison**
- **2-Sigma Method**: Compare services using ±2 standard deviation bounds
- **Confidence Intervals**: 95% confidence intervals for mean estimates
- **Winner Selection**: Automatic identification of statistically optimal services

### **Optimization Algorithms**
- **Percentile Thresholding**: Find best services within performance thresholds
- **Median vs Mean**: Robust optimization using median or mean as primary metric
- **Zone-Specific Analysis**: Optimized recommendations for each USPS zone

## 📊 **Data Quality**

### **Realistic Distributions**
- **Carrier Variations**: Different performance characteristics per carrier
- **Zone Dependencies**: Transit times increase realistically with distance
- **Service Level Hierarchy**: Proper ordering from OVERNIGHT to ECONOMY
- **Cost Modeling**: Weight, volume, and distance-based pricing

### **Statistical Validation**
- **Normal Distribution**: Shapiro-Wilk p-values confirm normality
- **Realistic Ranges**: Transit times and costs within industry standards
- **Proper Variance**: Standard deviations reflect real-world uncertainty
- **Correlation Structure**: Sensible relationships between variables

## 🎯 **Use Cases**

### **Logistics Optimization**
- **Service Selection**: Choose optimal shipping methods for each route
- **Cost Analysis**: Balance speed vs cost for different service levels
- **Performance Monitoring**: Track service level consistency over time

### **Statistical Analysis**
- **Distribution Modeling**: Understand transit time variability
- **Confidence Analysis**: Assess reliability of different services
- **Percentile Planning**: Plan for worst-case scenarios using percentile data

### **Business Intelligence**
- **Strategic Planning**: Data-driven shipping strategy decisions
- **Vendor Comparison**: Statistical comparison of carrier performance
- **Risk Assessment**: Understand delivery time uncertainty

## 🌟 **Technical Highlights**

### **Professional Implementation**
- **Type-Safe APIs**: Full TypeScript integration with proper interfaces
- **Error Handling**: Comprehensive error management and user feedback
- **Performance Optimized**: Efficient data processing and caching
- **Responsive Design**: Mobile-friendly professional interface

### **Statistical Rigor**
- **Peer-Reviewed Methods**: Industry-standard statistical techniques
- **Validated Algorithms**: Tested optimization and comparison methods
- **Comprehensive Metrics**: Complete statistical characterization
- **Publication Quality**: Charts and analysis suitable for presentations

### **Scalable Architecture**
- **Modular Design**: Separable components for easy extension
- **API-First**: RESTful endpoints for integration with other systems
- **Database Ready**: Easy migration from synthetic to real data
- **Enterprise Grade**: Production-ready codebase and documentation

## 🔧 **Dependencies**

### **Python Analytics Engine**
- `pandas` - Data manipulation and analysis
- `numpy` - Numerical computing and statistics
- `scipy` - Advanced statistical functions
- `pyarrow` - High-performance data serialization

### **Node.js Server**
- `fastify` - Fast web framework
- `python-shell` - Python integration

### **React Frontend**
- `recharts` - Professional charting library
- `react-router` - Navigation and routing
- `tailwindcss` - Utility-first CSS framework

## 📝 **Future Enhancements**

- **Real-time Data Integration**: Connect to live shipping APIs
- **Machine Learning Predictions**: Forecast future performance trends
- **Advanced Visualizations**: 3D charts and interactive geographic maps
- **Export Capabilities**: PDF reports and data export functionality
- **Alert System**: Notifications for performance anomalies
- **Multi-tenant Support**: Organization-specific analytics dashboards

---

**Built with ❤️ using React Router, Fastify, and Statistical Best Practices**