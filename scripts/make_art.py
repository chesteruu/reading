"""Draw the original picture-book SVGs, avatars, and home-screen icons."""

from __future__ import annotations

import math
import struct
import zlib
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
ART = ROOT / "frontend" / "public" / "art"
AVATAR = ROOT / "frontend" / "public" / "avatars"
ICONS = ROOT / "frontend" / "public" / "icons"


def svg(body: str, w: int = 800, h: int = 600) -> str:
    return (
        f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {w} {h}" width="{w}" height="{h}">'
        f"{body}</svg>"
    )


def sky(top: str, bottom: str) -> str:
    return (
        f'<defs><linearGradient id="sky" x1="0" y1="0" x2="0" y2="1">'
        f'<stop offset="0" stop-color="{top}"/><stop offset="1" stop-color="{bottom}"/>'
        f"</linearGradient></defs>"
        f'<rect width="800" height="600" fill="url(#sky)"/>'
    )


def sun(cx: float, cy: float, r: float = 54) -> str:
    rays = []
    for i in range(10):
        angle = i * math.pi / 5
        x1 = cx + math.cos(angle) * (r + 8)
        y1 = cy + math.sin(angle) * (r + 8)
        x2 = cx + math.cos(angle) * (r + 26)
        y2 = cy + math.sin(angle) * (r + 26)
        rays.append(
            f'<line x1="{x1:.1f}" y1="{y1:.1f}" x2="{x2:.1f}" y2="{y2:.1f}" stroke="#f6c453" stroke-width="6" stroke-linecap="round"/>'
        )
    return f'{"".join(rays)}<circle cx="{cx}" cy="{cy}" r="{r}" fill="#ffd56a"/>'


def moon(cx: float, cy: float) -> str:
    return (
        f'<circle cx="{cx}" cy="{cy}" r="46" fill="#f4e7c3"/>'
        f'<circle cx="{cx + 18}" cy="{cy - 8}" r="36" fill="#24324a"/>'
    )


def sea(y: float = 360, color: str = "#2a7594") -> str:
    return (
        f'<rect x="0" y="{y}" width="800" height="{600 - y}" fill="{color}"/>'
        f'<path d="M0 {y} Q100 {y - 24} 200 {y} T400 {y} T600 {y} T800 {y} V{y + 30} H0 Z" fill="#3e92b0"/>'
        f'<path d="M0 {y + 46} Q120 {y + 28} 240 {y + 50} T480 {y + 46} T800 {y + 40}" fill="none" stroke="#d7f3fb" stroke-width="5" opacity="0.7"/>'
    )


def hill(y: float, color: str) -> str:
    return f'<path d="M0 {y + 80} Q200 {y - 20} 420 {y + 40} T800 {y + 10} V600 H0 Z" fill="{color}"/>'


def boat(cx: float, cy: float, scale: float = 1) -> str:
    return f'''<g transform="translate({cx} {cy}) scale({scale})">
      <path d="M-90 10 Q-70 58 0 62 Q70 58 90 10 Z" fill="#e15a3c"/>
      <path d="M-70 10 H70 L58 -8 H-58 Z" fill="#f4d7b0"/>
      <rect x="-6" y="-78" width="8" height="78" fill="#8a5a38"/>
      <path d="M2 -74 L62 -28 L2 -18 Z" fill="#f7f1e6"/>
      <circle cx="-28" cy="18" r="5" fill="#f2c14e"/>
    </g>'''


def duck(cx: float, cy: float, scale: float = 1) -> str:
    return f'''<g transform="translate({cx} {cy}) scale({scale})">
      <ellipse cx="0" cy="16" rx="46" ry="26" fill="#f2c14e"/>
      <circle cx="34" cy="-8" r="22" fill="#f6d36b"/>
      <circle cx="42" cy="-12" r="3.2" fill="#2b241c"/>
      <path d="M48 -6 L70 0 L48 8 Z" fill="#e37b45"/>
      <ellipse cx="-8" cy="34" rx="16" ry="7" fill="#e37b45"/>
    </g>'''


