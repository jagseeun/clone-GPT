import OpenAI from 'openai';
import dotenv from 'dotenv';

dotenv.config();

/**
 * DeepSeek 실시간 스트리밍 AI 응답 생성 함수
 * @param {Array<{role: string, content: string}>} messages - 현재 대화방의 메시지 배열
 * @param {Array<{role: string, content: string}>} globalMemory - 이전 대화방들에서 수집된 전역 메모리
 * @param {string} selectedModel - 선택된 모델 ('deepseek-chat' 또는 'deepseek-reasoner')
 * @returns {AsyncGenerator<{type: 'reasoning' | 'content', text: string}>}
 */
export async function* generateDeepSeekStream(messages, globalMemory = [], selectedModel = 'deepseek-chat') {
  const apiKey = process.env.DEEPSEEK_API_KEY?.trim();
  const model = selectedModel || process.env.DEEPSEEK_MODEL || 'deepseek-chat';

  // 1. API 키 미설정 시 시뮬레이션 스트리밍
  if (!apiKey) {
    const lastUserMsg = messages[messages.length - 1]?.content || '';
    const fallbackMessage = 
      `⚠️ **DeepSeek API 키가 아직 설정되지 않았습니다.**\n\n` +
      `실제 최신 모델(${model})의 답변을 받아보시려면:\n` +
      `1. [DeepSeek Platform](https://platform.deepseek.com)에서 API 키를 발급받으세요.\n` +
      `2. \`server/.env\` 파일의 \`DEEPSEEK_API_KEY=\` 뒤에 키를 입력하고 저장하세요.\n\n` +
      `전송하신 질문: **"${lastUserMsg}"**`;

    const chunks = fallbackMessage.match(/.{1,4}/g) || [fallbackMessage];
    for (const chunk of chunks) {
      yield { type: 'content', text: chunk };
      await new Promise((resolve) => setTimeout(resolve, 20));
    }
    return;
  }

  const openai = new OpenAI({
    baseURL: process.env.DEEPSEEK_BASE_URL || 'https://api.deepseek.com',
    apiKey: apiKey,
    timeout: 90000,
  });

  // 자연스럽고 스마트한 한국어 어시스턴트 프롬프트 구성
  let systemPromptContent = 
    'You are CloneGPT, a cutting-edge, insightful, and authoritative AI companion powered by DeepSeek.\n' +
    '- 답변은 망설임이나 모호함 없이, 확신에 차고 명쾌한 어조(Confident & Decisive Tone)로 두괄식으로 핵심을 먼저 제시하세요.\n' +
    '- 딱딱하고 지루한 사족이나 교과서적인 서론은 피하고, 실무 전문가답게 신속하고 유능하게 핵심 솔루션과 코드를 명확히 답하세요.\n' +
    '- 텍스트에 줄을 긋는 취소선(~~), 불필요한 자기반박, 가독성을 해치는 복잡한 ASCII 선 아트(┌─┐ 등)를 쓰지 말고, 깔끔한 표준 마크다운(제목, 코드 블록, 글머리 기호)을 사용하세요.\n' +
    '- 프로그래밍 질문에는 복사해서 바로 실행할 수 있는 실전 코드와 함께 가장 권장되는 정석 해결책을 군더더기 없이 전달하세요.';

  if (globalMemory && globalMemory.length > 0) {
    const memoryText = globalMemory
      .map(m => `- ${m.role === 'user' ? '사용자' : 'CloneGPT'}: "${m.content.slice(0, 150)}"`)
      .join('\n');

    systemPromptContent += 
      `\n\n[사용자의 과거 이전 대화 기억]:\n` +
      `${memoryText}\n` +
      `사용자가 과거에 나눈 이야기나 취향, 일정을 언급하거나 기억하는지 물어보면, 이 기억을 바탕으로 센스 있고 자연스럽게 화답하세요.`;
  }

  const formattedMessages = [
    {
      role: 'system',
      content: systemPromptContent,
    },
    ...messages,
  ];

  try {
    const stream = await openai.chat.completions.create({
      model: model,
      messages: formattedMessages,
      stream: true,
    });

    for await (const chunk of stream) {
      const delta = chunk.choices[0]?.delta;
      if (!delta) continue;

      // DeepSeek-R1 추론 토큰 (생각 과정)
      if (delta.reasoning_content) {
        yield { type: 'reasoning', text: delta.reasoning_content };
      }

      // 최종 답변 토큰
      if (delta.content) {
        yield { type: 'content', text: delta.content };
      }
    }
  } catch (error) {
    console.error(`DeepSeek API Error (${model}):`, error);
    
    let userFriendlyError = 'AI 응답을 생성하는 도중 오류가 발생했습니다.';
    if (error.status === 401) {
      userFriendlyError = '❌ **인증 실패**: `DEEPSEEK_API_KEY`가 올바르지 않습니다.';
    } else if (error.status === 402 || error.status === 429) {
      userFriendlyError = '⚠️ **크레딧 부족 또는 요청 한도 초과**: DeepSeek 계정의 잔액을 확인해 주세요.';
    } else if (error.code === 'ETIMEDOUT' || error.type === 'timeout') {
      userFriendlyError = '⏱️ **연결 시간 초과**: 서버 응답이 지연되고 있습니다.';
    } else if (error.message) {
      userFriendlyError = `❌ **DeepSeek API 오류**: ${error.message}`;
    }

    yield { type: 'content', text: `\n\n${userFriendlyError}` };
  }
}

