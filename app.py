
from flask import Flask, render_template, request, jsonify
from google import genai
from google.genai.errors import ServerError
from dotenv import load_dotenv
import os
import json
import re

# Load environment variables
load_dotenv()

app = Flask(__name__)

# Gemini configuration
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
MODEL = "gemini-3.5-flash-lite"


@app.route("/")
def home():
    return render_template("index.html")


@app.route("/generate-quiz", methods=["POST"])
def generate_quiz():

    try:
        # Check API key
        if not GEMINI_API_KEY:
            return jsonify({
                "error": "Gemini API key is missing."
            }), 500

        # Get frontend data
        data = request.get_json(silent=True) or {}

        topic = data.get("topic", "").strip()
        difficulty = data.get("difficulty", "Medium")

        try:
            count = int(data.get("count", 5))
        except (TypeError, ValueError):
            return jsonify({
                "error": "Question count must be a number."
            }), 400

        # Validate inputs
        if not topic:
            return jsonify({
                "error": "Please enter a topic."
            }), 400

        if count < 1 or count > 20:
            return jsonify({
                "error": "Number of questions must be between 1 and 20."
            }), 400

        # Gemini client
        client = genai.Client(api_key=GEMINI_API_KEY)

        # AI prompt
        prompt = f"""
        You are an expert technical quiz generator.

        Generate exactly {count} multiple-choice questions.

        Topic: {topic}
        Difficulty: {difficulty}

        Requirements:
        1. Generate technically correct questions.
        2. Each question must have exactly 4 options.
        3. Provide the correct answer.
        4. Provide a short explanation.
        5. Avoid duplicate questions.

        Return only valid JSON in this format:

        {{
          "questions": [
            {{
              "question": "Question text",
              "options": [
                "Option A",
                "Option B",
                "Option C",
                "Option D"
              ],
              "answer": "Correct option",
              "explanation": "Explanation"
            }}
          ]
        }}
        """

        # Generate quiz
        response = client.models.generate_content(
            model=MODEL,
            contents=prompt,
            config={
                "response_mime_type": "application/json"
            }
        )

        result_text = response.text

        if not result_text:
            raise ValueError("Gemini returned an empty response.")

        # Parse JSON
        quiz_data = json.loads(result_text)

        questions = quiz_data.get("questions", [])

        if not isinstance(questions, list):
            raise ValueError("Invalid questions format.")

        if len(questions) != count:
            raise ValueError("Incorrect number of questions generated.")

        # Validate questions
        for question in questions:

            if not isinstance(question, dict):
                raise ValueError("Invalid question format.")

            if not isinstance(question.get("question"), str):
                raise ValueError("Question text is missing.")

            if not isinstance(question.get("options"), list):
                raise ValueError("Options are missing.")

            if len(question["options"]) != 4:
                raise ValueError("Each question must have four options.")

            if not question.get("answer"):
                raise ValueError("Correct answer is missing.")

            if not question.get("explanation"):
                raise ValueError("Explanation is missing.")

        return jsonify({
            "questions": questions
        })

    except json.JSONDecodeError:
        return jsonify({
            "error": "Invalid JSON received from Gemini. Please try again."
        }), 500

    except ServerError as e:
        app.logger.error("Gemini server error: %s", e)

        return jsonify({
            "error": "Gemini is temporarily busy. Please try again later."
        }), 503

    except Exception as e:
        app.logger.exception("Quiz generation failed")

        return jsonify({
            "error": "Quiz generation failed. Please check your API configuration."
        }), 500


if __name__ == "__main__":
    app.run(debug=True)
