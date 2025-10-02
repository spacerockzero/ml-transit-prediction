# ML Transit Time Prediction - Presentation

This directory contains a professional presentation about the ML transit time and cost prediction system.

## Files

- **`ml-transit-prediction.md`** - Marp markdown presentation source
- **`ml-transit-prediction.pdf`** - Exported PDF presentation (generated)

## Building the Presentation

### Prerequisites

Install Marp CLI:

```bash
npm install -g @marp-team/marp-cli
```

### Export to PDF

```bash
# From this directory
marp ml-transit-prediction.md --pdf --allow-local-files

# Or from repository root
marp presentation/ml-transit-prediction.md --pdf --allow-local-files
```

### Export to PowerPoint

```bash
marp ml-transit-prediction.md --pptx --allow-local-files
```

### Export to HTML

```bash
marp ml-transit-prediction.md --html
```

### Preview in Browser

```bash
marp -s ml-transit-prediction.md
```

Then open `http://localhost:8080` in your browser.

## Presentation Overview

The presentation covers:

1. **The Problem** - Why traditional shipping estimates fail
2. **Our Solution** - ML-powered predictions with LightGBM
3. **How It Works** - Data pipeline and technical architecture
4. **Business Value** - Four key areas:
   - 🚀 Increases productivity
   - ✨ Improves work quality
   - 🎯 Unlocks new capabilities
   - 💰 Helps make money
5. **Beyond Transit Predictions** - 12 future opportunities
6. **Implementation** - Roadmap and technology stack

## Key Slides

- **Slide 7-8**: Increases Productivity (time savings, automation)
- **Slide 9**: Improves Work Quality (73% better accuracy)
- **Slide 10**: Unlocks New Capabilities (uncertainty quantification, analytics)
- **Slide 11-12**: Makes Money ($350K annual ROI example)
- **Slide 14-19**: Future ML opportunities (demand forecasting, dynamic pricing, etc.)

## Customization

The presentation uses Marp's default theme with:

- Page numbers (paginate: true)
- Header: "ML Transit Time & Cost Prediction"
- Footer: "Machine Learning for Logistics Optimization"
- White background

To customize the theme, edit the front matter in `ml-transit-prediction.md`:

```yaml
---
marp: true
theme: default # or gaia, uncover
paginate: true
backgroundColor: #fff
---
```

## Notes

- Presentation is designed for ~30 minutes with Q&A
- Technical appendix slides included for deep dives
- Uses real metrics from the repository
- Code examples included for technical audiences

## License

Same as parent repository (MIT).
