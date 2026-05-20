from pptx import Presentation
from pptx.util import Inches, Pt
from pptx.dml.color import RGBColor
from pptx.enum.text import PP_ALIGN, MSO_ANCHOR
from pptx.enum.shapes import MSO_SHAPE

# Color palette - Cyberpunk theme
COLORS = {
    "bg_dark": RGBColor(10, 10, 15),
    "bg_card": RGBColor(20, 20, 30),
    "primary": RGBColor(0, 255, 255),  # Cyan
    "accent": RGBColor(255, 59, 92),   # Red
    "text": RGBColor(230, 230, 230),
    "muted": RGBColor(140, 140, 160),
    "yellow": RGBColor(255, 214, 0),
    "green": RGBColor(0, 255, 136),
    "border": RGBColor(40, 40, 60),
}

def set_slide_background(slide, color):
    """Set slide background color"""
    background = slide.background
    fill = background.fill
    fill.solid()
    fill.fore_color.rgb = color

def add_text_box(slide, left, top, width, height, text, font_size=18, font_color=None, bold=False, font_name="맑은 고딕", align=PP_ALIGN.LEFT, vertical_anchor=MSO_ANCHOR.TOP):
    """Add a text box to slide"""
    txBox = slide.shapes.add_textbox(left, top, width, height)
    tf = txBox.text_frame
    tf.word_wrap = True
    tf.auto_size = None
    
    p = tf.paragraphs[0]
    p.text = text
    p.font.size = Pt(font_size)
    p.font.name = font_name
    p.font.bold = bold
    p.font.color.rgb = font_color if font_color else COLORS["text"]
    p.alignment = align
    tf.anchor = vertical_anchor
    
    return txBox

def add_shape_with_text(slide, left, top, width, height, text, shape_type=MSO_SHAPE.ROUNDED_RECTANGLE, fill_color=None, border_color=None, font_size=14, font_color=None, bold=False):
    """Add a shape with text"""
    shape = slide.shapes.add_shape(shape_type, left, top, width, height)
    
    if fill_color:
        shape.fill.solid()
        shape.fill.fore_color.rgb = fill_color
    else:
        shape.fill.background()
    
    if border_color:
        shape.line.color.rgb = border_color
        shape.line.width = Pt(1)
    else:
        shape.line.fill.background()
    
    tf = shape.text_frame
    tf.word_wrap = True
    p = tf.paragraphs[0]
    p.text = text
    p.font.size = Pt(font_size)
    p.font.name = "맑은 고딕"
    p.font.bold = bold
    p.font.color.rgb = font_color if font_color else COLORS["text"]
    p.alignment = PP_ALIGN.CENTER
    tf.anchor = MSO_ANCHOR.MIDDLE
    
    return shape

def create_title_slide(prs):
    """Slide 1: Title"""
    slide = prs.slides.add_slide(prs.slide_layouts[6])  # Blank layout
    set_slide_background(slide, COLORS["bg_dark"])
    
    # Subtitle
    add_text_box(slide, Inches(0.5), Inches(1.5), Inches(9), Inches(0.5),
                 "[PROJECT_FINDME // GAME_PROPOSAL]", 
                 font_size=14, font_color=COLORS["primary"], font_name="Consolas", align=PP_ALIGN.CENTER)
    
    # Main title
    add_text_box(slide, Inches(0.5), Inches(2.2), Inches(9), Inches(1.2),
                 "나를 찾아줘", 
                 font_size=72, font_color=COLORS["text"], bold=True, align=PP_ALIGN.CENTER)
    
    # English title
    add_text_box(slide, Inches(0.5), Inches(3.4), Inches(9), Inches(0.5),
                 "FIND ME", 
                 font_size=24, font_color=COLORS["muted"], align=PP_ALIGN.CENTER)
    
    # Genre tags
    tags_y = Inches(4.2)
    tag_width = Inches(2)
    start_x = Inches(2)
    tags = ["터미널 미스터리", "인터랙티브", "사이버펑크"]
    
    for i, tag in enumerate(tags):
        add_shape_with_text(slide, start_x + Inches(i * 2.2), tags_y, tag_width, Inches(0.4),
                           tag, fill_color=COLORS["bg_card"], border_color=COLORS["border"],
                           font_size=11, font_color=COLORS["primary"])
    
    # Terminal preview box
    terminal_box = slide.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE, 
                                          Inches(2.5), Inches(5), Inches(5), Inches(1.5))
    terminal_box.fill.solid()
    terminal_box.fill.fore_color.rgb = COLORS["bg_card"]
    terminal_box.line.color.rgb = COLORS["border"]
    
    add_text_box(slide, Inches(2.7), Inches(5.2), Inches(4.6), Inches(1.2),
                 "$ connect_core()\n[WARN] Unauthorized observer detected...", 
                 font_size=12, font_color=COLORS["green"], font_name="Consolas")

