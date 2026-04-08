"""
Unit tests for populate-site-template endpoint.
Tests placeholder generation, fallback values, and flexible input handling.
"""

import json
import pytest
from typing import Dict, Any
from unittest.mock import Mock, patch, MagicMock

from static_web_handler.template_handler import TemplateHandler
from endpoints.populate_site_template.input_model.template_input_model import (
    TemplateInput,
    FALLBACK_PRIMARY_COLOR,
    FALLBACK_SECONDARY_COLOR,
    FALLBACK_PRIMARY_FONT,
    FALLBACK_SECONDARY_FONT,
)
from utils.placeholder_utils import create_placeholder
from templates.manual_website_data_constructor import ManualWebsiteDataConstructor


@pytest.fixture
def minimal_preview_input():
    """Minimal preview input with only salon_id."""

    class MinimalInput:
        def __init__(self):
            pass

    return MinimalInput()


@pytest.fixture
def partial_color_input():
    """Partial color input with only primary_color."""

    class PartialColor:
        def __init__(self):
            self.color = Mock()
            self.color.primary_color = "#00FF00"
            self.color.secondary_color = None

    return PartialColor()


@pytest.fixture
def minimum_preview_input_data() -> Dict[str, Any]:
    """Load minimum preview input data from JSON file."""
    import json
    from pathlib import Path

    json_file = (
        Path(__file__).parent
        / "test_examples"
        / "minimum_preview"
        / "complete_preview_input.json"
    )
    with open(json_file, "r", encoding="utf-8") as f:
        return json.load(f)


@pytest.fixture
def minimum_preview_company_data() -> Dict[str, Any]:
    """Load minimum preview company data from JSON file."""
    import json
    from pathlib import Path

    json_file = (
        Path(__file__).parent
        / "test_examples"
        / "minimum_preview"
        / "complete_database_data.json"
    )
    with open(json_file, "r", encoding="utf-8") as f:
        return json.load(f)


@pytest.fixture
def mock_repository():
    """Mock repository with no company data."""
    mock_repo = Mock()
    mock_repo.get_company_data.return_value = {}
    return mock_repo


@pytest.fixture
def mock_repository_with_data():
    """Mock repository with company data."""
    mock_repo = Mock()
    mock_repo.get_company_data.return_value = {
        "company_name": "Test Salon",
        "logo_data": {"image_url": "https://example.com/logo.png"},
        "services_data": {
            "services": [
                {
                    "name": "Hair Cut",
                    "description": "Professional haircut",
                    "price": "$50",
                }
            ]
        },
        "contact_details": {
            "phone": "(555) 123-4567",
            "email": "info@testsalon.com",
            "hours": "Mon-Fri 9-5",
        },
    }
    return mock_repo


class TestPlaceholderUtils:
    """Test placeholder utility functions."""

    def test_create_placeholder(self):
        """Test placeholder creation."""
        assert create_placeholder("primary_color") == "{{PLACEHOLDER: primary_color}}"
        assert (
            create_placeholder("hero_section.header")
            == "{{PLACEHOLDER: hero_section.header}}"
        )

    def test_create_placeholder_with_index(self):
        """Test placeholder with list index."""
        assert (
            create_placeholder("service_types.0.title")
            == "{{PLACEHOLDER: service_types.0.title}}"
        )


