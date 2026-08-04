"""Generate the Midwest Container Pools Terms and Conditions PDF the checkout links.

Kept in-repo so the document can never drift from the checkout: when the checkout
changes, update this file and re-run it.

    python assets/terms/make-terms-pdf.py

NOTE: this content is IBG-drafted from midwestcontainerpools.com (2026-08-04) and
must be reviewed/replaced by Midwest Container Pools' own attorney-approved
contract before real customer transactions.
"""
from pathlib import Path

from reportlab.lib.colors import HexColor
from reportlab.lib.pagesizes import letter
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import inch
from reportlab.platypus import Paragraph, SimpleDocTemplate, Spacer

OUT = Path(__file__).with_name("Midwest-Container-Pools-Terms-and-Conditions.pdf")
# Bump on every content change and keep TERMS_VERSION in index.html in step:
# the order record stores which version the buyer accepted.
VERSION = "1.1"
EFFECTIVE = "August 4, 2026"

CYAN, INK, MUTED = HexColor("#0891b2"), HexColor("#0c1a27"), HexColor("#6b7280")

styles = getSampleStyleSheet()
h1 = ParagraphStyle("h1", parent=styles["Title"], fontName="Helvetica-Bold",
                    fontSize=16, textColor=INK, spaceAfter=4)
meta = ParagraphStyle("meta", parent=styles["Normal"], fontName="Helvetica",
                      fontSize=9, textColor=MUTED, spaceAfter=10)
h2 = ParagraphStyle("h2", parent=styles["Heading2"], fontName="Helvetica-Bold",
                    fontSize=12, textColor=CYAN, spaceBefore=12, spaceAfter=3)
body = ParagraphStyle("body", parent=styles["Normal"], fontName="Helvetica",
                      fontSize=10, leading=14.5, textColor=INK)


def header_footer(canvas, doc):
    canvas.saveState()
    canvas.setFont("Helvetica", 8)
    canvas.setFillColor(MUTED)
    canvas.drawString(0.9 * inch, 0.55 * inch,
                      "Midwest Container Pools LLC - Leavenworth, KS - (913) 705-0591")
    canvas.drawRightString(7.6 * inch, 0.55 * inch,
                           f"Terms and Conditions of Sale - v{VERSION} - Page {doc.page}")
    canvas.restoreState()


