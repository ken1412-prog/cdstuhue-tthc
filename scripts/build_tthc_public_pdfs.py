#!/usr/bin/env python3
"""Generate public, privacy-safe TTHC PDF handouts from the four current website procedures."""
from __future__ import annotations
import html
from pathlib import Path
from bs4 import BeautifulSoup
from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.platypus import Paragraph, SimpleDocTemplate, Spacer, KeepTogether, Table, TableStyle, PageBreak, Flowable
from svglib.svglib import svg2rlg

ROOT = Path(__file__).resolve().parents[1]
PAGE = ROOT / "site" / "cap-nhat-tthc-2026-11.html"
OUTPUT = ROOT / "site" / "downloads"
SECTIONS = [
    ("dang-phi", "01"),
    ("noi-cu-tru", "02"),
    ("chinh-thuc", "03"),
    ("tam-thoi", "04"),
]
def font_name():
    for path in ["/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf",
                 "/usr/share/fonts/truetype/liberation2/LiberationSans-Regular.ttf"]:
        if Path(path).is_file():
            pdfmetrics.registerFont(TTFont("VietUI",path))
            return "VietUI"
    raise RuntimeError("Vietnamese Unicode font unavailable")
def txt(node):
    return node.get_text(" ",strip=True) if node else ""
def as_steps(ol):
    rows=[]
    for li in ol.find_all("li",class_="step",recursive=False):
        rows.append((txt(li.select_one(".step-actor")),
                     txt(li.select_one(".step-action")),
                     txt(li.select_one("p"))))
    return rows
def extract(section):
    title=txt(section.find("h2"))
    lead=txt(section.select_one("p.lead"))
    diagram=section.select_one("figure.diagram img")
    if not title or not lead or diagram is None:
        raise RuntimeError("Incomplete TTHC section "+section.get("id","?"))
    chapters=[]
    if section.get("id")=="noi-cu-tru":
        prep=section.select_one(".shared-prep")
        if prep:
            chapters.append(("Điều kiện chung: thông tin chi bộ nơi cư trú",
                             [(None,txt(p),None) for p in prep.find_all("p")]))
        for id in ["gioi-thieu-noi-cu-tru","y-kien-can-bo","cuoi-nam"]:
            flow=section.find("details",id=id)
            if flow is None:
                raise RuntimeError("Missing distinct residence process "+id)
            ol=flow.select_one("ol.steps")
            if ol is None:
                raise RuntimeError("Missing numbered steps in "+id)
            chapters.append((txt(flow.find("summary")),as_steps(ol)))
    else:
        for ol in section.select("ol.steps"):
            parent=ol.find_parent("details",class_="branch")
            if parent:
                heading=txt(parent.find("summary"))
            else:
                h3=ol.find_previous_sibling("h3",class_="section-subtitle")
                heading=txt(h3) if h3 else "Trình tự thực hiện"
            chapters.append((heading,as_steps(ol)))
        for detail in section.select("details.branch"):
            if detail.find("ol",class_="steps") is None:
                ps=[txt(p) for p in detail.select(".plain-info p")]
                if ps:
                    chapters.append((txt(detail.find("summary")),
                                     [(None,x,None) for x in ps]))
    if section.get("id")=="dang-phi":
        allocation=section.find("details",id="phan-bo-dang-phi")
        if allocation:
            notes=[(None,txt(p),None) for p in allocation.select(".alloc-cases p")]
            for tr in allocation.select("table.alloc-table tbody tr"):
                cells=[txt(c) for c in tr.find_all("td")]
                if len(cells)==3: notes.append((None," | ".join(cells),None))
            notes.extend((None,txt(p),None) for p in allocation.select(".alloc-notes p"))
            if notes: chapters.append(("BỔ SUNG: PHÂN BỔ ĐẢNG PHÍ THEO CÔNG VĂN 6163-CV/VPTW",notes))
    if not chapters or not any(c[1] for c in chapters):
        raise RuntimeError("No instruction steps found in "+section.get("id","?"))
    return {
        "title":title,"lead":lead,"chapters":chapters,
        "diagram":diagram.get("src"),
        "note":txt(section.find("aside",class_="procedural-note")),
        "source":txt(section.select_one(".source-note")).split("↓ Tải")[0].strip(),
    }