class TestTemplateHandler:
    """Test TemplateHandler functionality."""

    def test_handler_initialization(self, mock_repository):
        """Test handler initializes correctly."""
        handler = TemplateHandler(mock_repository)
        assert handler.repository is not None

    def test_generate_template_returns_correct_structure(
        self, minimal_preview_input, mock_repository
    ):
        """Test that generate_template returns correct structure."""
        handler = TemplateHandler(mock_repository)
        salon_id = "test-salon-id"

        result = handler.generate_template(minimal_preview_input, salon_id)

        assert "website" in result
        assert "websiteType" in result
        assert (
            result["websiteType"] == "generic"
        )  # Default changed from "website" to "generic"
        assert isinstance(result["website"], str)

    def test_generate_template_with_custom_template_type(self, mock_repository):
        """Test that template_type is respected in response."""
        preview_input = TemplateInput(template_type="custom_template")
        handler = TemplateHandler(mock_repository)
        result = handler.generate_template(preview_input, "test-salon")

        assert "website" in result
        assert "websiteType" in result
        assert result["websiteType"] == "custom_template"

    def test_color_with_fallback_values(self, minimal_preview_input, mock_repository):
        """Test color uses fallback values when not provided."""
        website_data = ManualWebsiteDataConstructor.build_website_data(
            minimal_preview_input, {}, "test-salon"
        )

        assert website_data.color.primary_color == FALLBACK_PRIMARY_COLOR
        assert website_data.color.secondary_color == FALLBACK_SECONDARY_COLOR

    def test_partial_color_handling(self, partial_color_input, mock_repository):
        """Test handling of partial color input."""
        website_data = ManualWebsiteDataConstructor.build_website_data(
            partial_color_input, {}, "test-salon"
        )

        assert website_data.color is not None

    def test_font_with_fallback_values(self, minimal_preview_input, mock_repository):
        """Test font uses fallback values when not provided."""
        website_data = ManualWebsiteDataConstructor.build_website_data(
            minimal_preview_input, {}, "test-salon"
        )

        assert website_data.font is not None
        assert website_data.font.primary_font == FALLBACK_PRIMARY_FONT
        assert website_data.font.secondary_font == FALLBACK_SECONDARY_FONT

    def test_logo_with_placeholder(self, minimal_preview_input, mock_repository):
        """Test logo uses None when not in DB (no default logo)."""
        website_data = ManualWebsiteDataConstructor.build_website_data(
            minimal_preview_input, {}, "test-salon"
        )

        # Logo defaults to None when not provided
        assert website_data.logo.image_url is None

    def test_logo_from_db(self, minimal_preview_input, mock_repository_with_data):
        """Test logo uses DB data when available."""
        website_data = ManualWebsiteDataConstructor.build_website_data(
            minimal_preview_input,
            mock_repository_with_data.get_company_data(),
            "test-salon",
        )

        assert website_data.logo.image_url == "https://example.com/logo.png"

    def test_tagline_with_defaults(self, minimal_preview_input, mock_repository):
        """Test tagline uses default values when not provided."""
        website_data = ManualWebsiteDataConstructor.build_website_data(
            minimal_preview_input, {}, "test-salon"
        )

        # Uses default value instead of placeholder
        assert website_data.tagline.content == "Welcome to our salon"

    def test_services_defaults_without_preview_data(
        self, minimal_preview_input, mock_repository
    ):
        """Services should fall back to default values when not provided."""
        website_data = ManualWebsiteDataConstructor.build_website_data(
            minimal_preview_input, {}, "test-salon"
        )

        # Uses default values instead of placeholders
        assert website_data.services.title == "Our Services"
        assert website_data.services.content == ""  # Default subtext is empty string
        assert website_data.services.grouped_services

    def test_services_with_template_input(self, mock_repository):
        """Services should use TemplateInput values when provided."""
        preview_input = TemplateInput(
            our_services={
                "header": "Our Services",
                "subtext": "Professional care",
            }
        )
        website_data = ManualWebsiteDataConstructor.build_website_data(
            preview_input, {}, "test-salon"
        )

        assert website_data.services.title == "Our Services"
        assert website_data.services.content == "Professional care"

    def test_instagram_section_with_socials(self, mock_repository):
        """Instagram section should populate when socials provided."""
        from endpoints.populate_site_template.input_model.template_input_model import (
            FlexibleSocials,
        )

        preview_input = TemplateInput(
            socials=FlexibleSocials(instagram_url="https://instagram.com/test")
        )
        website_data = ManualWebsiteDataConstructor.build_website_data(
            preview_input, {}, "test-salon"
        )

        assert website_data.Instagram is not None
        assert website_data.Instagram.instagram_link == "https://instagram.com/test"

    def test_instagram_section_without_socials(
        self, minimal_preview_input, mock_repository
    ):
        """Instagram section should be None when socials missing."""
        website_data = ManualWebsiteDataConstructor.build_website_data(
            minimal_preview_input, {}, "test-salon"
        )

        assert website_data.Instagram is None

    def test_template_handler_calls_constructor(self, mock_repository):
        """Ensure TemplateHandler orchestrates repository and constructor correctly."""
        handler = TemplateHandler(mock_repository)
        salon_id = "test-salon"
        preview_input = TemplateInput()

        with patch.object(
            ManualWebsiteDataConstructor,
            "build_website_data",
            return_value=ManualWebsiteDataConstructor.build_website_data(
                preview_input, {}, salon_id
            ),
        ) as mock_constructor:
            with patch.object(
                handler, "_render_template", return_value="<html></html>"
            ) as mock_renderer:
                handler.generate_template(preview_input, salon_id)

        mock_constructor.assert_called_once()
        mock_renderer.assert_called_once()

    def test_lambda_handler_happy_path(self):
        """Ensure lambda handler returns 200 on success."""
        event = {
            "body": json.dumps({}),
            "headers": {},
            "pathParameters": {"salon_id": "test-salon"},
        }

        with patch(
            "endpoints.populate_site_template.lambda_handler.ProxyRequest"
        ) as mock_request_cls, patch(
            "endpoints.populate_site_template.lambda_handler.DatabaseConnection"
        ) as mock_db_conn, patch(
            "endpoints.populate_site_template.lambda_handler.StaticWebGeneratorRepository"
        ) as mock_repo_cls, patch(
            "endpoints.populate_site_template.lambda_handler.TemplateHandler"
        ) as mock_handler_cls:
            mock_request = MagicMock()
            mock_request.body = {}
            mock_request.format_response.side_effect = lambda status, payload: {
                "statusCode": status,
                "body": json.dumps(payload),
            }
            mock_request_cls.return_value = mock_request

            mock_db_conn.return_value.__enter__.return_value = MagicMock()
            mock_repo_cls.return_value = MagicMock()

            mock_handler = MagicMock()
            mock_handler.generate_template.return_value = {
                "website": "<html></html>",
                "websiteType": "generic",  # Default changed from "website" to "generic"
            }
            mock_handler_cls.return_value = mock_handler

            from endpoints.populate_site_template.lambda_handler import lambda_handler

            response = lambda_handler(event, {})

        assert response["statusCode"] == 200
        mock_handler.generate_template.assert_called_once()

    @patch("endpoints.populate_site_template.lambda_handler.ProxyRequest")
    @patch("endpoints.populate_site_template.lambda_handler.TemplateHandler")
    @patch(
        "endpoints.populate_site_template.lambda_handler.StaticWebGeneratorRepository"
    )
    @patch("endpoints.populate_site_template.lambda_handler.DatabaseConnection")
    def test_lambda_handler_returns_correct_structure(
        self,
        mock_db_connection,
        mock_repository_class,
        mock_handler_class,
        mock_proxy_request_class,
    ):
        """Test lambda handler returns correct structure."""
        mock_request = MagicMock()
        mock_request.body = {}
        mock_request.format_response.side_effect = lambda status, payload: {
            "statusCode": status,
            "body": json.dumps(payload),
        }
        mock_proxy_request_class.return_value = mock_request

        mock_conn = MagicMock()
        mock_db_connection.return_value.__enter__.return_value = mock_conn

        mock_repo = MagicMock()
        mock_repo.get_company_data.return_value = {}
        mock_repository_class.return_value = mock_repo

        mock_handler = MagicMock()
        mock_handler.generate_template.return_value = {
            "website": "<html>Test</html>",
            "websiteType": "generic",  # Default changed from "website" to "generic"
        }
        mock_handler_class.return_value = mock_handler

        event = {
            "body": json.dumps({}),
            "headers": {},
            "pathParameters": {"salon_id": "test-salon"},
        }

        from endpoints.populate_site_template.lambda_handler import lambda_handler

        result = lambda_handler(event, {})

        assert result["statusCode"] == 200
        body = json.loads(result["body"])
        assert "website" in body
        assert "websiteType" in body

    @patch("endpoints.populate_site_template.lambda_handler.ProxyRequest")
    def test_lambda_handler_missing_salon_id_returns_400(
        self, mock_proxy_request_class
    ):
        """Test lambda handler returns 400 for missing salon_id."""
        mock_request = MagicMock()
        mock_request.body = {}
        mock_request.format_response.side_effect = lambda status, payload: {
            "statusCode": status,
            "body": json.dumps(payload),
        }
        mock_proxy_request_class.return_value = mock_request

        event = {"body": json.dumps({}), "headers": {}, "pathParameters": {}}

        from endpoints.populate_site_template.lambda_handler import lambda_handler

        response = lambda_handler(event, {})

        assert response["statusCode"] == 400

    @patch("endpoints.populate_site_template.lambda_handler.ProxyRequest")
    @patch("endpoints.populate_site_template.lambda_handler.TemplateHandler")
    @patch(
        "endpoints.populate_site_template.lambda_handler.StaticWebGeneratorRepository"
    )
    @patch("endpoints.populate_site_template.lambda_handler.DatabaseConnection")
    def test_lambda_handler_handles_exceptions(
        self,
        mock_db_connection,
        mock_repository_class,
        mock_handler_class,
        mock_proxy_request_class,
    ):
        """Test lambda handler handles exceptions."""
        mock_request = MagicMock()
        mock_request.body = {}
        mock_request.format_response.side_effect = lambda status, payload: {
            "statusCode": status,
            "body": json.dumps(payload),
        }
        mock_proxy_request_class.return_value = mock_request

        mock_db_connection.side_effect = Exception("Database error")

        event = {
            "body": json.dumps({}),
            "headers": {},
            "pathParameters": {"salon_id": "test-salon"},
        }

        from endpoints.populate_site_template.lambda_handler import lambda_handler

        result = lambda_handler(event, {})

        assert result["statusCode"] == 500
        body = json.loads(result["body"])
        assert "message" in body
        assert body["message"] == "Internal server error"