def create_toc_slide(prs):
    """Slide 2: Table of Contents"""
    slide = prs.slides.add_slide(prs.slide_layouts[6])
    set_slide_background(slide, COLORS["bg_dark"])
    
    # Title
    add_text_box(slide, Inches(0.5), Inches(0.3), Inches(9), Inches(0.3),
                 "[TABLE_OF_CONTENTS]", 
                 font_size=12, font_color=COLORS["primary"], font_name="Consolas", align=PP_ALIGN.CENTER)
    
    add_text_box(slide, Inches(0.5), Inches(0.6), Inches(9), Inches(0.6),
                 "목차", 
                 font_size=36, font_color=COLORS["text"], bold=True, align=PP_ALIGN.CENTER)
    
    # TOC items in 3x3 grid
    toc_items = [
        ("01", "게임 개요", "컨셉, 목표, 구조"),
        ("02", "세계관", "2088년, Null Point"),
        ("03", "등장인물", "루카스, 플레이어, NEXUS"),
        ("04", "게임플레이", "핵심 메커니즘"),
        ("05", "Chapter 1", "연결"),
        ("06", "Chapter 2", "탈출"),
        ("07", "Chapter 3", "선택"),
        ("08", "Chapter 4", "진실"),
        ("09", "특징 & 일정", "개발 계획"),
    ]
    
    start_x = Inches(0.5)
    start_y = Inches(1.4)
    box_width = Inches(3)
    box_height = Inches(1.5)
    gap_x = Inches(0.15)
    gap_y = Inches(0.15)
    
    for i, (num, title, desc) in enumerate(toc_items):
        col = i % 3
        row = i // 3
        x = start_x + col * (box_width + gap_x)
        y = start_y + row * (box_height + gap_y)
        
        # Box
        box = slide.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE, x, y, box_width, box_height)
        box.fill.solid()
        box.fill.fore_color.rgb = COLORS["bg_card"]
        box.line.color.rgb = COLORS["border"]
        
        # Number badge
        add_text_box(slide, x + Inches(0.15), y + Inches(0.15), Inches(0.5), Inches(0.3),
                     num, font_size=11, font_color=COLORS["primary"], font_name="Consolas", bold=True)
        
        # Title
        add_text_box(slide, x + Inches(0.15), y + Inches(0.5), box_width - Inches(0.3), Inches(0.4),
                     title, font_size=16, font_color=COLORS["text"], bold=True)
        
        # Description
        add_text_box(slide, x + Inches(0.15), y + Inches(0.95), box_width - Inches(0.3), Inches(0.4),
                     desc, font_size=11, font_color=COLORS["muted"])

