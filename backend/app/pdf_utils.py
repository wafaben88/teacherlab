"""PDF generation helpers using reportlab."""
from datetime import datetime
from io import BytesIO
from typing import Iterable, Sequence

from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import cm
from reportlab.platypus import (
    Paragraph,
    SimpleDocTemplate,
    Spacer,
    Table,
    TableStyle,
)


BRAND = colors.HexColor("#6366f1")
INK = colors.HexColor("#0f172a")
MUTED = colors.HexColor("#475569")
LINE = colors.HexColor("#e2e8f0")


def _styles() -> dict:
    base = getSampleStyleSheet()
    return {
        "title": ParagraphStyle(
            "title", parent=base["Title"], textColor=INK, spaceAfter=4, fontSize=22
        ),
        "subtitle": ParagraphStyle(
            "subtitle", parent=base["Normal"], textColor=MUTED, fontSize=11, spaceAfter=14
        ),
        "h2": ParagraphStyle(
            "h2", parent=base["Heading2"], textColor=INK, spaceBefore=10, spaceAfter=6
        ),
        "body": ParagraphStyle(
            "body", parent=base["BodyText"], textColor=INK, fontSize=10, leading=14
        ),
        "muted": ParagraphStyle(
            "muted", parent=base["BodyText"], textColor=MUTED, fontSize=9
        ),
    }


def _page_layout(canvas, doc):
    canvas.saveState()
    canvas.setFillColor(BRAND)
    canvas.rect(0, A4[1] - 0.5 * cm, A4[0], 0.5 * cm, stroke=0, fill=1)
    canvas.setFillColor(MUTED)
    canvas.setFont("Helvetica", 8)
    canvas.drawString(
        2 * cm,
        1 * cm,
        f"Teacher Hub • Généré le {datetime.now().strftime('%d/%m/%Y %H:%M')}",
    )
    canvas.drawRightString(A4[0] - 2 * cm, 1 * cm, f"Page {doc.page}")
    canvas.restoreState()


def _doc(buffer: BytesIO, title: str) -> SimpleDocTemplate:
    return SimpleDocTemplate(
        buffer,
        pagesize=A4,
        title=title,
        leftMargin=2 * cm,
        rightMargin=2 * cm,
        topMargin=1.6 * cm,
        bottomMargin=1.6 * cm,
    )


def _build(elements: Iterable, title: str) -> bytes:
    buffer = BytesIO()
    doc = _doc(buffer, title)
    doc.build(list(elements), onFirstPage=_page_layout, onLaterPages=_page_layout)
    return buffer.getvalue()


def render_grade_report(
    *,
    class_name: str,
    school_year: str,
    teacher_name: str,
    students_rows: Sequence[Sequence[str]],
    averages_row: Sequence[str],
) -> bytes:
    """Generate a PDF grade report (bulletin de classe).

    students_rows must include a header as the first row.
    """
    s = _styles()
    elements = []
    elements.append(Paragraph(f"Bulletin de classe — {class_name}", s["title"]))
    elements.append(
        Paragraph(
            f"Année scolaire {school_year} • Enseignant : {teacher_name}",
            s["subtitle"],
        )
    )
    if students_rows:
        table = Table(students_rows, repeatRows=1)
        table.setStyle(
            TableStyle(
                [
                    ("BACKGROUND", (0, 0), (-1, 0), BRAND),
                    ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
                    ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
                    ("FONTSIZE", (0, 0), (-1, -1), 9),
                    ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, colors.HexColor("#f8fafc")]),
                    ("LINEBELOW", (0, 0), (-1, -1), 0.25, LINE),
                    ("ALIGN", (1, 1), (-1, -1), "CENTER"),
                    ("ALIGN", (0, 0), (0, -1), "LEFT"),
                    ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
                    ("LEFTPADDING", (0, 0), (-1, -1), 6),
                    ("RIGHTPADDING", (0, 0), (-1, -1), 6),
                    ("TOPPADDING", (0, 0), (-1, -1), 6),
                    ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
                ]
            )
        )
        elements.append(table)
        elements.append(Spacer(1, 0.6 * cm))
    if averages_row:
        avg_table = Table([averages_row])
        avg_table.setStyle(
            TableStyle(
                [
                    ("BACKGROUND", (0, 0), (-1, -1), colors.HexColor("#eef2ff")),
                    ("TEXTCOLOR", (0, 0), (-1, -1), INK),
                    ("FONTNAME", (0, 0), (-1, -1), "Helvetica-Bold"),
                    ("FONTSIZE", (0, 0), (-1, -1), 10),
                    ("ALIGN", (0, 0), (-1, -1), "CENTER"),
                    ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
                    ("BOX", (0, 0), (-1, -1), 0.5, BRAND),
                ]
            )
        )
        elements.append(avg_table)
    return _build(elements, f"Bulletin {class_name}")


def render_student_report(
    *,
    student_name: str,
    class_name: str,
    school_year: str,
    teacher_name: str,
    rows: Sequence[Sequence[str]],
    average: str,
    notes: str = "",
) -> bytes:
    s = _styles()
    elements = []
    elements.append(Paragraph(f"Bulletin individuel — {student_name}", s["title"]))
    elements.append(
        Paragraph(
            f"Classe : {class_name} • Année scolaire {school_year} • Enseignant : {teacher_name}",
            s["subtitle"],
        )
    )
    if rows:
        table = Table(rows, repeatRows=1)
        table.setStyle(
            TableStyle(
                [
                    ("BACKGROUND", (0, 0), (-1, 0), BRAND),
                    ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
                    ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
                    ("FONTSIZE", (0, 0), (-1, -1), 9),
                    ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, colors.HexColor("#f8fafc")]),
                    ("LINEBELOW", (0, 0), (-1, -1), 0.25, LINE),
                    ("ALIGN", (1, 1), (-1, -1), "CENTER"),
                    ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
                    ("LEFTPADDING", (0, 0), (-1, -1), 6),
                    ("RIGHTPADDING", (0, 0), (-1, -1), 6),
                    ("TOPPADDING", (0, 0), (-1, -1), 6),
                    ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
                ]
            )
        )
        elements.append(table)
        elements.append(Spacer(1, 0.6 * cm))
    elements.append(
        Paragraph(f"<b>Moyenne générale :</b> {average}", s["body"])
    )
    if notes:
        elements.append(Spacer(1, 0.4 * cm))
        elements.append(Paragraph("<b>Appréciation</b>", s["h2"]))
        elements.append(Paragraph(notes.replace("\n", "<br/>"), s["body"]))
    return _build(elements, f"Bulletin {student_name}")


def render_handout(
    *,
    title: str,
    subtitle: str,
    body_md: str,
    footer: str = "",
) -> bytes:
    s = _styles()
    elements = [Paragraph(title, s["title"])]
    if subtitle:
        elements.append(Paragraph(subtitle, s["subtitle"]))

    # Very simple paragraph splitter (blank lines = new paragraphs)
    paragraphs = [p.strip() for p in (body_md or "").split("\n\n") if p.strip()]
    for p in paragraphs:
        # Convert single newlines to <br/>; bold **text** to <b>
        html = p.replace("\n", "<br/>")
        # naive bold support
        while "**" in html:
            html = html.replace("**", "<b>", 1).replace("**", "</b>", 1)
        elements.append(Paragraph(html, s["body"]))
        elements.append(Spacer(1, 0.2 * cm))

    if footer:
        elements.append(Spacer(1, 0.6 * cm))
        elements.append(Paragraph(footer, s["muted"]))
    return _build(elements, title)
