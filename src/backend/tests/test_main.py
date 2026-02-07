"""
Comprehensive tests for the photo-viewer backend API endpoints.
Tests all 6 endpoints in main.py plus end-to-end integration flows.
"""

import pytest
from datetime import datetime


class TestPresignUrl:
    """Tests for GET /api/photos/presign/ endpoint."""

    def test_presign_url_success(self, test_client, mock_s3):
        """Test successful presigned URL generation for upload."""
        mock_s3.generate_presigned_url.return_value = "https://s3.amazonaws.com/presigned-upload-url"

        response = test_client.get("/api/photos/presign/", params={"content_type": "image/jpeg"})

        assert response.status_code == 200
        data = response.json()
        assert "presign_url" in data
        assert "object_name" in data
        assert data["object_name"].endswith(".jpg")

    def test_presign_url_generates_unique_names(self, test_client, mock_s3):
        """Test that each presigned URL request generates a unique object name."""
        response1 = test_client.get("/api/photos/presign/", params={"content_type": "image/jpeg"})
        response2 = test_client.get("/api/photos/presign/", params={"content_type": "image/jpeg"})

        assert response1.json()["object_name"] != response2.json()["object_name"]

    def test_presign_url_s3_error(self, test_client, mock_s3):
        """Test handling of S3 errors during presigned URL generation."""
        mock_s3.generate_presigned_url.side_effect = Exception("S3 connection failed")

        response = test_client.get("/api/photos/presign/", params={"content_type": "image/jpeg"})

        assert response.status_code == 500
        assert "Could not generate presigned url" in response.json()["detail"]


class TestUploadPhoto:
    """Tests for POST /api/upload/ endpoint."""

    def test_upload_photo_success(self, test_client):
        """Test successful photo metadata upload."""
        response = test_client.post(
            "/api/upload/",
            data={
                "file_name": "test-photo.jpg",
                "tags": "summer,beach",
                "alt_text": "A beach photo"
            }
        )

        assert response.status_code == 200
        data = response.json()
        assert data["file_path"] == "test-photo.jpg"
        assert data["tags"] == "summer,beach"
        assert data["alt_text"] == "A beach photo"
        assert "id" in data

    def test_upload_photo_missing_file_name(self, test_client):
        """Test upload with missing file name."""
        response = test_client.post(
            "/api/upload/",
            data={
                "tags": "test",
                "alt_text": "Test"
            }
        )

        # The endpoint returns 500 because the outer exception handler catches
        # the HTTPException and wraps it
        assert response.status_code == 500
        assert "No file provided" in response.json()["detail"]

    def test_upload_photo_optional_fields(self, test_client):
        """Test upload with only required fields."""
        response = test_client.post(
            "/api/upload/",
            data={
                "file_name": "minimal-photo.jpg"
            }
        )

        assert response.status_code == 200
        data = response.json()
        assert data["file_path"] == "minimal-photo.jpg"
        assert data["tags"] is None
        assert data["alt_text"] is None


class TestGetAllWardrobeItems:
    """Tests for GET /api/wardrobe endpoint."""

    def test_get_wardrobe_empty(self, test_client):
        """Test getting wardrobe items when database is empty."""
        response = test_client.get("/api/wardrobe")

        assert response.status_code == 200
        data = response.json()
        assert data["items"] == []
        assert data["total"] == 0

    def test_get_wardrobe_with_items(self, test_client_with_photos):
        """Test getting wardrobe items with populated database."""
        response = test_client_with_photos.get("/api/wardrobe")

        assert response.status_code == 200
        data = response.json()
        assert data["total"] == 3
        assert len(data["items"]) == 3

    def test_get_wardrobe_response_structure(self, test_client_with_photos):
        """Test that wardrobe items have correct response structure."""
        response = test_client_with_photos.get("/api/wardrobe")

        assert response.status_code == 200
        data = response.json()
        item = data["items"][0]

        # Verify all expected fields are present
        assert "id" in item
        assert "file_path" in item
        assert "url" in item
        assert "upload_time" in item
        assert "tags" in item
        assert "alt_text" in item

    def test_get_wardrobe_pagination(self, test_client_with_photos):
        """Test pagination parameters."""
        response = test_client_with_photos.get("/api/wardrobe", params={"skip": 1, "limit": 2})

        assert response.status_code == 200
        data = response.json()
        assert data["skip"] == 1
        assert data["limit"] == 2
        assert len(data["items"]) == 2


class TestGetWardrobeItemById:
    """Tests for GET /api/wardrobe/{itemId} endpoint."""

    def test_get_item_by_id_success(self, test_client_with_photos):
        """Test getting a specific item by ID."""
        # First get all items to find a valid ID
        all_items = test_client_with_photos.get("/api/wardrobe").json()
        item_id = all_items["items"][0]["id"]

        response = test_client_with_photos.get(f"/api/wardrobe/{item_id}")

        assert response.status_code == 200
        data = response.json()
        assert data["id"] == item_id
        assert "url" in data
        assert "file_path" in data

    def test_get_item_by_id_not_found(self, test_client):
        """Test getting a non-existent item."""
        response = test_client.get("/api/wardrobe/99999")

        assert response.status_code == 404
        assert "not found" in response.json()["detail"].lower()

    def test_get_item_by_id_s3_error(self, test_client_with_photos, mock_s3):
        """Test handling S3 error when generating presigned URL for item."""
        # Get an item ID first
        all_items = test_client_with_photos.get("/api/wardrobe").json()
        item_id = all_items["items"][0]["id"]

        # Now make S3 fail for subsequent calls
        mock_s3.generate_presigned_url.side_effect = Exception("S3 error")

        response = test_client_with_photos.get(f"/api/wardrobe/{item_id}")

        assert response.status_code == 500
        assert "Failed to retrieve item" in response.json()["detail"]