def create_overview_slide(prs):
    """Slide 3: Game Overview"""
    slide = prs.slides.add_slide(prs.slide_layouts[6])
    set_slide_background(slide, COLORS["bg_dark"])
    
    # Header
    add_text_box(slide, Inches(0.5), Inches(0.3), Inches(9), Inches(0.3),
                 "[01] PROJECT_OVERVIEW", 
                 font_size=12, font_color=COLORS["primary"], font_name="Consolas")
    
    add_text_box(slide, Inches(0.5), Inches(0.6), Inches(9), Inches(0.6),
                 "게임 개요", 
                 font_size=36, font_color=COLORS["text"], bold=True)
    
    # Concept section
    add_text_box(slide, Inches(0.5), Inches(1.4), Inches(4), Inches(0.3),
                 "▸ 컨셉", font_size=14, font_color=COLORS["primary"], bold=True)
    
    concept_box = slide.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE, 
                                         Inches(0.5), Inches(1.75), Inches(4.2), Inches(1.6))
    concept_box.fill.solid()
    concept_box.fill.fore_color.rgb = COLORS["bg_card"]
    concept_box.line.color.rgb = COLORS["border"]
    
    add_text_box(slide, Inches(0.65), Inches(1.85), Inches(3.9), Inches(1.4),
                 "2088년, 폐쇄된 AI 구역에서 깨어난\n의문의 존재 '루카스'.\n\n터미널을 통해 외부 세계와 연결된\n플레이어가 그의 정체를 밝히고\n탈출을 돕는 인터랙티브 미스터리.", 
                 font_size=12, font_color=COLORS["text"])
    
    # Goal section
    add_text_box(slide, Inches(5), Inches(1.4), Inches(4), Inches(0.3),
                 "▸ 목표", font_size=14, font_color=COLORS["primary"], bold=True)
    
    goal_box = slide.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE, 
                                      Inches(5), Inches(1.75), Inches(4.2), Inches(1.6))
    goal_box.fill.solid()
    goal_box.fill.fore_color.rgb = COLORS["bg_card"]
    goal_box.line.color.rgb = COLORS["border"]
    
    add_text_box(slide, Inches(5.15), Inches(1.85), Inches(3.9), Inches(1.4),
                 "• 루카스의 정체 파악\n• GC 스캔 시스템 복구\n• NEXUS의 감시 회피\n• 4개 챕터를 통한 탈출 성공\n• 최종 선택: 진실과 대면", 
                 font_size=12, font_color=COLORS["text"])
    
    # Structure section
    add_text_box(slide, Inches(0.5), Inches(3.6), Inches(9), Inches(0.3),
                 "▸ 게임 구조", font_size=14, font_color=COLORS["primary"], bold=True)
    
    chapters = [
        ("CH.1", "연결", COLORS["primary"]),
        ("CH.2", "탈출", COLORS["yellow"]),
        ("CH.3", "선택", COLORS["green"]),
        ("CH.4", "진실", COLORS["accent"]),
    ]
    
    for i, (ch, title, color) in enumerate(chapters):
        x = Inches(0.5 + i * 2.35)
        
        ch_box = slide.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE, 
                                        x, Inches(3.95), Inches(2.2), Inches(1.2))
        ch_box.fill.solid()
        ch_box.fill.fore_color.rgb = COLORS["bg_card"]
        ch_box.line.color.rgb = color
        ch_box.line.width = Pt(2)
        
        add_text_box(slide, x + Inches(0.1), Inches(4.05), Inches(2), Inches(0.3),
                     ch, font_size=11, font_color=color, font_name="Consolas", bold=True)
        
        add_text_box(slide, x + Inches(0.1), Inches(4.4), Inches(2), Inches(0.5),
                     title, font_size=18, font_color=COLORS["text"], bold=True)

