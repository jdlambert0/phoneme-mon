"""Backend tests for Phoneme-Mon v2 API: health, scores, rooms"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

class TestHealth:
    """Health check endpoint"""
    def test_root_returns_phonemon_message(self):
        res = requests.get(f"{BASE_URL}/api/")
        assert res.status_code == 200
        data = res.json()
        assert 'message' in data
        assert 'phonemon' in data['message'].lower() or 'Phoneme' in data['message']

class TestScores:
    """Score CRUD tests"""
    created_id = None

    def test_post_score(self):
        payload = {"player_title": "TEST_Tester", "personality": "rival", "rounds_won": 3, "rounds_lost": 1}
        res = requests.post(f"{BASE_URL}/api/scores", json=payload)
        assert res.status_code == 200
        data = res.json()
        assert data['player_title'] == 'TEST_Tester'
        assert data['personality'] == 'rival'
        assert data['rounds_won'] == 3
        assert 'id' in data

    def test_get_scores(self):
        res = requests.get(f"{BASE_URL}/api/scores")
        assert res.status_code == 200
        data = res.json()
        assert isinstance(data, list)
        # Should have at least the score we just posted
        titles = [s['player_title'] for s in data]
        assert any('TEST_Tester' in t for t in titles)

class TestRooms:
    """Room creation and existence check"""
    room_code = None

    def test_create_room(self):
        res = requests.post(f"{BASE_URL}/api/rooms")
        assert res.status_code == 200
        data = res.json()
        assert 'room_code' in data
        assert len(data['room_code']) == 5
        assert data['role'] == 'host'
        TestRooms.room_code = data['room_code']

    def test_room_exists_valid(self):
        assert TestRooms.room_code, "Need valid room code from test_create_room"
        res = requests.get(f"{BASE_URL}/api/rooms/{TestRooms.room_code}/exists")
        assert res.status_code == 200
        data = res.json()
        assert data['exists'] is True

    def test_room_exists_invalid(self):
        res = requests.get(f"{BASE_URL}/api/rooms/ZZZZZ/exists")
        assert res.status_code == 200
        data = res.json()
        assert data['exists'] is False
