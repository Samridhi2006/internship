const Groq = require('groq-sdk');
const RecruiterSession = require('../models/RecruiterSession');

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
const MODEL = 'llama-3.3-70b-versatile';

const COMPANY_PERSONAS = {
  Google: {
    style: 'structured, algorithmic, Socratic',
    values: 'scalability, clean code, systems thinking, Googleyness & leadership',
    hiringBar: 'L3–L5 Software Engineer',
    interviewStyle: 'Focuses on data structures, algorithms, system design, and behavioral leadership principles. Asks follow-up "why" questions to probe depth.',
    culture: 'Googleyness — comfort with ambiguity, collaborative problem solving, intellectual humility'
  },
  Amazon: {
    style: 'behavioral, STAR-method, leadership-principle-driven',
    values: '16 Leadership Principles — Customer Obsession, Ownership, Invent & Simplify, Bias for Action, Frugality',
    hiringBar: 'SDE I / SDE II / Senior SDE',
    interviewStyle: 'Heavy emphasis on behavioral STAR stories tied to Leadership Principles. Probes ownership, conflict resolution, and data-driven decisions.',
    culture: 'Day 1 mentality — urgency, frugality, customer-first thinking, long-term orientation'
  },
  Microsoft: {
    style: 'collaborative, growth-mindset, design-thinking',
    values: 'Growth mindset, empathy, inclusive design, clarity in communication',
    hiringBar: 'SDE I / SDE II / Senior SDE',
    interviewStyle: 'Balanced between technical coding, system design, and culture. Looks for clarity of thought, collaboration mindset, and how you handle ambiguity.',
    culture: "Satya Nadella's growth mindset — learn-it-all over know-it-all"
  },
  TCS: {
    style: 'professional, process-oriented, enterprise-focused',
    values: 'Process adherence, client service, technical fundamentals, teamwork',
    hiringBar: 'Associate Software Engineer / Assistant Systems Engineer',
    interviewStyle: 'Tests CS fundamentals, programming basics, aptitude, and communication. Values reliability, process discipline, and client-facing attitude.',
    culture: 'BANI world adaptability, continuous learning, delivery excellence'
  },
  Infosys: {
    style: 'structured, academic, communication-focused',
    values: 'Client delivery, learning agility, ethical conduct, teamwork',
    hiringBar: 'Systems Engineer / Technology Analyst',
    interviewStyle: 'Tests technical fundamentals, problem solving, and communication skills. Behavioral questions focus on teamwork, adaptability, and growth willingness.',
    culture: 'COBALT framework — cloud, cognitive, IoT, agile, API, automation'
  },
  Startup: {
    style: 'fast-paced, creative, outcome-oriented, scrappy',
    values: 'Ownership, versatility, speed, hustle, self-starter mindset',
    hiringBar: 'Full-Stack Engineer / Founding Engineer',
    interviewStyle: 'Tests real-world problem-solving ability, portfolio depth, and ability to wear multiple hats. Values practical skills over academic pedigree.',
    culture: 'Move fast, break things, iterate. Comfort with chaos and ambiguity is a must.'
  }
};

const DIFFICULTY_INSTRUCTIONS = {
  Easy: 'Ask beginner-to-intermediate questions. Be encouraging and supportive in tone. Use straightforward, unambiguous language.',
  Medium: 'Ask intermediate questions with some complexity. Probe for depth on key answers. Expect solid explanations.',
  Hard: 'Ask senior-level, complex questions. Challenge assumptions, ask follow-ups that expose edge cases. Expect architectural-level thinking.'
};

function stripJsonFences(text) {
  return text.replace(/^```(?:json)?\s*/i, '').replace(/\s*```\s*$/i, '').trim();
}

const startRecruiterSession = async (req, res) => {
  try {
    const { userId, companyName, jobRole, difficulty } = req.body;

    if (!userId || !companyName || !jobRole || !difficulty) {
      return res.status(400).json({ success: false, message: 'userId, companyName, jobRole, and difficulty are required.' });
    }

    const persona = COMPANY_PERSONAS[companyName];
    if (!persona) {
      return res.status(400).json({ success: false, message: `Unknown company: ${companyName}` });
    }

    const difficultyGuide = DIFFICULTY_INSTRUCTIONS[difficulty];

    const systemPrompt = `You are a ${companyName} recruiter conducting a ${difficulty} interview for the ${jobRole} position.

Company Persona:
- Interview Style: ${persona.interviewStyle}
- Core Values: ${persona.values}
- Culture: ${persona.culture}
- Hiring Bar Target: ${persona.hiringBar}
- Tone: ${persona.style}

Difficulty Instructions: ${difficultyGuide}

Your task: Write an immersive, realistic opening message that:
1. Introduces yourself with a believable ${companyName} recruiter name and title
2. Sets the scene — reference the specific role, ${companyName}'s mission, and today's interview structure
3. Strikes a tone authentic to ${companyName}'s culture
4. Ends with your FIRST interview question tailored to the role and difficulty level

Keep the intro concise but vivid. Make it feel like a real interview has just started.`;

    const completion = await groq.chat.completions.create({
      model: MODEL,
      messages: [{ role: 'user', content: systemPrompt }],
      temperature: 0.85,
      max_tokens: 600
    });

    const openingMessage = completion.choices[0]?.message?.content?.trim();

    const session = new RecruiterSession({
      userId,
      companyName,
      jobRole,
      difficulty,
      conversationHistory: [{
        role: 'recruiter',
        content: openingMessage,
        timestamp: new Date()
      }],
      currentQuestionIndex: 1,
      totalQuestions: 5,
      isCompleted: false
    });

    await session.save();

    return res.status(201).json({
      success: true,
      sessionId: session._id,
      message: openingMessage,
      currentQuestionIndex: session.currentQuestionIndex,
      totalQuestions: session.totalQuestions,
      companyName,
      jobRole,
      difficulty
    });
  } catch (error) {
    console.error('[startRecruiterSession] Error:', error);
    return res.status(500).json({ success: false, message: 'Failed to start session.', error: error.message });
  }
};

