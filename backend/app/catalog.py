"""Original leveled stories shipped with the demo shelf."""

from app.scoring import align_sentence

PARENT_ID = "11111111-1111-4111-8111-111111111111"
LUNA_ID = "22222222-2222-4222-8222-222222222221"
LEO_ID = "22222222-2222-4222-8222-222222222222"
BOAT_ID = "33333333-3333-4333-8333-333333333331"
KEY_ID = "33333333-3333-4333-8333-333333333332"
MARKET_ID = "33333333-3333-4333-8333-333333333333"


def _pages(book_id: str, sentences: list[tuple[str, str]]) -> list[dict]:
    pages = []
    for index, (image, text) in enumerate(sentences, start=1):
        pages.append(
            {
                "id": f"p{book_id[-4:]}{index:02d}",
                "book_id": book_id,
                "page_number": index,
                "image_url": image,
                "audio_url": "speech:en-US",
                "alignment_data": align_sentence(text),
            }
        )
    return pages


CATALOG: list[dict] = [
    {
        "id": BOAT_ID,
        "title": "The Little Red Boat",
        "subtitle": "小红船",
        "level": "C",
        "genre": "fiction",
        "cover_image_url": "/art/cover-boat.svg",
        "blurb": "一艘小红船、一只黄鸭子，还有暖暖的太阳。",
        "accent": "#d3543c",
        "glossary": {
            "look": {"emoji": "👀", "hint": "Use your eyes.", "zh": "看"},
            "little": {"emoji": "🤏", "hint": "Small, not big.", "zh": "小的"},
            "red": {"emoji": "🔴", "hint": "The color of a strawberry.", "zh": "红色的"},
            "boat": {"emoji": "⛵", "hint": "It floats on water.", "zh": "小船"},
            "sits": {"emoji": "🪑", "hint": "Rests in one place.", "zh": "停着"},
            "blue": {"emoji": "🔵", "hint": "The color of the sea.", "zh": "蓝色的"},
            "sea": {"emoji": "🌊", "hint": "A very big water.", "zh": "大海"},
            "yellow": {"emoji": "🟡", "hint": "The color of the sun.", "zh": "黄色的"},
            "duck": {"emoji": "🦆", "hint": "A bird that swims.", "zh": "鸭子"},
            "swims": {"emoji": "🏊", "hint": "Moves through water.", "zh": "游泳"},
            "sun": {"emoji": "☀️", "hint": "It makes the day warm.", "zh": "太阳"},
            "big": {"emoji": "🐘", "hint": "Not small.", "zh": "大的"},
            "warm": {"emoji": "🌤️", "hint": "A little hot, in a nice way.", "zh": "暖和"},
            "rows": {"emoji": "🛶", "hint": "Pulls oars to move a boat.", "zh": "划船"},
            "good": {"emoji": "💛", "hint": "Nice. Kind.", "zh": "好的"},
            "night": {"emoji": "🌙", "hint": "When the sky is dark.", "zh": "夜晚"},
        },
        "pages": _pages(
            BOAT_ID,
            [
                ("/art/boat-1.svg", "Look at the little red boat."),
                ("/art/boat-2.svg", "The boat sits on the blue sea."),
                ("/art/boat-3.svg", "A yellow duck swims by."),
                ("/art/boat-4.svg", "The sun is big and warm."),
                ("/art/boat-5.svg", "Sam rows the little boat."),
                ("/art/boat-6.svg", "Good night, little red boat."),
            ],
        ),
        "activities": {
            "sequencer": {
                "prompt": "用手指把故事按发生的顺序排好",
                "frames": [
                    {"id": "p1", "image_url": "/art/boat-1.svg", "caption": "Look at the little red boat."},
                    {"id": "p3", "image_url": "/art/boat-3.svg", "caption": "A yellow duck swims by."},
                    {"id": "p5", "image_url": "/art/boat-5.svg", "caption": "Sam rows the little boat."},
                    {"id": "p6", "image_url": "/art/boat-6.svg", "caption": "Good night, little red boat."},
                ],
                "order": ["p1", "p3", "p5", "p6"],
            },
            "detective": {
                "prompt": "Where is the yellow duck?",
                "speak": "Where is the yellow duck?",
                "image_url": "/art/boat-3.svg",
                "hint": "It is swimming beside the red boat.",
                "target": {"x": 68, "y": 62, "r": 12},
            },
            "word_match": {
                "prompt": "听一听，把声音拖到对应的词上",
                "pairs": [
                    {"id": "boat", "word": "boat", "emoji": "⛵"},
                    {"id": "duck", "word": "duck", "emoji": "🦆"},
                    {"id": "sun", "word": "sun", "emoji": "☀️"},
                    {"id": "sea", "word": "sea", "emoji": "🌊"},
                ],
            },
        },
    },
    {
        "id": KEY_ID,
        "title": "Mia and the Hidden Key",
        "subtitle": "藏起来的钥匙",
        "level": "E",
        "genre": "fiction",
        "cover_image_url": "/art/cover-key.svg",
        "blurb": "米娅推开花园门，地图把她带到一棵大树下。",
        "accent": "#2f6f4e",
        "glossary": {
            "opens": {"emoji": "🚪", "hint": "Makes something not shut.", "zh": "打开"},
            "garden": {"emoji": "🌷", "hint": "A yard with plants.", "zh": "花园"},
            "gate": {"emoji": "🚪", "hint": "A small door in a fence.", "zh": "大门"},
            "map": {"emoji": "🗺️", "hint": "A picture that shows the way.", "zh": "地图"},
            "waits": {"emoji": "⏳", "hint": "Stays until someone comes.", "zh": "等着"},
            "under": {"emoji": "⬇️", "hint": "Below something.", "zh": "在下面"},
            "stone": {"emoji": "🪨", "hint": "A hard little rock.", "zh": "石头"},
            "leads": {"emoji": "👉", "hint": "Shows the way.", "zh": "通向"},
            "tall": {"emoji": "📏", "hint": "High, not short.", "zh": "高高的"},
            "tree": {"emoji": "🌳", "hint": "A big plant with a trunk.", "zh": "树"},
            "gold": {"emoji": "✨", "hint": "A shiny yellow color.", "zh": "金色的"},
            "key": {"emoji": "🔑", "hint": "It opens a lock.", "zh": "钥匙"},
            "hides": {"emoji": "🙈", "hint": "Stays where it is hard to see.", "zh": "躲着"},
            "leaves": {"emoji": "🍃", "hint": "The green parts of a tree.", "zh": "树叶"},
            "tiny": {"emoji": "🔍", "hint": "Very small.", "zh": "小小的"},
            "green": {"emoji": "🟢", "hint": "The color of leaves.", "zh": "绿色的"},
            "door": {"emoji": "🚪", "hint": "You open it to go in.", "zh": "门"},
            "room": {"emoji": "🏠", "hint": "A space inside a house.", "zh": "房间"},
            "full": {"emoji": "🧺", "hint": "No empty space left.", "zh": "满满的"},
            "stars": {"emoji": "⭐", "hint": "Lights in the night sky.", "zh": "星星"},
        },
        "pages": _pages(
            KEY_ID,
            [
                ("/art/key-1.svg", "Mia opens the garden gate."),
                ("/art/key-2.svg", "A map waits under a stone."),
                ("/art/key-3.svg", "The map leads to a tall tree."),
                ("/art/key-4.svg", "A gold key hides in the leaves."),
                ("/art/key-5.svg", "Mia opens a tiny green door."),
                ("/art/key-6.svg", "The room is full of stars."),
            ],
        ),
        "activities": {
            "sequencer": {
                "prompt": "用手指把故事按发生的顺序排好",
                "frames": [
                    {"id": "p1", "image_url": "/art/key-1.svg", "caption": "Mia opens the garden gate."},
                    {"id": "p2", "image_url": "/art/key-2.svg", "caption": "A map waits under a stone."},
                    {"id": "p4", "image_url": "/art/key-4.svg", "caption": "A gold key hides in the leaves."},
                    {"id": "p6", "image_url": "/art/key-6.svg", "caption": "The room is full of stars."},
                ],
                "order": ["p1", "p2", "p4", "p6"],
            },
            "detective": {
                "prompt": "Where is the hidden key?",
                "speak": "Where is the hidden key?",
                "image_url": "/art/key-4.svg",
                "hint": "Look up in the leaves of the tall tree.",
                "target": {"x": 63, "y": 36, "r": 11},
            },
            "word_match": {
                "prompt": "听一听，把声音拖到对应的词上",
                "pairs": [
                    {"id": "garden", "word": "garden", "emoji": "🌷"},
                    {"id": "map", "word": "map", "emoji": "🗺️"},
                    {"id": "key", "word": "key", "emoji": "🔑"},
                    {"id": "stars", "word": "stars", "emoji": "⭐"},
                ],
            },
        },
    },
    {
        "id": MARKET_ID,
        "title": "Pip at the Night Market",
        "subtitle": "夜市里的灯笼",
        "level": "F",
        "genre": "fiction",
        "cover_image_url": "/art/cover-market.svg",
        "blurb": "皮普和奶奶逛夜市，灯笼亮得像小月亮。",
        "accent": "#244c7a",
        "glossary": {
            "walk": {"emoji": "🚶", "hint": "Move on your feet.", "zh": "走路"},
            "market": {"emoji": "🏮", "hint": "A place with many little shops.", "zh": "市场"},
            "lanterns": {"emoji": "🏮", "hint": "Lights you can carry.", "zh": "灯笼"},
            "glow": {"emoji": "✨", "hint": "Shine softly.", "zh": "发光"},
            "moons": {"emoji": "🌙", "hint": "Round lights in the night sky.", "zh": "月亮"},
            "drum": {"emoji": "🥁", "hint": "You tap it to make a beat.", "zh": "鼓"},
            "plays": {"emoji": "🎵", "hint": "Makes music.", "zh": "演奏"},
            "soft": {"emoji": "🪶", "hint": "Quiet and gentle.", "zh": "轻柔的"},
            "song": {"emoji": "🎶", "hint": "Music with a tune.", "zh": "歌"},
            "share": {"emoji": "🤝", "hint": "Use something together.", "zh": "分享"},
            "sweet": {"emoji": "🍯", "hint": "Tastes like sugar.", "zh": "甜的"},
            "mango": {"emoji": "🥭", "hint": "A juicy yellow fruit.", "zh": "芒果"},
            "paper": {"emoji": "📄", "hint": "Thin material for drawing.", "zh": "纸"},
            "fox": {"emoji": "🦊", "hint": "An animal with a bushy tail.", "zh": "狐狸"},
            "puppet": {"emoji": "🎭", "hint": "A toy you move to tell a story.", "zh": "木偶"},
            "nods": {"emoji": "🙂", "hint": "Moves the head to say yes.", "zh": "点头"},
            "carries": {"emoji": "🧺", "hint": "Holds something while walking.", "zh": "带着"},
            "home": {"emoji": "🏡", "hint": "The place you live.", "zh": "家"},
        },
        "pages": _pages(
            MARKET_ID,
            [
                ("/art/market-1.svg", "Pip and Nana walk to the market."),
                ("/art/market-2.svg", "Lanterns glow like little moons."),
                ("/art/market-3.svg", "A drum plays a soft song."),
                ("/art/market-4.svg", "They share sweet yellow mango."),
                ("/art/market-5.svg", "A paper fox puppet nods at Pip."),
                ("/art/market-6.svg", "Pip carries a lantern home."),
            ],
        ),
        "activities": {
            "sequencer": {
                "prompt": "用手指把故事按发生的顺序排好",
                "frames": [
                    {"id": "p1", "image_url": "/art/market-1.svg", "caption": "Pip and Nana walk to the market."},
                    {"id": "p2", "image_url": "/art/market-2.svg", "caption": "Lanterns glow like little moons."},
                    {"id": "p4", "image_url": "/art/market-4.svg", "caption": "They share sweet yellow mango."},
                    {"id": "p6", "image_url": "/art/market-6.svg", "caption": "Pip carries a lantern home."},
                ],
                "order": ["p1", "p2", "p4", "p6"],
            },
            "detective": {
                "prompt": "Where is the paper fox?",
                "speak": "Where is the paper fox?",
                "image_url": "/art/market-5.svg",
                "hint": "The fox puppet is on the little stage.",
                "target": {"x": 70, "y": 55, "r": 12},
            },
            "word_match": {
                "prompt": "听一听，把声音拖到对应的词上",
                "pairs": [
                    {"id": "market", "word": "market", "emoji": "🏮"},
                    {"id": "lantern", "word": "lantern", "emoji": "🏮"},
                    {"id": "mango", "word": "mango", "emoji": "🥭"},
                    {"id": "fox", "word": "fox", "emoji": "🦊"},
                ],
            },
        },
    },
]


def word_count(pages: list[dict]) -> int:
    total = 0
    for page in pages:
        total += len(page["alignment_data"])
    return total