class TestDeleteItem:
    """Tests for DELETE /api/wardrobe/items/{item_id} endpoint."""

    def test_delete_item_success(self, test_client_with_photos):
        """Test successful item deletion."""
        # Get an item to delete
        all_items = test_client_with_photos.get("/api/wardrobe").json()
        item_id = all_items["items"][0]["id"]

        response = test_client_with_photos.delete(f"/api/wardrobe/items/{item_id}")

        assert response.status_code == 200
        assert response.json()["id"] == item_id
        assert "deleted successfully" in response.json()["message"].lower()

    def test_delete_item_not_found(self, test_client):
        """Test deleting a non-existent item."""
        response = test_client.delete("/api/wardrobe/items/99999")

        assert response.status_code == 404
        assert "not found" in response.json()["detail"].lower()

    def test_delete_item_verify_deletion(self, test_client_with_photos):
        """Test that deleted item is actually removed from database."""
        # Get an item to delete
        all_items = test_client_with_photos.get("/api/wardrobe").json()
        item_id = all_items["items"][0]["id"]
        initial_count = all_items["total"]

        # Delete the item
        test_client_with_photos.delete(f"/api/wardrobe/items/{item_id}")

        # Verify item is gone
        get_response = test_client_with_photos.get(f"/api/wardrobe/{item_id}")
        assert get_response.status_code == 404

        # Verify count decreased
        updated_items = test_client_with_photos.get("/api/wardrobe").json()
        assert updated_items["total"] == initial_count - 1


class TestGetDeleteUrl:
    """Tests for GET /api/wardrobe/items/{item_id}/delete-url endpoint."""

    def test_get_delete_url_success(self, test_client_with_photos, mock_s3):
        """Test successful delete URL generation."""
        mock_s3.generate_presigned_url.return_value = "https://s3.amazonaws.com/delete-url"

        # Get an item ID
        all_items = test_client_with_photos.get("/api/wardrobe").json()
        item_id = all_items["items"][0]["id"]

        response = test_client_with_photos.get(f"/api/wardrobe/items/{item_id}/delete-url")

        assert response.status_code == 200
        assert "deleteUrl" in response.json()

    def test_get_delete_url_not_found(self, test_client):
        """Test getting delete URL for non-existent item."""
        response = test_client.get("/api/wardrobe/items/99999/delete-url")

        assert response.status_code == 404
        assert "not found" in response.json()["detail"].lower()


class TestEndToEndFlow:
    """End-to-end integration tests."""

    def test_upload_retrieve_list_flow(self, test_client, mock_s3):
        """Test complete flow: upload photo metadata, retrieve it, verify in list."""
        # Step 1: Upload photo metadata
        upload_response = test_client.post(
            "/api/upload/",
            data={
                "file_name": "e2e-test-photo.jpg",
                "tags": "test,e2e",
                "alt_text": "End to end test photo"
            }
        )
        assert upload_response.status_code == 200
        photo_id = upload_response.json()["id"]

        # Step 2: Retrieve the photo by ID
        get_response = test_client.get(f"/api/wardrobe/{photo_id}")
        assert get_response.status_code == 200
        data = get_response.json()
        assert data["file_path"] == "e2e-test-photo.jpg"
        assert data["tags"] == "test,e2e"

        # Step 3: Verify it appears in the wardrobe list
        list_response = test_client.get("/api/wardrobe")
        assert list_response.status_code == 200
        items = list_response.json()["items"]
        assert any(item["id"] == photo_id for item in items)

    def test_upload_delete_verify_flow(self, test_client, mock_s3):
        """Test upload then delete flow with verification."""
        # Upload
        upload_response = test_client.post(
            "/api/upload/",
            data={"file_name": "delete-me.jpg"}
        )
        photo_id = upload_response.json()["id"]

        # Verify it exists
        get_response = test_client.get(f"/api/wardrobe/{photo_id}")
        assert get_response.status_code == 200

        # Delete
        delete_response = test_client.delete(f"/api/wardrobe/items/{photo_id}")
        assert delete_response.status_code == 200

        # Verify deleted
        verify_response = test_client.get(f"/api/wardrobe/{photo_id}")
        assert verify_response.status_code == 404


class TestDatabaseModel:
    """Tests for the Photos database model."""

    def test_photos_model_fields(self, db_session):
        """Test that Photos model has all required fields."""
        from .. import models

        photo = models.Photos(
            file_path="model-test.jpg",
            upload_time=datetime.now(),
            tags="tag1,tag2",
            alt_text="Model test photo"
        )
        db_session.add(photo)
        db_session.commit()

        assert photo.id is not None
        assert photo.file_path == "model-test.jpg"
        assert photo.tags == "tag1,tag2"
        assert photo.alt_text == "Model test photo"
        assert photo.upload_time is not None

    def test_photos_model_nullable_fields(self, db_session):
        """Test that optional fields can be null."""
        from .. import models

        photo = models.Photos(
            file_path="nullable-test.jpg",
            upload_time=datetime.now(),
            tags=None,
            alt_text=None
        )
        db_session.add(photo)
        db_session.commit()

        assert photo.id is not None
        assert photo.tags is None
        assert photo.alt_text is None
