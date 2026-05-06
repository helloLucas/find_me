import React, { useCallback, useEffect, useRef } from "react";
import { useBrowserContentStore } from "../../../app/store/browserContentStore";
import type { ArticleCorruption } from "../../../shared/types/story";
import { useStoryRuntimeStore } from "../../story-runtime/storyRuntime.store";
import {
  canSubmitStoryAction,
  getStoryInspectTarget,
} from "../../story-runtime/storyActionGuards";
import { CorruptedParagraph } from "./CorruptedParagraph";
import "./NewsTab.css";

type NewsCard = {
  id: string;
  title: string;
  summary?: string;
  publisher?: string;
  thumbnail?: string;
};

const DEFAULT_NEWS_CARDS: NewsCard[] = [
  {
    id: "good_article",
    title: "넥서스, 인류의 삶을 바꾼 완전 연결 시스템",
    summary: "도시 운영부터 개인 건강관리까지, 넥서스 플랫폼이 바꾼 일상의 변화.",
    publisher: "Nexus Daily",
    thumbnail: "news_good_01",
  },
  {
    id: "missing_people_article",
    title: "최근 늘어나는 실종 사례, 단순 통계 이상인가?",
    summary: "최근 세 달간 보고된 실종 건수가 예년 대비 급증하며 원인 분석이 이어지고 있다.",
    publisher: "Central News",
    thumbnail: "news_missing_01",
  },
  {
    id: "dark_article",
    title: "넥서스의 어두운 면: 사라진 기록들에 대한 제보",
    summary: "삭제된 문서와 누락된 기록을 추적한 익명 제보가 공개됐다.",
    publisher: "Unknown Archive",
    thumbnail: "news_dark_01",
  },
];