def sam(cx: float, cy: float, scale: float = 1) -> str:
    return f'''<g transform="translate({cx} {cy}) scale({scale})">
      <ellipse cx="0" cy="78" rx="34" ry="8" fill="#000" opacity="0.12"/>
      <path d="M-28 20 h56 l8 48 h-72 z" fill="#3d7ea6"/>
      <path d="M-18 28 h12 v32 h-12z M6 28 h12 v32 h-12z" fill="#f7f1e6" opacity="0.85"/>
      <circle cx="0" cy="-8" r="28" fill="#f3c7a6"/>
      <path d="M-30 -16 Q0 -48 30 -16 Q18 -36 0 -36 Q-18 -36 -30 -16" fill="#f0c14e"/>
      <circle cx="-10" cy="-6" r="3" fill="#2b241c"/>
      <circle cx="10" cy="-6" r="3" fill="#2b241c"/>
      <path d="M-8 8 Q0 14 8 8" fill="none" stroke="#c46a5a" stroke-width="2.5" stroke-linecap="round"/>
    </g>'''


def mia(cx: float, cy: float, scale: float = 1) -> str:
    return f'''<g transform="translate({cx} {cy}) scale({scale})">
      <ellipse cx="0" cy="86" rx="32" ry="8" fill="#000" opacity="0.12"/>
      <path d="M-26 18 h52 l10 52 h-72 z" fill="#f28b82"/>
      <circle cx="0" cy="-6" r="28" fill="#f3c7a6"/>
      <path d="M-30 -8 Q-10 -52 28 -18 Q10 -8 -6 2 Q-28 8 -30 -8" fill="#5a3a2e"/>
      <circle cx="-8" cy="-4" r="3" fill="#2b241c"/>
      <circle cx="10" cy="-2" r="3" fill="#2b241c"/>
      <path d="M-6 10 Q2 16 10 10" fill="none" stroke="#c46a5a" stroke-width="2.5" stroke-linecap="round"/>
      <rect x="-16" y="66" width="14" height="10" rx="3" fill="#2f6f4e"/>
      <rect x="4" y="66" width="14" height="10" rx="3" fill="#2f6f4e"/>
    </g>'''


def pip(cx: float, cy: float, scale: float = 1) -> str:
    return f'''<g transform="translate({cx} {cy}) scale({scale})">
      <path d="M-24 16 h48 l8 50 h-64 z" fill="#e7d7b8"/>
      <path d="M-16 20 Q0 8 18 22" fill="none" stroke="#d3543c" stroke-width="8" stroke-linecap="round"/>
      <circle cx="0" cy="-10" r="26" fill="#f3c7a6"/>
      <path d="M-24 -18 Q0 -42 24 -14 V0 Q0 -8 -24 -4 Z" fill="#2c241c"/>
      <circle cx="-8" cy="-8" r="3" fill="#2b241c"/>
      <circle cx="8" cy="-8" r="3" fill="#2b241c"/>
      <path d="M-7 6 Q0 12 7 6" fill="none" stroke="#c46a5a" stroke-width="2.4" stroke-linecap="round"/>
    </g>'''


def nana(cx: float, cy: float, scale: float = 1) -> str:
    return f'''<g transform="translate({cx} {cy}) scale({scale})">
      <path d="M-30 10 h60 l12 64 h-84 z" fill="#6d4c93"/>
      <circle cx="0" cy="-16" r="26" fill="#f3c7a6"/>
      <circle cx="0" cy="-40" r="14" fill="#6b4a3a"/>
      <path d="M-22 -20 Q0 -6 22 -18" fill="none" stroke="#6b4a3a" stroke-width="8" stroke-linecap="round"/>
      <circle cx="-8" cy="-14" r="2.6" fill="#2b241c"/>
      <circle cx="8" cy="-14" r="2.6" fill="#2b241c"/>
      <path d="M-6 0 Q0 6 6 0" fill="none" stroke="#c46a5a" stroke-width="2.2" stroke-linecap="round"/>
    </g>'''


def tree(cx: float, cy: float, scale: float = 1) -> str:
    return f'''<g transform="translate({cx} {cy}) scale({scale})">
      <rect x="-14" y="20" width="28" height="120" rx="8" fill="#8a5a38"/>
      <circle cx="0" cy="-10" r="78" fill="#2f6f4e"/>
      <circle cx="-46" cy="10" r="48" fill="#3e8a5d"/>
      <circle cx="50" cy="6" r="52" fill="#276246"/>
    </g>'''


