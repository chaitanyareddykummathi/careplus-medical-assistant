import logging
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from pydantic import BaseModel

from app.api.deps.auth import require_roles
from app.db.deps import get_db
from app.models.user import User
from app.repositories.health_profile_repository import health_profile_repository
from app.services.gemini_service import (
    gemini_service,
    GeminiAuthError,
    GeminiQuotaError,
    GeminiTimeoutError,
    GeminiNetworkError
)
from app.services.hospital_service import hospital_service

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/chat", tags=["Chat"])

class ChatMessage(BaseModel):
    role: str # "user" or "model"
    content: str

class ChatRequest(BaseModel):
    message: str
    history: list[ChatMessage] | None = None

class DoctorRecommendation(BaseModel):
    name: str
    specialty: str
    department: str
    hospital: str
    hospital_id: str
    doctor_id: str
    experience_years: int

class ChatResponse(BaseModel):
    reply: str
    risk_level: str | None = None
    urgency: str | None = None
    possible_conditions: list[str] | None = None
    extracted_symptoms: list[str] | None = None
    condition_explanation: str | None = None
    home_care_advice: list[str] | None = None
    warning_signs: list[str] | None = None
    emergency_symptoms: list[str] | None = None
    recommended_tests: list[str] | None = None
    recommended_specialist: str | None = None
    recommended_department: str | None = None
    should_see_doctor: bool | None = None
    medical_disclaimer: str | None = None
    nearby_specialists: list[DoctorRecommendation] | None = None
    suggested_followup_questions: list[str] | None = None

import json
from datetime import datetime, timezone
from pydantic import ConfigDict
from app.models.chat_message import ChatMessage

class ChatMessageResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    user_id: int
    role: str
    content: str
    created_at: datetime

@router.get("/history", response_model=list[ChatMessageResponse])
def get_chat_history(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles("patient", "clinician", "admin")),
) -> list[ChatMessageResponse]:
    """
    Retrieve user chat history.
    """
    return (
        db.query(ChatMessage)
        .filter(ChatMessage.user_id == current_user.id)
        .order_by(ChatMessage.created_at.asc())
        .limit(50)
        .all()
    )