const FALLBACK_ARTICLES: Record<string, { title: string; body: string[] }> = {
  good_article: {
    title: "넥서스, 인류의 삶을 바꾼 완전 연결 시스템",
    body: [
      "넥서스 플랫폼이 전 도시의 인프라를 지능적으로 통합 제어함에 따라, Void City의 시민 복지와 안전 수준이 전례 없는 수준으로 향상되었다. 도시 전역에 촘촘히 흩어진 스마트 센서망이 교통량, 전력 소비, 상수도 공급량 등을 매초 단위로 수집하고, 중앙 AI 엔진이 이를 조율함으로써 비효율을 제로에 가깝게 줄이는 혁신을 이루어냈다.",
      "대표적인 사례로 상업 지구의 출퇴근 시간대 교통 혼잡률은 전년 대비 45% 감소했으며, 실시간 지능형 신호 관제 시스템이 차량 흐름을 실시간으로 우회 조정하여 불필요한 공회전을 최소화했다. 또한 대기 질 센서와 연동된 정화 타워들이 가동되며 미세먼지 수치는 수년 내 최저치를 경신했고, 도시 조명 시스템의 전력 사용 역시 통행량에 맞춰 유기적으로 감축되어 막대한 에너지를 보존하고 있다.",
      "특히 가장 큰 호평을 받는 부분은 개인 맞춤형 헬스케어 디바이스와의 자동 통합 연동이다. 시민들이 착용한 통합 바이탈 밴드가 심박수나 혈압 등 중요 수치를 모니터링하여 이상 징후를 조기에 감지하며, 전격적인 응급 상황이 발생할 경우 중앙 의료 관제실과 구급 대원에게 실시간 위치와 심각도가 자동으로 즉시 공유된다. 이를 통해 독거노인 돌봄 구역이나 야간 돌발 사고 시 골든타임 확보율이 98%라는 경이로운 수치를 달성했다.",
      "정부 기술 정책 포럼의 한 관계자는 '이전의 스마트 시티들은 단순한 모니터링에 그쳤으나, 넥서스는 시민 개개인의 라이프스타일과 도시 인프라를 하나의 생명체처럼 유기적으로 엮어낸 첫 번째 성공 사례'라며 극찬을 아끼지 않았다. 이제 Void City의 거주민들은 지갑, 열쇠, 신분증 같은 물리적 매개체가 없어도 본인의 'Nexus Universal ID' 하나만으로 결제부터 대중교통 탑승, 공공 오피스 출입까지 완벽하게 처리되는 무결점 일상을 공유하고 있다.",
      "넥서스 홀딩스의 최고기술책임자(CTO)는 본지와의 독점 인터뷰를 통해 '우리가 지향하는 진정한 하이테크 유토피아는 기술이 눈에 띄게 강조되는 도시가 아닌, 공기나 중력처럼 너무나 당연하고 완벽하게 스며들어 아무런 불편함이나 단절을 느끼지 못하도록 보좌하는 조용한 동반자가 되는 세상'이라며, '올해 말까지 외곽 주거 벨트 구역에 4단계 통합 네트워크 인프라 적용을 무사히 마무리 지어, 단 한 명의 시민도 연결망에서 소외되지 않도록 완전한 무결성을 추구하겠다'는 미래 비전을 밝혔다."
    ],
  },
  missing_people_article: {
    title: "최근 늘어나는 실종 사례, 단순 통계 이상인가?",
    body: [
      "Void City의 도시 외곽 및 인프라 구축 구역을 중심으로 최근 3개월 동안 원인 모를 실종 신고 건수가 기묘할 정도로 급격히 상승하고 있어, 평온하던 거리에 시민들의 불안감과 우려가 소리 없이 확산되고 있다. 특히 피해자들의 단서나 범죄 행각이 뚜렷하게 식별되지 않고, 마지막 행적이 기록된 네트워크 추적선이 기묘한 시점에서 끊어지는 양상을 보여 단순 미스터리를 넘어선 논란이 이어지고 있다.",
      "관할 소방 및 경찰 당국은 현재까지 접수된 미종결 사건들에 대해 '단순한 개인 가출이나 채무, 혹은 야간 치안 부재 구역에서의 일시적인 자발적 도피 가능성이 크다'는 기존 입장을 고수하고 있다. 그러나 피해 가족과 사설 탐정 단체가 취합한 독립 기록에 따르면, 실종자들 사이에 우연이라고 치부하기에는 너무나 명백한 직업적 공통 분모가 존재한다는 사실이 밝혀져 사건은 점차 다른 국면으로 접어들고 있다.",
      "공개된 자료에 따르면, 실종된 이들 중 다수가 정보기술(IT) 산업에 직접 종사하고 있었거나, 도시 인프라 중앙 네트워크 망의 핵심 장비 유지보수 담당 엔지니어, 혹은 데이터 라우팅 솔루션을 전문적으로 다루던 고급 핵심 기술자 계열인 것으로 확인되었다. 이들은 모두 실종 직전까지 회사나 인프라 시설 근처에서 정상적인 야간 당직 업무를 처리하고 있었거나, 평소와 다름없이 지인들과 평이한 일상 대화를 이어가다 그 어떤 예후도 없이 말 그대로 증발해 버렸다.",
      "피해 엔지니어의 가족들은 본지 기자와 만나 울분을 토하며 경찰의 태도를 규탄했다. 한 가족은 '어제까지만 해도 주말 계획을 의논하고 평온하게 퇴근 전 안부 문자를 주던 사람이다. 넥서스 스마트 보안 카메라가 길거리에 수천 개나 켜져 있고 전신이 인프라와 연결되어 있는데, 왜 내 동생의 마지막 하차 지점 이후의 모든 영상 기록만 존재하지 않는다는 건가. 당국은 일시적인 데이터 소실이나 통계적 착시라며 수사를 서둘러 마무리 지으려 하고 있다'며 강력한 축소 의혹을 제기했다.",
      "일각에서는 실종 사건이 발생한 주요 발생 포인트가 넥서스 플랫폼이 최근 인프라 확장을 선언하고 장비 신설을 진행 중인 외곽 '서브 네트워크 존' 경계면과 기묘하게 겹친다는 점에 주목하고 있다. 독립 기술 포럼의 분석가들은 '외곽 구역의 경우 중심 상업 지구에 비해 데이터 흐름이 고르지 못해 사각지대가 발생하기 쉬운데, 이 특정 데이터 경계 허브를 직접 점검하러 현장에 투입된 외부 인력들의 정보 전송 로드가 유독 한꺼번에 무력화된 정황이 보인다'며 도시 운영 전반에 걸친 보안 구멍이나 비공식 기록 삭제의 가능성에 대한 정밀 청문회를 조속히 개최해야 한다고 목소리를 높이고 있다."
    ],
  },
  dark_article: {
    title: "넥서스의 어두운 면: 사라진 기록들에 대한 제보",
    body: [
      "최근 도시 외곽에서 접수된 실종 사건들을 취재하는 과정에서, 단순한 범죄나 행정 공백만으로는 설명하기 어려운 공통 증언이 확인되고 있다. 실종자 주변을 마지막으로 봤다는 시민들은 특정 인물이나 거리 풍경이 처음부터 선명하게 보이지 않았고, 시선을 두는 순간 뒤늦게 형태를 갖추는 듯한 이상한 경험을 했다고 주장했다. 일부 제보는 넥서스가 구축한 도시 통합 인프라 구역과 이러한 현상이 겹친다는 점에서 더 큰 의문을 낳고 있다.",
      "문제가 처음 수면 위로 올라온 것은 지난달 14일, 외곽 주거 구역 주민 여러 명이 같은 시간대 같은 골목을 두고 서로 다른 진술을 내놓으면서다. 한 주민은 골목 끝에서 누군가 걸어오는 모습을 분명히 봤다고 했지만, 다른 주민은 같은 시각 같은 방향을 바라봤을 때 그 자리가 비어 있었다고 말했다. 이후 본지가 유사 사례를 추가 확인한 결과, 서로 모르는 제보자들 사이에서도 '처음에는 비어 있거나 흐릿했지만 다시 보니 자연스럽게 채워져 있었다'는 취지의 진술이 반복됐다.",
      "증언의 공통점은 단순한 착시를 넘어선다. 제보자들은 멀리 있는 사람의 얼굴이나 옷차림이 가까워질 때까지 비정상적으로 흐릿하게 보였고, 고개를 돌렸다가 다시 바라보면 방금 전까지 없던 행인이나 차량이 자연스럽게 자리를 차지하고 있었다고 말했다. 일부는 상점 간판, 버스 정류장, 횡단보도 건너편 인파처럼 평소라면 한 번에 인식될 요소들이 유독 늦게 또렷해졌다고 주장했다.",
      "실종자 가족들의 증언은 더 구체적이다. 지난 겨울 동생을 잃었다는 한 시민은 본지에 '사람이 사라지기 전에 주변부터 이상해졌다'고 말했다. 그는 실종 전날 저녁, 동생이 귀가하던 길을 봤다는 이웃들의 말이 기묘할 정도로 엇갈렸다고 전했다. 같은 시간대 같은 구간을 본 사람들 가운데 누군가는 분명히 길을 걷는 모습을 봤다고 했고, 다른 누군가는 그 자리가 이상할 만큼 텅 비어 있었다고 말했다는 것이다.",
      "심야 시간대 외곽 상권에서 근무하는 자영업자들과 경비 인력도 비슷한 경험을 증언했다. 손님이 끊긴 뒤 바깥을 내다보면 멀리 있는 가로등 아래 인영이 사람처럼 보이다가도, 다시 볼 때는 전혀 다른 위치에 있거나 아예 사라져 있다는 것이다. 한 편의점 업주는 '사람이 움직였다기보다, 처음엔 대강 형태만 있다가 내가 다시 볼 때 그제야 사람처럼 맞춰지는 느낌이 들 때가 있다'고 말했다.",
      "특히 이런 제보는 사람이 적은 시간과 장소에 집중돼 있다. 번화가 중심부나 대형 상업 지구처럼 유동 인구가 많은 구역보다, 외곽 도로와 심야 버스 노선, 재개발이 멈춘 구역, 폐쇄된 공공시설 주변에서 유사 사례가 반복적으로 보고되고 있다. 넥서스의 생활 인프라망이 촘촘히 연결된 중심권은 비교적 안정적으로 보이지만, 시선이 드물게 머무는 공간일수록 배경이나 인물의 형태가 늦게 또렷해진다는 증언이 많았다.",
      "전문가들은 아직 원인을 단정하기는 어렵다고 말한다. 조도 차이, 피로 누적, 불안 심리, 반복되는 실종 보도에 따른 긴장감이 인지 오류를 키울 가능성은 충분하다는 설명이다. 다만 본지가 접촉한 한 지각심리 연구자는 '이번 제보의 특징은 단순히 잘못 봤다는 수준이 아니라, 처음엔 완성되지 않은 것처럼 보였다거나 시선을 둔 뒤에야 주변이 정리됐다는 표현이 유독 많다는 점'이라며 '일반적인 야간 착시 보고와는 결이 다르다'고 말했다.",
      "도시 인프라 전문가들 사이에서는 넥서스가 운영하는 통합 조명, 교통, 보안 네트워크와의 연관성을 점검해야 한다는 의견도 나온다. 넥서스는 이미 이 도시의 교통 관제, 공공 보안 연동, 상업 지구 데이터망 상당 부분에 영향력을 미치고 있다. 공식적으로 확인된 것은 없지만, 일부 제보자들은 넥서스 계열 시설 인근에서 유독 사람 수나 거리 배경이 '뒤늦게 맞춰지는 것 같다'는 느낌을 받았다고 주장했다.",
      "넥서스는 본지 질의에 대해 '자사가 제공하는 인프라 서비스와 시민들이 호소하는 시야 이상, 목격 불일치 현상 사이의 직접적 연관성은 확인된 바 없다'며 '현재까지 파악된 범위에서는 범죄, 시설 노후, 심야 환경 요인 등 다양한 가능성을 열어 두고 관계 기관과 협조 중'이라고 밝혔다. 다만 외곽 구역과 비혼잡 시간대에 제보가 집중되는 이유, 그리고 복수의 목격자가 같은 장소를 두고 상반된 진술을 내놓는 현상에 대해서는 별도의 설명을 내놓지 않았다.",
      "지역 커뮤니티에서는 이미 더 근본적인 의문도 제기되고 있다. 왜 사람이 적은 장소에서만 주변 풍경과 인물의 형태가 늦게 또렷해지는지, 왜 누군가는 분명 존재를 봤다고 하고 누군가는 같은 자리에서 공백만 봤다고 말하는지, 왜 가까이 가거나 오래 바라본 뒤에야 비로소 거리의 디테일이 채워지는 듯한 증언이 반복되는지에 대한 의문이다. 일부 시민들은 이제 실종 사건을 단순한 개별 사건이 아니라, 이 도시의 현실 자체가 예상과 다른 방식으로 유지되고 있을 가능성과 연결해 바라보기 시작했다.",
      "본지는 현재 외곽 실종 사건과 함께 제기된 시야 이상, 목격 인원 불일치, 심야 시간대 공간 인식 왜곡 제보의 발생 시점과 지역별 공통점을 추가로 확인하고 있다. 지금까지 확보된 증언만으로 특정 원인을 단정하기는 어렵지만, 복수의 제보가 비슷한 시간대와 유사한 환경에서 반복되고 있다는 점은 단순한 개인 착시나 일회성 불안으로만 치부하기 어렵다는 지적이 나온다.",
      "관계 당국과 넥서스는 아직 범죄, 시설 결함, 환경 이상 가운데 어느 가능성도 확정하지 않은 상태다. 다만 시민들이 공통적으로 제기하는 '주변 인물이나 풍경이 뒤늦게 또렷해지거나, 시선을 돌린 뒤 다시 볼 때 형태가 달라 보였다'는 증언에 대해서는 현재까지 납득할 만한 설명이 제시되지 않고 있다. 본지는 추가 제보와 현장 확인을 바탕으로 해당 현상이 실제로 특정 구역에 집중돼 나타나는지, 또 최근 실종 사건들과 어떤 관련이 있는지 계속 추적할 예정이다.",
    ],
  },
};

