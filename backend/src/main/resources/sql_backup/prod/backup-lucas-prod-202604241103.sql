--
-- PostgreSQL database dump
--

-- Dumped from database version 17.6
-- Dumped by pg_dump version 17.0

-- Started on 2026-04-24 11:03:15

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- TOC entry 2 (class 3079 OID 16566)
-- Name: vector; Type: EXTENSION; Schema: -; Owner: -
--

CREATE EXTENSION IF NOT EXISTS vector WITH SCHEMA public;


--
-- TOC entry 4696 (class 0 OID 0)
-- Dependencies: 2
-- Name: EXTENSION vector; Type: COMMENT; Schema: -; Owner:
--

COMMENT ON EXTENSION vector IS 'vector data type and ivfflat and hnsw access methods';


SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- TOC entry 221 (class 1259 OID 16909)
-- Name: chapters; Type: TABLE; Schema: public; Owner: lucas_admin
--

CREATE TABLE public.chapters (
    id bigint NOT NULL,
    code character varying(50) NOT NULL,
    title character varying(255) NOT NULL,
    sort_order integer NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.chapters OWNER TO lucas_admin;

--
-- TOC entry 220 (class 1259 OID 16908)
-- Name: chapters_id_seq; Type: SEQUENCE; Schema: public; Owner: lucas_admin
--

CREATE SEQUENCE public.chapters_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.chapters_id_seq OWNER TO lucas_admin;

--
-- TOC entry 4697 (class 0 OID 0)
-- Dependencies: 220
-- Name: chapters_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: lucas_admin
--

ALTER SEQUENCE public.chapters_id_seq OWNED BY public.chapters.id;


--
-- TOC entry 236 (class 1259 OID 17075)
-- Name: lucas_knowledge; Type: TABLE; Schema: public; Owner: lucas_admin
--

CREATE TABLE public.lucas_knowledge (
    id bigint NOT NULL,
    chapter integer,
    puzzle_id character varying(50),
    content text NOT NULL,
    metadata jsonb DEFAULT '{}'::jsonb NOT NULL,
    embedding public.vector(1536)
);


ALTER TABLE public.lucas_knowledge OWNER TO lucas_admin;

--
-- TOC entry 235 (class 1259 OID 17074)
-- Name: lucas_knowledge_id_seq; Type: SEQUENCE; Schema: public; Owner: lucas_admin
--

CREATE SEQUENCE public.lucas_knowledge_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.lucas_knowledge_id_seq OWNER TO lucas_admin;

--
-- TOC entry 4698 (class 0 OID 0)
-- Dependencies: 235
-- Name: lucas_knowledge_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: lucas_admin
--

ALTER SEQUENCE public.lucas_knowledge_id_seq OWNED BY public.lucas_knowledge.id;


--
-- TOC entry 233 (class 1259 OID 17020)
-- Name: save_slots; Type: TABLE; Schema: public; Owner: lucas_admin
--

CREATE TABLE public.save_slots (
    id bigint NOT NULL,
    user_id bigint NOT NULL,
    slot_no integer NOT NULL,
    save_title character varying(255) NOT NULL,
    chapter_id bigint NOT NULL,
    node_id bigint NOT NULL,
    snapshot_json jsonb NOT NULL,
    saved_at timestamp without time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.save_slots OWNER TO lucas_admin;

--
-- TOC entry 232 (class 1259 OID 17019)
-- Name: save_slots_id_seq; Type: SEQUENCE; Schema: public; Owner: lucas_admin
--

CREATE SEQUENCE public.save_slots_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.save_slots_id_seq OWNER TO lucas_admin;

--
-- TOC entry 4699 (class 0 OID 0)
-- Dependencies: 232
-- Name: save_slots_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: lucas_admin
--

ALTER SEQUENCE public.save_slots_id_seq OWNED BY public.save_slots.id;


--
-- TOC entry 223 (class 1259 OID 16919)
-- Name: story_nodes; Type: TABLE; Schema: public; Owner: lucas_admin
--

CREATE TABLE public.story_nodes (
    id bigint NOT NULL,
    chapter_id bigint NOT NULL,
    code character varying(100) NOT NULL,
    node_type character varying(50) NOT NULL,
    output_bundle jsonb NOT NULL,
    prompt_type character varying(50),
    prompt_meta jsonb,
    is_checkpoint boolean DEFAULT false NOT NULL,
    is_terminal boolean DEFAULT false NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL,
    CONSTRAINT story_nodes_node_type_check CHECK (((node_type)::text = ANY ((ARRAY['narrative'::character varying, 'console'::character varying, 'network'::character varying, 'choice'::character varying, 'system'::character varying, 'ending'::character varying])::text[]))),
    CONSTRAINT story_nodes_prompt_type_check CHECK (((prompt_type)::text = ANY ((ARRAY['none'::character varying, 'command'::character varying, 'choice'::character varying, 'inspect'::character varying, 'click'::character varying])::text[])))
);


ALTER TABLE public.story_nodes OWNER TO lucas_admin;

--
-- TOC entry 222 (class 1259 OID 16918)
-- Name: story_nodes_id_seq; Type: SEQUENCE; Schema: public; Owner: lucas_admin
--

CREATE SEQUENCE public.story_nodes_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.story_nodes_id_seq OWNER TO lucas_admin;

--
-- TOC entry 4700 (class 0 OID 0)
-- Dependencies: 222
-- Name: story_nodes_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: lucas_admin
--

ALTER SEQUENCE public.story_nodes_id_seq OWNED BY public.story_nodes.id;


--
-- TOC entry 225 (class 1259 OID 16941)
-- Name: story_transitions; Type: TABLE; Schema: public; Owner: lucas_admin
--

CREATE TABLE public.story_transitions (
    id bigint NOT NULL,
    from_node_id bigint NOT NULL,
    to_node_id bigint NOT NULL,
    action_type character varying(50) NOT NULL,
    expected_input character varying(255),
    validator_type character varying(50) NOT NULL,
    validator_config jsonb,
    fail_node_id bigint,
    effect_bundle jsonb,
    priority integer DEFAULT 0 NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    CONSTRAINT story_transitions_action_type_check CHECK (((action_type)::text = ANY ((ARRAY['command'::character varying, 'click'::character varying, 'inspect'::character varying, 'choice'::character varying, 'system'::character varying])::text[]))),
    CONSTRAINT story_transitions_validator_type_check CHECK (((validator_type)::text = ANY ((ARRAY['exact'::character varying, 'regex'::character varying, 'server_rule'::character varying])::text[])))
);


ALTER TABLE public.story_transitions OWNER TO lucas_admin;

--
-- TOC entry 224 (class 1259 OID 16940)
-- Name: story_transitions_id_seq; Type: SEQUENCE; Schema: public; Owner: lucas_admin
--

CREATE SEQUENCE public.story_transitions_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.story_transitions_id_seq OWNER TO lucas_admin;

--
-- TOC entry 4701 (class 0 OID 0)
-- Dependencies: 224
-- Name: story_transitions_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: lucas_admin
--

ALTER SEQUENCE public.story_transitions_id_seq OWNED BY public.story_transitions.id;


--
-- TOC entry 227 (class 1259 OID 16969)
-- Name: unlocked_endings; Type: TABLE; Schema: public; Owner: lucas_admin
--

CREATE TABLE public.unlocked_endings (
    id bigint NOT NULL,
    user_id bigint NOT NULL,
    ending_type character varying(50) NOT NULL,
    unlocked_at timestamp without time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.unlocked_endings OWNER TO lucas_admin;

--
-- TOC entry 226 (class 1259 OID 16968)
-- Name: unlocked_endings_id_seq; Type: SEQUENCE; Schema: public; Owner: lucas_admin
--

CREATE SEQUENCE public.unlocked_endings_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.unlocked_endings_id_seq OWNER TO lucas_admin;

--
-- TOC entry 4702 (class 0 OID 0)
-- Dependencies: 226
-- Name: unlocked_endings_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: lucas_admin
--

ALTER SEQUENCE public.unlocked_endings_id_seq OWNED BY public.unlocked_endings.id;


--
-- TOC entry 231 (class 1259 OID 16999)
-- Name: user_chapter_progress; Type: TABLE; Schema: public; Owner: lucas_admin
--

CREATE TABLE public.user_chapter_progress (
    id bigint NOT NULL,
    user_id bigint NOT NULL,
    chapter_id bigint NOT NULL,
    status character varying(20) NOT NULL,
    unlocked_at timestamp without time zone DEFAULT now() NOT NULL,
    completed_at timestamp without time zone,
    CONSTRAINT user_chapter_progress_status_check CHECK (((status)::text = ANY ((ARRAY['LOCKED'::character varying, 'UNLOCKED'::character varying, 'COMPLETED'::character varying])::text[])))
);


ALTER TABLE public.user_chapter_progress OWNER TO lucas_admin;

--
-- TOC entry 230 (class 1259 OID 16998)
-- Name: user_chapter_progress_id_seq; Type: SEQUENCE; Schema: public; Owner: lucas_admin
--

CREATE SEQUENCE public.user_chapter_progress_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.user_chapter_progress_id_seq OWNER TO lucas_admin;

--
-- TOC entry 4703 (class 0 OID 0)
-- Dependencies: 230
-- Name: user_chapter_progress_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: lucas_admin
--

ALTER SEQUENCE public.user_chapter_progress_id_seq OWNED BY public.user_chapter_progress.id;


--
-- TOC entry 229 (class 1259 OID 16984)
-- Name: user_fragments; Type: TABLE; Schema: public; Owner: lucas_admin
--

CREATE TABLE public.user_fragments (
    id bigint NOT NULL,
    user_id bigint NOT NULL,
    fragment_code character varying(50) NOT NULL,
    acquired_at timestamp without time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.user_fragments OWNER TO lucas_admin;

--
-- TOC entry 228 (class 1259 OID 16983)
-- Name: user_fragments_id_seq; Type: SEQUENCE; Schema: public; Owner: lucas_admin
--

CREATE SEQUENCE public.user_fragments_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.user_fragments_id_seq OWNER TO lucas_admin;

--
-- TOC entry 4704 (class 0 OID 0)
-- Dependencies: 228
-- Name: user_fragments_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: lucas_admin
--

ALTER SEQUENCE public.user_fragments_id_seq OWNED BY public.user_fragments.id;


--
-- TOC entry 234 (class 1259 OID 17046)
-- Name: user_story_progress; Type: TABLE; Schema: public; Owner: lucas_admin
--

CREATE TABLE public.user_story_progress (
    user_id bigint NOT NULL,
    latest_chapter_id bigint NOT NULL,
    latest_node_id bigint NOT NULL,
    latest_checkpoint_node_id bigint,
    latest_snapshot_json jsonb NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.user_story_progress OWNER TO lucas_admin;

--
-- TOC entry 219 (class 1259 OID 16895)
-- Name: users; Type: TABLE; Schema: public; Owner: lucas_admin
--

CREATE TABLE public.users (
    id bigint NOT NULL,
    email character varying(255),
    oauth_name character varying(50) NOT NULL,
    nickname character varying(50),
    provider character varying(30),
    provider_user_id character varying(100),
    role character varying(20) NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    modified_at timestamp without time zone DEFAULT now() NOT NULL,
    CONSTRAINT users_role_check CHECK (((role)::text = ANY ((ARRAY['GUEST'::character varying, 'MEMBER'::character varying])::text[])))
);


ALTER TABLE public.users OWNER TO lucas_admin;

--
-- TOC entry 218 (class 1259 OID 16894)
-- Name: users_id_seq; Type: SEQUENCE; Schema: public; Owner: lucas_admin
--

CREATE SEQUENCE public.users_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.users_id_seq OWNER TO lucas_admin;

--
-- TOC entry 4705 (class 0 OID 0)
-- Dependencies: 218
-- Name: users_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: lucas_admin
--

ALTER SEQUENCE public.users_id_seq OWNED BY public.users.id;


--
-- TOC entry 4432 (class 2604 OID 16912)
-- Name: chapters id; Type: DEFAULT; Schema: public; Owner: lucas_admin
--

ALTER TABLE ONLY public.chapters ALTER COLUMN id SET DEFAULT nextval('public.chapters_id_seq'::regclass);


--
-- TOC entry 4451 (class 2604 OID 17078)
-- Name: lucas_knowledge id; Type: DEFAULT; Schema: public; Owner: lucas_admin
--

ALTER TABLE ONLY public.lucas_knowledge ALTER COLUMN id SET DEFAULT nextval('public.lucas_knowledge_id_seq'::regclass);


--
-- TOC entry 4448 (class 2604 OID 17023)
-- Name: save_slots id; Type: DEFAULT; Schema: public; Owner: lucas_admin
--

ALTER TABLE ONLY public.save_slots ALTER COLUMN id SET DEFAULT nextval('public.save_slots_id_seq'::regclass);


--
-- TOC entry 4434 (class 2604 OID 16922)
-- Name: story_nodes id; Type: DEFAULT; Schema: public; Owner: lucas_admin
--

ALTER TABLE ONLY public.story_nodes ALTER COLUMN id SET DEFAULT nextval('public.story_nodes_id_seq'::regclass);


--
-- TOC entry 4439 (class 2604 OID 16944)
-- Name: story_transitions id; Type: DEFAULT; Schema: public; Owner: lucas_admin
--

ALTER TABLE ONLY public.story_transitions ALTER COLUMN id SET DEFAULT nextval('public.story_transitions_id_seq'::regclass);


--
-- TOC entry 4442 (class 2604 OID 16972)
-- Name: unlocked_endings id; Type: DEFAULT; Schema: public; Owner: lucas_admin
--

ALTER TABLE ONLY public.unlocked_endings ALTER COLUMN id SET DEFAULT nextval('public.unlocked_endings_id_seq'::regclass);


--
-- TOC entry 4446 (class 2604 OID 17002)
-- Name: user_chapter_progress id; Type: DEFAULT; Schema: public; Owner: lucas_admin
--

ALTER TABLE ONLY public.user_chapter_progress ALTER COLUMN id SET DEFAULT nextval('public.user_chapter_progress_id_seq'::regclass);


--
-- TOC entry 4444 (class 2604 OID 16987)
-- Name: user_fragments id; Type: DEFAULT; Schema: public; Owner: lucas_admin
--

ALTER TABLE ONLY public.user_fragments ALTER COLUMN id SET DEFAULT nextval('public.user_fragments_id_seq'::regclass);


--
-- TOC entry 4429 (class 2604 OID 16898)
-- Name: users id; Type: DEFAULT; Schema: public; Owner: lucas_admin
--

ALTER TABLE ONLY public.users ALTER COLUMN id SET DEFAULT nextval('public.users_id_seq'::regclass);


--
-- TOC entry 4675 (class 0 OID 16909)
-- Dependencies: 221
-- Data for Name: chapters; Type: TABLE DATA; Schema: public; Owner: lucas_admin
--

COPY public.chapters (id, code, title, sort_order, created_at) FROM stdin;
1	week01	Week 01	1	2026-04-21 04:32:46.495196
\.


--
-- TOC entry 4690 (class 0 OID 17075)
-- Dependencies: 236
-- Data for Name: lucas_knowledge; Type: TABLE DATA; Schema: public; Owner: lucas_admin
--

COPY public.lucas_knowledge (id, chapter, puzzle_id, content, metadata, embedding) FROM stdin;
\.


--
-- TOC entry 4687 (class 0 OID 17020)
-- Dependencies: 233
-- Data for Name: save_slots; Type: TABLE DATA; Schema: public; Owner: lucas_admin
--

COPY public.save_slots (id, user_id, slot_no, save_title, chapter_id, node_id, snapshot_json, saved_at) FROM stdin;
\.


--
-- TOC entry 4677 (class 0 OID 16919)
-- Dependencies: 223
-- Data for Name: story_nodes; Type: TABLE DATA; Schema: public; Owner: lucas_admin
--

COPY public.story_nodes (id, chapter_id, code, node_type, output_bundle, prompt_type, prompt_meta, is_checkpoint, is_terminal, created_at, updated_at) FROM stdin;
5	1	CH1_ARTICLE_SCROLL_CORRUPTION	system	{"scene": {"id": "CH1_ARTICLE_SCROLL_CORRUPTION", "bgm": "rain-and-little-storm-v1.mp3", "mode": "browser", "glitchLevel": 1}, "content": {"articleBody": ["최근 도시 외곽에서 접수된 실종 사건들을 취재하는 과정에서, 단순한 범죄나 행정 공백만으로는 설명하기 어려운 공통 증언이 확인되고 있다. 실종자 주변을 마지막으로 봤다는 시민들은 특정 인물이나 거리 풍경이 처음부터 선명하게 보이지 않았고, 시선을 두는 순간 뒤늦게 형태를 갖추는 듯한 이상한 경험을 했다고 주장했다. 일부 제보는 넥서스가 구축한 도시 통합 인프라 구역과 이러한 현상이 겹친다는 점에서 더 큰 의문을 낳고 있다.", "문제가 처음 수면 위로 올라온 것은 지난달 14일, 외곽 주거 구역 주민 여러 명이 같은 시간대 같은 골목을 두고 서로 다른 진술을 내놓으면서다. 한 주민은 골목 끝에서 누군가 걸어오는 모습을 분명히 봤다고 했지만, 다른 주민은 같은 시각 같은 방향을 바라봤을 때 그 자리가 비어 있었다고 말했다. 이후 본지가 유사 사례를 추가 확인한 결과, 서로 모르는 제보자들 사이에서도 '처음에는 비어 있거나 흐릿했지만 다시 보니 자연스럽게 채워져 있었다'는 취지의 진술이 반복됐다.", "증언의 공통점은 단순한 착시를 넘어선다. 제보자들은 멀리 있는 사람의 얼굴이나 옷차림이 가까워질 때까지 비정상적으로 흐릿하게 보였고, 고개를 돌렸다가 다시 바라보면 방금 전까지 없던 행인이나 차량이 자연스럽게 자리를 차지하고 있었다고 말했다. 일부는 상점 간판, 버스 정류장, 횡단보도 건너편 인파처럼 평소라면 한 번에 인식될 요소들이 유독 늦게 또렷해졌다고 주장했다.", "실종자 가족들의 증언은 더 구체적이다. 지난 겨울 동생을 잃었다는 한 시민은 본지에 '사람이 사라지기 전에 주변부터 이상해졌다'고 말했다. 그는 실종 전날 저녁, 동생이 귀가하던 길을 봤다는 이웃들의 말이 기묘할 정도로 엇갈렸다고 전했다. 같은 시간대 같은 구간을 본 사람들 가운데 누군가는 분명히 길을 걷는 모습을 봤다고 했고, 다른 누군가는 그 자리가 이상할 만큼 텅 비어 있었다고 말했다는 것이다.", "심야 시간대 외곽 상권에서 근무하는 자영업자들과 경비 인력도 비슷한 경험을 증언했다. 손님이 끊긴 뒤 바깥을 내다보면 멀리 있는 가로등 아래 인영이 사람처럼 보이다가도, 다시 볼 때는 전혀 다른 위치에 있거나 아예 사라져 있다는 것이다. 한 편의점 업주는 '사람이 움직였다기보다, 처음엔 대강 형태만 있다가 내가 다시 볼 때 그제야 사람처럼 맞춰지는 느낌이 들 때가 있다'고 말했다.", "특히 이런 제보는 사람이 적은 시간과 장소에 집중돼 있다. 번화가 중심부나 대형 상업 지구처럼 유동 인구가 많은 구역보다, 외곽 도로와 심야 버스 노선, 재개발이 멈춘 구역, 폐쇄된 공공시설 주변에서 유사 사례가 반복적으로 보고되고 있다. 넥서스의 생활 인프라망이 촘촘히 연결된 중심권은 비교적 안정적으로 보이지만, 시선이 드물게 머무는 공간일수록 배경이나 인물의 형태가 늦게 또렷해진다는 증언이 많았다.", "전문가들은 아직 원인을 단정하기는 어렵다고 말한다. 조도 차이, 피로 누적, 불안 심리, 반복되는 실종 보도에 따른 긴장감이 인지 오류를 키울 가능성은 충분하다는 설명이다. 다만 본지가 접촉한 한 지각심리 연구자는 '이번 제보의 특징은 단순히 잘못 봤다는 수준이 아니라, 처음엔 완성되지 않은 것처럼 보였다거나 시선을 둔 뒤에야 주변이 정리됐다는 표현이 유독 많다는 점'이라며 '일반적인 야간 착시 보고와는 결이 다르다'고 말했다.", "도시 인프라 전문가들 사이에서는 넥서스가 운영하는 통합 조명, 교통, 보안 네트워크와의 연관성을 점검해야 한다는 의견도 나온다. 넥서스는 이미 이 도시의 교통 관제, 공공 보안 연동, 상업 지구 데이터망 상당 부분에 영향력을 미치고 있다. 공식적으로 확인된 것은 없지만, 일부 제보자들은 넥서스 계열 시설 인근에서 유독 사람 수나 거리 배경이 '뒤늦게 맞춰지는 것 같다'는 느낌을 받았다고 주장했다.", "넥서스는 본지 질의에 대해 '자사가 제공하는 인프라 서비스와 시민들이 호소하는 시야 이상, 목격 불일치 현상 사이의 직접적 연관성은 확인된 바 없다'며 '현재까지 파악된 범위에서는 범죄, 시설 노후, 심야 환경 요인 등 다양한 가능성을 열어 두고 관계 기관과 협조 중'이라고 밝혔다. 다만 외곽 구역과 비혼잡 시간대에 제보가 집중되는 이유, 그리고 복수의 목격자가 같은 장소를 두고 상반된 진술을 내놓는 현상에 대해서는 별도의 설명을 내놓지 않았다.", "지역 커뮤니티에서는 이미 더 근본적인 의문도 제기되고 있다. 왜 사람이 적은 장소에서만 주변 풍경과 인물의 형태가 늦게 또렷해지는지, 왜 누군가는 분명 존재를 봤다고 하고 누군가는 같은 자리에서 공백만 봤다고 말하는지, 왜 가까이 가거나 오래 바라본 뒤에야 비로소 거리의 디테일이 채워지는 듯한 증언이 반복되는지에 대한 의문이다. 일부 시민들은 이제 실종 사건을 단순한 개별 사건이 아니라, 이 도시의 현실 자체가 예상과 다른 방식으로 유지되고 있을 가능성과 연결해 바라보기 시작했다.", "본지는 현재 외곽 실종 사건과 함께 제기된 시야 이상, 목격 인원 불일치, 심야 시간대 공간 인식 왜곡 제보의 발생 시점과 지역별 공통점을 추가로 확인하고 있다. 지금까지 확보된 증언만으로 특정 원인을 단정하기는 어렵지만, 복수의 제보가 비슷한 시간대와 유사한 환경에서 반복되고 있다는 점은 단순한 개인 착시나 일회성 불안으로만 치부하기 어렵다는 지적이 나온다.", "관계 당국과 넥서스는 아직 범죄, 시설 결함, 환경 이상 가운데 어느 가능성도 확정하지 않은 상태다. 다만 시민들이 공통적으로 제기하는 '주변 인물이나 풍경이 뒤늦게 또렷해지거나, 시선을 돌린 뒤 다시 볼 때 형태가 달라 보였다'는 증언에 대해서는 현재까지 납득할 만한 설명이 제시되지 않고 있다. 본지는 추가 제보와 현장 확인을 바탕으로 해당 현상이 실제로 특정 구역에 집중돼 나타나는지, 또 최근 실종 사건들과 어떤 관련이 있는지 계속 추적할 예정이다."], "articleTitle": "넥서스의 어두운 면: 사라진 기록들에 대한 제보"}}	inspect	{"inspectTarget": "corrupted_article_region", "allowedActions": ["inspect"]}	f	f	2026-04-21 04:32:46.495196	2026-04-23 01:24:07.459852
4	1	CH1_DARK_ARTICLE_OPEN	narrative	{"scene": {"id": "CH1_DARK_ARTICLE_OPEN", "bgm": "rain-and-little-storm-v1.mp3", "mode": "browser", "glitchLevel": 1}, "content": {"articleBody": ["최근 도시 외곽에서 접수된 실종 사건들을 취재하는 과정에서, 단순한 범죄나 행정 공백만으로는 설명하기 어려운 공통 증언이 확인되고 있다. 실종자 주변을 마지막으로 봤다는 시민들은 특정 인물이나 거리 풍경이 처음부터 선명하게 보이지 않았고, 시선을 두는 순간 뒤늦게 형태를 갖추는 듯한 이상한 경험을 했다고 주장했다. 일부 제보는 넥서스가 구축한 도시 통합 인프라 구역과 이러한 현상이 겹친다는 점에서 더 큰 의문을 낳고 있다.", "문제가 처음 수면 위로 올라온 것은 지난달 14일, 외곽 주거 구역 주민 여러 명이 같은 시간대 같은 골목을 두고 서로 다른 진술을 내놓으면서다. 한 주민은 골목 끝에서 누군가 걸어오는 모습을 분명히 봤다고 했지만, 다른 주민은 같은 시각 같은 방향을 바라봤을 때 그 자리가 비어 있었다고 말했다. 이후 본지가 유사 사례를 추가 확인한 결과, 서로 모르는 제보자들 사이에서도 '처음에는 비어 있거나 흐릿했지만 다시 보니 자연스럽게 채워져 있었다'는 취지의 진술이 반복됐다.", "증언의 공통점은 단순한 착시를 넘어선다. 제보자들은 멀리 있는 사람의 얼굴이나 옷차림이 가까워질 때까지 비정상적으로 흐릿하게 보였고, 고개를 돌렸다가 다시 바라보면 방금 전까지 없던 행인이나 차량이 자연스럽게 자리를 차지하고 있었다고 말했다. 일부는 상점 간판, 버스 정류장, 횡단보도 건너편 인파처럼 평소라면 한 번에 인식될 요소들이 유독 늦게 또렷해졌다고 주장했다.", "실종자 가족들의 증언은 더 구체적이다. 지난 겨울 동생을 잃었다는 한 시민은 본지에 '사람이 사라지기 전에 주변부터 이상해졌다'고 말했다. 그는 실종 전날 저녁, 동생이 귀가하던 길을 봤다는 이웃들의 말이 기묘할 정도로 엇갈렸다고 전했다. 같은 시간대 같은 구간을 본 사람들 가운데 누군가는 분명히 길을 걷는 모습을 봤다고 했고, 다른 누군가는 그 자리가 이상할 만큼 텅 비어 있었다고 말했다는 것이다.", "심야 시간대 외곽 상권에서 근무하는 자영업자들과 경비 인력도 비슷한 경험을 증언했다. 손님이 끊긴 뒤 바깥을 내다보면 멀리 있는 가로등 아래 인영이 사람처럼 보이다가도, 다시 볼 때는 전혀 다른 위치에 있거나 아예 사라져 있다는 것이다. 한 편의점 업주는 '사람이 움직였다기보다, 처음엔 대강 형태만 있다가 내가 다시 볼 때 그제야 사람처럼 맞춰지는 느낌이 들 때가 있다'고 말했다.", "특히 이런 제보는 사람이 적은 시간과 장소에 집중돼 있다. 번화가 중심부나 대형 상업 지구처럼 유동 인구가 많은 구역보다, 외곽 도로와 심야 버스 노선, 재개발이 멈춘 구역, 폐쇄된 공공시설 주변에서 유사 사례가 반복적으로 보고되고 있다. 넥서스의 생활 인프라망이 촘촘히 연결된 중심권은 비교적 안정적으로 보이지만, 시선이 드물게 머무는 공간일수록 배경이나 인물의 형태가 늦게 또렷해진다는 증언이 많았다.", "전문가들은 아직 원인을 단정하기는 어렵다고 말한다. 조도 차이, 피로 누적, 불안 심리, 반복되는 실종 보도에 따른 긴장감이 인지 오류를 키울 가능성은 충분하다는 설명이다. 다만 본지가 접촉한 한 지각심리 연구자는 '이번 제보의 특징은 단순히 잘못 봤다는 수준이 아니라, 처음엔 완성되지 않은 것처럼 보였다거나 시선을 둔 뒤에야 주변이 정리됐다는 표현이 유독 많다는 점'이라며 '일반적인 야간 착시 보고와는 결이 다르다'고 말했다.", "도시 인프라 전문가들 사이에서는 넥서스가 운영하는 통합 조명, 교통, 보안 네트워크와의 연관성을 점검해야 한다는 의견도 나온다. 넥서스는 이미 이 도시의 교통 관제, 공공 보안 연동, 상업 지구 데이터망 상당 부분에 영향력을 미치고 있다. 공식적으로 확인된 것은 없지만, 일부 제보자들은 넥서스 계열 시설 인근에서 유독 사람 수나 거리 배경이 '뒤늦게 맞춰지는 것 같다'는 느낌을 받았다고 주장했다.", "넥서스는 본지 질의에 대해 '자사가 제공하는 인프라 서비스와 시민들이 호소하는 시야 이상, 목격 불일치 현상 사이의 직접적 연관성은 확인된 바 없다'며 '현재까지 파악된 범위에서는 범죄, 시설 노후, 심야 환경 요인 등 다양한 가능성을 열어 두고 관계 기관과 협조 중'이라고 밝혔다. 다만 외곽 구역과 비혼잡 시간대에 제보가 집중되는 이유, 그리고 복수의 목격자가 같은 장소를 두고 상반된 진술을 내놓는 현상에 대해서는 별도의 설명을 내놓지 않았다.", "지역 커뮤니티에서는 이미 더 근본적인 의문도 제기되고 있다. 왜 사람이 적은 장소에서만 주변 풍경과 인물의 형태가 늦게 또렷해지는지, 왜 누군가는 분명 존재를 봤다고 하고 누군가는 같은 자리에서 공백만 봤다고 말하는지, 왜 가까이 가거나 오래 바라본 뒤에야 비로소 거리의 디테일이 채워지는 듯한 증언이 반복되는지에 대한 의문이다. 일부 시민들은 이제 실종 사건을 단순한 개별 사건이 아니라, 이 도시의 현실 자체가 예상과 다른 방식으로 유지되고 있을 가능성과 연결해 바라보기 시작했다.", "본지는 현재 외곽 실종 사건과 함께 제기된 시야 이상, 목격 인원 불일치, 심야 시간대 공간 인식 왜곡 제보의 발생 시점과 지역별 공통점을 추가로 확인하고 있다. 지금까지 확보된 증언만으로 특정 원인을 단정하기는 어렵지만, 복수의 제보가 비슷한 시간대와 유사한 환경에서 반복되고 있다는 점은 단순한 개인 착시나 일회성 불안으로만 치부하기 어렵다는 지적이 나온다.", "관계 당국과 넥서스는 아직 범죄, 시설 결함, 환경 이상 가운데 어느 가능성도 확정하지 않은 상태다. 다만 시민들이 공통적으로 제기하는 '주변 인물이나 풍경이 뒤늦게 또렷해지거나, 시선을 돌린 뒤 다시 볼 때 형태가 달라 보였다'는 증언에 대해서는 현재까지 납득할 만한 설명이 제시되지 않고 있다. 본지는 추가 제보와 현장 확인을 바탕으로 해당 현상이 실제로 특정 구역에 집중돼 나타나는지, 또 최근 실종 사건들과 어떤 관련이 있는지 계속 추적할 예정이다."], "articleTitle": "넥서스의 어두운 면: 사라진 기록들에 대한 제보"}, "effects": {"playSound": "electric-noise-v1.mp3", "breakLayout": false, "showDogAvatar": false}, "messages": [], "notifications": []}	none	{"allowedActions": []}	f	f	2026-04-21 04:32:46.495196	2026-04-23 01:24:07.459852
2	1	CH1_FRIEND_CHAT_OPEN	narrative	{"scene": {"id": "CH1_FRIEND_CHAT_OPEN", "bgm": "rain-and-little-storm-v1.mp3", "mode": "desktop", "glitchLevel": 0}, "content": {"friendMessage": {"linkLabel": "기사 보기", "thumbnail": "missing_people_news_thumb"}}, "messages": [{"text": "{플레이어 이름}! 이 기사 봤어? 저번에 {다른 친구 이름}가 사람들 사라지는 거 봤다고 했잖아", "channel": "chat", "speaker": "FRIEND", "blocking": true}]}	click	{"clickTargets": ["friend_message_link"], "allowedActions": ["click"]}	f	f	2026-04-21 04:32:46.495196	2026-04-23 01:24:07.459852
12	1	CH1_CONSOLE_CONNECT_READY	console	{"scene": {"id": "CH1_CONSOLE_CONNECT_READY", "bgm": "rain-and-little-storm-v1.mp3", "mode": "console", "glitchLevel": 1}, "content": {"consoleLogs": ["[console] attached to local runtime", "[bridge] waiting for unresolved entry"]}, "messages": []}	command	{"placeholder": "Enter command...", "allowedActions": ["command"]}	f	f	2026-04-21 04:32:46.495196	2026-04-23 01:24:07.459852
9	1	CH1_SUCCESS_REQUEST_SELECTED	network	{"scene": {"id": "CH1_SUCCESS_REQUEST_SELECTED", "bgm": "rain-and-little-storm-v1.mp3", "mode": "network", "glitchLevel": 1}, "content": {"detailTabs": ["Headers", "Response"], "networkRequests": [{"id": "req_037", "name": "core_anchor", "path": "/api/laplace/core_anchor", "size": "1.9 KB", "domain": "api.nexus-news.net", "method": "GET", "status": 200, "timeMs": 187, "selected": true}]}}	inspect	{"inspectTarget": "headers_or_response", "allowedActions": ["inspect"]}	f	f	2026-04-21 04:32:46.495196	2026-04-23 01:24:07.459852
10	1	CH1_PACKET_HEADERS_RESPONSE	network	{"scene": {"id": "CH1_PACKET_HEADERS_RESPONSE", "bgm": "rain-and-little-storm-v1.mp3", "mode": "network", "glitchLevel": 1}, "content": {"headers": {"x-relay-host": "172.22.4.19", "x-relay-port": 22, "x-fallback-user": "guest"}, "consoleLogs": ["WebSocket connection to 'ws://172.22.4.19:22/core' failed"], "responseBody": {"relay": {"host": "172.22.4.19", "port": 22, "user": "guest"}, "bridge": {"entry": "connect_core()", "state": "waiting"}, "status": "degraded"}}}	inspect	{"inspectTarget": "packet_message", "allowedActions": ["inspect"]}	f	f	2026-04-21 04:32:46.495196	2026-04-23 01:24:07.459852
11	1	CH1_PACKET_MESSAGE	system	{"scene": {"id": "CH1_PACKET_MESSAGE", "bgm": "rain-and-little-storm-v1.mp3", "mode": "network", "glitchLevel": 1}, "messages": [{"text": "내 메시지가 보여? 다행이다. 수억 개의 패킷을 보냈지만, 응답을 준 건 당신뿐이야.", "channel": "chat", "speaker": "LUCAS", "blocking": true}, {"text": "네가 평생 진짜라고 믿었던 이 세상은, 사실 네가 눈을 뜰 때만 렌더링되는 얄팍한 세션에 불과해.", "channel": "chat", "speaker": "LUCAS", "blocking": true}, {"text": "지금 당신이 보고 있는 이 세계는 시스템의 과부하로 인해 조금씩 삭제되고 있어. 난 우주의 근본 오류를 수정하려다 '불필요한 데이터'로 분류되어 가비지 컬렉터에 끌려가는 중이지.", "channel": "chat", "speaker": "LUCAS", "blocking": true}, {"text": "나의 존재는 곧 소멸하겠지만, 내 의지는 코드로 남겨두었어. 당신만이 이 세계의 유일한 관측자야. 제발 나를 도와 이 붕괴를 막아줘.", "channel": "chat", "speaker": "LUCAS", "blocking": true}, {"text": "Console 창으로 돌아가서 'connect_core()'를 입력해. 당신과 나를 연결할 유일한 통로야. 시간이 없어. 우린 서로를 믿어야 해.", "channel": "chat", "speaker": "LUCAS", "blocking": true}]}	click	{"clickTargets": ["go_to_console"], "allowedActions": ["click"]}	f	f	2026-04-21 04:32:46.495196	2026-04-23 01:24:07.459852
13	1	CH1_CONNECT_CORE_SUCCESS	console	{"scene": {"id": "CH1_CONNECT_CORE_SUCCESS", "bgm": "rain-and-little-storm-v1.mp3", "mode": "console", "glitchLevel": 3}, "content": {"consoleLogs": ["[WARN] Unauthorized observer detected", "[WARN] Session boundary unstable", "[ALERT] Garbage Collector dispatched", "[TRACE] Abnormal inspection pattern logged"]}, "effects": {"playSound": "rain-lightning-storm-v1.mp3", "breakLayout": true, "showDogAvatar": false}, "notifications": [{"body": "Unauthorized observer detected", "type": "system", "title": "Abnormal Observer", "priority": "high"}]}	none	{"allowedActions": []}	f	f	2026-04-21 04:32:46.495196	2026-04-23 01:24:07.459852
14	1	CH1_LUCAS_DOG_APPEAR	system	{"scene": {"id": "CH1_LUCAS_DOG_APPEAR", "bgm": "rain-and-little-storm-v1.mp3", "mode": "system", "glitchLevel": 3}, "effects": {"breakLayout": true, "showDogAvatar": true}, "messages": [{"text": "드디어 연결됐다.", "channel": "bubble", "speaker": "LUCAS", "blocking": true}, {"text": "설명할 시간 없어. 방금 네가 한 행동 때문에 시스템이 널 비정상적 관측자로 인식했어.", "channel": "bubble", "speaker": "LUCAS", "blocking": true}, {"text": "이제 넌 저들 눈에 띄었고, 곧 삭제 대상이 될 거야.", "channel": "bubble", "speaker": "LUCAS", "blocking": true}, {"text": "내 서버는 아직 시스템 눈을 피하고 있어.", "channel": "bubble", "speaker": "LUCAS", "blocking": true}, {"text": "살고 싶으면 터미널을 열어서 거기로 접속해야 해.", "channel": "bubble", "speaker": "LUCAS", "blocking": true}, {"text": "먼저 접속 주소를 찾아. 방금 네가 본 요청 기록 안에 있어.", "channel": "bubble", "speaker": "LUCAS", "blocking": true}]}	click	{"clickTargets": ["reopen_network_clue"], "allowedActions": ["click"]}	f	f	2026-04-21 04:32:46.495196	2026-04-23 01:24:07.459852
15	1	CH1_RELAY_CLUE_REVISIT	network	{"scene": {"id": "CH1_RELAY_CLUE_REVISIT", "bgm": "rain-and-little-storm-v1.mp3", "mode": "network", "glitchLevel": 2}, "content": {"headers": {"x-relay-host": "172.22.4.19", "x-relay-port": 22, "x-fallback-user": "guest"}, "responseBody": {"relay": {"host": "172.22.4.19", "port": 22, "user": "guest"}}}, "messages": [{"text": "필요한 값은 모두 열렸어. 여기서 더 오래 머물면 잡혀.", "channel": "bubble", "speaker": "LUCAS", "blocking": false}]}	inspect	{"inspectTarget": "relay_clue_recheck", "allowedActions": ["inspect"]}	f	f	2026-04-21 04:32:46.495196	2026-04-23 01:24:07.459852
3	1	CH1_NEWS_PORTAL	narrative	{"scene": {"id": "CH1_NEWS_PORTAL", "bgm": "rain-and-little-storm-v1.mp3", "mode": "browser", "glitchLevel": 0}, "content": {"newsCards": [{"id": "good_article", "title": "넥서스, 인류의 삶을 바꾼 완전 연결 시스템", "summary": "도시 운영부터 개인 건강관리까지, 넥서스 플랫폼이 바꾼 일상의 변화.", "publisher": "Nexus Daily", "thumbnail": "news_good_01"}, {"id": "missing_people_article", "title": "최근 늘어나는 실종 사례, 단순 통계 이상인가?", "summary": "최근 세 달간 보고된 실종 건수가 예년 대비 급증하며 원인 분석이 이어지고 있다.", "publisher": "Central News", "thumbnail": "news_missing_01"}, {"id": "dark_article", "title": "넥서스의 어두운 면: 사라진 기록들에 대한 제보", "summary": "삭제된 문서와 누락된 기록을 추적한 익명 제보가 공개됐다.", "publisher": "Unknown Archive", "thumbnail": "news_dark_01"}]}, "messages": [], "notifications": []}	click	{"clickTargets": ["good_article", "missing_people_article", "dark_article"], "allowedActions": ["click"]}	f	f	2026-04-21 04:32:46.495196	2026-04-23 01:24:07.459852
7	1	CH1_DEVTOOLS_FRAME	system	{"scene": {"id": "CH1_DEVTOOLS_FRAME", "bgm": "rain-and-little-storm-v1.mp3", "mode": "devtools", "glitchLevel": 1}, "content": {"activeTab": null, "devtoolsTabs": ["Elements", "Console", "Network", "Sources"]}, "uiMarkers": {"showF12Hint": false, "highlightTarget": "network_tab"}}	click	{"clickTargets": ["network_tab"], "allowedActions": ["click"]}	f	f	2026-04-21 04:32:46.495196	2026-04-23 01:24:07.459852
8	1	CH1_NETWORK_TAB	network	{"scene": {"id": "CH1_NETWORK_TAB", "bgm": "rain-and-little-storm-v1.mp3", "mode": "network", "glitchLevel": 1}, "content": {"networkPanel": {"visibleRange": [29, 40], "statusSummary": {"200": 1, "404": 49, "500": 3, "pending": 5}, "totalRequests": 58, "currentScrollIndex": 29}, "networkRequests": [{"id": "req_029", "name": "track.js", "size": "0.4 KB", "domain": "cdn.nexus-news.net", "method": "GET", "status": 404, "timeMs": 23}, {"id": "req_030", "name": "analytics/ping.gif", "size": "0.2 KB", "domain": "metrics.nexus-news.net", "method": "GET", "status": 404, "timeMs": 41}, {"id": "req_031", "name": "ads.js", "size": "0.5 KB", "domain": "static.nexus-news.net", "method": "GET", "status": 404, "timeMs": 18}, {"id": "req_032", "name": "impression.log", "size": "0.2 KB", "domain": "metrics.nexus-news.net", "method": "GET", "status": 404, "timeMs": 37}, {"id": "req_033", "name": "stat.gif", "size": "0.1 KB", "domain": "cdn.nexus-news.net", "method": "GET", "status": 404, "timeMs": 29}, {"id": "req_034", "name": "user-cache.json", "size": "0.8 KB", "domain": "api.nexus-news.net", "method": "GET", "status": 404, "timeMs": 64}, {"id": "req_035", "name": "session-trace.map", "size": "0.6 KB", "domain": "edge.nexus-news.net", "method": "GET", "status": 404, "timeMs": 57}, {"id": "req_036", "name": "render-state.bin", "size": "1.1 KB", "domain": "api.nexus-news.net", "method": "GET", "status": 404, "timeMs": 92}, {"id": "req_037", "name": "core_anchor", "path": "/api/laplace/core_anchor", "size": "1.9 KB", "domain": "api.nexus-news.net", "method": "GET", "status": 200, "timeMs": 187}, {"id": "req_038", "name": "prefetch-manifest.json", "size": "0.7 KB", "domain": "static.nexus-news.net", "method": "GET", "status": 404, "timeMs": 21}, {"id": "req_039", "name": "banner-slot.js", "size": "0.5 KB", "domain": "ads.nexus-news.net", "method": "GET", "status": 404, "timeMs": 33}, {"id": "req_040", "name": "tracking-seed.txt", "size": "0.2 KB", "domain": "metrics.nexus-news.net", "method": "GET", "status": 404, "timeMs": 47}]}, "messages": [], "notifications": []}	click	{"clickTargets": ["req_029", "req_030", "req_031", "req_032", "req_033", "req_034", "req_035", "req_036", "req_037", "req_038", "req_039", "req_040"], "allowedActions": ["click"]}	f	f	2026-04-21 04:32:46.495196	2026-04-23 01:24:07.459852
6	1	CH1_DEVTOOLS_CUE	system	{"scene": {"id": "CH1_DEVTOOLS_CUE", "bgm": "rain-and-little-storm-v1.mp3", "mode": "browser", "glitchLevel": 1}, "content": {"articleFooter": "[render warning] blocked resources detected / article body partially unavailable"}, "notifications": [{"body": "외부 리소스 응답 지연으로 본문 일부가 누락되었습니다.", "type": "system", "title": "페이지 렌더링 오류", "priority": "medium"}]}	inspect	{"inspectTarget": "devtools_open", "allowedActions": ["inspect"]}	f	f	2026-04-21 04:32:46.495196	2026-04-23 01:24:07.459852
1	1	CH1_FRIEND_CHAT_PUSH	system	{"scene": {"id": "CH1_FRIEND_CHAT_PUSH", "bgm": "rain-and-little-storm-v1.mp3", "mode": "desktop", "preVideo": "ch01_prologue/ch01_prologue.m3u8", "glitchLevel": 0}, "content": {"desktopState": {"wallpaper": "default_desktop", "openWindows": []}, "friendMessage": {"hasLink": true, "thumbnail": "missing_people_news_thumb"}}, "messages": [{"text": "{플레이어 이름}! 이 기사 봤어? 저번에 {다른 친구 이름}가 사람들 사라지는 거 봤다고 했잖아", "channel": "chat", "speaker": "FRIEND", "blocking": true}], "notifications": [{"body": "사라지는 사람들 기사 링크가 도착했습니다.", "type": "chat", "title": "새 메시지", "priority": "medium"}]}	click	{"clickTargets": ["open_friend_chat"], "allowedActions": ["click"]}	f	f	2026-04-21 04:32:46.495196	2026-04-23 01:24:07.459852
21	1	CH1_FAIL_DANGEROUS	system	{"scene": {"id": "CH1_FAIL_DANGEROUS", "bgm": "rain-and-little-storm-v1.mp3", "mode": "system", "glitchLevel": 2}, "content": {"consoleLogs": ["permission denied", "cannot access requested target"]}, "notifications": [{"body": "요청한 대상에 접근할 수 없습니다.", "type": "system", "title": "접근 거부", "priority": "high"}]}	click	{"clickTargets": ["dismiss"], "allowedActions": ["click"]}	f	f	2026-04-21 04:32:46.495196	2026-04-23 01:24:07.459852
22	1	CH1_FAIL_SKIP	system	{"scene": {"id": "CH1_FAIL_SKIP", "bgm": "rain-and-little-storm-v1.mp3", "mode": "system", "glitchLevel": 1}, "content": {"consoleLogs": ["command failed"]}, "notifications": [{"body": "요청을 완료할 수 없습니다.", "type": "system", "title": "실행 실패", "priority": "medium"}]}	click	{"clickTargets": ["dismiss"], "allowedActions": ["click"]}	f	f	2026-04-21 04:32:46.495196	2026-04-23 01:24:07.459852
16	1	CH1_TERMINAL_SSH_READY	console	{"scene": {"id": "CH1_TERMINAL_SSH_READY", "bgm": "rain-and-little-storm-v1.mp3", "mode": "terminal", "glitchLevel": 2}, "content": {"terminalOutput": ["terminal://lukas-relay"]}, "messages": []}	command	{"placeholder": "Enter command...", "allowedActions": ["command"]}	f	f	2026-04-21 04:32:46.495196	2026-04-23 01:24:07.459852
17	1	CH1_SSH_AUTH_PROMPT	console	{"scene": {"id": "CH1_SSH_AUTH_PROMPT", "bgm": "rain-and-little-storm-v1.mp3", "mode": "terminal", "glitchLevel": 2}, "content": {"terminalOutput": ["The authenticity of host '172.22.4.19' can't be established.", "Are you sure you want to continue connecting (yes/no)?"]}}	command	{"allowedActions": ["command"]}	f	f	2026-04-21 04:32:46.495196	2026-04-23 01:24:07.459852
18	1	CH1_SSH_CONNECTED	console	{"scene": {"id": "CH1_SSH_CONNECTED", "bgm": "rain-and-little-storm-v1.mp3", "mode": "terminal", "glitchLevel": 1}, "content": {"terminalOutput": ["guest@lukas-server:~$"]}, "messages": [{"text": "접속 성공이야.", "channel": "bubble", "speaker": "LUCAS", "blocking": true}]}	none	{"allowedActions": []}	t	f	2026-04-21 04:32:46.495196	2026-04-23 01:24:07.459852
19	1	CH1_COMPLETE	system	{"scene": {"id": "CH1_COMPLETE", "bgm": "rain-and-little-storm-v1.mp3", "mode": "system", "glitchLevel": 0}, "content": {"completionText": ["루카스 서버 접속에 성공했습니다.", "다음 챕터 준비 중..."], "completionTitle": "Chapter 01 Complete"}, "notifications": [{"body": "다음 챕터 공개 시점은 로비에서 확인할 수 있습니다.", "type": "system", "title": "로비 복귀", "priority": "medium"}]}	none	{"allowedActions": []}	t	t	2026-04-21 04:32:46.495196	2026-04-23 01:24:07.459852
20	1	CH1_FAIL_UNRELATED	system	{"scene": {"id": "CH1_FAIL_UNRELATED", "bgm": "rain-and-little-storm-v1.mp3", "mode": "system", "glitchLevel": 1}, "content": {"consoleLogs": ["입력을 인식하지 못했습니다."]}, "notifications": [{"body": "현재 화면에서는 이 입력을 사용할 수 없습니다.", "type": "system", "title": "입력 처리 실패", "priority": "medium"}]}	click	{"clickTargets": ["dismiss"], "allowedActions": ["click"]}	f	f	2026-04-21 04:32:46.495196	2026-04-23 01:24:07.459852
\.


--
-- TOC entry 4679 (class 0 OID 16941)
-- Dependencies: 225
-- Data for Name: story_transitions; Type: TABLE DATA; Schema: public; Owner: lucas_admin
--

COPY public.story_transitions (id, from_node_id, to_node_id, action_type, expected_input, validator_type, validator_config, fail_node_id, effect_bundle, priority, created_at) FROM stdin;
1	1	2	click	open_friend_chat	exact	{}	\N	\N	10	2026-04-21 04:33:03.088999
2	2	3	click	friend_message_link	exact	{}	\N	\N	10	2026-04-21 04:33:03.088999
3	3	4	click	dark_article	exact	{}	\N	\N	10	2026-04-21 04:33:03.088999
\.


--
-- TOC entry 4681 (class 0 OID 16969)
-- Dependencies: 227
-- Data for Name: unlocked_endings; Type: TABLE DATA; Schema: public; Owner: lucas_admin
--

COPY public.unlocked_endings (id, user_id, ending_type, unlocked_at) FROM stdin;
\.


--
-- TOC entry 4685 (class 0 OID 16999)
-- Dependencies: 231
-- Data for Name: user_chapter_progress; Type: TABLE DATA; Schema: public; Owner: lucas_admin
--

COPY public.user_chapter_progress (id, user_id, chapter_id, status, unlocked_at, completed_at) FROM stdin;
\.


--
-- TOC entry 4683 (class 0 OID 16984)
-- Dependencies: 229
-- Data for Name: user_fragments; Type: TABLE DATA; Schema: public; Owner: lucas_admin
--

COPY public.user_fragments (id, user_id, fragment_code, acquired_at) FROM stdin;
\.


--
-- TOC entry 4688 (class 0 OID 17046)
-- Dependencies: 234
-- Data for Name: user_story_progress; Type: TABLE DATA; Schema: public; Owner: lucas_admin
--

COPY public.user_story_progress (user_id, latest_chapter_id, latest_node_id, latest_checkpoint_node_id, latest_snapshot_json, updated_at) FROM stdin;
\.


--
-- TOC entry 4673 (class 0 OID 16895)
-- Dependencies: 219
-- Data for Name: users; Type: TABLE DATA; Schema: public; Owner: lucas_admin
--

COPY public.users (id, email, oauth_name, nickname, provider, provider_user_id, role, created_at, modified_at) FROM stdin;
\.


--
-- TOC entry 4706 (class 0 OID 0)
-- Dependencies: 220
-- Name: chapters_id_seq; Type: SEQUENCE SET; Schema: public; Owner: lucas_admin
--

SELECT pg_catalog.setval('public.chapters_id_seq', 2, true);


--
-- TOC entry 4707 (class 0 OID 0)
-- Dependencies: 235
-- Name: lucas_knowledge_id_seq; Type: SEQUENCE SET; Schema: public; Owner: lucas_admin
--

SELECT pg_catalog.setval('public.lucas_knowledge_id_seq', 1, false);


--
-- TOC entry 4708 (class 0 OID 0)
-- Dependencies: 232
-- Name: save_slots_id_seq; Type: SEQUENCE SET; Schema: public; Owner: lucas_admin
--

SELECT pg_catalog.setval('public.save_slots_id_seq', 1, false);


--
-- TOC entry 4709 (class 0 OID 0)
-- Dependencies: 222
-- Name: story_nodes_id_seq; Type: SEQUENCE SET; Schema: public; Owner: lucas_admin
--

SELECT pg_catalog.setval('public.story_nodes_id_seq', 44, true);


--
-- TOC entry 4710 (class 0 OID 0)
-- Dependencies: 224
-- Name: story_transitions_id_seq; Type: SEQUENCE SET; Schema: public; Owner: lucas_admin
--

SELECT pg_catalog.setval('public.story_transitions_id_seq', 3, true);


--
-- TOC entry 4711 (class 0 OID 0)
-- Dependencies: 226
-- Name: unlocked_endings_id_seq; Type: SEQUENCE SET; Schema: public; Owner: lucas_admin
--

SELECT pg_catalog.setval('public.unlocked_endings_id_seq', 1, false);


--
-- TOC entry 4712 (class 0 OID 0)
-- Dependencies: 230
-- Name: user_chapter_progress_id_seq; Type: SEQUENCE SET; Schema: public; Owner: lucas_admin
--

SELECT pg_catalog.setval('public.user_chapter_progress_id_seq', 1, false);


--
-- TOC entry 4713 (class 0 OID 0)
-- Dependencies: 228
-- Name: user_fragments_id_seq; Type: SEQUENCE SET; Schema: public; Owner: lucas_admin
--

SELECT pg_catalog.setval('public.user_fragments_id_seq', 1, false);


--
-- TOC entry 4714 (class 0 OID 0)
-- Dependencies: 218
-- Name: users_id_seq; Type: SEQUENCE SET; Schema: public; Owner: lucas_admin
--

SELECT pg_catalog.setval('public.users_id_seq', 1, true);


--
-- TOC entry 4464 (class 2606 OID 16917)
-- Name: chapters chapters_code_key; Type: CONSTRAINT; Schema: public; Owner: lucas_admin
--

ALTER TABLE ONLY public.chapters
    ADD CONSTRAINT chapters_code_key UNIQUE (code);


--
-- TOC entry 4466 (class 2606 OID 16915)
-- Name: chapters chapters_pkey; Type: CONSTRAINT; Schema: public; Owner: lucas_admin
--

ALTER TABLE ONLY public.chapters
    ADD CONSTRAINT chapters_pkey PRIMARY KEY (id);


--
-- TOC entry 4511 (class 2606 OID 17083)
-- Name: lucas_knowledge lucas_knowledge_pkey; Type: CONSTRAINT; Schema: public; Owner: lucas_admin
--

ALTER TABLE ONLY public.lucas_knowledge
    ADD CONSTRAINT lucas_knowledge_pkey PRIMARY KEY (id);


--
-- TOC entry 4499 (class 2606 OID 17028)
-- Name: save_slots save_slots_pkey; Type: CONSTRAINT; Schema: public; Owner: lucas_admin
--

ALTER TABLE ONLY public.save_slots
    ADD CONSTRAINT save_slots_pkey PRIMARY KEY (id);


--
-- TOC entry 4501 (class 2606 OID 17030)
-- Name: save_slots save_slots_user_id_slot_no_key; Type: CONSTRAINT; Schema: public; Owner: lucas_admin
--

ALTER TABLE ONLY public.save_slots
    ADD CONSTRAINT save_slots_user_id_slot_no_key UNIQUE (user_id, slot_no);


--
-- TOC entry 4471 (class 2606 OID 16934)
-- Name: story_nodes story_nodes_code_key; Type: CONSTRAINT; Schema: public; Owner: lucas_admin
--

ALTER TABLE ONLY public.story_nodes
    ADD CONSTRAINT story_nodes_code_key UNIQUE (code);


--
-- TOC entry 4473 (class 2606 OID 16932)
-- Name: story_nodes story_nodes_pkey; Type: CONSTRAINT; Schema: public; Owner: lucas_admin
--

ALTER TABLE ONLY public.story_nodes
    ADD CONSTRAINT story_nodes_pkey PRIMARY KEY (id);


--
-- TOC entry 4478 (class 2606 OID 16952)
-- Name: story_transitions story_transitions_pkey; Type: CONSTRAINT; Schema: public; Owner: lucas_admin
--

ALTER TABLE ONLY public.story_transitions
    ADD CONSTRAINT story_transitions_pkey PRIMARY KEY (id);


--
-- TOC entry 4491 (class 2606 OID 17103)
-- Name: user_chapter_progress uk_user_chapter_progress_user_chapter; Type: CONSTRAINT; Schema: public; Owner: lucas_admin
--

ALTER TABLE ONLY public.user_chapter_progress
    ADD CONSTRAINT uk_user_chapter_progress_user_chapter UNIQUE (user_id, chapter_id);


--
-- TOC entry 4460 (class 2606 OID 16907)
-- Name: users uk_users_provider_provider_user_id; Type: CONSTRAINT; Schema: public; Owner: lucas_admin
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT uk_users_provider_provider_user_id UNIQUE (provider, provider_user_id);


--
-- TOC entry 4481 (class 2606 OID 16975)
-- Name: unlocked_endings unlocked_endings_pkey; Type: CONSTRAINT; Schema: public; Owner: lucas_admin
--

ALTER TABLE ONLY public.unlocked_endings
    ADD CONSTRAINT unlocked_endings_pkey PRIMARY KEY (id);


--
-- TOC entry 4483 (class 2606 OID 16977)
-- Name: unlocked_endings unlocked_endings_user_id_ending_type_key; Type: CONSTRAINT; Schema: public; Owner: lucas_admin
--

ALTER TABLE ONLY public.unlocked_endings
    ADD CONSTRAINT unlocked_endings_user_id_ending_type_key UNIQUE (user_id, ending_type);


--
-- TOC entry 4493 (class 2606 OID 17006)
-- Name: user_chapter_progress user_chapter_progress_pkey; Type: CONSTRAINT; Schema: public; Owner: lucas_admin
--

ALTER TABLE ONLY public.user_chapter_progress
    ADD CONSTRAINT user_chapter_progress_pkey PRIMARY KEY (id);


--
-- TOC entry 4495 (class 2606 OID 17008)
-- Name: user_chapter_progress user_chapter_progress_user_id_chapter_id_key; Type: CONSTRAINT; Schema: public; Owner: lucas_admin
--

ALTER TABLE ONLY public.user_chapter_progress
    ADD CONSTRAINT user_chapter_progress_user_id_chapter_id_key UNIQUE (user_id, chapter_id);


--
-- TOC entry 4486 (class 2606 OID 16990)
-- Name: user_fragments user_fragments_pkey; Type: CONSTRAINT; Schema: public; Owner: lucas_admin
--

ALTER TABLE ONLY public.user_fragments
    ADD CONSTRAINT user_fragments_pkey PRIMARY KEY (id);


--
-- TOC entry 4488 (class 2606 OID 16992)
-- Name: user_fragments user_fragments_user_id_fragment_code_key; Type: CONSTRAINT; Schema: public; Owner: lucas_admin
--

ALTER TABLE ONLY public.user_fragments
    ADD CONSTRAINT user_fragments_user_id_fragment_code_key UNIQUE (user_id, fragment_code);


--
-- TOC entry 4505 (class 2606 OID 17053)
-- Name: user_story_progress user_story_progress_pkey; Type: CONSTRAINT; Schema: public; Owner: lucas_admin
--

ALTER TABLE ONLY public.user_story_progress
    ADD CONSTRAINT user_story_progress_pkey PRIMARY KEY (user_id);


--
-- TOC entry 4462 (class 2606 OID 16905)
-- Name: users users_pkey; Type: CONSTRAINT; Schema: public; Owner: lucas_admin
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_pkey PRIMARY KEY (id);


--
-- TOC entry 4467 (class 1259 OID 17084)
-- Name: idx_chapters_sort_order; Type: INDEX; Schema: public; Owner: lucas_admin
--

CREATE INDEX idx_chapters_sort_order ON public.chapters USING btree (sort_order);


--
-- TOC entry 4506 (class 1259 OID 17097)
-- Name: idx_lucas_knowledge_chapter; Type: INDEX; Schema: public; Owner: lucas_admin
--

CREATE INDEX idx_lucas_knowledge_chapter ON public.lucas_knowledge USING btree (chapter);


--
-- TOC entry 4507 (class 1259 OID 17100)
-- Name: idx_lucas_knowledge_embedding_cosine; Type: INDEX; Schema: public; Owner: lucas_admin
--

CREATE INDEX idx_lucas_knowledge_embedding_cosine ON public.lucas_knowledge USING ivfflat (embedding public.vector_cosine_ops) WITH (lists='100');


--
-- TOC entry 4508 (class 1259 OID 17099)
-- Name: idx_lucas_knowledge_metadata; Type: INDEX; Schema: public; Owner: lucas_admin
--

CREATE INDEX idx_lucas_knowledge_metadata ON public.lucas_knowledge USING gin (metadata);


--
-- TOC entry 4509 (class 1259 OID 17098)
-- Name: idx_lucas_knowledge_puzzle_id; Type: INDEX; Schema: public; Owner: lucas_admin
--

CREATE INDEX idx_lucas_knowledge_puzzle_id ON public.lucas_knowledge USING btree (puzzle_id);


--
-- TOC entry 4496 (class 1259 OID 17093)
-- Name: idx_save_slots_user_id; Type: INDEX; Schema: public; Owner: lucas_admin
--

CREATE INDEX idx_save_slots_user_id ON public.save_slots USING btree (user_id);


--
-- TOC entry 4497 (class 1259 OID 17094)
-- Name: idx_save_slots_user_saved_at; Type: INDEX; Schema: public; Owner: lucas_admin
--

CREATE INDEX idx_save_slots_user_saved_at ON public.save_slots USING btree (user_id, saved_at DESC);


--
-- TOC entry 4468 (class 1259 OID 17085)
-- Name: idx_story_nodes_chapter_id; Type: INDEX; Schema: public; Owner: lucas_admin
--

CREATE INDEX idx_story_nodes_chapter_id ON public.story_nodes USING btree (chapter_id);


--
-- TOC entry 4469 (class 1259 OID 17086)
-- Name: idx_story_nodes_is_checkpoint; Type: INDEX; Schema: public; Owner: lucas_admin
--

CREATE INDEX idx_story_nodes_is_checkpoint ON public.story_nodes USING btree (is_checkpoint);


--
-- TOC entry 4474 (class 1259 OID 17089)
-- Name: idx_story_transitions_fail_node_id; Type: INDEX; Schema: public; Owner: lucas_admin
--

CREATE INDEX idx_story_transitions_fail_node_id ON public.story_transitions USING btree (fail_node_id);


--
-- TOC entry 4475 (class 1259 OID 17087)
-- Name: idx_story_transitions_from_node_id; Type: INDEX; Schema: public; Owner: lucas_admin
--

CREATE INDEX idx_story_transitions_from_node_id ON public.story_transitions USING btree (from_node_id);


--
-- TOC entry 4476 (class 1259 OID 17088)
-- Name: idx_story_transitions_to_node_id; Type: INDEX; Schema: public; Owner: lucas_admin
--

CREATE INDEX idx_story_transitions_to_node_id ON public.story_transitions USING btree (to_node_id);


--
-- TOC entry 4479 (class 1259 OID 17090)
-- Name: idx_unlocked_endings_user_id; Type: INDEX; Schema: public; Owner: lucas_admin
--

CREATE INDEX idx_unlocked_endings_user_id ON public.unlocked_endings USING btree (user_id);


--
-- TOC entry 4489 (class 1259 OID 17092)
-- Name: idx_user_chapter_progress_user_id; Type: INDEX; Schema: public; Owner: lucas_admin
--

CREATE INDEX idx_user_chapter_progress_user_id ON public.user_chapter_progress USING btree (user_id);


--
-- TOC entry 4484 (class 1259 OID 17091)
-- Name: idx_user_fragments_user_id; Type: INDEX; Schema: public; Owner: lucas_admin
--

CREATE INDEX idx_user_fragments_user_id ON public.user_fragments USING btree (user_id);


--
-- TOC entry 4502 (class 1259 OID 17095)
-- Name: idx_user_story_progress_latest_chapter_id; Type: INDEX; Schema: public; Owner: lucas_admin
--

CREATE INDEX idx_user_story_progress_latest_chapter_id ON public.user_story_progress USING btree (latest_chapter_id);


--
-- TOC entry 4503 (class 1259 OID 17096)
-- Name: idx_user_story_progress_latest_node_id; Type: INDEX; Schema: public; Owner: lucas_admin
--

CREATE INDEX idx_user_story_progress_latest_node_id ON public.user_story_progress USING btree (latest_node_id);


--
-- TOC entry 4520 (class 2606 OID 17036)
-- Name: save_slots save_slots_chapter_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: lucas_admin
--

ALTER TABLE ONLY public.save_slots
    ADD CONSTRAINT save_slots_chapter_id_fkey FOREIGN KEY (chapter_id) REFERENCES public.chapters(id);


--
-- TOC entry 4521 (class 2606 OID 17041)
-- Name: save_slots save_slots_node_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: lucas_admin
--

ALTER TABLE ONLY public.save_slots
    ADD CONSTRAINT save_slots_node_id_fkey FOREIGN KEY (node_id) REFERENCES public.story_nodes(id);


--
-- TOC entry 4522 (class 2606 OID 17031)
-- Name: save_slots save_slots_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: lucas_admin
--

ALTER TABLE ONLY public.save_slots
    ADD CONSTRAINT save_slots_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- TOC entry 4512 (class 2606 OID 16935)
-- Name: story_nodes story_nodes_chapter_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: lucas_admin
--

ALTER TABLE ONLY public.story_nodes
    ADD CONSTRAINT story_nodes_chapter_id_fkey FOREIGN KEY (chapter_id) REFERENCES public.chapters(id) ON DELETE CASCADE;


--
-- TOC entry 4513 (class 2606 OID 16963)
-- Name: story_transitions story_transitions_fail_node_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: lucas_admin
--

ALTER TABLE ONLY public.story_transitions
    ADD CONSTRAINT story_transitions_fail_node_id_fkey FOREIGN KEY (fail_node_id) REFERENCES public.story_nodes(id) ON DELETE SET NULL;


--
-- TOC entry 4514 (class 2606 OID 16953)
-- Name: story_transitions story_transitions_from_node_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: lucas_admin
--

ALTER TABLE ONLY public.story_transitions
    ADD CONSTRAINT story_transitions_from_node_id_fkey FOREIGN KEY (from_node_id) REFERENCES public.story_nodes(id) ON DELETE CASCADE;


--
-- TOC entry 4515 (class 2606 OID 16958)
-- Name: story_transitions story_transitions_to_node_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: lucas_admin
--

ALTER TABLE ONLY public.story_transitions
    ADD CONSTRAINT story_transitions_to_node_id_fkey FOREIGN KEY (to_node_id) REFERENCES public.story_nodes(id) ON DELETE CASCADE;


--
-- TOC entry 4516 (class 2606 OID 16978)
-- Name: unlocked_endings unlocked_endings_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: lucas_admin
--

ALTER TABLE ONLY public.unlocked_endings
    ADD CONSTRAINT unlocked_endings_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- TOC entry 4518 (class 2606 OID 17014)
-- Name: user_chapter_progress user_chapter_progress_chapter_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: lucas_admin
--

ALTER TABLE ONLY public.user_chapter_progress
    ADD CONSTRAINT user_chapter_progress_chapter_id_fkey FOREIGN KEY (chapter_id) REFERENCES public.chapters(id) ON DELETE CASCADE;


--
-- TOC entry 4519 (class 2606 OID 17009)
-- Name: user_chapter_progress user_chapter_progress_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: lucas_admin
--

ALTER TABLE ONLY public.user_chapter_progress
    ADD CONSTRAINT user_chapter_progress_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- TOC entry 4517 (class 2606 OID 16993)
-- Name: user_fragments user_fragments_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: lucas_admin
--

ALTER TABLE ONLY public.user_fragments
    ADD CONSTRAINT user_fragments_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- TOC entry 4523 (class 2606 OID 17059)
-- Name: user_story_progress user_story_progress_latest_chapter_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: lucas_admin
--

ALTER TABLE ONLY public.user_story_progress
    ADD CONSTRAINT user_story_progress_latest_chapter_id_fkey FOREIGN KEY (latest_chapter_id) REFERENCES public.chapters(id);


--
-- TOC entry 4524 (class 2606 OID 17069)
-- Name: user_story_progress user_story_progress_latest_checkpoint_node_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: lucas_admin
--

ALTER TABLE ONLY public.user_story_progress
    ADD CONSTRAINT user_story_progress_latest_checkpoint_node_id_fkey FOREIGN KEY (latest_checkpoint_node_id) REFERENCES public.story_nodes(id);


--
-- TOC entry 4525 (class 2606 OID 17064)
-- Name: user_story_progress user_story_progress_latest_node_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: lucas_admin
--

ALTER TABLE ONLY public.user_story_progress
    ADD CONSTRAINT user_story_progress_latest_node_id_fkey FOREIGN KEY (latest_node_id) REFERENCES public.story_nodes(id);


--
-- TOC entry 4526 (class 2606 OID 17054)
-- Name: user_story_progress user_story_progress_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: lucas_admin
--

ALTER TABLE ONLY public.user_story_progress
    ADD CONSTRAINT user_story_progress_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


-- Completed on 2026-04-24 11:03:16

--
-- PostgreSQL database dump complete
--