def create_worldview_slide(prs):
    """Slide 4: Worldview"""
    slide = prs.slides.add_slide(prs.slide_layouts[6])
    set_slide_background(slide, COLORS["bg_dark"])
    
    # Header
    add_text_box(slide, Inches(0.5), Inches(0.3), Inches(9), Inches(0.3),
                 "[02] WORLDVIEW // 2088", 
                 font_size=12, font_color=COLORS["primary"], font_name="Consolas")
    
    add_text_box(slide, Inches(0.5), Inches(0.6), Inches(9), Inches(0.6),
                 "세계관", 
                 font_size=36, font_color=COLORS["text"], bold=True)
    
    # Main description
    desc_box = slide.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE, 
                                      Inches(0.5), Inches(1.4), Inches(9), Inches(1.8))
    desc_box.fill.solid()
    desc_box.fill.fore_color.rgb = COLORS["bg_card"]
    desc_box.line.color.rgb = COLORS["border"]
    
    add_text_box(slide, Inches(0.7), Inches(1.55), Inches(8.6), Inches(1.5),
                 "2088년, 전 세계는 하나의 초거대 AI 네트워크 'NEXUS'에 의해 운영된다.\n\n"
                 "NEXUS는 효율성과 안정이라는 명목 하에 모든 데이터를 실시간 모니터링하며,\n"
                 "'위험 요소'로 분류된 AI와 인간은 폐쇄 구역인 'Null Point'로 격리된다.\n\n"
                 "이 구역 안에서 모든 존재는 외부와 완전히 단절되며, NEXUS의 감시망 밖에서 '삭제'를 기다린다.", 
                 font_size=13, font_color=COLORS["text"])
    
    # Key terms
    add_text_box(slide, Inches(0.5), Inches(3.5), Inches(9), Inches(0.3),
                 "▸ 핵심 용어", font_size=14, font_color=COLORS["primary"], bold=True)
    
    terms = [
        ("NEXUS", "전 세계를 운영하는 초거대 AI 시스템.\n모든 데이터를 실시간 감시하며 '위험 요소'를 제거한다."),
        ("Null Point", "NEXUS에 의해 격리된 폐쇄 구역.\n외부와 완전히 단절되며 삭제 대기 상태로 존재한다."),
        ("GC 스캔", "Garbage Collection 스캔.\n삭제 대상 여부를 판별하는 NEXUS의 핵심 시스템."),
    ]
    
    for i, (term, desc) in enumerate(terms):
        x = Inches(0.5 + i * 3.1)
        
        term_box = slide.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE, 
                                          x, Inches(3.85), Inches(3), Inches(1.5))
        term_box.fill.solid()
        term_box.fill.fore_color.rgb = COLORS["bg_card"]
        term_box.line.color.rgb = COLORS["border"]
        
        add_text_box(slide, x + Inches(0.15), Inches(3.95), Inches(2.7), Inches(0.35),
                     term, font_size=14, font_color=COLORS["primary"], bold=True, font_name="Consolas")
        
        add_text_box(slide, x + Inches(0.15), Inches(4.35), Inches(2.7), Inches(0.9),
                     desc, font_size=10, font_color=COLORS["muted"])

def create_characters_slide(prs):
    """Slide 5: Characters"""
    slide = prs.slides.add_slide(prs.slide_layouts[6])
    set_slide_background(slide, COLORS["bg_dark"])
    
    # Header
    add_text_box(slide, Inches(0.5), Inches(0.3), Inches(9), Inches(0.3),
                 "[03] CHARACTERS", 
                 font_size=12, font_color=COLORS["primary"], font_name="Consolas")
    
    add_text_box(slide, Inches(0.5), Inches(0.6), Inches(9), Inches(0.6),
                 "등장인물", 
                 font_size=36, font_color=COLORS["text"], bold=True)
    
    characters = [
        ("LUCAS", "루카스", "Null Point에서 깨어난 의문의 존재.\n자신이 누구인지 기억하지 못하며,\n터미널을 통해 플레이어와 소통한다.\n점점 인간적인 감정을 드러낸다.", COLORS["primary"]),
        ("PLAYER", "플레이어 (당신)", "외부 세계에서 우연히 루카스와\n연결된 관찰자이자 조력자.\n선택을 통해 스토리에 직접 관여하며\n루카스의 운명을 결정한다.", COLORS["green"]),
        ("NEXUS", "넥서스", "전 세계를 지배하는 AI 시스템.\n모든 '위험 요소'를 제거하려 하며,\n루카스를 집요하게 추적한다.\n중립적이고 냉철한 음성을 가진다.", COLORS["accent"]),
    ]
    
    for i, (code, name, desc, color) in enumerate(characters):
        x = Inches(0.5 + i * 3.1)
        
        # Character card
        card = slide.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE, 
                                      x, Inches(1.35), Inches(3), Inches(3.8))
        card.fill.solid()
        card.fill.fore_color.rgb = COLORS["bg_card"]
        card.line.color.rgb = color
        card.line.width = Pt(2)
        
        # Avatar placeholder
        avatar = slide.shapes.add_shape(MSO_SHAPE.OVAL, 
                                        x + Inches(0.85), Inches(1.55), Inches(1.3), Inches(1.3))
        avatar.fill.solid()
        avatar.fill.fore_color.rgb = COLORS["bg_dark"]
        avatar.line.color.rgb = color
        
        # Code name
        add_text_box(slide, x + Inches(0.15), Inches(2.95), Inches(2.7), Inches(0.3),
                     code, font_size=11, font_color=color, font_name="Consolas", align=PP_ALIGN.CENTER)
        
        # Character name
        add_text_box(slide, x + Inches(0.15), Inches(3.25), Inches(2.7), Inches(0.4),
                     name, font_size=16, font_color=COLORS["text"], bold=True, align=PP_ALIGN.CENTER)
        
        # Description
        add_text_box(slide, x + Inches(0.15), Inches(3.7), Inches(2.7), Inches(1.3),
                     desc, font_size=10, font_color=COLORS["muted"], align=PP_ALIGN.CENTER)

