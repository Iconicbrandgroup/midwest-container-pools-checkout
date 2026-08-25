"""Typeset Midwest Container Pools' approved Terms and Conditions as the PDF the
checkout links.

The source of truth is MCP's own document, committed beside this script:

    MidwestContainerPools_Terms_and_Conditions.docx
    (approved by Sheldon Trieb via Joshua, 2026-08-24: "Approved - attached above")

This script READS that file and lays it out. It contains no contract language of
its own, so the published PDF can never drift from what MCP actually approved.
To publish an updated contract, drop in the new .docx, bump VERSION here and
TERMS_VERSION in index.html, and re-run:

    python assets/terms/make-terms-pdf.py

Superseded: the IBG-drafted interim terms (v1.0-v1.1) used before MCP supplied
their own document.
"""
import re
import zipfile
from pathlib import Path

from reportlab.lib.colors import HexColor
from reportlab.lib.pagesizes import letter
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import inch
from reportlab.platypus import Paragraph, SimpleDocTemplate, Spacer, Table, TableStyle

HERE = Path(__file__).parent
SRC = HERE / "MidwestContainerPools_Terms_and_Conditions.docx"
OUT = HERE / "Midwest-Container-Pools-Terms-and-Conditions.pdf"

# MCP's own document. Bump when they approve a revised one.
VERSION = "2.0"
EFFECTIVE = "August 2026"

CYAN, INK, MUTED = HexColor("#0891b2"), HexColor("#0c1a27"), HexColor("#6b7280")
RULE = HexColor("#d7dee5")

styles = getSampleStyleSheet()
h1 = ParagraphStyle("h1", parent=styles["Title"], fontName="Helvetica-Bold",
                    fontSize=16, textColor=INK, spaceAfter=2)
h1sub = ParagraphStyle("h1sub", parent=styles["Title"], fontName="Helvetica-Bold",
                       fontSize=12, textColor=INK, spaceAfter=4)
meta = ParagraphStyle("meta", parent=styles["Normal"], fontName="Helvetica",
                      fontSize=9, textColor=MUTED, spaceAfter=12, alignment=1)
part = ParagraphStyle("part", parent=styles["Heading1"], fontName="Helvetica-Bold",
                      fontSize=12.5, textColor=INK, spaceBefore=15, spaceAfter=5)
h2 = ParagraphStyle("h2", parent=styles["Heading2"], fontName="Helvetica-Bold",
                    fontSize=11.5, textColor=CYAN, spaceBefore=11, spaceAfter=3)
body = ParagraphStyle("body", parent=styles["Normal"], fontName="Helvetica",
                      fontSize=9.5, leading=13.5, textColor=INK, spaceAfter=6)
cell = ParagraphStyle("cell", parent=body, spaceAfter=0)
cellb = ParagraphStyle("cellb", parent=cell, fontName="Helvetica-Bold")


def header_footer(canvas, doc):
    canvas.saveState()
    canvas.setFont("Helvetica", 8)
    canvas.setFillColor(MUTED)
    canvas.drawString(0.9 * inch, 0.55 * inch,
                      "Midwest Container Pools - Leavenworth, KS - (913) 704-6316")
    canvas.drawRightString(7.6 * inch, 0.55 * inch,
                           f"Terms and Conditions of Sale - v{VERSION} - Page {doc.page}")
    canvas.restoreState()


def read_docx_paragraphs(path):
    """Return the document's paragraphs, in order, as plain text."""
    with zipfile.ZipFile(path) as z:
        xml = z.read("word/document.xml").decode("utf-8")
    out = []
    for block in re.split(r"</w:p>", xml):
        text = "".join(re.findall(r"<w:t[^>]*>([^<]*)</w:t>", block)).strip()
        if text:
            out.append(text)
    return out


def esc(text):
    """Escape for reportlab's mini-HTML and normalize smart punctuation."""
    return (text.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;")
                .replace("“", "&ldquo;").replace("”", "&rdquo;")
                .replace("‘", "&lsquo;").replace("’", "&rsquo;")
                .replace("—", "&mdash;").replace("–", "&ndash;"))


PART_RE = re.compile(r"^Part\s+[IVXLC]+\b")
ARTICLE_RE = re.compile(r"^Article\s+\d{1,2}\.")

GLANCE_START = "Key Terms at a Glance"
GLANCE_END = "This summary is provided for convenience only"


def build():
    paras = read_docx_paragraphs(SRC)
    if not paras:
        raise SystemExit(f"No text found in {SRC}")

    # The "Key Terms at a Glance" block is a Word table that flattens into
    # alternating label/value paragraphs. Pair them back up so the PDF shows the
    # same two-column summary the client approved.
    try:
        gs = paras.index(GLANCE_START)
        ge = next(i for i, p in enumerate(paras) if p.startswith(GLANCE_END))
    except (ValueError, StopIteration):
        gs = ge = -1

    doc = SimpleDocTemplate(
        str(OUT), pagesize=letter,
        leftMargin=0.9 * inch, rightMargin=0.9 * inch,
        topMargin=1.0 * inch, bottomMargin=0.85 * inch,
        title="Midwest Container Pools - Terms and Conditions of Sale",
        author="Midwest Container Pools",
    )

    story, i, n = [], 0, len(paras)
    while i < n:
        text = paras[i]
        if i == 0:                                  # MIDWEST CONTAINER POOLS
            story.append(Paragraph(esc(text), h1))
        elif i == 1:                                # Terms and Conditions of Sale
            story.append(Paragraph(esc(text), h1sub))
            story.append(Paragraph(
                f"Effective {EFFECTIVE} &middot; Version {VERSION}", meta))
        elif i == 2 and text.startswith("Effective Date"):
            pass                                    # already shown in the meta line
        elif gs != -1 and i == gs:
            story.append(Paragraph(esc(text), h2))
            rows = paras[gs + 1:ge]
            data = [[Paragraph(esc(rows[j]), cellb),
                     Paragraph(esc(rows[j + 1]), cell)]
                    for j in range(0, len(rows) - 1, 2)]
            if data:
                t = Table(data, colWidths=[1.35 * inch, 5.3 * inch], hAlign="LEFT")
                t.setStyle(TableStyle([
                    ("VALIGN", (0, 0), (-1, -1), "TOP"),
                    ("TOPPADDING", (0, 0), (-1, -1), 4),
                    ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
                    ("LEFTPADDING", (0, 0), (-1, -1), 0),
                    ("RIGHTPADDING", (0, 0), (-1, -1), 6),
                    ("LINEBELOW", (0, 0), (-1, -2), 0.4, RULE),
                ]))
                story.append(t)
                story.append(Spacer(1, 8))
            i = ge - 1                              # resume at the closing note
        elif PART_RE.match(text):
            story.append(Paragraph(esc(text), part))
        elif ARTICLE_RE.match(text):
            story.append(Paragraph(esc(text), h2))
        else:
            story.append(Paragraph(esc(text), body))
        i += 1

    story.append(Spacer(1, 10))
    doc.build(story, onFirstPage=header_footer, onLaterPages=header_footer)
    print(f"WROTE {OUT}  ({len(paras)} paragraphs from {SRC.name})")


if __name__ == "__main__":
    build()
