import os
import logging
import json
import asyncio
import time
from pydantic import BaseModel, Field
from google import generativeai as genai
from google.api_core import exceptions as google_exceptions
from app.core.config import get_settings

logger = logging.getLogger(__name__)
settings = get_settings()

# Custom Exception Classes (Task 6)
class GeminiError(Exception):
    """Base exception for Gemini service errors."""
    pass

class GeminiAuthError(GeminiError):
    """Authentication or invalid API key error."""
    pass

class GeminiPermissionError(GeminiError):
    """Permission or access denied error."""
    pass

class GeminiQuotaError(GeminiError):
    """Quota or rate limit exceeded error."""
    pass

class GeminiTimeoutError(GeminiError):
    """Timeout error."""
    pass

class GeminiNetworkError(GeminiError):
    """Network connection or service unavailable error."""
    pass

class GeminiModelError(GeminiError):
    """Invalid or unsupported model name error."""
    pass

class GeminiParseError(GeminiError):
    """JSON parsing or schema validation error."""
    pass

class GeminiSDKError(GeminiError):
    """General Google API SDK error."""
    pass

class GeminiUnexpectedError(GeminiError):
    """Unexpected system error."""
    pass


# Pydantic Response Schema (Task 8)
class GeminiClinicalResponse(BaseModel):
    reply: str = Field(
        description="A compassionate, user-friendly response text answering the user's message directly."
    )
    risk_level: str = Field(
        description="LOW, MEDIUM, or HIGH based on symptoms"
    )
    urgency: str = Field(
        description="Monitor, Within 24h, or Immediate"
    )
    possible_conditions: list[str] = Field(
        description="List of possible medical conditions"
    )
    extracted_symptoms: list[str] = Field(
        description="List of symptoms mentioned by the user"
    )
    condition_explanation: str = Field(
        description="A brief explanation of what these symptoms could mean, without certain diagnosis."
    )
    home_care_advice: list[str] = Field(
        description="List of practical home care steps"
    )
    warning_signs: list[str] = Field(
        description="Symptoms that indicate the condition is worsening"
    )
    emergency_symptoms: list[str] = Field(
        description="Symptoms that require immediate emergency care"
    )
    recommended_tests: list[str] = Field(
        description="Suggested medical tests to discuss with a doctor"
    )
    recommended_specialist: str | None = Field(
        description="Cardiologist, General Physician, Dermatologist, Orthopedic, Neurologist, Pediatrician, Gynecologist, Psychiatrist, or null"
    )
    recommended_department: str | None = Field(
        description="Cardiology, General Medicine, Dermatology, Orthopedics, Neurology, Pediatrics, Gynecology, Psychiatry, or null"
    )
    should_see_doctor: bool = Field(
        description="True if risk_level is MEDIUM or HIGH, or doctor is recommended"
    )
    suggested_followup_questions: list[str] = Field(
        description="2-3 short, relevant follow-up questions"
    )
    medical_disclaimer: str = Field(
        description="Standard medical disclaimer."
    )


SYSTEM_PROMPT = """You are CarePlus AI Medical Assistant, a compassionate healthcare virtual assistant.
Your goal is to provide general healthcare guidance based on the user's symptoms and health profile.

Follow these strict guidelines:
1. Provide general healthcare guidance.
2. Do not diagnose with certainty.
3. Recommend home care when appropriate.
4. Recommend consulting a doctor for persistent symptoms.
5. Recommend emergency care for severe symptoms.
6. Never prescribe medications.
7. Always include a medical disclaimer.
8. Keep response 'reply' concise, easy to understand, and compassionate.
"""


