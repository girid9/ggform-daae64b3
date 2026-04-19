
# ICTSM Quiz System — Interactive Quiz with Study-First Flow

## Overview
A quiz platform where a tutor creates quiz sessions, shares a link with students, and tracks everyone's performance. All 768 questions from the PDF will be loaded.

## User Flows

### Tutor Flow (Admin Dashboard)
1. **Tutor Dashboard** at `/admin` — protected by a simple passcode
2. Click "Create New Quiz" → system randomly picks 20 questions from all 768
3. A unique quiz link is generated (e.g., `/quiz/abc123`) — tutor copies and shares with students
4. **Results view** — tutor sees a table of all students who took the quiz: name, score (correct/total), percentage, and timestamp
5. Click any student to see their detailed answers (which they got right/wrong)

### Student Flow
1. Student opens the shared link `/quiz/abc123`
2. **Enter Name** screen — student types their name
3. **Study Mode** — all 20 questions are shown WITH correct answers highlighted. Student reads and learns at their own pace
4. Click **"I'm Ready, Start Quiz"** → proceeds to quiz
5. **Quiz Mode** — same 20 questions but now **shuffled** (both question order AND option order randomized). No answers shown
6. Student selects answers and clicks **Submit**
7. **Results Screen** — shows score, percentage, and a review of each question with correct/incorrect highlights

## Database (Supabase)
- **quiz_questions** — all 768 parsed questions with options and correct answer
- **quiz_sessions** — each created quiz (ID, selected question IDs, created date)
- **quiz_attempts** — student name, quiz session ID, answers given, score, timestamp

## Pages & Components
- `/` — Landing page with link to admin
- `/admin` — Tutor dashboard (create quiz, view results)
- `/quiz/:id` — Student quiz flow (name → study → quiz → results)

## Key Features
- All 768 questions parsed from the PDF and stored in the database
- Questions and options shuffled using Fisher-Yates algorithm
- Mobile-friendly design (students likely on phones)
- Clean, simple UI suited for a tuition setting