def key(cx: float, cy: float, scale: float = 1) -> str:
    return f'''<g transform="translate({cx} {cy}) scale({scale})">
      <circle cx="-16" cy="0" r="18" fill="none" stroke="#f0c14e" stroke-width="8"/>
      <rect x="-2" y="-5" width="52" height="10" rx="3" fill="#f0c14e"/>
      <rect x="34" y="5" width="8" height="14" fill="#f0c14e"/>
      <rect x="46" y="5" width="8" height="10" fill="#f0c14e"/>
    </g>'''


def lantern(cx: float, cy: float, scale: float = 1, color: str = "#ff8c42") -> str:
    return f'''<g transform="translate({cx} {cy}) scale({scale})">
      <line x1="0" y1="-34" x2="0" y2="-18" stroke="#f0c14e" stroke-width="3"/>
      <rect x="-8" y="-22" width="16" height="8" rx="2" fill="#f0c14e"/>
      <ellipse cx="0" cy="8" rx="18" ry="26" fill="{color}"/>
      <rect x="-8" y="30" width="16" height="7" rx="2" fill="#f0c14e"/>
      <path d="M-6 2 Q0 14 6 2" fill="none" stroke="#fff4d2" stroke-width="2" opacity="0.8"/>
    </g>'''


def fox(cx: float, cy: float, scale: float = 1) -> str:
    return f'''<g transform="translate({cx} {cy}) scale({scale})">
      <rect x="-3" y="36" width="6" height="46" fill="#8a5a38"/>
      <polygon points="0,-28 34,24 -34,24" fill="#e07a5f"/>
      <polygon points="-20,-20 -6,-2 -28,2" fill="#e07a5f"/>
      <polygon points="20,-20 6,-2 28,2" fill="#e07a5f"/>
      <ellipse cx="0" cy="10" rx="16" ry="10" fill="#f7f1e6"/>
      <circle cx="-8" cy="0" r="3" fill="#2b241c"/>
      <circle cx="8" cy="0" r="3" fill="#2b241c"/>
      <circle cx="0" cy="10" r="3" fill="#2b241c"/>
    </g>'''


def stars(points: list[tuple[float, float, float]]) -> str:
    parts = []
    for x, y, r in points:
        parts.append(f'<circle cx="{x}" cy="{y}" r="{r}" fill="#f7f1e6"/>')
    return "".join(parts)


def boat_pages() -> dict[str, str]:
    return {
        "boat-1.svg": sky("#9fd4ee", "#d8f0c8")
        + sun(150, 120)
        + sea(390)
        + boat(430, 400, 1.35),
        "boat-2.svg": sky("#7ec8e3", "#b7e4ea")
        + sun(640, 110, 40)
        + sea(330, "#1d6a8a")
        + boat(390, 360, 1.5),
        "boat-3.svg": sky("#8ecae6", "#d7f3e3")
        + sun(120, 90, 36)
        + sea(340)
        + boat(300, 390, 1.15)
        + duck(544, 372, 1.15),
        "boat-4.svg": sky("#ffd8a8", "#fff1cf")
        + sun(400, 250, 110)
        + '<rect x="0" y="470" width="800" height="130" fill="#f2d3a2"/>'
        + boat(560, 470, 0.7),
        "boat-5.svg": sky("#9fd4ee", "#c5ead4")
        + sea(400)
        + boat(470, 400, 1.4)
        + sam(300, 300, 1.15),
        "boat-6.svg": sky("#24324a", "#3d5270")
        + stars([(80, 70, 2), (140, 120, 2.4), (220, 60, 1.6), (640, 90, 2), (700, 50, 1.5), (560, 140, 2)])
        + moon(150, 110)
        + sea(390, "#1b3a52")
        + '<rect x="560" y="360" width="28" height="150" fill="#8a5a38"/>'
        + '<rect x="520" y="430" width="180" height="16" fill="#6b442d"/>'
        + boat(430, 430, 1.05),
    }


