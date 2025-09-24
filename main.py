#!/usr/bin/env python3
"""
ML Transit Time & Cost Prediction - Main Training Pipeline

This script orchestrates the complete machine learning pipeline:
1. Generate synthetic shipping data
2. Train transit time and cost prediction models
3. Export models for production inference
4. Generate statistical analysis data
5. Copy artifacts to the inference server

Usage:
    uv run python main.py
"""

import os
import sys
import subprocess
import shutil
import time
from pathlib import Path

from rich.console import Console
from rich.progress import Progress, SpinnerColumn, TextColumn, BarColumn, TaskProgressColumn, TimeElapsedColumn
from rich.panel import Panel
from rich.table import Table
from rich.tree import Tree
from rich import box
from rich.text import Text


console = Console()


def run_command_with_spinner(command, description, cwd=None):
    """Run a command with a spinner and handle errors gracefully."""
    with console.status(f"[bold blue]{description}...", spinner="dots") as status:
        try:
            result = subprocess.run(
                command,
                shell=True,
                check=True,
                capture_output=True,
                text=True,
                cwd=cwd
            )
            
            console.print(f"✅ [bold green]{description}")
            if result.stdout.strip():
                # Show abbreviated output
                output_lines = result.stdout.strip().split('\n')
                if len(output_lines) > 3:
                    console.print(f"   [dim]{output_lines[0]}")
                    console.print(f"   [dim]... ({len(output_lines)-2} more lines)")
                    console.print(f"   [dim]{output_lines[-1]}")
                else:
                    for line in output_lines:
                        console.print(f"   [dim]{line}")
            return True
            
        except subprocess.CalledProcessError as e:
            console.print(f"❌ [bold red]{description} failed")
            if e.stderr:
                console.print(f"   [red]{e.stderr.strip()}")
            return False


def copy_models_to_server():
    """Copy trained models and artifacts to the inference server."""
    console.print("\n📦 [bold cyan]Copying models to inference server...")
    
    server_models_dir = Path("fastify-inference-server/onnx_models")
    server_models_dir.mkdir(exist_ok=True)
    
    # Copy models from transit_time_cost (has both time and cost models)
    source_dir = Path("transit_time_cost")
    
    files_to_copy = [
        ("lgb_transit_time_model.txt", "lgb_transit_time_model.txt"),
        ("lgb_shipping_cost_model.txt", "lgb_shipping_cost_model.txt"),
        ("time_feature_cols.joblib", "time_feature_cols.joblib"),
        ("cost_feature_cols.joblib", "cost_feature_cols.joblib"),
    ]
    
    with Progress(
        SpinnerColumn(),
        TextColumn("[progress.description]{task.description}"),
        BarColumn(),
        TaskProgressColumn(),
        TimeElapsedColumn(),
        console=console
    ) as progress:
        copy_task = progress.add_task("Copying model files...", total=len(files_to_copy))
        
        for source_file, dest_file in files_to_copy:
            source_path = source_dir / source_file
            dest_path = server_models_dir / dest_file
            
            if source_path.exists():
                shutil.copy2(source_path, dest_path)
                console.print(f"   ✅ [green]Copied {source_file} → {dest_file}")
            else:
                console.print(f"   ⚠️  [yellow]Warning: {source_file} not found in {source_dir}")
            
            progress.advance(copy_task)
            time.sleep(0.1)  # Small delay for visual effect
    
    # Update sample input with zone field
    sample_input = {
        "ship_date": "2024-01-15",
        "zone": 1,
        "carrier": "FedEx",
        "service_level": "Express",
        "package_weight_lbs": 2.5,
        "package_length_in": 10.0,
        "package_width_in": 8.0,
        "package_height_in": 6.0,
        "insurance_value": 100.0
    }
    
    import json
    with open(server_models_dir / "sample_input.json", "w") as f:
        json.dump(sample_input, f, indent=2)
    console.print("   ✅ [green]Updated sample_input.json")


def generate_model_metadata():
    """Generate metadata file for the inference server."""
    with console.status("[bold blue]Generating model metadata...", spinner="dots"):
        metadata = {
            "transit_time_model": {
                "model_name": "LightGBM Transit Time Predictor",
                "version": "1.0.0",
                "features": 17,
                "description": "Predicts shipping transit time in days based on package and route information"
            },
            "shipping_cost_model": {
                "model_name": "LightGBM Shipping Cost Predictor", 
                "version": "1.0.0",
                "features": 17,
                "description": "Predicts shipping cost in USD based on package and service information"
            },
            "feature_engineering": {
                "date_features": ["dow_sin", "dow_cos", "month_sin", "month_cos"],
                "package_features": ["package_volume", "dimensional_weight", "billable_weight", "weight_to_volume_ratio"],
                "route_features": ["route", "origin_service", "carrier_service"],
                "target_encoding": ["route_te_time", "zone_te_time", "carrier_te_time", "service_level_te_time"]
            },
            "input_schema": {
                "ship_date": "YYYY-MM-DD format",
                "zone": "Integer 1-9 (USPS zone)",
                "carrier": "String (USPS, FedEx, UPS, DHL, etc.)",
                "service_level": "String (Ground, Express, Priority, Overnight)",
                "package_weight_lbs": "Float 0.1-70",
                "package_length_in": "Float 1-100",
                "package_width_in": "Float 1-100", 
                "package_height_in": "Float 1-100",
                "insurance_value": "Float 0-10000"
            }
        }
        
        import json
        metadata_path = Path("fastify-inference-server/onnx_models/model_metadata.json")
        with open(metadata_path, "w") as f:
            json.dump(metadata, f, indent=2)
        time.sleep(0.5)  # Small delay for visual effect
    
    console.print("✅ [bold green]Generated model_metadata.json")