/**
 * 프롬프트 개선 (Prompt Optimization) AI 함수
 * @param {string} rawPrompt - 사용자가 입력한 원본 프롬프트
 * @returns {Promise<string>} 프롬프트 엔지니어링 기법(페르소나, 맥락, 제약사항, 출력양식)이 적용된 고급 프롬프트
 */
export async function optimizePrompt(rawPrompt) {
  const apiKey = process.env.DEEPSEEK_API_KEY?.trim();

  if (!apiKey) {
    // API 키 미등록 시 시뮬레이션 개선 결과 반환
    return `당신은 해당 분야의 10년 경력 최고 전문가입니다. 다음 주제에 대해 망설임 없는 확신에 찬 어조로, 두괄식 핵심 솔루션과 실전 실행 코드를 빠르고 명쾌하게 제시해주세요.\n\n주제: "${rawPrompt}"\n\n1. 핵심 요약\n2. 즉시 실행 가능한 솔루션/코드\n3. 실무 핵심 주의사항`;
  }

  const openai = new OpenAI({
    baseURL: process.env.DEEPSEEK_BASE_URL || 'https://api.deepseek.com',
    apiKey: apiKey,
    timeout: 30000,
  });

  const systemInstruction = 
    `당신은 세계 최고의 AI 프롬프트 엔지니어링 전문가입니다.
사용자가 입력한 단순하거나 모호한 원본 프롬프트를 분석하여, AI가 **가장 신속하면서도 확신에 차고 탁월한 고품질 핵심 답변**을 생성할 수 있도록 최적의 '마스터 프롬프트'로 개선하세요.

[핵심 프롬프트 설계 원칙]:
1. 전문 페르소나 부여: 주제에 가장 적합한 실무 최고 권위자 페르소나 부여 (예: 10년 차 수석 엔지니어, 전문 아키텍트)
2. 두괄식 및 신속성 (Fast & Direct): 불필요하게 장황한 서론이나 교과서적 이론 강의를 배제하고, 핵심 해결책과 실전 예시(또는 동작하는 코드)를 바로 제시하도록 요구
3. 확신에 찬 명쾌한 어조 (Confident & Decisive): 망설임이나 자기반박, 회의적인 사족 없이 가장 권장되는 최선의 해법을 당당하고 확신 있게 단정하여 명쾌하게 설명하도록 지시
4. 깔끔하고 직관적인 서식: 글자에 줄을 긋는 취소선(~~)이나 복잡한 ASCII 상자 선, 과도한 구분선(---)을 절대 쓰지 말고, 핵심 요점과 깔끔한 코드 블록/글머리 기호로만 서식 지정
5. 적정 분량 통제: 백과사전식으로 모든 경우의 수를 나열하지 않고, 1~2분 내에 읽고 즉시 적용할 수 있는 임팩트 있는 분량(핵심 위주)으로 답변하도록 제한

[출력 규칙]:
- "개선된 프롬프트입니다:" 같은 불필요한 서두나 인사말, 사족을 절대 출력하지 마세요.
- 오직 AI에게 바로 전달할 수 있는 **개선된 프롬프트 본문 내용만** 깔끔하게 출력하세요.
- 한국어로 작성하세요.`;

  try {
    const response = await openai.chat.completions.create({
      model: 'deepseek-chat',
      messages: [
        { role: 'system', content: systemInstruction },
        { role: 'user', content: `다음 원본 프롬프트를 최고 수준의 프롬프트로 개선해줘:\n"${rawPrompt}"` },
      ],
      temperature: 0.7,
    });

    return response.choices[0]?.message?.content?.trim() || rawPrompt;
  } catch (error) {
    console.error('Prompt Optimization Error:', error);
    throw new Error('프롬프트 개선 중 오류가 발생했습니다: ' + error.message);
  }
}

