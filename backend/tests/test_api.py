from app.catalog import BOAT_ID, KEY_ID, LEO_ID, LUNA_ID, MARKET_ID
from app.scoring import level_fit, score_detective, score_match, score_sequence
from app.security import reset_pin_failures


def auth(token: str) -> dict:
    return {"Authorization": f"Bearer {token}"}


def test_level_fit_and_scores():
    assert level_fit("C", "E") == "review"
    assert level_fit("E", "E") == "ready"
    assert level_fit("F", "E") == "challenge"
    assert level_fit("F", "D") == "locked"
    assert score_sequence(["p1", "p3"], ["p1", "p3"])
    assert not score_sequence(["p3", "p1"], ["p1", "p3"])
    assert score_detective(63, 36, {"x": 63, "y": 36, "r": 11})
    assert not score_detective(10, 10, {"x": 63, "y": 36, "r": 11})
    assert score_match([{"left": "boat", "right": "boat"}], ["boat"])
    assert not score_match([{"left": "boat", "right": "duck"}], ["boat"])


def test_health(client):
    assert client.get("/api/health").json()["ok"] is True


def test_login_and_bad_password(client, parent):
    bad = client.post("/api/auth/login", json={"email": "demo@reading.app", "password": "nope"})
    assert bad.status_code == 401
    me = client.get("/api/auth/me", headers=auth(parent["token"]))
    assert me.status_code == 200
    assert me.json()["user"]["email"] == "demo@reading.app"
    nicknames = {child["nickname"] for child in me.json()["children"]}
    assert nicknames == {"Luna", "Leo"}


def test_register_conflict_and_new_parent(client):
    conflict = client.post("/api/auth/register", json={"email": "demo@reading.app", "password": "demo1234"})
    assert conflict.status_code == 409
    created = client.post("/api/auth/register", json={"email": "new@reading.app", "password": "secret6"})
    assert created.status_code == 200
    token = created.json()["token"]
    denied = client.get("/api/parent/overview", headers=auth(token))
    assert denied.status_code == 200
    assert denied.json()["children"] == []


def test_pin_and_child_isolation(client, parent):
    reset_pin_failures()
    wrong = client.post("/api/auth/pin", json={"child_id": LUNA_ID, "pin": "0000"}, headers=auth(parent["token"]))
    assert wrong.status_code == 401
    unlocked = client.post("/api/auth/pin", json={"child_id": LUNA_ID, "pin": "1234"}, headers=auth(parent["token"]))
    assert unlocked.status_code == 200
    child_token = unlocked.json()["token"]
    overview = client.get("/api/parent/overview", headers=auth(child_token))
    assert overview.status_code == 403
    created = client.post(
        "/api/parent/books",
        json={"title": "Nope", "level": "A", "pages": [{"text": "No way today."}]},
        headers=auth(child_token),
    )
    assert created.status_code == 403
    shelf = client.get("/api/shelf", params={"child_id": LUNA_ID}, headers=auth(child_token))
    assert shelf.status_code == 200
    fits = {book["title"]: book["fit"] for book in shelf.json()["books"]}
    assert fits["The Little Red Boat"] == "review"
    assert fits["Mia and the Hidden Key"] == "ready"
    assert fits["Pip at the Night Market"] == "challenge"
    other = client.get("/api/shelf", params={"child_id": LEO_ID}, headers=auth(child_token))
    assert other.status_code == 403


def test_level_gate(client, parent):
    leo = client.post("/api/auth/pin", json={"child_id": LEO_ID, "pin": "2580"}, headers=auth(parent["token"]))
    assert leo.status_code == 200
    token = leo.json()["token"]
    blocked = client.get(f"/api/books/{MARKET_ID}", headers=auth(token))
    assert blocked.status_code == 403
    allowed = client.get(f"/api/books/{BOAT_ID}", headers=auth(token))
    assert allowed.status_code == 200
    assert len(allowed.json()["pages"]) == 6
    assert allowed.json()["pages"][0]["alignment_data"][0]["word"] == "Look"


