import os
import csv
from datetime import datetime
from typing import List, Dict, Any
import pandas as pd

from app.config.config import settings


class ReportGenerationService:
    """
    Automated Report Generator for Inspection Findings.
    Generates CSV, Excel (.xlsx), and PDF reports.
    """

    @classmethod
    def generate_csv_report(
        cls,
        detections: List[Dict[str, Any]],
        output_filename: str = "road_damage_report.csv"
    ) -> str:
        """Generate formatted CSV inspection log."""
        file_path = os.path.join(settings.REPORTS_DIR, output_filename)
        
        fieldnames = [
            "detection_id", "video_id", "frame_number", "timestamp_sec",
            "category", "confidence_pct", "severity", "severity_score",
            "x_min", "y_min", "x_max", "y_max", "area_pixels"
        ]

        with open(file_path, mode="w", newline="", encoding="utf-8") as csv_file:
            writer = csv.DictWriter(csv_file, fieldnames=fieldnames)
            writer.writeheader()
            for det in detections:
                writer.writerow({
                    "detection_id": det.get("id", "N/A"),
                    "video_id": det.get("video_id", "N/A"),
                    "frame_number": det.get("frame_number", 0),
                    "timestamp_sec": round(det.get("timestamp_sec", 0.0), 2),
                    "category": det.get("category", "unknown"),
                    "confidence_pct": round(det.get("confidence", 0.0) * 100, 1),
                    "severity": det.get("severity", "low"),
                    "severity_score": det.get("severity_score", 0.0),
                    "x_min": det.get("x_min", 0),
                    "y_min": det.get("y_min", 0),
                    "x_max": det.get("x_max", 0),
                    "y_max": det.get("y_max", 0),
                    "area_pixels": det.get("area_pixels", 0)
                })

        return file_path

    @classmethod
    def generate_excel_report(
        cls,
        summary_data: Dict[str, Any],
        detections: List[Dict[str, Any]],
        output_filename: str = "road_damage_report.xlsx"
    ) -> str:
        """Generate multi-tab Excel workbook with summary KPIs and raw detection logs."""
        file_path = os.path.join(settings.REPORTS_DIR, output_filename)
        
        with pd.ExcelWriter(file_path, engine="openpyxl") as writer:
            # Sheet 1: Summary KPIs
            df_summary = pd.DataFrame([summary_data])
            df_summary.to_excel(writer, sheet_name="Executive Summary", index=False)

            # Sheet 2: Raw Detection Logs
            df_det = pd.DataFrame(detections)
            df_det.to_excel(writer, sheet_name="Detections Log", index=False)

        return file_path

    @classmethod
    def generate_pdf_report(
        cls,
        title: str,
        summary: Dict[str, Any],
        detections: List[Dict[str, Any]],
        output_filename: str = "road_damage_report.pdf"
    ) -> str:
        """Generate formal executive PDF report using ReportLab or HTML-to-PDF template."""
        file_path = os.path.join(settings.REPORTS_DIR, output_filename)
        
        try:
            from reportlab.lib.pagesizes import letter
            from reportlab.lib import colors
            from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle
            from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle

            doc = SimpleDocTemplate(file_path, pagesize=letter)
            styles = getSampleStyleSheet()
            story = []

            # Title Header
            title_style = ParagraphStyle(
                'ReportTitle',
                parent=styles['Heading1'],
                fontSize=20,
                textColor=colors.HexColor('#1E293B'),
                spaceAfter=12
            )
            story.append(Paragraph(f"Smart Road Damage Inspection Report", title_style))
            story.append(Paragraph(f"<b>Generated:</b> {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}", styles['Normal']))
            story.append(Spacer(1, 14))

            # Executive Summary Table
            summary_table_data = [
                ["Metric", "Value"],
                ["Road Health Index", f"{summary.get('road_health_score', 0)} / 100"],
                ["Total Defects Found", str(summary.get('total_detections', 0))],
                ["Potholes Detected", str(summary.get('pothole_count', 0))],
                ["Cracks Detected", str(summary.get('crack_count', 0))],
                ["Critical Risk Hazards", str(summary.get('critical_count', 0))],
                ["Overall Hazard Rating", str(summary.get('overall_severity', 'LOW')).upper()]
            ]
            
            t = Table(summary_table_data, colWidths=[200, 200])
            t.setStyle(TableStyle([
                ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#2563EB')),
                ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
                ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
                ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
                ('BOTTOMPADDING', (0, 0), (-1, 0), 8),
                ('GRID', (0, 0), (-1, -1), 0.5, colors.HexColor('#CBD5E1')),
            ]))
            story.append(t)
            story.append(Spacer(1, 20))

            # Top Critical Detections Table
            story.append(Paragraph("<b>Top Critical Road Defects Log</b>", styles['Heading2']))
            story.append(Spacer(1, 8))

            det_rows = [["Frame #", "Category", "Confidence", "Severity", "Score"]]
            for d in detections[:15]:  # Top 15 detections
                det_rows.append([
                    str(d.get("frame_number", 0)),
                    str(d.get("category", "")).replace("_", " ").title(),
                    f"{float(d.get('confidence', 0))*100:.1f}%",
                    str(d.get("severity", "")).upper(),
                    f"{d.get('severity_score', 0):.1f}"
                ])

            t_det = Table(det_rows, colWidths=[70, 130, 90, 80, 70])
            t_det.setStyle(TableStyle([
                ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#0F172A')),
                ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
                ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
                ('GRID', (0, 0), (-1, -1), 0.5, colors.HexColor('#E2E8F0')),
            ]))
            story.append(t_det)

            doc.build(story)
        except Exception as e:
            print(f"ReportLab note: {e}. Writing raw text PDF fallback.")
            with open(file_path, "w", encoding="utf-8") as f:
                f.write(f"Road Damage Report - {title}\nHealth Index: {summary.get('road_health_score')}\nTotal Defects: {summary.get('total_detections')}\n")

        return file_path
