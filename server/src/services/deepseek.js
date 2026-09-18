import OpenAI from 'openai';
import dotenv from 'dotenv';

dotenv.config();

/**
 * DeepSeek 스트리밍 AI 응답 생성 함수
 * @param {Array<{role: string, content: string}>} messages - 이전 대화 맥락을 포함한 메시지 배열
 * @returns {AsyncGenerator<string>} 스트리밍 텍스트 청크를 방출하는 제너레이터
 */
export async function* generateDeepSeekStream(messages) {
  const apiKey = process.env.DEEPSEEK_API_KEY?.trim();
  const model = process.env.DEEPSEEK_MODEL || 'deepseek-chat';

  // 1. API 키가 설정되지 않은 경우 친절한 안내 및 시뮬레이션 스트리밍 반환
  if (!apiKey) {
    const lastUserMsg = messages[messages.length - 1]?.content || '';
    const fallbackMessage = 
      `⚠️ **DeepSeek API 키가 아직 설정되지 않았습니다.**\n\n` +
      `실제 DeepSeek AI 모델(${model})의 답변을 받아보시려면:\n` +
      `1. [DeepSeek Platform](https://platform.deepseek.com)에서 API 키를 발급받으세요.\n` +
      `2. \`server/.env\` 파일의 \`DEEPSEEK_API_KEY=\` 뒤에 키를 입력하고 저장하세요.\n\n` +
      `---\n\n` +
      `*(현재는 **스트리밍 시뮬레이션 모드**로 작동 중입니다)*\n\n` +
      `전송하신 질문: **"${lastUserMsg}"**\n\n` +
      `질문에 대한 임시 응답 예시입니다. API 키를 등록하시면 즉시 최신 DeepSeek-V3 모델의 실제 지능형 답변을 실시간으로 확인하실 수 있습니다! 🚀`;

    // 글자 단위 스트리밍 효과 시뮬레이션
    const chunks = fallbackMessage.match(/.{1,4}/g) || [fallbackMessage];
    for (const chunk of chunks) {
      yield chunk;
      await new Promise((resolve) => setTimeout(resolve, 20));
    }
    return;
  }

  // 2. OpenAI SDK를 활용한 실제 DeepSeek API 호출
  const openai = new OpenAI({
    baseURL: process.env.DEEPSEEK_BASE_URL || 'https://api.deepseek.com',
    apiKey: apiKey,
    timeout: 60000,
  });

  // 시스템 프롬프트가 없는 경우 친절한 어시스턴트 프롬프트 추가
  const formattedMessages = [
    {
      role: 'system',
      content: 'You are CloneGPT, a helpful, thoughtful, and knowledgeable AI assistant powered by DeepSeek. Always respond helpfully, clearly, and format your responses using Markdown with code blocks where appropriate.',
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
      const content = chunk.choices[0]?.delta?.content;
      if (content) {
        yield content;
      }
    }
  } catch (error) {
    console.error('DeepSeek API Error:', error);
    
    let userFriendlyError = 'AI 응답을 생성하는 도중 오류가 발생했습니다.';
    if (error.status === 401) {
      userFriendlyError = '❌ **인증 실패**: `DEEPSEEK_API_KEY`가 올바르지 않습니다. 키를 다시 확인해 주세요.';
    } else if (error.status === 402 || error.status === 429) {
      userFriendlyError = '⚠️ **요청 제한 또는 잔액 부족**: DeepSeek 계정의 잔액(크레딧)이나 호출 한도를 확인해 주세요.';
    } else if (error.code === 'ETIMEDOUT' || error.type === 'timeout') {
      userFriendlyError = '⏱️ **연결 시간 초과**: DeepSeek 서버 응답이 지연되고 있습니다. 잠시 후 다시 시도해 주세요.';
    } else if (error.message) {
      userFriendlyError = `❌ **DeepSeek API 오류**: ${error.message}`;
    }

    yield `\n\n${userFriendlyError}`;
  }
}
