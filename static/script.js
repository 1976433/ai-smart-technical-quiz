
let quizQuestions = [];


// Generate quiz using Gemini API
async function generateQuiz() {

    const topic = document.getElementById("topic").value.trim();
    const difficulty = document.getElementById("difficulty").value;
    const count = parseInt(document.getElementById("count").value);

    const errorBox = document.getElementById("error");
    const loading = document.getElementById("loading");
    const generateBtn = document.getElementById("generateBtn");

    errorBox.classList.add("hidden");

    if (!topic) {
        showError("Please enter a technical topic.");
        return;
    }

    loading.classList.remove("hidden");
    generateBtn.disabled = true;

    document.getElementById("quizSection").classList.add("hidden");
    document.getElementById("resultSection").classList.add("hidden");

    try {

        const response = await fetch("/generate-quiz", {

            method: "POST",

            headers: {
                "Content-Type": "application/json"
            },

            body: JSON.stringify({
                topic: topic,
                difficulty: difficulty,
                count: count
            })
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.error || "Failed to generate quiz.");
        }

        if (!Array.isArray(data.questions) || data.questions.length === 0) {
            throw new Error("No questions received. Please try again.");
        }

        quizQuestions = data.questions;

        displayQuiz();

    } catch (error) {

        showError(error.message);

    } finally {

        loading.classList.add("hidden");
        generateBtn.disabled = false;
    }
}


// Display questions
function displayQuiz() {

    const quizContainer = document.getElementById("quizContainer");
    const quizSection = document.getElementById("quizSection");

    quizContainer.innerHTML = "";

    quizQuestions.forEach((question, index) => {

        const card = document.createElement("div");
        card.className = "question-card";

        const title = document.createElement("h3");
        title.textContent = `${index + 1}. ${question.question}`;

        card.appendChild(title);

        question.options.forEach((option, optionIndex) => {

            const label = document.createElement("label");
            label.className = "option";

            const radio = document.createElement("input");

            radio.type = "radio";
            radio.name = `question-${index}`;
            radio.value = optionIndex;

            const optionText = document.createElement("span");
            optionText.textContent = option;

            label.appendChild(radio);
            label.appendChild(optionText);

            card.appendChild(label);
        });

        quizContainer.appendChild(card);
    });

    document.getElementById("progress").textContent =
        `${quizQuestions.length} Questions`;

    quizSection.classList.remove("hidden");

    window.scrollTo({
        top: quizSection.offsetTop,
        behavior: "smooth"
    });
}


// Find correct answer index
function getCorrectIndex(question) {

    const answer = question.answer;

    // If answer is already a number
    if (typeof answer === "number") {
        return answer;
    }

    // If answer is the full option text
    const textIndex = question.options.findIndex(
        option => option.trim().toLowerCase() ===
                  String(answer).trim().toLowerCase()
    );

    if (textIndex !== -1) {
        return textIndex;
    }

    // Also support answers like A, B, C, D
    const letterIndex = ["A", "B", "C", "D"].indexOf(
        String(answer).trim().toUpperCase()
    );

    return letterIndex;
}


// Submit quiz and calculate score
function submitQuiz() {

    let score = 0;
    let answered = 0;

    const resultDetails = document.getElementById("resultDetails");

    resultDetails.innerHTML = "";

    quizQuestions.forEach((question, index) => {

        const selected = document.querySelector(
            `input[name="question-${index}"]:checked`
        );

        let userAnswer = null;

        if (selected) {
            userAnswer = parseInt(selected.value);
            answered++;
        }

        const correctIndex = getCorrectIndex(question);
        const isCorrect = userAnswer === correctIndex;

        if (isCorrect) {
            score++;
        }

        const resultItem = document.createElement("div");

        resultItem.className = isCorrect
            ? "result-item correct"
            : "result-item wrong";

        const selectedText = selected
            ? question.options[userAnswer]
            : "Not answered";

        const correctText = question.options[correctIndex] ?? question.answer;

        resultItem.innerHTML = `
            <strong>Question ${index + 1}: ${isCorrect ? "Correct ✓" : "Incorrect ✗"}</strong>

            <p>${escapeHtml(question.question)}</p>

            <p>Your answer: ${escapeHtml(selectedText)}</p>

            <p>Correct answer: ${escapeHtml(correctText)}</p>

            <p>Explanation: ${escapeHtml(question.explanation)}</p>
        `;

        resultDetails.appendChild(resultItem);
    });

    const percentage = Math.round(
        (score / quizQuestions.length) * 100
    );

    document.getElementById("score").textContent =
        `${score} / ${quizQuestions.length} (${percentage}%)`;

    let message = "";

    if (percentage >= 80) {
        message = "Excellent! You have a great understanding of this topic.";
    } else if (percentage >= 50) {
        message = "Good effort! Keep practising to improve your knowledge.";
    } else {
        message = "Keep learning! Practice makes you better.";
    }

    document.getElementById("resultMessage").textContent =
        `${message} You answered ${answered} out of ${quizQuestions.length} questions.`;

    document.getElementById("quizSection").classList.add("hidden");

    document.getElementById("resultSection").classList.remove("hidden");

    window.scrollTo({
        top: 0,
        behavior: "smooth"
    });
}


// Reset quiz
function resetQuiz() {

    quizQuestions = [];

    document.getElementById("resultSection").classList.add("hidden");
    document.getElementById("quizSection").classList.add("hidden");
    document.getElementById("error").classList.add("hidden");

    document.getElementById("topic").value = "";

    document.getElementById("difficulty").value = "Medium";
    document.getElementById("count").value = "5";

    window.scrollTo({
        top: 0,
        behavior: "smooth"
    });
}


// Display errors
function showError(message) {

    const errorBox = document.getElementById("error");

    errorBox.textContent = message;

    errorBox.classList.remove("hidden");
}


// Prevent HTML injection
function escapeHtml(text) {

    const div = document.createElement("div");

    div.textContent = String(text ?? "");

    return div.innerHTML;
}
