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