def make_pdf(dest,num,data,font,short=False):
    blue=colors.HexColor("#214a6b")
    muted=colors.HexColor("#607c8f")
    styles={
        "k":ParagraphStyle("K",fontName=font,fontSize=8.4,leading=13,textColor=muted,spaceAfter=9),
        "t":ParagraphStyle("T",fontName=font,fontSize=16,leading=24,textColor=blue,spaceAfter=11),
        "l":ParagraphStyle("L",fontName=font,fontSize=9.8,leading=16,textColor=blue,spaceAfter=10),
        "h":ParagraphStyle("H",fontName=font,fontSize=11,leading=18,textColor=blue,spaceBefore=14,spaceAfter=8,keepWithNext=True),
        "s":ParagraphStyle("S",fontName=font,fontSize=9.5,leading=16,textColor=blue,spaceAfter=7),
        "b":ParagraphStyle("B",fontName=font,fontSize=9.2,leading=15,textColor=blue,spaceAfter=9)
    }
    def para(t,style):return Paragraph(html.escape(str(t)),styles[style])
    story=[para("HƯỚNG DẪN TTHC · TẬP HUẤN THÁNG 11/2026","k"),para(f"{num} — {data['title']}","t"),para(data["lead"],"l")]
    path=ROOT/"site"/data["diagram"]
    if path.is_file():
        drawing=svg2rlg(str(path))
        if drawing and drawing.width>0:
            scale=min(1.0,495.0/drawing.width)
            drawing.scale(scale,scale);drawing.width*=scale;drawing.height*=scale
            story.append(drawing);story.append(Spacer(1,8))
    for title,steps in data["chapters"]:
        story.append(para(title,"h"))
        for i,(actor,heading,body) in enumerate(steps,1):
            if heading is None:
                story.append(para(actor or "", "b"))
            else:
                chunks=[para(f"{i}. {heading} — {actor}","s")]
                if body:chunks.append(para(body,"b"))
                story.append(KeepTogether(chunks))
    if data["note"]:story.extend([Spacer(1,8),para(data["note"],"b")])
    if data["source"]:story.append(para(data["source"],"k"))
    def footer(c,d):
        c.saveState();c.setStrokeColor(colors.HexColor("#e0e8ef"))
        c.line(40,43,A4[0]-40,43);c.setFont(font,7.5);c.setFillColor(muted)
        c.drawString(40,30,"CDSTUHUE · 04 thủ tục TTHC")
        c.drawRightString(A4[0]-40,30,str(d.page));c.restoreState()
    doc=SimpleDocTemplate(str(dest),pagesize=A4,leftMargin=40,rightMargin=40,
        topMargin=42,bottomMargin=58,title=data["title"],author="CDSTUHUE",pageCompression=1)
    doc.build(story,onFirstPage=footer,onLaterPages=footer)
    if dest.stat().st_size<2000:raise RuntimeError("Empty PDF "+str(dest))
def main():
    font=font_name()
    soup=BeautifulSoup(PAGE.read_text(encoding="utf-8"),"html.parser")
    OUTPUT.mkdir(parents=True,exist_ok=True)
    for slug,num in SECTIONS:
        section=soup.find("section",id=slug)
        if section is None:raise RuntimeError("Missing "+slug)
        data=extract(section)
        dest=OUTPUT/f"tthc-20261105-{slug}.pdf"
        make_pdf(dest,num,data,font)
        print("Created",dest.name,dest.stat().st_size)
        if slug=="noi-cu-tru":
            single=dict(data)
            single["chapters"]=[chap for chap in data["chapters"] if "QUY TRÌNH 2" in chap[0]]
            if len(single["chapters"])!=1:raise RuntimeError("No standalone process 2")
            single["title"]="Lấy ý kiến nơi cư trú — Quy trình 2"
            single["lead"]="Chi bộ nơi sinh hoạt lập danh sách trước; cấp trên phê duyệt rồi mới chuyển đến nơi cư trú nhận xét."
            single["note"]="Quy trình 3 nhận xét cuối năm là nhánh riêng, do chi bộ nơi cư trú chủ động khởi tạo."
            dest2=OUTPUT/"tthc-20261105-lay-y-kien-can-bo.pdf"
            make_pdf(dest2,"02.2",single,font)
            print("Created",dest2.name,dest2.stat().st_size)
    combined=[(slug,num,extract(soup.find("section",id=slug))) for slug,num in SECTIONS]
    make_combined_pdf(OUTPUT/"cam-nang-04-tthc-2026-11.pdf",combined,font)
# Unified 04-TTHC handbook; legacy individual PDFs remain for backward-compatible links.
PALETTE={
    "dang-phi":("#146da8","#eaf4fc","01"),
    "noi-cu-tru":("#10865c","#ecf8f1","02"),
    "chinh-thuc":("#db7618","#fff2e6","03"),
    "tam-thoi":("#754bb2","#f3edfa","04"),
}