SECTIONS = [
    ("1. Agreement",
     "These Terms and Conditions of Sale (the &ldquo;Terms&rdquo;) govern each order placed through the Midwest "
     "Container Pools online checkout between Midwest Container Pools LLC of Leavenworth, Kansas "
     "(&ldquo;Midwest Container Pools,&rdquo; &ldquo;we,&rdquo; &ldquo;us&rdquo;) and the purchaser identified on "
     "the order (&ldquo;you&rdquo;). By checking the agreement box and placing an order, you accept these Terms."),
    ("2. Product",
     "Midwest Container Pools manufactures insulated shipping-container swimming pools in two sizes: a 20ft pool "
     "(20' x 8' x 4') and a 40ft pool with a built-in tanning ledge and integrated steps. Every pool includes a "
     "fiberglass liner in a classic blue shade, a Hayward cartridge filter with pump, two skimmers and two returns, "
     "Pentair LED lighting, composite decking around the pool edge, high-density foam insulation between the "
     "fiberglass shell and the steel container, and a customizable exterior finish. Your order includes the model, "
     "exterior color and optional equipment shown on your order confirmation."),
    ("3. Pricing and Payment",
     "The 20ft container pool is priced at $46,440 and the 40ft container pool with tanning ledge at $68,790. "
     "Exterior color and finish selection is included in the base price. Optional equipment is priced as shown at "
     "checkout: Cold Weather Electric Heat Pump $4,656; Propane or Natural Gas Heater $3,154; Salt Water "
     "Chlorination System $1,977. A deposit reserves your build slot and is applied to your order total; "
     "Midwest Container Pools arranges collection of that deposit with you after your order is placed, and the "
     "remaining balance is due before delivery, as stated on your order confirmation."),
    ("4. Deposit, Balance and Cancellation",
     "Your deposit reserves a build slot and is applied to your order total. The refund window, any deduction for "
     "costs already incurred, and the cancellation procedure are set out in the order confirmation Midwest "
     "Container Pools sends you and are confirmed by a representative before your build begins. Contact "
     "(913) 705-0591 or Sheldon@midwestcontainerpools.com with any question about your deposit before ordering."),
    ("5. Delivery and Freight",
     "Pools are delivered throughout the continental United States from our facility at 22143 219th Street, "
     "Leavenworth, Kansas. The delivery figure shown at checkout is a non-binding estimate based on distance from "
     "our facility; final freight is confirmed in writing before shipping and is billed separately from the pool "
     "order. Pools ship by flatbed truck to the closest accessible point on your property. Barge or specialty "
     "transport can be arranged for island, waterfront or road-inaccessible locations. Customer pickup at our "
     "Leavenworth facility and customer-arranged freight are available by agreement."),
    ("6. Offload and Site Access",
     "The empty pool weighs approximately 2.7 tons (5,400 lbs) and has four corner castings built into the "
     "container for crane lifting. You are responsible for the crane and rigging, the operator, and a clear, level "
     "access path on delivery day. Most crane placements take under thirty minutes. We can recommend local crane "
     "operators in your area but do not perform or supervise offload."),
    ("7. Site Preparation and Installation",
     "Above-ground installation requires a level surface with four inches of compacted gravel. In-ground and "
     "partially buried installations require excavation arranged by you through a local professional. Every pool "
     "requires a dedicated 110v to 220v, 30 Amp GFCI-protected electrical supply installed by a licensed "
     "electrician; internal electrical connections are pre-wired at the factory. Site preparation, excavation, "
     "electrical work, permitting and code compliance are your responsibility."),
    ("8. Warranty",
     "Every pool includes a five (5) year structural warranty covering the steel container, the fiberglass "
     "interior and the foam insulation. Equipment and parts carry a three (3) year warranty. Warranty exclusions "
     "and the claim procedure are provided with your order documentation."),
    ("9. Sales Tax",
     "Applicable sales tax is calculated and invoiced based on the delivery destination and is confirmed on your "
     "invoice. You remain responsible for any sales or use tax owed in your own jurisdiction."),
    ("10. Payment Methods and Financing",
     "Checkout accepts ACH bank transfer, credit or debit card, Zelle, bank wire and mailed check. Financing is "
     "offered through HFS Financial; checking your rate with HFS is a soft credit inquiry that does not affect "
     "your credit score, and financing approval, rates and terms are between you and HFS Financial. Your build "
     "slot is reserved when your order is placed and confirmed when funds are received."),
    ("11. Build and Delivery Timing",
     "Midwest Container Pools typically delivers within four to six weeks of payment. Exact timing depends on your "
     "location within the continental United States and on scheduling with local crane operators. Timing figures "
     "are estimates, and Midwest Container Pools is not liable for delays outside its reasonable control, "
     "including supplier, carrier, weather and permitting delays."),
    ("12. Governing Law",
     "These Terms are governed by the laws of the State of Kansas, without regard to its conflict-of-laws rules."),
]


def build():
    doc = SimpleDocTemplate(
        str(OUT), pagesize=letter,
        leftMargin=0.9 * inch, rightMargin=0.9 * inch,
        topMargin=1.0 * inch, bottomMargin=0.85 * inch,
        title="Midwest Container Pools - Terms and Conditions of Sale",
    )
    story = [
        Paragraph("MIDWEST CONTAINER POOLS &mdash; TERMS AND CONDITIONS OF SALE", h1),
        Paragraph(f"Effective {EFFECTIVE} &middot; Version {VERSION}", meta),
    ]
    for title, text in SECTIONS:
        story.append(Paragraph(title, h2))
        story.append(Paragraph(text, body))
    story.append(Spacer(1, 16))
    story.append(Paragraph(
        "Questions about an order: call (913) 705-0591 or email Sheldon@midwestcontainerpools.com. "
        "By placing an order you agree to these Terms and Conditions of Sale.", meta))
    doc.build(story, onFirstPage=header_footer, onLaterPages=header_footer)
    print("WROTE", OUT)


if __name__ == "__main__":
    build()
