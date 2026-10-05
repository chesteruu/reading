"""Ready-made story packs parents can put on the shelf in one tap."""

from app.catalog import CATALOG

COVERS = [
    {"key": "boat", "label": "小红船", "url": "/art/cover-boat.svg", "accent": "#d3543c"},
    {"key": "key", "label": "钥匙花园", "url": "/art/cover-key.svg", "accent": "#2f6f4e"},
    {"key": "market", "label": "夜市灯笼", "url": "/art/cover-market.svg", "accent": "#244c7a"},
    {"key": "cat", "label": "胖猫咪", "url": "/art/cover-cat.svg", "accent": "#c47b4a"},
    {"key": "rain", "label": "下雨天", "url": "/art/cover-rain.svg", "accent": "#3d6d8c"},
    {"key": "bus", "label": "校车", "url": "/art/cover-bus.svg", "accent": "#d6a11a"},
    {"key": "paper", "label": "空白纸页", "url": "/art/placeholder.svg", "accent": "#8a5a3b"},
]

GENRES = [
    {"key": "fiction", "label": "故事"},
    {"key": "animals", "label": "动物"},
    {"key": "school", "label": "学校"},
    {"key": "weather", "label": "天气"},
    {"key": "family", "label": "家人"},
]


def drafts_from_catalog() -> list[dict]:
    packs = []
    for story in CATALOG:
        pages = [
            {
                "text": " ".join(item["word"] for item in page["alignment_data"]),
                "image_url": page["image_url"],
            }
            for page in story["pages"]
        ]
        packs.append(
            {
                "id": f"pack-{story['id'][-4:]}",
                "title": story["title"],
                "subtitle": story["subtitle"],
                "level": story["level"],
                "genre": story["genre"],
                "blurb": story["blurb"],
                "accent": story["accent"],
                "cover_image_url": story["cover_image_url"],
                "pages": pages,
                "source": "shelf",
            }
        )
    return packs


# Extra short drafts that are not already full shelf books.
EXTRA_DRAFTS: list[dict] = [
    {
        "id": "draft-bug",
        "title": "Bug on a Rug",
        "subtitle": "地毯上的小虫",
        "level": "B",
        "genre": "animals",
        "blurb": "一只小虫爬上地毯，又爬到杯子边。",
        "accent": "#6ea892",
        "cover_image_url": "/art/placeholder.svg",
        "pages": [
            {"text": "I see a little bug.", "image_url": "/art/placeholder.svg"},
            {"text": "The bug is on the rug.", "image_url": "/art/placeholder.svg"},
            {"text": "It runs to the cup.", "image_url": "/art/placeholder.svg"},
            {"text": "I tap the cup.", "image_url": "/art/placeholder.svg"},
            {"text": "The bug jumps up.", "image_url": "/art/placeholder.svg"},
            {"text": "Goodbye, little bug.", "image_url": "/art/placeholder.svg"},
        ],
        "source": "draft",
    },
    {
        "id": "draft-hop",
        "title": "Hop, Hop, Hop",
        "subtitle": "跳呀跳",
        "level": "A",
        "genre": "animals",
        "blurb": "青蛙一跳一跳，跳过石头和草。",
        "accent": "#2f6f4e",
        "cover_image_url": "/art/placeholder.svg",
        "pages": [
            {"text": "I can hop.", "image_url": "/art/placeholder.svg"},
            {"text": "I hop on a log.", "image_url": "/art/placeholder.svg"},
            {"text": "I hop on a rock.", "image_url": "/art/placeholder.svg"},
            {"text": "I hop in the mud.", "image_url": "/art/placeholder.svg"},
            {"text": "I hop to Mom.", "image_url": "/art/placeholder.svg"},
            {"text": "I hop and stop.", "image_url": "/art/placeholder.svg"},
        ],
        "source": "draft",
    },
    {
        "id": "draft-soup",
        "title": "Hot Red Soup",
        "subtitle": "热热的红汤",
        "level": "C",
        "genre": "family",
        "blurb": "妈妈煮汤，香气飘到门口。",
        "accent": "#c44536",
        "cover_image_url": "/art/placeholder.svg",
        "pages": [
            {"text": "Mom makes hot soup.", "image_url": "/art/placeholder.svg"},
            {"text": "The soup is red.", "image_url": "/art/placeholder.svg"},
            {"text": "I smell the soup.", "image_url": "/art/placeholder.svg"},
            {"text": "Dad sits at the table.", "image_url": "/art/placeholder.svg"},
            {"text": "We sip the soup.", "image_url": "/art/placeholder.svg"},
            {"text": "Yum, the soup is good.", "image_url": "/art/placeholder.svg"},
        ],
        "source": "draft",
    },
    {
        "id": "draft-kite",
        "title": "My Blue Kite",
        "subtitle": "我的蓝风筝",
        "level": "D",
        "genre": "fiction",
        "blurb": "风很大，蓝风筝飞得很高。",
        "accent": "#2a6f86",
        "cover_image_url": "/art/placeholder.svg",
        "pages": [
            {"text": "I have a blue kite.", "image_url": "/art/placeholder.svg"},
            {"text": "The wind is strong.", "image_url": "/art/placeholder.svg"},
            {"text": "I run with the kite.", "image_url": "/art/placeholder.svg"},
            {"text": "The kite goes up high.", "image_url": "/art/placeholder.svg"},
            {"text": "It dips and spins.", "image_url": "/art/placeholder.svg"},
            {"text": "I hold the string tight.", "image_url": "/art/placeholder.svg"},
        ],
        "source": "draft",
    },
    {
        "id": "draft-teeth",
        "title": "Brush Your Teeth",
        "subtitle": "刷刷牙",
        "level": "C",
        "genre": "family",
        "blurb": "晚上刷牙，泡沫白白的。",
        "accent": "#5b8fa8",
        "cover_image_url": "/art/placeholder.svg",
        "pages": [
            {"text": "It is time for bed.", "image_url": "/art/placeholder.svg"},
            {"text": "I get my brush.", "image_url": "/art/placeholder.svg"},
            {"text": "I put on the paste.", "image_url": "/art/placeholder.svg"},
            {"text": "I brush my teeth.", "image_url": "/art/placeholder.svg"},
            {"text": "I rinse with water.", "image_url": "/art/placeholder.svg"},
            {"text": "My teeth are clean.", "image_url": "/art/placeholder.svg"},
        ],
        "source": "draft",
    },
]


def all_packs() -> list[dict]:
    return drafts_from_catalog() + EXTRA_DRAFTS