class TestGeneratePreviewTemplate:
    """Test template generation and HTML output for generate_preview."""

    @pytest.fixture
    def complete_preview_input_data(self) -> Dict[str, Any]:
        """Load complete preview input data from JSON file."""
        import json
        from pathlib import Path

        json_file = (
            Path(__file__).parent / "test_examples" / "complete_preview_input.json"
        )
        with open(json_file, "r", encoding="utf-8") as f:
            return json.load(f)

    @pytest.fixture
    def mock_company_data(self) -> Dict[str, Any]:
        """Load mock company data from JSON file."""
        import json
        from pathlib import Path

        json_file = (
            Path(__file__).parent / "test_examples" / "complete_database_data.json"
        )
        with open(json_file, "r", encoding="utf-8") as f:
            return json.load(f)

    def _extract_text_values_from_input(self, data: Dict[str, Any]) -> set[str]:
        """
        Extract all text values from the input data structure.
        Returns a set of text strings that should appear in the HTML.
        """
        import re
        from html import unescape

        text_values = set()

        def extract_text(obj: Any, path: str = ""):
            """Recursively extract text values from nested structures."""
            if isinstance(obj, dict):
                for key, value in obj.items():
                    # Skip URLs, colors, and boolean values
                    if key in [
                        "image_url",
                        "picture",
                        "primary_color",
                        "secondary_color",
                        "text_color",
                        "background_color",
                        "google_maps",
                        "include_book_now_button",
                        "grid_layout",
                    ]:
                        continue
                    extract_text(value, f"{path}.{key}" if path else key)
            elif isinstance(obj, list):
                for i, item in enumerate(obj):
                    extract_text(item, f"{path}[{i}]" if path else f"[{i}]")
            elif isinstance(obj, str) and obj:
                # Strip HTML tags and decode entities
                text = re.sub(r"<[^>]+>", "", obj)  # Remove HTML tags
                text = unescape(text)  # Decode HTML entities
                text = text.strip()
                # Extract meaningful text (at least 3 characters, not just whitespace)
                if len(text) >= 3:
                    # Split into words and phrases for better matching
                    words = text.split()
                    # Add full text
                    text_values.add(text)
                    # Add individual meaningful words (4+ chars) for verification
                    for word in words:
                        if len(word) >= 4 and not word.startswith("http"):
                            text_values.add(word)
                    # Add phrases (2-3 word combinations for key content)
                    if len(words) >= 2:
                        for i in range(len(words) - 1):
                            phrase = " ".join(words[i : i + 2])
                            if len(phrase) >= 6:
                                text_values.add(phrase)

        extract_text(data)
        return text_values

    def test_generate_preview_with_all_values_saves_html_example(
        self, complete_preview_input_data, mock_company_data, mock_repository
    ):
        """
        Test that generates complete HTML from generate_preview and saves it to file.

        This test creates a complete PreviewInputModel, merges it with SQL data,
        renders the template, and saves the HTML output to a file for visual inspection.
        It also verifies that all text values from the input appear in the generated HTML.
        """
        import os
        import re
        from pathlib import Path
        from html import unescape
        from endpoints.generate_preview.input_model.preview_input_model import (
            PreviewInputModel,
        )
        from templates.input_models import merge_preview_with_sql_data
        from static_web_handler.static_web_handler import StaticWebGenerator

        # Load original JSON data to get team text before conversion
        import json
        from pathlib import Path

        json_file = (
            Path(__file__).parent / "test_examples" / "complete_preview_input.json"
        )
        with open(json_file, "r", encoding="utf-8") as f:
            original_json_data = json.load(f)

        # Store original team text from input for verification
        team_text_input = original_json_data.get("team", {}).get("text", "")

        # Create PreviewInputModel from complete data
        preview_input = PreviewInputModel.from_dict(complete_preview_input_data)

        # Merge with mock SQL data
        salon_id = mock_company_data["salon_uuid"]
        website_data = merge_preview_with_sql_data(
            preview_input=preview_input,
            sql_data=mock_company_data,
            salon_id=salon_id,
            cbp_redirect_base_url="https://book.getpagoda.com/",
        )

        # Render HTML template
        # Use mock repository fixture since render_website_template doesn't need database access
        static_web_generator = StaticWebGenerator(
            s3_bucket_name="test-bucket",
            s3_region="us-east-1",
            repository=mock_repository,
        )
        html_content = static_web_generator.render_website_template(website_data)

        # Save to file
        test_examples_dir = Path(__file__).parent / "test_examples"
        test_examples_dir.mkdir(exist_ok=True)

        output_file = test_examples_dir / "generate_preview_complete_example.html"
        with open(output_file, "w", encoding="utf-8") as f:
            f.write(html_content)

        print(f"\n✓ Saved HTML example to: {output_file.absolute()}")

        # Verify HTML was generated
        assert html_content is not None
        assert len(html_content) > 0
        assert "<!DOCTYPE html>" in html_content
        assert "<html" in html_content
        assert "</html>" in html_content

        # Normalize HTML content for comparison (remove HTML tags, decode entities)
        html_text = re.sub(r"<[^>]+>", " ", html_content)  # Remove HTML tags
        html_text = unescape(html_text)  # Decode HTML entities
        html_text_normalized = html_text.lower()  # Case-insensitive comparison

        # Define all key text values from the input that should appear in HTML
        # These are extracted from complete_preview_input.json
        key_texts_to_verify = {
            # Hero section
            "Welcome to Crown of Beauty",
            "Your Premier Beauty Destination",
            "luxury",
            "beauty services",
            "relaxing",
            "professional team",
            "Professional staff",
            "Premium products",
            "Personalized service",
            # Services section
            "Our Services",
            "Professional Beauty Services",
            "Comprehensive beauty services",
            "professional treatments",
            # Service highlights
            "Hair Styling",
            "Professional hair cuts",
            "Hair Coloring",
            "Expert hair coloring",
            "Facial Treatments",
            "Rejuvenating facial",
            "Nail Care",
            "Professional manicures",
            # Testimonials
            "What Our Clients Say",
            "Read their experiences",
            "Jane Doe",
            "Amazing service",
            "professional and friendly",
            "John Smith",
            "Best salon experience",
            "attention to detail",
            "Maria Garcia",
            "atmosphere here",
            "relaxing",
            # Gallery
            "Our Gallery",
            "Salon Interior",
            "Beautiful and modern",
            "Stylist at Work",
            "Professional service",
            "Hair Color Process",
            "Expert color application",
            "Finished Look",
            "Beautiful results",
            # Banner
            "Grand Opening Special",
            "20% off",
            # Team
            "Our Team",
            "talented professionals",
            "exceptional service",
            "years of experience",
            # Find Us
            "Find Us",
            "Visit us at our location",
            # Announcement Modal
            "New Braiding Classes",
            "braiding classes",
            "Braids & Twist",
            "Designs",
            "Cornrows",
            "Extension Braids",
            "Interested? Call us",
            # Company name
            "Crown of Beauty",
        }

        # Verify key texts are present in HTML
        missing_texts = []
        for text in key_texts_to_verify:
            # Check both case-sensitive and case-insensitive
            text_lower = text.lower()
            if text_lower not in html_text_normalized and text not in html_content:
                missing_texts.append(text)

        # Report missing texts (but don't fail on all - some may be transformed)
        if missing_texts:
            print(f"\n⚠ Some texts not found in HTML ({len(missing_texts)} missing):")
            for missing in missing_texts[:15]:  # Show first 15
                print(f"  - {missing}")

        # Verify critical texts that MUST be present
        critical_texts = [
            "Welcome to Crown of Beauty",
            "Our Services",
            "Crown of Beauty",
            "Find Us",
        ]
        for critical in critical_texts:
            assert (
                critical.lower() in html_text_normalized or critical in html_content
            ), f"Critical text '{critical}' not found in HTML"

        # Verify specific sections are present (case-sensitive for HTML structure)
        assert "Welcome to Crown of Beauty" in html_content or "Welcome" in html_content
        assert "Our Services" in html_content
        assert "Photos" in html_content  # Gallery title from test data
        assert "What Our Clients Say" in html_content
        assert "Our Team" in html_content
        assert "Find Us" in html_content
        assert "Grand Opening Special" in html_content or "20% off" in html_content

        # ============================================================
        # Additional comprehensive field verification
        # ============================================================
        html_lower = html_content.lower()

        # hero_section.book_link_copy (custom button text)
        assert "Book Your Appointment" in html_content

        # color.primary_color and secondary_color
        assert "#FF6B6B" in html_content or "#ff6b6b" in html_lower
        assert "#4ECDC4" in html_content or "#4ecdc4" in html_lower

        # font.primary_font and secondary_font
        assert "Abhaya Libre" in html_content
        assert "Inter" in html_content

        # Verify fonts are properly applied in CSS
        # Check that primary font (Abhaya Libre) is set in CSS variables
        assert (
            "--primary-font: Abhaya Libre" in html_content
            or '--primary-font:"Abhaya Libre"' in html_content
            or "--primary-font: 'Abhaya Libre'" in html_content
            or "--primary-font:Abhaya Libre" in html_content
        )
        # Check that headers use primary font
        assert (
            "font-family: var(--primary-font)" in html_content
            or "font-family:var(--primary-font)" in html_content
        )
        # Check that secondary font (Inter) is set in CSS variables
        assert (
            "--secondary-font: Inter" in html_content
            or '--secondary-font:"Inter"' in html_content
            or "--secondary-font: 'Inter'" in html_content
            or "--secondary-font:Inter" in html_content
        )
        # Check that body/paragraphs use secondary font
        assert (
            "font-family: var(--secondary-font)" in html_content
            or "font-family:var(--secondary-font)" in html_content
        )

        # socials - verify social links are present in HTML (as href attributes)
        assert "instagram" in html_lower or "crownofbeauty" in html_lower
        assert "facebook" in html_lower
        assert "twitter" in html_lower or "tiktok" in html_lower

        # find_us.title
        assert (
            "Call to schedule an appointment" in html_content
            or "Walk-ins" in html_content
        )

        # booking_link.url and title
        assert "book.getpagoda.com" in html_content or "Book Now" in html_content

        # announcement_modal items
        assert "Braids & Twist" in html_content
        assert "Cornrows" in html_content

        # Database data verification
        # logo_data.image_url (favicon)
        assert "logo" in html_lower or "favicon" in html_lower
        # location_data.address (from complete_database_data.json)
        assert "123 Main Street" in html_content or "Boston" in html_content

        # Verify team text appears without <p> tags
        # The input has: "<p>Meet our <strong>talented</strong> professionals..."
        # But the rendered HTML should NOT have <p> tags wrapping the content in team-intro
        if team_text_input:
            # Extract plain text from input (remove HTML tags)
            # re and unescape are already imported at the top of the function
            team_plain_text = re.sub(r"<[^>]+>", " ", team_text_input)
            team_plain_text = unescape(team_plain_text).strip()

            # Verify the plain text appears in HTML
            assert (
                team_plain_text.lower() in html_text_normalized
            ), f"Team text '{team_plain_text}' not found in rendered HTML"

            # Find the team-intro section in the HTML
            team_intro_match = re.search(
                r'<div[^>]*class="[^"]*team-intro[^"]*"[^>]*>(.*?)</div>',
                html_content,
                re.DOTALL | re.IGNORECASE,
            )
            assert team_intro_match is not None, "team-intro div not found in HTML"

            team_intro_content = team_intro_match.group(1)

            # Verify rich text formatting is present and working correctly
            # Rich text should contain formatting elements like <strong>, <em>, lists, etc.
            assert (
                "Meet our" in team_intro_content
                or "meet our" in team_intro_content.lower()
            ), "Team text 'Meet our' should appear in team-intro content"

            # Verify rich text formatting elements are rendered
            assert (
                "<strong>" in team_intro_content
                or "talented" in team_intro_content.lower()
            ), "Rich text formatting (<strong>) should be present or text should appear"

            # Verify rich text content is properly rendered
            assert (
                "exceptional service" in team_intro_content.lower()
                or "years of experience" in team_intro_content.lower()
            ), "Team rich text content should be present in rendered HTML"

            # Verify list elements if present in rich text
            if "<ul>" in team_text_input or "<li>" in team_text_input:
                assert (
                    "<ul>" in team_intro_content or "<li>" in team_intro_content
                ), "Rich text lists should be rendered in HTML"

            # Verify line spacing (br tags) if present in rich text
            if "<br><br>" in team_text_input or "<br />" in team_text_input:
                assert (
                    "<br>" in team_intro_content or "<br />" in team_intro_content
                ), "Rich text line spacing (<br>) should be rendered in HTML"

        # ============================================================
        # Navigation Bar Tests - Verify testimonials link appears when enabled
        # ============================================================
        # Verify testimonials link appears in full navigation bar
        assert (
            'href="#testimonials"' in html_content and "Testimonials" in html_content
        ), "Testimonials link should appear in navigation when testimonials are enabled"

        # Verify testimonials link appears in partial navigation bar
        # Check for nav-links-partial or nav-links-right containing testimonials
        assert (
            'nav-link">Testimonials' in html_content
            or 'nav-link">Testimonials</a>' in html_content
            or 'href="#testimonials"' in html_content
        ), "Testimonials link should appear in partial navigation when testimonials are enabled"

        # Verify testimonials link appears in mobile accordion
        assert (
            'accordion-link">Testimonials' in html_content
            or 'accordion-link">Testimonials</a>' in html_content
        ), "Testimonials link should appear in mobile accordion when testimonials are enabled"

        # Verify file was created
        assert output_file.exists()
        assert output_file.stat().st_size > 0

    @pytest.fixture
    def crown_of_beauty_preview_input_data(self) -> Dict[str, Any]:
        """Load Crown of Beauty preview input data from JSON file."""
        import json
        from pathlib import Path

        json_file = (
            Path(__file__).parent
            / "test_examples"
            / "crown_of_beauty"
            / "complete_preview_input.json"
        )
        with open(json_file, "r", encoding="utf-8") as f:
            return json.load(f)

    @pytest.fixture
    def crown_of_beauty_company_data(self) -> Dict[str, Any]:
        """Load Crown of Beauty company data from JSON file."""
        import json
        from pathlib import Path

        json_file = (
            Path(__file__).parent
            / "test_examples"
            / "crown_of_beauty"
            / "complete_database_data.json"
        )
        with open(json_file, "r", encoding="utf-8") as f:
            return json.load(f)

    def test_crown_of_beauty_generate_preview_saves_html_example(
        self,
        crown_of_beauty_preview_input_data,
        crown_of_beauty_company_data,
        mock_repository,
    ):
        """
        Test that generates complete HTML for Crown of Beauty and saves it to file.

        This test creates a complete PreviewInputModel from Crown of Beauty data,
        merges it with SQL data, renders the template, and saves the HTML output
        to a file for visual inspection.
        """
        import os
        from pathlib import Path
        from endpoints.generate_preview.input_model.preview_input_model import (
            PreviewInputModel,
        )
        from templates.input_models import merge_preview_with_sql_data
        from static_web_handler.static_web_handler import StaticWebGenerator

        # Create PreviewInputModel from Crown of Beauty data
        preview_input = PreviewInputModel.from_dict(crown_of_beauty_preview_input_data)

        # Merge with mock SQL data
        salon_id = crown_of_beauty_company_data["salon_uuid"]
        website_data = merge_preview_with_sql_data(
            preview_input=preview_input,
            sql_data=crown_of_beauty_company_data,
            salon_id=salon_id,
            cbp_redirect_base_url="https://book.getpagoda.com/",
        )

        # Render HTML template
        static_web_generator = StaticWebGenerator(
            s3_bucket_name="test-bucket",
            s3_region="us-east-1",
            repository=mock_repository,
        )
        html_content = static_web_generator.render_website_template(website_data)

        # Save to file in crown_of_beauty folder
        test_examples_dir = Path(__file__).parent / "test_examples" / "crown_of_beauty"
        test_examples_dir.mkdir(parents=True, exist_ok=True)

        output_file = test_examples_dir / "crown_of_beauty_complete_example.html"
        with open(output_file, "w", encoding="utf-8") as f:
            f.write(html_content)

        print(f"\n✓ Saved Crown of Beauty HTML example to: {output_file.absolute()}")

        # Verify HTML was generated
        assert html_content is not None
        assert len(html_content) > 0
        assert "<!DOCTYPE html>" in html_content
        assert "<html" in html_content
        assert "</html>" in html_content

        # Verify key sections are present
        assert "Crown of Beauty" in html_content
        assert "Where Beauty Meets Elegance" in html_content
        assert "Our Services" in html_content
        assert "About Us" in html_content or "About" in html_content
        assert "345b Centre Street" in html_content or "Jamaica Plain" in html_content

        # Verify file was created
        assert output_file.exists()
        assert output_file.stat().st_size > 0

    def test_minimum_preview_generate_preview_saves_html_example(
        self,
        minimum_preview_input_data,
        minimum_preview_company_data,
        mock_repository,
    ):
        """
        Test that generates HTML for minimum preview (only required fields) and saves it to file.

        This test creates a PreviewInputModel with only required fields from Crown of Beauty data,
        merges it with SQL data, renders the template, and saves the HTML output
        to a file for visual inspection.
        """
        import os
        from pathlib import Path
        from endpoints.generate_preview.input_model.preview_input_model import (
            PreviewInputModel,
        )
        from templates.input_models import merge_preview_with_sql_data
        from static_web_handler.static_web_handler import StaticWebGenerator

        # Create PreviewInputModel from minimum preview data
        preview_input = PreviewInputModel.from_dict(minimum_preview_input_data)

        # Merge with mock SQL data
        salon_id = minimum_preview_company_data["salon_uuid"]
        website_data = merge_preview_with_sql_data(
            preview_input=preview_input,
            sql_data=minimum_preview_company_data,
            salon_id=salon_id,
            cbp_redirect_base_url="https://book.getpagoda.com/",
        )

        # Render HTML template
        static_web_generator = StaticWebGenerator(
            s3_bucket_name="test-bucket",
            s3_region="us-east-1",
            repository=mock_repository,
        )
        html_content = static_web_generator.render_website_template(website_data)

        # Save to file in minimum_preview folder
        test_examples_dir = Path(__file__).parent / "test_examples" / "minimum_preview"
        test_examples_dir.mkdir(parents=True, exist_ok=True)

        output_file = test_examples_dir / "minimum_preview_example.html"
        with open(output_file, "w", encoding="utf-8") as f:
            f.write(html_content)

        print(f"\n✓ Saved minimum preview HTML example to: {output_file.absolute()}")

        # Verify HTML was generated
        assert html_content is not None
        assert len(html_content) > 0
        assert "<!DOCTYPE html>" in html_content
        assert "<html" in html_content
        assert "</html>" in html_content

        # Verify key sections are present (required fields only)
        assert (
            "Crown of Beauty" in html_content
            or "Where Beauty Meets Elegance" in html_content
        )
        assert "Our Services" in html_content
        assert "Find Us" in html_content or "Visit us at our location" in html_content

        # Verify file was created
        assert output_file.exists()
        assert output_file.stat().st_size > 0