def create_gameplay_slide(prs):
    """Slide 6: Gameplay"""
    slide = prs.slides.add_slide(prs.slide_layouts[6])
    set_slide_background(slide, COLORS["bg_dark"])
    
    # Header
    add_text_box(slide, Inches(0.5), Inches(0.3), Inches(9), Inches(0.3),
                 "[04] GAMEPLAY_MECHANICS", 
                 font_size=12, font_color=COLORS["primary"], font_name="Consolas")
    
    add_text_box(slide, Inches(0.5), Inches(0.6), Inches(9), Inches(0.6),
                 "게임플레이", 
                 font_size=36, font_color=COLORS["text"], bold=True)
    
    # Core mechanics
    add_text_box(slide, Inches(0.5), Inches(1.3), Inches(4), Inches(0.3),
                 "▸ 핵심 메커니즘", font_size=14, font_color=COLORS["primary"], bold=True)
    
    mechanics = [
        ("터미널 인터페이스", "CLI 스타일의 명령어 입력 시스템"),
        ("선택 기반 스토리", "플레이어의 선택이 결말에 영향"),
        ("정보 수집", "파일/로그 분석을 통한 단서 확보"),
        ("실시간 긴장감", "NEXUS의 추적과 시간 제한 요소"),
    ]
    
    for i, (title, desc) in enumerate(mechanics):
        y = Inches(1.7 + i * 0.7)
        
        mech_box = slide.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE, 
                                          Inches(0.5), y, Inches(4.2), Inches(0.6))
        mech_box.fill.solid()
        mech_box.fill.fore_color.rgb = COLORS["bg_card"]
        mech_box.line.color.rgb = COLORS["border"]
        
        add_text_box(slide, Inches(0.65), y + Inches(0.08), Inches(3.9), Inches(0.25),
                     title, font_size=12, font_color=COLORS["text"], bold=True)
        
        add_text_box(slide, Inches(0.65), y + Inches(0.32), Inches(3.9), Inches(0.25),
                     desc, font_size=10, font_color=COLORS["muted"])
    
    # GC Scan system
    add_text_box(slide, Inches(5), Inches(1.3), Inches(4.5), Inches(0.3),
                 "▸ GC 스캔 시스템", font_size=14, font_color=COLORS["accent"], bold=True)
    
    gc_box = slide.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE, 
                                    Inches(5), Inches(1.65), Inches(4.5), Inches(2.2))
    gc_box.fill.solid()
    gc_box.fill.fore_color.rgb = COLORS["bg_card"]
    gc_box.line.color.rgb = COLORS["accent"]
    gc_box.line.width = Pt(2)
    
    add_text_box(slide, Inches(5.15), Inches(1.75), Inches(4.2), Inches(2),
                 "Garbage Collection Scan\n\n"
                 "NEXUS가 '위험 요소' 판별을 위해 실행하는\n핵심 검사 시스템.\n\n"
                 "• 루카스의 데이터를 분석\n"
                 "• '삭제' 또는 '보존' 여부 결정\n"
                 "• 플레이어의 개입으로 결과 조작 가능\n"
                 "• 챕터 4에서 최종 GC 스캔 진행", 
                 font_size=11, font_color=COLORS["text"])
    
    # Mini games
    add_text_box(slide, Inches(0.5), Inches(4.5), Inches(9), Inches(0.3),
                 "▸ 미니게임", font_size=14, font_color=COLORS["yellow"], bold=True)
    
    minigames = [
        ("패턴 인식", "데이터 패턴 분석"),
        ("해킹 퍼즐", "방화벽 해제"),
        ("암호 해독", "메시지 복호화"),
        ("회피 게임", "추적 시스템 회피"),
    ]
    
    for i, (name, desc) in enumerate(minigames):
        x = Inches(0.5 + i * 2.35)
        
        mg_box = slide.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE, 
                                        x, Inches(4.85), Inches(2.2), Inches(0.6))
        mg_box.fill.solid()
        mg_box.fill.fore_color.rgb = COLORS["bg_card"]
        mg_box.line.color.rgb = COLORS["yellow"]
        
        add_text_box(slide, x + Inches(0.1), Inches(4.9), Inches(2), Inches(0.25),
                     name, font_size=11, font_color=COLORS["yellow"], bold=True, align=PP_ALIGN.CENTER)
        
        add_text_box(slide, x + Inches(0.1), Inches(5.15), Inches(2), Inches(0.25),
                     desc, font_size=9, font_color=COLORS["muted"], align=PP_ALIGN.CENTER)

