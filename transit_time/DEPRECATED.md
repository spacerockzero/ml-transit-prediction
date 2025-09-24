# ⚠️ DEPRECATED - DO NOT USE

This `transit_time` directory contains an **outdated and deprecated** model that has been superseded by more accurate models.

## 🚫 Why This Model is Deprecated

The standalone transit time prediction model in this directory has been replaced by:

1. **`transit_time_cost/`** - Provides both transit time AND shipping cost predictions with improved accuracy
2. **`transit_time_zones/`** - Provides zone-specific transit time predictions with better geographic modeling

## ✅ What to Use Instead

**For production use:**
- Use the **`transit_time_cost`** model which provides both transit time and cost predictions
- The inference server at `fastify-inference-server/` already uses these superior models

**For development:**
- Focus on the `transit_time_cost/` directory for the latest model improvements
- Use `transit_time_zones/` for zone-specific analysis

## 📊 Model Comparison

| Model | Transit Time | Shipping Cost | Accuracy | Status |
|-------|-------------|---------------|----------|---------|
| `transit_time/` | ✅ | ❌ | Lower | 🚫 **DEPRECATED** |
| `transit_time_cost/` | ✅ | ✅ | Higher | ✅ **ACTIVE** |
| `transit_time_zones/` | ✅ | ❌ | Zone-optimized | ✅ **ACTIVE** |

## 🗑️ Planned Removal

This directory will be archived or removed in a future cleanup to avoid confusion.

---

**Last Updated:** September 23, 2025  
**Deprecation Date:** September 23, 2025  
**Removal Target:** TBD