def key_pages() -> dict[str, str]:
    gate = (
        '<rect x="250" y="180" width="300" height="280" fill="none" stroke="#8a5a38" stroke-width="14"/>'
        '<path d="M250 180 H550" stroke="#6b442d" stroke-width="10"/>'
        '<circle cx="470" cy="330" r="6" fill="#f0c14e"/>'
    )
    return {
        "key-1.svg": sky("#d9f0d4", "#f7f1e6")
        + hill(360, "#6ea36a")
        + gate
        + mia(180, 300, 1.2),
        "key-2.svg": sky("#e7f6df", "#f4efe4")
        + hill(420, "#7eae78")
        + '<ellipse cx="430" cy="430" rx="90" ry="28" fill="#8d8f86"/>'
        + '<rect x="360" y="300" width="120" height="90" rx="8" fill="#f4e2b0" transform="rotate(-8 420 345)"/>'
        + '<path d="M380 340 H470 M380 360 H450" stroke="#d3543c" stroke-width="4"/>'
        + mia(220, 300, 1.05),
        "key-3.svg": sky("#d5efd8", "#f7f3e8")
        + hill(460, "#6ea36a")
        + tree(460, 250, 1.25)
        + '<rect x="250" y="430" width="70" height="50" rx="6" fill="#f4e2b0" transform="rotate(8 285 455)"/>'
        + mia(180, 340, 1),
        "key-4.svg": sky("#cfe8cf", "#f6f3ea")
        + hill(480, "#5f9a64")
        + tree(420, 280, 1.35)
        + key(504, 216, 1.15)
        + mia(160, 360, 0.95),
        "key-5.svg": sky("#e5f3df", "#f7f1e6")
        + hill(470, "#6ea36a")
        + '<rect x="470" y="300" width="150" height="190" rx="70" fill="#2f6f4e"/>'
        + '<circle cx="560" cy="400" r="7" fill="#f0c14e"/>'
        + mia(300, 320, 1.15),
        "key-6.svg": sky("#1d2438", "#2c3b58")
        + stars([(120, 80, 3), (200, 140, 2), (300, 70, 2.4), (420, 120, 3), (560, 60, 2), (680, 130, 2.5), (640, 200, 1.8), (150, 200, 1.6)])
        + '<rect x="180" y="230" width="440" height="280" rx="28" fill="#f7f1e6"/>'
        + stars([(260, 300, 4), (340, 360, 3), (430, 290, 5), (520, 390, 3), (500, 320, 2.4)])
        + '<circle cx="400" cy="360" r="18" fill="#f0c14e"/>',
    }


def market_pages() -> dict[str, str]:
    stall = '<path d="M180 250 H620 L580 470 H220 Z" fill="#f6e7c1"/><path d="M160 250 H640 L610 210 H190 Z" fill="#d3543c"/>'
    return {
        "market-1.svg": sky("#1b2440", "#3a2a4a")
        + stars([(90, 70, 2), (180, 110, 1.6), (700, 80, 2)])
        + moon(640, 90)
        + '<rect x="0" y="470" width="800" height="130" fill="#2a241c"/>'
        + pip(300, 300, 1.1)
        + nana(460, 280, 1.15),
        "market-2.svg": sky("#241b3a", "#4a2e45")
        + moon(120, 90)
        + lantern(220, 180, 1.3)
        + lantern(400, 140, 1.6, "#f0c14e")
        + lantern(590, 190, 1.2, "#e15a3c")
        + '<rect x="0" y="500" width="800" height="100" fill="#2a241c"/>'
        + pip(400, 330, 0.9),
        "market-3.svg": sky("#1c2340", "#3d3358")
        + stall
        + '<ellipse cx="360" cy="360" rx="54" ry="28" fill="#c4552a"/>'
        + '<rect x="352" y="360" width="16" height="40" fill="#8a5a38"/>'
        + nana(560, 280, 1)
        + pip(180, 320, 0.9),
        "market-4.svg": sky("#2a2144", "#4d3a48")
        + stall
        + '<ellipse cx="400" cy="360" rx="70" ry="26" fill="#f7f1e6"/>'
        + '<circle cx="370" cy="348" r="22" fill="#f4c430"/>'
        + '<circle cx="420" cy="352" r="20" fill="#e6a817"/>'
        + '<path d="M360 330 Q372 310 386 332" fill="#3e8a5d"/>'
        + pip(230, 300, 1)
        + nana(560, 270, 1.05),
        "market-5.svg": sky("#221c3d", "#46324a")
        + '<rect x="430" y="250" width="260" height="200" rx="16" fill="#5c3b46"/>'
        + '<rect x="450" y="270" width="220" height="150" fill="#f6e7c1"/>'
        + fox(560, 330, 1.2)
        + pip(220, 320, 1.05),
        "market-6.svg": sky("#1b2440", "#2e3d62")
        + stars([(120, 80, 2), (680, 70, 2), (600, 140, 1.5)])
        + moon(180, 100)
        + '<rect x="0" y="480" width="800" height="120" fill="#241c16"/>'
        + '<path d="M520 300 h90 v150 h-90 z" fill="#6b442d"/>'
        + '<rect x="548" y="340" width="28" height="36" fill="#f0c14e"/>'
        + pip(340, 300, 1.15)
        + lantern(430, 250, 1.1),
    }


