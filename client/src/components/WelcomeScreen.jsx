import React from 'react';
import { Bot, Code2, Sparkles, Compass, Lightbulb } from 'lucide-react';

export default function WelcomeScreen({ onSelectPrompt }) {
  const suggestions = [
    {
      icon: <Code2 size={20} className="prompt-card-icon" />,
      title: '코드 작성 및 디버깅',
      desc: 'React와 Express를 연동하는 예제 코드를 작성해줘',
      prompt: 'React 프론트엔드와 Express 백엔드를 연동하는 간단한 예제 코드를 작성해줘',
    },
    {
      icon: <Sparkles size={20} className="prompt-card-icon" />,
      title: '아이디어 브레인스토밍',
      desc: 'AI를 활용한 웹 서비스 프로젝트 아이디어 3가지',
      prompt: 'AI를 활용한 유용한 웹 서비스 프로젝트 아이디어 3가지만 추천해줘',
    },
    {
      icon: <Compass size={20} className="prompt-card-icon" />,
      title: '개념 학습 및 설명',
      desc: 'DeepSeek API와 OpenAI API의 차이점 설명',
      prompt: 'DeepSeek API의 특징과 OpenAI API와의 호환성에 대해 설명해줘',
    },
    {
      icon: <Lightbulb size={20} className="prompt-card-icon" />,
      title: '학습 계획 수립',
      desc: '풀스택 웹 개발 4주 학습 로드맵 제안',
      prompt: '초보자를 위한 풀스택 웹 개발 4주 집중 학습 로드맵을 작성해줘',
    },
  ];

  return (
    <div className="welcome-screen">
      <div className="welcome-logo">
        <Bot size={32} color="white" />
      </div>
      <h1 className="welcome-title">무엇을 도와드릴까요?</h1>
      <p className="welcome-subtitle">
        CloneGPT는 DeepSeek API를 지원하는 ChatGPT 스타일 대화형 AI 어시스턴트입니다.
      </p>

      <div className="prompt-cards">
        {suggestions.map((item, idx) => (
          <div
            key={idx}
            className="prompt-card"
            onClick={() => onSelectPrompt(item.prompt)}
          >
            {item.icon}
            <div className="prompt-card-title">{item.title}</div>
            <div className="prompt-card-desc">{item.desc}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
