from app.schemas.nlp import NLPDecisionResult


class DecisionService:
    POLICY_VERSION = 'risk-policy-v2'
    CRITICAL_TERMS = {
        'chest pain',
        'shortness of breath',
        'seizure',
        'suicidal ideation',
        'stroke',
    }

    def decide(
        self,
        normalized_text: str,
        risk_score: float,
        risk_level: str,
        entities: list[dict],
    ) -> NLPDecisionResult:
        entity_terms = {entity.get('text', '').lower() for entity in entities}
        triggered_terms = sorted(entity_terms.intersection(self.CRITICAL_TERMS))

        if triggered_terms or risk_score >= 0.85:
            return NLPDecisionResult(
                escalation_required=True,
                triage_level='emergency',
                action='Escalate immediately to clinician and emergency workflow.',
                rationale='Critical symptom indicators or very high risk score detected.',
                policy_version=self.POLICY_VERSION,
            )

        if risk_score >= 0.60 or risk_level == 'high':
            return NLPDecisionResult(
                escalation_required=True,
                triage_level='urgent',
                action='Route patient to same-day clinical review.',
                rationale='High-risk profile requires rapid clinical follow-up.',
                policy_version=self.POLICY_VERSION,
            )

        if risk_score >= 0.35:
            return NLPDecisionResult(
                escalation_required=False,
                triage_level='moderate',
                action='Provide care guidance and monitor symptom progression.',
                rationale='Moderate risk should be monitored with safety net instructions.',
                policy_version=self.POLICY_VERSION,
            )

        return NLPDecisionResult(
            escalation_required=False,
            triage_level='low',
            action='Provide self-care guidance and standard follow-up reminders.',
            rationale='Low-risk presentation with no critical indicators.',
            policy_version=self.POLICY_VERSION,
        )


decision_service = DecisionService()