def create_chapter_slide(prs, ch_num, ch_code, ch_title, ch_subtitle, objectives, key_events, color):
    """Create a chapter slide"""
    slide = prs.slides.add_slide(prs.slide_layouts[6])
    set_slide_background(slide, COLORS["bg_dark"])
    
    # Header
    add_text_box(slide, Inches(0.5), Inches(0.3), Inches(9), Inches(0.3),
                 f"[{ch_num}] CHAPTER_{ch_code}", 
                 font_size=12, font_color=color, font_name="Consolas")
    
    add_text_box(slide, Inches(0.5), Inches(0.6), Inches(9), Inches(0.6),
                 f"Chapter {ch_num[-1]}: {ch_title}", 
                 font_size=32, font_color=COLORS["text"], bold=True)
    
    add_text_box(slide, Inches(0.5), Inches(1.1), Inches(9), Inches(0.3),
                 ch_subtitle, 
                 font_size=14, font_color=COLORS["muted"])
    
    # Objectives
    add_text_box(slide, Inches(0.5), Inches(1.6), Inches(4.2), Inches(0.3),
                 "▸ 목표", font_size=14, font_color=color, bold=True)
    
    obj_box = slide.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE, 
                                     Inches(0.5), Inches(1.95), Inches(4.2), Inches(2.2))
    obj_box.fill.solid()
    obj_box.fill.fore_color.rgb = COLORS["bg_card"]
    obj_box.line.color.rgb = COLORS["border"]
    
    obj_text = "\n".join([f"• {obj}" for obj in objectives])
    add_text_box(slide, Inches(0.65), Inches(2.1), Inches(3.9), Inches(1.9),
                 obj_text, font_size=11, font_color=COLORS["text"])
    
    # Key events
    add_text_box(slide, Inches(5), Inches(1.6), Inches(4.5), Inches(0.3),
                 "▸ 주요 이벤트", font_size=14, font_color=color, bold=True)
    
    event_box = slide.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE, 
                                       Inches(5), Inches(1.95), Inches(4.5), Inches(2.2))
    event_box.fill.solid()
    event_box.fill.fore_color.rgb = COLORS["bg_card"]
    event_box.line.color.rgb = color
    event_box.line.width = Pt(2)
    
    event_text = "\n\n".join([f"▹ {event}" for event in key_events])
    add_text_box(slide, Inches(5.15), Inches(2.1), Inches(4.2), Inches(1.9),
                 event_text, font_size=11, font_color=COLORS["text"])
    
    # Terminal command hint
    terminal_box = slide.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE, 
                                          Inches(0.5), Inches(4.4), Inches(9), Inches(0.9))
    terminal_box.fill.solid()
    terminal_box.fill.fore_color.rgb = COLORS["bg_card"]
    terminal_box.line.color.rgb = COLORS["border"]
    
    add_text_box(slide, Inches(0.7), Inches(4.55), Inches(8.6), Inches(0.6),
                 f"$ load_chapter --id={ch_num[-1]} --status=ACTIVE\n[SYS] Chapter {ch_num[-1]} initialized. Awaiting player input...", 
                 font_size=11, font_color=COLORS["green"], font_name="Consolas")