const submitAnswer = async (req, res) => {
  try {
    const { sessionId, answer } = req.body;

    if (!sessionId || !answer) {
      return res.status(400).json({ success: false, message: 'sessionId and answer are required.' });
    }

    const session = await RecruiterSession.findById(sessionId);
    if (!session) {
      return res.status(404).json({ success: false, message: 'Session not found.' });
    }
    if (session.isCompleted) {
      return res.status(400).json({ success: false, message: 'This session is already completed.' });
    }

    session.conversationHistory.push({
      role: 'candidate',
      content: answer,
      timestamp: new Date()
    });

    const persona = COMPANY_PERSONAS[session.companyName];
    const difficultyGuide = DIFFICULTY_INSTRUCTIONS[session.difficulty];

    const transcript = session.conversationHistory.map(m =>
      `${m.role === 'recruiter' ? 'Recruiter' : 'Candidate'}: ${m.content}`
    ).join('\n\n');

    if (session.currentQuestionIndex < session.totalQuestions) {
      const nextQPrompt = `You are a ${session.companyName} recruiter interviewing a candidate for ${session.jobRole} (${session.difficulty} difficulty).

Interview Style: ${persona.interviewStyle}
Core Values: ${persona.values}
Difficulty: ${difficultyGuide}

Conversation so far:
${transcript}

The candidate just answered Question ${session.currentQuestionIndex}. Now generate Question ${session.currentQuestionIndex + 1} of ${session.totalQuestions}.

Rules:
- Build logically on their last answer — probe deeper or pivot to a related area
- Match ${session.companyName}'s authentic interview style and values
- ${difficultyGuide}
- Output ONLY the next question (no preamble, no label like "Question X:")`;

      const nextQCompletion = await groq.chat.completions.create({
        model: MODEL,
        messages: [{ role: 'user', content: nextQPrompt }],
        temperature: 0.8,
        max_tokens: 300
      });

      const nextQuestion = nextQCompletion.choices[0]?.message?.content?.trim();

      session.conversationHistory.push({
        role: 'recruiter',
        content: nextQuestion,
        timestamp: new Date()
      });

      session.currentQuestionIndex += 1;
      await session.save();

      return res.status(200).json({
        success: true,
        message: nextQuestion,
        currentQuestionIndex: session.currentQuestionIndex,
        totalQuestions: session.totalQuestions,
        isCompleted: false
      });
    }

    session.currentQuestionIndex += 1;
    session.isCompleted = true;

    const evalPrompt = `You are a senior ${session.companyName} hiring committee evaluator reviewing a completed ${session.difficulty} interview for ${session.jobRole}.

Company Hiring Bar: ${persona.hiringBar}
Core Values: ${persona.values}
Interview Style: ${persona.interviewStyle}

Full Interview Transcript:
${transcript}

Evaluate the candidate thoroughly against ${session.companyName}'s hiring bar. Respond ONLY with a valid JSON object (no markdown fences, no explanation):

{
  "overallScore": <number 0-100>,
  "meetsExpectedStandards": <true|false>,
  "hiringDecision": "<one of: '${persona.hiringBar}', 'Requires Training', 'Strong Hire', 'No Hire', 'Hire with Conditions'>",
  "feedbackParameters": {
    "technicalDepth": "<one of: Exceptional | Strong | Adequate | Needs Improvement | Insufficient>",
    "problemSolving": "<one of: Exceptional | Strong | Adequate | Needs Improvement | Insufficient>",
    "communication": "<one of: Exceptional | Strong | Adequate | Needs Improvement | Insufficient>",
    "cultureFit": "<one of: Exceptional | Strong | Adequate | Needs Improvement | Insufficient>"
  },
  "detailedFeedback": "<2-3 paragraph honest, constructive assessment mentioning specific moments from the interview, actionable improvement areas, and what impressed ${session.companyName} evaluators>"
}`;

    const evalCompletion = await groq.chat.completions.create({
      model: MODEL,
      messages: [{ role: 'user', content: evalPrompt }],
      temperature: 0.6,
      max_tokens: 900
    });

    const rawEval = evalCompletion.choices[0]?.message?.content?.trim();
    const cleanedEval = stripJsonFences(rawEval);

    let evaluation;
    try {
      evaluation = JSON.parse(cleanedEval);
    } catch (parseErr) {
      console.error('[submitAnswer] JSON parse error:', parseErr.message, '\nRaw:', rawEval);
      evaluation = {
        overallScore: 50,
        meetsExpectedStandards: false,
        hiringDecision: 'Evaluation parsing error — please retry',
        feedbackParameters: {
          technicalDepth: 'Adequate',
          problemSolving: 'Adequate',
          communication: 'Adequate',
          cultureFit: 'Adequate'
        },
        detailedFeedback: 'We encountered an error parsing the AI evaluation. Please contact support or retry the session.'
      };
    }

    session.evaluation = evaluation;
    await session.save();

    return res.status(200).json({
      success: true,
      isCompleted: true,
      evaluation,
      totalQuestions: session.totalQuestions,
      currentQuestionIndex: session.currentQuestionIndex
    });
  } catch (error) {
    console.error('[submitAnswer] Error:', error);
    return res.status(500).json({ success: false, message: 'Failed to process answer.', error: error.message });
  }
};

module.exports = { startRecruiterSession, submitAnswer };
