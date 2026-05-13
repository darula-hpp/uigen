"""
Integration tests for StripePaymentStrategy.

Tests payment intent creation, webhook signature verification, and
payment_intent.succeeded event processing using mocked Stripe API calls.

Requirements: 4.1, 4.2, 4.3, 4.7
"""
import pytest
from decimal import Decimal
from typing import Any, Dict
from unittest.mock import MagicMock, patch, AsyncMock

import stripe

from app.exceptions import PaymentProcessingError
from app.strategies.stripe_payment_strategy import StripePaymentStrategy
from app.strategies.payment_strategy import PaymentConfirmation, PaymentIntent


# ---------------------------------------------------------------------------
# Fixtures
# ---------------------------------------------------------------------------

TEST_API_KEY = "sk_test_fake_key_for_testing"
TEST_WEBHOOK_SECRET = "whsec_fake_secret_for_testing"


@pytest.fixture
def strategy() -> StripePaymentStrategy:
    """Return a StripePaymentStrategy instance with test credentials."""
    return StripePaymentStrategy(
        api_key=TEST_API_KEY,
        webhook_secret=TEST_WEBHOOK_SECRET,
    )


def _make_stripe_intent(
    intent_id: str = "pi_test_123",
    client_secret: str = "pi_test_123_secret_abc",
    amount_cents: int = 10000,
    currency: str = "usd",
    metadata: Dict[str, Any] = None,
) -> MagicMock:
    """Build a mock Stripe PaymentIntent object."""
    intent = MagicMock()
    intent.id = intent_id
    intent.client_secret = client_secret
    intent.currency = currency
    intent.metadata = metadata or {"merchant_id": "42"}
    return intent


def _make_webhook_event(
    event_id: str = "evt_test_001",
    event_type: str = "payment_intent.succeeded",
    intent_id: str = "pi_test_123",
    amount_cents: int = 10000,
    currency: str = "usd",
    merchant_id: str = "42",
) -> Dict[str, Any]:
    """Build a raw Stripe webhook event dict."""
    return {
        "id": event_id,
        "type": event_type,
        "data": {
            "object": {
                "id": intent_id,
                "amount": amount_cents,
                "currency": currency,
                "metadata": {"merchant_id": merchant_id},
            }
        },
    }


# ---------------------------------------------------------------------------
# Initialisation tests
# ---------------------------------------------------------------------------

class TestStripePaymentStrategyInit:
    def test_sets_stripe_api_key(self):
        """Initialising the strategy configures the Stripe SDK API key."""
        StripePaymentStrategy(api_key="sk_test_init_key", webhook_secret="whsec_x")
        assert stripe.api_key == "sk_test_init_key"

    def test_stores_webhook_secret(self):
        """The webhook secret is stored for later signature verification."""
        s = StripePaymentStrategy(api_key="sk_test_x", webhook_secret="whsec_stored")
        assert s._webhook_secret == "whsec_stored"

    def test_implements_payment_strategy_interface(self):
        """StripePaymentStrategy satisfies the PaymentStrategy interface."""
        from app.strategies.payment_strategy import PaymentStrategy
        s = StripePaymentStrategy(api_key="sk_test_x", webhook_secret="whsec_x")
        assert isinstance(s, PaymentStrategy)


# ---------------------------------------------------------------------------
# create_payment_intent tests
# ---------------------------------------------------------------------------