def test_reading_loop_awards_stars_once(client, parent):
    luna = client.post("/api/auth/pin", json={"child_id": LUNA_ID, "pin": "1234"}, headers=auth(parent["token"]))
    token = luna.json()["token"]
    headers = auth(token)
    progress = client.post(
        "/api/reading/progress",
        json={"child_id": LUNA_ID, "book_id": BOAT_ID, "current_page": 2, "add_read_seconds": 3, "add_listen_seconds": 4},
        headers=headers,
    )
    assert progress.status_code == 200
    assert progress.json()["current_page"] == 2
    book = client.get(f"/api/books/{KEY_ID}", headers=headers).json()
    order = book["activities"]["sequencer"]["order"]
    good = client.post(
        "/api/activities/submit",
        json={"child_id": LUNA_ID, "book_id": KEY_ID, "kind": "sequencer", "answer": {"order": order}},
        headers=headers,
    )
    assert good.json()["correct"] is True
    assert good.json()["stars_awarded"] == 3
    again = client.post(
        "/api/activities/submit",
        json={"child_id": LUNA_ID, "book_id": KEY_ID, "kind": "sequencer", "answer": {"order": order}},
        headers=headers,
    )
    assert again.json()["correct"] is True
    assert again.json()["stars_awarded"] == 0
    bad = client.post(
        "/api/activities/submit",
        json={"child_id": LUNA_ID, "book_id": KEY_ID, "kind": "detective", "answer": {"x": 1, "y": 1}},
        headers=headers,
    )
    assert bad.json()["correct"] is False
    assert bad.json()["stars_awarded"] == 0
    hit = client.post(
        "/api/activities/submit",
        json={"child_id": LUNA_ID, "book_id": KEY_ID, "kind": "detective", "answer": {"x": 63, "y": 36}},
        headers=headers,
    )
    assert hit.json()["correct"] is True
    words = client.post(
        "/api/words/events",
        json={"child_id": LUNA_ID, "book_id": BOAT_ID, "word": "Boat.", "kind": "tap"},
        headers=headers,
    )
    assert words.status_code == 200
    favorite = client.post(
        "/api/words/events",
        json={"child_id": LUNA_ID, "book_id": BOAT_ID, "word": "duck", "kind": "favorite"},
        headers=headers,
    )
    assert favorite.status_code == 200
    favs = client.get("/api/words/favorites", params={"child_id": LUNA_ID}, headers=headers)
    assert "duck" in {item["word"] for item in favs.json()["words"]}
    done = client.post("/api/reading/complete", json={"child_id": LUNA_ID, "book_id": BOAT_ID}, headers=headers)
    assert done.json()["stars_awarded"] == 4
    done_again = client.post("/api/reading/complete", json={"child_id": LUNA_ID, "book_id": BOAT_ID}, headers=headers)
    assert done_again.json()["stars_awarded"] == 0
    wav = b"RIFF$\x00\x00\x00WAVEfmt "
    recording = client.post(
        "/api/recordings",
        data={"child_id": LUNA_ID, "book_id": BOAT_ID, "page_number": 1, "duration_seconds": 1.5},
        files={"file": ("read.wav", wav, "audio/wav")},
        headers=headers,
    )
    assert recording.status_code == 200, recording.text
    assert recording.json()["stars_awarded"] == 3
    album = client.get("/api/recordings", params={"child_id": LUNA_ID}, headers=headers)
    assert len(album.json()["recordings"]) == 1
    overview = client.get("/api/parent/overview", headers=auth(parent["token"])).json()
    luna_row = next(child for child in overview["children"] if child["nickname"] == "Luna")
    assert luna_row["books_completed"] == 1
    assert any(item["word"] == "boat" for item in luna_row["word_heatmap"])
    assert luna_row["listen_seconds"] >= 4


def test_parent_can_add_a_book(client, parent):
    created = client.post(
        "/api/parent/books",
        json={
            "title": "A New Kitten",
            "subtitle": "新小猫",
            "level": "C",
            "blurb": "A tiny story.",
            "pages": [{"text": "The kitten is soft."}, {"text": "It naps in the sun."}],
        },
        headers=auth(parent["token"]),
    )
    assert created.status_code == 200, created.text
    book = client.get(f"/api/books/{created.json()['id']}", headers=auth(parent["token"]))
    assert book.status_code == 200
    assert book.json()["total_pages"] == 2
    assert "sequencer" in book.json()["activities"]


def test_pin_lockout(client, parent):
    reset_pin_failures()
    made = client.post(
        "/api/children",
        json={"nickname": "Noa", "pin": "9999", "avatar_key": "owl", "current_level": "A"},
        headers=auth(parent["token"]),
    )
    assert made.status_code == 200, made.text
    child_id = made.json()["id"]
    for _ in range(5):
        response = client.post("/api/auth/pin", json={"child_id": child_id, "pin": "0000"}, headers=auth(parent["token"]))
        assert response.status_code == 401
    locked = client.post("/api/auth/pin", json={"child_id": child_id, "pin": "9999"}, headers=auth(parent["token"]))
    assert locked.status_code == 429