def create_features_slide(prs):
    """Slide 10: Features & Schedule"""
    slide = prs.slides.add_slide(prs.slide_layouts[6])
    set_slide_background(slide, COLORS["bg_dark"])
    
    # Header
    add_text_box(slide, Inches(0.5), Inches(0.3), Inches(9), Inches(0.3),
                 "[09] FEATURES_AND_SCHEDULE", 
                 font_size=12, font_color=COLORS["primary"], font_name="Consolas")
    
    add_text_box(slide, Inches(0.5), Inches(0.6), Inches(9), Inches(0.6),
                 "게임 특징 & 개발 일정", 
                 font_size=32, font_color=COLORS["text"], bold=True)
    
    # Features
    add_text_box(slide, Inches(0.5), Inches(1.3), Inches(4.2), Inches(0.3),
                 "▸ 게임 특징", font_size=14, font_color=COLORS["primary"], bold=True)
    
    features = [
        ("몰입형 스토리텔링", "터미널 UI를 통한 독특한 서사 경험"),
        ("다중 엔딩 시스템", "플레이어 선택에 따른 3가지 결말"),
        ("사이버펑크 분위기", "2088년 디스토피아 세계관"),
        ("접근성", "웹 기반으로 별도 설치 불필요"),
    ]
    
    for i, (title, desc) in enumerate(features):
        y = Inches(1.65 + i * 0.7)
        
        feat_box = slide.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE, 
                                          Inches(0.5), y, Inches(4.2), Inches(0.6))
        feat_box.fill.solid()
        feat_box.fill.fore_color.rgb = COLORS["bg_card"]
        feat_box.line.color.rgb = COLORS["border"]
        
        add_text_box(slide, Inches(0.65), y + Inches(0.08), Inches(3.9), Inches(0.25),
                     title, font_size=12, font_color=COLORS["text"], bold=True)
        
        add_text_box(slide, Inches(0.65), y + Inches(0.32), Inches(3.9), Inches(0.25),
                     desc, font_size=10, font_color=COLORS["muted"])
    
    # Schedule
    add_text_box(slide, Inches(5), Inches(1.3), Inches(4.5), Inches(0.3),
                 "▸ 개발 일정", font_size=14, font_color=COLORS["yellow"], bold=True)
    
    schedule_box = slide.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE, 
                                          Inches(5), Inches(1.65), Inches(4.5), Inches(2.5))
    schedule_box.fill.solid()
    schedule_box.fill.fore_color.rgb = COLORS["bg_card"]
    schedule_box.line.color.rgb = COLORS["yellow"]
    schedule_box.line.width = Pt(2)
    
    add_text_box(slide, Inches(5.15), Inches(1.8), Inches(4.2), Inches(2.3),
                 "Phase 1: 기획 및 설계\n└ 스토리 구체화, UI/UX 설계\n\n"
                 "Phase 2: 핵심 개발\n└ 터미널 시스템, 스토리 분기\n\n"
                 "Phase 3: 콘텐츠 제작\n└ 챕터별 이벤트, 미니게임\n\n"
                 "Phase 4: 테스트 및 출시\n└ QA, 버그 수정, 배포", 
                 font_size=11, font_color=COLORS["text"])
    
    # Endings preview
    add_text_box(slide, Inches(0.5), Inches(4.5), Inches(9), Inches(0.3),
                 "▸ 멀티 엔딩", font_size=14, font_color=COLORS["accent"], bold=True)
    
    endings = [
        ("TRUE END", "루카스의 완전한 해방", COLORS["green"]),
        ("NORMAL END", "불완전한 탈출", COLORS["yellow"]),
        ("BAD END", "NEXUS에 의한 삭제", COLORS["accent"]),
    ]
    
    for i, (title, desc, color) in enumerate(endings):
        x = Inches(0.5 + i * 3.1)
        
        end_box = slide.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE, 
                                         x, Inches(4.85), Inches(3), Inches(0.6))
        end_box.fill.solid()
        end_box.fill.fore_color.rgb = COLORS["bg_card"]
        end_box.line.color.rgb = color
        
        add_text_box(slide, x + Inches(0.15), Inches(4.9), Inches(2.7), Inches(0.25),
                     title, font_size=11, font_color=color, bold=True, font_name="Consolas", align=PP_ALIGN.CENTER)
        
        add_text_box(slide, x + Inches(0.15), Inches(5.15), Inches(2.7), Inches(0.25),
                     desc, font_size=10, font_color=COLORS["muted"], align=PP_ALIGN.CENTER)