def show_pipeline_overview():
    """Display a beautiful overview of the pipeline steps."""
    tree = Tree("🚀 [bold blue]ML Training Pipeline")
    
    step1 = tree.add("📊 [yellow]Data Generation & Model Training")
    step1.add("� Basic Transit Time Model")
    step1.add("🔹 Combined Time & Cost Models")
    step1.add("🔹 Zone-Based Enhanced Models")
    
    step2 = tree.add("📈 [cyan]Statistical Analysis")
    step2.add("🔹 Distribution Modeling")
    step2.add("🔹 Normal Curve Fitting")
    
    step3 = tree.add("📦 [green]Production Build")
    step3.add("🔹 Model Artifact Copying")
    step3.add("🔹 Metadata Generation")
    step3.add("🔹 Server Configuration")
    
    console.print(Panel(tree, title="Training Pipeline Overview", border_style="blue"))


def show_results_summary(success_count, total_steps):
    """Display a beautiful results summary."""
    table = Table(title="🎯 Training Pipeline Results", box=box.ROUNDED)
    
    table.add_column("Component", style="cyan", no_wrap=True)
    table.add_column("Status", justify="center")
    table.add_column("Description", style="dim")
    
    components = [
        ("Combined Time & Cost", "✅ Success", "Production models for time and cost (PRIMARY)"),
        ("Zone-Based Models", "✅ Success", "Enhanced models with zone features"),
        ("Statistical Analysis", "✅ Success", "Distribution analysis and metrics"),
        ("Production Setup", "✅ Success", "Server artifacts and metadata"),
    ]
    
    for component, status, description in components:
        if success_count == total_steps:
            table.add_row(component, "[green]✅ Success", description)
        else:
            table.add_row(component, "[yellow]⚠️ Check logs", description)
    
    console.print(table)


def show_next_steps():
    """Display next steps for the user."""
    next_steps = Panel(
        "[bold green]🚀 Next Steps:[/bold green]\n\n"
        "[bold cyan]Option 1 - Start Both Services (Recommended):[/bold cyan]\n"
        "   [dim]npm run install:all  # Install all dependencies[/dim]\n"
        "   [dim]npm run dev          # Start both services[/dim]\n\n"
        "[bold cyan]Option 2 - Start Services Individually:[/bold cyan]\n"
        "1. [cyan]Start the inference server:[/cyan]\n"
        "   [dim]cd fastify-inference-server && npm run dev[/dim]\n\n"
        "2. [cyan]Start the frontend:[/cyan]\n"
        "   [dim]cd remix-frontend && npm run dev[/dim]\n\n"
        "[bold cyan]Access Your Application:[/bold cyan]\n"
        "• [cyan]Predictions:[/cyan] [link]http://localhost:5173[/link]\n"
        "• [cyan]Analytics:[/cyan] [link]http://localhost:5173/analytics[/link]\n"
        "• [cyan]API Server:[/cyan] [link]http://localhost:3000[/link]\n\n"
        "📊 [bold yellow]Generated Models:[/bold yellow]\n"
        "• Transit Time Predictor (LightGBM)\n"
        "• Shipping Cost Predictor (LightGBM)\n"
        "• Feature Engineering Artifacts\n"
        "• Statistical Analysis Data\n"
        "• Production-Ready Inference Server",
        title="Success!",
        border_style="green"
    )
    console.print(next_steps)


def main():
    """Main training pipeline orchestrator."""
    console.clear()
    
    # Title banner
    title = Text("ML Transit Time & Cost Prediction", style="bold blue")
    subtitle = Text("Training Pipeline", style="dim")
    console.print(Panel(f"{title}\n{subtitle}", box=box.DOUBLE, border_style="blue"))
    
    # Check if we're in the right directory
    if not Path("pyproject.toml").exists():
        console.print("❌ [bold red]Error: Run this script from the project root directory")
        sys.exit(1)
    
    show_pipeline_overview()
    console.print()
    
    # Training steps with progress tracking
    # NOTE: Skipping deprecated transit_time model - using superior transit_time_cost instead
    training_steps = [
        ("transit_time_cost", "Training combined transit time & cost models (PRIMARY)", "python generate_synthetic_data.py && python train.py"),
        ("transit_time_zones", "Training zone-based models with enhanced features", "python generate_synthetic_data.py && python train.py"),
        ("statistical_analysis", "Generating statistical analysis data", "python generate_statistical_data.py"),
    ]
    
    success_count = 0
    total_steps = len(training_steps) + 1  # +1 for model copying
    
    with Progress(
        SpinnerColumn(),
        TextColumn("[progress.description]{task.description}"),
        BarColumn(),
        TaskProgressColumn(),
        TimeElapsedColumn(),
        console=console
    ) as progress:
        
        overall_task = progress.add_task("Overall Progress", total=total_steps)
        
        for cwd, description, command in training_steps:
            if run_command_with_spinner(command, description, cwd=cwd):
                success_count += 1
            progress.advance(overall_task)
            console.print()
        
        # Model copying step
        try:
            copy_models_to_server()
            generate_model_metadata()
            success_count += 1
        except Exception as e:
            console.print(f"❌ [bold red]Failed to copy models: {e}")
        
        progress.advance(overall_task)
    
    console.print()
    show_results_summary(success_count, total_steps)
    console.print()
    
    if success_count == total_steps:
        show_next_steps()
    else:
        console.print(Panel(
            f"⚠️  [yellow]Some steps failed ({success_count}/{total_steps} successful).[/yellow]\n"
            "Check the logs above for details.\n"
            "You may need to install dependencies or check file permissions.",
            title="Warning",
            border_style="yellow"
        ))


if __name__ == "__main__":
    main()
