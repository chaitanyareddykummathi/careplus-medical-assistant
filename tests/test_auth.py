import sys
import os

os.environ["APP_ENV"] = "test"

# Adjust sys.path so app can be imported
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..', 'backend')))

import unittest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session
from app.main import app
from app.db.deps import get_db
from app.db.session import SessionLocal
from app.models.user import User

client = TestClient(app)

class TestAuthFlow(unittest.TestCase):
    def setUp(self):
        # Ensure we have a database session
        self.db: Session = SessionLocal()
        # Clean up any previous test user
        self.cleanup_users()

    def tearDown(self):
        self.cleanup_users()
        self.db.close()

    def cleanup_users(self):
        emails = [
            "test_auth_flow@example.com",
            "google_linked_test@example.com",
            "google_only_test@example.com"
        ]
        for email in emails:
            user = self.db.query(User).filter(User.email == email).first()
            if user:
                self.db.delete(user)
        self.db.commit()

    def test_complete_auth_flow(self):
        # 1. Register unverified user
        register_payload = {
            "name": "Auth Flow User",
            "email": "test_auth_flow@example.com",
            "password": "SecurePassword123!",
            "confirm_password": "SecurePassword123!",
            "username": "auth_flow_test"
        }
        res = client.post("/api/v1/auth/register", json=register_payload)
        self.assertEqual(res.status_code, 201)
        data = res.json()
        self.assertTrue(data["success"])
        self.assertIn("verification_token", data)
        token = data["verification_token"]

        # Assert user was created in DB with email_verified = False, is_active = False
        user = self.db.query(User).filter(User.email == "test_auth_flow@example.com").first()
        self.assertIsNotNone(user)
        self.assertFalse(user.email_verified)
        self.assertFalse(user.is_active)

        # 2. Attempt login (should block since unverified)
        login_payload = {
            "identifier": "test_auth_flow@example.com",
            "password": "SecurePassword123!"
        }
        res = client.post("/api/v1/auth/login", json=login_payload)
        self.assertEqual(res.status_code, 403)
        self.assertEqual(res.json()["errors"][0]["code"], "EMAIL_NOT_VERIFIED")

        # 3. Resend verification
        res = client.post("/api/v1/auth/resend-verification", json={"email": "test_auth_flow@example.com"})
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertTrue(data["success"])
        new_token = data["verification_token"]
        self.assertIsNotNone(new_token)

        # 4. Verify email using the token
        res = client.post("/api/v1/auth/verify-email", json={"token": new_token})
        self.assertEqual(res.status_code, 200)
        self.assertTrue(res.json()["success"])

        # Check DB states updated
        self.db.refresh(user)
        self.assertTrue(user.email_verified)
        self.assertTrue(user.is_active)

        # 5. Login works now
        res = client.post("/api/v1/auth/login", json=login_payload)
        self.assertEqual(res.status_code, 200)
        login_data = res.json()
        self.assertTrue(login_data["success"])
        access_token = login_data["data"]["access_token"]
        self.assertIsNotNone(access_token)

        # 6. Forgot Password (Case 1: Standard email user sends email)
        res = client.post("/api/v1/auth/forgot-password", json={"email": "test_auth_flow@example.com"})
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertTrue(data["success"])
        reset_token = data["reset_token"]
        self.assertIsNotNone(reset_token)

        # 7. Reset Password
        reset_payload = {
            "token": reset_token,
            "password": "NewSecurePassword123!",
            "confirm_password": "NewSecurePassword123!"
        }
        res = client.post("/api/v1/auth/reset-password", json=reset_payload)
        self.assertEqual(res.status_code, 200)
        self.assertTrue(res.json()["success"])

        # Verify old password fails and new password works
        res = client.post("/api/v1/auth/login", json={
            "identifier": "test_auth_flow@example.com",
            "password": "SecurePassword123!"
        })
        self.assertEqual(res.status_code, 401)

        res = client.post("/api/v1/auth/login", json={
            "identifier": "test_auth_flow@example.com",
            "password": "NewSecurePassword123!"
        })
        self.assertEqual(res.status_code, 200)

    def test_google_linking_and_hybrid_transitions(self):
        # 1. Create a user who registered with email first
        pwd_user = User(
            name="Google Link User",
            email="google_linked_test@example.com",
            username="google_linked_test",
            hashed_password="hashedpassword123",
            is_google_user=False,
            role="patient",
            is_active=True,
            email_verified=True
        )
        self.db.add(pwd_user)
        self.db.commit()

        # Mock google login using Jose JWT get_unverified_claims decode mock fallback.
        from jose import jwt as jose_jwt
        mock_claims = {
            "email": "google_linked_test@example.com",
            "name": "Google Link User",
            "given_name": "Google"
        }
        mock_token = jose_jwt.encode(mock_claims, "mock_secret", algorithm="HS256")

        # Call google login -> Should find existing user and link without creating duplicate
        res = client.post("/api/v1/auth/google", json={"token": mock_token})
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertTrue(data["success"])
        
        # Verify user in database is now marked as google user but keeps password (hybrid user)
        self.db.refresh(pwd_user)
        self.assertTrue(pwd_user.is_google_user)
        self.assertIsNotNone(pwd_user.hashed_password)
        self.assertTrue(data["data"]["user"]["has_password"])

        # Forgot Password (Case 3: Hybrid user) -> Should allow forgot password normally
        res = client.post("/api/v1/auth/forgot-password", json={"email": "google_linked_test@example.com"})
        self.assertEqual(res.status_code, 200)
        self.assertTrue(res.json()["success"])

        # 2. Google-Only user creation
        mock_claims_only = {
            "email": "google_only_test@example.com",
            "name": "Google Only User",
            "given_name": "GoogleOnly"
        }
        mock_token_only = jose_jwt.encode(mock_claims_only, "mock_secret", algorithm="HS256")
        
        res = client.post("/api/v1/auth/google", json={"token": mock_token_only})
        self.assertEqual(res.status_code, 200)
        data_only = res.json()
        self.assertTrue(data_only["success"])
        access_token_only = data_only["data"]["access_token"]
        
        # Verify in DB: is_google_user = True, hashed_password = None
        user_only_db = self.db.query(User).filter(User.email == "google_only_test@example.com").first()
        self.assertIsNotNone(user_only_db)
        self.db.refresh(user_only_db)
        self.assertTrue(user_only_db.is_google_user)
        self.assertIsNone(user_only_db.hashed_password)
        self.assertFalse(data_only["data"]["user"]["has_password"])

        # Forgot Password (Case 2: Google-only user) -> Should raise GOOGLE_ACCOUNT_ONLY error
        res = client.post("/api/v1/auth/forgot-password", json={"email": "google_only_test@example.com"})
        self.assertEqual(res.status_code, 400)
        self.assertEqual(res.json()["errors"][0]["code"], "GOOGLE_ACCOUNT_ONLY")

        # 3. Google-Only user sets password (hybrid transition)
        headers = {"Authorization": f"Bearer {access_token_only}"}
        res = client.post(
            "/api/v1/auth/set-password", 
            json={"password": "GoogleUserNewPassword123!", "confirm_password": "GoogleUserNewPassword123!"},
            headers=headers
        )
        self.assertEqual(res.status_code, 200)
        self.assertTrue(res.json()["success"])

        # Verify now has_password = True in DB
        self.db.refresh(user_only_db)
        self.assertIsNotNone(user_only_db.hashed_password)

        # Verify password login works now
        res = client.post("/api/v1/auth/login", json={
            "identifier": "google_only_test@example.com",
            "password": "GoogleUserNewPassword123!"
        })
        self.assertEqual(res.status_code, 200)
        self.assertTrue(res.json()["success"])

        # 4. Change Password
        res = client.post(
            "/api/v1/auth/change-password",
            json={
                "current_password": "GoogleUserNewPassword123!",
                "new_password": "ChangedPassword999!",
                "confirm_password": "ChangedPassword999!"
            },
            headers=headers
        )
        self.assertEqual(res.status_code, 200)
        self.assertTrue(res.json()["success"])

        # Verify login with new changed password
        res = client.post("/api/v1/auth/login", json={
            "identifier": "google_only_test@example.com",
            "password": "ChangedPassword999!"
        })
        self.assertEqual(res.status_code, 200)
        self.assertTrue(res.json()["success"])

if __name__ == '__main__':
    unittest.main()