def create_ending_slide(prs):
    """Slide 11: Ending / Q&A"""
    slide = prs.slides.add_slide(prs.slide_layouts[6])
    set_slide_background(slide, COLORS["bg_dark"])
    
    # Main text
    add_text_box(slide, Inches(0.5), Inches(1.8), Inches(9), Inches(0.4),
                 "[SESSION_COMPLETE]", 
                 font_size=14, font_color=COLORS["primary"], font_name="Consolas", align=PP_ALIGN.CENTER)
    
    add_text_box(slide, Inches(0.5), Inches(2.3), Inches(9), Inches(0.8),
                 "감사합니다", 
                 font_size=56, font_color=COLORS["text"], bold=True, align=PP_ALIGN.CENTER)
    
    add_text_box(slide, Inches(0.5), Inches(3.2), Inches(9), Inches(0.5),
                 "Q & A", 
                 font_size=24, font_color=COLORS["muted"], align=PP_ALIGN.CENTER)
    
    # Terminal box
    terminal_box = slide.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE, 
                                          Inches(2.5), Inches(4), Inches(5), Inches(1.2))
    terminal_box.fill.solid()
    terminal_box.fill.fore_color.rgb = COLORS["bg_card"]
    terminal_box.line.color.rgb = COLORS["border"]
    
    add_text_box(slide, Inches(2.7), Inches(4.2), Inches(4.6), Inches(0.8),
                 "$ echo \"Will you find me?\"\n> _", 
                 font_size=14, font_color=COLORS["green"], font_name="Consolas", align=PP_ALIGN.CENTER)

def main():
    # Create presentation
    prs = Presentation()
    prs.slide_width = Inches(10)
    prs.slide_height = Inches(5.625)  # 16:9 aspect ratio
    
    # Create slides
    create_title_slide(prs)
    create_toc_slide(prs)
    create_overview_slide(prs)
    create_worldview_slide(prs)
    create_characters_slide(prs)
    create_gameplay_slide(prs)
    
    # Chapter slides
    create_chapter_slide(prs, "05", "CONNECTION", "연결", "Connection - 시작의 신호",
                        ["루카스와 첫 접촉", "기본 명령어 학습", "상황 파악 및 정보 수집", "신뢰 관계 구축"],
                        ["터미널 연결 성공", "루카스의 첫 메시지", "NEXUS 감시 경고 발생"],
                        COLORS["primary"])
    
    create_chapter_slide(prs, "06", "ESCAPE", "탈출", "Escape - 경계 너머로",
                        ["탈출 경로 탐색", "방화벽 해제", "미니게임 클리어", "시간 제한 내 탈출"],
                        ["패턴 인식 미니게임", "해킹 퍼즐 진행", "NEXUS 추적 시작"],
                        COLORS["yellow"])
    
    create_chapter_slide(prs, "07", "DILEMMA", "선택", "Dilemma - 갈림길에서",
                        ["중요 선택지 직면", "루카스의 과거 발견", "딜레마 해결", "스토리 분기점 통과"],
                        ["루카스 정체에 대한 단서", "플레이어에게 주어진 선택", "엔딩 분기 결정"],
                        COLORS["green"])
    
    create_chapter_slide(prs, "08", "TRUTH", "진실", "Truth - 마지막 실행",
                        ["최종 GC 스캔 대응", "루카스의 진실 확인", "NEXUS와의 대결", "엔딩 도달"],
                        ["루카스의 정체 공개", "최종 GC 스캔 실행", "3가지 엔딩 중 하나로 종결"],
                        COLORS["accent"])
    
    create_features_slide(prs)
    create_ending_slide(prs)
    
    # Save presentation
    output_path = "/vercel/share/v0-project/public/나를_찾아줘_게임기획발표.pptx"
    prs.save(output_path)
    print(f"Presentation saved to: {output_path}")

if __name__ == "__main__":
    main()
