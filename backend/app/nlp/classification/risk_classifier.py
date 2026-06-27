import threading
import re


class RiskClassifier:
    HIGH_RISK_TERMS = {
        "chest pain",
        "shortness of breath",
        "breathing difficulty",
        "unconsciousness",
        "fainting",
        "blood in stool",
    }
    DANGEROUS_SYMPTOMS = {"chest pain", "shortness of breath", "breathing difficulty", "unconsciousness", "fainting"}
    BREATHING_SYMPTOMS = {"shortness of breath", "breathing difficulty"}
    SYMPTOM_WEIGHTS = {
        "fever": 0.16,
        "headache": 0.12,
        "body pain": 0.14,
        "cough": 0.12,
        "sore throat": 0.10,
        "fatigue": 0.10,
        "nausea": 0.12,
        "vomiting": 0.16,
        "diarrhea": 0.16,
        "dizziness": 0.12,
        "chest pain": 0.40,
        "shortness of breath": 0.40,
        "unconsciousness": 0.50,
    }
    SEVERITY_WEIGHTS = {
        "mild": 0.02,
        "moderate": 0.12,
        "severe": 0.28,
        "extreme": 0.35,
    }
    FREQUENCY_WEIGHTS = {
        "constant": 0.08,
        "intermittent": 0.04,
    }
    CONDITION_RULES = (
        ({"fever", "headache", "body pain"}, "viral infection"),
        ({"fever", "cough", "sore throat"}, "upper respiratory tract infection"),
        ({"nausea", "vomiting", "diarrhea"}, "gastroenteritis"),
        ({"chest pain", "shortness of breath"}, "possible cardiac or respiratory emergency"),
        ({"fatigue", "dizziness", "headache"}, "dehydration or stress-related illness"),
    )
    DURATION_PATTERN = re.compile(r"(?P<value>\d+|an?|one)\s*(?P<unit>hour|hours|day|days|week|weeks|month|months)")
    SEVERITY_TEXT_TERMS = {
        "extreme": {"extreme", "excruciating", "unbearable", "worst"},
        "severe": {"severe", "intense", "serious", "bad"},
        "moderate": {"moderate", "medium"},
        "mild": {"mild", "slight", "light"},
    }
    FREQUENCY_TEXT_TERMS = {
        "constant": {"constant", "continuous", "persistent", "all the time"},
        "intermittent": {"intermittent", "on and off", "comes and goes", "occasional"},
    }

    def __init__(self, model_name: str) -> None:
        self.model_name = model_name
        self._classifier = None
        self._initialized = False
        self._lock = threading.Lock()

    def _load_model(self) -> None:
        if self._initialized:
            return

        with self._lock:
            if self._initialized:
                return

            try:
                from transformers import pipeline

                self._classifier = pipeline('text-classification', model=self.model_name)
            except Exception:
                self._classifier = None

            self._initialized = True

    def classify(self, text: str, entities: list[dict]) -> dict:
        self._load_model()

        if self._classifier is not None:
            raw = self._classifier(text, truncation=True)[0]
            model_score = float(raw.get("score", 0.5))
            label = str(raw.get("label", "UNKNOWN")).upper()
            mapped_score = model_score if label in {"POSITIVE", "LABEL_1"} else 1.0 - model_score
        else:
            mapped_score = 0.15

        hits = [term for term in self.HIGH_RISK_TERMS if term in text]
        mapped_score += min(len(hits) * 0.20, 0.60)

        critical_entities = [entity for entity in entities if entity.get("label") == "CRITICAL_SYMPTOM"]
        if critical_entities:
            mapped_score += 0.25

        inferred_severity = self._severity_from_text(text)
        mapped_score += self.SEVERITY_WEIGHTS.get(inferred_severity, 0.0)

        inferred_duration = self._duration_to_days(self._duration_from_text(text))
        if inferred_duration is not None and inferred_duration > 3:
            mapped_score += 0.12

        risk_score = max(0.0, min(mapped_score, 1.0))
        if risk_score >= 0.80:
            risk_level = "critical"
        elif risk_score >= 0.60:
            risk_level = "high"
        elif risk_score >= 0.35:
            risk_level = "moderate"
        else:
            risk_level = "low"

        intent = "urgent_assessment" if risk_level in {"critical", "high"} else "routine_assessment"

        return {
            "intent": intent,
            "risk_level": risk_level,
            "risk_score": risk_score,
        }

    def classify_symptoms(
        self,
        text: str,
        symptoms: list[str],
        health_profile: dict | object | None = None,
        context: dict | None = None,
    ) -> dict:
        normalized_symptoms = self._deduplicate(symptoms)
        normalized_context = self._normalize_context(context=context, text=text)

        if not text.strip():
            return self._insufficient_information_response()

        if not normalized_symptoms:
            confidence = self._confidence_score(
                symptoms=normalized_symptoms,
                context=normalized_context,
                known_pattern=False,
            )
            return {
                "risk_level": "LOW",
                "risk_score": 0.10,
                "possible_conditions": ["insufficient symptom information"],
                "recommendation": "Share specific symptoms and monitor for any worsening signs.",
                "urgency": "Monitor",
                "confidence": confidence,
            }

        risk_score = 0.08
        for symptom in normalized_symptoms:
            risk_score += self.SYMPTOM_WEIGHTS.get(symptom, 0.08)
        risk_score += min(len(normalized_symptoms) * 0.08, 0.30)

        severity = str(normalized_context.get("severity") or "")
        frequency = str(normalized_context.get("frequency") or "")
        risk_score += self.SEVERITY_WEIGHTS.get(severity, 0.0)
        risk_score += self.FREQUENCY_WEIGHTS.get(frequency, 0.0)

        duration_days = self._duration_to_days(str(normalized_context.get("duration") or ""))
        if duration_days is not None:
            if duration_days > 7:
                risk_score += 0.22
            elif duration_days > 3:
                risk_score += 0.14
            elif duration_days >= 1:
                risk_score += 0.04

        danger_hit = any(symptom in self.DANGEROUS_SYMPTOMS for symptom in normalized_symptoms)
        if danger_hit:
            risk_score += 0.16

        has_chest_pain = "chest pain" in normalized_symptoms
        has_breathing_issue = any(symptom in self.BREATHING_SYMPTOMS for symptom in normalized_symptoms)
        has_unconsciousness = "unconsciousness" in normalized_symptoms or "fainting" in normalized_symptoms
        dangerous_combination = (has_chest_pain and has_breathing_issue) or has_unconsciousness

        if dangerous_combination:
            risk_score = max(risk_score, 0.92)
        elif severity in {"severe", "extreme"} and duration_days is not None and duration_days > 3:
            risk_score = max(risk_score, 0.78)

        risk_score += self._profile_risk_adjustment(health_profile)
        risk_score = max(0.0, min(risk_score, 0.99))

        if dangerous_combination or risk_score >= 0.75:
            risk_level = "HIGH"
            urgency = "Immediate"
            recommendation = self._high_risk_recommendation(dangerous_combination=dangerous_combination)
        elif risk_score >= 0.40 or (len(normalized_symptoms) >= 2 and severity == "moderate"):
            risk_level = "MEDIUM"
            urgency = "Within 24h"
            recommendation = (
                "Consult a doctor within 24 hours, keep monitoring symptoms, stay hydrated, and avoid heavy activity."
            )
        else:
            risk_level = "LOW"
            urgency = "Monitor"
            recommendation = (
                "Use home care: hydration, rest, light meals if tolerated, and monitor symptoms for 24-48 hours."
            )

        possible_conditions = self._infer_conditions(normalized_symptoms, normalized_context)
        known_pattern = possible_conditions != ["non-specific symptomatic illness"]
        confidence = self._confidence_score(
            symptoms=normalized_symptoms,
            context=normalized_context,
            known_pattern=known_pattern or dangerous_combination,
        )

        return {
            "risk_level": risk_level,
            "risk_score": round(risk_score, 2),
            "possible_conditions": possible_conditions,
            "recommendation": recommendation,
            "urgency": urgency,
            "confidence": confidence,
        }

    def _profile_risk_adjustment(self, health_profile: dict | object | None) -> float:
        if health_profile is None:
            return 0.0

        age = self._safe_int(self._profile_value(health_profile, "age"))
        bmi = self._safe_float(self._profile_value(health_profile, "bmi"))
        heart_rate = self._safe_int(self._profile_value(health_profile, "heart_rate"))
        systolic_bp = self._safe_int(self._profile_value(health_profile, "systolic_bp"))
        diastolic_bp = self._safe_int(self._profile_value(health_profile, "diastolic_bp"))
        existing_conditions = self._profile_value(health_profile, "existing_conditions") or []

        adjustment = 0.0
        if age is not None and age >= 65:
            adjustment += 0.08
        if bmi is not None and bmi >= 35:
            adjustment += 0.08
        if heart_rate is not None and heart_rate >= 110:
            adjustment += 0.08
        if systolic_bp is not None and diastolic_bp is not None and (systolic_bp >= 160 or diastolic_bp >= 100):
            adjustment += 0.10

        chronic_risk_conditions = {"diabetes", "hypertension", "asthma", "heart disease", "copd"}
        normalized_conditions = {str(item).strip().lower() for item in existing_conditions}
        if normalized_conditions.intersection(chronic_risk_conditions):
            adjustment += 0.07

        return adjustment

    def _infer_conditions(self, symptoms: list[str], context: dict | None = None) -> list[str]:
        symptom_set = set(symptoms)
        conditions: list[str] = []

        for required_symptoms, condition in self.CONDITION_RULES:
            if required_symptoms.issubset(symptom_set):
                conditions.append(condition)

        body_parts = set(context.get("body_parts") or []) if context else set()
        if "headache" in symptom_set and "head" in body_parts and "migraine" not in conditions:
            conditions.append("migraine or tension headache")
        if {"nausea", "vomiting"}.issubset(symptom_set):
            conditions.append("gastritis or food-borne illness")
        if {"chest pain", "shortness of breath"}.issubset(symptom_set):
            conditions.append("acute cardiopulmonary concern")

        if not conditions:
            conditions.append("non-specific symptomatic illness")

        return conditions

    def _confidence_score(self, symptoms: list[str], context: dict, known_pattern: bool) -> float:
        symptom_strength = min(len(symptoms) / 5.0, 1.0)

        context_hits = 0
        if context.get("duration"):
            context_hits += 1
        if context.get("severity"):
            context_hits += 1
        if context.get("frequency"):
            context_hits += 1
        if context.get("body_parts"):
            context_hits += 1
        context_clarity = context_hits / 4.0

        pattern_strength = 1.0 if known_pattern else (0.4 if symptoms else 0.1)
        score = 0.20 + (0.45 * symptom_strength) + (0.25 * context_clarity) + (0.20 * pattern_strength)
        return round(max(0.15, min(score, 0.98)), 2)

    def _normalize_context(self, context: dict | None, text: str) -> dict[str, object]:
        body_parts: list[str] = []
        if context and isinstance(context.get("body_parts"), list):
            for body_part in context["body_parts"]:
                normalized_part = str(body_part).strip().lower()
                if normalized_part and normalized_part not in body_parts:
                    body_parts.append(normalized_part)

        normalized_context = {
            "duration": str(context.get("duration")).strip().lower()
            if context and context.get("duration")
            else self._duration_from_text(text),
            "severity": str(context.get("severity")).strip().lower()
            if context and context.get("severity")
            else self._severity_from_text(text),
            "frequency": str(context.get("frequency")).strip().lower()
            if context and context.get("frequency")
            else self._frequency_from_text(text),
            "body_parts": body_parts,
        }
        return normalized_context

    def _duration_from_text(self, text: str) -> str | None:
        normalized = str(text or "").lower()
        match = self.DURATION_PATTERN.search(normalized)
        if match:
            return f"{match.group('value')} {match.group('unit')}".strip()
        if "since yesterday" in normalized:
            return "since yesterday"
        if "for a week" in normalized or "for one week" in normalized:
            return "for a week"
        return None

    def _severity_from_text(self, text: str) -> str | None:
        normalized = str(text or "").lower()
        for severity in ("extreme", "severe", "moderate", "mild"):
            if self._contains_any_phrase(normalized, self.SEVERITY_TEXT_TERMS[severity]):
                return severity
        return None

    def _frequency_from_text(self, text: str) -> str | None:
        normalized = str(text or "").lower()
        for frequency, terms in self.FREQUENCY_TEXT_TERMS.items():
            if self._contains_any_phrase(normalized, terms):
                return frequency
        return None

    def _duration_to_days(self, duration: str | None) -> float | None:
        if not duration:
            return None
        normalized = str(duration).lower().strip()

        if "yesterday" in normalized:
            return 1.0
        if "last week" in normalized:
            return 7.0
        if "last month" in normalized:
            return 30.0

        match = self.DURATION_PATTERN.search(normalized)
        if not match:
            return None

        value_token = match.group("value")
        unit = match.group("unit")
        value = self._duration_value(value_token)
        if value is None:
            return None

        if unit.startswith("hour"):
            return value / 24.0
        if unit.startswith("day"):
            return value
        if unit.startswith("week"):
            return value * 7.0
        if unit.startswith("month"):
            return value * 30.0
        return None

    @staticmethod
    def _duration_value(token: str) -> float | None:
        normalized = token.strip().lower()
        if normalized in {"a", "an", "one"}:
            return 1.0
        try:
            return float(normalized)
        except (TypeError, ValueError):
            return None

    def _high_risk_recommendation(self, dangerous_combination: bool) -> str:
        if dangerous_combination:
            return (
                "Seek emergency medical care immediately. Chest pain with breathing difficulty or loss of "
                "consciousness can be life-threatening."
            )
        return (
            "Seek urgent medical help immediately. If symptoms worsen, contact emergency services or go to the "
            "nearest emergency department."
        )

    @staticmethod
    def _contains_any_phrase(text: str, phrases: set[str]) -> bool:
        for phrase in phrases:
            if re.search(rf"\b{re.escape(phrase)}\b", text):
                return True
        return False

    @staticmethod
    def _safe_int(value: object) -> int | None:
        try:
            if value is None:
                return None
            return int(float(str(value)))
        except (TypeError, ValueError):
            return None

    @staticmethod
    def _safe_float(value: object) -> float | None:
        try:
            if value is None:
                return None
            return float(str(value))
        except (TypeError, ValueError):
            return None

    def _insufficient_information_response(self) -> dict:
        return {
            "risk_level": "LOW",
            "risk_score": 0.10,
            "possible_conditions": ["insufficient symptom information"],
            "recommendation": "Please describe specific symptoms, severity, and duration for better triage.",
            "urgency": "Monitor",
            "confidence": 0.25,
        }

    @staticmethod
    def _profile_value(health_profile: dict | object, key: str):
        if isinstance(health_profile, dict):
            return health_profile.get(key)
        return getattr(health_profile, key, None)

    @staticmethod
    def _deduplicate(symptoms: list[str]) -> list[str]:
        unique: list[str] = []
        for symptom in symptoms:
            normalized = symptom.strip().lower()
            if normalized and normalized not in unique:
                unique.append(normalized)
        return unique