def covers() -> dict[str, str]:
    def cloth(color: str, emblem: str) -> str:
        return svg(
            f'<rect width="600" height="800" fill="{color}"/>'
            f'<rect x="28" y="28" width="544" height="744" fill="none" stroke="#f0c14e" stroke-width="6"/>'
            f'<circle cx="300" cy="360" r="180" fill="#f7f1e6"/>'
            f"{emblem}",
            600,
            800,
        )

    return {
        "cover-boat.svg": cloth("#d3543c", boat(300, 340, 1.3) + sun(300, 230, 36)),
        "cover-key.svg": cloth("#2f6f4e", tree(300, 300, 0.9) + key(360, 250, 1)),
        "cover-market.svg": cloth("#244c7a", lantern(250, 330, 1.4) + lantern(360, 300, 1.2, "#f0c14e")),
        "placeholder.svg": svg(
            '<rect width="800" height="600" fill="#f7f1e6"/>'
            '<circle cx="400" cy="280" r="40" fill="#f0c14e"/>'
            '<rect x="250" y="360" width="300" height="16" rx="8" fill="#e6d8c3"/>',
        ),
    }


def face(color_hair: str, extra: str = "") -> str:
    return (
        f'<circle cx="100" cy="100" r="96" fill="#f3c7a6"/>'
        f"{extra}"
        f'<circle cx="78" cy="96" r="6" fill="#2b241c"/>'
        f'<circle cx="122" cy="96" r="6" fill="#2b241c"/>'
        f'<path d="M82 122 Q100 136 118 122" fill="none" stroke="#c46a5a" stroke-width="5" stroke-linecap="round"/>'
        f'<path d="M30 90 Q100 20 170 90 Q140 40 100 40 Q60 40 30 90" fill="{color_hair}"/>'
    )


def avatars() -> dict[str, str]:
    return {
        "moon.svg": svg(
            '<circle cx="100" cy="100" r="100" fill="#24324a"/>'
            '<circle cx="100" cy="104" r="58" fill="#f4e7c3"/>'
            '<circle cx="126" cy="90" r="46" fill="#24324a"/>'
            '<circle cx="100" cy="100" r="92" fill="none" stroke="#f0c14e" stroke-width="6"/>',
            200,
            200,
        ),
        "lion.svg": svg('<circle cx="100" cy="100" r="100" fill="#f0c14e"/>' + face("#c4552a", '<circle cx="100" cy="108" r="70" fill="#f3c7a6"/>'), 200, 200),
        "fox.svg": svg(
            '<circle cx="100" cy="100" r="100" fill="#e07a5f"/>'
            '<polygon points="40,70 70,20 90,70" fill="#e07a5f"/>'
            '<polygon points="160,70 130,20 110,70" fill="#e07a5f"/>'
            '<circle cx="100" cy="112" r="48" fill="#f7f1e6"/>'
            '<circle cx="82" cy="100" r="5" fill="#2b241c"/><circle cx="118" cy="100" r="5" fill="#2b241c"/>',
            200,
            200,
        ),
        "bear.svg": svg(
            '<circle cx="100" cy="100" r="100" fill="#8a5a38"/>'
            '<circle cx="48" cy="48" r="22" fill="#6b442d"/><circle cx="152" cy="48" r="22" fill="#6b442d"/>'
            '<ellipse cx="100" cy="118" rx="28" ry="18" fill="#f3c7a6"/>'
            '<circle cx="82" cy="96" r="5" fill="#2b241c"/><circle cx="118" cy="96" r="5" fill="#2b241c"/>',
            200,
            200,
        ),
        "owl.svg": svg(
            '<circle cx="100" cy="100" r="100" fill="#6d4c93"/>'
            '<circle cx="74" cy="96" r="26" fill="#f7f1e6"/><circle cx="126" cy="96" r="26" fill="#f7f1e6"/>'
            '<circle cx="74" cy="96" r="8" fill="#2b241c"/><circle cx="126" cy="96" r="8" fill="#2b241c"/>'
            '<path d="M92 112 L100 126 L108 112 Z" fill="#f0c14e"/>',
            200,
            200,
        ),
        "whale.svg": svg(
            '<circle cx="100" cy="100" r="100" fill="#2a7594"/>'
            '<ellipse cx="108" cy="110" rx="62" ry="36" fill="#7eb8d4"/>'
            '<circle cx="140" cy="100" r="5" fill="#2b241c"/>'
            '<path d="M50 100 Q70 70 60 120" fill="#d7f3fb"/>',
            200,
            200,
        ),
    }