class ChapterBookmark(Flowable):
    def __init__(self,key,title):
        super().__init__()
        self.key,self.title=key,title
        self.width=self.height=0
    def wrap(self,aw,ah):
        return (0,0)
    def draw(self):
        self.canv.bookmarkPage(self.key)
        self.canv.addOutlineEntry(self.title,self.key,level=0,closed=False)

def make_combined_pdf(destination,sections,font):
    from xml.sax.saxutils import escape as xml_escape
    paper=colors.HexColor("#213c57")
    muted=colors.HexColor("#637b8d")
    styles={
        "eyebrow":ParagraphStyle("EyebrowUnified",fontName=font,fontSize=10,leading=17,textColor=muted,spaceAfter=13),
        "title":ParagraphStyle("TitleUnified",fontName=font,fontSize=27,leading=39,textColor=paper,spaceAfter=16),
        "subtitle":ParagraphStyle("SubUnified",fontName=font,fontSize=12,leading=19,textColor=muted,spaceAfter=19),
        "ch":ParagraphStyle("ChUnified",fontName=font,fontSize=17,leading=27,textColor=colors.white),
        "toc":ParagraphStyle("TocUnified",fontName=font,fontSize=11,leading=19,textColor=paper),
        "body":ParagraphStyle("BodyUnified",fontName=font,fontSize=9.2,leading=15.3,textColor=paper,spaceAfter=9),
        "step":ParagraphStyle("StepUnified",fontName=font,fontSize=10,leading=16,textColor=paper,spaceAfter=4),
        "actor":ParagraphStyle("ActorUnified",fontName=font,fontSize=8,leading=13,textColor=muted,spaceAfter=5),
        "note":ParagraphStyle("NoteUnified",fontName=font,fontSize=8.8,leading=14,textColor=muted,spaceAfter=8),
    }
    P=lambda v,k:Paragraph(xml_escape(str(v)),styles[k])
    story=[
        Spacer(1,38),
        P("CDSTUHUE · CẨM NANG TRA CỨU VÀ THAO TÁC","eyebrow"),
        P("HƯỚNG DẪN TOÀN BỘ 04 THỦ TỤC TTHC","title"),
        P("Hướng dẫn từ bước đầu đến bước cuối · Tài khoản thực hiện · Nút thao tác · Kết quả bàn giao","subtitle"),
        Spacer(1,8),
    ]
    for slug,num,data in sections:
        accent,bg,_=PALETTE[slug]
        line=Table([[P(num,"toc"),P(data["title"],"toc")]],colWidths=[55,445],rowHeights=[46])
        line.setStyle(TableStyle([
            ("BACKGROUND",(0,0),(0,0),colors.HexColor(accent)),
            ("BACKGROUND",(1,0),(1,0),colors.HexColor(bg)),
            ("TEXTCOLOR",(0,0),(0,0),colors.white),
            ("VALIGN",(0,0),(-1,-1),"MIDDLE"),
            ("BOX",(0,0),(-1,-1),0.5,colors.HexColor(bg)),
            ("LEFTPADDING",(0,0),(-1,-1),13),
        ]))
        story.extend([line,Spacer(1,8)])
    story.extend([
        Spacer(1,26),
        P("MỤC LỤC","eyebrow"),
        P("01 · Thu, nộp đảng phí: nộp thông thường, điều chỉnh, phân bổ theo Công văn 6163","body"),
        P("02 · Nhận xét nơi cư trú: quy trình 1 giới thiệu, quy trình 2 phục vụ công tác cán bộ, quy trình 3 cuối năm","body"),
        P("03 · Chuyển sinh hoạt chính thức: giấy giới thiệu điện tử 6 ô","body"),
        P("04 · Chuyển sinh hoạt tạm thời: chiều đi ô 1–4, chiều về ô 5–8","body"),
        Spacer(1,12),
        P("Các quy trình trong Thủ tục 02 là các trường hợp độc lập, không phải ba bước thực hiện liên tiếp. Tỷ lệ phân bổ đảng phí phải tính theo từng cấp trên phần còn lại; khoản đã phân bổ kỳ trước không phân bổ lại.","note")
    ])
    for slug,num,data in sections:
        accent,bg,_=PALETTE[slug]
        mainColor=colors.HexColor(accent)
        lightColor=colors.HexColor(bg)
        story.extend([PageBreak(),ChapterBookmark("chapter_"+num,num+" - "+data["title"])])
        titlebar=Table([[Paragraph(num,ParagraphStyle("Num"+num,fontName=font,fontSize=23,leading=30,textColor=colors.white)),
                         P(data["title"],"ch")]],colWidths=[60,440])
        titlebar.setStyle(TableStyle([
            ("BACKGROUND",(0,0),(-1,-1),mainColor),
            ("VALIGN",(0,0),(-1,-1),"MIDDLE"),
            ("LEFTPADDING",(0,0),(-1,-1),16),
            ("TOPPADDING",(0,0),(-1,-1),15),
            ("BOTTOMPADDING",(0,0),(-1,-1),15),
        ]))
        story.extend([titlebar,Spacer(1,13),P(data["lead"],"body"),Spacer(1,7)])
        svg=ROOT/"site"/data["diagram"]
        if svg.exists():
            drawing=svg2rlg(str(svg))
            if drawing and drawing.width>0:
                scale=min(1,500.0/drawing.width)
                drawing.scale(scale,scale)
                drawing.width*=scale
                drawing.height*=scale
                story.extend([drawing,Spacer(1,12)])
        secStyle=ParagraphStyle("Subchapter"+num,fontName=font,fontSize=11.6,
            leading=18,textColor=mainColor,spaceBefore=13,spaceAfter=9,keepWithNext=True)
        nrStyle=ParagraphStyle("Nr"+num,fontName=font,fontSize=15,
            leading=21,textColor=mainColor)
        for title,steps in data["chapters"]:
            headingbox=Table([[Paragraph(xml_escape(str(title)),secStyle)]],colWidths=[500])
            headingbox.setStyle(TableStyle([
                ("BACKGROUND",(0,0),(-1,-1),lightColor),
                ("LINEBEFORE",(0,0),(0,0),3,mainColor),
                ("LEFTPADDING",(0,0),(-1,-1),11),
                ("RIGHTPADDING",(0,0),(-1,-1),8),
                ("TOPPADDING",(0,0),(-1,-1),8),
                ("BOTTOMPADDING",(0,0),(-1,-1),8)
            ]))
            story.extend([Spacer(1,12),headingbox,Spacer(1,8)])
            for ix,(actor,heading,body) in enumerate(steps,1):
                if heading is None:
                    if actor:story.append(P(actor,"body"))
                    continue
                contents=[P(heading,"step"),P(actor or "Theo tài khoản được phân quyền","actor")]
                if body:contents.append(P(body,"body"))
                row=Table([[Paragraph(f"{ix:02}",nrStyle),contents]],colWidths=[41,459])
                row.setStyle(TableStyle([
                    ("BACKGROUND",(0,0),(-1,-1),colors.HexColor("#fbfcff")),
                    ("LINEBELOW",(0,0),(-1,-1),0.5,colors.HexColor("#dbe5ed")),
                    ("VALIGN",(0,0),(-1,-1),"TOP"),
                    ("LEFTPADDING",(0,0),(0,0),9),
                    ("LEFTPADDING",(1,0),(1,0),12),
                    ("RIGHTPADDING",(1,0),(1,0),9),
                    ("TOPPADDING",(0,0),(-1,-1),9),
                    ("BOTTOMPADDING",(0,0),(-1,-1),8),
                ]))
                story.append(Spacer(1,5))
                story.append(row)
        if data["note"]:story.extend([Spacer(1,12),P(data["note"],"note")])
        if data["source"]:story.append(P(data["source"],"note"))
    def footer(canvas,doc):
        canvas.saveState()
        canvas.setStrokeColor(colors.HexColor("#e0e8ef"))
        canvas.line(40,41,A4[0]-40,41)
        canvas.setFont(font,8)
        canvas.setFillColor(muted)
        canvas.drawString(40,28,"CDSTUHUE | Cẩm nang 04 thủ tục TTHC | 11/2026")
        canvas.drawRightString(A4[0]-40,28,str(doc.page))
        canvas.restoreState()
    doc=SimpleDocTemplate(str(destination),pagesize=A4,
        leftMargin=40,rightMargin=40,topMargin=40,bottomMargin=55,
        title="Cẩm nang 04 thủ tục TTHC - CDSTUHUE",author="CDSTUHUE",pageCompression=1)
    doc.build(story,onFirstPage=footer,onLaterPages=footer)
    if not destination.is_file() or destination.stat().st_size<9000:
        raise RuntimeError("Unified TTHC PDF missing or unexpectedly small")
    print("Created unified PDF:",destination.name,destination.stat().st_size,"bytes")

if __name__=="__main__":
    main()
