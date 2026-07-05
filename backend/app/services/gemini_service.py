import os
import logging
import json
import asyncio
from google import generativeai as genai
from app.core.config import get_settings

logger = logging.getLogger(__name__)
settings = get_settings()

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

You MUST respond ONLY with a JSON object containing the following keys:
{
  "reply": "A compassionate, user-friendly response text answering the user's message directly.",
  "risk_level": "LOW", "MEDIUM", or "HIGH" (based on symptoms),
  "urgency": "Monitor", "Within 24h", or "Immediate",
  "possible_conditions": ["list of possible conditions"],
  "extracted_symptoms": ["list of symptoms mentioned by the user"],
  "condition_explanation": "A brief explanation of what these symptoms could mean, without certain diagnosis.",
  "home_care_advice": ["list of practical home care steps"],
  "warning_signs": ["symptoms that indicate the condition is worsening"],
  "emergency_symptoms": ["symptoms that require immediate emergency care"],
  "recommended_tests": ["suggested medical tests to discuss with a doctor"],
  "recommended_specialist": "Cardiologist", "General Physician", "Dermatologist", "Orthopedic", "Neurologist", "Pediatrician", "Gynecologist", "Psychiatrist", or null (if no doctor is needed),
  "recommended_department": "Cardiology", "General Medicine", "Dermatology", "Orthopedics", "Neurology", "Pediatrics", "Gynecology", "Psychiatry", or null (if no doctor is needed),
  "should_see_doctor": true or false (true if risk_level is MEDIUM or HIGH, or doctor is recommended),
  "suggested_followup_questions": ["2-3 short, relevant follow-up questions the user might ask next about their symptoms or recommendations"],
  "medical_disclaimer": "Standard medical disclaimer."
}
Do not include any markdown formatting like ```json or comments outside the JSON. Return only the raw JSON object.
"""

class GeminiService:
    def __init__(self) -> None:
        self.api_key = settings.google_api_key or os.getenv("GOOGLE_API_KEY")
        self.model_name = "gemini-3.5-flash"
        self._configured = False
        self._init_client()

    def _init_client(self) -> None:
        if self.api_key and not self.api_key.startswith("your_gemini"):
            try:
                genai.configure(api_key=self.api_key)
                self._configured = True
                logger.info("Gemini client configured successfully.")
            except Exception as e:
                logger.exception("Failed to configure Gemini client.")
        else:
            logger.warning("GOOGLE_API_KEY not found or is default placeholder. Gemini client running in mock fallback mode.")

    def _get_mock_response(self, message: str) -> dict:
        """
        Generates a mock structured response for testing without a real API key.
        """
        msg_lower = message.lower()
        if "chest" in msg_lower or "heart" in msg_lower or "cardiac" in msg_lower:
            return {
                "reply": "I am concerned about your chest symptoms. Chest pain can be a sign of a serious cardiovascular issue. Please sit down, rest, and read the disclaimer and guidelines on the right. If you feel severe crushing pain, radiating pain, or shortness of breath, please seek emergency care immediately.",
                "risk_level": "HIGH",
                "urgency": "Immediate",
                "possible_conditions": ["Angina", "Myocardial Infarction", "Acid Reflux"],
                "extracted_symptoms": ["chest pain"],
                "condition_explanation": "Chest discomfort can arise from reduced oxygen delivery to the heart muscle (ischemia) or other cardiopulmonary reasons.",
                "home_care_advice": ["Sit upright and rest immediately.", "Avoid any physical exertion.", "Loosen tight clothing."],
                "warning_signs": ["Pain spreading to left arm, neck, jaw, or back", "Dizziness or fainting"],
                "emergency_symptoms": ["Severe crushing chest pain", "Sweating, nausea, or shortness of breath"],
                "recommended_tests": ["12-lead Electrocardiogram (ECG)", "Serum Troponin Test", "Chest X-ray"],
                "recommended_specialist": "Cardiologist",
                "recommended_department": "Cardiology",
                "should_see_doctor": True,
                "suggested_followup_questions": ["What tests will the cardiologist run?", "How is cardiac angina treated?", "What are emergency signs of a heart attack?"],
                "medical_disclaimer": "This is general medical guidance, not a diagnosis. Please consult a doctor immediately."
            }
        elif "fever" in msg_lower or "cough" in msg_lower or "throat" in msg_lower or "temperature" in msg_lower:
            return {
                "reply": "You described experiencing symptoms like fever or cough. These are typical symptoms of respiratory viral or bacterial infections (e.g. flu or common cold). I recommend resting, drinking fluids, and monitoring your temperature. If the symptoms persist beyond 3 days, please see a physician.",
                "risk_level": "MEDIUM",
                "urgency": "Within 24h",
                "possible_conditions": ["Influenza (Flu)", "Acute Bronchitis", "Common Cold"],
                "extracted_symptoms": ["fever", "cough"],
                "condition_explanation": "Fever is the body's natural response to infections. Combined with a cough, it points to inflammation in the respiratory passages.",
                "home_care_advice": ["Drink plenty of warm fluids.", "Get at least 8 hours of rest.", "Use paracetamol for high temperature if appropriate."],
                "warning_signs": ["Fever above 103°F (39.4°C)", "Cough producing thick yellow/green phlegm"],
                "emergency_symptoms": ["Shortness of breath or rapid breathing", "Chest pain when breathing"],
                "recommended_tests": ["Complete Blood Count (CBC)", "Sputum Culture (if advised)"],
                "recommended_specialist": "General Physician",
                "recommended_department": "General Medicine",
                "should_see_doctor": True,
                "suggested_followup_questions": ["When should I take fever reducers?", "Is acute bronchitis contagious?", "How much water should I drink?"],
                "medical_disclaimer": "This is general medical guidance, not a diagnosis. Please consult a doctor."
            }
        else:
            return {
                "reply": "Hello! I am your CarePlus AI Medical Assistant. Please describe your symptoms naturally (e.g., mention severity and duration), and I will provide structured triage guidance.",
                "risk_level": "LOW",
                "urgency": "Monitor",
                "possible_conditions": [],
                "extracted_symptoms": [],
                "condition_explanation": "No medical conditions matching standard triage profiles were detected.",
                "home_care_advice": ["Rest and stay hydrated.", "Monitor symptoms over the next 24-48 hours."],
                "warning_signs": ["New symptoms developing", "Existing symptoms worsening"],
                "emergency_symptoms": ["Sudden severe pain", "Difficulty breathing", "Loss of consciousness"],
                "recommended_tests": ["Basic health checkup if symptoms persist"],
                "recommended_specialist": "General Physician",
                "recommended_department": "General Medicine",
                "should_see_doctor": False,
                "suggested_followup_questions": ["How can I check my heart rate?", "What are signs of low blood pressure?", "Can you explain the triage risk levels?"],
                "medical_disclaimer": "This is general medical guidance, not a diagnosis."
            }

    async def generate_chat_response(
        self,
        message: str,
        history: list[dict] | None = None,
        profile_context: str | None = None
    ) -> dict:
        """
        Sends the message and history to Gemini and parses the structured response.
        """
        if not self._configured:
            # Try to configure again in case env was updated
            self.api_key = settings.google_api_key or os.getenv("GOOGLE_API_KEY")
            self._init_client()
            
        if not self._configured:
            logger.info("Using mock fallback response due to unconfigured Gemini API key.")
            await asyncio.sleep(0.5)  # simulate network latency
            return self._get_mock_response(message)

        # Build prompt with profile context
        user_prompt = ""
        if profile_context:
            user_prompt += f"{profile_context}\n\n"
        
        user_prompt += f"User message: {message}\n"

        # Format history for Gemini chat if present
        # Gemini API expects format: [{'role': 'user'|'model', 'parts': [{'text': ...}]}]
        contents = []
        if history:
            for item in history:
                role = "user" if item.get("role") == "user" else "model"
                content_text = item.get("content") or item.get("message") or ""
                # If content_text is JSON (like old bot messages), we extract the reply
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

        # Retry configuration
        max_retries = 3
        timeout_seconds = 10.0
        backoff_delay = 1.0

        for attempt in range(max_retries):
            try:
                model = genai.GenerativeModel(
                    model_name=self.model_name,
                    system_instruction=SYSTEM_PROMPT
                )
                
                # generation_config to ensure JSON output
                generation_config = {
                    "response_mime_type": "application/json"
                }

                logger.info(f"Calling Gemini API (attempt {attempt + 1}/{max_retries})...")
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

                if response and response.text:
                    try:
                        parsed_response = json.loads(response.text.strip())
                        logger.info("Successfully received and parsed Gemini response.")
                        return parsed_response
                    except json.JSONDecodeError:
                        logger.warning("Gemini did not return valid JSON. Attempting fallback parse.")
                        # Fallback parsing
                        text = response.text.strip()
                        # Strip markdown if it was returned despite instructions
                        if text.startswith("```"):
                            lines = text.split("\n")
                            if lines[0].startswith("```json") or lines[0].startswith("```"):
                                lines = lines[1:-1]
                            text = "\n".join(lines).strip()
                        try:
                            return json.loads(text)
                        except Exception:
                            logger.error(f"Fallback parse failed. Raw response: {response.text}")
                            raise ValueError("Invalid JSON format from AI model.")
                else:
                    raise ValueError("Empty response text from Gemini.")

            except asyncio.TimeoutError as e:
                logger.warning(f"Gemini call timed out on attempt {attempt + 1}")
                if attempt == max_retries - 1:
                    raise RuntimeError("AI service request timed out.") from e
            except Exception as e:
                logger.warning(f"Gemini call failed on attempt {attempt + 1}: {e}")
                if attempt == max_retries - 1:
                    raise RuntimeError("AI service is temporarily unavailable.") from e

            await asyncio.sleep(backoff_delay)
            backoff_delay *= 2

        raise RuntimeError("AI service is temporarily unavailable.")

gemini_service = GeminiService()
