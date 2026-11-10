#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Generate concise Russian and English LEDNIQUE CVs as single-page A4 PDFs.

Fonts are the same families used by the website (Montserrat and Roboto Condensed).
Run: python3 tools/make-resume.py
"""
from pathlib import Path
from reportlab.lib.pagesizes import A4
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.pdfgen import canvas

ROOT = Path(__file__).resolve().parents[1]
FONT_DIR = ROOT / "assets" / "fonts"
OUTPUT_DIR = ROOT / "assets"

pdfmetrics.registerFont(TTFont("Montserrat", str(FONT_DIR / "Montserrat-500.ttf")))
pdfmetrics.registerFont(TTFont("Montserrat-SemiBold", str(FONT_DIR / "Montserrat-600.ttf")))
pdfmetrics.registerFont(TTFont("RobotoCondensed", str(FONT_DIR / "RobotoCondensed-500.ttf")))

PAGE_W, PAGE_H = A4
MARGIN = 30
TEXT_W = PAGE_W - 2 * MARGIN
INK = (0.04, 0.04, 0.04)
BODY = (0.19, 0.19, 0.19)
MUTED = (0.43, 0.43, 0.43)
LIME = (0.79, 0.96, 0.39)
PALE = (0.96, 0.97, 0.94)


def wrap(text, font, size, width):
    lines, line = [], ""
    for word in text.split():
        trial = f"{line} {word}".strip()
        if pdfmetrics.stringWidth(trial, font, size) <= width:
            line = trial
        else:
            if line:
                lines.append(line)
            line = word
    if line:
        lines.append(line)
    return lines


class Resume:
    def __init__(self, path, data):
        self.path = path
        self.data = data
        self.canvas = canvas.Canvas(str(path), pagesize=A4, pageCompression=1)
        self.canvas.setTitle(f"{data['name']} – {data['title']}")
        self.canvas.setAuthor("LEDNIQUE")
        self.y = PAGE_H - MARGIN
        self.page = 1
        self.first_section = True
        self.draw_header(first=True)

    def draw_header(self, first=False):
        c = self.canvas
        if first:
            top = PAGE_H - MARGIN
            header_h = 140
            c.drawImage(str(ROOT / "assets" / "logo.png"), MARGIN, top - 24, width=40, height=28, preserveAspectRatio=True, mask="auto")
            c.setFillColorRGB(*INK)
            c.setFont("Montserrat-SemiBold", 8)
            c.drawString(MARGIN + 48, top - 10, "@lednique")
            c.setFillColorRGB(*MUTED)
            c.setFont("Montserrat", 8)
            c.drawString(MARGIN + 130, top - 10, self.data["cv_label"])
            c.setFillColorRGB(*INK)
            c.setFont("RobotoCondensed", 30)
            c.drawString(MARGIN, top - 56, self.data["name"])
            c.setFont("Montserrat-SemiBold", 10)
            c.drawString(MARGIN, top - 77, self.data["title"])
            c.setFont("Montserrat", 8)
            c.drawString(MARGIN, top - 94, self.data["location"])
            c.drawImage(str(ROOT / "assets" / "profile.jpg"), PAGE_W - MARGIN - 129, top - 139, width=129, height=129, preserveAspectRatio=True, anchor='c')
            self.y = top - header_h - 12
        else:
            c.setFillColorRGB(*INK)
            c.setFont("Montserrat-SemiBold", 8)
            c.drawString(MARGIN, PAGE_H - MARGIN, self.data["name"])
            c.setFillColorRGB(*MUTED)
            c.setFont("Montserrat", 8)
            c.drawRightString(PAGE_W - MARGIN, PAGE_H - MARGIN, self.data["portfolio"])
            self.y = PAGE_H - MARGIN - 18

    def new_page(self):
        self.canvas.showPage()
        self.page += 1
        self.draw_header(first=False)

    def ensure(self, height):
        if self.y - height < MARGIN + 20:
            self.new_page()

    def section_heading(self, title):
        if not self.first_section:
            self.y -= 15  # 20 CSS pixels at 96 dpi
        self.first_section = False
        self.ensure(38)
        c = self.canvas
        c.setFillColorRGB(*INK)
        c.setFont("RobotoCondensed", 13)
        c.drawString(MARGIN, self.y, title.upper())
        c.setFillColorRGB(*LIME)
        c.roundRect(MARGIN, self.y - 7, 28, 2.5, 1.2, stroke=0, fill=1)
        self.y -= 16

    def paragraph(self, text, size=8.9, leading=12.2):
        lines = wrap(text, "Montserrat", size, TEXT_W)
        self.ensure(len(lines) * leading + 3)
        c = self.canvas
        c.setFillColorRGB(*BODY)
        c.setFont("Montserrat", size)
        for line in lines:
            c.drawString(MARGIN, self.y, line)
            self.y -= leading
        self.y -= 3

    def bullet(self, text, size=8.5, leading=11.2):
        indent = 13
        lines = wrap(text, "Montserrat", size, TEXT_W - indent)
        self.ensure(len(lines) * leading + 3)
        c = self.canvas
        c.setFillColorRGB(*LIME)
        c.circle(MARGIN + 3, self.y + 3, 2.2, stroke=0, fill=1)
        c.setFillColorRGB(*BODY)
        c.setFont("Montserrat", size)
        for line in lines:
            c.drawString(MARGIN + indent, self.y, line)
            self.y -= leading
        self.y -= 2

    def experience(self):
        self.section_heading(self.data["experience_title"])
        c = self.canvas
        title_y = self.y
        c.setFillColorRGB(*INK)
        c.setFont("Montserrat-SemiBold", 10)
        c.drawString(MARGIN, title_y, self.data["experience_role"])
        c.setFillColorRGB(*MUTED)
        c.setFont("Montserrat-SemiBold", 7.7)
        c.drawRightString(PAGE_W - MARGIN, title_y, self.data["experience_dates"])
        self.y -= 15
        c.setStrokeColorRGB(0.88, 0.89, 0.85)
        c.setLineWidth(0.5)
        c.line(MARGIN, self.y, PAGE_W - MARGIN, self.y)
        self.y -= 11
        for item in self.data["experience"]:
            self.bullet(item)
        self.y -= 1

    def skill_rows(self, title, rows):
        self.section_heading(title)
        label_w = 103
        for label, text in rows:
            lines = wrap(text, "Montserrat", 8.2, TEXT_W - label_w - 10)
            self.ensure(max(13, len(lines) * 11.2) + 4)
            c = self.canvas
            c.setFillColorRGB(*INK)
            c.setFont("Montserrat-SemiBold", 8.2)
            c.drawString(MARGIN, self.y, label)
            c.setFillColorRGB(*BODY)
            c.setFont("Montserrat", 8.2)
            for i, line in enumerate(lines):
                c.drawString(MARGIN + label_w, self.y - i * 11.2, line)
            self.y -= max(13, len(lines) * 11.2) + 4

    def build(self):
        self.section_heading(self.data["profile_title"])
        self.paragraph(self.data["profile"], size=8.8, leading=12)
        self.skill_rows(self.data["skills_title"], self.data["skills"])
        self.skill_rows(self.data["tools_title"], self.data["tools"])
        self.experience()
        self.section_heading(self.data["clients_title"])
        self.paragraph(self.data["clients"], size=8.4, leading=11.4)
        self.section_heading(self.data["additional_title"])
        self.paragraph(self.data["education"], size=8.2, leading=11)
        self.paragraph(self.data["languages"], size=8.2, leading=11)
        self.paragraph(self.data["work_format"], size=8.2, leading=11)

        # Contact links form one island at the bottom, with uniform gaps.
        self.ensure(48)
        c = self.canvas
        footer_y = MARGIN
        c.setStrokeColorRGB(0.82, 0.88, 0.75)
        c.roundRect(MARGIN, footer_y, TEXT_W, 32, 10, stroke=1, fill=0)
        c.setFillColorRGB(*INK)
        c.setFont("Montserrat", 8)
        x = MARGIN + 12
        links = [(self.data["email"], "mailto:" + self.data["email"]),
                 ("Telegram", "https://t.me/lednique"),
                 ("Behance", "https://www.behance.net/lednique"),
                 ("lednique.ru", "https://lednique.ru")]
        for label, url in links:
            width = pdfmetrics.stringWidth(label, "Montserrat", 8)
            c.drawString(x, footer_y + 12, label)
            c.linkURL(url, (x, footer_y + 9, x + width, footer_y + 21), relative=0, thickness=0)
            x += width + 16
        c.save()
        print(f"{self.path.relative_to(ROOT)}: {self.page} page(s), content bottom {self.y:.1f} pt")


RU = {
    "name": "ВИКТОР ВЛАСОВ",
    "title": "Графический дизайнер · AI / AR-продакшн",
    "location": "Ижевск · удалённо или гибридно",
    "portfolio": "lednique.ru",
    "cv_label": "РЕЗЮМЕ · 2026",
    "email": "lednique1@ya.ru",
    "telegram": "t.me/lednique",
    "profile_title": "Профиль",
    "profile": "Графический дизайнер с 12-летним опытом. С 2019 года – AR/XR-проекты, с 2023 года – AI-продакшн. Специализация: айдентика, digital- и печатные материалы, маркетплейс-инфографика, сайты, UI/UX и презентации. Создание AR-эффектов, AI-фото и видео; ведение проекта от брифа и визуальной концепции до файлов, готовых к публикации или печати. Портфолио включает проекты для более чем 20 брендов и компаний.",
    "experience_title": "Опыт работы",
    "experience_role": "Независимый дизайнер · LEDNIQUE",
    "experience_dates": "2014 – НАСТОЯЩЕЕ ВРЕМЯ",
    "experience": [
        "Разрабатываю айдентику и визуальные системы; создаю материалы для цифровых и печатных носителей, готовлю файлы к печати.",
        "Проектирую карточки товаров и инфографику для маркетплейсов, сайты, презентации и материалы для социальных сетей.",
        "С 2019 года создаю AR/XR-проекты: face/body tracking, virtual try-on, digital make-up, target tracking, 3D-маски и AR-игры.",
        "С 2023 года создаю AI-фото товаров и моделей, AI-видео и прототипы UGC-контента; контролирую сходство товара, фактуры, свет и отражения.",
        "Выполняю 3D-моделирование и motion: модели и текстуры в Blender, rigging и анимация.",
    ],
    "clients_title": "Выбранные бренды",
    "clients": "Glamnetic · OSCAR&FRANK · SLA Paris · H&M Beauty. Также – локальные компании и проекты под NDA.",
    "skills_title": "Ключевые компетенции",
    "skills": [
        ("Графический дизайн", "Айдентика, digital-дизайн, UI/UX, сайты, маркетплейс-инфографика, полиграфия и препресс, презентации, соцсети."),
        ("AR / XR", "Face/body tracking, virtual try-on, digital make-up, target tracking, 3D-маски, AR-игры."),
        ("AI / 3D / motion", "AI-фото и видео, AI-модели, прототипирование контента, 3D-моделирование, текстуры и анимация."),
    ],
    "tools_title": "Инструменты",
    "tools": [
        ("Дизайн", "Figma, Photoshop, Illustrator, InDesign."),
        ("3D и видео", "Blender, After Effects, Premiere Pro."),
        ("AR и AI", "Lens Studio, Effect House, Midjourney, Nano Banana, ChatGPT, Claude."),
    ],
    "additional_title": "Образование и условия",
    "education": "ИжГТУ им. М.Т. Калашникова, специальность «Технология художественной и промышленной обработки материалов».",
    "languages": "Русский – родной. Английский – рабочее общение: брифы, переписка и созвоны.",
    "work_format": "Проектная работа, фриланс или частичная занятость; удалённо или гибридно в Ижевске.",
}

EN = {
    "name": "VIKTOR VLASOV",
    "title": "Graphic Designer · AI / AR Production",
    "location": "Izhevsk, Russia · remote or hybrid",
    "portfolio": "lednique.ru",
    "cv_label": "CV · 2026",
    "email": "lednique1@ya.ru",
    "telegram": "t.me/lednique",
    "profile_title": "Profile",
    "profile": "Graphic designer with 12 years of experience. AR/XR practice since 2019 and AI production since 2023. Focus areas include brand identity, digital and print assets, marketplace graphics, websites, UI/UX, and presentations. Produces AR experiences, AI imagery, and video, taking projects from brief and concept through to production-ready assets. Portfolio includes work for 20+ brands and companies.",
    "experience_title": "Experience",
    "experience_role": "Independent Designer · LEDNIQUE",
    "experience_dates": "2014 – PRESENT",
    "experience": [
        "Develops brand identities and visual systems; creates digital and print assets and prepares production-ready files.",
        "Designs marketplace product cards and infographics, websites, presentations, and social media assets.",
        "Since 2019, creates AR/XR projects: face and body tracking, virtual try-on, digital make-up, target tracking, 3D masks, and AR games.",
        "Since 2023, produces AI product and model imagery, AI video, and UGC prototypes, with close control of product likeness, materials, lighting, and reflections.",
        "Creates 3D and motion work, including Blender models and textures, rigging and animation.",
    ],
    "clients_title": "Selected brands",
    "clients": "Glamnetic · OSCAR&FRANK · SLA Paris · H&M Beauty. Also works with local businesses and confidential clients.",
    "skills_title": "Core skills",
    "skills": [
        ("Graphic design", "Brand identity, digital design, UI/UX, websites, marketplace infographics, print and prepress, presentations, social media."),
        ("AR / XR", "Face/body tracking, virtual try-on, digital make-up, target tracking, 3D masks, AR games."),
        ("AI / 3D / motion", "AI imagery and video, AI models, content prototyping, 3D modelling, texturing, animation."),
    ],
    "tools_title": "Tools",
    "tools": [
        ("Design", "Figma, Photoshop, Illustrator, InDesign."),
        ("3D and video", "Blender, After Effects, Premiere Pro."),
        ("AR and AI", "Lens Studio, Effect House, Midjourney, Nano Banana, ChatGPT, Claude."),
    ],
    "additional_title": "Education and availability",
    "education": "Kalashnikov Izhevsk State Technical University – Technology of Artistic and Industrial Materials Processing.",
    "languages": "Russian – native. English – working communication for briefs, correspondence, and calls.",
    "work_format": "Project, freelance, or part-time work; remote or hybrid in Izhevsk.",
}

if __name__ == "__main__":
    Resume(OUTPUT_DIR / "resume.pdf", RU).build()
    Resume(OUTPUT_DIR / "resume-en.pdf", EN).build()