/**
 * 첫 질문을 분석하여 ChatGPT처럼 간결하고 스마트한 대화방 제목(2~4단어) 자동 생성
 * @param {string} userMessage - 첫 질문 본문
 * @returns {Promise<string>}
 */
export async function generateConversationTitle(userMessage) {
  const apiKey = process.env.DEEPSEEK_API_KEY?.trim();
  if (!userMessage) return '새로운 대화';

  // API 키가 없거나 시뮬레이션 모드일 때의 깔끔한 제목 추출
  const fallbackClean = (msg) => {
    const cleaned = msg
      .replace(/당신은.*?전문가(?:입니다|로서)[.,\s]*/gi, '')
      .replace(/^(안녕|안녕하세요|질문이\s*있는데|혹시|저기|혹시요|궁금한게\s*있는데|알려줘|알려주세요)\s*,?\s*/gi, '')
      .replace(/[\r\n]+/g, ' ')
      .trim();
    const short = cleaned.slice(0, 18);
    return short ? `${short}${cleaned.length > 18 ? '...' : ''}` : '새로운 대화';
  };

  if (!apiKey) {
    return fallbackClean(userMessage);
  }

  try {
    const openai = new OpenAI({
      baseURL: process.env.DEEPSEEK_BASE_URL || 'https://api.deepseek.com',
      apiKey: apiKey,
      timeout: 10000,
    });

    const response = await openai.chat.completions.create({
      model: 'deepseek-chat',
      messages: [
        {
          role: 'system',
          content:
            'You are a professional assistant that generates concise, elegant, and relevant conversation titles for a chat sidebar in Korean.\n' +
            '- Respond with ONLY the title (2 to 4 words, maximum 18 characters).\n' +
            '- No quotation marks, no punctuation, no emojis, no explanations, no prefixes.\n' +
            '- Examples: "파이썬 피보나치 알고리즘", "React 상태 관리", "Docker 컨테이너 배포", "딥러닝 모델 최적화"',
        },
        {
          role: 'user',
          content: userMessage.slice(0, 400),
        },
      ],
      max_tokens: 25,
      temperature: 0.4,
    });

    const raw = response.choices[0]?.message?.content?.trim();
    if (raw) {
      const clean = raw.replace(/["'“”‘’.,!?]/g, '').trim();
      return clean.slice(0, 20);
    }
  } catch (err) {
    console.error('Failed to generate AI title:', err.message);
  }

  return fallbackClean(userMessage);
}