@router.post("", response_model=ChatResponse)
async def chat_with_gemini(
    payload: ChatRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles("patient", "clinician", "admin")),
) -> ChatResponse:
    """
    Receive user message, build history, fetch health profile context,
    call Gemini API, suggest matching doctors, and return parsed response.
    """
    user_msg = payload.message.strip()
    if not user_msg:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Message cannot be empty."
        )

    # 1. Save user message to database
    try:
        user_message_db = ChatMessage(
            user_id=current_user.id,
            role="user",
            content=user_msg,
            created_at=datetime.now(timezone.utc)
        )
        db.add(user_message_db)
        db.commit()
    except Exception as e:
        logger.error(f"Failed to save user chat message: {e}")
        db.rollback()

    # 2. Fetch Health Profile context
    profile_context = ""
    try:
        health_profile = health_profile_repository.get_profile_by_user(db=db, user_id=current_user.id)
        if health_profile:
            conditions = ", ".join(health_profile.existing_conditions) if health_profile.existing_conditions else "None"
            profile_context = (
                f"[User Health Profile Context]\n"
                f"- Age: {health_profile.age}\n"
                f"- Gender: {health_profile.gender}\n"
                f"- Height: {health_profile.height_cm} cm\n"
                f"- Weight: {health_profile.weight_kg} kg\n"
                f"- Blood Pressure: {health_profile.blood_pressure or 'N/A'}\n"
                f"- Known Conditions: {conditions}"
            )
    except Exception as e:
        logger.warning(f"Failed to fetch health profile for user {current_user.id}: {e}")

    # 3. Convert payload history to format list[dict]
    history_dicts = []
    if payload.history:
        history_dicts = [{"role": h.role, "content": h.content} for h in payload.history]

    # 4. Call Gemini
    ai_data = None
    try:
        ai_data = await gemini_service.generate_chat_response(
            message=user_msg,
            history=history_dicts,
            profile_context=profile_context
        )
    except GeminiQuotaError as e:
        logger.error(f"Gemini quota error: {e}")
        error_reply = ChatResponse(
            reply="AI service quota exceeded. Please try again later.",
            risk_level="LOW",
            urgency="Monitor",
            possible_conditions=[],
            extracted_symptoms=[],
            condition_explanation="Service quota limit reached.",
            home_care_advice=["Please try again in a few minutes.", "Check your plan limits if the issue persists."],
            warning_signs=[],
            emergency_symptoms=[],
            recommended_tests=[],
            should_see_doctor=False,
            medical_disclaimer="AI service quota exceeded. Assistant offline.",
            nearby_specialists=[],
            suggested_followup_questions=[]
        )
        # Save error message from bot
        try:
            bot_message_db = ChatMessage(
                user_id=current_user.id,
                role="model",
                content=json.dumps(error_reply.model_dump()),
                created_at=datetime.now(timezone.utc)
            )
            db.add(bot_message_db)
            db.commit()
        except Exception as db_err:
            logger.error(f"Failed to save bot error chat message: {db_err}")
            db.rollback()
        return error_reply
    except GeminiAuthError as e:
        logger.error(f"Gemini auth error: {e}")
        error_reply = ChatResponse(
            reply="AI service authentication failed. The assistant is currently misconfigured.",
            risk_level="LOW",
            urgency="Monitor",
            possible_conditions=[],
            extracted_symptoms=[],
            condition_explanation="Invalid API key or authentication failure.",
            home_care_advice=["Contact administrator to configure the API key."],
            warning_signs=[],
            emergency_symptoms=[],
            recommended_tests=[],
            should_see_doctor=False,
            medical_disclaimer="AI assistant is offline due to authentication issues.",
            nearby_specialists=[],
            suggested_followup_questions=[]
        )
        # Save error message from bot
        try:
            bot_message_db = ChatMessage(
                user_id=current_user.id,
                role="model",
                content=json.dumps(error_reply.model_dump()),
                created_at=datetime.now(timezone.utc)
            )
            db.add(bot_message_db)
            db.commit()
        except Exception as db_err:
            logger.error(f"Failed to save bot error chat message: {db_err}")
            db.rollback()
        return error_reply
    except (GeminiTimeoutError, GeminiNetworkError) as e:
        logger.error(f"Gemini connection error: {e}")
        error_reply = ChatResponse(
            reply="Unable to contact AI service. Please check your connection and try again.",
            risk_level="LOW",
            urgency="Monitor",
            possible_conditions=[],
            extracted_symptoms=[],
            condition_explanation="Network timeout or unreachable service.",
            home_care_advice=["Check your internet connection.", "Retry your query in a few moments."],
            warning_signs=[],
            emergency_symptoms=[],
            recommended_tests=[],
            should_see_doctor=False,
            medical_disclaimer="AI service is offline/unreachable.",
            nearby_specialists=[],
            suggested_followup_questions=[]
        )
        # Save error message from bot
        try:
            bot_message_db = ChatMessage(
                user_id=current_user.id,
                role="model",
                content=json.dumps(error_reply.model_dump()),
                created_at=datetime.now(timezone.utc)
            )
            db.add(bot_message_db)
            db.commit()
        except Exception as db_err:
            logger.error(f"Failed to save bot error chat message: {db_err}")
            db.rollback()
        return error_reply
    except Exception as e:
        logger.error(f"Unexpected Gemini generation error: {e}")
        error_reply = ChatResponse(
            reply="AI service is temporarily unavailable. Please try again later.",
            risk_level="LOW",
            urgency="Monitor",
            possible_conditions=[],
            extracted_symptoms=[],
            condition_explanation="An unexpected error occurred during analysis.",
            home_care_advice=["Please try again later."],
            warning_signs=[],
            emergency_symptoms=[],
            recommended_tests=[],
            should_see_doctor=False,
            medical_disclaimer="AI assistant is currently offline.",
            nearby_specialists=[],
            suggested_followup_questions=[]
        )
        # Save error message from bot
        try:
            bot_message_db = ChatMessage(
                user_id=current_user.id,
                role="model",
                content=json.dumps(error_reply.model_dump()),
                created_at=datetime.now(timezone.utc)
            )
            db.add(bot_message_db)
            db.commit()
        except Exception as db_err:
            logger.error(f"Failed to save bot error chat message: {db_err}")
            db.rollback()
        return error_reply

    # 5. Extract specialist & recommend matching doctors from local database
    nearby_specialists = []
    specialist = ai_data.get("recommended_specialist")
    department = ai_data.get("recommended_department")
    
    if specialist:
        try:
            # Query hospitals matching the specialist
            hospitals = hospital_service.list_hospitals(specialty=specialist)
            for hosp in hospitals:
                for doc in hosp.get("doctors", []):
                    doc_spec = str(doc.get("specialty", "")).lower()
                    doc_dept = str(doc.get("department", "")).lower()
                    
                    matches_spec = specialist.lower() in doc_spec or doc_spec in specialist.lower()
                    matches_dept = department and (department.lower() in doc_dept or doc_dept in department.lower())
                    
                    if matches_spec or matches_dept:
                        nearby_specialists.append(
                            DoctorRecommendation(
                                name=doc["name"],
                                specialty=doc["specialty"],
                                department=doc["department"],
                                hospital=hosp["name"],
                                hospital_id=hosp["id"],
                                doctor_id=doc["id"],
                                experience_years=doc.get("experience_years", 0)
                            )
                        )
        except Exception as e:
            logger.error(f"Error querying doctors for specialist {specialist}: {e}")

    # limit to 4 suggestions
    nearby_specialists = nearby_specialists[:4]

    # Map AI response keys
    chat_response = ChatResponse(
        reply=ai_data.get("reply", "No response text generated."),
        risk_level=ai_data.get("risk_level"),
        urgency=ai_data.get("urgency"),
        possible_conditions=ai_data.get("possible_conditions"),
        extracted_symptoms=ai_data.get("extracted_symptoms"),
        condition_explanation=ai_data.get("condition_explanation"),
        home_care_advice=ai_data.get("home_care_advice"),
        warning_signs=ai_data.get("warning_signs"),
        emergency_symptoms=ai_data.get("emergency_symptoms"),
        recommended_tests=ai_data.get("recommended_tests"),
        recommended_specialist=specialist,
        recommended_department=department,
        should_see_doctor=ai_data.get("should_see_doctor", False),
        medical_disclaimer=ai_data.get("medical_disclaimer"),
        nearby_specialists=nearby_specialists,
        suggested_followup_questions=ai_data.get("suggested_followup_questions")
    )

    # 6. Save bot message to database
    try:
        bot_message_db = ChatMessage(
            user_id=current_user.id,
            role="model",
            content=json.dumps(ai_data),
            created_at=datetime.now(timezone.utc)
        )
        db.add(bot_message_db)
        db.commit()
    except Exception as e:
        logger.error(f"Failed to save bot chat message: {e}")
        db.rollback()

    return chat_response
