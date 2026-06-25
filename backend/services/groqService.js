import Groq from 'groq-sdk';

let groqInstance = null;
function getGroq() {
  if (!groqInstance) {
    const apiKey = process.env.GROQ_API_KEY;
    if (apiKey) {
      groqInstance = new Groq({ apiKey });
    } else {
      console.warn('⚠️ GROQ_API_KEY is not set. Using local mock evaluations for LLM grading.');
    }
  }
  return groqInstance;
}

const CATEGORY_BRIEFS = {
  Technical: 'Algorithmic problem solving, thread synchronization, or code refactoring tasks requiring a javascript solution.',
  Domain: 'System design, microservices network routing configurations, rate limits, or machine learning feature engineering strategy.',
  Aptitude: 'Logical proofs, mathematical reasoning, probability, or sequence puzzle questions with multiple choice options.',
  HR: 'Behavioral interview scenarios evaluating cooperation, leadership, or handling compressed deadlines.'
};

// Evaluate a behavioral STAR (Situation, Task, Action, Result) prompt response using Groq
async function evaluateStarResponse(promptText, responseText) {
  const groqClient = getGroq();
  if (!groqClient) {
    // Fallback if Groq is not configured
    const wordCount = responseText.trim().split(/\s+/).filter(Boolean).length;
    const score = wordCount >= 30 ? 90 : wordCount >= 10 ? 60 : 30;
    return {
      score,
      meetsStandards: score >= 50,
      explanation: `[Simulated LLM Grader] Evaluated ${wordCount} words. Response length is ${wordCount >= 30 ? 'excellent' : 'sufficient'}.`
    };
  }

  try {
    const chatCompletion = await groqClient.chat.completions.create({
      messages: [
        {
          role: 'system',
          content: 'You are an AI Interviewer. Analyze the candidate\'s response to a STAR behavioral prompt. Evaluate if they correctly addressed the Situation, Task, Action, and Result. You must reply strictly in JSON format with three properties: "score" (number from 0 to 100), "meetsStandards" (boolean), and "explanation" (string).'
        },
        {
          role: 'user',
          content: `Behavioral Prompt: ${promptText}\nCandidate Response: ${responseText}`
        }
      ],
      model: 'llama-3.1-8b-instant',
      response_format: { type: 'json_object' }
    });

    const result = JSON.parse(chatCompletion.choices[0].message.content);
    return {
      score: Number(result.score) || 50,
      meetsStandards: Boolean(result.meetsStandards),
      explanation: result.explanation || 'Evaluated successfully.'
    };
  } catch (error) {
    console.error('Error calling Groq for STAR evaluation:', error);
    const wordCount = responseText.trim().split(/\s+/).filter(Boolean).length;
    return {
      score: wordCount >= 10 ? 70 : 30,
      meetsStandards: wordCount >= 10,
      explanation: 'Evaluated via fallback grader due to api connection limitations.'
    };
  }
}

// Generate dynamic challenges for a category
async function generateChallenges(category) {
  const brief = CATEGORY_BRIEFS[category] || 'General aptitude problem';
  const groqClient = getGroq();

  if (!groqClient) {
    return getLocalMockChallenges(category);
  }

  try {
    const prompt = `You are a career preparation exam engine. Generate exactly 2 high-quality challenges of category "${category}" in JSON format.
Each challenge must have:
- "title": String (short, engaging)
- "difficulty": "Novice" | "Adept" | "Elite" | "Apex"
- "xpValue": Number (between 100 and 700)
- "problemStatement": String
${category === 'Aptitude' ? `- "mcqOptions": Array of 4 strings\n- "correctAnswerIndex": Number (0 to 3)` : ''}
${category === 'HR' ? `- "behavioralPrompt": String (guiding tips)` : ''}
${category === 'Technical' || category === 'Domain' ? `- "boilerplate": String (initial code or mock config)\n- "constraints": Array of strings\n- "testCases": Array of objects containing "input" (string) and "output" (string)` : ''}

Output strictly a JSON object containing a "challenges" array. Do not wrap in markdown blocks.`;

    const chatCompletion = await groqClient.chat.completions.create({
      messages: [{ role: 'user', content: prompt }],
      model: 'llama-3.1-8b-instant',
      response_format: { type: 'json_object' }
    });

    const cleanContent = chatCompletion.choices[0].message.content.trim();
    const data = JSON.parse(cleanContent);
    return data.challenges || [];
  } catch (error) {
    console.error('Error generating challenges via Groq:', error);
    return getLocalMockChallenges(category);
  }
}

function getLocalMockChallenges(category) {
  if (category === 'Technical') {
    return [
      {
        title: 'Reverse Words in String',
        category: 'Technical',
        difficulty: 'Novice',
        xpValue: 150,
        problemStatement: 'Write a javascript function solution(str) that reverses the order of words in a sentence. Words are separated by spaces.',
        boilerplate: 'function solution(str) {\n  // Write your code here\n  return "";\n}',
        constraints: ['Input string size < 1000', 'Words separated by a single space.'],
        testCases: [
          { input: '"hello world"', output: '"world hello"' },
          { input: '"career prep engine"', output: '"engine prep career"' }
        ]
      },
      {
        title: 'Find Matrix Peak Element',
        category: 'Technical',
        difficulty: 'Adept',
        xpValue: 320,
        problemStatement: 'Write a javascript function solution(arr) that returns the maximum element of a 1D array of integers.',
        boilerplate: 'function solution(arr) {\n  // Write code\n  return 0;\n}',
        constraints: ['Array size < 100'],
        testCases: [
          { input: '[1, 5, 3, 9, 2]', output: '9' },
          { input: '[-1, -5, -2]', output: '-1' }
        ]
      }
    ];
  }

  if (category === 'Domain') {
    return [
      {
        title: 'Kubernetes Ingress YAML routing',
        category: 'Domain',
        difficulty: 'Elite',
        xpValue: 420,
        problemStatement: 'Define an ingress routing YAML config. Your text must define path /api/v1/auth routed to auth-service.',
        boilerplate: '# Provide YAML configs here\napiVersion: networking.k8s.io/v1\nkind: Ingress\n...',
        constraints: ['Must contain auth-service', 'Must specify path /api/v1/auth'],
        testCases: [
          { input: 'validate', output: 'ok' }
        ]
      }
    ];
  }

  if (category === 'Aptitude') {
    return [
      {
        title: 'Probability of Consecutive Cards',
        category: 'Aptitude',
        difficulty: 'Novice',
        xpValue: 140,
        problemStatement: 'Two cards are drawn from a standard deck of 52 cards without replacement. What is the probability that both are aces?',
        mcqOptions: ['1/221', '1/169', '3/676', '1/13'],
        correctAnswerIndex: 0
      },
      {
        title: 'Arithmetic progression sum',
        category: 'Aptitude',
        difficulty: 'Adept',
        xpValue: 200,
        problemStatement: 'Find the sum of all odd integers between 1 and 100 inclusive.',
        mcqOptions: ['2500', '2550', '2600', '5050'],
        correctAnswerIndex: 0
      }
    ];
  }

  if (category === 'HR') {
    return [
      {
        title: 'Resolving Technical Disagreements',
        category: 'HR',
        difficulty: 'Adept',
        xpValue: 220,
        problemStatement: 'Describe a situation where you had a strong technical disagreement with a team lead. Walk through Situation, Task, Action, Result.',
        behavioralPrompt: 'Highlight how you kept the conversation objective, referenced data points, and committed to the final consensus.'
      }
    ];
  }

  return [];
}

export {
  evaluateStarResponse,
  generateChallenges
};