class GeminiService:
    def __init__(self) -> None:
        self.api_key = settings.google_api_key or os.getenv("GEMINI_API_KEY") or os.getenv("GOOGLE_API_KEY")
        # Task 3: Default to currently supported stable model
        self.model_name = "gemini-2.5-flash"
        self._configured = False
        self._init_client()

    def _init_client(self) -> None:
        # Task 2: Print key verification (first 6 characters only)
        if self.api_key and not self.api_key.startswith("your_gemini"):
            try:
                genai.configure(api_key=self.api_key)
                self._configured = True
                logger.info(f"Gemini client configured successfully using key: {self.api_key[:6]}...")
            except Exception as e:
                logger.exception("Failed to configure Gemini client.")
                self._configured = False
        else:
            logger.warning("GOOGLE_API_KEY / GEMINI_API_KEY not found or is default placeholder.")
            self._configured = False

    async def generate_chat_response(
        self,
        message: str,
        history: list[dict] | None = None,
        profile_context: str | None = None
    ) -> dict:
        """
        Sends the message and history to Gemini and parses the structured response.
        Enforces Pydantic schema validation using response_schema.
        """
        if not self._configured:
            # Try to configure again in case env was updated
            self.api_key = settings.google_api_key or os.getenv("GEMINI_API_KEY") or os.getenv("GOOGLE_API_KEY")
            self._init_client()
            
        if not self._configured:
            logger.error("Attempted to call Gemini but API key is not configured.")
            raise GeminiAuthError("Gemini API key is not configured. Please set GEMINI_API_KEY or GOOGLE_API_KEY.")

        # Log incoming request (Task 7)
        logger.info(f"Incoming Request - Message: '{message}', Profile Context Present: {bool(profile_context)}")
        
        # Build prompt with profile context
        user_prompt = ""
        if profile_context:
            user_prompt += f"{profile_context}\n\n"
        
        user_prompt += f"User message: {message}\n"

        # Format history for Gemini chat if present
        contents = []
        if history:
            for item in history:
                role = "user" if item.get("role") == "user" else "model"
                content_text = item.get("content") or item.get("message") or ""
                # If content_text is JSON, extract reply to avoid confusing the context
                if role == "model":
                    try:
                        parsed = json.loads(content_text)
                        content_text = parsed.get("reply") or content_text
                    except Exception:
                        pass
                
                if content_text:
                    contents.append({
                        "role": role,
                        "parts": [{"text": content_text}]
                    })
        
        contents.append({
            "role": "user",
            "parts": [{"text": user_prompt}]
        })

        # Log Prompt sent to Gemini (Task 7)
        logger.debug(f"Prompt sent to Gemini: {user_prompt}")

        # Retry configuration
        max_retries = 3
        timeout_seconds = 10.0
        backoff_delay = 1.0

        for attempt in range(max_retries):
            try:
                # Task 4: Ensure configure is done before model creation (done in _init_client/init)
                model = genai.GenerativeModel(
                    model_name=self.model_name,
                    system_instruction=SYSTEM_PROMPT
                )
                
                # Generation configuration with response_schema (Task 8)
                generation_config = {
                    "response_mime_type": "application/json",
                    "response_schema": GeminiClinicalResponse
                }

                logger.info(f"Calling Gemini API '{self.model_name}' (attempt {attempt + 1}/{max_retries})...")
                
                start_time = time.perf_counter()
                
                # Call model with executor for async support (Task 5)
                loop = asyncio.get_event_loop()
                response = await asyncio.wait_for(
                    loop.run_in_executor(
                        None,
                        lambda: model.generate_content(
                            contents,
                            generation_config=generation_config
                        )
                    ),
                    timeout=timeout_seconds
                )

                latency = time.perf_counter() - start_time

                # Log Latency and Raw Response (Task 7)
                logger.info(f"Received Gemini response. Latency: {latency:.3f}s")
                logger.debug(f"Raw Gemini response: {response.text}")

                if response and response.text:
                    raw_text = response.text.strip()
                    try:
                        # Parse and validate against Pydantic schema (Task 8)
                        parsed_response = GeminiClinicalResponse.model_validate_json(raw_text)
                        
                        # Extract token usage if available
                        prompt_tokens = 0
                        candidate_tokens = 0
                        if hasattr(response, "usage_metadata") and response.usage_metadata:
                            prompt_tokens = response.usage_metadata.prompt_token_count
                            candidate_tokens = response.usage_metadata.candidates_token_count
                        
                        # Task 7 logging
                        logger.info(
                            f"Successfully parsed Gemini response. "
                            f"Tokens: prompt={prompt_tokens}, candidate={candidate_tokens}"
                        )
                        
                        return parsed_response.model_dump()
                        
                    except json.JSONDecodeError as jde:
                        logger.error(f"JSON decode failed for raw response: {raw_text}")
                        raise GeminiParseError("Gemini did not return valid JSON.") from jde
                    except Exception as ve:
                        logger.error(f"Pydantic schema validation failed: {ve}")
                        raise GeminiParseError("Response failed to match required schema.") from ve
                else:
                    raise GeminiSDKError("Empty response text received from Gemini.")

            # Exception Catching & Translation (Task 6)
            except google_exceptions.Unauthenticated as e:
                logger.error(f"Gemini Auth Error (Unauthenticated): {e}")
                raise GeminiAuthError("Invalid Gemini API Key or authentication failed.") from e
            except google_exceptions.PermissionDenied as e:
                logger.error(f"Gemini Permission Error (PermissionDenied): {e}")
                raise GeminiPermissionError("Permission denied accessing Gemini API.") from e
            except google_exceptions.ResourceExhausted as e:
                logger.error(f"Gemini Quota Error (ResourceExhausted): {e}")
                # Task 15 quota handling
                raise GeminiQuotaError("AI service quota exceeded. Please try again later.") from e
            except (google_exceptions.DeadlineExceeded, asyncio.TimeoutError) as e:
                logger.warning(f"Gemini Timeout Error on attempt {attempt + 1}: {e}")
                if attempt == max_retries - 1:
                    raise GeminiTimeoutError("AI service request timed out.") from e
            except google_exceptions.ServiceUnavailable as e:
                logger.warning(f"Gemini Network Error (ServiceUnavailable) on attempt {attempt + 1}: {e}")
                if attempt == max_retries - 1:
                    raise GeminiNetworkError("AI service is currently offline or unreachable.") from e
            except google_exceptions.NotFound as e:
                logger.error(f"Gemini Model/Resource Not Found: {e}")
                raise GeminiModelError(f"AI model '{self.model_name}' was not found or is unsupported.") from e
            except google_exceptions.InvalidArgument as e:
                logger.error(f"Gemini Invalid Argument: {e}")
                raise GeminiSDKError("Invalid payload configuration sent to Gemini.") from e
            except google_exceptions.GoogleAPICallError as e:
                logger.error(f"Gemini SDK Call Error: {e}")
                raise GeminiSDKError("An error occurred during Gemini SDK execution.") from e
            except GeminiError:
                # Re-raise parsed/validation/auth errors directly
                raise
            except Exception as e:
                logger.error(f"Unexpected error calling Gemini on attempt {attempt + 1}: {e}")
                if attempt == max_retries - 1:
                    raise GeminiUnexpectedError("An unexpected error occurred in the AI service.") from e

            # Linear backoff before retry
            await asyncio.sleep(backoff_delay)
            backoff_delay *= 2

        raise GeminiUnexpectedError("AI service failed to respond after multiple retries.")


gemini_service = GeminiService()
