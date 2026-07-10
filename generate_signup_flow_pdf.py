import os
import sys
from fpdf import FPDF

class FlowPDF(FPDF):
    def header(self):
        if self.page_no() > 1:
            self.set_font("helvetica", "B", 8)
            self.set_text_color(100, 100, 100)
            self.cell(0, 10, "Talent Intelligence Platform - User Signup to Screening Flow", new_x="RIGHT", new_y="TOP")
            self.set_x(-40)
            self.cell(0, 10, "Lifecycle Diagram & Guide", new_x="LMARGIN", new_y="NEXT", align="R")
            self.set_draw_color(180, 180, 180)
            self.line(15, 18, 195, 18)
            self.ln(5)

    def footer(self):
        if self.page_no() > 1:
            self.set_y(-15)
            self.set_font("helvetica", "I", 8)
            self.set_text_color(120, 120, 120)
            self.cell(0, 10, f"Page {self.page_no()}/{{nb}}", align="C")

def sanitize(text):
    if not text:
        return ""
    replacements = {
        "\u2014": " - ",
        "\u2013": " - ",
        "\u201c": '"',
        "\u201d": '"',
        "\u2018": "'",
        "\u2019": "'",
        "\u2022": "* ",
        "\u2192": "->",
        "\u2713": "[ok]",
        "\u00e9": "e",
        "\u00e1": "a",
        "\u00f3": "o",
        "\u00fa": "u",
        "\u00ed": "i",
        "\u00f1": "n",
        "\u00d7": "x",
        "\u2194": "<->",
        "\u2265": ">=",
        "\u2264": "<=",
        "\u22c5": "*",
        "\u2026": "...",
    }
    for uni, asc in replacements.items():
        text = text.replace(uni, asc)
    return text.encode("latin-1", errors="ignore").decode("latin-1")

def build_pdf(output_path):
    print("Generating User Signup to Screening Flow PDF...")
    pdf = FlowPDF(orientation="P", unit="mm", format="A4")
    pdf.alias_nb_pages()
    
    # Cover Page
    pdf.add_page()
    pdf.set_margins(15, 20, 15)
    pdf.ln(30)
    
    pdf.set_font("helvetica", "B", 24)
    pdf.set_text_color(26, 54, 93) # Navy Blue
    pdf.multi_cell(0, 12, "TALENT INTELLIGENCE PLATFORM", align="C")
    
    pdf.ln(5)
    pdf.set_font("helvetica", "B", 16)
    pdf.set_text_color(44, 122, 123) # Teal
    pdf.multi_cell(0, 10, "USER SIGNUP TO CANDIDATE SCREENING\nLIFECYCLE FLOW DOCUMENT", align="C")
    
    pdf.ln(15)
    pdf.set_draw_color(74, 85, 104)
    pdf.line(40, pdf.get_y(), 170, pdf.get_y())
    
    pdf.ln(15)
    pdf.set_font("helvetica", "", 12)
    pdf.set_text_color(45, 55, 72)
    intro_text = (
        "This lifecycle guide details the transactional, event-driven processes executing "
        "across our microservices backend during recruiter signup, credential verification, "
        "job provisioning, file upload, parsing, pgvector embedding, and LLM rating.\n\n"
        "It supplements the sequence diagrams by detailing step-by-step actions and code files."
    )
    pdf.multi_cell(0, 7, sanitize(intro_text), align="C")
    
    pdf.ln(45)
    pdf.set_font("helvetica", "B", 10)
    pdf.set_text_color(113, 128, 150)
    pdf.cell(0, 5, "CONFIDENTIAL TRANSACTION & SEQUENCE BLUEPRINT", new_x="LMARGIN", new_y="NEXT", align="C")
    pdf.cell(0, 5, "GENERATED AUTOMATICALLY FROM THE SYSTEM ANALYSIS CODE", new_x="LMARGIN", new_y="NEXT", align="C")

    # Read user_signup_to_screening_flow.md
    report_path = os.path.join(os.path.dirname(__file__), "user_signup_to_screening_flow.md")
    if not os.path.exists(report_path):
        report_path = "user_signup_to_screening_flow.md"

    if os.path.exists(report_path):
        with open(report_path, "r", encoding="utf-8") as f:
            lines = f.readlines()
    else:
        print("Error: user_signup_to_screening_flow.md not found.")
        lines = []

    current_section = ""
    current_content = []
    
    in_mermaid = False
    in_code = False

    for line in lines:
        stripped = line.strip()
        if stripped.startswith("```mermaid"):
            in_mermaid = True
            continue
        elif stripped.startswith("```") and in_mermaid:
            in_mermaid = False
            continue
        elif stripped.startswith("```"):
            in_code = not in_code
            continue
        
        if in_mermaid:
            continue

        if stripped.startswith("# "):
            continue
        elif stripped.startswith("## "):
            if current_section:
                render_section(pdf, current_section, current_content)
            current_section = stripped[3:]
            current_content = []
        elif stripped.startswith("### "):
            current_content.append(("subtitle", stripped[4:]))
        elif stripped.startswith("- ") or stripped.startswith("* "):
            current_content.append(("bullet", stripped[2:]))
        elif stripped.strip().startswith("1. ") or stripped.strip().startswith("2. ") or stripped.strip().startswith("3. ") or stripped.strip().startswith("4. ") or stripped.strip().startswith("5. ") or stripped.strip().startswith("6. ") or stripped.strip().startswith("7. ") or stripped.strip().startswith("8. ") or stripped.strip().startswith("9. ") or (len(stripped) > 3 and stripped[:2].isdigit() and stripped[2] == '.'):
            # Ordered lists
            dot_idx = stripped.find('.')
            number = stripped[:dot_idx+1]
            content_text = stripped[dot_idx+1:].strip()
            current_content.append(("ordered", f"{number} {content_text}"))
        elif stripped != "":
            if in_code:
                current_content.append(("code_line", line))
            else:
                current_content.append(("paragraph", stripped))
                
    if current_section:
        render_section(pdf, current_section, current_content)

    pdf.output(output_path)
    print(f"User Signup Flow PDF successfully created at {output_path}")

