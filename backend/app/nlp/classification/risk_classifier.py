import threading


class RiskClassifier:
    HIGH_RISK_TERMS = {
        'chest pain',
        'shortness of breath',
        'blood in stool',
        'severe headache',
        'fainting',
    }
    SYMPTOM_WEIGHTS = {
        'fever': 0.18,
        'headache': 0.12,
        'body pain': 0.16,
        'cough': 0.14,
        'sore throat': 0.12,
        'fatigue': 0.10,
        'nausea': 0.12,
        'vomiting': 0.18,
        'diarrhea': 0.18,
        'dizziness': 0.14,
        'chest pain': 0.45,
        'shortness of breath': 0.45,
    }
    CONDITION_RULES = (
        ({'fever', 'headache', 'body pain'}, 'viral infection'),
        ({'fever', 'cough', 'sore throat'}, 'upper respiratory tract infection'),
        ({'nausea', 'vomiting', 'diarrhea'}, 'gastroenteritis'),
        ({'chest pain', 'shortness of breath'}, 'possible cardiac or respiratory emergency'),
        ({'fatigue', 'dizziness', 'headache'}, 'dehydration or stress-related illness'),
    )

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
            model_score = float(raw.get('score', 0.5))
            label = str(raw.get('label', 'UNKNOWN')).upper()
            mapped_score = model_score if label in {'POSITIVE', 'LABEL_1'} else 1.0 - model_score
        else:
            mapped_score = 0.15

        hits = [term for term in self.HIGH_RISK_TERMS if term in text]
        mapped_score += min(len(hits) * 0.20, 0.60)

        critical_entities = [entity for entity in entities if entity.get('label') == 'CRITICAL_SYMPTOM']
        if critical_entities:
            mapped_score += 0.25

        risk_score = max(0.0, min(mapped_score, 1.0))
        if risk_score >= 0.80:
            risk_level = 'critical'
        elif risk_score >= 0.60:
            risk_level = 'high'
        elif risk_score >= 0.35:
            risk_level = 'moderate'
        else:
            risk_level = 'low'

        intent = 'urgent_assessment' if risk_level in {'critical', 'high'} else 'routine_assessment'

        return {
            'intent': intent,
            'risk_level': risk_level,
            'risk_score': risk_score,
        }

    def classify_symptoms(
        self,
        text: str,
        symptoms: list[str],
        health_profile: dict | object | None = None,
    ) -> dict:
        normalized_symptoms = self._deduplicate(symptoms)
        if not normalized_symptoms:
            return {
                'risk_level': 'LOW',
                'risk_score': 0.10,
                'possible_conditions': ['insufficient symptom information'],
                'recommendation': 'Provide more specific symptoms and monitor for any worsening signs.',
                'confidence': 0.35,
            }

        risk_score = 0.08
        for symptom in normalized_symptoms:
            risk_score += self.SYMPTOM_WEIGHTS.get(symptom, 0.08)

        if any(symptom in self.HIGH_RISK_TERMS for symptom in normalized_symptoms):
            risk_score = max(risk_score, 0.82)

        risk_score += self._profile_risk_adjustment(health_profile)
        risk_score = max(0.0, min(risk_score, 0.99))

        if risk_score >= 0.75:
            risk_level = 'HIGH'
            recommendation = (
                'Seek urgent clinical attention today. If severe chest pain, breathing issues, or fainting occur, '
                'go to the nearest emergency department immediately.'
            )
        elif risk_score >= 0.40:
            risk_level = 'MEDIUM'
            recommendation = (
                'Arrange a doctor consultation within 24 hours, rest, stay hydrated, and monitor symptom progression.'
            )
        else:
            risk_level = 'LOW'
            recommendation = 'Use supportive self-care, hydrate, and monitor symptoms for 24-48 hours.'

        possible_conditions = self._infer_conditions(normalized_symptoms)
        confidence = self._confidence_score(normalized_symptoms, text)

        return {
            'risk_level': risk_level,
            'risk_score': round(risk_score, 2),
            'possible_conditions': possible_conditions,
            'recommendation': recommendation,
            'confidence': confidence,
        }

    def _profile_risk_adjustment(self, health_profile: dict | object | None) -> float:
        if health_profile is None:
            return 0.0

        age = self._profile_value(health_profile, 'age')
        bmi = self._profile_value(health_profile, 'bmi')
        heart_rate = self._profile_value(health_profile, 'heart_rate')
        systolic_bp = self._profile_value(health_profile, 'systolic_bp')
        diastolic_bp = self._profile_value(health_profile, 'diastolic_bp')
        existing_conditions = self._profile_value(health_profile, 'existing_conditions') or []

        adjustment = 0.0
        if age is not None and int(age) >= 65:
            adjustment += 0.08
        if bmi is not None and float(bmi) >= 35:
            adjustment += 0.08
        if heart_rate is not None and int(heart_rate) >= 110:
            adjustment += 0.08
        if (
            systolic_bp is not None
            and diastolic_bp is not None
            and (int(systolic_bp) >= 160 or int(diastolic_bp) >= 100)
        ):
            adjustment += 0.10

        chronic_risk_conditions = {'diabetes', 'hypertension', 'asthma', 'heart disease', 'copd'}
        normalized_conditions = {str(item).strip().lower() for item in existing_conditions}
        if normalized_conditions.intersection(chronic_risk_conditions):
            adjustment += 0.07

        return adjustment

    def _infer_conditions(self, symptoms: list[str]) -> list[str]:
        symptom_set = set(symptoms)
        conditions: list[str] = []

        for required_symptoms, condition in self.CONDITION_RULES:
            if required_symptoms.issubset(symptom_set):
                conditions.append(condition)

        if not conditions:
            conditions.append('non-specific symptomatic illness')

        return conditions

    def _confidence_score(self, symptoms: list[str], text: str) -> float:
        score = 0.55 + min(0.08 * len(symptoms), 0.30)
        if len(text.strip()) > 120:
            score += 0.04
        return round(max(0.35, min(score, 0.95)), 2)

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
