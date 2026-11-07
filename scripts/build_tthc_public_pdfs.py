#!/usr/bin/env python3
"""Build safe public TTHC PDF handouts from already-published website text.

These PDFs are independently authored summaries, NOT copies of raw training
PDFs, Zalo screenshots, attached Word documents, or private user data.
"""
from __future__ import annotations
import html
from pathlib import Path
from bs4 import BeautifulSoup
from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.platypus import Paragraph, SimpleDocTemplate, Spacer

ROOT = Path(__file__).resolve().parents[1]
HTML = ROOT / "site" / "cap-nhat-tthc-2026-11.html"
DEST = ROOT / "site" / "downloads"
SECTIONS = (
    ("dang-phi", "01"),
    ("chinh-thuc", "02"),
    ("noi-cu-tru", "03"),
    ("tam-thoi", "04"),
)

def register_font():
    paths = (
        "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf",
        "/usr/share/fonts/truetype/dejavu/DejaVuSansCondensed.ttf",
        "/usr/share/fonts/truetype/liberation2/LiberationSans-Regular.ttf",
    )
    candidate = next((p for p in paths if Path(p).exists()), None)
    if not candidate:
        raise RuntimeError("No Unicode TTF font to render Vietnamese PDF")
    pdfmetrics.registerFont(TTFont("TTHCViet", candidate))
    return "TTHCViet"

def extract(section):
    title = section.find("h2")
    lead = section.find("p", class_="lead")
    note = section.find("aside")
    source = section.find("p", class_="src")
    if not all((title,lead,note,source)):
        raise RuntimeError("Incomplete public training section")
    steps = [li.get_text(" ", strip=True) for li in section.find_all("li")]
    residence_groups = []
    if section.get("id") == "noi-cu-tru":
        # Keep all year-end information and role-specific permissions together.
        # Avoid flattening four different actors into one generic numbered list.
        steps = []
        prerequisite = section.select_one(".ncr-guide .ncr-gold")
        if prerequisite:
            residence_groups.append(("Điều kiện chung: cập nhật thông tin nơi cư trú", [prerequisite.get_text(" ", strip=True)]))
        for info in section.select(".ncr-intro-card"):
            residence_groups.append((info.find("h4").get_text(" ", strip=True), [info.find("p").get_text(" ", strip=True)]))
        flow = section.select_one("#cuoi-nam .ncr-gold")
        if flow:
            residence_groups.append(("Nhận xét cuối năm: ai khởi tạo và ai nhận kết quả?", [flow.get_text(" ", strip=True)]))
        for role in section.select("#cuoi-nam .ncr-role"):
            role_name = role.select_one(".ncr-role-head b")
            permission = role.select_one(".ncr-role-head small")
            content = [li.get_text(" ", strip=True) for li in role.select(".ncr-role-body li")]
            if role_name:
                role_title = role_name.get_text(" ", strip=True)
                if permission:
                    role_title += " — " + permission.get_text(" ", strip=True)
                residence_groups.append((role_title, content))
        deadline = section.select_one("#cuoi-nam .ncr-tips")
        if deadline:
            residence_groups.append(("Thời hạn và điều kiện hoàn tất", [deadline.get_text(" ", strip=True)]))
        troubleshooting = section.select_one("#cuoi-nam .ncr-checks")
        if troubleshooting:
            residence_groups.append(("Khi không thấy nút hoặc hồ sơ", [li.get_text(" ", strip=True) for li in troubleshooting.find_all("li")]))
        for alternate in section.select("details.ncr-alt"):
            summary = alternate.find("summary")
            if summary:
                residence_groups.append((summary.get_text(" ", strip=True), [li.get_text(" ", strip=True) for li in alternate.find_all("li")]))
    if not steps and not residence_groups:
        raise RuntimeError("Empty public training steps")
    # Avoid the download link itself becoming source text in the PDF.
    for link in source.find_all("a"):
        link.decompose()
    training = section.find("div", class_="training-block")
    training_points = []
    if training:
        summary = training.find("div", class_="training-summary")
        if summary:
            training_points.append(summary.get_text(" ", strip=True))
        for lane in training.select(".training-lane"):
            heading = lane.select_one(".training-lane-head strong")
            actions = [x.get_text(" ",strip=True) for x in lane.select(".training-step")]
            if heading and actions:
                training_points.append(heading.get_text(" ",strip=True)+": "+" → ".join(actions))
        for card in training.select(".training-card")[:3]:
            heading = card.find("header")
            body = card.select_one(".training-body")
            if heading and body:
                training_points.append(heading.get_text(" ",strip=True)+": "+body.get_text(" ",strip=True))
        for role in training.select(".training-role"):
            training_points.append(role.get_text(" ",strip=True))
    return {
        "title":title.get_text(" ",strip=True),
        "lead":lead.get_text(" ",strip=True),
        "steps":steps,
        "residence_groups":residence_groups,
        "training_points":training_points,
        "note":note.get_text(" ",strip=True),
        "source":source.get_text(" ",strip=True),
    }