def render_section(pdf, title, content):
    pdf.add_page()
    pdf.ln(5)
    pdf.set_font("helvetica", "B", 14)
    pdf.set_text_color(44, 122, 123) # Teal
    pdf.cell(0, 8, sanitize(title), new_x="LMARGIN", new_y="NEXT")
    pdf.ln(4)
    
    in_bullet_list = False
    
    for c_type, text in content:
        # Check for page spill
        if pdf.get_y() + 25 > 270:
            pdf.add_page()
            pdf.ln(5)
            
        if c_type == "subtitle":
            if in_bullet_list:
                pdf.ln(2)
                in_bullet_list = False
            pdf.set_font("helvetica", "B", 11)
            pdf.set_text_color(26, 54, 93) # Navy
            pdf.multi_cell(0, 6, sanitize(text))
            pdf.ln(2)
        elif c_type == "bullet":
            in_bullet_list = True
            pdf.set_font("helvetica", "", 10)
            pdf.set_text_color(45, 55, 72)
            pdf.set_x(20)
            pdf.cell(5, 5, chr(149), align="L")
            pdf.multi_cell(0, 5, sanitize(text))
            pdf.set_x(15)
        elif c_type == "ordered":
            if in_bullet_list:
                pdf.ln(2)
                in_bullet_list = False
            pdf.set_font("helvetica", "", 10)
            pdf.set_text_color(45, 55, 72)
            pdf.multi_cell(0, 5, sanitize(text))
            pdf.ln(3.5)
        elif c_type == "paragraph":
            if in_bullet_list:
                pdf.ln(2)
                in_bullet_list = False
            pdf.set_font("helvetica", "", 10)
            pdf.set_text_color(45, 55, 72)
            pdf.multi_cell(0, 5, sanitize(text))
            pdf.ln(3)
        elif c_type == "code_line":
            if in_bullet_list:
                in_bullet_list = False
            pdf.set_font("courier", "", 9)
            pdf.set_text_color(90, 90, 90)
            pdf.set_fill_color(240, 240, 240)
            cleaned_code = text.replace("[file://", "").replace("]", "")
            pdf.multi_cell(0, 4.5, sanitize(cleaned_code), fill=True)

if __name__ == "__main__":
    out_pdf = os.path.join(os.getcwd(), "user_signup_to_screening_flow.pdf")
    build_pdf(out_pdf)