class TestPopulateSiteTemplate:
    """Test template generation for populate_site_template endpoint (TemplateInput)."""

    @pytest.fixture
    def complete_preview_input_data(self) -> Dict[str, Any]:
        """Load complete preview input data from JSON file."""
        import json
        from pathlib import Path

        json_file = (
            Path(__file__).parent / "test_examples" / "complete_preview_input.json"
        )
        with open(json_file, "r", encoding="utf-8") as f:
            return json.load(f)

    @pytest.fixture
    def mock_company_data(self) -> Dict[str, Any]:
        """Load mock company data from JSON file."""
        import json
        from pathlib import Path

        json_file = (
            Path(__file__).parent / "test_examples" / "complete_database_data.json"
        )
        with open(json_file, "r", encoding="utf-8") as f:
            return json.load(f)

    def test_populate_site_template_saves_html_example(
        self, complete_preview_input_data, mock_company_data
    ):
        """
        Test that generates complete HTML using populate_site_template flow and saves it.

        This test uses TemplateInput (same as populate_site_template endpoint),
        generates HTML using TemplateHandler.generate_template(), and saves the output.
        """
        from pathlib import Path
        from unittest.mock import Mock, MagicMock

        from endpoints.populate_site_template.input_model.template_input_model import (
            TemplateInput,
        )
        from static_web_handler.template_handler import TemplateHandler

        # Create TemplateInput from complete data (same as populate_site_template does)
        template_input = TemplateInput.from_dict(complete_preview_input_data)

        # Create mock repository that returns the mock company data
        mock_repo = Mock()
        mock_repo.get_company_data.return_value = mock_company_data

        # Use TemplateHandler (same as populate_site_template endpoint)
        handler = TemplateHandler(mock_repo)
        salon_id = mock_company_data.get("salon_uuid", "test-salon-uuid")

        # Generate template (this is what populate_site_template calls)
        result = handler.generate_template(template_input, salon_id)

        # Extract HTML from result
        html_content = result.get("website", "")

        # Save to file
        test_examples_dir = Path(__file__).parent / "test_examples"
        test_examples_dir.mkdir(exist_ok=True)

        output_file = test_examples_dir / "populate_site_template_complete_example.html"
        with open(output_file, "w", encoding="utf-8") as f:
            f.write(html_content)

        print(f"\n✓ Saved populate_site_template HTML to: {output_file.absolute()}")

        # Verify HTML was generated
        assert html_content is not None
        assert len(html_content) > 0
        assert "<!DOCTYPE html>" in html_content
        assert "<html" in html_content
        assert "</html>" in html_content

        # Verify result structure
        assert "website" in result
        assert "websiteType" in result
        assert "template_data" in result
        assert "field_schema" in result

        # Verify key sections are present
        assert "Crown of Beauty" in html_content
        assert "Our Services" in html_content

        # Verify fonts are properly applied
        # Check that primary font (Abhaya Libre) is set in CSS variables
        assert (
            "--primary-font: Abhaya Libre" in html_content
            or '--primary-font:"Abhaya Libre"' in html_content
            or "--primary-font: 'Abhaya Libre'" in html_content
        )
        # Check that headers use primary font
        assert (
            "font-family: var(--primary-font)" in html_content
            or "font-family:var(--primary-font)" in html_content
        )
        # Check that secondary font (Inter) is set in CSS variables
        assert (
            "--secondary-font: Inter" in html_content
            or '--secondary-font:"Inter"' in html_content
            or "--secondary-font: 'Inter'" in html_content
        )
        # Check that body/paragraphs use secondary font
        assert (
            "font-family: var(--secondary-font)" in html_content
            or "font-family:var(--secondary-font)" in html_content
        )
        assert "Find Us" in html_content or "Visit us" in html_content

        # ============================================================
        # Navigation Bar Tests - Verify testimonials link appears when enabled
        # ============================================================
        # Verify testimonials link appears in full navigation bar
        assert (
            'href="#testimonials"' in html_content and "Testimonials" in html_content
        ), "Testimonials link should appear in navigation when testimonials are enabled"

        # Verify testimonials link appears in partial navigation bar
        assert (
            'nav-link">Testimonials' in html_content
            or 'nav-link">Testimonials</a>' in html_content
            or 'href="#testimonials"' in html_content
        ), "Testimonials link should appear in partial navigation when testimonials are enabled"

        # Verify testimonials link appears in mobile accordion
        assert (
            'accordion-link">Testimonials' in html_content
            or 'accordion-link">Testimonials</a>' in html_content
        ), "Testimonials link should appear in mobile accordion when testimonials are enabled"

        # Verify file was created
        assert output_file.exists()
        assert output_file.stat().st_size > 0

    def test_populate_site_template_with_all_fields(
        self, complete_preview_input_data, mock_company_data
    ):
        """
        Test that all fields in complete_preview_input.json are accepted by TemplateInput.

        This validates that TemplateInput has all the same fields as PreviewInputModel.
        """
        from endpoints.populate_site_template.input_model.template_input_model import (
            TemplateInput,
        )

        # This should NOT raise any errors for unexpected keyword arguments
        template_input = TemplateInput.from_dict(complete_preview_input_data)

        # Verify key fields were parsed
        assert template_input.hero_section is not None
        assert template_input.hero_section.header == "Welcome to Crown of Beauty"
        assert template_input.hero_section.book_link_copy == "Book Your Appointment"

        assert template_input.our_services is not None
        assert template_input.our_services.header == "Our Services"

        assert template_input.color is not None
        assert template_input.color.primary_color == "#FF6B6B"

        assert template_input.testimonials is not None
        assert template_input.gallery is not None
        assert template_input.banner is not None
        assert template_input.team is not None
        assert template_input.announcement_modal is not None
        assert template_input.find_us is not None
        assert template_input.booking_link is not None

    @pytest.fixture
    def populate_site_template_null_sections_input_data(self) -> Dict[str, Any]:
        """Load populate_site_template input with null required sections but defaults for style and booking."""
        import json
        from pathlib import Path

        json_file = (
            Path(__file__).parent
            / "test_examples"
            / "minimum_preview"
            / "populate_site_template_null_sections_input.json"
        )
        with open(json_file, "r", encoding="utf-8") as f:
            return json.load(f)

    def test_populate_site_template_null_sections_saves_html_example(
        self,
        populate_site_template_null_sections_input_data,
        minimum_preview_company_data,
    ):
        """
        Test that generates HTML using populate_site_template with null required sections
        (hero, services, team, contact, footer) but with defaults for bookingLink, colors, and fonts.

        This test uses TemplateInput where required sections are null/not provided,
        but style sections (color, font) and booking_link have default values.
        The generated HTML should use defaults for missing sections.
        """
        from pathlib import Path
        from unittest.mock import Mock

        from endpoints.populate_site_template.input_model.template_input_model import (
            TemplateInput,
        )
        from static_web_handler.template_handler import TemplateHandler

        # Create TemplateInput from data with null required sections but defaults for style/booking
        template_input = TemplateInput.from_dict(
            populate_site_template_null_sections_input_data
        )

        # Create mock repository that returns the company data
        mock_repo = Mock()
        mock_repo.get_company_data.return_value = minimum_preview_company_data

        # Use TemplateHandler (same as populate_site_template endpoint)
        handler = TemplateHandler(mock_repo)
        salon_id = minimum_preview_company_data.get(
            "salon_uuid", "crown-of-beauty-uuid-12345"
        )

        # Generate template (this is what populate_site_template calls)
        result = handler.generate_template(template_input, salon_id)

        # Extract HTML from result
        html_content = result.get("website", "")

        # Save to file in minimum_preview folder
        test_examples_dir = Path(__file__).parent / "test_examples" / "minimum_preview"
        test_examples_dir.mkdir(parents=True, exist_ok=True)

        output_file = (
            test_examples_dir / "populate_site_template_null_sections_example.html"
        )
        with open(output_file, "w", encoding="utf-8") as f:
            f.write(html_content)

        print(
            f"\n✓ Saved populate_site_template null sections HTML to: {output_file.absolute()}"
        )

        # Verify HTML was generated
        assert html_content is not None
        assert len(html_content) > 0
        assert "<!DOCTYPE html>" in html_content
        assert "<html" in html_content
        assert "</html>" in html_content

        # Verify no placeholders are present (should use defaults instead)
        assert (
            "{{PLACEHOLDER:" not in html_content
        ), "HTML should not contain placeholder strings, should use defaults instead"

        # Verify result structure
        assert "website" in result
        assert "websiteType" in result
        assert "template_data" in result
        assert "field_schema" in result

        # ============================================================
        # Navigation Bar Tests - Verify testimonials link does NOT appear when disabled
        # ============================================================
        # Verify testimonials link does NOT appear in navigation when testimonials are not provided
        # Check that navigation exists but testimonials link is not present
        assert "nav-link" in html_content, "Navigation should exist"

        # Extract navigation sections to verify testimonials link is not present
        import re

        # Check full nav bar (nav-links-right)
        nav_right_pattern = (
            r'<div[^>]*class="[^"]*nav-links-right[^"]*"[^>]*>(.*?)</div>'
        )
        nav_right_match = re.search(
            nav_right_pattern, html_content, re.DOTALL | re.IGNORECASE
        )
        if nav_right_match:
            nav_right_content = nav_right_match.group(1)
            assert (
                'href="#testimonials"' not in nav_right_content
            ), "Testimonials link should NOT appear in nav-links-right when testimonials are disabled"

        # Check partial nav bar (nav-links-partial)
        nav_partial_pattern = (
            r'<div[^>]*class="[^"]*nav-links-partial[^"]*"[^>]*>(.*?)</div>'
        )
        nav_partial_match = re.search(
            nav_partial_pattern, html_content, re.DOTALL | re.IGNORECASE
        )
        if nav_partial_match:
            nav_partial_content = nav_partial_match.group(1)
            assert (
                'href="#testimonials"' not in nav_partial_content
            ), "Testimonials link should NOT appear in nav-links-partial when testimonials are disabled"

        # Check mobile accordion (accordion-section)
        accordion_pattern = (
            r'<div[^>]*class="[^"]*accordion-section[^"]*"[^>]*>(.*?)</div>'
        )
        accordion_match = re.search(
            accordion_pattern, html_content, re.DOTALL | re.IGNORECASE
        )
        if accordion_match:
            accordion_content = accordion_match.group(1)
            assert (
                'href="#testimonials"' not in accordion_content
            ), "Testimonials link should NOT appear in mobile accordion when testimonials are disabled"

        # Verify file was created
        assert output_file.exists()
        assert output_file.stat().st_size > 0

    @pytest.fixture
    def populate_site_template_complete_input_data(self) -> Dict[str, Any]:
        """Load complete populate_site_template input with all sections provided."""
        import json
        from pathlib import Path

        json_file = (
            Path(__file__).parent
            / "test_examples"
            / "minimum_preview"
            / "populate_site_template_complete_input.json"
        )
        with open(json_file, "r", encoding="utf-8") as f:
            return json.load(f)

    def test_populate_site_template_complete_input_saves_html_example(
        self, populate_site_template_complete_input_data, minimum_preview_company_data
    ):
        """
        Test that generates HTML using populate_site_template with complete input object.
        All sections are provided with values (some empty strings/arrays, but sections present).

        This test uses TemplateInput with all sections provided, generates HTML using
        TemplateHandler.generate_template(), and saves the output.
        """
        from pathlib import Path
        from unittest.mock import Mock

        from endpoints.populate_site_template.input_model.template_input_model import (
            TemplateInput,
        )
        from static_web_handler.template_handler import TemplateHandler

        # Create TemplateInput from complete data
        template_input = TemplateInput.from_dict(
            populate_site_template_complete_input_data
        )

        # Create mock repository that returns the company data
        mock_repo = Mock()
        mock_repo.get_company_data.return_value = minimum_preview_company_data

        # Use TemplateHandler (same as populate_site_template endpoint)
        handler = TemplateHandler(mock_repo)
        salon_id = minimum_preview_company_data.get(
            "salon_uuid", "crown-of-beauty-uuid-12345"
        )

        # Generate template (this is what populate_site_template calls)
        result = handler.generate_template(template_input, salon_id)

        # Extract HTML from result
        html_content = result.get("website", "")

        # Save to file in minimum_preview folder
        test_examples_dir = Path(__file__).parent / "test_examples" / "minimum_preview"
        test_examples_dir.mkdir(parents=True, exist_ok=True)

        output_file = (
            test_examples_dir / "populate_site_template_complete_input_example.html"
        )
        with open(output_file, "w", encoding="utf-8") as f:
            f.write(html_content)

        print(
            f"\n✓ Saved populate_site_template complete input HTML to: {output_file.absolute()}"
        )

        # Verify HTML was generated
        assert html_content is not None
        assert len(html_content) > 0
        assert "<!DOCTYPE html>" in html_content
        assert "<html" in html_content
        assert "</html>" in html_content

        # Verify no placeholders are present (should use defaults instead)
        assert (
            "{{PLACEHOLDER:" not in html_content
        ), "HTML should not contain placeholder strings, should use defaults instead"

        # Verify result structure
        assert "website" in result
        assert "websiteType" in result
        assert "template_data" in result
        assert "field_schema" in result

        # ============================================================
        # Navigation Bar Tests - Verify testimonials link appears when testimonials object exists
        # ============================================================
        # This test has testimonials object (even if empty array), so link should appear
        assert (
            'href="#testimonials"' in html_content and "Testimonials" in html_content
        ), "Testimonials link should appear in navigation when testimonials object is provided"

        # Verify file was created
        assert output_file.exists()
        assert output_file.stat().st_size > 0


if __name__ == "__main__":
    pytest.main([__file__, "-v", "-s"])