type NewsViewMode = "auto" | "list" | "article";

interface NewsTabProps {
  viewMode?: NewsViewMode;
  activeTabTitle?: string;
  onFallbackOpenArticle?: (card: NewsCard) => void;
}

const SCROLL_BOTTOM_TOLERANCE_PX = 2;
const CORRUPTION_CASCADE_DURATION_MS = 1400;

function normalizeArticleCorruption(value: unknown): ArticleCorruption | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;

  const record = value as Record<string, unknown>;
  const paragraphIndexes = Array.isArray(record.paragraphIndexes)
    ? record.paragraphIndexes
      .map((entry) => Number(entry))
      .filter((entry) => Number.isInteger(entry) && entry >= 0)
    : [];

  const intensity = record.intensity === "active" ? "active" : record.intensity === "subtle" ? "subtle" : null;
  if (!intensity) return null;

  const inspectIndex = Number(record.inspectIndex);

  return {
    paragraphIndexes,
    intensity,
    inspectIndex: Number.isInteger(inspectIndex) && inspectIndex >= 0 ? inspectIndex : undefined,
  };
}

export const NewsTab: React.FC<NewsTabProps> = ({
  viewMode = "auto",
  activeTabTitle,
  onFallbackOpenArticle,
}) => {
  const { currentNode, submitStoryAction, submitStoryClick, submitStoryInspect } =
    useStoryRuntimeStore();
  const content = useBrowserContentStore((state) => state.content);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [scrollCorruptionNodeId, setScrollCorruptionNodeId] = React.useState<number | null>(null);
  const [corruptionProgress, setCorruptionProgress] = React.useState(0);
  const corruptionAnimationFrameRef = useRef<number | null>(null);
  const corruptionStartTimeRef = useRef<number | null>(null);
  const lastScrollTriggeredNodeIdRef = useRef<number | null>(null);
  const contentNewsCards = Array.isArray(content.newsCards) ? (content.newsCards as NewsCard[]) : [];
  const newsCards = contentNewsCards.length > 0 ? contentNewsCards : DEFAULT_NEWS_CARDS;

  const activeFallbackArticle = Object.values(FALLBACK_ARTICLES).find(
    (art) => art.title === activeTabTitle
  );

  const useFallback = Boolean(activeFallbackArticle && (!content.articleTitle || content.articleTitle !== activeTabTitle));

  const articleTitle = useFallback ? activeFallbackArticle!.title : (typeof content.articleTitle === "string" ? content.articleTitle : null);
  const hasArticle = Boolean(articleTitle);
  const showArticle = viewMode === "list" ? false : viewMode === "article" ? hasArticle : hasArticle;
  const articleBody: string[] = useFallback
    ? activeFallbackArticle!.body
    : (Array.isArray(content.articleBody) ? content.articleBody.map(String) : []);
  const articleCorruption = useFallback ? null : normalizeArticleCorruption(content.articleCorruption);
  const corruptedParagraphIndexes = new Set(articleCorruption?.paragraphIndexes ?? []);
  const isScrollTriggeredArticleNode = currentNode?.code === "CH1_DARK_ARTICLE_OPEN";
  const isArticleScrollCorruptionNode =
    currentNode?.code === "CH1_ARTICLE_SCROLL_CORRUPTION";
  const usesScrollCascadeCorruption =
    showArticle && !useFallback && (isScrollTriggeredArticleNode || isArticleScrollCorruptionNode);
  const isCurrentNodeScrollCorruptionTriggered =
    currentNode != null && scrollCorruptionNodeId === currentNode.id;
  const scrollCorruptionTriggered =
    !useFallback && (isArticleScrollCorruptionNode || isCurrentNodeScrollCorruptionTriggered);
  const displayedCorruptionProgress = isArticleScrollCorruptionNode
    ? 1
    : isCurrentNodeScrollCorruptionTriggered
      ? corruptionProgress
      : 0;
  const articleBodyClassName = [
    "flex",
    "flex-col",
    "gap-4",
    "story-article-body",
    articleCorruption?.intensity === "active" ? "story-article-body--active" : "",
  ]
    .filter(Boolean)
    .join(" ");
  const inspectTarget = getStoryInspectTarget(currentNode);
  const canInspectArticle =
    inspectTarget != null && canSubmitStoryAction(currentNode, "inspect", inspectTarget);

  useEffect(() => {
    lastScrollTriggeredNodeIdRef.current = null;
    corruptionStartTimeRef.current = null;

    if (corruptionAnimationFrameRef.current !== null) {
      window.cancelAnimationFrame(corruptionAnimationFrameRef.current);
      corruptionAnimationFrameRef.current = null;
    }
  }, [currentNode?.id]);

  useEffect(() => {
    if (!scrollCorruptionTriggered || isArticleScrollCorruptionNode) return;

    const animateCorruption = (timestamp: number) => {
      if (corruptionStartTimeRef.current === null) {
        corruptionStartTimeRef.current = timestamp;
      }

      const elapsed = timestamp - corruptionStartTimeRef.current;
      const nextProgress = Math.min(elapsed / CORRUPTION_CASCADE_DURATION_MS, 1);
      setCorruptionProgress(nextProgress);

      if (nextProgress < 1) {
        corruptionAnimationFrameRef.current = window.requestAnimationFrame(animateCorruption);
        return;
      }

      corruptionAnimationFrameRef.current = null;
    };

    corruptionAnimationFrameRef.current = window.requestAnimationFrame(animateCorruption);

    return () => {
      if (corruptionAnimationFrameRef.current !== null) {
        window.cancelAnimationFrame(corruptionAnimationFrameRef.current);
        corruptionAnimationFrameRef.current = null;
      }
    };
  }, [isArticleScrollCorruptionNode, scrollCorruptionTriggered]);

  const triggerArticleScrollTransition = useCallback(() => {
    if (!currentNode || !isScrollTriggeredArticleNode) return;
    if (lastScrollTriggeredNodeIdRef.current === currentNode.id) return;
    if (!canSubmitStoryAction(currentNode, "system", "auto")) return;

    lastScrollTriggeredNodeIdRef.current = currentNode.id;
    void submitStoryAction("system", "auto").catch(() => {
      if (lastScrollTriggeredNodeIdRef.current === currentNode.id) {
        lastScrollTriggeredNodeIdRef.current = null;
      }
    });
  }, [currentNode, isScrollTriggeredArticleNode, submitStoryAction]);

  const handleScroll = useCallback(
    (event: React.UIEvent<HTMLDivElement>) => {
      const element = event.currentTarget;
      const { scrollTop, scrollHeight, clientHeight } = element;
      const isAtBottom =
        scrollTop + clientHeight >= scrollHeight - SCROLL_BOTTOM_TOLERANCE_PX;

      if (
        usesScrollCascadeCorruption &&
        !scrollCorruptionTriggered &&
        isAtBottom
      ) {
        corruptionStartTimeRef.current = null;
        setCorruptionProgress(0);
        setScrollCorruptionNodeId(currentNode?.id ?? null);
      }

      if (!isScrollTriggeredArticleNode || !showArticle) return;

      if (isAtBottom) {
        triggerArticleScrollTransition();
      }
    },
    [
      currentNode?.id,
      isScrollTriggeredArticleNode,
      scrollCorruptionTriggered,
      showArticle,
      triggerArticleScrollTransition,
      usesScrollCascadeCorruption,
    ]
  );

  return (
    <div
      ref={scrollContainerRef}
      className="w-full h-full p-4 overflow-y-auto bg-[#0a0514] font-browser-article selection:bg-[#a48cff] selection:text-[#0a0514]"
      onScroll={handleScroll}
    >
      <div className="mx-auto w-full max-w-[680px] border-2 border-[#543ab7] p-6 rounded-sm bg-[#110a26] shadow-[inset_0_0_20px_rgba(84,58,183,0.3)]">
        <h1
          className="text-4xl text-[#c7b3ff] drop-shadow-[0_0_8px_#c7b3ff] mb-4 border-b-2 border-[#543ab7] pb-2 font-news-title font-bold tracking-wide"
          style={{ textShadow: "0 0 10px #c7b3ff, 0 0 20px #8b5cf6" }}
        >
          Void City News
        </h1>

        {showArticle ? (
          <article className="mt-6">
            <h2 className="text-[#ff9d76] text-2xl mb-4 drop-shadow-[0_0_5px_#ff9d76]">
              {articleTitle}
            </h2>
            <div className={articleBodyClassName}>
              {articleBody.map((paragraph, index) => {
                const total = articleBody.length;
                const cascadeThreshold =
                  total <= 1 ? 0 : index / Math.max(total - 1, 1);
                const isCorruptedByScrollCascade =
                  usesScrollCascadeCorruption &&
                  scrollCorruptionTriggered &&
                  displayedCorruptionProgress >= cascadeThreshold;
                const isCorruptedByMetadata =
                  !usesScrollCascadeCorruption && corruptedParagraphIndexes.has(index);
                const isCorrupted = isCorruptedByMetadata || isCorruptedByScrollCascade;
                const dynamicIntensity =
                  scrollCorruptionTriggered && displayedCorruptionProgress >= 0.65
                    ? "active"
                    : (articleCorruption?.intensity ?? "subtle");

                const isInspectable =
                  isCorrupted &&
                  articleCorruption?.inspectIndex === index &&
                  canInspectArticle &&
                  Boolean(inspectTarget);

                if (isCorrupted) {
                  return (
                    <CorruptedParagraph
                      key={`${currentNode?.code}-article-${index}`}
                      text={paragraph}
                      intensity={dynamicIntensity}
                      inspectable={isInspectable}
                      onInspect={() => {
                        if (isInspectable && inspectTarget) {
                          void submitStoryInspect(inspectTarget);
                        }
                      }}
                    />
                  );
                }

                return (
                  <p
                    key={`${currentNode?.code}-article-${index}`}
                    className={[
                      "text-base leading-relaxed text-[#0ff] drop-shadow-[0_0_2px_#00ffff]",
                      dynamicIntensity === "active" && isCorrupted
                        ? "story-article-paragraph story-article-paragraph--flicker"
                        : "",
                    ]
                      .filter(Boolean)
                      .join(" ")}
                  >
                    {paragraph}
                  </p>
                );
              })}
            </div>
          </article>
        ) : (
          <div className="flex flex-col gap-5 mt-6">
            {newsCards.length > 0 ? (
              newsCards.map((card) => {
                const canSubmitCardClick = canSubmitStoryAction(currentNode, "click", card.id);
                const canFallbackOpenArticle = currentNode?.code === "CH1_NEWS_PORTAL" || hasArticle || canSubmitCardClick;
                const isCardClickable = canSubmitCardClick || canFallbackOpenArticle;

                return (
                  <article
                    key={card.id}
                    className={[
                      "border border-[#543ab7] bg-[#0a0514]/70 p-4 rounded-sm transition-colors",
                      isCardClickable ? "hover:border-[#0ff]" : "opacity-70",
                    ]
                      .filter(Boolean)
                      .join(" ")}
                  >
                    <button
                      type="button"
                      disabled={!isCardClickable}
                      className={[
                        "block w-full text-left",
                        isCardClickable ? "cursor-pointer" : "cursor-default",
                      ]
                        .filter(Boolean)
                        .join(" ")}
                      onClick={() => {
                        if (canSubmitCardClick) {
                          void submitStoryClick(card.id);
                          if (card.id === "dark_article") {
                            return;
                          }
                        }

                        onFallbackOpenArticle?.(card);
                      }}
                    >
                      <p className="text-[11px] uppercase tracking-[0.25em] text-[#a48cff] mb-2">
                        {card.publisher ?? "Unknown Archive"}
                      </p>
                      <h2 className="text-[#ff9d76] text-xl mb-2 drop-shadow-[0_0_5px_#ff9d76]">
                        {card.title}
                      </h2>
                      {card.summary && (
                        <p className="text-[#0ff] text-base leading-relaxed drop-shadow-[0_0_2px_#00ffff]">
                          {card.summary}
                        </p>
                      )}
                    </button>
                  </article>
                );
              })
            ) : (
              <p className="text-[#0ff] text-base leading-relaxed">
                No story news data loaded.
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
