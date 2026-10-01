import React from 'react';
import { Bot, Code2, Brain, Sparkles, FileText, ArrowUpRight } from 'lucide-react';

export default function WelcomeScreen({ onSelectPrompt }) {
  const suggestions = [
    {
      badge: '웹 개발 & 리팩토링',
      icon: <Code2 size={18} className="prompt-card-icon" />,
      title: 'React 18 상태 최적화 기법',
      desc: '불필요한 리렌더링을 방지하는 커스텀 훅 패턴과 메모이제이션 가이드',
      prompt: 'React 18 환경에서 불필요한 컴포넌트 리렌더링을 방지하는 커스텀 훅 패턴과 useMemo, useCallback 활용 최적화 기법을 실전 예제 코드와 함께 설명해줘.',
    },
    {
      badge: 'DeepSeek-R1 사고 모델',
      icon: <Brain size={18} className="prompt-card-icon r1-icon" />,
      title: '복잡한 알고리즘 심층 추론',
      desc: '다이나믹 프로그래밍(DP)의 단계별 사고 과정(Reasoning) 분석',
      prompt: '다이나믹 프로그래밍(DP)을 사용한 배낭 문제(Knapsack Problem)의 최적해 도출 과정을 단계별 사고 과정과 점화식 유도 과정을 자세히 설명해줘.',
    },
    {
      badge: '서비스 기획 & 아이디어',
      icon: <Sparkles size={18} className="prompt-card-icon" />,
      title: 'AI 기반 생산성 SaaS 기획안',
      desc: '최신 LLM API를 결합한 실전 웹 비즈니스 모델 및 아키텍처 제안',
      prompt: '최신 LLM API(DeepSeek, OpenAI)를 연동하여 현대 직장인의 반복 업무를 획기적으로 줄여줄 수 있는 유용한 생산성 SaaS 웹 서비스 기획안을 작성해줘.',
    },
    {
      badge: '기술 문서 & 보고서',
      icon: <FileText size={18} className="prompt-card-icon" />,
      title: '아키텍처 비교 분석 보고서',
      desc: 'MSA(마이크로서비스) vs 모놀리식 아키텍처의 엔터프라이즈 도입 비교',
      prompt: '마이크로서비스 아키텍처(MSA)와 모놀리식 아키텍처의 장단점을 엔터프라이즈 서비스 도입 관점에서 체계적인 비교 분석 보고서 형식으로 작성해줘.',
    },
  ];

  return (
    <div className="welcome-screen">
      <div className="welcome-logo">
        <Bot size={34} color="white" />
      </div>
      <h1 className="welcome-title">무엇을 도와드릴까요?</h1>
      <p className="welcome-subtitle">
        지능형 대화, 고난도 추론, 코드 작성 및 파일 분석까지 가능한 CloneGPT입니다.
      </p>

      <div className="prompt-cards">
        {suggestions.map((item, idx) => (
          <div
            key={idx}
            className="prompt-card"
            onClick={() => onSelectPrompt(item.prompt)}
          >
            <div className="prompt-card-header">
              <span className="prompt-card-badge">{item.badge}</span>
              <div className="prompt-card-arrow">
                <ArrowUpRight size={15} />
              </div>
            </div>
            <div className="prompt-card-body">
              <div className="prompt-card-title-row">
                {item.icon}
                <span className="prompt-card-title">{item.title}</span>
              </div>
              <div className="prompt-card-desc">{item.desc}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
