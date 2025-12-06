"""Parse XML-wrapped responses from LLM."""

import json
import re
from typing import Any


class XmlParseError(Exception):
    """Base exception for XML parsing errors."""

    pass


class MissingTagError(XmlParseError):
    """Raised when expected XML tag is not found."""

    def __init__(self, tag: str, response_preview: str):
        self.tag = tag
        self.response_preview = response_preview
        preview = response_preview[:200] + "..." if len(response_preview) > 200 else response_preview
        super().__init__(f"No <{tag}> tag found in response. Response preview: {preview}")


class MalformedXmlError(XmlParseError):
    """Raised when XML is malformed."""

    def __init__(self, tag: str, error: str, response_preview: str):
        self.tag = tag
        self.error = error
        self.response_preview = response_preview
        preview = response_preview[:200] + "..." if len(response_preview) > 200 else response_preview
        super().__init__(f"Malformed XML around <{tag}>: {error}. Response preview: {preview}")


class TruncatedResponseError(XmlParseError):
    """Raised when response appears truncated."""

    def __init__(self, tag: str, response_preview: str):
        self.tag = tag
        self.response_preview = response_preview
        preview = response_preview[:200] + "..." if len(response_preview) > 200 else response_preview
        super().__init__(f"Response appears truncated - found <{tag}> but no </{tag}>. Response preview: {preview}")


def _extract_tag_bounds(response: str, tag: str) -> tuple[int, int, int, int]:
    """Find the bounds of a tag in response text.

    Returns:
        Tuple of (open_start, open_end, close_start, close_end)

    Raises:
        MissingTagError: If opening tag not found
        TruncatedResponseError: If closing tag not found
    """
    open_tag = f"<{tag}>"
    close_tag = f"</{tag}>"

    open_start = response.find(open_tag)
    if open_start == -1:
        raise MissingTagError(tag, response)

    open_end = open_start + len(open_tag)
    close_start = response.find(close_tag, open_end)

    if close_start == -1:
        raise TruncatedResponseError(tag, response)

    close_end = close_start + len(close_tag)
    return (open_start, open_end, close_start, close_end)


def parse_xml_content(response: str, tag: str) -> str:
    """Extract content from XML-wrapped response.

    Uses string-based extraction to handle LLM responses where content
    outside the tag may be invalid XML.

    Args:
        response: The full LLM response text
        tag: The XML tag to extract (e.g., "card", "question")

    Returns:
        The text content inside the tag, stripped of whitespace

    Raises:
        MissingTagError: If the tag is not found
        TruncatedResponseError: If response appears truncated
    """
    # Find the tag bounds using string search
    _, open_end, close_start, _ = _extract_tag_bounds(response, tag)

    # Extract the raw content
    raw_content = response[open_end:close_start]

    return raw_content.strip()


def parse_onboard_response(response: str) -> dict[str, Any]:
    """Parse onboard response - either question or config.

    Args:
        response: LLM response containing <question> or <canvas_config>

    Returns:
        Dict with "type" ("question" or "config") and "content"

    Raises:
        ValueError: If neither tag is found or JSON is invalid
        XmlParseError: If XML parsing fails
    """
    # Check for question first (more common in conversation)
    if "<question>" in response:
        content = parse_xml_content(response, "question")
        return {"type": "question", "content": content}
    elif "<canvas_config>" in response:
        config_json = parse_xml_content(response, "canvas_config")
        try:
            return {"type": "config", "content": json.loads(config_json)}
        except json.JSONDecodeError as e:
            raise ValueError(f"Invalid JSON in <canvas_config>: {e}")

    preview = response[:200] + "..." if len(response) > 200 else response
    raise ValueError(f"Response must contain <question> or <canvas_config>. Response preview: {preview}")


def parse_card_response(response: str) -> dict[str, Any]:
    """Parse card response from generate or combine.

    Args:
        response: LLM response containing <card> with JSON

    Returns:
        Parsed card data as dict

    Raises:
        XmlParseError: If XML parsing fails
        ValueError: If JSON parsing fails
    """
    card_json = parse_xml_content(response, "card")
    try:
        return json.loads(card_json)
    except json.JSONDecodeError as e:
        preview = card_json[:200] + "..." if len(card_json) > 200 else card_json
        raise ValueError(f"Invalid JSON in <card>: {e}. Content was: {preview}")


def parse_style_response(response: str) -> dict[str, Any]:
    """Parse style chat response - either style_update or question.

    Args:
        response: LLM response containing <style_update> or <question>

    Returns:
        Dict with "type" ("update" or "question") and relevant fields

    Raises:
        ValueError: If neither tag is found or JSON is invalid
        XmlParseError: If XML parsing fails
    """
    # Check for question first
    if "<question>" in response:
        content = parse_xml_content(response, "question")
        return {"type": "question", "explanation": content}
    elif "<style_update>" in response:
        style_json = parse_xml_content(response, "style_update")
        try:
            data = json.loads(style_json)
            # Flatten the response to match our API format
            result: dict[str, Any] = {"type": "update"}
            if "cardTheme" in data:
                result["card_theme"] = data["cardTheme"]
            if "canvasTheme" in data:
                result["canvas_theme"] = data["canvasTheme"]
            if "physics" in data:
                result["physics"] = data["physics"]
            if "explanation" in data:
                result["explanation"] = data["explanation"]
            return result
        except json.JSONDecodeError as e:
            raise ValueError(f"Invalid JSON in <style_update>: {e}")

    preview = response[:200] + "..." if len(response) > 200 else response
    raise ValueError(f"Response must contain <style_update> or <question>. Response preview: {preview}")
