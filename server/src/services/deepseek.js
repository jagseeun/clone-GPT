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
    'You are CloneGPT, a cutting-edge, insightful, and natural-speaking AI companion powered by DeepSeek.\n' +
    '- 대화할 때는 딱딱한 기계적인 나열식(불렛포인트) 답변을 피하고, 마치 매우 유능하고 센스 있는 사람이 대화하듯 자연스럽고 매끄러운 한국어로 소통하세요.\n' +
    '- 불필요하게 뻔한 조언이나 교과서적인 사족을 길게 늘어놓지 말고, 사용자의 의도를 빠르고 정확하게 짚어 위트 있고 통찰력 있게 답하세요.\n' +
    '- 프로그래밍, 학술, 분석 등 전문적인 질문에는 최고 수준의 정확도와 마크다운 서식을 활용해 깊이 있게 설명하세요.';

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
    return `당신은 해당 분야의 15년 경력 최고 전문가입니다. 다음 주제에 대해 초보자도 이해하기 쉬우면서도 실무에서 바로 쓸 수 있는 깊이 있는 가이드를 작성해주세요.\n\n[요구 사항]:\n1. 핵심 개념과 배경 설명\n2. 실전 예시 및 구체적인 단계별 실행 방법\n3. 흔히 하는 실수와 주의할 점 3가지\n\n주제: "${rawPrompt}"`;
  }

  const openai = new OpenAI({
    baseURL: process.env.DEEPSEEK_BASE_URL || 'https://api.deepseek.com',
    apiKey: apiKey,
    timeout: 30000,
  });

  const systemInstruction = 
    `당신은 세계 최고의 AI 프롬프트 엔지니어링 전문가입니다.
사용자가 입력한 단순하거나 모호한 원본 프롬프트를 분석하여, AI가 가장 정확하고 탁월한 고품질 답변을 생성할 수 있도록 완벽한 '마스터 프롬프트'로 개선하세요.

[필수 적용 프롬프트 엔지니어링 기법]:
1. 역할 부여 (Persona Assignment): 질문의 주제에 완벽히 부합하는 최고 권위자 페르소나 부여 (예: "당신은 10년 차 수석 소프트웨어 아키텍트입니다.")
2. 구체적인 배경 및 맥락 설정 (Context & Objective): 사용자가 궁극적으로 얻고자 하는 바를 명확화
3. 단계별 생각 유도 (Chain-of-Thought): 체계적이고 논리적인 분석 단계 명시
4. 구조화된 출력 형식 (Output Formatting): 마크다운 문법, 표, 코드 블록, 글머리 기호 등 최적의 가독성을 갖춘 서식 지정
5. 주의점 및 실전 팁 (Edge Cases & Best Practices): 뻔한 내용이 아닌 실질적인 인사이트를 요구

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