class TestCreatePaymentIntent:
    @pytest.mark.asyncio
    async def test_returns_payment_intent_on_success(self, strategy: StripePaymentStrategy):
        """A successful Stripe API call returns a populated PaymentIntent."""
        mock_intent = _make_stripe_intent(
            intent_id="pi_abc",
            client_secret="pi_abc_secret",
            amount_cents=5000,
            currency="usd",
            metadata={"merchant_id": "7"},
        )

        with patch("stripe.PaymentIntent.create", return_value=mock_intent):
            result = await strategy.create_payment_intent(
                amount=Decimal("50.00"),
                merchant_id=7,
                metadata={},
            )

        assert isinstance(result, PaymentIntent)
        assert result.intent_id == "pi_abc"
        assert result.client_secret == "pi_abc_secret"
        assert result.amount == Decimal("50.00")
        assert result.currency == "usd"
        assert result.provider == "stripe"

    @pytest.mark.asyncio
    async def test_converts_amount_to_cents(self, strategy: StripePaymentStrategy):
        """The amount is converted to integer cents before calling Stripe."""
        mock_intent = _make_stripe_intent(amount_cents=12345)

        with patch("stripe.PaymentIntent.create", return_value=mock_intent) as mock_create:
            await strategy.create_payment_intent(
                amount=Decimal("123.45"),
                merchant_id=1,
                metadata={},
            )

        call_kwargs = mock_create.call_args.kwargs
        assert call_kwargs["amount"] == 12345

    @pytest.mark.asyncio
    async def test_merchant_id_stored_in_metadata(self, strategy: StripePaymentStrategy):
        """The merchant_id is embedded in the Stripe intent metadata."""
        mock_intent = _make_stripe_intent(metadata={"merchant_id": "99"})

        with patch("stripe.PaymentIntent.create", return_value=mock_intent) as mock_create:
            await strategy.create_payment_intent(
                amount=Decimal("100.00"),
                merchant_id=99,
                metadata={},
            )

        call_kwargs = mock_create.call_args.kwargs
        assert call_kwargs["metadata"]["merchant_id"] == "99"

    @pytest.mark.asyncio
    async def test_extra_metadata_forwarded_to_stripe(self, strategy: StripePaymentStrategy):
        """Caller-supplied metadata is merged with merchant_id in the Stripe call."""
        mock_intent = _make_stripe_intent(metadata={"merchant_id": "1", "channel": "mobile"})

        with patch("stripe.PaymentIntent.create", return_value=mock_intent) as mock_create:
            await strategy.create_payment_intent(
                amount=Decimal("10.00"),
                merchant_id=1,
                metadata={"channel": "mobile"},
            )

        call_kwargs = mock_create.call_args.kwargs
        assert call_kwargs["metadata"]["channel"] == "mobile"
        assert call_kwargs["metadata"]["merchant_id"] == "1"

    @pytest.mark.asyncio
    async def test_raises_payment_processing_error_on_stripe_error(
        self, strategy: StripePaymentStrategy
    ):
        """A StripeError is wrapped in PaymentProcessingError."""
        stripe_err = stripe.StripeError("Network error")

        with patch("stripe.PaymentIntent.create", side_effect=stripe_err):
            with pytest.raises(PaymentProcessingError) as exc_info:
                await strategy.create_payment_intent(
                    amount=Decimal("50.00"),
                    merchant_id=1,
                    metadata={},
                )

        assert exc_info.value.details.get("payment_provider") == "stripe"

    @pytest.mark.asyncio
    async def test_payment_intent_provider_is_stripe(self, strategy: StripePaymentStrategy):
        """The returned PaymentIntent always identifies 'stripe' as the provider."""
        mock_intent = _make_stripe_intent()

        with patch("stripe.PaymentIntent.create", return_value=mock_intent):
            result = await strategy.create_payment_intent(
                amount=Decimal("20.00"),
                merchant_id=5,
                metadata={},
            )

        assert result.provider == "stripe"


# ---------------------------------------------------------------------------
# verify_webhook tests
# ---------------------------------------------------------------------------

class TestVerifyWebhook:
    @pytest.mark.asyncio
    async def test_returns_true_for_valid_signature(self, strategy: StripePaymentStrategy):
        """A valid Stripe signature returns True."""
        with patch("stripe.Webhook.construct_event", return_value=MagicMock()):
            result = await strategy.verify_webhook(
                payload=b'{"type": "payment_intent.succeeded"}',
                signature="t=123,v1=abc",
            )

        assert result is True

    @pytest.mark.asyncio
    async def test_returns_false_for_invalid_signature(self, strategy: StripePaymentStrategy):
        """A SignatureVerificationError returns False without raising."""
        with patch(
            "stripe.Webhook.construct_event",
            side_effect=stripe.error.SignatureVerificationError("bad sig", "t=1,v1=bad"),
        ):
            result = await strategy.verify_webhook(
                payload=b'{"type": "payment_intent.succeeded"}',
                signature="t=1,v1=bad",
            )

        assert result is False

    @pytest.mark.asyncio
    async def test_returns_false_for_unexpected_exception(self, strategy: StripePaymentStrategy):
        """Any unexpected exception during verification returns False."""
        with patch(
            "stripe.Webhook.construct_event",
            side_effect=ValueError("unexpected"),
        ):
            result = await strategy.verify_webhook(
                payload=b"bad payload",
                signature="t=1,v1=x",
            )

        assert result is False

    @pytest.mark.asyncio
    async def test_passes_raw_payload_bytes_to_stripe(self, strategy: StripePaymentStrategy):
        """The raw bytes payload is forwarded unchanged to Stripe's construct_event."""
        raw_payload = b'{"id":"evt_1","type":"payment_intent.succeeded"}'

        with patch("stripe.Webhook.construct_event", return_value=MagicMock()) as mock_construct:
            await strategy.verify_webhook(payload=raw_payload, signature="t=1,v1=sig")

        call_kwargs = mock_construct.call_args.kwargs
        assert call_kwargs["payload"] == raw_payload


