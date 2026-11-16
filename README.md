# LessonSpark

**Turn any topic into a lesson in seconds, even offline.**

LessonSpark is a web app for teachers. Type a topic, pick a grade and a language, and get a quiz, a simple explanation or a worksheet. Built for the #BuildHybridAI 2026 hackathon.

## Value proposition

Many teachers, especially in places with weak internet, spend hours writing quizzes and worksheets by hand. LessonSpark creates them in seconds. When Gemini Nano is available in Chrome, the lesson is created on the device, so it is fast, private and works without internet. When it is not available, or the language is not supported on-device, the app switches to cloud Gemini automatically.

## How it uses Firebase AI Logic

- `getAI` with `GoogleAIBackend` starts Firebase AI Logic (see `app.js`).
- `getGenerativeModel` with hybrid inference modes:
  - `InferenceMode.PREFER_ON_DEVICE` for English and Spanish (Gemini Nano in Chrome, with automatic cloud fallback).
  - `InferenceMode.ONLY_IN_CLOUD` for other languages such as Urdu, Arabic, Hindi and French.
- `model.generateContent()` creates the quiz, explanation or worksheet.
- `response.inferenceSource` tells the user whether the answer came from the device or the cloud.
- Firebase App Check protects the AI calls (debug token, as allowed by the hackathon rules).

## Features

- Quiz (5 multiple-choice questions with an answer key)
- Simple explanation (3 key points and an everyday example)
- Worksheet (fill-in-the-blank, short answer, activity, answer key)
- Languages: English, Urdu, Arabic, Hindi, Spanish, French
- Copy and print buttons
- Live status showing whether on-device AI is ready

## Run it

1. Open the live site (GitHub Pages link in the Devpost submission), or serve this folder on any web server. ES modules do not work from `file://`.
2. For on-device AI use desktop **Google Chrome 139 or newer**, with `chrome://flags/#prompt-api-for-gemini-nano-multimodal-input` set to Enabled. Without it the app still works using cloud Gemini.
3. Type a topic and press **Make Quiz**.

## Built with

Firebase AI Logic, Firebase App Check, Gemini (cloud), Gemini Nano (on-device), Chrome Prompt API, HTML, CSS and JavaScript.

## What was built during the hackathon period

The whole project (user interface, Firebase AI Logic integration, hybrid inference logic and App Check setup) was created during the submission period. No earlier code was reused. An AI coding assistant (Claude) helped write the code.

## License

Apache License 2.0. See the `LICENSE` file.