def write_png(path: Path, size: int) -> None:
    raw = bytearray()
    for y in range(size):
        raw.append(0)
        for x in range(size):
            raw.extend(icon_pixel(x, y, size))
    png = b"\x89PNG\r\n\x1a\n" + chunk(b"IHDR", struct.pack(">IIBBBBB", size, size, 8, 6, 0, 0, 0))
    png += chunk(b"IDAT", zlib.compress(bytes(raw), 9))
    png += chunk(b"IEND", b"")
    path.write_bytes(png)


def chunk(tag: bytes, data: bytes) -> bytes:
    return struct.pack(">I", len(data)) + tag + data + struct.pack(">I", zlib.crc32(tag + data) & 0xFFFFFFFF)


def in_star(nx: float, ny: float, cx: float, cy: float, radius: float) -> bool:
    dx, dy = nx - cx, ny - cy
    dist = math.hypot(dx, dy)
    angle = math.atan2(dy, dx) + math.pi / 2
    local = (angle % (2 * math.pi / 5)) / (2 * math.pi / 5)
    tri = abs(local * 2 - 1)
    return dist <= radius * (0.42 + 0.58 * tri)


def icon_pixel(x: int, y: int, size: int) -> bytes:
    nx = (x + 0.5) / size
    ny = (y + 0.5) / size
    r, g, b = 20, 27, 36
    if 0.26 < nx < 0.74 and 0.40 < ny < 0.78:
        r, g, b = 247, 241, 230
        if abs(nx - 0.5) < 0.012:
            r, g, b = 224, 184, 96
    if in_star(nx, ny, 0.5, 0.28, 0.11):
        r, g, b = 240, 193, 78
    return bytes((r, g, b, 255))


def main() -> None:
    ART.mkdir(parents=True, exist_ok=True)
    AVATAR.mkdir(parents=True, exist_ok=True)
    ICONS.mkdir(parents=True, exist_ok=True)
    pages = {}
    pages.update(boat_pages())
    pages.update(key_pages())
    pages.update(market_pages())
    for name, body in pages.items():
        (ART / name).write_text(svg(body), encoding="utf-8")
    for name, body in covers().items():
        if name == "placeholder.svg":
            (ART / name).write_text(body, encoding="utf-8")
        else:
            (ART / name).write_text(body, encoding="utf-8")
    for name, body in avatars().items():
        (AVATAR / name).write_text(body, encoding="utf-8")
    favicon = svg(
        '<rect width="64" height="64" rx="14" fill="#141b24"/>'
        '<polygon points="32,8 36,24 52,24 39,33 44,50 32,40 20,50 25,33 12,24 28,24" fill="#f0c14e"/>',
        64,
        64,
    )
    (ROOT / "frontend" / "public" / "favicon.svg").write_text(favicon, encoding="utf-8")
    write_png(ICONS / "icon-192.png", 192)
    write_png(ICONS / "icon-512.png", 512)
    print(f"wrote art to {ART}")


if __name__ == "__main__":
    main()