# ---------------------------------------------------------------------------
# process_webhook_event tests
# ---------------------------------------------------------------------------

class TestProcessWebhookEvent:
    @pytest.mark.asyncio
    async def test_returns_confirmation_for_succeeded_event(
        self, strategy: StripePaymentStrategy
    ):
        """A payment_intent.succeeded event returns a PaymentConfirmation."""
        event = _make_webhook_event(
            event_id="evt_001",
            event_type="payment_intent.succeeded",
            intent_id="pi_001",
            amount_cents=20000,
            merchant_id="42",
        )

        result = await strategy.process_webhook_event(event)

        assert isinstance(result, PaymentConfirmation)
        assert result.event_id == "evt_001"
        assert result.payment_reference == "pi_001"
        assert result.amount == Decimal("200.00")
        assert result.merchant_id == 42
        assert result.provider == "stripe"

    @pytest.mark.asyncio
    async def test_returns_none_for_non_payment_event(self, strategy: StripePaymentStrategy):
        """Non-payment events return None without raising."""
        event = _make_webhook_event(event_type="customer.created")

        result = await strategy.process_webhook_event(event)

        assert result is None

    @pytest.mark.asyncio
    async def test_returns_none_for_payment_intent_created_event(
        self, strategy: StripePaymentStrategy
    ):
        """payment_intent.created is not a success event and returns None."""
        event = _make_webhook_event(event_type="payment_intent.created")

        result = await strategy.process_webhook_event(event)

        assert result is None

    @pytest.mark.asyncio
    async def test_amount_converted_from_cents_to_decimal(
        self, strategy: StripePaymentStrategy
    ):
        """Amount in cents is correctly converted to a Decimal in base currency."""
        event = _make_webhook_event(amount_cents=9999, merchant_id="1")

        result = await strategy.process_webhook_event(event)

        assert result is not None
        assert result.amount == Decimal("99.99")

    @pytest.mark.asyncio
    async def test_raises_when_merchant_id_missing_from_metadata(
        self, strategy: StripePaymentStrategy
    ):
        """Missing merchant_id in event metadata raises PaymentProcessingError."""
        event = {
            "id": "evt_no_merchant",
            "type": "payment_intent.succeeded",
            "data": {
                "object": {
                    "id": "pi_no_merchant",
                    "amount": 5000,
                    "currency": "usd",
                    "metadata": {},  # no merchant_id
                }
            },
        }

        with pytest.raises(PaymentProcessingError):
            await strategy.process_webhook_event(event)

    @pytest.mark.asyncio
    async def test_raises_on_malformed_event_payload(self, strategy: StripePaymentStrategy):
        """A malformed event dict (missing required keys) raises PaymentProcessingError."""
        malformed_event = {
            "id": "evt_bad",
            "type": "payment_intent.succeeded",
            "data": {},  # missing 'object'
        }

        with pytest.raises(PaymentProcessingError):
            await strategy.process_webhook_event(malformed_event)

    @pytest.mark.asyncio
    async def test_confirmation_provider_is_stripe(self, strategy: StripePaymentStrategy):
        """The returned PaymentConfirmation always identifies 'stripe' as the provider."""
        event = _make_webhook_event(merchant_id="10")

        result = await strategy.process_webhook_event(event)

        assert result is not None
        assert result.provider == "stripe"

    @pytest.mark.asyncio
    async def test_event_id_falls_back_to_intent_id_when_missing(
        self, strategy: StripePaymentStrategy
    ):
        """When the top-level event id is absent, the intent id is used as event_id."""
        event = {
            "type": "payment_intent.succeeded",
            # no top-level 'id'
            "data": {
                "object": {
                    "id": "pi_fallback",
                    "amount": 1000,
                    "currency": "usd",
                    "metadata": {"merchant_id": "3"},
                }
            },
        }

        result = await strategy.process_webhook_event(event)

        assert result is not None
        assert result.event_id == "pi_fallback"

    @pytest.mark.asyncio
    async def test_metadata_contains_currency(self, strategy: StripePaymentStrategy):
        """The confirmation metadata includes the currency from the event."""
        event = _make_webhook_event(currency="eur", merchant_id="5")

        result = await strategy.process_webhook_event(event)

        assert result is not None
        assert result.metadata.get("currency") == "eur"