def make_pdf(dest, number, data, font):
    navy = colors.HexColor("#173950")
    muted = colors.HexColor("#456b7e")
    title = ParagraphStyle("Title",fontName=font,fontSize=17,leading=25,textColor=navy,spaceAfter=11)
    lead = ParagraphStyle("Lead",fontName=font,fontSize=10.3,leading=17,textColor=navy,spaceAfter=14)
    body = ParagraphStyle("Body",fontName=font,fontSize=9.5,leading=17,textColor=navy,spaceAfter=9)
    meta = ParagraphStyle("Meta",fontName=font,fontSize=8,leading=14,textColor=muted,spaceAfter=9)
    def p(s,style):return Paragraph(html.escape(s),style)
    story=[
        p("HƯỚNG DẪN TTHC • TẬP HUẤN 05/11/2026",meta),
        p(f"{number} — {data['title']}",title),
        p(data["lead"],lead)
    ]
    if data["training_points"]:
        story.append(p("Nội dung cần nhớ từ tài liệu đào tạo:",lead))
        for fact in data["training_points"]:
            story.append(p("• "+fact,body))
        story.append(Spacer(1,8))
    if data["residence_groups"]:
        for heading, items in data["residence_groups"]:
            story.append(Spacer(1,9))
            story.append(p(heading,lead))
            for i,step in enumerate(items,1):
                story.append(p(f"{i}. {step}",body))
    else:
        for i,step in enumerate(data["steps"],1):
            story.append(p(f"{i}. {step}",body))
    story.extend([
        Spacer(1,12),p(data["note"],body),Spacer(1,4),
        p(data["source"],meta),
        p("Hướng dẫn sử dụng TTHC • CDSTUHUE",meta)
    ])
    def footer(canvas,doc):
        canvas.saveState()
        canvas.setStrokeColor(colors.HexColor("#d3e6ee"))
        canvas.line(42,45,A4[0]-42,45)
        canvas.setFont(font,7.6)
        canvas.setFillColor(muted)
        canvas.drawString(42,32,"CDSTUHUE · Hướng dẫn thao tác TTHC 05/11/2026")
        canvas.drawRightString(A4[0]-42,32,str(doc.page))
        canvas.restoreState()
    pdf=SimpleDocTemplate(
        str(dest),pagesize=A4,rightMargin=42,leftMargin=42,
        topMargin=48,bottomMargin=65,
        title=f"Hướng dẫn TTHC 05/11/2026 — {data['title']}",
        author="CDSTUHUE",pageCompression=1)
    pdf.build(story,onFirstPage=footer,onLaterPages=footer)

def main():
    font=register_font()
    soup=BeautifulSoup(HTML.read_text(encoding="utf-8"),"html.parser")
    DEST.mkdir(parents=True,exist_ok=True)
    for slug,number in SECTIONS:
        section=soup.find("section",id=slug)
        if section is None:raise RuntimeError("Missing TTHC section: "+slug)
        output=DEST/f"tthc-20261105-{slug}.pdf"
        make_pdf(output,number,extract(section),font)
        if output.stat().st_size<1500:raise RuntimeError("PDF unexpectedly empty: "+str(output))
        print("Created public PDF:",output,output.stat().st_size,"bytes")

if __name__=="__main__":
    main()
