#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Резюме LEDNIQUE → assets/resume.pdf (RU) и assets/resume-en.pdf (EN).
Стиль сайта: светлый фон, белые скруглённые карточки, лаймовый акцент.
Запуск:  python3 tools/make-resume.py
"""
import os
from reportlab.pdfgen import canvas
from reportlab.lib.pagesizes import A4
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
FONT_DIR = "/usr/share/fonts/truetype/dejavu"
pdfmetrics.registerFont(TTFont("DJ", os.path.join(FONT_DIR, "DejaVuSans.ttf")))
pdfmetrics.registerFont(TTFont("DJB", os.path.join(FONT_DIR, "DejaVuSans-Bold.ttf")))

W, H = A4
M = 34
GAP = 16
RIGHT_W = 178
LEFT_W = W - 2 * M - GAP - RIGHT_W
TOP_H = 112
INK = (0.06, 0.06, 0.06)
MUT = (0.45, 0.45, 0.45)
LIME = (0.792, 0.973, 0.396)
CARD = (1, 1, 1)
BG = (0.949, 0.949, 0.941)


def wrap(text, font, size, width):
    words, lines, cur = text.split(), [], ""
    for word in words:
        trial = (cur + " " + word).strip()
        if pdfmetrics.stringWidth(trial, font, size) <= width:
            cur = trial
        else:
            if cur:
                lines.append(cur)
            cur = word
    if cur:
        lines.append(cur)
    return lines


class Flow:
    """Поток карточек в колонке с переносом на новую страницу."""

    def __init__(self, col, x, w, y):
        self.c, self.x, self.w, self.y = col, x, w, y
        self.pad = 15

    def space(self, h):
        if self.y - h < M + 4:
            self.new_page()
        return self.y

    def new_page(self):
        self.c.showPage()
        self.y = H - M
        return self.y

    def card(self, title, height, gaps):
        self.space(height)
        c, x, w, y = self.c, self.x, self.w, self.y
        c.setFillColorRGB(*CARD)
        c.roundRect(x, y - height, w, height, 20, stroke=0, fill=1)
        # заголовок – капсом с разрядкой
        spaced(c, x + self.pad, y - self.pad - 9, title.upper(), "DJB", 9.2, INK, 1.1)
        c.setStrokeColorRGB(*LIME)
        c.setLineWidth(2)
        c.line(x + self.pad, y - self.pad - 15, x + self.pad + 26, y - self.pad - 15)
        gaps(x + self.pad, y - self.pad - 30, w - 2 * self.pad)
        self.y = y - height - 10

    def bullets(self, items, size=8.6, lead=12.4, dot=True):
        self.c.setFont("DJ", size)
        out = []
        for it in items:
            lines = wrap(it, "DJ", size, self.w - 2 * self.pad - (10 if dot else 0))
            out.append(lines)
        height = self.pad * 2 + 26 + sum(len(l) * lead + 3 for l in out)
        self.space(height)
        c, x, y = self.c, self.x, self.y
        c.setFillColorRGB(*CARD)
        c.roundRect(x, y - height, self.w, height, 16, stroke=0, fill=1)
        cy = y - self.pad - 24
        for lines in out:
            if dot:
                c.setFillColorRGB(*INK)
                c.circle(x + self.pad + 2.4, cy + size * 0.36, 1.7, stroke=0, fill=1)
            c.setFillColorRGB(0.2, 0.2, 0.2)
            c.setFont("DJ", size)
            for ln in lines:
                c.drawString(x + self.pad + (11 if dot else 0), cy, ln)
                cy -= lead
            cy -= 3
        self.y = y - height - 10
        return height


def spaced(c, x, y, s, font, size, color, space):
    t = c.beginText(x, y)
    t.setFont(font, size)
    t.setFillColorRGB(*color)
    t.setCharSpace(space)
    t.textOut(s)
    t.setCharSpace(0)         # Tc живёт в состоянии PDF – сбрасываем, иначе разрядка «прилипает»
    c.drawText(t)


def txt(c, x, y, s, font, size, color=INK):
    c.setFont(font, size)
    c.setFillColorRGB(*color)
    c.drawString(x, y, s)


def text_height(text, font, size, width, lead):
    return len(wrap(text, font, size, width)) * lead


def header(c, d):
    """Шапка как герой сайта: градиентная карточка, лаймовая пилюля, имя капсом."""
    top = H - M
    # градиент внутри скруглённой карточки
    c.saveState()
    path = c.beginPath()
    path.roundRect(M, top - TOP_H, W - 2 * M, TOP_H, 28)
    c.clipPath(path, stroke=0, fill=0)
    c.linearGradient(M, top, W, top - TOP_H, [(1, 1, 1), (0.902, 0.965, 0.796)], extend=True)
    c.restoreState()
    c.setStrokeColorRGB(0.85, 0.86, 0.82)
    c.setLineWidth(0.6)
    c.roundRect(M, top - TOP_H, W - 2 * M, TOP_H, 28, stroke=1, fill=0)
    # лаймовая пилюля с брендом
    pw = pdfmetrics.stringWidth("LEDNIQUE", "DJB", 7.4) + 22
    c.setFillColorRGB(*LIME)
    c.roundRect(M + 18, top - 34, pw, 16, 8, stroke=0, fill=1)
    txt(c, M + 29, top - 29.5, "LEDNIQUE", "DJB", 7.4, INK)
    txt(c, M + 18 + pw + 10, top - 29.5, "резюме · 2026", "DJ", 7.4, MUT)
    # имя – крупно капсом, как h1 на сайте
    txt(c, M + 18, top - 66, d["name"].upper(), "DJB", 31)
    spaced(c, M + 18, top - 84, d["role"].upper(), "DJ", 8.6, (0.13, 0.13, 0.13), 0.7)
    txt(c, M + 18, top - 100, d["meta"], "DJ", 8.2, MUT)
    txt(c, M + W - 2 * M - 18 - pdfmetrics.stringWidth(d["site"], "DJ", 8.2), top - 29.5, d["site"], "DJ", 8.2, MUT)
    return top - TOP_H - 16


def chips_height(items, width, size=7.6, h=15):
    x, rows = 0, 1
    for s in items:
        w = pdfmetrics.stringWidth(s, "DJ", size) + 12 + 2
        if x + w > width:
            rows += 1
            x = 0
        x += w + 5
    return rows * (h + 4) - 4


def chips(c, x, y, width, items, size=7.6, h=15):
    px, cx = x, x
    cy = y
    for s in items:
        w = pdfmetrics.stringWidth(s, "DJ", size) + 12 + 2
        if cx + w > px + width:
            cx = px
            cy -= h + 4
        c.setFillColorRGB(0.965, 0.965, 0.955)
        c.setStrokeColorRGB(0.86, 0.86, 0.84)
        c.setLineWidth(0.5)
        c.roundRect(cx, cy - h, w, h, h / 2, stroke=1, fill=1)
        c.setFillColorRGB(0.16, 0.16, 0.16)
        c.setFont("DJ", size)
        c.drawString(cx + 6, cy - h + (h - size) / 2 + size * 0.24, s)
        cx += w + 5
    return cy - h


def section_title(c, x, y, title):
    spaced(c, x, y, title.upper(), "DJB", 9.4, INK, 1.2)
    c.setStrokeColorRGB(*LIME)
    c.setLineWidth(2)
    c.line(x, y - 6, x + 26, y - 6)


def left_col(c, y, d):
    x, w = M, LEFT_W
    pad = 14
    inner = w - pad * 2

    # О себе
    paras = d["about"]
    heights = [text_height(p, "DJ", 8.5, inner, 11.9) for p in paras]
    h = pad * 2 + 24 + sum(heights) + 5 * (len(paras) - 1)
    c.setFillColorRGB(*CARD)
    c.roundRect(x, y - h, w, h, 16, stroke=0, fill=1)
    section_title(c, x + pad, y - pad - 10, d["s_about"])
    cy = y - pad - 28
    for p, ph in zip(paras, heights):
        c.setFillColorRGB(0.22, 0.22, 0.22)
        c.setFont("DJ", 8.5)
        for ln in wrap(p, "DJ", 8.5, inner):
            c.drawString(x + pad, cy, ln)
            cy -= 11.9
        cy -= 5
    y = y - h - 8

    # Опыт
    items = d["exp"]
    heights = []
    for it in items:
        hh = 10.5 + 11.6 + text_height(it["text"], "DJ", 8.1, inner, 11.4) + 7
        heights.append(hh)
    h = pad * 2 + 24 + sum(heights)
    c.setFillColorRGB(*CARD)
    c.roundRect(x, y - h, w, h, 16, stroke=0, fill=1)
    section_title(c, x + pad, y - pad - 10, d["s_exp"])
    cy = y - pad - 28
    for it, hh in zip(items, heights):
        spaced(c, x + pad, cy, it["years"].upper(), "DJB", 6.4, (0.55, 0.55, 0.55), 0.7)
        c.setFillColorRGB(*INK)
        c.setFont("DJB", 9)
        c.drawString(x + pad, cy - 11, it["title"])
        c.setFillColorRGB(0.3, 0.3, 0.3)
        c.setFont("DJ", 8.1)
        ty = cy - 23
        for ln in wrap(it["text"], "DJ", 8.1, inner):
            c.drawString(x + pad, ty, ln)
            ty -= 11.4
        cy -= hh
        if it is not items[-1]:
            c.setStrokeColorRGB(0.9, 0.9, 0.9)
            c.setLineWidth(0.5)
            c.line(x + pad, cy + 6, x + w - pad, cy + 6)
    y = y - h - 8

    # Навыки
    ch = chips_height(d["skills"], inner, 7.3)
    h = pad * 2 + 24 + ch
    c.setFillColorRGB(*CARD)
    c.roundRect(x, y - h, w, h, 16, stroke=0, fill=1)
    section_title(c, x + pad, y - pad - 10, d["s_skills"])
    chips(c, x + pad, y - pad - 24, inner, d["skills"], 7.3, 13.5)
    return y - h - 10


def right_col(c, y, d):
    x, w = M + LEFT_W + GAP, RIGHT_W
    pad = 12
    inner = w - pad * 2

    # Контакты
    rows = d["contacts"]
    h = pad * 2 + 24 + len(rows) * 18
    c.setFillColorRGB(*CARD)
    c.roundRect(x, y - h, w, h, 16, stroke=0, fill=1)
    section_title(c, x + pad, y - pad - 10, d["s_contacts"])
    cy = y - pad - 28
    for label, val in rows:
        spaced(c, x + pad, cy, label.upper(), "DJB", 5.8, (0.55, 0.55, 0.55), 0.6)
        c.setFillColorRGB(*INK)
        c.setFont("DJ", 8)
        c.drawString(x + pad, cy - 9, val)
        cy -= 18
    y = y - h - 10

    # Языки
    langs = d["langs"]
    note_h = text_height(d["langs_note"], "DJ", 7.4, inner, 10.4)
    h = pad * 2 + 24 + sum(20 for _ in langs) + 6 + note_h
    c.setFillColorRGB(*CARD)
    c.roundRect(x, y - h, w, h, 16, stroke=0, fill=1)
    section_title(c, x + pad, y - pad - 10, d["s_langs"])
    cy = y - pad - 28
    for label, val in langs:
        spaced(c, x + pad, cy, label.upper(), "DJB", 5.8, (0.55, 0.55, 0.55), 0.6)
        c.setFillColorRGB(*INK)
        c.setFont("DJ", 8)
        for ln in wrap(val, "DJ", 8, inner):
            cy -= 9.4
            c.drawString(x + pad, cy, ln)
        cy -= 10.6
    c.setFillColorRGB(*MUT)
    c.setFont("DJ", 7.4)
    cy -= 4
    for ln in wrap(d["langs_note"], "DJ", 7.4, inner):
        c.drawString(x + pad, cy, ln)
        cy -= 10.4
    y = y - h - 10

    # Формат работы
    items = d["work"]
    hh = [len(wrap(i, "DJ", 7.9, inner - 9)) * 10.6 for i in items]
    h = pad * 2 + 24 + sum(hh) + 3 * len(items)
    c.setFillColorRGB(*CARD)
    c.roundRect(x, y - h, w, h, 16, stroke=0, fill=1)
    section_title(c, x + pad, y - pad - 10, d["s_work"])
    cy = y - pad - 28
    for it, ih in zip(items, hh):
        c.setFillColorRGB(*INK)
        c.circle(x + pad + 2, cy + 2.8, 1.5, stroke=0, fill=1)
        c.setFillColorRGB(0.25, 0.25, 0.25)
        c.setFont("DJ", 7.9)
        for ln in wrap(it, "DJ", 7.9, inner - 9):
            c.drawString(x + pad + 9, cy, ln)
            cy -= 10.6
        cy -= 3
    y = y - h - 10

    # Инструменты
    ch = chips_height(d["tools"], inner, 6.8, 13)
    h = pad * 2 + 24 + ch
    c.setFillColorRGB(*CARD)
    c.roundRect(x, y - h, w, h, 16, stroke=0, fill=1)
    section_title(c, x + pad, y - pad - 10, d["s_tools"])
    chips(c, x + pad, y - pad - 24, inner, d["tools"], 6.8, 13)
    return y - h - 10


def footer(c, d):
    c.setFillColorRGB(*LIME)
    c.roundRect(M, M, W - 2 * M, 26, 13, stroke=0, fill=1)
    txt(c, M + 14, M + 9.4, d["footer"], "DJ", 6.8, (0.09, 0.11, 0.04))


def build(path, d):
    c = canvas.Canvas(path, pagesize=A4)
    c.setTitle(d["name"] + " – " + d["s_title_file"])
    c.setAuthor("LEDNIQUE")
    c.setFillColorRGB(*BG)
    c.rect(0, 0, W, H, stroke=0, fill=1)
    y = header(c, d)
    yl = left_col(c, y, d)
    yr = right_col(c, y, d)
    print("  left bottom %.1f / right bottom %.1f (страница: %.1f)" % (yl, yr, M))
    footer(c, d)
    c.showPage()
    c.save()


RU = {
    "name": "Виктор",
    "role": "Мультидизайнер: графика, AR-эффекты и AI-продакшн",
    "meta": "26 лет · Ижевск, Россия · гибрид в Ижевске или удалённо",
    "site": "lednique.ru",
    "s_title_file": "Резюме",
    "s_about": "О себе",
    "about": [
        "Дизайнер полного цикла: 12 лет в графике и 7 лет в AR / XR. Веду проект от идеи до готового файла – айдентика, карточки товара и инфографика для маркетплейсов, сайты, AR-эффекты (Try-on, Digital MUA, phygital, target-tracking) и AI-съёмка товаров и моделей.",
        "Проверяю, как макет печатается, как карточка читается в реальной выдаче на телефоне и как эффект ведёт себя на живой камере. Больше 20 брендов и компаний – от локальных магазинов до международных.",
    ],
    "s_exp": "Опыт",
    "exp": [
        {"years": "2014 – 2026", "title": "Графический дизайн, LEDNIQUE",
         "text": "Айдентика и фирменный стиль, полиграфия и препресс, карточки товара и инфографика для маркетплейсов, сайты, презентации, соцсети. Проектная работа с брендами, в том числе по NDA."},
        {"years": "2019 – 2026", "title": "AR-эффекты и XR",
         "text": "Face и body tracking, virtual try-on, digital make-up, target-tracking, 3D-маски и AR-игры. Сборка в Lens Studio, Effect House и Spark AR. Работы для Glamnetic, OSCAR&FRANK, SLA Paris, H&M Beauty, Atomic Heart, NewJeans."},
        {"years": "2023 – 2026", "title": "AI-продакшн фото и видео",
         "text": "Нейрофотосессии товаров и AI-моделей, AI-видео, UGC-контент, прототипирование креативов. Контроль материала: мех и ворс, стекло и прозрачный пластик, текстиль, свет и отражения."},
        {"years": "постоянно", "title": "3D-моделирование и motion",
         "text": "Модели и текстуры в Blender, low-poly адаптация, rigging, анимация под музыку, промо-ролики продуктов."},
    ],
    "s_skills": "Навыки",
    "skills": ["Айдентика", "Логотипы", "Полиграфия", "Препресс", "Карточки товара", "Инфографика",
               "UI/UX", "Сайты", "Презентации", "Соцсети", "3D-моделирование", "Motion",
               "AR-эффекты", "Virtual Try-On", "Digital MUA", "AI-съёмка", "AI-видео"],
    "s_contacts": "Контакты",
    "contacts": [("Почта", "lednique1@ya.ru"), ("Telegram", "t.me/lednique"),
                 ("Портфолио", "lednique.ru"), ("Behance", "behance.net/lednique"),
                 ("Kwork", "kwork.ru/user/lednique")],
    "s_langs": "Языки",
    "langs": [("Русский", "родной"), ("Английский", "хорошо общаюсь и понимаю в большинстве ситуаций")],
    "langs_note": "Читаю документацию и брифы на английском, веду переписку и созвон. Есть опыт работы с иностранными заказчиками.",
    "s_work": "Формат работы",
    "work": ["Ижевск, Россия · UTC+4", "Гибрид в Ижевске или удалённо",
             "Фриланс, проектная работа, часть занятости", "Готов начать с короткого тестового"],
    "s_tools": "Инструменты",
    "tools": ["Figma", "Photoshop", "Illustrator", "InDesign", "Blender", "Lens Studio", "Effect House",
              "Spark AR", "After Effects", "Premiere Pro", "Midjourney", "Nano Banana", "ChatGPT", "Claude"],
    "footer": "LEDNIQUE · Виктор · lednique1@ya.ru · t.me/lednique · lednique.ru",
}

EN = {
    "name": "Viktor",
    "role": "Multidisciplinary designer: graphics, AR effects and AI production",
    "meta": "26 years old · Izhevsk, Russia · hybrid in Izhevsk or remote",
    "site": "lednique.ru",
    "s_title_file": "CV",
    "s_about": "Profile",
    "about": [
        "Full-cycle designer: 12 years in graphics and 7 years in AR / XR. I take a project from idea to final file – identity, product cards and marketplace infographics, websites, AR effects (try-on, digital MUA, phygital, target tracking) and AI shoots of products and models.",
        "I check how a layout prints, how a product card reads in real search results on a phone and how an effect behaves on a live camera. More than 20 brands and companies – from local shops to international ones.",
    ],
    "s_exp": "Experience",
    "exp": [
        {"years": "2014 – 2026", "title": "Graphic design, LEDNIQUE",
         "text": "Identity and brand style, print and prepress, product cards and marketplace infographics, websites, presentations, social media. Project work with brands, including under NDA."},
        {"years": "2019 – 2026", "title": "AR effects and XR",
         "text": "Face and body tracking, virtual try-on, digital make-up, target tracking, 3D masks and AR games. Built in Lens Studio, Effect House and Spark AR. Work for Glamnetic, OSCAR&FRANK, SLA Paris, H&M Beauty, Atomic Heart, NewJeans."},
        {"years": "2023 – 2026", "title": "AI photo and video production",
         "text": "AI photoshoots of products and AI models, AI video, UGC content, creative prototyping. Material control: fur and pile, glass and clear plastic, textiles, light and reflections."},
        {"years": "ongoing", "title": "3D modelling and motion",
         "text": "Models and textures in Blender, low-poly adaptation, rigging, animation to music, product promo videos."},
    ],
    "s_skills": "Skills",
    "skills": ["Identity", "Logos", "Print", "Prepress", "Product cards", "Infographics",
               "UI/UX", "Websites", "Presentations", "Social media", "3D modelling", "Motion",
               "AR effects", "Virtual Try-On", "Digital MUA", "AI photo", "AI video"],
    "s_contacts": "Contacts",
    "contacts": [("Email", "lednique1@ya.ru"), ("Telegram", "t.me/lednique"),
                 ("Portfolio", "lednique.ru"), ("Behance", "behance.net/lednique"),
                 ("Kwork", "kwork.ru/user/lednique")],
    "s_langs": "Languages",
    "langs": [("Russian", "native"), ("English", "good communication, understand most situations")],
    "langs_note": "I read documentation and briefs in English and handle correspondence and calls. I have experience working with foreign clients.",
    "s_work": "Work format",
    "work": ["Izhevsk, Russia · UTC+4", "Hybrid in Izhevsk or remote",
             "Freelance, project work, part-time", "Ready to start with a short test task"],
    "s_tools": "Tools",
    "tools": ["Figma", "Photoshop", "Illustrator", "InDesign", "Blender", "Lens Studio", "Effect House",
              "Spark AR", "After Effects", "Premiere Pro", "Midjourney", "Nano Banana", "ChatGPT", "Claude"],
    "footer": "LEDNIQUE · Viktor · lednique1@ya.ru · t.me/lednique · lednique.ru",
}

if __name__ == "__main__":
    build(os.path.join(ROOT, "assets", "resume.pdf"), RU)
    build(os.path.join(ROOT, "assets", "resume-en.pdf"), EN)
    print("ok")
